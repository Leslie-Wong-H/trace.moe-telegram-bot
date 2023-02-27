import fs from "fs-extra";
import os from "os";
import path from "path";
import crypto from "crypto";

export default async (req, res) => {
  let image;
  if (req.files?.length) {
    image = req.files[0].buffer;
  } else if (req.body?.length) {
    image = req.body;
  }

  let md5 = Date.now();
  const imageHash = crypto.createHash("md5");
  imageHash.update(image);
  md5 = imageHash.digest("hex");

  const typeMap = {};
  // 89504e47 would be converted to Number type by prettier, use this trick
  typeMap[`89504e47`] = "png"; // format header feature
  typeMap[`ffd8ffe0`] = "jpg";
  const ext = typeMap[image.toString("hex", 0, 4)] || "jpg";

  const tempFileName = `${md5}.${ext}`;

  const tempPath = path.join(os.tmpdir(), `img`);
  fs.ensureDirSync(tempPath);

  fs.writeFileSync(path.join(tempPath, tempFileName), image);
  console.log(`write file ${tempFileName}`);
  res.send(`https://${req.headers.host}/get-img-buffer?name=${tempFileName}`);

  // delete tempFile 1 minutes later
  await new Promise((resolve) => setTimeout(resolve, 60 * 1000));
  try {
    fs.unlinkSync(path.join(tempPath, tempFileName));
    console.log(`unlink ${tempFileName}`);
  } catch (error) {
    console.log(error);
  }
};
