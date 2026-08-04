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

  if (err.name === "MulterError") {
    const message =
      err.code === "LIMIT_FILE_SIZE"
        ? "File too large. Maximum size is 300 MB."
        : `Upload error: ${err.code}`;
    return res.status(400).json({ error: message });
  }

  console.error("[error]", err);
  return res.status(500).json({ error: "Internal server error" });
}
