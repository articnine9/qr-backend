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
    _id: new ObjectId(),
    status: item.status || "Not Served",
  }));
  const comboWithStatus = combos.map((combo) => ({
    ...combo,
    _id: new ObjectId(),
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

cartRouter.put("/cartitems/:cartId/item/:itemId", async (req, res) => {
  const { cartId, itemId } = req.params;

  try {
    const database = await db.getDatabase();
    const collection = database.collection("cart");

    // Convert cartId and itemId to ObjectId
    const cartObjectId = new ObjectId(cartId);
    const itemObjectId = new ObjectId(itemId); // Ensure itemId is an ObjectId

    // Find the cart
    const cart = await collection.findOne({ _id: cartObjectId });
    if (!cart) {
      return res.status(404).json({ error: "Cart not found" });
    }

    // Update the items array with the new status
    const updateResult = await collection.updateOne(
      { _id: cartObjectId },
      { $set: { "items.$[item].status": "Served" } },
      { arrayFilters: [{ "item._id": itemObjectId }] }
    );

    if (updateResult.modifiedCount === 0) {
      console.log("No items updated in 'items' array, trying 'combos'");

      // If no items were updated, try updating the combos array
      const updateComboResult = await collection.updateOne(
        { _id: cartObjectId },
        { $set: { "combos.$[combo].status": "Served" } },
        { arrayFilters: [{ "combo._id": itemObjectId }] } 
      );

      if (updateComboResult.modifiedCount === 0) {
        console.log("No combos updated. Item/Combo ID might be incorrect.");
        return res.status(404).json({ error: "Item/Combo not found" });
      }
    }

    // Fetch the updated cart
    const updatedCart = await collection.findOne({ _id: cartObjectId });
    return res.status(200).json(updatedCart); // Return the updated cart
  } catch (err) {
    console.error("Error updating item status:", err);
    return res.status(500).json({ error: "Failed to update item status", message: err.message });
  }
});

module.exports = cartRouter;
