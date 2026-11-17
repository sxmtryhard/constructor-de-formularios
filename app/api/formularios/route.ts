import type { NextRequest } from "next/server";
import { getFormsService, getRateLimiters } from "@/features/container";
import { FormInput } from "@/features/forms/schema";
import { PageQuery } from "@/shared/schema";
import { exigirOrigen, json, leerJson, manejar, queryDe } from "@/shared/server/http";
import { requerirUsuario } from "@/shared/server/session";

export async function GET(request: NextRequest) {
  return manejar(async () => {
    const user = await requerirUsuario(request);
    const query = PageQuery.parse(queryDe(request));
    return json(await getFormsService().list(user.uid, query));
  });
}

export async function POST(request: NextRequest) {
  return manejar(async () => {
    exigirOrigen(request);
    const user = await requerirUsuario(request);
    const now = new Date();
    getRateLimiters().write.consume(user.uid, now);
    const input = await leerJson(request, FormInput);
    return json(await getFormsService().create(user.uid, input, now), 201);
  });
}
