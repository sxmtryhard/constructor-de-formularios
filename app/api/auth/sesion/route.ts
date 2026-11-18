import { type NextRequest, NextResponse } from "next/server";
import { getSessionService } from "@/features/container";
import { CreateSessionInput, SESSION_COOKIE, SESSION_MAX_AGE_SECONDS } from "@/features/auth/schema";
import { exigirOrigen, leerJson, manejar } from "@/shared/server/http";

function sessionResponse(): NextResponse {
  return new NextResponse(null, { status: 204, headers: { "Cache-Control": "no-store" } });
}

/** Cambia el ID token de Firebase Auth por la cookie `sesion` (HttpOnly, 5 días). */
export async function POST(request: NextRequest) {
  return manejar(async () => {
    exigirOrigen(request);
    const input = await leerJson(request, CreateSessionInput);
    const cookie = await getSessionService().createSession(input.id_token, new Date());
    const response = sessionResponse();
    response.cookies.set(SESSION_COOKIE, cookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_MAX_AGE_SECONDS,
    });
    return response;
  });
}

/** Cierra la sesión: revoca los refresh tokens (si había cookie válida) y borra la cookie. */
export async function DELETE(request: NextRequest) {
  return manejar(async () => {
    // CSRF: otro sitio no puede cerrar la sesión (y revocar los tokens) de la persona.
    exigirOrigen(request);
    const cookie = request.cookies.get(SESSION_COOKIE)?.value;
    if (cookie !== undefined && cookie.length > 0) {
      await getSessionService().revokeSession(cookie);
    }
    const response = sessionResponse();
    response.cookies.set(SESSION_COOKIE, "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });
    return response;
  });
}
