import {
  db,
  collection,
  doc,
  getDoc,
  setDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  firestoreLimit,
  where,
  onSnapshot,
  serverTimestamp,
  type DocumentData,
} from './firebase';

// ─── Generic helpers ───────────────────────────────────────────

export async function getDocument<T>(collectionName: string, id: string): Promise<T | null> {
  const snap = await getDoc(doc(db, collectionName, id));
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as T) : null;
}

export async function setDocument(
  collectionName: string,
  id: string,
  data: Record<string, unknown>,
): Promise<void> {
  await setDoc(doc(db, collectionName, id), data, { merge: true });
}

export async function addDocument(
  collectionName: string,
  data: Record<string, unknown>,
): Promise<string> {
  const ref = await addDoc(collection(db, collectionName), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateDocument(
  collectionName: string,
  id: string,
  data: Record<string, unknown>,
): Promise<void> {
  await updateDoc(doc(db, collectionName, id), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteDocument(collectionName: string, id: string): Promise<void> {
  await deleteDoc(doc(db, collectionName, id));
}

export async function queryDocuments<T>(
  collectionName: string,
  options?: {
    conditions?: Array<{ field: string; op: string; value: unknown }>;
    orderField?: string;
    orderDirection?: 'asc' | 'desc';
    maxResults?: number;
  },
): Promise<T[]> {
  const constraints: unknown[] = [];

  if (options?.conditions) {
    for (const c of options.conditions) {
      constraints.push(where(c.field, c.op as any, c.value));
    }
  }
  if (options?.orderField) {
    constraints.push(orderBy(options.orderField, options.orderDirection || 'desc'));
  }
  if (options?.maxResults) {
    constraints.push(firestoreLimit(options.maxResults));
  }

  const q = query(collection(db, collectionName), ...constraints);
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as T));
}

export function subscribeToCollection<T>(
  collectionName: string,
  callback: (items: T[]) => void,
  options?: {
    conditions?: Array<{ field: string; op: string; value: unknown }>;
    orderField?: string;
    maxResults?: number;
  },
): () => void {
  const constraints: unknown[] = [];
  if (options?.conditions) {
    for (const c of options.conditions) {
      constraints.push(where(c.field, c.op as any, c.value));
    }
  }
  if (options?.orderField) {
    constraints.push(orderBy(options.orderField, 'desc'));
  }
  if (options?.maxResults) {
    constraints.push(firestoreLimit(options.maxResults));
  }

  const q = query(collection(db, collectionName), ...constraints);
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() } as T)));
  });
}

// ─── Domain-specific helpers ───────────────────────────────────

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string | null;
  role: 'admin' | 'user';
  createdAt: string;
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  return getDocument<UserProfile>('users', uid);
}

export async function saveUserProfile(profile: UserProfile): Promise<void> {
  await setDocument('users', profile.uid, profile);
}

export interface WarehouseItem {
  id: string;
  sku: string;
  name: string;
  category: string;
  quantity: number;
  minStock: number;
  location: string;
  unit: string;
  lastUpdated: string;
}

export async function getWarehouseItems(): Promise<WarehouseItem[]> {
  return queryDocuments<WarehouseItem>('warehouse', {
    orderField: 'name',
    orderDirection: 'asc',
  });
}

export async function addWarehouseItem(item: Omit<WarehouseItem, 'id'>): Promise<string> {
  return addDocument('warehouse', item);
}

export async function updateWarehouseItem(id: string, data: Partial<WarehouseItem>): Promise<void> {
  await updateDocument('warehouse', id, data);
}

export async function deleteWarehouseItem(id: string): Promise<void> {
  await deleteDocument('warehouse', id);
}
