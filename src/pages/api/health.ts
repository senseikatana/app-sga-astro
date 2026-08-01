// Health check requerido por render.yaml (healthCheckPath: /api/health)
import type { APIRoute } from 'astro';
import { getWarehouseData } from '@/lib/server-data';
import { activeProvider } from '@/services/jarvis.service';

export const GET: APIRoute = async () => {
  const data = getWarehouseData();
  return new Response(JSON.stringify({
    status: 'ok',
    jarvis: activeProvider(),
    whatsapp: !!(import.meta.env.WHATSAPP_TOKEN && import.meta.env.WHATSAPP_PHONE_NUMBER_ID),
    data: {
      inventory: data.inventory.length,
      orders: data.orders.length,
      customers: data.customers.length,
      updatedAt: data.updatedAt,
    },
    timestamp: new Date().toISOString(),
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
