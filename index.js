const http = require("http");
const fs = require("fs");
const path = require("path");

const host = "localhost";
const port = 3000;

// const __dirname = path.resolve();

const crypto = require("crypto");
const algorithm = "aes-256-cbc"; //Using AES encryption
const key = crypto.randomBytes(32);
const iv = crypto.randomBytes(16);

function encrypt(text) {
  let cipher = crypto.createCipheriv("aes-256-cbc", Buffer.from(key), iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return { iv: iv.toString("hex"), encryptedData: encrypted.toString("hex") };
}

function decrypt(text) {
  let iv = Buffer.from(text.iv, "hex");
  let encryptedText = Buffer.from(text.encryptedData, "hex");
  let decipher = crypto.createDecipheriv("aes-256-cbc", Buffer.from(key), iv);
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
}

class AppContext {
  static state = {};

  static add(key, value) {
    AppContext.state[key] = value;
  }

  static print() {
    return JSON.stringify(AppContext.state);
  }
}

const stripComments = (code) => {
  const savedText = [];
  return (
    code
      // extract strings and regex
      .replace(/(['"`]).*?\1/gm, function (match) {
        savedText.push(match);
        return "###";
      })
      // remove  // comments
      .replace(/\/\/.*/gm, "")
      // now extract all regex and save them
      .replace(/\/[^*\n].*\//gm, function (match) {
        savedText.push(match);
        return "###";
      })
      // remove /* */ comments
      .replace(/\/\*[\s\S]*\*\//gm, "")
      // remove <!-- --> comments
      .replace(/<!--[\s\S]*-->/gm, "")
      /*replace \ with \\ so we not lost \b && \t*/
      .replace(/###/gm, function () {
        return savedText.shift();
      })
  );
};

const __require = (data) => {
  const matches = data.match(/require\('.*'\);/gm);

  if (!matches || matches.length <= 0) {
    return false;
  }

  for (match of matches) {
    const x = match.replace("require(", "");
    const y = x.replace(");", "");
    let c = y.replaceAll("'", "");
    c = path.resolve(c);

    const x2 = fs.existsSync(c);
    if (!x2) {
      c += ".js";
    } else {
      // console.log("Something exists!");
      // const isFile = fs.lstatSync(c).isFile();
      // if(isFile) {
      // }
    }

    const moduleDir = process.cwd();

    const f = c.split("\\");
    const f2 = moduleDir.split("\\");

    //  symmetric difference
    let difference = f
      .filter((x) => !f2.includes(x))
      .concat(f2.filter((x) => !f.includes(x)));

    difference = difference.filter(function (value) {
      return !value.includes(".");
    });

    const finalDir = path.join(moduleDir, ...difference);
    process.chdir(finalDir);

    var _data = __require(fs.readFileSync(c, "utf8"));

    data = data.replace(match, _data);
    return data;
  }

  return data;
};

const transpileJs = (moduleName) => {
  const cwd = path.resolve(__dirname, "node_modules", moduleName);

  process.chdir(cwd);
  console.log("Working directory: ", process.cwd());

  const entryFile = require(path.resolve(cwd, "package.json")).main;

  var index = fs.readFileSync(path.resolve(cwd, entryFile), "utf8");

  var transpiled = __require(index);

  // remove unnecessary comments
  transpiled = stripComments(transpiled);

  // // remove top level entries
  transpiled = transpiled.replaceAll("'use strict';", "");

  // // remove module exports from commonJS
  const matches = transpiled.match(/module.exports = .*$/gm);
  for (match of matches) {
    transpiled = transpiled.replace(match, "");
  }

  return transpiled;
};

const justInTimeInterpreter = (data, indents = 0) => {
  console.time("Interpreter");

  var _htmlDocument = "<!DOCTYPE html>\n";
  _htmlDocument += "<html>";

  data = data.replace("<Html>", _htmlDocument);

  let head = ['<meta name="description" content="" />'];

  const s1 = data.indexOf("<Head>");
  const s2 = data.lastIndexOf("</Head>");
  const s = data
    .substring(s1 + 6, s2)
    .trim()
    .split("\r\n")
    .map((x) => x.trim());

  head.push.apply(head, s);

  const match = data.match(/(?:<Head>)([\s\S]*)(?:<\/Head>)/);

  // Extract imports
  const im = data.match(/import [a-z]+ [a-z]+ '\w+';/);
  data = data.replace(im, "");

  // const axios = transpileJs("axios");

  let _head = "<head>";
  for (var i = 0; i < head.length; i++) {
    _head += head[i];
  }
  // _head += "<script>" + axios + "</script>";
  // _head +=
  //   '<script src="https://cdn.jsdelivr.net/npm/axios/dist/axios.min.js"></script>';
  _head += "</head>";

  data = data.replace(match[0], _head);

  // Add CSS
  data = data.replace(
    "<MaterialStyles />",
    `<style>
    body { background: #f2f2f2; }
  </style>`.trim()
  );

  AppContext.add("clicks", "1000");

  const _match = data.match(/(?:<Context>)([\s\S]*)(?:<\/Context>)/);

  const body = _match[0].replace("<Context>", "").replace("</Context>", "");

  data = data.replace(body, "");

  data = data.replace(
    "<Context>",
    `<body>${body.trim()}<script>DATA = ${AppContext.print()};`.trim()
  );
  data = data.replace("</Context>", `</script></body>`);

  data = data.replace("</Html>", "</html>");

  // Minify HTML output
  // data = data
  //   .replace(/\<\!--\s*?[^\s?\[][\s\S]*?--\>/g, "")
  //   .replace(/\>\s*\</g, "><");

  // Building theme templates
  // (CLI)
  if (!fs.existsSync(path.resolve(__dirname, "themes/default.gwc"))) {
    var _html = encrypt(data);
    console.log("File not exists!");
    fs.writeFileSync(
      path.resolve(__dirname, "themes/default.key"),
      _html.iv || ""
    );
    fs.writeFileSync(
      path.resolve(__dirname, "themes/default.gwc"),
      _html.encryptedData || ""
    );
  }

  return data;
};

const requestListener = function (req, res) {
  fs.readFile(
    path.resolve(__dirname, "themes/default/index.gwm"),
    "utf8",
    (err, data) => {
      if (err) {
        res.writeHead(404);
        res.end("<html><body>Page not found!</body></html>");
        return;
      }

      const content = justInTimeInterpreter(data);
      console.timeEnd("Interpreter");
      res.writeHead(200);
      res.end(content);
    }
  );
};

class Application {
  static _instance = null;

  static create() {
    // Application._instance = new Application();
    // return Application._instance;
  }

  static listen(host, port) {
    // if (!Application._instance) {
    //   console.error("There is no application instance.");
    //   return false;
    // }

    const server = http.createServer(requestListener);
    server.listen(port, host, () => {
      console.log(`i Server is running on http://${host}:${port}`);
      // return Application._instance;
    });
  }

  listen(server) {
    // bind to server
  }
}

// const app = Application.create();
// console.log(app);

// Application.listen(host, port);

module.exports = Application;
