import "dotenv/config";
import fetch from "node-fetch";
import Canvas from "canvas";

const {
  wechatAppId = "",
  wechatSecret = "",
  weixinAppId = "",
  weixinSecret = "",
  douyinAppId = "",
  douyinSecret = "",
} = process.env;

export default async (req, res) => {
  const { platform = "", image = "", code = "" } = req.body;

  let checkResponse, checkResponseJSON, accessTokenResponse, accessToken;

  /**
   * Different wechat mini program, different appid and secret.
   * The "code" above is linked to the corresponding appid and secret,
   * so it needs to be reacted separately when using the same server-side
   * code to respond to two wechat mini programs.
   */
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
  } else if (platform === "weixin") {
    const wechatUserIdentity = await fetch(
      `https://api.weixin.qq.com/sns/jscode2session?grant_type=authorization_code&appid=${weixinAppId}&secret=${weixinSecret}&js_code=${code}`
    );

    const wechatopenid = (await wechatUserIdentity.json())["openid"];

    accessTokenResponse = await fetch(
      `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${weixinAppId}&secret=${weixinSecret}`
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

    // Get base64. Image url may not work for tt. Use base64 instead
    let imageBase64, payload;
    const width = 640;
    const height = 360;
    const canvas = Canvas.createCanvas(width, height);
    const ctx = canvas.getContext("2d");
    const canvasImage = await Canvas.loadImage(image).catch((e) => {
      console.error(e);
    });
    if (canvasImage) {
      ctx.drawImage(canvasImage, 0, 0, width, height);
      imageBase64 = canvas.toDataURL("image/jpeg", 1);
      payload = {
        targets: ["ad", "porn", "politics", "disgusting"],
        tasks: [
          {
            image_data: imageBase64,
          },
        ],
      };
    } else {
      payload = {
        targets: ["ad", "porn", "politics", "disgusting"],
        tasks: [
          {
            image: image,
          },
        ],
      };
    }

    /*
      This endpoint is broken
    */
    // checkResponse = await fetch("https://developer.toutiao.com/api/apps/censor/image", {
    //   method: "POST",
    //   headers: { "Content-Type": "application/json" },
    //   body: JSON.stringify({
    //     app_id: `${douyinAppId}`,
    //     access_token: `${accessToken}`,
    //     image: `${image}`,
    //   }),
    // }).catch((err) => console.error(err));

    checkResponse = await fetch("https://developer.toutiao.com/api/v2/tags/image/", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Token": accessToken },
      body: JSON.stringify(payload),
    }).catch((err) => console.error(err));

    checkResponseJSON = await checkResponse.json();

    // Process douyin response to cater to wechat "errcode"
    // Response Schema:
    // https://developer.open-douyin.com/docs/resource/zh-CN/mini-game/develop/open-capacity/content-security/picture-detect/
    checkResponseJSON["errcode"] =
      checkResponseJSON.data?.every((item) => item?.code === 0) &&
      checkResponseJSON.data?.every((item) => item?.predicts.every((subItem) => subItem.prob !== 1))
        ? 0
        : 1;
  }

  res.send(checkResponseJSON || {});
};
