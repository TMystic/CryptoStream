import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load .env from the repo root (workspaces share it)
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

export const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT || 3000),
  corsOrigin: process.env.CORS_ORIGIN || "*",
  mongoServer: process.env.MONGO_SERVER || "",
  rpcUrl: process.env.RPC_URL || "",
  contractAddress: process.env.CONTRACT_ADDRESS || process.env.VITE_CONTRACT_ADDRESS || "",
  chainId: Number(process.env.CHAIN_ID || process.env.VITE_CHAIN_ID || 11155111),
  firebase: {
    projectId: process.env.FIREBASE_PROJECT_ID || "",
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL || "",
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "",
    privateKey:
      process.env.FIREBASE_PRIVATE_KEY_BASE64
        ? Buffer.from(process.env.FIREBASE_PRIVATE_KEY_BASE64, "base64").toString("utf8")
        : (process.env.FIREBASE_PRIVATE_KEY || "").replace(/\\n/g, "\n"),
  },
};

if (!Number.isInteger(env.port) || env.port < 1 || env.port > 65535) {
  throw new Error("PORT must be a valid TCP port");
}
