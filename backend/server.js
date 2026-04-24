require("dotenv").config();
const express = require("express");

const mongoose = require("mongoose");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

// Routes
const postRoutes = require("./src/routes/postRoutes");
app.use("/api/posts", postRoutes);

// MongoDB
mongoose.connect(process.env.MONGO_URI)  .then(() => console.log("MongoDB Connected"))
  .catch(err => console.log("Mongo Error:", err));

// Test route
app.get("/", (req, res) => {
  res.send("API is running...");
});

// Server start
app.listen(5000, () => {
  console.log("Server running on port 5000");
});