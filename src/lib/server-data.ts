/**
 * Almacén de datos del servidor (server-side).
 *
 * Los datos llegan desde los navegadores de los operarios via /api/sync-data
 * y se persisten en data/warehouse.json (disco persistente en Render).
 * JARVIS y el webhook de WhatsApp leen de aquí para responder 24/7.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const DATA_DIR = join(process.cwd(), 'data');
const DATA_FILE = join(DATA_DIR, 'warehouse.json');

export interface WarehouseData {
  inventory: any[];
  orders: any[];
  customers: any[];
  updatedAt: string;
}

let cache: WarehouseData | null = null;

export function getWarehouseData(): WarehouseData {
  if (cache) return cache;
  try {
    if (existsSync(DATA_FILE)) {
      cache = JSON.parse(readFileSync(DATA_FILE, 'utf-8'));
      return cache!;
    }
  } catch (err) {
    console.error('[server-data] Error leyendo warehouse.json:', err);
  }
  cache = { inventory: [], orders: [], customers: [], updatedAt: new Date().toISOString() };
  return cache;
}

export function setWarehouseData(data: Partial<WarehouseData>): WarehouseData {
  const current = getWarehouseData();
  cache = {
    inventory: Array.isArray(data.inventory) ? data.inventory : current.inventory,
    orders: Array.isArray(data.orders) ? data.orders : current.orders,
    customers: Array.isArray(data.customers) ? data.customers : current.customers,
    updatedAt: new Date().toISOString(),
  };
  try {
    if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
    writeFileSync(DATA_FILE, JSON.stringify(cache, null, 2));
  } catch (err) {
    console.error('[server-data] Error escribiendo warehouse.json:', err);
  }
  return cache;
}
