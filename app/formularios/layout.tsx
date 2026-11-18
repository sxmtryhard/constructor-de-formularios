import type { Metadata } from "next";
import type { ReactNode } from "react";

/** El panel del creador (`/formularios/**`) no se indexa (F17 · Reto 1). */
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function FormsLayout({ children }: { children: ReactNode }) {
  return children;
}
