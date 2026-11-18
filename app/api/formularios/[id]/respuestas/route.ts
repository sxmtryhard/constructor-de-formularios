import type { NextRequest } from "next/server";
import { getResponsesService } from "@/features/container";
import { PageQuery } from "@/shared/schema";
import { FormIdParam } from "@/features/forms/schema";
import { json, manejar, queryDe } from "@/shared/server/http";
import { paramValido } from "@/shared/server/validation";
import { requerirUsuario } from "@/shared/server/session";

const NOT_FOUND = "Formulario no encontrado";

interface Context {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, context: Context) {
  return manejar(async () => {
    const user = await requerirUsuario(request);
    const query = PageQuery.parse(queryDe(request));
    const id = paramValido((await context.params).id, FormIdParam, NOT_FOUND);
    return json(await getResponsesService().list(user.uid, id, query));
  });
}
