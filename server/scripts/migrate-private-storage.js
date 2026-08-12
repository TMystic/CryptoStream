import { env } from "../src/config/env.js";
import { connectDatabase } from "../src/config/database.js";
import { getBucket } from "../src/config/firebase.js";
import { Video } from "../src/models/video.model.js";

await connectDatabase(env.mongoServer);
const bucket = getBucket();

const videos = await Video.find({
  storagePath: { $exists: false },
  videoPath: { $exists: true, $ne: "" },
}).select("+videoPath +storagePath");

let migrated = 0;
for (const video of videos) {
  const storagePath = storagePathFromLegacyUrl(video.videoPath);
  if (!storagePath) {
    console.warn(`[migration] Skipped video ${video.number}: unsupported legacy URL`);
    continue;
  }

  const file = bucket.file(storagePath);
  const [exists] = await file.exists();
  if (!exists) {
    console.warn(`[migration] Skipped video ${video.number}: storage object is missing`);
    continue;
  }

  await file.setMetadata({ metadata: { firebaseStorageDownloadTokens: null } });
  try {
    await file.makePrivate();
  } catch (error) {
    if (error.code !== 400) throw error;
  }

  await Video.updateOne(
    { _id: video._id },
    { $set: { storagePath }, $unset: { videoPath: 1 } }
  );
  migrated += 1;
}

console.log(`[migration] Secured ${migrated} of ${videos.length} legacy videos`);
process.exit(0);

function storagePathFromLegacyUrl(value) {
  try {
    const url = new URL(value);
    const marker = "/o/";
    const index = url.pathname.indexOf(marker);
    return index === -1 ? null : decodeURIComponent(url.pathname.slice(index + marker.length));
  } catch {
    return null;
  }
}
