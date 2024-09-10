const express = require("express");
const multer = require("multer");
const mongodb = require("mongodb");
const db = require("../modals/mongodb");
const { ObjectId } = require('mongodb');

const storage = multer.memoryStorage();
const upload = multer({ storage });
const comboRouter = express.Router();
let bucket;

const initBucket = async () => {
  if (!bucket) {
    try {
      const database = await db.getDatabase();
      bucket = new mongodb.GridFSBucket(database, { bucketName: 'combos' });
    } catch (error) {
      throw new Error("Failed to connect to GridFS");
    }
  }
};

comboRouter.use(async (req, res, next) => {
  try {
    await initBucket();
    next();
  } catch (error) {
    console.error("Failed to connect to GridFS:", error);
    res.status(500).json({ message: "Failed to connect to GridFS.", error: error.message });
  }
});

comboRouter.get("/combos", async (req, res) => {
  try {
    const database = await db.getDatabase();
    const metadataCollection = database.collection("combos");
    const combos = await metadataCollection.find({}).toArray();
    res.status(200).json(combos);
  } catch (error) {
    console.error("Error fetching combos:", error);
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
});

comboRouter.post("/add", upload.single("comboImage"), async (req, res) => {
    try {
      const { comboName } = req.body;
      const comboItems = JSON.parse(req.body.comboItems); 
      const comboImage = req.file; 
  
      if (!comboName || !comboItems || !comboImage) {
        return res.status(400).json({ message: "Name, items, and image are required" });
      }
  
      const uploadStream = bucket.openUploadStream(req.file.originalname, {
        contentType: req.file.mimetype,
      });
  
      uploadStream.end(req.file.buffer);
  
      uploadStream.on("finish", async () => {
        try {
          const database = await db.getDatabase();
          const metadataCollection = database.collection("combos");
          await metadataCollection.insertOne({
            comboName,
            comboItems, 
            comboImage: uploadStream.id.toString(),
            filename: req.file.originalname,
            contentType: req.file.mimetype,
            uploadDate: new Date(),
          });
  
          res.status(200).json({
            message: "Combo added successfully",
            fileId: uploadStream.id.toString(),
          });
        } catch (error) {
          console.error("Error inserting combo metadata:", error);
          res.status(500).json({ message: "Error storing combo metadata.", error: error.message });
        }
      });
  
      uploadStream.on("error", (error) => {
        console.error("Error uploading file:", error);
        res.status(500).json({ message: "Error uploading file.", error: error.message });
      });
    } catch (error) {
      console.error("Error handling request:", error);
      res.status(500).json({ message: "Internal server error.", error: error.message });
    }
  });
  

comboRouter.get("/image/:fileId", async (req, res) => {
  const { fileId } = req.params;

  if (!mongodb.ObjectId.isValid(fileId)) {
    return res.status(400).json({ message: "Invalid file ID format" });
  }

  try {
    const objectId = new mongodb.ObjectId(fileId);
    const downloadStream = bucket.openDownloadStream(objectId);

    downloadStream.on("error", (error) => {
      console.error("Error retrieving file:", error);
      res.status(500).json({ message: "Error retrieving file", error: error.message });
    });

    const database = await db.getDatabase();
    const metadataCollection = database.collection("combos");
    const fileMetadata = await metadataCollection.findOne({ comboImage: fileId });

    if (!fileMetadata) {
      return res.status(404).json({ message: "File metadata not found" });
    }

    res.setHeader("Content-Type", fileMetadata.contentType || "image/jpeg");
    downloadStream.pipe(res);
  } catch (error) {
    console.error("Error processing request:", error);
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
});



comboRouter.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    console.log("Received ID:", id);

    if (!ObjectId.isValid(id)) {
      console.log("Invalid ID format");
      return res.status(400).json({ message: "Invalid ID format" });
    }

    const database = await db.getDatabase();
    const metadataCollection = database.collection("combos");

    const result = await metadataCollection.deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      console.log("Combo not found");
      return res.status(404).json({ message: "Combo not found" });
    }

    console.log("Combo deleted successfully");
    res.status(200).json({ message: "Combo deleted successfully" });
  } catch (error) {
    console.error("Error deleting combo:", error);
    res.status(500).json({ message: "Internal server error.", error: error.message });
  }
});



module.exports = comboRouter;
