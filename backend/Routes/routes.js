const express = require("express");
const db = require("../modals/mongodb");
const { ObjectId } = require("mongodb");
const route = express.Router();

route.post("/", async (req, res) => {
  try {
    let { name, email, password } = req.body;
    let database = await db.getDatabase();
    const collection = database.collection("users");
    data = {
      name: name,
      email: email,
      password: password,
    };
    const user = collection.insertOne(data);
    if (!user) {
      return res.status(400).send("user not found");
    }

    res.status(200).json("user added");
  } catch (err) {
    console.log(err);
  }
});

route.get("/login", async (req, res) => {
  try {
    let database = await db.getDatabase();
    let collection = database.collection("users");
    let userdata = collection.find({});
    let cursor = await userdata.toArray();
    res.status(200).json(cursor);
  } catch (err) {
    console.log(err);
  }
});

route.post("/edit", async (req, res) => {
  try {
    let { _id, name, email, password } = req.body;

    if (!ObjectId.isValid(_id)) {
      return res.status(400).send({ message: "Invalid user ID" });
    }
    let userId = new ObjectId(_id);
    let database = await db.getDatabase();
    let collection = database.collection("users");

    let cursor = await collection.findOne({ _id: userId });

    if (cursor) {
      await collection.updateOne(
        { _id: userId },
        {
          $set: {
            name: name || cursor.name,
            email: email || cursor.email,
            password: password || cursor.password,
          },
        }
      );
      return res.status(200).send({ message: "Updated successfully" });
    } else {
      return res.status(404).send({ message: "User not found" });
    }
  } catch (err) {
    console.error("Error updating profile:", err);
    return res.status(500).send({ message: "Internal server error" });
  }
});

module.exports = route;
