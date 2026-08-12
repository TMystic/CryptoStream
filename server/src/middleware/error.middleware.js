import { AppError } from "../utils/AppError.js";
import { env } from "../config/env.js";

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, _req, res, _next) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: err.message,
      ...(err.details ? { details: err.details } : {}),
    });
  }

  if (err.code === 11000) {
    return res.status(409).json({ error: "A video with this blockchain registration already exists" });
  }

  if (err.name === "MongooseServerSelectionError" || err.name === "MongoServerError") {
    console.error("[database]", err.message);
    return res.status(503).json({ error: "Database connection is unavailable" });
  }

  console.error("[error]", err);
  return res.status(500).json({ error: "Internal server error" });
}
