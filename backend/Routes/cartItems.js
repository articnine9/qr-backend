const express = require("express");
const db = require("../modals/mongodb");
const { ObjectId } = require("mongodb");

const cartRouter = express.Router();

cartRouter.get("/items", async (req, res) => {
  try {
    const database = await db.getDatabase();
    const collection = database.collection("cart");
    const carts = await collection.find({}).toArray();
    res.status(200).json(carts);
  } catch (err) {
    console.error("Error fetching cart items:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

cartRouter.post("/cartitems", async (req, res) => {
  const { tableNumber, items, combos } = req.body;

  if (
    typeof tableNumber !== "number" ||
    !Array.isArray(items) ||
    !Array.isArray(combos)
  ) {
    console.error("Invalid input data:", req.body);
    return res.status(400).json({ error: "Invalid input data" });
  }

  if (items.length === 0 && combos.length === 0) {
    return res.status(400).json({ error: "No items or combos provided" });
  }

  const itemsWithStatus = items.map((item) => ({
    ...item,
    status: item.status || "Not Served",
  }));
  const comboWithStatus = combos.map((combo) => ({
    ...combo,
    status: combo.status || "Not Served",
  }));
  try {
    const database = await db.getDatabase();
    const collection = database.collection("cart");
    const result = await collection.insertOne({
      tableNumber,
      items: itemsWithStatus,
      combos: comboWithStatus,
    });

    if (result.acknowledged) {
      res.status(201).json({ message: "Cart saved successfully" });
    } else {
      res.status(400).json({ error: "Failed to save cart" });
    }
  } catch (error) {
    console.error("Error saving cart:", error);
    res.status(500).json({ error: "Error saving cart" });
  }
});
cartRouter.put("/cartitems/:id", async (req, res) => {
  const { id } = req.params;
  const { updatedItems, updatedCombos } = req.body;

  if (
    (updatedItems && !Array.isArray(updatedItems)) ||
    (updatedCombos && !Array.isArray(updatedCombos))
  ) {
    console.error("Invalid input data:", req.body);
    return res.status(400).json({ error: "Invalid input data" });
  }

  if (
    updatedItems &&
    updatedItems.some(
      (item) =>
        !item._id ||
        !item.status
    )
  ) {
    console.error("Invalid item data:", updatedItems);
    return res.status(400).json({ error: "Invalid item data" });
  }

  if (
    updatedCombos &&
    updatedCombos.some(
      (combo) =>
        !combo._id ||
        !combo.status
    )
  ) {
    console.error("Invalid combo data:", updatedCombos);
    return res.status(400).json({ error: "Invalid combo data" });
  }

  try {
    const database = await db.getDatabase();
    const collection = database.collection("cart");

    // Fetch the current data for the cart item
    const cartItem = await collection.findOne({ _id: new ObjectId(id) });

    if (!cartItem) {
      return res.status(404).json({ error: "Cart item not found" });
    }

    const updateOperations = [];

    if (updatedItems) {
      updatedItems.forEach((updatedItem) => {
        updateOperations.push({
          updateOne: {
            filter: { _id: new ObjectId(id), 'items._id': updatedItem._id },
            update: { $set: { 'items.$.status': updatedItem.status } }
          }
        });
      });
    }

    if (updatedCombos) {
      updatedCombos.forEach((updatedCombo) => {
        updateOperations.push({
          updateOne: {
            filter: { _id: new ObjectId(id), 'combos._id': updatedCombo._id },
            update: { $set: { 'combos.$.status': updatedCombo.status } }
          }
        });
      });
    }

    if (updateOperations.length > 0) {
      const result = await collection.bulkWrite(updateOperations);

      if (result.modifiedCount > 0) {
        res.status(200).json({ message: "Cart updated successfully" });
      } else {
        res.status(404).json({ error: "No items or combos were updated" });
      }
    } else {
      res.status(400).json({ error: "No valid updates provided" });
    }
  } catch (error) {
    console.error("Error updating cart:", error);
    res.status(500).json({ error: "Error updating cart", details: error.message });
  }
});



module.exports = cartRouter;
