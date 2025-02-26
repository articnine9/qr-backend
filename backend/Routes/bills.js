const express = require("express");
const db = require("../modals/mongodb");

const billsRouter = express.Router();
billsRouter.get("/billitems", async (req, res) => {
  try {
    const database = await db.getDatabase();
    const billCollection = database.collection("billcollection");

    const bills = await billCollection.find({}).toArray();
    res.status(200).json(bills);
  } catch (error) {
    console.error("Error fetching bills:", error);
    res.status(500).json({ error: "Error in fetching bills" });
  }
});

  // billsRouter.post("/paid", async (req, res) => {
  //   const { tableNumber, items, paidTime, paidDate } = req.body;

  //   const numericTableNumber = parseInt(tableNumber, 10);

  //   if (isNaN(numericTableNumber) || !Array.isArray(items)) {
  //     console.error("Invalid input data:", req.body);
  //     return res.status(400).json({ error: "Invalid input data" });
  //   }

  //   const updatedItems = items.map((item) => ({
  //     ...item,
  //     price: parseFloat(item.price),
  //   }));

  //   try {
  //     const database = await db.getDatabase();
  //     const cartCollection = database.collection("cart");
  //     const billsCollection = database.collection("billcollection");
  //     await billsCollection.insertOne({
  //       tableNumber: numericTableNumber,
  //       items: updatedItems,
  //       paidTime,
  //       paidDate,
  //       billStatus: "paid",
  //     });
  //     await cartCollection.deleteMany({ tableNumber: numericTableNumber });

  //     res.status(200).json({ message: "Items marked as paid successfully" });
  //   } catch (error) {
  //     console.error("Error marking as paid:", error);
  //     res.status(500).json({ error: "Error marking as paid" });
  //   }
  // });

  billsRouter.post("/paid", async (req, res) => {
    const { tableNumber, items, combos, paidTime, paidDate } = req.body;
  
    const numericTableNumber = parseInt(tableNumber, 10);
  
    if (isNaN(numericTableNumber)) {
      console.error("Invalid table number:", req.body);
      return res.status(400).json({ error: "Invalid table number" });
    }
  
    // Validate items if provided
    let updatedItems = [];
    if (items && Array.isArray(items)) {
      updatedItems = items.map((item) => ({
        ...item,
        price: parseFloat(item.price),
      }));
    }
  
    // Validate combos if provided
    let updatedCombos = [];
    if (combos && Array.isArray(combos)) {
      updatedCombos = combos.map((combo) => ({
        ...combo,
        price: parseFloat(combo.price),
        items: combo.items.map((item) => ({
          ...item,
          quantity: parseInt(item.quantity, 10),  // Ensure quantity is a number
        })),
      }));
    }
  
    if (!updatedItems.length && !updatedCombos.length) {
      console.error("No items or combos provided:", req.body);
      return res.status(400).json({ error: "At least one item or combo must be provided" });
    }
  
    try {
      const database = await db.getDatabase();
      const cartCollection = database.collection("cart");
      const billsCollection = database.collection("billcollection");
  
      // Insert the bill (both items and combos or only one of them)
      const billData = {
        tableNumber: numericTableNumber,
        paidTime,
        paidDate,
        billStatus: "paid",
      };
  
      if (updatedItems.length) {
        billData.items = updatedItems;
      }
  
      if (updatedCombos.length) {
        billData.combos = updatedCombos;
      }
  
      // Insert into the bill collection
      await billsCollection.insertOne(billData);
  
      // Remove items and combos from the cart for the given tableNumber
      await cartCollection.deleteMany({ tableNumber: numericTableNumber });
  
      res.status(200).json({ message: "Bill marked as paid successfully" });
    } catch (error) {
      console.error("Error marking as paid:", error);
      res.status(500).json({ error: "Error marking as paid" });
    }
  });
  

module.exports = billsRouter;