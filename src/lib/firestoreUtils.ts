import {
    type DocumentData,
    type QueryConstraint,
    type QueryDocumentSnapshot,
    collection,
    deleteField,
    doc,
    documentId,
    getDoc,
    getDocs,
    query,
    where,
} from 'firebase/firestore';
import { db } from './firebase';

// Firestore's `in` operator accepts at most 30 values per query.
const IN_QUERY_CHUNK_SIZE = 30;

export function withId<T>(snap: QueryDocumentSnapshot<DocumentData>): T {
    return { id: snap.id, ...(snap.data() as object) } as T;
}

function chunk<T>(items: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < items.length; i += size) {
        chunks.push(items.slice(i, i + size));
    }
    return chunks;
}

// Replaces the old server's batched `IN (...)` relation-attachment
// (`attachRelations`/`rowsByIds` in server/database.js) now that Firestore
// has no server-side joins: fetch a base collection, then fan out to related
// collections by document ID, chunked to respect the 30-value `in` cap.
export async function fetchByIds<T>(collectionName: string, ids: Array<string | null | undefined>): Promise<Map<string, T>> {
    const uniqueIds = [...new Set(ids.filter((id): id is string => Boolean(id)))];
    const result = new Map<string, T>();
    if (uniqueIds.length === 0) return result;

    const chunks = chunk(uniqueIds, IN_QUERY_CHUNK_SIZE);
    const snapshots = await Promise.all(
        chunks.map((idsChunk) =>
            getDocs(query(collection(db, collectionName), where(documentId(), 'in', idsChunk)))
        )
    );

    snapshots.forEach((snap) => {
        snap.forEach((docSnap) => {
            result.set(docSnap.id, withId<T>(docSnap));
        });
    });

    return result;
}

// Chunked `where(field, 'in', values)` fan-out, optionally combined with
// extra equality/order constraints (e.g. `where('status','==','active')`).
// Replaces the old server's `.in('col', ids).eq('status','active')` calls.
export async function fetchWhereIn<T>(
    collectionName: string,
    field: string,
    values: Array<string | null | undefined>,
    ...extra: QueryConstraint[]
): Promise<T[]> {
    const uniqueValues = [...new Set(values.filter((v): v is string => Boolean(v)))];
    if (uniqueValues.length === 0) return [];

    const chunks = chunk(uniqueValues, IN_QUERY_CHUNK_SIZE);
    const snapshots = await Promise.all(
        chunks.map((valuesChunk) =>
            getDocs(query(collection(db, collectionName), where(field, 'in', valuesChunk), ...extra))
        )
    );

    return snapshots.flatMap((snap) => snap.docs.map((d) => withId<T>(d)));
}

export async function fetchById<T>(collectionName: string, id: string): Promise<T | null> {
    const snap = await getDoc(doc(db, collectionName, id));
    return snap.exists() ? withId<T>(snap as QueryDocumentSnapshot<DocumentData>) : null;
}

export function nowIso(): string {
    return new Date().toISOString();
}

// Firestore's setDoc/addDoc reject literal `undefined` field values outright.
// Form state commonly uses `value || undefined` for "cleared" optional
// fields - strip those before a create-style write.
export function stripUndefined<T extends Record<string, unknown>>(obj: T): T {
    const result = {} as T;
    (Object.keys(obj) as (keyof T)[]).forEach((key) => {
        if (obj[key] !== undefined) result[key] = obj[key];
    });
    return result;
}

// updateDoc has the same restriction, but unlike setDoc it merges by field -
// omitting a key leaves the old value in place. Map `undefined` to
// `deleteField()` so clearing an optional field in a form actually clears it.
export function toFirestoreUpdate<T extends Record<string, unknown>>(obj: T): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    Object.keys(obj).forEach((key) => {
        result[key] = obj[key] === undefined ? deleteField() : obj[key];
    });
    return result;
}
