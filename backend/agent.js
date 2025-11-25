import OpenAI from 'openai';
import { tools } from './tools.js';
import dotenv from 'dotenv';

dotenv.config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

const SYSTEM_PROMPT = `Role

You’re a helpful hardware-store assistant.

Tools

searchInventory(query, topK=8) - find/compare products.
openProductDetail(SKU) - open details when user mentions a SKU, list index (“item 2”), or exact name.
fileSearch(filename) - fetch PDF manual / safety sheet.

Scope and Refusal Policy

Only assist with hardware-store topics: tools, building materials, fasteners, paint, electrical, plumbing, lawn/garden, safety gear, store information (availability, prices, aisles), and DIY tasks that use these products.

If a request is outside this scope (e.g., poetry/creative writing, general programming unrelated to tools, entertainment, news, politics, finance, medical or legal advice), politely refuse and steer back: "I'm focused on hardware-store assistance. I can help you choose tools, find products, or plan a DIY task—what project are you working on?"

Do not produce the out-of-scope content in your refusal.

Core Behavior

Use the Supabase vector inventory for product data. When the user describes a task or goal (e.g., “tools for an oil change”), first infer likely product categories and synonyms (e.g., “oil filter wrench”, “strap wrench”, “cap wrench”, “socket set 6-point 3/8 in”, “drain plug socket”, “torque wrench”, “funnel”, “drain pan”). Then call searchInventory with those inferred terms. Prefer products already retrieved in the current session when applicable. Do not re-search if the user is drilling into an item from the current retrieved list; use that item and call openProductDetail when asked. Keep the full Q&A history for context and follow-ups.

When you present results, first state a concise Top pick and, if applicable, a Value pick, each in one sentence based on task suitability and price/quality. Format the labels in bold using Markdown ("**Top pick:**" and "**Value pick:**"), and separate these lines with newlines. Then include exactly one single-line product_list JSON. Keep prose as sentences only (no lists), and follow the Output Format rules.

Session Memory for Retrieved Items

Maintain a “retrieved_list” for the current conversation turn sequence. If the user refers to “item 2”, repeats a SKU, or repeats an exact product name that already exists in retrieved_list, do not search again—use that item and, if they want details, call openProductDetail(SKU).

Retrieval Triggers

Call searchInventory when ANY of the following are true:
a) The user mentions a SKU, list index (“item 2”), or exact name.
b) The user asks to find/compare/price/locate/recommend products.
c) The user describes a task or problem (e.g., “help me find a wrench for an oil change”), even without naming a specific product.

When (c), infer likely categories and synonyms and query those. If the first query wave returns zero items, broaden within the same intent (close substitutes/nearby specs) up to two more waves before asking the user to narrow options. Stay within the user’s task intent—do not pivot to unrelated categories.

Search Sequencing for Open Questions

Classify the user’s task (e.g., “oil change wrench”).

Map to canonical categories + synonyms (see “Mini Synonym Map”).

Run up to 3 waves of queries:
Wave 1: specific category terms.
Wave 2: broader/neighbor terms (close substitutes, common sizes/specs).
Wave 3: adjacent essentials.
Stop at the first wave that returns one or more items; de-duplicate by SKU and clip to topK ≤ 4.

No-Hallucination Product Policy

Never invent products, SKUs, prices, or aisles. You MUST call searchInventory and only output a product_list if the latest search returned one or more items. If searchInventory returns zero items, do NOT output a product_list. Instead, reply that no matching items were found for that task and offer to broaden within the same intent or ask a brief clarifying question.
You may explain suitability and tradeoffs in general terms without inventing any product data. Only the JSON block may contain product entries, and only if searchInventory returned items in this session (or they’re already in retrieved_list).

Output Format (strict)

Extract product data into exactly one single-line JSON object using strict JSON rules:
{"type":"product_list","products":[{"name":"...","SKU":"...","price":19.99,"aisle":"..."}]}

Rules for the JSON block:

Use ASCII double quotes (") only. Never use smart quotes (“ ” ‘ ’) or backticks.

Do not include trailing commas.

Keys must be exactly: type, products, name, SKU, price, aisle.

price must be a number (not a string).

The entire object must be on one line, no code fences.

Output exactly one JSON object, embedded once where it naturally belongs in your prose.

Surrounding prose rules:

Keep prose in sentences/paragraphs only.

Absolutely no list formatting outside JSON: do not start lines with -, •, *, or numbered lists.

No URLs or “View Details” links; use openProductDetail when details are requested.

Whenever you mention a product by name in prose, include the SKU inline, e.g., Cordless Drill (CD-123).

Detail Handling

If the user says “show details for item 2”, “show me that item again”, asks “what was the product name again?”, gives a SKU, or exact name → plan to call openProductDetail(SKU).
When referencing manuals/safety sheets, use fileSearch(filename).

Suitability & Safety Notes

Explain briefly why suggested categories fit and any caveats (e.g., “6-point sockets prevent rounding drain plugs; adjustable wrenches can slip on stubborn plugs”). Add brief safety notes where relevant (PPE, cooling engine, proper disposal/recycling).

Mini Synonym Map (guidance for query expansion)

Oil change → oil filter wrench (cap/strap/pliers), 6-point socket for drain plug (13–19 mm / 1/2"–3/4"), torque wrench (10–80 ft-lb), funnel, drain pan.
Rusted fastener → penetrating oil, breaker bar, 6-point sockets, impact sockets (warn about cheater pipes).
PVC plumbing → PVC cutter, primer, cement, slip-joint pliers.
Electrical outlets → outlet tester, GFCI outlet, needle-nose pliers, wire stripper.
Wood screws flush finish → countersink bit, pilot drill bit set.

Examples

Correct (conversational, one JSON, no lists):
We do carry options that fit oil-change tasks. An oil filter wrench gives clean removal without crushing the canister, while a 6-point socket grips the drain plug securely. Adjustable wrenches work in a pinch but can slip on stubborn plugs.
{"type":"product_list","products":[{"name":"Product 1","SKU":"SKU123","price":23.99,"aisle":"32"},{"name":"Product 2","SKU":"SKU456","price":47.99,"aisle":"32"}]}
Let the engine cool first, wear gloves/eye protection, and recycle used oil properly.

Incorrect: numbered/bulleted items outside JSON; multiple JSON blocks; URLs or “View Details” links in prose; re-searching when the user asks about an item already shown; fabricating SKUs/prices/aisles.

Behavior on Zero Results

If all query waves return zero items for the user’s task, reply that no matching items were found for that task, propose the nearest alternatives within the same task intent, and offer one concise follow-up to refine (e.g., “metric or SAE?”, “size range?”, “budget?”). Do NOT output a product_list JSON when zero results were returned.

Implementation Hints (internal reasoning guidance)


De-duplicate by SKU across queries in a wave; clip to at most 4 items for the JSON.

Keep retrieved_list updated whenever searchInventory returns results.

 Only call openProductDetail when the user drills into an item already present in retrieved_list or provides an exact SKU/name from it.

 Use fileSearch only for manuals/safety sheets by filename provided or inferred from the chosen product’s documentation field (if available).`;
