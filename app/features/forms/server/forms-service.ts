import { randomInt } from "node:crypto";
import type { PageQuery } from "@/shared/schema";
import { ConflictError, GoneError, NotFoundError, ValidationError } from "@/shared/server/errors";
import type { Form, FormInput, FormList, PublicForm, PublishInput } from "../schema";
import type { FormPatch, FormRecord, FormsRepository } from "./repository";

const CODE_ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";
const CODE_LENGTH = 10;
const CODE_ATTEMPTS = 5;

/** Código público: 10 caracteres `[a-z0-9]` aleatorios (crypto). */
export function generatePublicCode(): string {
  let code = "";
  for (let index = 0; index < CODE_LENGTH; index += 1) {
    code += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  }
  return code;
}

/** Registro guardado → formulario del contrato (snake_case). */
export function toForm(record: FormRecord): Form {
  return {
    id: record.id,
    titulo: record.titulo,
    descripcion: record.descripcion,
    campos: record.campos,
    version: record.version,
    publicado: record.publicado,
    codigo: record.codigo,
    cierra: record.cierra,
    total_respuestas: record.totalRespuestas,
    creado_en: record.creadoEn,
    actualizado_en: record.actualizadoEn,
  };
}

/** Un formulario se puede responder si está publicado y no ha pasado `cierra` (404 / 410). */
export function assertOpen(record: FormRecord | null, now: Date): FormRecord {
  if (record === null || !record.publicado || record.codigo === null) {
    throw new NotFoundError("Formulario no encontrado");
  }
  if (record.cierra !== null && now.getTime() >= Date.parse(record.cierra)) {
    throw new GoneError("El formulario está cerrado");
  }
  return record;
}

export interface FormsService {
  create(uid: string, input: FormInput, now: Date): Promise<Form>;
  list(uid: string, query: PageQuery): Promise<FormList>;
  get(uid: string, id: string): Promise<Form>;
  update(uid: string, id: string, input: FormInput, now: Date): Promise<Form>;
  remove(uid: string, id: string): Promise<void>;
  publish(uid: string, id: string, input: PublishInput, now: Date): Promise<Form>;
  unpublish(uid: string, id: string, now: Date): Promise<Form>;
  getPublic(codigo: string, now: Date): Promise<PublicForm>;
}

export interface FormsServiceDeps {
  repo: FormsRepository;
  generateCode?: () => string;
}

function sameFields(a: FormRecord["campos"], b: FormRecord["campos"]): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function validatePublish(record: FormRecord, input: PublishInput, now: Date): void {
  if (record.campos.length === 0) {
    throw new ValidationError("El formulario necesita al menos un campo para publicarse", [
      { campo: "campos", mensaje: "Agrega al menos un campo" },
    ]);
  }
  if (input.cierra !== null && Date.parse(input.cierra) <= now.getTime()) {
    throw new ValidationError("La fecha de cierre debe ser futura", [
      { campo: "cierra", mensaje: "La fecha de cierre debe ser futura" },
    ]);
  }
}

export function createFormsService(deps: FormsServiceDeps): FormsService {
  const { repo } = deps;
  const generateCode = deps.generateCode ?? generatePublicCode;

  async function findOwned(uid: string, id: string): Promise<FormRecord> {
    const record = await repo.findById(id);
    if (record === null || record.autorUid !== uid) {
      throw new NotFoundError("Formulario no encontrado");
    }
    return record;
  }

  async function reserveNewCode(formId: string): Promise<string> {
    for (let attempt = 0; attempt < CODE_ATTEMPTS; attempt += 1) {
      const code = generateCode();
      if (await repo.reserveCode(code, formId)) {
        return code;
      }
    }
    throw new ConflictError("No se pudo generar un código único; inténtalo de nuevo");
  }

  async function applyPatch(record: FormRecord, patch: FormPatch): Promise<Form> {
    await repo.update(record.id, patch);
    return toForm({ ...record, ...patch });
  }

  /**
   * Versionado (spec, decisión 6): si cambian los campos y ya hay respuestas, sube `version`.
   * En formularios ya publicados alguna vez, `versiones/{version}` refleja siempre los campos de esa versión.
   */
  async function update(uid: string, id: string, input: FormInput, now: Date): Promise<Form> {
    const record = await findOwned(uid, id);
    const patch: FormPatch = {
      titulo: input.titulo,
      descripcion: input.descripcion,
      campos: input.campos,
      actualizadoEn: now.toISOString(),
    };
    const fieldsChanged = !sameFields(record.campos, input.campos);
    let version = record.version;
    if (fieldsChanged && record.totalRespuestas > 0) {
      version += 1;
      patch.version = version;
    }
    if (fieldsChanged && record.codigo !== null) {
      await repo.saveVersion(id, { version, campos: input.campos, creadaEn: now.toISOString() });
    }
    return applyPatch(record, patch);
  }

  async function publish(uid: string, id: string, input: PublishInput, now: Date): Promise<Form> {
    const record = await findOwned(uid, id);
    validatePublish(record, input, now);
    let codigo = record.codigo;
    if (codigo === null) {
      codigo = await reserveNewCode(id);
    }
    await repo.saveVersion(id, { version: record.version, campos: record.campos, creadaEn: now.toISOString() });
    return applyPatch(record, { publicado: true, codigo, cierra: input.cierra, actualizadoEn: now.toISOString() });
  }

  return {
    async create(uid, input, now) {
      const stamp = now.toISOString();
      const record = await repo.create({
        autorUid: uid,
        titulo: input.titulo,
        descripcion: input.descripcion,
        campos: input.campos,
        version: 1,
        publicado: false,
        codigo: null,
        cierra: null,
        totalRespuestas: 0,
        creadoEn: stamp,
        actualizadoEn: stamp,
      });
      return toForm(record);
    },

    async list(uid, query) {
      const page = await repo.listByAuthor(uid, query.limite, query.cursor);
      return { items: page.items.map(toForm), siguiente_cursor: page.nextCursor };
    },

    async get(uid, id) {
      return toForm(await findOwned(uid, id));
    },

    update,

    async remove(uid, id) {
      await findOwned(uid, id);
      await repo.delete(id);
    },

    publish,

    async unpublish(uid, id, now) {
      const record = await findOwned(uid, id);
      return applyPatch(record, { publicado: false, actualizadoEn: now.toISOString() });
    },

    async getPublic(codigo, now) {
      const record = assertOpen(await repo.findByCode(codigo), now);
      return {
        codigo: codigo,
        titulo: record.titulo,
        descripcion: record.descripcion,
        campos: record.campos,
        version: record.version,
        cierra: record.cierra,
      };
    },
  };
}
