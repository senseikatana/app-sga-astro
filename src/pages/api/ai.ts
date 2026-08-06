// Endpoint principal de JARVIS para el dashboard web.
// El navegador puede enviar su propio contexto (datos locales) o el servidor
// usará su copia sincronizada en data/warehouse.json.
import type { APIRoute } from 'astro';
import { askJarvisUseCase } from '@/infrastructure/ai';
import { getWarehouseData, type WarehouseData } from '@/lib/server-data';
import { SUPPORTED_LANGS } from '@/shared/constants';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const question = String(body?.question ?? body?.context ?? '').trim();
    const lang = (SUPPORTED_LANGS as readonly string[]).includes(body?.lang) ? body.lang : 'es';

    if (!question) {
      return new Response(JSON.stringify({ error: 'Pregunta vacía' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Contexto enviado por el navegador (datos frescos) o copia del servidor
    const hasClientData = Array.isArray(body?.data?.inventory);
    const data: WarehouseData = hasClientData
      ? {
          inventory: body.data.inventory ?? [],
          orders: body.data.orders ?? [],
          customers: body.data.customers ?? [],
          updatedAt: new Date().toISOString(),
        }
      : getWarehouseData();

    const { reply, source } = await askJarvisUseCase.ask({ question, data, lang });

    return new Response(JSON.stringify({ success: true, reply, source }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[api/ai] Error:', error);
    return new Response(JSON.stringify({ error: 'Error interno de JARVIS' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
