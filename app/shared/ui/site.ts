/** URL pública del sitio (F17 · Reto 1): `NEXT_PUBLIC_SITE_URL` si existe; si no, la de Vercel. Sin barra final. */
const DEFAULT_SITE_URL = "https://constructor-de-formularios.vercel.app";

function resolveSiteUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL;
  if (fromEnv !== undefined && fromEnv.trim() !== "") {
    return fromEnv.trim().replace(/\/+$/, "");
  }
  return DEFAULT_SITE_URL;
}

export const SITE_URL = resolveSiteUrl();
export const SITE_NAME = "Constructor de formularios";
export const SITE_DESCRIPTION =
  "Crea formularios arrastrando campos, publícalos con un enlace y revisa las respuestas.";
