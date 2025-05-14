import fs from "fs-extra";
import os from "os";
import path from "path";
import crypto from "crypto";
import { S3Client, HeadObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const { AWS_ENDPOINT_URL, AWS_ACCESS_KEY, AWS_SECRET_KEY, AWS_BUCKET, AWS_REGION } = process.env;

const opts = AWS_ENDPOINT_URL
  ? {
      endpoint: AWS_ENDPOINT_URL,
      region: AWS_REGION,
      credentials: {
        accessKeyId: AWS_ACCESS_KEY,
        secretAccessKey: AWS_SECRET_KEY,
      },
    }
  : {};

const s3 = new S3Client(opts);

let command;

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

  const uploadFilesToBucket = async ({ bucketName, folderPath, prefix = "" }) => {
    console.log(`Uploading files from ${folderPath}\n`);
    const keys = fs.readdirSync(folderPath);
    const files = keys.map((key) => {
      const filePath = `${folderPath}/${key}`;
      const fileContent = fs.readFileSync(filePath);
      return {
        Key: `${prefix ? prefix + "/" : ""}${key}`,
        Body: fileContent,
      };
    });

    for (const file of files) {
      await s3.send(
        new PutObjectCommand({
          Bucket: bucketName,
          Body: file.Body,
          Key: file.Key,
        })
      );
      console.log(`${file.Key} uploaded successfully.`);
    }
  };

  await uploadFilesToBucket({ bucketName: AWS_BUCKET, folderPath: tempPath, prefix: "remote" });

  const params = {
    Bucket: AWS_BUCKET,
    Key: `remote/${tempFileName}`,
  };

  // Verify object existence
  try {
    command = new HeadObjectCommand(params);
    await s3.send(command);
  } catch (error) {
    console.log(error);
    res.status(404).send(`Not found`);
    return;
  }

  command = new GetObjectCommand(params);
  // 3 days
  const signedUrl = await getSignedUrl(s3, command, { expiresIn: 60 * 60 * 24 * 3 });
  console.log(signedUrl);

  res.send(`${signedUrl}`);

  // delete tempFile 1 minutes later
  await new Promise((resolve) => setTimeout(resolve, 60 * 1000));
  try {
    fs.unlinkSync(path.join(tempPath, tempFileName));
    console.log(`unlink ${tempFileName}`);
  } catch (error) {
    console.log(error);
  }
};
