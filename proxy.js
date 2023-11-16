import Canvas from "canvas";

/**
 * use proxy.ultraman-shot.cc to proxy image,
 * transform the image format to jpg at the backend,
 * and being passed by mini-program to the search api
 */
export default async (req, res) => {
  const { url = "", horizon = "" } = req.query;

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
    if (horizon) {
      width = 270;
      height = 480;
    } else {
      width = 640;
      height = 360;
    }
    const canvas = Canvas.createCanvas(width, height);
    const ctx = canvas.getContext("2d");
    const image = await Canvas.loadImage(url).catch((e) => {
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
