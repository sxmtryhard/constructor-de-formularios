import { z } from "zod";

function isWrapped(text: string, quote: string): boolean {
  return text.length >= 2 && text.startsWith(quote) && text.endsWith(quote);
}

/** Quita comillas envolventes y convierte los `\n` literales en saltos de línea reales. */
export function normalizePrivateKey(raw: string): string {
  let key = raw.trim();
  if (isWrapped(key, '"') || isWrapped(key, "'")) {
    key = key.slice(1, -1);
  }
  return key.replace(/\\n/g, "\n");
}

const ServerEnv = z.object({
  FIREBASE_PROJECT_ID: z.string().min(1),
  FIREBASE_CLIENT_EMAIL: z.string().min(1).optional(),
  FIREBASE_PRIVATE_KEY: z.string().min(1).transform(normalizePrivateKey).optional(),
  FIRESTORE_EMULATOR_HOST: z.string().min(1).optional(),
  FIREBASE_AUTH_EMULATOR_HOST: z.string().min(1).optional(),
});
export type ServerEnv = z.infer<typeof ServerEnv>;

let cached: ServerEnv | null = null;

/** Variables de entorno del servidor, validadas la primera vez que se piden (no al importar). */
export function serverEnv(): ServerEnv {
  if (cached === null) {
    cached = ServerEnv.parse(process.env);
  }
  return cached;
}
