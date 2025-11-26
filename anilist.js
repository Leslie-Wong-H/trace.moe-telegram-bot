import fetch from "node-fetch";
const anilistChinese = require("./anilist-chinese.json");

export default async (req, res) => {
  const {
    query = "",
    variables: { ids = [] },
  } = req.body;

  try {
    let response = await fetch("https://graphql.anilist.co", {
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

    let json = await response.json();

    const db = new Map(anilistChinese.map((el) => [el.id, el]));

    // Credit: https://github.com/soruly/anilist-chinese/blob/master/cf-worker.js
    if (json.data?.Media) {
      const chinese = db.get(json.data.Media.id);
      if (chinese && json.data?.Media?.title) {
        json.data.Media.title.chinese = chinese.title;
      }
      if (chinese && json.data?.Media?.synonyms) {
        json.data.Media.synonyms = json.data.Media.synonyms.concat(chinese.synonyms);
      }
    }
    if (json.data?.Page?.media) {
      json.data.Page.media = json.data.Page.media.map((e) => {
        const chinese = db.get(e.id);
        if (chinese && e.title) {
          e.title.chinese = chinese.title;
        }
        if (chinese && e.synonyms) {
          e.synonyms = e.synonyms.concat(chinese.synonyms);
        }
        return e;
      });
    }

    res.send(json);
  } catch (error) {
    console.error(error);
    res.status(503).json({
      error: `Error: anilist is not responding`,
    });
  }
};
