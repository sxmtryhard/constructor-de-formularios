import type { DocumentSnapshot, Firestore } from "firebase-admin/firestore";
import { z } from "zod";
import { parseStored } from "@/shared/server/validation";
import { Field } from "../schema";
import {
  type FormPage,
  type FormPatch,
  type FormRecord,
  type FormsRepository,
  type FormVersionRecord,
  type NewFormRecord,
  paginateNewestFirst,
} from "./repository";

const FORMS = "formularios";
const VERSIONS = "versiones";
/** Subcolección de la feature de respuestas; solo se nombra aquí para borrarla junto al formulario. */
const RESPONSES = "respuestas";
const CODES = "codigos";
/** Tope de formularios leídos por autor al listar (se ordena en memoria y no necesita índice compuesto). */
const MAX_FORMS_PER_AUTHOR = 1000;

const FormDoc = z.object({
  autorUid: z.string(),
  titulo: z.string(),
  descripcion: z.string(),
  campos: z.array(Field),
  version: z.number().int().min(1),
  publicado: z.boolean(),
  codigo: z.string().nullable(),
  cierra: z.string().nullable(),
  totalRespuestas: z.number().int().min(0),
  creadoEn: z.string(),
  actualizadoEn: z.string(),
});

const VersionDoc = z.object({
  version: z.number().int().min(1),
  campos: z.array(Field),
  creadaEn: z.string(),
});

const CodeDoc = z.object({ formularioId: z.string().min(1) });

function toRecord(snapshot: DocumentSnapshot): FormRecord | null {
  if (!snapshot.exists) {
    return null;
  }
  return { id: snapshot.id, ...parseStored(FormDoc, snapshot.data()) };
}

/** Repositorio real en Firestore (ADR-0003). Cada documento leído se valida con Zod (corrupto → 500). */
export class FirestoreFormsRepository implements FormsRepository {
  constructor(private readonly db: Firestore) {}

  async create(record: NewFormRecord): Promise<FormRecord> {
    const ref = this.db.collection(FORMS).doc();
    await ref.set(FormDoc.parse(record));
    return { ...record, id: ref.id };
  }

  async findById(id: string): Promise<FormRecord | null> {
    return toRecord(await this.db.collection(FORMS).doc(id).get());
  }

  async listByAuthor(autorUid: string, limit: number, cursor: string | undefined): Promise<FormPage> {
    const snapshot = await this.db
      .collection(FORMS)
      .where("autorUid", "==", autorUid)
      .limit(MAX_FORMS_PER_AUTHOR)
      .get();
    const records = snapshot.docs.map((doc) => ({ id: doc.id, ...parseStored(FormDoc, doc.data()) }));
    return paginateNewestFirst(records, limit, cursor);
  }

  async update(id: string, patch: FormPatch): Promise<void> {
    await this.db.collection(FORMS).doc(id).update(FormDoc.partial().parse(patch));
  }

  async delete(id: string): Promise<void> {
    const ref = this.db.collection(FORMS).doc(id);
    // Las subcolecciones no se borran con su documento padre en Firestore. Van primero: si algo falla,
    // el formulario sigue existiendo y el borrado se puede reintentar (al revés quedarían huérfanas).
    await this.db.recursiveDelete(ref.collection(RESPONSES));
    await this.db.recursiveDelete(ref.collection(VERSIONS));
    await this.db.runTransaction(async (transaction) => {
      const current = toRecord(await transaction.get(ref));
      if (current === null) {
        return;
      }
      if (current.codigo !== null) {
        transaction.delete(this.db.collection(CODES).doc(current.codigo));
      }
      transaction.delete(ref);
    });
  }

  async saveVersion(formId: string, version: FormVersionRecord): Promise<void> {
    const ref = this.db.collection(FORMS).doc(formId).collection(VERSIONS).doc(String(version.version));
    await ref.set(VersionDoc.parse(version));
  }

  async findVersions(formId: string, versions: number[]): Promise<FormVersionRecord[]> {
    if (versions.length === 0) {
      return [];
    }
    const collection = this.db.collection(FORMS).doc(formId).collection(VERSIONS);
    const snapshots = await this.db.getAll(...versions.map((version) => collection.doc(String(version))));
    return snapshots.filter((snapshot) => snapshot.exists).map((snapshot) => parseStored(VersionDoc, snapshot.data()));
  }

  async reserveCode(codigo: string, formId: string): Promise<boolean> {
    try {
      await this.db.collection(CODES).doc(codigo).create({ formularioId: formId });
      return true;
    } catch {
      // ALREADY_EXISTS: el código ya está tomado; el servicio prueba otro.
      return false;
    }
  }

  async findByCode(codigo: string): Promise<FormRecord | null> {
    const snapshot = await this.db.collection(CODES).doc(codigo).get();
    if (!snapshot.exists) {
      return null;
    }
    const { formularioId } = parseStored(CodeDoc, snapshot.data());
    return this.findById(formularioId);
  }
}
