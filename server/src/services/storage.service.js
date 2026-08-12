import { randomUUID } from "crypto";
import { getBucket } from "../config/firebase.js";

export async function createUploadUrl({ contentType, originalName }) {
  const bucket = getBucket();
  const objectName = `videos/${Date.now()}-${randomUUID()}-${sanitize(originalName)}`;
  const expiresAt = Date.now() + 15 * 60 * 1000;
  const [url] = await bucket.file(objectName).getSignedUrl({
    version: "v4",
    action: "write",
    expires: expiresAt,
    contentType,
  });
  return { objectName, url, expiresAt };
}

export async function inspectVideoFile(objectName) {
  const bucket = getBucket();
  const [metadata] = await bucket.file(objectName).getMetadata();
  return { size: Number(metadata.size), contentType: metadata.contentType };
}

export async function createPlaybackUrl(objectName, expiresInMs = 10 * 60 * 1000) {
  const bucket = getBucket();
  const [url] = await bucket.file(objectName).getSignedUrl({
    action: "read",
    expires: Date.now() + expiresInMs,
  });
  return url;
}

export async function deleteVideoFile(objectName) {
  if (!objectName) return;
  const bucket = getBucket();
  await bucket.file(objectName).delete({ ignoreNotFound: true });
}

function sanitize(name) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 100);
}
