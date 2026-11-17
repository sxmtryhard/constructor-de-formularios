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

/**
 * Variables de entorno del servidor, validadas la primera vez que se piden (no al importar).
 * Si faltan, lanza un `Error` normal (→ 500 genérico), NUNCA un `ZodError`: ese se traduciría
 * en un 400 que le mostraría al cliente los nombres de la configuración del servidor.
 */
export function serverEnv(): ServerEnv {
  if (cached === null) {
    const result = ServerEnv.safeParse(process.env);
    if (!result.success) {
      const missing = result.error.issues.map((issue) => issue.path.join(".")).join(", ");
      console.error(`[env] Configuración del servidor incompleta: ${missing}`);
      throw new Error("Configuración del servidor incompleta");
    }
    cached = result.data;
  }
  return cached;
}
