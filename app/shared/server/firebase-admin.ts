import "server-only";
import { type App, cert, getApps, initializeApp } from "firebase-admin/app";
import { type Auth, getAuth } from "firebase-admin/auth";
import { type Firestore, getFirestore } from "firebase-admin/firestore";
import { serverEnv } from "./env";

function usingEmulator(): boolean {
  const env = serverEnv();
  return env.FIRESTORE_EMULATOR_HOST !== undefined || env.FIREBASE_AUTH_EMULATOR_HOST !== undefined;
}

/** App del Admin SDK, creada la primera vez que se usa (no al importar). */
function adminApp(): App {
  const existing = getApps()[0];
  if (existing !== undefined) {
    return existing;
  }
  const env = serverEnv();
  if (usingEmulator()) {
    return initializeApp({ projectId: env.FIREBASE_PROJECT_ID });
  }
  if (env.FIREBASE_CLIENT_EMAIL === undefined || env.FIREBASE_PRIVATE_KEY === undefined) {
    throw new Error("Faltan FIREBASE_CLIENT_EMAIL o FIREBASE_PRIVATE_KEY");
  }
  return initializeApp({
    credential: cert({
      projectId: env.FIREBASE_PROJECT_ID,
      clientEmail: env.FIREBASE_CLIENT_EMAIL,
      privateKey: env.FIREBASE_PRIVATE_KEY,
    }),
  });
}

export function adminAuth(): Auth {
  return getAuth(adminApp());
}

export function adminDb(): Firestore {
  return getFirestore(adminApp());
}
