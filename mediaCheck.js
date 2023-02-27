import "dotenv/config";
import fetch from "node-fetch";
import Canvas from "canvas";

const { wechatAppId = "", wechatSecret = "", douyinAppId = "", douyinSecret = "" } = process.env;

export default async (req, res) => {
  const { platform = "", image = "", code = "" } = req.body;

  let checkResponse, checkResponseJSON, accessTokenResponse, accessToken;
  if (platform === "weapp") {
    const wechatUserIdentity = await fetch(
      `https://api.weixin.qq.com/sns/jscode2session?grant_type=authorization_code&appid=${wechatAppId}&secret=${wechatSecret}&js_code=${code}`
    );

    const wechatopenid = (await wechatUserIdentity.json())["openid"];

    accessTokenResponse = await fetch(
      `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${wechatAppId}&secret=${wechatSecret}`
    ).catch((err) => console.error(err));

    accessToken = (await accessTokenResponse.json())["access_token"];

    checkResponse = await fetch(
      `https://api.weixin.qq.com/wxa/media_check_async?access_token=${accessToken}`,
      {
        method: "POST",
        body: JSON.stringify({
          media_url: image,
          media_type: 2,
          version: 2,
          scene: 1,
          openid: wechatopenid,
        }),
      }
    );

    checkResponseJSON = await checkResponse.json();
  } else if (platform === "tt") {
    accessTokenResponse = await fetch("https://developer.toutiao.com/api/apps/v2/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        appid: `${douyinAppId}`,
        secret: `${douyinSecret}`,
        grant_type: "client_credential",
      }),
    }).catch((err) => console.error(err));

    const accessTokenResponseJSON = await accessTokenResponse.json();

    accessToken = accessTokenResponseJSON.data?.access_token;

    // Get base64. Image url not working for tt, use base64 instead
    let imageBase64, payload;
    const width = 640;
    const height = 360;
    const canvas = Canvas.createCanvas(width, height);
    const ctx = canvas.getContext("2d");
    const canvasImage = await Canvas.loadImage(image).catch((e) => {
      console.error(e);
    });
    if (canvasImage) {
      console.log("in");
      ctx.drawImage(canvasImage, 0, 0, width, height);
      imageBase64 = canvas.toDataURL("image/jpeg", 1.0);
      payload = {
        app_id: `${douyinAppId}`,
        access_token: `${accessToken}`,
        image_data: `${imageBase64}`,
      };
    } else {
      console.log("out");
      payload = {
        app_id: `${douyinAppId}`,
        access_token: `${accessToken}`,
        image: `${image}`,
      };
    }

    checkResponse = await fetch("https://developer.toutiao.com/api/apps/censor/image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).catch((err) => console.error(err));

    checkResponseJSON = await checkResponse.json();

    // change 'error' of douyin response to "errcode"
    checkResponseJSON["errcode"] = checkResponseJSON["error"];
  }

  res.send(checkResponseJSON || {});
};