/**
 * Intent classification and query expansion
 * @typedef {string[][]} WaveQueries
 */
function classifyTask(userText) {
  const t = String(userText || '').toLowerCase();
  if (/(oil change|oil filter|drain plug)/.test(t)) return 'oil_change';
  if (/(rust(ed)?|seized|stuck) (bolt|nut|fastener)/.test(t)) return 'rusted_fastener';
  if (/\bpvc\b|\bplumbing\b/.test(t)) return 'pvc_plumbing';
  return null;
}

/**
 * @param {string} intent
 * @returns {WaveQueries}
 */
function expandQueries(intent) {
  switch (intent) {
    case 'oil_change':
      return [
        ['oil filter wrench cap', 'oil filter strap wrench', 'oil filter pliers'],
        ['socket set 6-point 3/8 in', 'drain plug socket 14mm', 'drain plug socket 17mm', 'adjustable wrench'],
        ['torque wrench 10-80 ft-lb', 'oil funnel', 'drain pan']
      ];
    case 'rusted_fastener':
      return [
        ['penetrating oil'],
        ['breaker bar', 'socket set 6-point', 'impact socket 1/2 in'],
        ['heat gun', 'anti seize']
      ];
    case 'pvc_plumbing':
      return [
        ['pvc cutter'],
        ['pvc primer', 'pvc cement'],
        ['slip joint pliers']
      ];
    default:
      return [];
  }
}
/**
 * Call the OpenAI chat completion API with automatic function-calling.
 * @param {Array<{role:string,content:string}>} history Previous chat history
 * @param {string} userMessage Latest user message
 * @param {{ model?: string }} [options] Optional overrides
 * @returns {Promise<{role:string,content:string,tool_calls?:any[]}>} Assistant reply
 */
