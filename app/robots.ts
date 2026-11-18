import type { MetadataRoute } from "next";
import { SITE_URL } from "@/shared/ui/site";

/** Permite `/` y `/login`; bloquea la API, el panel del creador y los enlaces públicos de respuesta (F17 · Reto 1). */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/login"],
      disallow: ["/api/", "/formularios", "/f/"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
