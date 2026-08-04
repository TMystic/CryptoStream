import mongoose from "mongoose";

export async function connectDatabase(uri) {
  mongoose.set("strictQuery", true);
  try {
    await mongoose.connect(uri);
    console.log("[db] MongoDB connected");
  } catch (error) {
    console.error("[db] MongoDB connection error:", error.message);
    throw error;
  }
}
