import { randomUUID } from "crypto";
import { del, head, issueSignedToken, list, presignUrl } from "@vercel/blob";

export async function createUploadUrl({ contentType, originalName, fileSize }) {
  const objectName = `videos/${Date.now()}-${randomUUID()}-${sanitize(originalName)}`;
  const expiresAt = Date.now() + 15 * 60 * 1000;
  const token = await issueSignedToken({
    pathname: objectName,
    operations: ["put"],
    validUntil: expiresAt,
    allowedContentTypes: [contentType],
    maximumSizeInBytes: fileSize,
    addRandomSuffix: false,
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

export async function inspectVideoFile(objectName, uploadedPathname) {
  let pathname = uploadedPathname
    ? validateUploadedPath(objectName, uploadedPathname)
    : await resolveUploadedPath(objectName);
  let metadata;
  try {
    metadata = await head(pathname);
  } catch (error) {
    if (error?.name !== "BlobNotFoundError") throw error;
    pathname = await resolveUploadedPath(objectName);
    metadata = await head(pathname);
  }
  return { pathname, size: Number(metadata.size), contentType: metadata.contentType };
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
  const pathname = await resolveUploadedPath(objectName).catch(() => objectName);
  await del(pathname);
}

async function resolveUploadedPath(objectName) {
  try {
    await head(objectName);
    return objectName;
  } catch (error) {
    if (error?.name !== "BlobNotFoundError") throw error;
  }

  // Private Blob adds a unique security suffix to signed PUT pathnames. Find
  // only the object derived from this upload's UUID-scoped authorized name.
  const { stem, extension } = splitExtension(objectName);
  const { blobs } = await list({ prefix: `${stem}-`, limit: 10 });
  const match = blobs.find((blob) => isAuthorizedUploadedPath(objectName, blob.pathname));
  if (!match) {
    const error = new Error("Uploaded video was not found in private storage");
    error.statusCode = 404;
    throw error;
  }
  return match.pathname;
}

function validateUploadedPath(objectName, pathname) {
  if (!isAuthorizedUploadedPath(objectName, pathname)) {
    const error = new Error("Storage returned an unexpected upload pathname");
    error.statusCode = 400;
    throw error;
  }
  return pathname;
}

function isAuthorizedUploadedPath(objectName, pathname) {
  if (pathname === objectName) return true;
  const { stem, extension } = splitExtension(objectName);
  return pathname.startsWith(`${stem}-`) && pathname.endsWith(extension);
}

function splitExtension(pathname) {
  const slash = pathname.lastIndexOf("/");
  const dot = pathname.lastIndexOf(".");
  if (dot <= slash) return { stem: pathname, extension: "" };
  return { stem: pathname.slice(0, dot), extension: pathname.slice(dot) };
}

function sanitize(name) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 100);
}
