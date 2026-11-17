import { type FirebaseApp, getApp, getApps, initializeApp } from "firebase/app";
import { type Auth, getAuth } from "firebase/auth";

/** Configuración web de Firebase. Los accesos son literales para que Next los incruste en el bundle. */
const FIREBASE_WEB_CONFIG = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export type ClientAuthResult = { ok: true; auth: Auth } | { ok: false; error: string };

const MISSING_CONFIG =
  "Falta la configuración de Firebase del navegador (NEXT_PUBLIC_FIREBASE_*). Revisa el archivo de entorno y reinicia el servidor.";

/** Devuelve Firebase Auth del navegador (solo `firebase/app` y `firebase/auth`, nunca Firestore). */
export function getClientAuth(): ClientAuthResult {
  const { apiKey, authDomain, projectId, appId } = FIREBASE_WEB_CONFIG;
  if (!apiKey || !authDomain || !projectId || !appId) {
    return { ok: false, error: MISSING_CONFIG };
  }
  let app: FirebaseApp;
  if (getApps().length > 0) {
    app = getApp();
  } else {
    app = initializeApp({ apiKey, authDomain, projectId, appId });
  }
  return { ok: true, auth: getAuth(app) };
}
