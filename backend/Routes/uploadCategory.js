const express = require("express");
const multer = require("multer");
const mongodb = require("mongodb");
const db = require("../modals/mongodb");

const storage = multer.memoryStorage();
const upload = multer({ storage });
const categoryRouter = express.Router();
let bucket;

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

categoryRouter.use(async (req, res, next) => {
  try {
    await initBucket();
    next();
  } catch (error) {
    console.error("Failed to connect to GridFS:", error);
    res
      .status(500)
      .json({ message: "Failed to connect to GridFS.", error: error.message });
  }
});

categoryRouter.post("/upload", upload.single("image"), async (req, res) => {
  try {
    if (!req.file || !req.body.categoryName) {
      return res
        .status(400)
        .json({ message: "No file uploaded or category name missing" });
    }

    const uploadStream = bucket.openUploadStream(req.file.originalname, {
      contentType: req.file.mimetype,
    });

    uploadStream.end(req.file.buffer);

    uploadStream.on("finish", async () => {
      try {
        const database = await db.getDatabase();
        const categoriesCollection = database.collection("categories");

        await categoriesCollection.insertOne({
          fileId: uploadStream.id.toString(),
          filename: req.file.originalname,
          contentType: req.file.mimetype,
          uploadDate: new Date(),
          categoryName: req.body.categoryName,
        });

        res.status(200).json({
          message: "Image uploaded successfully",
          fileId: uploadStream.id.toString(),
        });
      } catch (error) {
        console.error("Error inserting file metadata:", error);
        res
          .status(500)
          .json({
            message: "Error storing file metadata.",
            error: error.message,
          });
      }
    });

    uploadStream.on("error", (error) => {
      console.error("Error uploading file:", error);
      res
        .status(500)
        .json({ message: "Error uploading file.", error: error.message });
    });
  } catch (error) {
    console.error("Error handling request:", error);
    res
      .status(500)
      .json({ message: "Internal server error.", error: error.message });
  }
});

categoryRouter.get("/category", async (req, res) => {
  try {
    const database = await db.getDatabase();
    const categoriesCollection = database.collection("categories");

    const categories = await categoriesCollection.find({}).toArray();
    res.status(200).json(
      categories.map((category) => ({
        categoryName: category.categoryName,
        fileId: category.fileId,
        categoryId: category._id,
      }))
    );
  } catch (error) {
    console.error("Error fetching categories:", error);
    res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
  }
});


categoryRouter.get("/image/:fileId", async (req, res) => {
  const { fileId } = req.params;

  if (!mongodb.ObjectId.isValid(fileId)) {
    return res.status(400).json({ message: "Invalid file ID format" });
  }

  try {
    const objectId = new mongodb.ObjectId(fileId);
    const downloadStream = bucket.openDownloadStream(objectId);

    downloadStream.on("error", (error) => {
      console.error("Error in Retrieving file", error);
      res
        .status(500)
        .json({ message: "Error in Retrieving file", error: error.message });
    });

    res.setHeader("Content-Type", "image/jpeg"); 
    downloadStream.pipe(res);
  } catch (error) {
    console.error("Error processing request:", error);
    res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
  }
});

categoryRouter.delete('/category/:id', async (req, res) => {
  const { id } = req.params;

  if (!ObjectId.isValid(id)) {
    return res.status(400).json({ message: 'Invalid category ID format' });
  }

  try {
    const database = await db.getDatabase();
    const categoriesCollection = database.collection('categories');
    const bucket = new GridFSBucket(database);

    // Find the category
    const category = await categoriesCollection.findOne({ _id: new ObjectId(id) });
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    // Delete associated file if exists
    if (category.fileId) {
      const fileId = new ObjectId(category.fileId);
      try {
        await new Promise((resolve, reject) => {
          bucket.delete(fileId, (err) => {
            if (err) {
              console.error('Error deleting file from GridFS:', err);
              reject(err);
            } else {
              resolve();
            }
          });
        });
      } catch (error) {
        console.error('Error deleting file from GridFS:', error);
        // Consider responding with an error status or proceed with deleting the category anyway
      }
    }

    // Delete the category
    const result = await categoriesCollection.deleteOne({ _id: new ObjectId(id) });
    if (result.deletedCount === 1) {
      res.status(200).json({ message: 'Category deleted successfully' });
    } else {
      res.status(404).json({ message: 'Category not found' });
    }
  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
});
module.exports = categoryRouter;