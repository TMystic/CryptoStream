import express from "express";
import cors from "cors";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import { env } from "./config/env.js";
import { connectDatabase } from "./config/database.js";
import { AppError } from "./utils/AppError.js";
import { apiRouter } from "./routes/index.js";
import { notFoundHandler } from "./middleware/notFound.middleware.js";
import { errorHandler } from "./middleware/error.middleware.js";

export const app = express();

app.disable("x-powered-by");
app.set("trust proxy", 1);
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(cors({ origin: buildCorsOrigin(env.corsOrigin), credentials: env.corsOrigin !== "*" }));
app.use(express.json({ limit: "1mb" }));
app.use("/api", rateLimit({ windowMs: 60_000, limit: 120, standardHeaders: "draft-7", legacyHeaders: false }));

// Simple request logging in development
if (process.env.NODE_ENV !== "production") {
  app.use((req, _res, next) => {
    console.log(`[http] ${req.method} ${req.originalUrl}`);
    next();
  });
}

app.use("/api", async (req, _res, next) => {
  if (!req.path.startsWith("/videos")) return next();
  if (!env.mongoServer) return next(new AppError(503, "Database is not configured on the server"));
  try {
    await connectDatabase(env.mongoServer);
    next();
  } catch (error) {
    next(error);
  }
});
app.use("/api", apiRouter);

app.use(notFoundHandler);
app.use(errorHandler);

function buildCorsOrigin(value) {
  if (value === "*") return true;
  const allowed = value.split(",").map((origin) => origin.trim()).filter(Boolean);
  return (origin, callback) => {
    if (!origin || allowed.includes(origin)) return callback(null, true);
    callback(new Error("Origin is not allowed by CORS"));
  };
}
