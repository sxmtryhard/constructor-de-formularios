import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { Suspense } from "react";
import { SESSION_COOKIE } from "@/features/auth/schema";
import { SessionNav, SignInLink } from "@/features/auth/ui/session-nav";
import "./globals.css";

export const metadata: Metadata = {
  title: { template: "%s · Constructor de formularios", default: "Constructor de formularios" },
  description: "Crea formularios arrastrando campos, publícalos con un enlace y revisa las respuestas.",
};

const NAV_LINK = "inline-flex min-h-11 items-center px-2 text-surface underline hover:text-surface-strong";

/** Solo comprueba si EXISTE la cookie de sesión (no la verifica): así las páginas públicas no consultan `/api/auth/yo`. */
async function SessionSlot() {
  const cookieStore = await cookies();
  return <SessionNav hasSessionCookie={cookieStore.has(SESSION_COOKIE)} />;
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es">
      <body className="flex min-h-screen flex-col bg-surface text-ink">
        <a href="#contenido" className="skip-link">
          Saltar al contenido
        </a>
        <header className="bg-primary-strong text-surface">
          <nav
            aria-label="Principal"
            className="mx-auto flex w-full max-w-5xl flex-col gap-2 px-4 py-3 md:flex-row md:items-center md:justify-between"
          >
            <Link href="/" className="inline-flex min-h-11 items-center text-lg font-bold text-surface">
              Constructor de formularios
            </Link>
            <ul className="flex flex-wrap items-center gap-2">
              <li>
                <Link href="/" className={NAV_LINK}>
                  Inicio
                </Link>
              </li>
              <li>
                <Link href="/formularios" className={NAV_LINK}>
                  Mis formularios
                </Link>
              </li>
              <li>
                <Suspense fallback={<SignInLink />}>
                  <SessionSlot />
                </Suspense>
              </li>
            </ul>
          </nav>
        </header>
        <main id="contenido" className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
          {children}
        </main>
        <footer className="bg-primary-deep text-surface">
          <p className="mx-auto w-full max-w-5xl px-4 py-4 text-sm">
            Constructor de formularios dinámicos · Trabajo final de Desarrollo Web
          </p>
        </footer>
      </body>
    </html>
  );
}
