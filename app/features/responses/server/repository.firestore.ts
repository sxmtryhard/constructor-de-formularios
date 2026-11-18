import { FieldValue, type Firestore, type QueryDocumentSnapshot } from "firebase-admin/firestore";
import { z } from "zod";
import { AnswerValue } from "@/features/forms/schema";
import { parseStored } from "@/shared/server/validation";
import type { NewResponseRecord, ResponsePage, ResponseRecord, ResponsesRepository } from "./repository";

const FORMS = "formularios";
const RESPONSES = "respuestas";

const ResponseDoc = z.object({
  version: z.number().int().min(1),
  respondidoEn: z.string(),
  valores: z.record(z.string(), AnswerValue),
  uid: z.string().nullable(),
});

function toRecord(doc: QueryDocumentSnapshot): ResponseRecord {
  return { id: doc.id, ...parseStored(ResponseDoc, doc.data()) };
}

/** Respuestas en `formularios/{id}/respuestas`; cada documento leído se valida con Zod (corrupto → 500). */
export class FirestoreResponsesRepository implements ResponsesRepository {
  constructor(private readonly db: Firestore) {}

  private collection(formId: string) {
    return this.db.collection(FORMS).doc(formId).collection(RESPONSES);
  }

  async add(formId: string, record: NewResponseRecord): Promise<string> {
    const ref = this.collection(formId).doc();
    const batch = this.db.batch();
    batch.set(ref, ResponseDoc.parse(record));
    batch.update(this.db.collection(FORMS).doc(formId), { totalRespuestas: FieldValue.increment(1) });
    await batch.commit();
    return ref.id;
  }

  async listPage(formId: string, limit: number, cursor: string | undefined): Promise<ResponsePage> {
    let query = this.collection(formId)
      .orderBy("respondidoEn", "desc")
      .limit(limit + 1);
    if (cursor !== undefined) {
      const cursorSnapshot = await this.collection(formId).doc(cursor).get();
      if (cursorSnapshot.exists) {
        query = query.startAfter(cursorSnapshot);
      }
    }
    const snapshot = await query.get();
    const records = snapshot.docs.map(toRecord);
    const items = records.slice(0, limit);
    let nextCursor: string | null = null;
    if (records.length > limit && items.length > 0) {
      nextCursor = items[items.length - 1].id;
    }
    return { items, nextCursor };
  }

  async listAll(formId: string, max: number): Promise<ResponseRecord[]> {
    const snapshot = await this.collection(formId).orderBy("respondidoEn", "desc").limit(max).get();
    return snapshot.docs.map(toRecord);
  }
}
