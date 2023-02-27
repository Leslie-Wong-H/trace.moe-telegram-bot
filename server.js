import "dotenv/config";
import child_process from "child_process";
import express from "express";
import rateLimit from "express-rate-limit";
import bodyParser from "body-parser";
import multer from "multer";

import douban from "./douban.js";
import poster from "./poster.js";
import proxy from "./proxy.js";
import getImgUrl from "./getImgUrl.js";
import getImgBuffer from "./getImgBuffer.js";
import mediaCheck from "./mediaCheck.js";

const { PORT = 3000 } = process.env;

console.log("Setting Telegram webhook...");

const app = express();

let REVISION;
try {
  REVISION =
    HEROKU_SLUG_COMMIT ??
    RAILWAY_GIT_COMMIT_SHA ??
    child_process.execSync("git rev-parse HEAD").toString().trim();
} catch (e) {
  REVISION = "";
}

app.disable("x-powered-by");
app.set("trust proxy", 1);

app.use((req, res, next) => {
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "GET, POST, PUT, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type, x-trace-secret");
  next();
});

app.use(
  rateLimit({
    max: 100, // limit each IP to 100 requests
    windowMs: 1000, // per second
    delayMs: 0, // disable delaying - full speed until the max limit is reached
  })
);

app.use(
  bodyParser.raw({
    type: ["image/jpeg", "image/png"],
    limit: "25mb",
  })
);

app.use(express.json());

app.use(
  express.urlencoded({
    extended: true,
  })
);

app.use((req, res, next) => {
  const startTime = performance.now();
  console.log("=>", new Date().toISOString(), req.ip, req.path);
  res.on("finish", () => {
    console.log(
      "<=",
      new Date().toISOString(),
      req.ip,
      req.path,
      res.statusCode,
      `${(performance.now() - startTime).toFixed(0)}ms`
    );
  });
  next();
});

app.get("/", (req, res) => {
  return res.send(`<meta http-equiv="Refresh" content="0; URL=https://www.ultraman-shot.cc/">`);
});

app.post("/douban", douban);

app.get("/poster/:filename", poster);

app.get("/proxy", proxy);

app.post(
  "/get-img-url",
  multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } }).any(),
  getImgUrl
);

app.get("/get-img-buffer", getImgBuffer);

app.post("/media-check", mediaCheck);

// For the purpose of qq-bot to verify https address
app.use(express.static("public"));

app.listen(PORT, "0.0.0.0", () => console.log(`server listening on port ${PORT}`));
