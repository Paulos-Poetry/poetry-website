import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";

import userRoutes from "./routes/user"; // Import user routes
import poetryRoutes from "./routes/poetry"; // Import user routes
import translationRoutes from "./routes/translation"; // Import user routes
import supabaseAuthRoutes from "./routes/supabaseAuth"; // Supabase-backed auth routes (store users in poetry_users)

dotenv.config(); // Load environment variables

const app = express();
app.use(express.json()); // Middleware to parse JSON
app.use(cors());

// Mount the user routes
app.use(userRoutes);
app.use(poetryRoutes);
app.use(translationRoutes);
app.use(supabaseAuthRoutes);

// Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URI!, {})
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error:", err));
mongoose.connection.once("open", () => {
  console.log("MongoDB connection is open");
  console.log(mongoose.connection.db?.databaseName);
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
