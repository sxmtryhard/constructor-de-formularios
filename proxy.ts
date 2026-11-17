import { type NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/features/auth/schema";

/**
 * Solo UX: sin cookie `sesion`, `/formularios/**` redirige a `/login?siguiente=<ruta>`.
 * La autorización real la hace el servidor en cada ruta de la API (`requerirUsuario`).
 */
export function proxy(request: NextRequest) {
  if (request.cookies.has(SESSION_COOKIE)) {
    return NextResponse.next();
  }
  const login = new URL("/login", request.url);
  login.searchParams.set("siguiente", `${request.nextUrl.pathname}${request.nextUrl.search}`);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ["/formularios", "/formularios/:path*"],
};
