const { ObjectId } = require("mongodb");

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

    // Try updating the "items" array first
    const updateResult = await collection.updateOne(
      { _id: cartObjectId },
      { $set: { "items.$[item].status": "Served" } },
      { arrayFilters: [{ "item._id": itemObjectId }] }
    );

    if (updateResult.modifiedCount === 0) {
      // If no items were updated, try updating in "combos" array
      const updateComboResult = await collection.updateOne(
        { _id: cartObjectId },
        {
          $set: {
            "combos.$[combo].status": "Served",
            "combos.$[combo].items.$[item].status": "Served", // Also update the item inside the combo
          },
        },
        {
          arrayFilters: [
            { "combo._id": itemObjectId },
            { "item._id": itemObjectId }, // Ensure we are updating the item inside the combo
          ],
        }
      );

      // Log if no combo is updated
      if (updateComboResult.modifiedCount === 0) {
        console.log("No combo updated. Item ID might be incorrect.");
      }
    } else {
      console.log("Item updated successfully in 'items' array.");
    }

    // Fetch the updated cart
    const updatedCart = await collection.findOne({ _id: cartObjectId });

    return res.status(200).json(updatedCart); // Return the updated cart
  } catch (err) {
    console.error("Error updating item status:", err);
    return res.status(500).json({ error: "Failed to update item status" });
  }
});
