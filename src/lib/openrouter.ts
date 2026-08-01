/**
 * Cliente IA del frontend — delega TODO al backend.
 *
 * El frontend NUNCA:
 *  - Almacena ni envía una API key
 *  - Construye prompts
 *  - Llama directamente a OpenRouter u otro LLM
 *
 * Solo envía { action, context? } al endpoint /api/ai del backend,
 * que valida, sanitiza, construye el prompt y llama a OpenRouter.
 */

import { apiFetch } from './api';

// Acciones permitidas (lista blanca, idéntica a la del backend)
export type AiAction =
  | 'generate_product'
  | 'generate_customer'
  | 'generate_order'
  | 'optimize_route'
  | 'whatsapp_reply';

/**
 * Llama al endpoint seguro del backend.
 * `context` solo se usa en whatsapp_reply (el mensaje del operario).
 * El backend lo sanitiza antes de usarlo.
 */
export async function callAI(action: AiAction, context?: string): Promise<string> {
  const res = await apiFetch('/api/ai', {
    method: 'POST',
    body: JSON.stringify({ action, context }),
  });

  if (!res.success) {
    throw new Error(res.error ?? 'Error en la IA');
  }

  return res.data.result as string;
}
