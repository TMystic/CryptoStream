import mongoose from "mongoose";

const videoSchema = new mongoose.Schema(
  {
    number: { type: Number, required: true, unique: true, index: true },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
    storagePath: { type: String, required: true, select: false },
    videoPath: { type: String, select: false },
    contentType: { type: String, default: "video/mp4" },
    uploader: { type: String, required: true, lowercase: true, index: true },
    transactionHash: { type: String, required: true, unique: true },
  },
  {
    timestamps: { createdAt: "uploadedAt", updatedAt: "updatedAt" },
    toJSON: {
      transform: (_doc, ret) => {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        delete ret.storagePath;
        delete ret.videoPath;
        return ret;
      },
    },
  }
);

export const Video = mongoose.model("Video", videoSchema);
