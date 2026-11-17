import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "@/features/auth/ui/login-form";
import { LoadingSkeleton } from "@/shared/ui/status";

export const metadata: Metadata = { title: "Ingresar" };

async function LoginWithNext({ searchParams }: { searchParams: PageProps<"/login">["searchParams"] }) {
  const params = await searchParams;
  let next: string | null = null;
  if (typeof params.siguiente === "string") {
    next = params.siguiente;
  }
  return <LoginForm next={next} />;
}

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <Suspense fallback={<LoadingSkeleton label="Cargando…" rows={2} />}>
      <LoginWithNext searchParams={searchParams} />
    </Suspense>
  );
}
