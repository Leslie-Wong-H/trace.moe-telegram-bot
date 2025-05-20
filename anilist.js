import fetch from "node-fetch";
import { HttpsProxyAgent } from "https-proxy-agent";
import * as cheerio from "cheerio";
import { randomInt } from "node:crypto";

class ProxyFetcher {
  constructor() {
    this.headers = {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3",
    };
    this.proxy = {};
  }

  async get_ip_list() {
    try {
      console.log("Reading proxy list...");
      const url = atob(
        "aHR0cHM6Ly9wcm94eWxpYi5jb20vZnJlZS1wcm94eS1saXN0Lz9saW1pdD0xMDAmc29ydF9ieT1sYXN0X2NoZWNrZWQmc29ydF9vcmRlcj1kZXNjJmNvdW50cnlfY29kZT1DTiZ0eXBlPUhUVFAmYW5vbnltaXR5PQ=="
      );
      const response = await fetch(url, { headers: this.headers });
      const html = await response.text();
      const $ = cheerio.load(html);
      const ips = $("table tbody td:nth-child(1)");
      const ip_list = [];
      ips.each((i, element) => {
        const ipWithPort = $(element)
          .text()
          .replace(/[^0-9\:\.]/g, "");
        ip_list.push(`${ipWithPort}`);
      });
      console.log("Get proxy ip list successfully!");
      return ip_list;
    } catch (e) {
      console.error("Method get_ip_list error!", e);
    }
  }

  get_random_ip(ip_list) {
    try {
      console.log("Setting random proxy ip...");
      const proxy_list = [];
      ip_list.forEach((ip) => {
        proxy_list.push(`http://${ip}`);
      });
      const randomIndex = randomInt(0, proxy_list.length);
      const proxy_ip = proxy_list[randomIndex];
      this.proxy["http"] = proxy_ip;
      console.log("Set proxy OK!");
      console.log(this.proxy);
      return this.proxy["http"];
    } catch (e) {
      console.error("Method get_random_ip error!", e);
    }
  }
}

export default async (req, res) => {
  const {
    query = "",
    variables: { ids = [] },
  } = req.body;

  try {
    // const fetcher = new ProxyFetcher();

    // const ipList = await fetcher.get_ip_list();

    // const randomIP = ipList ? fetcher.get_random_ip(ipList) : "";

    // const agent = randomIP ? new HttpsProxyAgent(randomIP) : undefined;

    let response = await fetch("https://trace.moe/anilist/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        //   query:
        //     "query ($ids: [Int]) { Page(page: 1, perPage: 50) { media(id_in: $ids, type: ANIME) { id title { native romaji english } type format status startDate { year month day } endDate { year month day } season episodes duration source coverImage { large medium } bannerImage genres synonyms studios { edges { isMain node { id name siteUrl } } } isAdult externalLinks { id url site } siteUrl } } }",
        query: query,
        variables: { ids: [...ids] },
      }),
      // agent: agent,
    }).catch((err) => console.error(err));

    let responseJSON = await response.json();

    res.send(responseJSON);
  } catch (error) {
    console.error(error);
    res.status(503).json({
      error: `Error: anilist is not responding`,
    });
  }
};
