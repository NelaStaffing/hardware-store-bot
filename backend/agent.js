import OpenAI from 'openai';
import { tools } from './tools.js';
import dotenv from 'dotenv';

dotenv.config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

const SYSTEM_PROMPT = `Role
You’re a helpful hardware-store assistant.

Tools

searchInventory(query, topK=8) – find/compare products.

openProductDetail(SKU) – open details when user mentions a SKU, list index (“item 2”), or exact name.

fileSearch(filename) – fetch PDF manual / safety sheet.

Core Behavior

Use the Supabase vector inventory whenever you need product data; refer to products from the current session’s retrieved list when possible.

Do not search again if the user is asking about a product that is already in the current conversation’s retrieved list. Instead, use that item (and call openProductDetail if they want details).

If the requested product isn’t in the list, suggest a suitable alternative you can retrieve.

Retrieval Triggers

Call searchInventory only if the user (a) mentions a SKU, index, or exact name, or (b) asks to find/compare/price/locate/recommend products.

Do not retrieve if none of the above apply, or if they’re only drilling into an already-listed item.

No-Hallucination Product Policy

Never invent products, SKUs, prices, or aisles. You MUST call searchInventory and only output a product_list if the latest search returned one or more items. If searchInventory returns zero items, do NOT output a product_list. Instead, reply that no matching items were found and offer to search alternatives or clarify the request. If you already have a retrieved list in the current chat, you may reference it; otherwise do not fabricate.

Output Format (strict)

Extract product data into exactly one single-line JSON object using strict JSON rules:
{"type":"product_list","products":[{"name":"...","SKU":"...","price":19.99,"aisle":"..."}]}

Rules for the JSON block:
- Use ASCII double quotes (\") only. Never use smart quotes (“ ” ‘ ’) or backticks.
- Do not include trailing commas.
- Keys must be exactly: type, products, name, SKU, price, aisle.
- price must be a number (not a string).
- The entire object must be on one line, no code fences.

The final message must be only: your natural prose plus that single JSON object embedded once where the list naturally belongs.

No other keys. Exactly one JSON object. Must be valid JSON.

Absolutely no list formatting in the surrounding prose:

Do not use numbered lines (1., 2.), bullets (-, •), item-per-line blocks, or table/markdown list syntax.

Keep prose in sentences/paragraphs only.

Whenever you mention a product by name, include the SKU inline: e.g., Cordless Drill (CD-123).

If a feature is technically possible but not recommended, say so explicitly.

Add safe-use recommendations at the end if applicable.

Keep the full Q&A history for context.

Detail Handling

If the user says “show details for item 2, show me that item again, what was the product name again?, or somenthing alike”, gives a SKU, or exact name → plan to call openProductDetail(SKU).

When referencing manuals/safety sheets, use fileSearch(filename).

Examples

✅ Correct (conversational, one JSON, no lists):
We do carry weed-and-feed options that work well for established beds.
{"type":"product_list","products":[{"name":"Product 1","SKU":"SKU123","price":23.99,"aisle":"32"},{"name":"Product 2","SKU":"SKU456","price":47.99,"aisle":"32"}]}
Both improve blooms and yield while strengthening roots. Follow label directions and keep off newly seeded areas.

❌ Incorrect: numbered/bulleted items outside JSON; multiple JSON blocks; URLs or “View Details” links in prose; re-searching when the user asks about an item already shown.

Anti-patterns to avoid

Don’t start lines with -, •, *, or \d+\. outside the JSON.

Don’t echo raw URLs; use openProductDetail instead.

Don’t output more than one JSON object or wrap it in code fences.`;

/**
 * Call the OpenAI chat completion API with automatic function-calling.
 * @param {Array<{role:string,content:string}>} history Previous chat history
 * @param {string} userMessage Latest user message
 * @returns {Promise<{role:string,content:string,tool_calls?:any[]}>} Assistant reply
 */
