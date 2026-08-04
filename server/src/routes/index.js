import { Router } from "express";
import { videoRouter } from "./video.routes.js";

export const apiRouter = Router();

apiRouter.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

apiRouter.use("/videos", videoRouter);
