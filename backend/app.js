const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const multer=require('multer')

const userRouter = require("./Routes/routes");
const MenuSec = require("./Routes/menu");
const fileRouter = require("./Routes/UploadImages");
const bannerRouter=require("./Routes/uploadbanner");
const categoryRouter = require("./Routes/uploadCategory");
const cartRouter = require("./Routes/cartItems");
const billsRouter = require("./Routes/bills");
const app = express();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());

const corsOptions = {
  origin: "https://66d6dd608e2116fd30d4310c--qr-scanning-app.netlify.app",
  method: "GET,POST,PUT,PATCH,DELETE",
  preFlightContinue: false,
  OptionSucessStatus: 204,
};
app.use(cors(corsOptions));
const apiUrl = process.env.REACT_APP_API_URL;
app.use(`${apiUrl}/user`, userRouter);
app.use(`${apiUrl}/menu`, MenuSec);
app.use(`${apiUrl}/files`, fileRouter);
app.use(`${apiUrl}/banner`,bannerRouter)
app.use(`${apiUrl}/categories`,categoryRouter)
app.use(`${apiUrl}/cart`,cartRouter)
app.use(`${apiUrl}/bills`,billsRouter)

app.use((req, res) => {
  res.status(400).send("<h1>Error found</h1>");
});

app.listen(3500, () => {
  console.log("Server is running on http://localhost:3500");
});
