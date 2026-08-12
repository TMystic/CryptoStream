import admin from "firebase-admin";
import { env } from "./env.js";

export function getBucket() {
  const { projectId, clientEmail, privateKey, storageBucket } = env.firebase;
  if (!projectId || !clientEmail || !privateKey || !storageBucket) {
    throw new Error("Firebase Storage is not configured on the server");
  }

  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
      storageBucket,
    });
  }

  return admin.storage().bucket();
}
