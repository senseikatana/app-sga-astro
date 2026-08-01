/**
 * Firebase Firestore data layer for ESINSA WMS.
 * 
 * Replaces InsForge PostgREST with Firestore.
 * Zustand stays for UI state; Firestore is the source of truth.
 */
import {
  db,
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
} from './firebase';
import type { InventoryItem, Order, Customer } from './schemas';

// ============================================================
// INVENTORY
// ============================================================

export async function fetchInventory(): Promise<InventoryItem[]> {
  const q = query(collection(db, 'inventory'), orderBy('nutcode'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as InventoryItem));
}

export async function insertInventory(item: Omit<InventoryItem, 'id' | 'nutcode'>): Promise<InventoryItem> {
  const nutcode = `NUT${String(Date.now()).slice(-7)}`;
  const docRef = await addDoc(collection(db, 'inventory'), { ...item, nutcode });
  return { id: docRef.id, nutcode, ...item };
}

export async function updateInventory(id: string, patch: Partial<InventoryItem>): Promise<void> {
  await updateDoc(doc(db, 'inventory', id), patch);
}

export async function deleteInventory(id: string): Promise<void> {
  await deleteDoc(doc(db, 'inventory', id));
}

// ============================================================
// ORDERS
// ============================================================

export async function fetchOrders(): Promise<Order[]> {
  const q = query(collection(db, 'orders'), orderBy('date', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Order));
}

export async function insertOrder(order: Omit<Order, 'id' | 'number'>): Promise<Order> {
  const number = `#${String(Date.now()).slice(-4)}`;
  const docRef = await addDoc(collection(db, 'orders'), { ...order, number });
  return { id: docRef.id, number, ...order };
}

export async function updateOrder(id: string, patch: Partial<Order>): Promise<void> {
  await updateDoc(doc(db, 'orders', id), patch);
}

export async function deleteOrder(id: string): Promise<void> {
  await deleteDoc(doc(db, 'orders', id));
}

// ============================================================
// CUSTOMERS
// ============================================================

export async function fetchCustomers(): Promise<Customer[]> {
  const q = query(collection(db, 'customers'), orderBy('name'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Customer));
}

export async function insertCustomer(customer: Omit<Customer, 'id' | 'code'>): Promise<Customer> {
  const code = `CLI${String(Date.now()).slice(-3)}`;
  const docRef = await addDoc(collection(db, 'customers'), { ...customer, code });
  return { id: docRef.id, code, ...customer };
}

export async function updateCustomer(id: string, patch: Partial<Customer>): Promise<void> {
  await updateDoc(doc(db, 'customers', id), patch);
}

export async function deleteCustomer(id: string): Promise<void> {
  await deleteDoc(doc(db, 'customers', id));
}