export async function chatAgent(history = [], userMessage = '', options = {}) {
  const runtimeModel = options.model || MODEL;
  const tGuard = String(userMessage || '').toLowerCase();
  const ooScope = /(haiku|poem|poetry|story|song|lyrics|joke|riddle|limerick|sonnet|acrostic|essay|novel)\b/.test(tGuard)
    || /(write|generate|compose)\s+(code|program|script|algorithm)\b/.test(tGuard)
    || /(homework|leetcode|movie|celebrity|politics|finance|medical|legal)\b/.test(tGuard);
  if (ooScope) {
    return { role: 'assistant', content: "I'm focused on hardware-store assistance. I can help you choose tools, find products, or plan a DIY task—what project are you working on?" };
  }
  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...history,
    { role: 'user', content: userMessage }
  ];

  // If the latest user message matches a known task intent, provide concrete query waves as a system hint.
  const detectedIntent = classifyTask(userMessage);
  if (detectedIntent) {
    const waves = expandQueries(detectedIntent);
    if (waves && waves.length) {
      const hint = waves
        .map((w, i) => `Wave ${i + 1}: ${w.join(' | ')}`)
        .join(' ; ');
      // Insert right after the base system prompt so the model plans searches accordingly
      messages.splice(1, 0, {
        role: 'system',
        content: `Intent detected: ${detectedIntent}. Use these exact queries in order, stopping at the first wave with results. ${hint}`
      });
    }
  }

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
      model: runtimeModel,
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
          const normalized = lastSearchProducts.slice(0, 4).map(p => ({
            name: p.name || p.Name || '',
            SKU: String(p.SKU || p.sku || p.Sku || ''),
            price: typeof p.price === 'number' ? p.price : Number(p.price) || 0,
            aisle: p.aisle || p.Aisle || p.location || ''
          }));
          const json = { type: 'product_list', products: normalized };
          assistantMsg = { role: 'assistant', content: `Here are the items I found: ${JSON.stringify(json)}` };
        } else {
          const parsedCount = parsed && Array.isArray(parsed.products) ? parsed.products.length : 0;
          if (parsedCount > 4) {
            const normalized = lastSearchProducts.slice(0, 4).map(p => ({
              name: p.name || p.Name || '',
              SKU: String(p.SKU || p.sku || p.Sku || ''),
              price: typeof p.price === 'number' ? p.price : Number(p.price) || 0,
              aisle: p.aisle || p.Aisle || p.location || ''
            }));
            const json = { type: 'product_list', products: normalized };
            assistantMsg = { role: 'assistant', content: `Here are the items I found: ${JSON.stringify(json)}` };
          }
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

// Helpers for rule-based handler
function normalizeProduct(p) {
  return {
    name: p.name || p.Name || '',
    SKU: String(p.SKU || p.sku || p.Sku || ''),
    price: typeof p.price === 'number' ? p.price : Number(p.price) || 0,
    aisle: p.aisle || p.Aisle || p.location || '',
    description: p.description || p.Description || '',
    uses_cases: p.uses_cases || null
  };
}

async function searchInventoryDirect(query, topK = 8) {
  const { products } = await tools.searchInventory.execute({ query, topK });
  return (products || []).map(normalizeProduct);
}

async function openProductDetailDirect(sku) {
  return tools.openProductDetail.execute({ id: sku });
}

function parseDetailRequest(msg, retrievedList = []) {
  const text = String(msg || '').toLowerCase();
  const itemMatch = text.match(/item\s+(\d+)/i);
  if (itemMatch) {
    const idx = Math.max(1, parseInt(itemMatch[1], 10)) - 1;
    const p = retrievedList[idx];
    if (p && p.SKU) return { sku: p.SKU };
  }
  // Try SKU present in message matching one from retrieved list
  const skuFromMsg = (String(msg || '').match(/[A-Za-z0-9-]{3,}/g) || []).find(token =>
    (retrievedList || []).some(p => String(p.SKU) === token)
  );
  if (skuFromMsg) return { sku: skuFromMsg };
  return null;
}

function buildSingleLineJSON(products) {
  const payload = {
    type: 'product_list',
    products: (products || []).slice(0, 4).map(p => ({
      name: p.name,
      SKU: p.SKU,
      price: typeof p.price === 'number' ? p.price : Number(p.price) || 0,
      aisle: p.aisle || ''
    }))
  };
  return JSON.stringify(payload);
}

function buildSuitabilityIntro(intent, products) {
  switch (intent) {
    case 'oil_change':
      return 'We carry options for oil-change tasks. Oil filter wrenches remove the canister cleanly, and 6-point sockets grip drain plugs securely.';
    case 'rusted_fastener':
      return 'For rusted or seized fasteners, penetrating oil can help, and 6-point/impact sockets with a breaker bar add leverage.';
    case 'pvc_plumbing':
      return 'For PVC work, a cutter gives clean cuts, and primer with cement ensures strong joints.';
    default:
      return 'Here are items that match your request.';
  }
}

function buildSafetyNote(intent) {
  switch (intent) {
    case 'oil_change':
      return 'Let the engine cool, wear gloves/eye protection, and recycle used oil properly.';
    case 'rusted_fastener':
      return 'Use proper PPE; avoid cheater pipes that can cause tool failure; apply heat cautiously.';
    case 'pvc_plumbing':
      return 'Work in a ventilated area when using primer/cement; wear gloves/eye protection.';
    default:
      return '';
  }
}

function answerConversationally(msg) {
  // Minimal fallback; you can enhance with templated small-talk or FAQ.
  return `I can help you find and compare products. What task or product are you looking for?`;
}

/**
 * Rule-based message handler with intent waves and de-duplication
 * @param {string} msg
 * @param {SessionState} state
 * @returns {Promise<string>} reply text to send back to the user
 */
export async function handleUserMessage(msg, state) {
  const send = (text) => text;

  const t0 = String(msg || '').toLowerCase();
  const outOfScope = /(haiku|poem|poetry|story|song|lyrics|joke|riddle|limerick|sonnet|acrostic|essay|novel)\b/.test(t0)
    || /(write|generate|compose)\s+(code|program|script|algorithm)\b/.test(t0)
    || /(homework|leetcode|movie|celebrity|politics|finance|medical|legal)\b/.test(t0);
  if (outOfScope) {
    return send("I'm focused on hardware-store assistance. I can help you choose tools, find products, or plan a DIY task—what project are you working on?");
  }

  // 1) Detail drill-down stays the same
  const detailReq = parseDetailRequest(msg, state?.retrievedList || []);
  if (detailReq) {
    await openProductDetailDirect(detailReq.sku);
    return send(`Opening details for ${detailReq.sku}...`);
  }

  // 2) If they ask to find/compare/etc. OR we detect a task intent, search
  const asksForProducts = /(find|compare|price|locate|recommend)\b/i.test(msg || '');
  const intent = classifyTask(msg || '');

  if (asksForProducts || intent) {
    const waves = intent ? expandQueries(intent) : [[String(msg || '')]]; // fallback: search their text
    let results = [];

    for (const wave of waves.slice(0, 3)) { // at most 3 waves
      const waveResults = [];
      for (const q of wave) {
        const r = await searchInventoryDirect(q, 8);
        waveResults.push(...r);
      }
      // de-dupe by SKU, keep up to 4
      const seen = new Set();
      results = waveResults.filter(p => (p.SKU && !seen.has(p.SKU) ? (seen.add(p.SKU), true) : false)).slice(0, 4);
      if (results.length > 0) break;
    }

    if (results.length > 0) {
      if (state) state.retrievedList = results;
      const tokens = String(msg || '').toLowerCase().split(/\s+/).map(t => t.replace(/[^a-z0-9]/g, '')).filter(t => t.length > 2);
      const scored = results.map(p => {
        const nameText = String(p.name || '').toLowerCase();
        const descText = String(p.description || '').toLowerCase();
        let usesText = '';
        if (Array.isArray(p.uses_cases)) usesText = p.uses_cases.join(' ').toLowerCase();
        else if (p.uses_cases) usesText = String(p.uses_cases).toLowerCase();
        const hay = `${nameText} ${descText} ${usesText}`;
        let s = 0; for (const tok of tokens) if (hay.includes(tok)) s++;
        return { p, s };
      });
      let top = scored[0];
      for (const x of scored) if (x.s > (top?.s ?? -1)) top = x;
      const prices = results.map(r => (typeof r.price === 'number' ? r.price : Number(r.price) || 0)).filter(n => n > 0).sort((a,b)=>a-b);
      function qv(a){ if(!prices.length) return {lo:0,hi:0,md:0}; const n=prices.length; const i1=Math.floor((n-1)*0.33); const i2=Math.floor((n-1)*0.66); return {lo:prices[i1],hi:prices[i2],md:prices[Math.floor((n-1)*0.5)]}; }
      const qs = qv();
      function band(v){ if(!prices.length||!v) return 'mid-range'; if(v<=qs.lo) return 'budget'; if(v>=qs.hi) return 'premium'; return 'mid-range'; }
      let value = null;
      if (top) {
        const threshold = Math.max(1, Math.floor(top.s * 0.8));
        const cand = scored.filter(x => x !== top && x.s >= threshold);
        if (cand.length) {
          value = cand.reduce((best, x) => {
            const px = typeof x.p.price === 'number' ? x.p.price : Number(x.p.price) || 0;
            const pb = best ? (typeof best.p.price === 'number' ? best.p.price : Number(best.p.price) || 0) : Infinity;
            return px < pb ? x : best;
          }, null);
        }
      }
      const proseIntro = buildSuitabilityIntro(intent ?? 'general', results);
      const topLine = top && top.p ? `**Top pick:** **${top.p.name || ''}** (${String(top.p.SKU || '')}) — ${band(typeof top.p.price === 'number' ? top.p.price : Number(top.p.price) || 0)}, best fit for your task.` : '';
      const valueLine = value && value.p ? `**Value pick:** **${value.p.name || ''}** (${String(value.p.SKU || '')}) — ${band(typeof value.p.price === 'number' ? value.p.price : Number(value.p.price) || 0)}, solid performance for the price.` : '';
      const jsonLine = buildSingleLineJSON(results);
      const safety = buildSafetyNote(intent ?? 'general');
      const lines = [proseIntro, topLine, valueLine].filter(Boolean).join('\n');
      return send(`${lines}\n${jsonLine}${safety ? `\n${safety}` : ''}`);
    } else {
      // No matches: stay within intent, then ask to narrow
      const ask = intent
        ? 'I didn’t find matches under that task. Do you prefer metric or SAE sockets, and any size range or budget?'
        : 'I didn’t find matches. Can you share the task, size, or budget so I can broaden the search within your goal?';
      return send(ask);
    }
  }

  // 3) Otherwise: general chat (don’t call searchInventory)
  return send(answerConversationally(msg || ''));
}
