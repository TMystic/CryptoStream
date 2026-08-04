import { randomUUID } from "crypto";
import { bucket } from "../config/firebase.js";

/**
 * Uploads a video buffer to Firebase Storage and returns a public download URL.
 */
export async function uploadVideoFile({ buffer, contentType, originalName }) {
  const objectName = `videos/${Date.now()}-${randomUUID()}-${sanitize(originalName)}`;
  const file = bucket.file(objectName);
  const token = randomUUID();

  await file.save(buffer, {
    contentType,
    public: true,
    metadata: {
      metadata: { firebaseStorageDownloadTokens: token },
    },
  });

  return publicDownloadUrl(bucket.name, objectName, token);
}

function sanitize(name) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 100);
}

function publicDownloadUrl(bucketName, objectName, token) {
  const encoded = encodeURIComponent(objectName);
  return `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encoded}?alt=media&token=${token}`;
}
