import { Router } from "express";
import * as videoController from "../controllers/video.controller.js";

export const videoRouter = Router();

videoRouter.post("/upload-request", videoController.requestVideoUpload);
videoRouter.post("/upload-finalize", videoController.finalizeVideoUpload);
videoRouter.get("/", videoController.listVideos);
videoRouter.get("/search", videoController.searchVideos);
videoRouter.post("/:id/playback", videoController.getPlaybackUrl);
videoRouter.get("/:id", videoController.getVideo);
