import fetch from "node-fetch";
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

function error500(e, res) {
  console.log(e);
  res.status(500).send("Internal Server Error");
}

export default async (req, res) => {
  const params = {
    Bucket: AWS_BUCKET,
    Key: `${req.params.filename}`,
  };

  if (req.method === "GET") {
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
    const signedUrl = await getSignedUrl(s3, command, { expiresIn: 60 * 5 });
    console.log(signedUrl);
    const response = await fetch(signedUrl, {
      method: "GET",
      headers: { "Content-Type": "image/jpeg" },
    }).catch((e) => {
      error500(e, res);
    });
    if (!response.ok) error500("Internal Server Error", res);
    res.setHeader("Content-Type", "image/jpeg");
    response.body.pipe(res);
  } else {
    res.status(500).send("Internal Server Error");
  }
};
