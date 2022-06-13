import Application, {
  AppContext,
  scssInterpreter,
} from "@geedium-org/nodejs-gwm/dist/index.js";
import fs from "fs";
import axios from "axios";

import { dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

Application.get("/index.min.css", (req, res) => {
  res.writeHead(200, { "Content-Type": "text/css" });
  res.write(fs.readFileSync(__dirname + "/index.min.css", "utf8"));
  res.end();
});

Application.get("/wow", async (req, res) => {
  // Advanced CSS techniques
  const css = fs.readFileSync("index.scss", "utf8");

  const _css = scssInterpreter(css, true);

  console.log("i Output: ", _css, "\r\n");

  fs.writeFileSync("index.min.css", _css);

  const posts = await axios
    .get("https://jsonplaceholder.typicode.com/posts")
    .then((res) => res.data)
    .catch([]);

  AppContext.add("posts", posts);

  res.rootRender("index.gwm", req, res);
});

Application.get("/uid/:id", (req, res) => {
  const { id } = req.params;

  console.log("User id: ", id);

  res.setHeader("Content-Type", "text/html");
  res.writeHead(200);
  res.end(`<html><head></head><body>${id}</body></html>`);
});

Application.listen("localhost", 3000);
