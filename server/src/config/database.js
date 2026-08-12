import mongoose from "mongoose";

let connectionPromise;

export async function connectDatabase(uri) {
  if (mongoose.connection.readyState === 1) return mongoose.connection;
  if (connectionPromise) return connectionPromise;

  mongoose.set("strictQuery", true);
  connectionPromise = mongoose
    .connect(uri, { serverSelectionTimeoutMS: 10_000 })
    .then((connection) => {
      console.log("[db] MongoDB connected");
      return connection;
    })
    .catch((error) => {
      connectionPromise = undefined;
      console.error("[db] MongoDB connection error:", error.message);
      throw error;
    });

  return connectionPromise;
}
