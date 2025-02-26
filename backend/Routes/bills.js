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

  // Check if tableNumber is a valid integer
  const numericTableNumber = parseInt(tableNumber, 10);
  if (isNaN(numericTableNumber)) {
    console.error("Invalid table number:", tableNumber);
    return res.status(400).json({ error: "Invalid table number" });
  }

  // Validate that items and combos are arrays
  if (!Array.isArray(items) || !Array.isArray(combos)) {
    console.error("Invalid input data:", req.body);
    return res.status(400).json({ error: "Invalid items or combos data" });
  }

  // Process regular items
  const updatedItems = items.map((item) => {
    console.log("Processing item:", item);
    return {
      ...item,
      price: parseFloat(item.price), // Convert price from string to float
      count: parseInt(item.count["$numberInt"], 10) || 1 // Convert count from string to integer
    };
  });

  // Process combo items
  const comboItems = combos.flatMap((combo) => {
    console.log("Processing combo:", combo);
    return combo.items.map((comboItem) => ({
      ...comboItem,
      price: parseFloat(combo.price), // Apply the combo price
      count: parseInt(combo.count["$numberInt"], 10) || 1 // Convert combo count to integer
    }));
  });

  // Combine regular items and combo items
  const allItems = [...updatedItems, ...comboItems];
  console.log("All items to insert into bill:", allItems);

  try {
    const database = await db.getDatabase();
    const cartCollection = database.collection("cart");
    const billsCollection = database.collection("billcollection");

    // Insert the bill into the database
    const result = await billsCollection.insertOne({
      tableNumber: numericTableNumber,
      items: allItems,
      paidTime,
      paidDate,
      billStatus: "paid",
    });

    console.log("Bill inserted successfully:", result);

    // Clear the cart for the given table number
    await cartCollection.deleteMany({ tableNumber: numericTableNumber });

    // Respond with a success message
    res.status(200).json({ message: "Items marked as paid successfully" });
  } catch (error) {
    console.error("Error marking as paid:", error);
    res.status(500).json({ error: "Error marking as paid" });
  }
});



module.exports = billsRouter;