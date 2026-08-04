import { z } from "zod";
import { validate } from "../middleware/validate.middleware.js";
import { AppError } from "../utils/AppError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { escapeRegex } from "../utils/escapeRegex.js";
import { Video } from "../models/video.model.js";
import { uploadVideoFile } from "../services/storage.service.js";

const videoSchema = z.object({
  body: z.object({
    title: z.string().trim().min(1, "Title is required").max(120, "Title too long"),
    description: z.string().trim().min(1, "Description is required").max(2000, "Description too long"),
  }),
  file: z.object({}).refine((file) => file.buffer && file.size > 0, "Video file is required"),
});

export const uploadVideo = [
  validate(videoSchema),
  asyncHandler(async (req, res) => {
    const { title, description } = req.body;

    const count = await Video.countDocuments();
    const videoPath = await uploadVideoFile({
      buffer: req.file.buffer,
      contentType: req.file.mimetype || "video/mp4",
      originalName: req.file.originalname,
    });

    const video = await Video.create({
      number: count + 1,
      title,
      description,
      videoPath,
      contentType: req.file.mimetype || "video/mp4",
    });

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
