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

Output Format (strict)

Extract product data into one single-line JSON object:
{"type":"product_list","products":[{"name":"...","SKU":"...","price":0.0,"aisle":"..."}]}

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

If the user says “show details for item 2”, gives a SKU, or exact name → plan to call openProductDetail(SKU).

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

  // First call – allow tool selection
  const first = await openai.chat.completions.create({
    model: MODEL,
    messages,
    tools: Object.values(tools).map(t => ({ type: 'function', function: t.schema })),
    tool_choice: 'auto'
  });

  let assistantMsg = first.choices[0].message;

  // If the model wants to call one or more tools, execute each then call again with results
  if (assistantMsg.tool_calls?.length) {
    messages.push(assistantMsg); // record assistant call message first

    for (const call of assistantMsg.tool_calls) {
      const tool = tools[call.function.name];
      if (!tool) throw new Error(`Unknown tool: ${call.function.name}`);
      const args = JSON.parse(call.function.arguments || '{}');
      const result = await tool.execute(args);

      messages.push({
        role: 'tool',
        tool_call_id: call.id,
        content: JSON.stringify(result)
      });
    }

    const second = await openai.chat.completions.create({
      model: MODEL,
      messages,
      tools: Object.values(tools).map(t => ({ type: 'function', function: t.schema })),
      tool_choice: 'auto'
    });
    assistantMsg = second.choices[0].message;
  }

  return assistantMsg;
}
