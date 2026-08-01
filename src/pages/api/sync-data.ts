// Recibe los datos del almacén desde los navegadores de los operarios
// y los persiste en el servidor para que JARVIS responda 24/7
// (WhatsApp, consultas sin navegador abierto, etc.)
import type { APIRoute } from 'astro';
import { setWarehouseData, getWarehouseData } from '@/lib/server-data';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const saved = setWarehouseData({
      inventory: body?.inventory,
      orders: body?.orders,
      customers: body?.customers,
    });

    return new Response(JSON.stringify({
      success: true,
      counts: {
        inventory: saved.inventory.length,
        orders: saved.orders.length,
        customers: saved.customers.length,
      },
      updatedAt: saved.updatedAt,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[api/sync-data] Error:', error);
    return new Response(JSON.stringify({ error: 'Error sincronizando datos' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

export const GET: APIRoute = async () => {
  const data = getWarehouseData();
  return new Response(JSON.stringify({
    inventory: data.inventory.length,
    orders: data.orders.length,
    customers: data.customers.length,
    updatedAt: data.updatedAt,
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
