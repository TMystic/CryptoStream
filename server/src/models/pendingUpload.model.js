import mongoose from "mongoose";

const pendingUploadSchema = new mongoose.Schema({
  number: { type: Number, required: true, unique: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  uploader: { type: String, required: true, lowercase: true },
  transactionHash: { type: String, required: true, unique: true },
  storagePath: { type: String, required: true },
  contentType: { type: String, required: true },
  expectedSize: { type: Number, required: true },
  expiresAt: { type: Date, required: true, index: { expires: 0 } },
});

export const PendingUpload = mongoose.model("PendingUpload", pendingUploadSchema);
