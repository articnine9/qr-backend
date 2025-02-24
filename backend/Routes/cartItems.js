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

// cartRouter.put("/cartitems/:id", async (req, res) => {
//   const { id } = req.params;
//   console.log("Update request for ID:", id);
//   const { updatedItems, updatedCombos } = req.body;

//   if (
//     (updatedItems && !Array.isArray(updatedItems)) ||
//     (updatedCombos && !Array.isArray(updatedCombos))
//   ) {
//     console.error("Invalid input data:", req.body);
//     return res.status(400).json({ error: "Invalid input data" });
//   }

//   if (
//     updatedItems &&
//     updatedItems.some((item) => !item || !item._id || !item.status)
//   ) {
//     console.error("Invalid item data:", updatedItems);  
//     return res.status(400).json({ error: "Invalid item data" });
//   }

//   if (
//     updatedCombos &&
//     updatedCombos.some((combo) => !combo || !combo._id || !combo.status)
//   ) {
//     console.error("Invalid combo data:", updatedCombos);
//     return res.status(400).json({ error: "Invalid combo data" });
//   }

//   try {
//     const database = await db.getDatabase();
//     const collection = database.collection("cart");

//     const cartItem = await collection.findOne({ _id: new ObjectId(id) });
//     if (!cartItem) {
//       console.error(`Cart item with ID ${id} not found`);
//       return res.status(404).json({ error: "Cart item not found" });
//     }

//     const updateOperations = [];

//     if (updatedItems && updatedItems.length > 0) {
//       updatedItems.forEach((updatedItem) => {
//         updateOperations.push({
//           updateOne: {
//             filter: {
//               _id: new ObjectId(id),
//               "items._id": updatedItem._id,
//               "items.status": { $ne: updatedItem.status },
//             },
//             update: { $set: { "items.$.status": updatedItem.status } },
//           },
//         });
//       });
//     }

//     if (updatedCombos && updatedCombos.length > 0) {
//       updatedCombos.forEach((updatedCombo) => {
//         updateOperations.push({
//           updateOne: {
//             filter: {
//               _id: new ObjectId(id),
//               "combos._id": updatedCombo._id,
//               "combos.status": { $ne: updatedCombo.status },
//             },
//             update: { $set: { "combos.$.status": updatedCombo.status } },
//           },
//         });
//       });
//     }

//     if (updateOperations.length > 0) {
//       const result = await collection.bulkWrite(updateOperations);

//       console.log("BulkWrite result:", result);

//       if (result.modifiedCount > 0) {
//         res.status(200).json({ message: "Cart updated successfully" });
//       } else {
//         console.error("No items or combos were updated");
//         res.status(404).json({ error: "No items or combos were updated" });
//       }
//     } else {
//       console.error("No valid updates provided");
//       res.status(400).json({ error: "No valid updates provided" });
//     }
//   } catch (error) {
//     console.error("Error updating cart:", error);
//     res
//       .status(500)
//       .json({ error: "Error updating cart", details: error.message });
//   }
// });




// Update status of a food item
// cartRouter.put("/cartitems/:cartId/item/:itemId", async (req, res) => {
//   const { cartId, itemId } = req.params;
//   try {
//     const database = await db.getDatabase();
//     const collection = database.collection("cart");

//     // Find the cart item
//     const cart = await collection.findOne({ _id: ObjectId(cartId) });

//     if (!cart) {
//       return res.status(404).json({ error: "Cart not found" });
//     }

//     // Find the item within the cart
//     let item = cart.items.find((item) => item._id.toString() === itemId);

//     if (item) {
//       // Update the status of the item
//       item.status = "Served"; // You can modify this as per your requirement
//       await collection.updateOne(
//         { _id: ObjectId(cartId) },
//         { $set: { "items.$[item].status": "Served" } },
//         { arrayFilters: [{ "item._id": ObjectId(itemId) }] }
//       );
//       return res.status(200).json({ message: "Item status updated successfully" });
//     }

//     // If not found in items, check the combos
//     const combo = cart.combos.find((combo) => combo._id.toString() === itemId);

//     if (combo) {
//       // Update the status of the combo
//       combo.status = "Served"; // Modify as needed
//       await collection.updateOne(
//         { _id: ObjectId(cartId) },
//         { $set: { "combos.$[combo].status": "Served" } },
//         { arrayFilters: [{ "combo._id": ObjectId(itemId) }] }
//       );
//       return res.status(200).json({ message: "Combo status updated successfully" });
//     }

//     // If item or combo is not found
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

    // Correctly create an ObjectId using 'new'
    const cartObjectId = new ObjectId(cartId);
    const itemObjectId = new ObjectId(itemId);

    // Find the cart item by its ObjectId
    const cart = await collection.findOne({ _id: cartObjectId });

    if (!cart) {
      console.error(`Cart with ID ${cartId} not found`);
      return res.status(404).json({ error: "Cart not found" });
    }

    // Find the item within the cart
    let item = cart.items.find((item) => item._id.toString() === itemObjectId.toString());
    if (item) {
      item.status = "Served";
      await collection.updateOne(
        { _id: cartObjectId },
        { $set: { "items.$[item].status": "Served" } },
        { arrayFilters: [{ "item._id": itemObjectId }] }
      );
      return res.status(200).json({ message: "Item status updated successfully" });
    }

    // Check combos if not found in items
    const combo = cart.combos.find((combo) => combo._id.toString() === itemObjectId.toString());
    if (combo) {
      combo.status = "Served";
      await collection.updateOne(
        { _id: cartObjectId },
        { $set: { "combos.$[combo].status": "Served" } },
        { arrayFilters: [{ "combo._id": itemObjectId }] }
      );
      return res.status(200).json({ message: "Combo status updated successfully" });
    }

    return res.status(404).json({ error: "Item or Combo not found" });

  } catch (err) {
    console.error("Error updating item status:", err);  // Log the full error here
    return res.status(500).json({ error: "Failed to update item status" });
  }
});



module.exports = cartRouter;
