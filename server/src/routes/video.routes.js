import { Router } from "express";
import multer from "multer";
import * as videoController from "../controllers/video.controller.js";

export const videoRouter = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 300 * 1024 * 1024 }, // 300 MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("video/")) {
      cb(null, true);
    } else {
      cb(new Error("Only video files are allowed"));
    }
  },
});

videoRouter.post("/", upload.single("videoFile"), videoController.uploadVideo);
videoRouter.get("/", videoController.listVideos);
videoRouter.get("/search", videoController.searchVideos);
videoRouter.get("/:id", videoController.getVideo);
