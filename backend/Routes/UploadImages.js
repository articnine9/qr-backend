const express = require("express");
const multer = require("multer");
const mongodb = require("mongodb");
const db = require("../modals/mongodb");

const storage = multer.memoryStorage(); // Use memory storage for file uploads
const upload = multer({ storage });
const fileRouter = express.Router();
let bucket;

// Initialize GridFSBucket
const initBucket = async () => {
  if (!bucket) {
    try {
      const database = await db.getDatabase();
      bucket = new mongodb.GridFSBucket(database);
    } catch (error) {
      throw new Error("Failed to connect to GridFS");
    }
  }
};

// Middleware to initialize GridFSBucket
fileRouter.use(async (req, res, next) => {
  try {
    await initBucket();
    next();
  } catch (error) {
    console.error("Failed to connect to GridFS:", error);
    res.status(500).json({ message: "Failed to connect to GridFS.", error: error.message });
  }
});

// Fetch all menu items
fileRouter.get("/items", async (req, res) => {
  try {
    const database = await db.getDatabase();
    const menuCollection = database.collection("menu");
    const menuItems = await menuCollection.find({}).toArray();
    res.status(200).json(menuItems);
  } catch (error) {
    console.error("Error fetching menu items:", error);
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
});

// Add a new menu item with optional image
fileRouter.post("/add", upload.single("image"), async (req, res) => {
  try {
    const { name, price, categoryName, type, availability } = req.body;

    if (!name || !price || !categoryName || !type || !availability) {
      return res.status(400).json({ message: "All fields are required." });
    }

    const menuItem = { name, price, categoryName, type, availability };
    const database = await db.getDatabase();

    if (req.file) {
      const uploadStream = bucket.openUploadStream(req.file.originalname, {
        contentType: req.file.mimetype,
      });

      uploadStream.end(req.file.buffer);

      uploadStream.on("finish", async () => {
        menuItem.imageId = uploadStream.id;
        try {
          await database.collection("menu").insertOne(menuItem);
          res.status(200).json({ message: "New item with file uploaded successfully.", fileId: uploadStream.id.toString() });
        } catch (error) {
          console.error("Error inserting menu item:", error);
          res.status(500).json({ message: "Error inserting menu item.", error: error.message });
        }
      });

      uploadStream.on("error", (error) => {
        console.error("Error uploading file:", error);
        res.status(500).json({ message: "Error uploading file.", error: error.message });
      });
    } else {
      try {
        await database.collection("menu").insertOne(menuItem);
        res.status(201).json({ message: "Menu item added successfully." });
      } catch (error) {
        console.error("Error inserting menu item:", error);
        res.status(500).json({ message: "Error inserting menu item.", error: error.message });
      }
    }
  } catch (error) {
    console.error("Error handling request:", error);
    res.status(500).json({ message: "Internal server error.", error: error.message });
  }
});

// Retrieve an image by fileId
fileRouter.get("/image/:fileId", async (req, res) => {
  const { fileId } = req.params;
  try {
    const objectId = new mongodb.ObjectId(fileId);
    const downloadStream = bucket.openDownloadStream(objectId);

    downloadStream.on("error", (error) => {
      console.error("Error retrieving file:", error);
      res.status(500).json({ message: "Error retrieving file", error: error.message });
    });

    res.setHeader("Content-Type", "image/jpeg");
    downloadStream.pipe(res);
  } catch (error) {
    console.error("Error processing request:", error);
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
});

module.exports = fileRouter;
