import type { NextRequest } from "next/server";
import { getFormsService, getRateLimiters } from "@/features/container";
import { FormIdParam, FormInput } from "@/features/forms/schema";
import { exigirOrigen, json, leerJson, manejar, noContent } from "@/shared/server/http";
import { paramValido } from "@/shared/server/validation";
import { requerirUsuario } from "@/shared/server/session";

const NOT_FOUND = "Formulario no encontrado";

interface Context {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, context: Context) {
  return manejar(async () => {
    const user = await requerirUsuario(request);
    const id = paramValido((await context.params).id, FormIdParam, NOT_FOUND);
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
    const id = paramValido((await context.params).id, FormIdParam, NOT_FOUND);
    return json(await getFormsService().update(user.uid, id, input, now));
  });
}

export async function DELETE(request: NextRequest, context: Context) {
  return manejar(async () => {
    exigirOrigen(request);
    const user = await requerirUsuario(request);
    getRateLimiters().write.consume(user.uid, new Date());
    const id = paramValido((await context.params).id, FormIdParam, NOT_FOUND);
    await getFormsService().remove(user.uid, id);
    return noContent();
  });
}
