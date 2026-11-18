import type { NextRequest } from "next/server";
import { getFormsService, getRateLimiters } from "@/features/container";
import { FormIdParam, PublishInput } from "@/features/forms/schema";
import { exigirOrigen, json, leerJson, manejar } from "@/shared/server/http";
import { paramValido } from "@/shared/server/validation";
import { requerirUsuario } from "@/shared/server/session";

const NOT_FOUND = "Formulario no encontrado";

interface Context {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, context: Context) {
  return manejar(async () => {
    exigirOrigen(request);
    const user = await requerirUsuario(request);
    const now = new Date();
    getRateLimiters().write.consume(user.uid, now);
    const input = await leerJson(request, PublishInput);
    const id = paramValido((await context.params).id, FormIdParam, NOT_FOUND);
    return json(await getFormsService().publish(user.uid, id, input, now));
  });
}
