const express = require("express");
const db = require("../modals/mongodb");

const billsRouter = express.Router();

billsRouter.post("/paid", async (req, res) => {
  const { tableNumber, items, paidTime, paidDate } = req.body;

  const numericTableNumber = parseInt(tableNumber, 10);

  if (isNaN(numericTableNumber) || !Array.isArray(items)) {
    console.error("Invalid input data:", req.body);
    return res.status(400).json({ error: "Invalid input data" });
  }

  const updatedItems = items.map((item) => ({
    ...item,
    price: parseFloat(item.price),
  }));

  try {
    const database = await db.getDatabase();
    const cartCollection = database.collection("cart");
    const billsCollection = database.collection("billcollection");
    await billsCollection.insertOne({
      tableNumber: numericTableNumber,
      items: updatedItems,
      paidTime,
      paidDate,
      billStatus: "paid",
    });
    await cartCollection.deleteMany({ tableNumber: numericTableNumber });

    res.status(200).json({ message: "Items marked as paid successfully" });
  } catch (error) {
    console.error("Error marking as paid:", error);
    res.status(500).json({ error: "Error marking as paid" });
  }
});

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

module.exports = billsRouter;