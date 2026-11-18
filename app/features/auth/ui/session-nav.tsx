"use client";

import { signOut } from "firebase/auth";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { MeResponse } from "@/shared/schema";
import { apiEmpty, apiJson } from "@/shared/ui/api";
import { getClientAuth } from "@/shared/ui/firebase-client";

type SessionState = "cargando" | "con-sesion" | "sin-sesion";

const NAV_LINK = "inline-flex min-h-11 items-center px-2 text-surface underline hover:text-surface-strong";

interface SessionNavProps {
  /** Lo calcula el layout en el servidor: si existe la cookie de sesión (HttpOnly, el cliente no la ve). */
  hasSessionCookie: boolean;
}

/**
 * Enlace «Ingresar» o botón «Salir» según la sesión. Sin cookie no hay nada que consultar;
 * con cookie se confirma con `GET /api/auth/yo` (puede estar vencida o revocada).
 */
export function SessionNav({ hasSessionCookie }: SessionNavProps) {
  const router = useRouter();
  const [state, setState] = useState<SessionState>("cargando");

  useEffect(() => {
    if (!hasSessionCookie) {
      return;
    }
    let active = true;
    void apiJson("/api/auth/yo", MeResponse).then((result) => {
      if (!active) {
        return;
      }
      if (result.ok) {
        setState("con-sesion");
      } else {
        setState("sin-sesion");
      }
    });
    return () => {
      active = false;
    };
  }, [hasSessionCookie]);

  async function handleSignOut() {
    await apiEmpty("/api/auth/sesion", "DELETE");
    const firebase = getClientAuth();
    if (firebase.ok) {
      await signOut(firebase.auth);
    }
    setState("sin-sesion");
    router.push("/login");
    router.refresh();
  }

  if (hasSessionCookie && state === "con-sesion") {
    return (
      <button type="button" onClick={handleSignOut} className={`${NAV_LINK} cursor-pointer`}>
        Salir
      </button>
    );
  }
  return <SignInLink />;
}

/** Enlace «Ingresar»; también sirve de `fallback` mientras el layout lee la cookie. */
export function SignInLink() {
  return (
    <Link href="/login" className={NAV_LINK}>
      Ingresar
    </Link>
  );
}