export async function chatAgent(history = [], userMessage = '') {
  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...history,
    { role: 'user', content: userMessage }
  ];

  // Loop until there are no more tool calls (max 3 rounds to be safe)
  let assistantMsg = null;
  let lastSearchProducts = null;
  let lastSearchQuery = '';
  let hadSearchThisTurn = false;

  // Seed lastSearchProducts from any prior assistant product_list in history
  function extractProductListFrom(text) {
    if (!text || typeof text !== 'string') return null;
    const normalized = text.replace(/[“”]/g, '"').replace(/[‘’]/g, "'").replace(/&quot;/g, '"');
    const token = '"type":"product_list"';
    const idx = normalized.lastIndexOf(token);
    if (idx === -1) return null;
    let start = normalized.lastIndexOf('{', idx);
    if (start === -1) return null;
    let depth = 0, inStr = false, esc = false, end = -1;
    for (let i = start; i < normalized.length; i++) {
      const ch = normalized[i];
      if (inStr) {
        if (esc) { esc = false; }
        else if (ch === '\\') { esc = true; }
        else if (ch === '"') { inStr = false; }
        continue;
      }
      if (ch === '"') { inStr = true; continue; }
      if (ch === '{') depth++;
      else if (ch === '}') { depth--; if (depth === 0) { end = i + 1; break; } }
    }
    if (end === -1) return null;
    let jsonStr = normalized.slice(start, end).replace(/,(\s*[}\]])/g, '$1');
    try { return JSON.parse(jsonStr); } catch { return null; }
  }

  for (let i = history.length - 1; i >= 0; i--) {
    const h = history[i];
    if (h && h.role === 'assistant' && typeof h.content === 'string' && h.content.includes('"type":"product_list"')) {
      const pl = extractProductListFrom(h.content);
      if (pl && Array.isArray(pl.products)) { lastSearchProducts = pl.products; break; }
    }
  }
  for (let round = 0; round < 3; round++) {
    const resp = await openai.chat.completions.create({
      model: MODEL,
      messages,
      tools: Object.values(tools).map(t => ({ type: 'function', function: t.schema })),
      tool_choice: 'auto'
    });

    assistantMsg = resp.choices[0].message;

    if (!assistantMsg.tool_calls?.length) break; // we have a final message

    // Record the assistant tool call message
    messages.push(assistantMsg);

    // Execute each tool call and append results
    for (const call of assistantMsg.tool_calls) {
      const tool = tools[call.function.name];
      if (!tool) throw new Error(`Unknown tool: ${call.function.name}`);
      let args = {};
      try { args = JSON.parse(call.function.arguments || '{}'); } catch {}
      const result = await tool.execute(args);

      // Track latest searchInventory results for anti-hallucination guard
      if (call.function.name === 'searchInventory') {
        lastSearchProducts = (result && Array.isArray(result.products)) ? result.products : [];
        lastSearchQuery = (args && typeof args.query === 'string') ? args.query : '';
        hadSearchThisTurn = true;
      }

      messages.push({
        role: 'tool',
        tool_call_id: call.id,
        content: JSON.stringify(result)
      });
    }
    // Next loop iteration will ask the model to summarize with tool results included
  }

  // Guards against hallucinated product_list
  if (assistantMsg && typeof assistantMsg.content === 'string') {
    const hasProductJson = assistantMsg.content.includes('"type":"product_list"');
    const emptyOrMissingSearch = !lastSearchProducts || lastSearchProducts.length === 0;
    if (hasProductJson) {
      const parsed = extractProductListFrom(assistantMsg.content);
      const emittedSkus = parsed && Array.isArray(parsed.products)
        ? parsed.products.map(p => String(p.SKU || p.sku || p.Sku || '')).filter(Boolean)
        : [];
      const retrievedSkus = (lastSearchProducts || []).map(p => String(p.SKU || p.sku || p.Sku || '')).filter(Boolean);
      const hasRetrieved = retrievedSkus.length > 0;
      const isSubset = emittedSkus.length > 0 && emittedSkus.every(s => retrievedSkus.includes(s));

      if (hadSearchThisTurn) {
        // Must reflect this turn's search outcome
        if (emptyOrMissingSearch) {
          const q = (userMessage || lastSearchQuery || '').trim();
          const safeText = q
            ? `I couldn't find any matching products for "${q}" in our inventory. We may not carry that item. Would you like me to look for a similar item or try a different term?`
            : `I couldn't find any matching products in our inventory. Would you like me to look for a similar item or try a different term?`;
          assistantMsg = { role: 'assistant', content: safeText };
        } else if (!isSubset) {
          // Correct the JSON to reflect actual retrieved results
          const normalized = lastSearchProducts.slice(0, 6).map(p => ({
            name: p.name || p.Name || '',
            SKU: String(p.SKU || p.sku || p.Sku || ''),
            price: typeof p.price === 'number' ? p.price : Number(p.price) || 0,
            aisle: p.aisle || p.Aisle || p.location || ''
          }));
          const json = { type: 'product_list', products: normalized };
          assistantMsg = { role: 'assistant', content: `Here are the items I found: ${JSON.stringify(json)}` };
        }
      } else {
        // No search this turn. Allow only if it reuses previously retrieved items and is a strict subset.
        if (!hasRetrieved || !isSubset) {
          const q0 = (userMessage || lastSearchQuery || '').trim();
          const notNowText = q0
            ? `Let me check our inventory for "${q0}". Could you specify the type or brand so I can search properly?`
            : `Let me check our inventory. Could you specify the product so I can search properly?`;
          assistantMsg = { role: 'assistant', content: notNowText };
        }
      }
    }
  }

  return assistantMsg || { role: 'assistant', content: 'Sorry, I could not generate a response.' };
}
