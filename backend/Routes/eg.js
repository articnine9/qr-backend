const express = require("express");
const db = require("../modals/mongodb");
const { ObjectId } = require("mongodb");

const cartRouter = express.Router();

// Fetch all cart items
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

// Add items and combos to the cart
cartRouter.post("/cartitems", async (req, res) => {
  const { tableNumber, items, combos } = req.body;

  // Validate input data
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

  // Add status to items and combos
  const itemsWithStatus = items.map((item) => ({
    ...item,
    _id: new ObjectId(), // Generate a new ObjectId for each item
    status: item.status || "Not Served", // Default status
  }));

  const combosWithStatus = combos.map((combo) => ({
    ...combo,
    _id: new ObjectId(), // Generate a new ObjectId for each combo
    status: combo.status || "Not Served", // Default status
  }));

  try {
    const database = await db.getDatabase();
    const collection = database.collection("cart");

    // Insert the cart into the database
    const result = await collection.insertOne({
      tableNumber,
      items: itemsWithStatus,
      combos: combosWithStatus,
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

// Update item or combo status
cartRouter.put("/cartitems/:cartId/item/:itemId", async (req, res) => {
  const { cartId, itemId } = req.params;

  try {
    const database = await db.getDatabase();
    const collection = database.collection("cart");

    // Convert cartId and itemId to ObjectId
    const cartObjectId = new ObjectId(cartId);
    const itemObjectId = new ObjectId(itemId);

    // Find the cart
    const cart = await collection.findOne({ _id: cartObjectId });
    if (!cart) {
      return res.status(404).json({ error: "Cart not found" });
    }

    // Update the status of the item or combo
    const updateResult = await collection.updateOne(
      { _id: cartObjectId },
      {
        $set: {
          "items.$[item].status": "Served",
          "combos.$[combo].status": "Served",
        },
      },
      {
        arrayFilters: [
          { "item._id": itemObjectId }, // Filter for items
          { "combo._id": itemObjectId }, // Filter for combos
        ],
      }
    );

    if (updateResult.modifiedCount === 0) {
      console.log("No items or combos updated. Item/Combo ID might be incorrect.");
      return res.status(404).json({ error: "Item or combo not found" });
    }

    // Fetch the updated cart
    const updatedCart = await collection.findOne({ _id: cartObjectId });

    return res.status(200).json(updatedCart); // Return the updated cart
  } catch (err) {
    console.error("Error updating item status:", err);
    return res.status(500).json({ error: "Failed to update item status" });
  }
});

module.exports = cartRouter;