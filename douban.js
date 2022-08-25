import pkg from "mongodb";
const { MongoClient } = pkg;

const { MONGODB_ATLAS_URL } = process.env;

export default async (req, res) => {
  const client = await MongoClient.connect(MONGODB_ATLAS_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  }).catch((err) => {
    console.log(err);
  });
  if (!client) return;
  try {
    const { ids = [] } = req.body;
    const db = client.db("ultraman");
    let collection = db.collection("douban");
    console.log(ids);
    const mongoQueries = ids.map((id) => ({
      doubanId: id,
    }));
    const response = await Promise.all(
      mongoQueries.map(async (mongoQuery) => {
        const record = await collection.findOne(mongoQuery);
        return record;
      })
    );
    res.send(response);
  } catch (err) {
    console.log(err);
    res.status(503).json({
      error: `Error: MongoDB is not responding`,
    });
  } finally {
    client.close();
  }
};
