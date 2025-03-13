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
          { arrayFilters: [{ "combo._id": itemObjectId.toString() }] } // Convert ObjectId to string for combo
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
  