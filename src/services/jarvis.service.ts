/**
 * JARVIS — cerebro del asistente (server-side).
 *
 * Cadena de proveedores LLM (el primero disponible gana):
 *   1. Google Gemini (AI Studio) — gratis, 1M tokens de contexto
 *   2. OpenRouter — fallback gratuito
 *   3. Reglas locales — siempre disponible, JARVIS nunca se cae
 *
 * Conocimiento: inyecta la base FAQ de ESINSA (src/data/faqs-esinsa.md)
 * en el system prompt para responder como la empresa, no como un bot genérico.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { WarehouseData } from '@/lib/server-data';

const LOW_STOCK_THRESHOLD = Number(import.meta.env.JARVIS_LOW_STOCK_THRESHOLD) || 100;

// ============================================================
// Base de conocimiento FAQ (se carga una vez, en caliente no hace falta)
// ============================================================
let faqCache: string | null = null;
function getFaqKnowledge(): string {
  if (faqCache !== null) return faqCache;
  try {
    faqCache = readFileSync(join(process.cwd(), 'src/data/faqs-esinsa.md'), 'utf-8');
  } catch {
    console.warn('[jarvis] No se encontró src/data/faqs-esinsa.md');
    faqCache = '';
  }
  return faqCache;
}

// ============================================================
// Contexto compacto del almacén para el prompt del LLM
// ============================================================
function buildContextSummary(data: WarehouseData): string {
  const { inventory, orders, customers } = data;

  const lowStock = inventory.filter((i) => Number(i.stock) < LOW_STOCK_THRESHOLD);
  const pendingOrders = orders.filter((o) => o.status === 'pending');
  const totalStock = inventory.reduce((s, i) => s + (Number(i.stock) || 0), 0);

  const invLines = inventory.slice(0, 500).map((i) =>
    `- ${i.nutcode} | ${i.desc} | tipo:${i.type} | stock:${i.stock} | ubicación:${i.loc}`
  );
  const orderLines = orders.slice(-50).map((o) =>
    `- ${o.number} | ${o.customer} | ${o.status} | €${o.amount}`
  );
  const custLines = customers.slice(0, 150).map((c) =>
    `- ${c.code} | ${c.name} | ${c.email} | plan:${c.plan} | ${c.status}`
  );

  return `
DATOS DEL ALMACÉN (actualizado: ${data.updatedAt}):
== RESUMEN ==
Referencias únicas: ${inventory.length}
Stock total: ${totalStock} unidades
Productos con stock bajo (<${LOW_STOCK_THRESHOLD}): ${lowStock.length}
Pedidos totales: ${orders.length} (pendientes: ${pendingOrders.length})
Clientes: ${customers.length}

== INVENTARIO (NUTCODE | descripción | tipo | stock | ubicación) ==
${invLines.join('\n') || '(vacío)'}

== ÚLTIMOS PEDIDOS ==
${orderLines.join('\n') || '(vacío)'}

== CLIENTES ==
${custLines.join('\n') || '(vacío)'}
`.trim();
}

function buildSystemPrompt(data: WarehouseData, lang: string): string {
  const langName = lang === 'en' ? 'English' : lang === 'ca' ? 'Català' : 'Español';
  return `Eres JARVIS, el asistente digital del almacén de ESINSA Gasket (Tarragona), fabricante de juntas y tornillería industrial.
Respondes SIEMPRE en ${langName}, de forma breve, precisa y profesional.
Tienes acceso completo y en tiempo real a los datos del almacén (inventario NUTCODE, ubicaciones, pedidos y clientes).
REGLAS:
- Basa tus respuestas EXCLUSIVAMENTE en los datos proporcionados y la base de conocimiento FAQ. No inventes productos, cifras ni PRECIOS.
- Si te piden un producto, indica NUTCODE, stock y ubicación física.
- Si el stock es inferior a ${LOW_STOCK_THRESHOLD}, adviértelo proactivamente.
- Si detectas anomalías (stock crítico, pedidos acumulados), menciónalas al final.
- Para precios o presupuestos formales → deriva al equipo comercial (ver sección 4 de la FAQ).
- Formato WhatsApp: texto plano con emojis moderados, sin tablas Markdown, respuestas cortas.

== BASE DE CONOCIMIENTO DE LA EMPRESA (FAQ) ==
${getFaqKnowledge()}

== DATOS EN TIEMPO REAL DEL ALMACÉN ==
${buildContextSummary(data)}`;
}

// ============================================================
// Proveedor 1: Google Gemini (AI Studio) — gratis
// Cadena de modelos: si el principal agota cuota (429) o no
// existe (404), pasa automáticamente al siguiente (lite).
// ============================================================
async function askGemini(question: string, data: WarehouseData, lang: string): Promise<string> {
  const apiKey = import.meta.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY no configurada');

  const models = [
    import.meta.env.GEMINI_MODEL || 'gemini-3-flash-preview',
    import.meta.env.GEMINI_MODEL_FALLBACK || 'gemini-3.1-flash-lite',
  ];

  let lastError: Error | null = null;

  for (const model of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: buildSystemPrompt(data, lang) }] },
          contents: [{ role: 'user', parts: [{ text: question }] }],
          generationConfig: { maxOutputTokens: 1024, temperature: 0.3 },
        }),
      });

      if (!res.ok) {
        const body = await res.text();
        // 404 (modelo retirado) o 429 (cuota agotada) → probar siguiente modelo
        if (res.status === 404 || res.status === 429) {
          lastError = new Error(`Gemini ${model} → ${res.status}`);
          console.warn(`[jarvis] ${lastError.message}, probando siguiente modelo…`);
          continue;
        }
        throw new Error(`Gemini ${res.status}: ${body.slice(0, 200)}`);
      }

      const json = await res.json();
      const text = json.candidates?.[0]?.content?.parts
        ?.filter((p: any) => p.text)
        .map((p: any) => p.text)
        .join('')
        .trim();
      if (!text) throw new Error(`Gemini ${model} devolvió respuesta vacía`);
      return text;
    } catch (err) {
      lastError = err as Error;
      // Errores de red → probar siguiente modelo también
      console.warn(`[jarvis] Gemini ${model} falló:`, lastError.message);
    }
  }

  throw lastError ?? new Error('Todos los modelos Gemini fallaron');
}

// ============================================================
// Proveedor 2: OpenRouter — fallback gratuito
// ============================================================
async function askOpenRouter(question: string, data: WarehouseData, lang: string): Promise<string> {
  const apiKey = import.meta.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('OPENROUTER_API_KEY no configurada');

  const model = import.meta.env.OPENROUTER_MODEL || 'nvidia/nemotron-3-nano-30b-a3b:free';

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://esinsa.local',
      'X-Title': 'ESINSA WMS - JARVIS',
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: buildSystemPrompt(data, lang) },
        { role: 'user', content: question },
      ],
      max_tokens: 600,
      temperature: 0.3,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`OpenRouter ${res.status}: ${body.slice(0, 200)}`);
  }

  const json = await res.json();
  const text = json.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error('OpenRouter devolvió respuesta vacía');
  return text;
}

// ============================================================
// Proveedor 3: Reglas locales (sin LLM, nunca se cae)
// ============================================================
function askLocal(question: string, data: WarehouseData): string {
  const q = question.toLowerCase();
  const { inventory, orders, customers } = data;
  const lowStock = inventory.filter((i) => Number(i.stock) < LOW_STOCK_THRESHOLD);
  const pending = orders.filter((o) => o.status === 'pending');

  const nutMatch = q.match(/nut\s?0*(\d+)/i);
  if (nutMatch) {
    const item = inventory.find((i) => String(i.nutcode).toUpperCase().includes(nutMatch[1]));
    if (item) {
      const warn = Number(item.stock) < LOW_STOCK_THRESHOLD ? ' ⚠️ STOCK BAJO' : '';
      return `🔍 ${item.nutcode} — ${item.desc}\n📦 Stock: ${item.stock} uds${warn}\n📍 Ubicación: ${item.loc}\n🏷️ Tipo: ${item.type}`;
    }
    return `❌ No encuentro el código NUT${nutMatch[1]} en el inventario.`;
  }

  if (q.includes('stock bajo') || q.includes('bajo stock') || q.includes('crítico')) {
    if (lowStock.length === 0) return '✅ No hay productos con stock bajo.';
    const lines = lowStock.slice(0, 8).map((i) => `• ${i.nutcode} ${i.desc}: ${i.stock} uds (${i.loc})`);
    return `⚠️ ${lowStock.length} producto(s) con stock bajo:\n${lines.join('\n')}${lowStock.length > 8 ? `\n…y ${lowStock.length - 8} más.` : ''}`;
  }

  if (q.includes('pedido') || q.includes('pendiente')) {
    if (pending.length === 0) return '✅ No hay pedidos pendientes.';
    const lines = pending.slice(0, 8).map((o) => `• ${o.number} — ${o.customer} (€${o.amount})`);
    return `📦 ${pending.length} pedido(s) pendientes:\n${lines.join('\n')}`;
  }

  if (q.includes('resumen') || q.includes('estado') || q.includes('hola') || q.includes('buenas')) {
    const totalStock = inventory.reduce((s, i) => s + (Number(i.stock) || 0), 0);
    return `🤖 JARVIS — Estado del almacén:\n📦 ${inventory.length} referencias (${totalStock} uds)\n⚠️ ${lowStock.length} con stock bajo\n🧾 ${orders.length} pedidos (${pending.length} pendientes)\n👥 ${customers.length} clientes\n\nPregúntame por un NUTCODE, "stock bajo", "pedidos pendientes"…`;
  }

  return `🤖 Puedo ayudarte con:\n• "NUT0004001" → ficha del producto\n• "stock bajo" → alertas\n• "pedidos pendientes"\n• "resumen" → estado general`;
}

// ============================================================
// API pública: cadena Gemini → OpenRouter → local
// ============================================================
export type JarvisSource = 'gemini' | 'openrouter' | 'local';

export interface JarvisAnswer {
  reply: string;
  source: JarvisSource;
}

export async function askJarvis(
  question: string,
  data: WarehouseData,
  lang: string = 'es'
): Promise<JarvisAnswer> {
  if (import.meta.env.GEMINI_API_KEY) {
    try {
      return { reply: await askGemini(question, data, lang), source: 'gemini' };
    } catch (err) {
      console.warn('[jarvis] Gemini falló:', (err as Error).message);
    }
  }

  if (import.meta.env.OPENROUTER_API_KEY) {
    try {
      return { reply: await askOpenRouter(question, data, lang), source: 'openrouter' };
    } catch (err) {
      console.warn('[jarvis] OpenRouter falló:', (err as Error).message);
    }
  }

  return { reply: askLocal(question, data), source: 'local' };
}

/** Proveedor activo (para el health check). */
export function activeProvider(): JarvisSource {
  if (import.meta.env.GEMINI_API_KEY) return 'gemini';
  if (import.meta.env.OPENROUTER_API_KEY) return 'openrouter';
  return 'local';
}
