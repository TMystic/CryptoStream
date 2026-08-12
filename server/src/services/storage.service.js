import { randomUUID } from "crypto";
import { del, head, issueSignedToken, presignUrl } from "@vercel/blob";

export async function createUploadUrl({ contentType, originalName, fileSize }) {
  const objectName = `videos/${Date.now()}-${randomUUID()}-${sanitize(originalName)}`;
  const expiresAt = Date.now() + 15 * 60 * 1000;
  const token = await issueSignedToken({
    pathname: objectName,
    operations: ["put"],
    validUntil: expiresAt,
    allowedContentTypes: [contentType],
    maximumSizeInBytes: fileSize,
  });
  const { presignedUrl } = await presignUrl(token, {
    access: "private",
    operation: "put",
    pathname: objectName,
    validUntil: expiresAt,
    allowedContentTypes: [contentType],
    maximumSizeInBytes: fileSize,
  });
  return { objectName, url: presignedUrl, expiresAt };
}

export async function inspectVideoFile(objectName) {
  const metadata = await head(objectName);
  return { size: Number(metadata.size), contentType: metadata.contentType };
}

export async function createPlaybackUrl(objectName, expiresInMs = 10 * 60 * 1000) {
  const expiresAt = Date.now() + expiresInMs;
  const token = await issueSignedToken({
    pathname: objectName,
    operations: ["get"],
    validUntil: expiresAt,
  });
  const { presignedUrl } = await presignUrl(token, {
    access: "private",
    operation: "get",
    pathname: objectName,
    validUntil: expiresAt,
  });
  return presignedUrl;
}

export async function deleteVideoFile(objectName) {
  if (!objectName) return;
  await del(objectName);
}

function sanitize(name) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 100);
}
