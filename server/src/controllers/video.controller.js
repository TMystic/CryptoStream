import { z } from "zod";
import { validate } from "../middleware/validate.middleware.js";
import { AppError } from "../utils/AppError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { escapeRegex } from "../utils/escapeRegex.js";
import { Video } from "../models/video.model.js";
import { PendingUpload } from "../models/pendingUpload.model.js";
import { createPlaybackUrl, createUploadUrl, deleteVideoFile, inspectVideoFile } from "../services/storage.service.js";
import { verifyPlaybackAuthorization, verifyVideoRegistration } from "../services/blockchain.service.js";

const uploadRequestSchema = z.object({
  body: z.object({
    title: z.string().trim().min(1, "Title is required").max(120, "Title too long"),
    description: z.string().trim().min(1, "Description is required").max(2000, "Description too long"),
    number: z.coerce.number().int().positive(),
    uploader: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Invalid uploader address"),
    transactionHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/, "Invalid transaction hash"),
    originalName: z.string().trim().min(1).max(180),
    contentType: z.string().regex(/^video\/[a-zA-Z0-9.+-]+$/, "Invalid video content type"),
    fileSize: z.coerce.number().int().positive().max(1024 * 1024 * 1024, "Maximum file size is 1 GB"),
  }),
});

export const requestVideoUpload = [
  validate(uploadRequestSchema),
  asyncHandler(async (req, res) => {
    const { title, description, number, uploader, transactionHash, originalName, contentType, fileSize } = req.body;
    const [existing, pending] = await Promise.all([
      Video.findOne({ $or: [{ number }, { transactionHash }] }),
      PendingUpload.findOne({ $or: [{ number }, { transactionHash }] }),
    ]);
    if (existing) throw new AppError(409, "This on-chain video is already uploaded");
    if (pending) {
      if (pending.transactionHash !== transactionHash) {
        throw new AppError(409, "A different upload is already pending for this video ID");
      }
      await deleteVideoFile(pending.storagePath).catch(() => {});
      await pending.deleteOne();
    }

    await verifyVideoRegistration({ transactionHash, number, title, description, uploader });
    const upload = await createUploadUrl({ contentType, originalName });
    await PendingUpload.create({
      number, title, description, uploader, transactionHash,
      storagePath: upload.objectName, contentType, expectedSize: fileSize,
      expiresAt: new Date(upload.expiresAt),
    });
    res.status(201).json({ uploadUrl: upload.url, expiresAt: upload.expiresAt });
  }),
];

const finalizeSchema = z.object({
  body: z.object({ transactionHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/) }),
});

export const finalizeVideoUpload = [
  validate(finalizeSchema),
  asyncHandler(async (req, res) => {
    const pending = await PendingUpload.findOne({ transactionHash: req.body.transactionHash });
    if (!pending) throw new AppError(404, "Pending upload not found or expired");
    const stored = await inspectVideoFile(pending.storagePath);
    if (stored.size !== pending.expectedSize || stored.contentType !== pending.contentType) {
      await deleteVideoFile(pending.storagePath);
      await pending.deleteOne();
      throw new AppError(400, "Uploaded file does not match the authorized file");
    }
    const video = await Video.create({
      number: pending.number,
      title: pending.title,
      description: pending.description,
      storagePath: pending.storagePath,
      contentType: pending.contentType,
      uploader: pending.uploader,
      transactionHash: pending.transactionHash,
    });
    await pending.deleteOne();
    res.status(201).json({ message: "Video uploaded successfully", video });
  }),
];

const listQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(12),
  }),
});

export const listVideos = [
  validate(listQuerySchema),
  asyncHandler(async (req, res) => {
    const page = req.query.page;
    const limit = req.query.limit;

    const [videos, total] = await Promise.all([
      Video.find().sort({ uploadedAt: -1 }).skip((page - 1) * limit).limit(limit),
      Video.countDocuments(),
    ]);

    res.json({
      videos,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  }),
];

const searchQuerySchema = z.object({
  query: z.object({
    q: z.string().trim().min(1, "Search query is required").max(100),
  }),
});

export const searchVideos = [
  validate(searchQuerySchema),
  asyncHandler(async (req, res) => {
    const query = escapeRegex(req.query.q);
    const videos = await Video.find({ title: { $regex: query, $options: "i" } })
      .sort({ uploadedAt: -1 })
      .limit(50);

    res.json({ videos });
  }),
];

const idParamsSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, "Invalid video id"),
  }),
});

export const getVideo = [
  validate(idParamsSchema),
  asyncHandler(async (req, res) => {
    const video = await Video.findOne({ number: Number(req.params.id) });
    if (!video) {
      throw new AppError(404, "Video not found");
    }
    res.json({ video });
  }),
];

const playbackSchema = z.object({
  params: z.object({ id: z.string().regex(/^\d+$/, "Invalid video id") }),
  body: z.object({
    address: z.string(),
    signature: z.string().min(1),
    expiresAt: z.coerce.number().int(),
  }),
});

export const getPlaybackUrl = [
  validate(playbackSchema),
  asyncHandler(async (req, res) => {
    const number = Number(req.params.id);
    await verifyPlaybackAuthorization({ number, ...req.body });
    const video = await Video.findOne({ number }).select("+storagePath");
    if (!video) throw new AppError(404, "Video not found");
    const url = await createPlaybackUrl(video.storagePath);
    res.set("Cache-Control", "no-store").json({ url, expiresIn: 600 });
  }),
];
