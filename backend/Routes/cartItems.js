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

// cartRouter.put("/cartitems/:cartId/item/:itemId", async (req, res) => {
//   const { cartId, itemId } = req.params;

//   try {
//     const database = await db.getDatabase();
//     const collection = database.collection("cart");

//     // Correctly create an ObjectId using 'new'
//     const cartObjectId = new ObjectId(cartId);
//     const itemObjectId = new ObjectId(itemId);

//     // Find the cart item by its ObjectId
//     const cart = await collection.findOne({ _id: cartObjectId });

//     if (!cart) {
//       console.error(`Cart with ID ${cartId} not found`);
//       return res.status(404).json({ error: "Cart not found" });
//     }

//     // Find the item within the cart
//     let item = cart.items.find(
//       (item) => item._id.toString() === itemObjectId.toString()
//     );
//     if (item) {
//       item.status = "Served";
//       await collection.updateOne(
//         { _id: cartObjectId },
//         { $set: { "items.$[item].status": "Served" } },
//         { arrayFilters: [{ "item._id": itemObjectId }] }
//       );
//       return res
//         .status(200)
//         .json({ message: "Item status updated successfully" });
//     }

//     // Check combos if not found in items
//     const combo = cart.combos.find(
//       (combo) => combo._id.toString() === itemObjectId.toString()
//     );
//     if (combo) {
//       combo.status = "Served";
//       await collection.updateOne(
//         { _id: cartObjectId },
//         { $set: { "combos.$[combo].status": "Served" } },
//         { arrayFilters: [{ "combo._id": itemObjectId }] }
//       );
//       return res
//         .status(200)
//         .json({ message: "Combo status updated successfully" });
//     }

//     return res.status(404).json({ error: "Item or Combo not found" });
//   } catch (err) {
//     console.error("Error updating item status:", err);
//     return res.status(500).json({ error: "Failed to update item status" });
//   }
// });

cartRouter.put("/cartitems/:cartId/item/:itemId", async (req, res) => {
  const { cartId, itemId } = req.params;

  try {
    const database = await db.getDatabase();
    const collection = database.collection("cart");

    const cartObjectId = new ObjectId(cartId);
    const itemObjectId = new ObjectId(itemId);

    const cart = await collection.findOne({ _id: cartObjectId });

    if (!cart) {
      console.error(`Cart with ID ${cartId} not found`);
      return res.status(404).json({ error: "Cart not found" });
    }

    let item = cart.items.find(
      (item) => item._id.toString() === itemObjectId.toString()
    );
    if (item) {
      item.status = "Served";
      await collection.updateOne(
        { _id: cartObjectId },
        { $set: { "items.$[item].status": "Served" } },
        { arrayFilters: [{ "item._id": itemObjectId }] }
      );
      return res
        .status(200)
        .json({ message: "Item status updated successfully" });
    }

    // Handle combos only if they exist
    if (cart.combos && cart.combos.length > 0) {
      const combo = cart.combos.find(
        (combo) => combo._id.toString() === itemObjectId.toString()
      );
      if (combo) {
        combo.status = "Served";
        await collection.updateOne(
          { _id: cartObjectId },
          { $set: { "combos.$[combo].status": "Served" } },
          { arrayFilters: [{ "combo._id": itemObjectId }] }
        );
        return res
          .status(200)
          .json({ message: "Combo status updated successfully" });
      }
    }

    
    const result = await collection.updateOne(
      { _id: cartObjectId },
      { $set: { "items.$[item].status": "Served" } },
      { arrayFilters: [{ "item._id": itemObjectId }] }
    );

    console.log("Update result:", result);

    if (result.modifiedCount === 0) {
      console.error("No documents updated.");
    } else {
      console.log("Document updated successfully.");
    }

    return res.status(404).json({ error: "Item or Combo not found" });
  } catch (err) {
    console.error("Error updating item status:", err);
    return res.status(500).json({ error: "Failed to update item status" });
  }
});

module.exports = cartRouter;
