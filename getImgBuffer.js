import fs from "fs-extra";
import os from "os";
import path from "path";

export default (req, res) => {
  const { name = "" } = req.query;
  const tempPath = path.join(os.tmpdir(), `img`);
  fs.ensureDirSync(tempPath);
  if (!fs.existsSync(path.join(tempPath, name))) {
    res.status(500).send("Internal Server Error");
    return;
  }
  const buffer = fs.createReadStream(path.join(tempPath, name));
  const ext = name.split(".")[1] || "jpeg";
  res.setHeader("Content-Type", `image/${ext}`);
  buffer.pipe(res);
};
