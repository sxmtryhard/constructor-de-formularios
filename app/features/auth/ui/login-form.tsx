"use client";

import { createUserWithEmailAndPassword, signInWithEmailAndPassword, type UserCredential } from "firebase/auth";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { apiEmpty } from "@/shared/ui/api";
import { getClientAuth } from "@/shared/ui/firebase-client";
import type { CreateSessionInput } from "../schema";

type Mode = "ingresar" | "crear";

const MODE_TEXT: Record<Mode, { title: string; submit: string; switchText: string; password: string }> = {
  ingresar: {
    title: "Ingresar",
    submit: "Ingresar",
    switchText: "¿No tienes cuenta? Crear una cuenta",
    password: "current-password",
  },
  crear: {
    title: "Crear cuenta",
    submit: "Crear cuenta",
    switchText: "¿Ya tienes cuenta? Ingresar",
    password: "new-password",
  },
};

const FIREBASE_ERRORS: Record<string, string> = {
  "auth/invalid-credential": "Correo o contraseña incorrectos.",
  "auth/invalid-email": "El correo no es válido.",
  "auth/email-already-in-use": "Ya existe una cuenta con ese correo. Usa «Ingresar».",
  "auth/weak-password": "La contraseña es muy débil: usa al menos 6 caracteres.",
  "auth/too-many-requests": "Demasiados intentos. Espera un momento.",
  "auth/network-request-failed": "No hay conexión con Firebase.",
};

const GENERIC_ERROR = "No se pudo iniciar sesión. Inténtalo de nuevo.";

function describeAuthError<T>(error: T): string {
  if (error instanceof Error && "code" in error && typeof error.code === "string") {
    return FIREBASE_ERRORS[error.code] ?? GENERIC_ERROR;
  }
  return GENERIC_ERROR;
}

/** Solo se aceptan rutas internas en `?siguiente` (evita redirecciones abiertas). */
function safeNext(next: string | null): string {
  if (next !== null && next.startsWith("/") && !next.startsWith("//")) {
    return next;
  }
  return "/formularios";
}

async function createSession(credential: UserCredential): Promise<string | null> {
  const body: CreateSessionInput = { id_token: await credential.user.getIdToken() };
  const result = await apiEmpty("/api/auth/sesion", "POST", body);
  if (!result.ok) {
    return result.error.error;
  }
  return null;
}

async function signInOrRegister(mode: Mode, email: string, password: string): Promise<string | null> {
  const firebase = getClientAuth();
  if (!firebase.ok) {
    return firebase.error;
  }
  try {
    let credential: UserCredential;
    if (mode === "crear") {
      credential = await createUserWithEmailAndPassword(firebase.auth, email, password);
    } else {
      credential = await signInWithEmailAndPassword(firebase.auth, email, password);
    }
    return await createSession(credential);
  } catch (caught) {
    return describeAuthError(caught);
  }
}

export function LoginForm({ next }: { next: string | null }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("ingresar");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const text = MODE_TEXT[mode];

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    setBusy(true);
    setError(null);
    const failure = await signInOrRegister(
      mode,
      String(fields.get("correo") ?? ""),
      String(fields.get("contrasena") ?? ""),
    );
    if (failure !== null) {
      setError(failure);
      setBusy(false);
      return;
    }
    router.push(safeNext(next));
    router.refresh();
  }

  function toggleMode() {
    setError(null);
    if (mode === "ingresar") {
      setMode("crear");
    } else {
      setMode("ingresar");
    }
  }

  return (
    <section aria-labelledby="titulo-login" className="mx-auto max-w-md">
      <h1 id="titulo-login" className="text-3xl font-bold text-primary-strong">
        {text.title}
      </h1>
      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <p>
          <label htmlFor="correo" className="mb-1 block font-semibold">
            Correo electrónico
          </label>
          <input id="correo" name="correo" type="email" autoComplete="email" required className="field-input" />
        </p>
        <p>
          <label htmlFor="contrasena" className="mb-1 block font-semibold">
            Contraseña (mínimo 6 caracteres)
          </label>
          <input
            id="contrasena"
            name="contrasena"
            type="password"
            autoComplete={text.password}
            required
            minLength={6}
            className="field-input"
          />
        </p>
        <p role="alert" className="font-semibold text-danger">
          {error}
        </p>
        <div className="flex flex-col gap-3 md:flex-row">
          <button type="submit" className="btn-primary" disabled={busy}>
            {text.submit}
          </button>
          <button type="button" className="btn-secondary" onClick={toggleMode}>
            {text.switchText}
          </button>
        </div>
      </form>
    </section>
  );
}
