const mongodb = require("mongodb");
const { MongoClient, GridFSBucket } = mongodb;

const url = "mongodb+srv://Articnine:u4DhYKcw8qhHK4cG@cluster0.p5tqd.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
const dbName = "test";

let client;
let bucket;

async function getDatabase() {
  if (!client) {
    client = new MongoClient(url);
    try {
      await client.connect();
      console.log("Connected to MongoDB");
      const db = client.db(dbName);
      bucket = new GridFSBucket(db);
    } catch (err) {
      console.error("Failed to connect to MongoDB", err);
      throw err;
    }
  }
  return client.db(dbName);
}

module.exports = { getDatabase, GridFSBucket };
