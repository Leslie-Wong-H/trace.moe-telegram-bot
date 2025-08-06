import Canvas from "canvas";
import sharp from "sharp";
import fetch from "node-fetch";
import sizeOf from "image-size";

/**
 * use proxy.ultraman-shot.cc to proxy image,
 * transform the image format to jpg at the backend,
 * and being passed by mini-program to the search api
 */
export default async (req, res) => {
  const { url = "", horizon = "", custom = "" } = req.query;

  function error500(e, res) {
    console.log(e);
    res.status(500).send("Internal Server Error");
  }

  if (req.method === "GET") {
    if (!url) {
      res.status(403).send("No URL attached");
      return;
    }
    let width, height;
    const response = await fetch(url);
    const buffer = await response.buffer();
    if (horizon) {
      // Horizon, used in detail poster
      width = 230;
      height = 340;
    } else if (custom) {
      // Custom, keep the original resolution
      const resolution = await sizeOf(buffer);
      width = resolution["width"];
      height = resolution["height"];
    } else {
      // Landscape, used in query preview
      width = 640;
      height = 360;
    }
    const canvas = Canvas.createCanvas(width, height);
    const ctx = canvas.getContext("2d");
    // Add webp proxy support using sharp
    const canvasBuffer = await sharp(buffer).toFormat("png").toBuffer();
    const image = await Canvas.loadImage(canvasBuffer).catch((e) => {
      error500(e, res);
    });
    if (image) {
      ctx.drawImage(image, 0, 0, width, height);
      res.setHeader("Content-Type", "image/jpeg");
      canvas.createJPEGStream().pipe(res);
    } else {
      // loadImage has been error500 above
    }
  }
};
