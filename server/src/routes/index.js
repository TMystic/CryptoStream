import { Router } from "express";
import { videoRouter } from "./video.routes.js";
import { transactionRouter } from "./transaction.routes.js";
import { connectDatabase } from "../config/database.js";
import { env } from "../config/env.js";
import mongoose from "mongoose";

export const apiRouter = Router();

apiRouter.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

apiRouter.get("/health/database", async (_req, res) => {
  if (!env.mongoServer) return res.status(503).json({ status: "error", reason: "MONGO_SERVER is missing" });
  try {
    await connectDatabase(env.mongoServer);
    await mongoose.connection.db.admin().ping();
    return res.json({ status: "ok" });
  } catch (error) {
    const message = error?.message || "";
    const reason = /auth|bad auth|authentication/i.test(message)
      ? "MongoDB authentication failed"
      : /querySrv|ENOTFOUND|DNS/i.test(message)
        ? "MongoDB DNS lookup failed"
        : /whitelist|IP|ECONNREFUSED|timed out|server selection/i.test(message)
          ? "MongoDB Atlas network access blocked or timed out"
          : "MongoDB connection failed";
    return res.status(503).json({ status: "error", reason });
  }
});

apiRouter.use("/videos", videoRouter);
apiRouter.use("/transactions", transactionRouter);
