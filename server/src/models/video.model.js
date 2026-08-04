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
    videoPath: { type: String, required: true },
    contentType: { type: String, default: "video/mp4" },
  },
  {
    timestamps: { createdAt: "uploadedAt", updatedAt: "updatedAt" },
    toJSON: {
      transform: (_doc, ret) => {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

export const Video = mongoose.model("Video", videoSchema);
