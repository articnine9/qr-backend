const express = require("express"); 
const multer = require("multer"); 
const mongodb = require("mongodb"); 
const db = require("../modals/mongodb"); 
 
const storage = multer.memoryStorage(); 
const upload = multer({ storage }); 
const bannerRouter = express.Router(); 
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

bannerRouter.use(async (req, res, next) => { 
  try { 
    await initBucket(); 
    next(); 
  } catch (error) { 
    console.error("Failed to connect to GridFS:", error); 
    res.status(500).json({ message: "Failed to connect to GridFS.", error: error.message }); 
  } 
}); 
 
bannerRouter.get("/banners", async (req, res) => { 
  try { 
    const database = await db.getDatabase(); 
    const files = await database.collection("banners").find({}).toArray(); 
    res.status(200).json(files); 
  } catch (error) { 
    console.error("Error fetching banner images:", error); 
    res.status(500).json({ message: "Internal server error", error: error.message }); 
  } 
}); 
 
bannerRouter.post("/add", upload.single("bannerImage"), async (req, res) => { 
  try { 
    if (!req.file) { 
      return res.status(400).json({ message: "No file uploaded" }); 
    } 
 
    const uploadStream = bucket.openUploadStream(req.file.originalname, { 
      contentType: req.file.mimetype, 
    }); 
 
    uploadStream.end(req.file.buffer); 
 
    uploadStream.on("finish", async () => { 
      try { 
        const database = await db.getDatabase(); 
        const metadataCollection = database.collection("banners"); 
        await metadataCollection.insertOne({ 
          fileId: uploadStream.id.toString(), 
          filename: req.file.originalname, 
          contentType: req.file.mimetype, 
          uploadDate: new Date() 
        }); 
 
        res.status(200).json({ 
          message: "Image uploaded successfully", 
          fileId: uploadStream.id.toString(), 
        }); 
      } catch (error) { 
        console.error("Error inserting file metadata:", error); 
        res.status(500).json({ message: "Error storing file metadata.", error: error.message }); 
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
 
bannerRouter.get("/image/:fileId", async (req, res) => { 
  const { fileId } = req.params; 
  try { 
    const objectId = new mongodb.ObjectId(fileId); 
    const downloadStream = bucket.openDownloadStream(objectId); 
 
    downloadStream.on("error", (error) => { 
      console.error("Error in Retrieving file", error); 
      res.status(500).json({ message: "Error in Retrieving file ", error: error.message }); 
    }); 
 
    res.setHeader("Content-Type", "image/jpeg"); 
    downloadStream.pipe(res); 
  } catch (error) { 
    console.error("Error processing request:", error); 
    res.status(500).json({ message: "Internal server error", error: error.message }); 
  } 
}); 

bannerRouter.delete("/banners/:fileId", async (req, res) => {
  const { fileId } = req.params;
  try {
    const objectId = new mongodb.ObjectId(fileId);
    await bucket.delete(objectId);

    const database = await db.getDatabase();
    const metadataCollection = database.collection("banners");
    await metadataCollection.deleteOne({ fileId });

    res.status(200).json({ message: "Banner deleted successfully." });
  } catch (error) {
    console.error("Error deleting banner:", error);
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
});






module.exports = bannerRouter;