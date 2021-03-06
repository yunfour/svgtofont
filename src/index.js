

const fs = require("fs-extra");
const path = require("path");
const base64Img = require("base64-img");
const minify = require("html-minifier").minify;
require("colors-cli/toxic");
const {
  createSVG,
  createTTF,
  createEOT,
  createWOFF,
  createWOFF2,
  createSvgSymbol,
  createHTML,
  copyTemplate
} = require("./utils");

module.exports = function create(options) {
  if (!options) options = {};
  options.dist = options.dist || path.join(process.cwd(), "fonts");
  options.src = options.src || path.join(process.cwd(), "svg");
  options.unicodeStart = options.unicodeStart || 10000;
  options.svg2ttf = options.svg2ttf || {};
  options.emptyDist = options.emptyDist;
  options.fontName = options.fontName || "iconfont";
  options.svgicons2svgfont = options.svgicons2svgfont || {};
  options.svgicons2svgfont.fontName = options.fontName;
  options.clssaNamePrefix = options.clssaNamePrefix || options.fontName;
  
  if (options.emptyDist) fs.emptyDirSync(options.dist);

  let cssString = [];
  let cssIconHtml = [];
  let unicodeHtml = [];
  let symbolHtml = [];
  const pageName = ["font-class", "unicode", "symbol"];
  let fontClassPath = path.join(options.dist, "index.html");
  let unicodePath = path.join(options.dist, "unicode.html");
  let symbolPath = path.join(options.dist, "symbol.html");

  return createSVG(options)
    .then((UnicodeObject) => {
      Object.keys(UnicodeObject).forEach(name => {
        let _code = UnicodeObject[name];
        cssIconHtml.push(`<li class="class-icon"><i class="${options.clssaNamePrefix}-${name}"></i><p class="name">${name}</p></li>`);
        unicodeHtml.push(`<li class="unicode-icon"><span class="iconfont">${_code}</span><h4>${name}</h4><span class="unicode">&amp;#${_code.charCodeAt(0)};</span></li>`);
        symbolHtml.push(`
          <li class="symbol">
            <svg class="icon" aria-hidden="true">
              <use xlink:href="${options.fontName}.symbol.svg#${options.clssaNamePrefix}-${name}"></use>
            </svg>
            <h4>${options.clssaNamePrefix}-${name}</h4>
          </li>
        `);
        cssString.push(`.${options.clssaNamePrefix}-${name}:before { content: "\\${_code.charCodeAt(0).toString(16)}"; }\n`);
      });
    })
    .then(()=> createTTF(options))
    .then(() => createEOT(options))
    .then(() => createWOFF(options))
    .then(() => createWOFF2(options))
    .then(() => createSvgSymbol(options))
    .then(() => {
      // If you generate a font you need to generate a style.
      if (options.website) options.css = true;
      if (options.css) {
        const font_temp = path.resolve(__dirname, "styles");
        return copyTemplate(font_temp, options.dist, {
          fontname: options.fontName,
          cssString: cssString.join(""),
          timestamp: new Date().getTime(),
          prefix: options.clssaNamePrefix || options.fontName
        });
      }
    })
    .then(filePaths => {
      // output log
      filePaths && filePaths.length > 0 && filePaths.forEach(filePath =>
          console.log(`${"SUCCESS".green} Created ${filePath} `)
        );
    })
    .then(() => {
      if (options.website) {
        // setting default home page.
        const indexName = pageName.includes(options.website.index) ? pageName.indexOf(options.website.index) : 0;
        pageName.forEach((name, index) => {
          const _path = path.join(options.dist, indexName === index ? "index.html" : `${name}.html`);
          if (name === "font-class") fontClassPath = _path;
          if (name === "unicode") unicodePath = _path;
          if (name === "symbol") symbolPath = _path;
        });
        // default template
        options.website.template = options.website.template || path.join(__dirname, "website", "index.ejs");
        // template data
        this.tempData = { ...options.website, prefix: options.clssaNamePrefix || options.fontName, _fontname: options.fontName, _type: "font-class", _logo: options.website.logo, _link: `${options.fontName}.css`, _IconHtml: cssIconHtml.join(""), _title: options.website.title || options.fontName };
        // website logo
        if (options.website.logo && fs.pathExistsSync(options.website.logo) && path.extname(options.website.logo) === ".svg") {
          this.tempData._logo = fs.readFileSync(options.website.logo);
        } else {
          this.tempData._logo = false;
        }
        // website favicon
        if (options.website.favicon && fs.pathExistsSync(options.website.favicon)) {
          this.tempData.favicon = base64Img.base64Sync(options.website.favicon);
        } else {
          this.tempData.favicon = false;
        }
        return createHTML({
          outPath: options.website.template,
          data: this.tempData
        });
      }
    })
    .then(str =>
      fs.outputFileSync(
        fontClassPath,
        minify(str, { collapseWhitespace: true, minifyCSS: true })
      )
    )
    .then(str => console.log(`${"SUCCESS".green} Created ${fontClassPath} `))
    .then(str => {
      if (options.website) {
        this.tempData._IconHtml = unicodeHtml.join("");
        this.tempData._type = "unicode";
        return createHTML({
          outPath: options.website.template,
          data: this.tempData
        });
      }
    })
    .then(str =>
      fs.outputFileSync(
        unicodePath,
        minify(str, { collapseWhitespace: true, minifyCSS: true })
      )
    )
    .then(str => console.log(`${"SUCCESS".green} Created ${unicodePath} `))
    .then(str => {
      if (options.website) {
        this.tempData._IconHtml = symbolHtml.join("");
        this.tempData._type = "symbol";
        return createHTML({
          outPath: options.website.template,
          data: this.tempData
        });
      }
    })
    .then(str =>
      fs.outputFileSync(
        symbolPath,
        minify(str, { collapseWhitespace: true, minifyCSS: true })
      )
    )
    .then(str => console.log(`${"SUCCESS".green} Created ${symbolPath} `));
}