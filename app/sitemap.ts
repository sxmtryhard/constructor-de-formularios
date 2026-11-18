import type { MetadataRoute } from "next";
import { SITE_URL } from "@/shared/ui/site";

/** Solo las páginas públicas e indexables. Los formularios publicados (`/f/…`) no se listan (F17 · Reto 1). */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${SITE_URL}/`, changeFrequency: "monthly", priority: 1 },
    { url: `${SITE_URL}/login`, changeFrequency: "yearly", priority: 0.5 },
  ];
}
