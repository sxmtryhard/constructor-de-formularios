import type { Metadata } from "next";
import type { ReactNode } from "react";

/** Los enlaces públicos de respuesta no se indexan (F17 · Reto 1). */
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function PublicFormLayout({ children }: { children: ReactNode }) {
  return children;
}
