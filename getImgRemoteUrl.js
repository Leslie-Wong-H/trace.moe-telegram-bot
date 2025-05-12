import fetch from "node-fetch";
import { FormData, Blob } from "formdata-node";

export default async (req, res) => {
  let image;
  if (req.files?.length) {
    image = req.files[0].buffer;
  } else if (req.body?.length) {
    image = req.body;
  }

  // imgBB is a free and public-available image bucket service.
  const uploadUrl = `https://api.imgbb.com/1/upload?expiration=259200&key=3ac6bfb27cea21014fb0ebb9498202cb`;
  const formData = new FormData();
  const blob = new Blob([image], { type: "image/png" });
  formData.append("image", blob, "image.png");
  fetch(uploadUrl, {
    method: "POST",
    // headers: {
    //   Authorization: apiToken,
    // },
    body: formData,
  })
    .then((response) => {
      if (!response.ok) {
        res.status(503).json({
          error: `Network response was not OK. ${error}`,
        });
      }
      return response.json();
    })
    .then((data) => {
      res.send(`${data.data.url}`);
    })
    .catch((error) => {
      res.status(503).json({
        error: `Network response was not OK. ${error}`,
      });
    });
};
