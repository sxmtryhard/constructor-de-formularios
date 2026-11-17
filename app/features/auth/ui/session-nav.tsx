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

/** Enlace «Ingresar» o botón «Salir» según la sesión (la consulta `GET /api/auth/yo`). */
export function SessionNav() {
  const router = useRouter();
  const [state, setState] = useState<SessionState>("cargando");

  useEffect(() => {
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
  }, []);

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

  if (state === "con-sesion") {
    return (
      <button type="button" onClick={handleSignOut} className={`${NAV_LINK} cursor-pointer`}>
        Salir
      </button>
    );
  }
  return (
    <Link href="/login" className={NAV_LINK}>
      Ingresar
    </Link>
  );
}
