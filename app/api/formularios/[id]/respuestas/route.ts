import type { NextRequest } from "next/server";
import { getResponsesService } from "@/features/container";
import { PageQuery } from "@/shared/schema";
import { json, manejar, queryDe } from "@/shared/server/http";
import { requerirUsuario } from "@/shared/server/session";

interface Context {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, context: Context) {
  return manejar(async () => {
    const user = await requerirUsuario(request);
    const query = PageQuery.parse(queryDe(request));
    const { id } = await context.params;
    return json(await getResponsesService().list(user.uid, id, query));
  });
}
