/**
 * InsForge-backed data layer for ESINSA WMS.
 * 
 * Replaces local Zustand persistence with InsForge PostgREST.
 * Zustand stays for UI state; InsForge is the source of truth.
 */
import { insforge } from './insforge';
import type { InventoryItem, Order, Customer } from './schemas';

// ============================================================
// INVENTORY
// ============================================================

export async function fetchInventory(): Promise<InventoryItem[]> {
  const { data, error } = await insforge.database
    .from('inventory')
    .select('id, nutcode, desc, type, stock, loc, minStock')
    .order('nutcode');
  if (error) throw error;
  return data ?? [];
}

export async function insertInventory(item: Omit<InventoryItem, 'id' | 'nutcode'>): Promise<InventoryItem> {
  const id = `INV${Date.now()}`;
  const nutcode = `NUT${String(Date.now()).slice(-7)}`;
  const { data, error } = await insforge.database
    .from('inventory')
    .insert([{ id, nutcode, ...item }])
    .select()
    .single();
  if (error) throw error;
  return data!;
}

export async function updateInventory(id: string, patch: Partial<InventoryItem>): Promise<void> {
  const { error } = await insforge.database
    .from('inventory')
    .update(patch)
    .eq('id', id);
  if (error) throw error;
}

export async function deleteInventory(id: string): Promise<void> {
  const { error } = await insforge.database
    .from('inventory')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

// ============================================================
// ORDERS
// ============================================================

export async function fetchOrders(): Promise<Order[]> {
  const { data, error } = await insforge.database
    .from('orders')
    .select('id, number, customer, status, amount, date')
    .order('date', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function insertOrder(order: Omit<Order, 'id' | 'number'>): Promise<Order> {
  const id = `ORD${Date.now()}`;
  const number = `#${String(Date.now()).slice(-4)}`;
  const { data, error } = await insforge.database
    .from('orders')
    .insert([{ id, number, ...order }])
    .select()
    .single();
  if (error) throw error;
  return data!;
}

export async function updateOrder(id: string, patch: Partial<Order>): Promise<void> {
  const { error } = await insforge.database
    .from('orders')
    .update(patch)
    .eq('id', id);
  if (error) throw error;
}

export async function deleteOrder(id: string): Promise<void> {
  const { error } = await insforge.database
    .from('orders')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

// ============================================================
// CUSTOMERS
// ============================================================

export async function fetchCustomers(): Promise<Customer[]> {
  const { data, error } = await insforge.database
    .from('customers')
    .select('id, code, name, email, company, phone, plan, status')
    .order('name');
  if (error) throw error;
  return data ?? [];
}

export async function insertCustomer(customer: Omit<Customer, 'id' | 'code'>): Promise<Customer> {
  const id = `CLI${Date.now()}`;
  const code = `CLI${String(Date.now()).slice(-3)}`;
  const { data, error } = await insforge.database
    .from('customers')
    .insert([{ id, code, ...customer }])
    .select()
    .single();
  if (error) throw error;
  return data!;
}

export async function updateCustomer(id: string, patch: Partial<Customer>): Promise<void> {
  const { error } = await insforge.database
    .from('customers')
    .update(patch)
    .eq('id', id);
  if (error) throw error;
}

export async function deleteCustomer(id: string): Promise<void> {
  const { error } = await insforge.database
    .from('customers')
    .delete()
    .eq('id', id);
  if (error) throw error;
}
