const express = require("express");
const db = require("../modals/mongodb");
const { ObjectId } = require("mongodb");

const menu = express.Router();

menu.get("/stocks", async (req, res) => {
  try {
    let database = await db.getDatabase();
    let collection = database.collection("menu");
    let userdata = collection.find({});
    let cursor = await userdata.toArray();
    res.status(200).json(cursor);
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Internal server error" });
  }
});

menu.post("/edit", async (req, res) => {
  const { _id, name, stock, price, type, categoryName } = req.body;

  if (
    !ObjectId.isValid(_id) ||
    !name ||
    !stock ||
    !price ||
    !type ||
    !categoryName
  ) {
    return res.status(400).json({ message: "Invalid input data" });
  }

  try {
    const database = await db.getDatabase();
    const collection = database.collection("menu");

    const result = await collection.updateOne(
      { _id: new ObjectId(_id) },
      { $set: { name, stock, price, type, categoryName } }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ message: "Item not found" });
    }

    res.status(200).json({ message: "Item updated successfully" });
  } catch (error) {
    console.error("Error updating item:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});
menu.post("/add", async (req, res) => {
  try {
    const { name, stock, price, type, categoryName, availability } = req.body;
    if (!name || !stock || !price || !type || !categoryName || !availability) {
      return res.status(400).json({ message: "All fields are required" });
    }
    let database = await db.getDatabase();
    let collection = database.collection("menu");

    const newItem = {
      name,
      stock,
      price,
      type,
      categoryName,
      availability: availability || "available",
    };

    await collection.insertOne(newItem);
    res.status(201).json({ message: "Menu added successfully" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Internal server error" });
  }
});

menu.patch("/stocks/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { availability } = req.body;
    let database = await db.getDatabase();
    let collection = database.collection("menu");

    const result = await collection.updateOne(
      { _id: new ObjectId(id) },
      { $set: { availability } }
    );

    if (result.modifiedCount === 1) {
      res.status(200).json({ message: "Updated successfully" });
    } else {
      res.status(404).json({ message: "Item not found or no changes" });
    }
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Internal server error" });
  }
});

menu.post("/delete", async (req, res) => {
  try {
    let data = req.body;
    let database = await db.getDatabase();
    let collection = database.collection("menu");
    const result = await collection.deleteOne({ _id: new ObjectId(data._id) });
    if (result.deletedCount === 1) {
      return res.status(200).send({ message: "Deleted successfully" });
    } else {
      return res.status(404).send({ message: "Item not found" });
    }
  } catch (err) {
    console.log(err);
    res.status(500).send({ message: "An error occurred" });
  }
});

module.exports = menu;
