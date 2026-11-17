import type { NextRequest } from "next/server";
import { getResponsesService } from "@/features/container";
import { json, manejar } from "@/shared/server/http";
import { requerirUsuario } from "@/shared/server/session";

interface Context {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, context: Context) {
  return manejar(async () => {
    const user = await requerirUsuario(request);
    const { id } = await context.params;
    return json(await getResponsesService().summary(user.uid, id));
  });
}
