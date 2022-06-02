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

  let _head = "<head>";
  for (var i = 0; i < head.length; i++) {
    _head += head[i];
  }
  _head +=
    '<script src="https://cdn.jsdelivr.net/npm/axios/dist/axios.min.js"></script>';
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

const server = http.createServer(requestListener);
server.listen(port, host, () => {
  console.log(`Server is running on http://${host}:${port}`);
});
