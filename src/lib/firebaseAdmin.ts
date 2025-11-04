// src/lib/firebaseAdmin.ts
import * as admin from "firebase-admin";

if (!admin.apps.length) {
  const serviceAccountKeyJson = process.env.MY_APP_FIREBASE_ADMIN_KEY;

  if (!serviceAccountKeyJson) {
    console.error(
      "❌ CRITICAL: MY_APP_FIREBASE_ADMIN_KEY environment variable is not set.",
    );
    throw new Error(
      "Firebase Admin SDK key is missing. Cannot initialize Admin SDK.",
    );
  }

  try {
    const serviceAccount = JSON.parse(serviceAccountKeyJson);

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } catch (error) {
    console.error("❌ Error initializing Firebase Admin SDK:", error);
    throw new Error(
      "Failed to parse Firebase Admin SDK key or initialize Admin SDK.",
    );
  }
}

export const firebaseAdmin = admin;
