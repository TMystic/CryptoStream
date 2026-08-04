import { fileURLToPath } from "url";
import path from "path";
import { app } from "./app.js";
import { env } from "./config/env.js";
import { connectDatabase } from "./config/database.js";

const isMainModule =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

// Only listen when run directly (`npm run dev` / `npm start`).
// When imported by a serverless runtime (e.g. Vercel) the app is exported instead.
if (isMainModule) {
  connectDatabase(env.mongoServer)
    .then(() => {
      app.listen(env.port, () => {
        console.log(`[server] API listening on http://localhost:${env.port}`);
      });
    })
    .catch((error) => {
      console.error("[server] Failed to start:", error.message);
      process.exit(1);
    });
}

export default app;
