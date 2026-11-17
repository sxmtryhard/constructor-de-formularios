import type { NextRequest } from "next/server";
import { getFormsService, getRateLimiters } from "@/features/container";
import { FormInput } from "@/features/forms/schema";
import { exigirOrigen, json, leerJson, manejar, noContent } from "@/shared/server/http";
import { requerirUsuario } from "@/shared/server/session";

interface Context {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, context: Context) {
  return manejar(async () => {
    const user = await requerirUsuario(request);
    const { id } = await context.params;
    return json(await getFormsService().get(user.uid, id));
  });
}

export async function PUT(request: NextRequest, context: Context) {
  return manejar(async () => {
    exigirOrigen(request);
    const user = await requerirUsuario(request);
    const now = new Date();
    getRateLimiters().write.consume(user.uid, now);
    const input = await leerJson(request, FormInput);
    const { id } = await context.params;
    return json(await getFormsService().update(user.uid, id, input, now));
  });
}

export async function DELETE(request: NextRequest, context: Context) {
  return manejar(async () => {
    exigirOrigen(request);
    const user = await requerirUsuario(request);
    getRateLimiters().write.consume(user.uid, new Date());
    const { id } = await context.params;
    await getFormsService().remove(user.uid, id);
    return noContent();
  });
}
