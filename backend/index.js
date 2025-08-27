import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fetch from 'node-fetch';
import { supabase } from './supabaseClient.js';
import { chatAgent } from './agent.js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Helper: find product by SKU across possible column casings
async function findProductBySku(rawSku) {
  const sku = String(rawSku || '').trim();
  if (!sku) return { data: null, error: new Error('Empty SKU') };
  const columns = ['sku', 'SKU', 'Sku'];
  // Try exact match first
  for (const col of columns) {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq(col, sku)
        .maybeSingle();
      if (!error && data) return { data, error: null };
    } catch (e) {
      // continue trying other columns
    }
  }
  // Try case-insensitive exact (pattern) match
  for (const col of columns) {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .ilike(col, sku)
        .maybeSingle();
      if (!error && data) return { data, error: null };
    } catch (e) {
      // continue
    }
  }
  // Try wildcard contains as last resort
  for (const col of columns) {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .ilike(col, `%${sku}%`)
        .limit(1);
      if (!error && data && data[0]) return { data: data[0], error: null };
    } catch (e) {
      // continue
    }
  }
  return { data: null, error: null };
}


app.post('/api/chat', async (req, res) => {
  console.log('Received /api/chat request');
  const { message, history = [], sessionId } = req.body || {};
  try {
    // Upsert session and store user message
    if (sessionId) await supabase.from('chat_sessions').upsert({ session_id: sessionId });
    if (message) {
      await supabase.from('chat_messages').insert({
        session_id: sessionId || 'local',
        sender: 'user',
        text: message,
        timestamp: new Date().toISOString()
      });
    }

    // Map history to OpenAI roles
    const mappedHistory = (history || []).map(m => ({
      role: m.sender === 'agent' ? 'assistant' : 'user',
      content: m.text || ''
    }));

    const assistantMsg = await chatAgent(mappedHistory, message || '');

    // Prepare reply for frontend
    let reply = assistantMsg.content || '';
    if (assistantMsg.tool_calls?.length) {
      const call = assistantMsg.tool_calls[0];
      let args = {};
      try { args = JSON.parse(call.function.arguments || '{}'); } catch {}
      reply = JSON.stringify({ tool: call.function.name, tool_input: args });
    }

    // Store assistant reply
    await supabase.from('chat_messages').insert({
      session_id: sessionId || 'local',
      sender: 'agent',
      text: reply,
      timestamp: new Date().toISOString()
    });

    res.json({ reply });
  } catch (err) {
    console.error('Chat agent error:', err);
    res.status(500).json({ reply: 'Error from chat agent.' });
  }
});

// In-memory preview SKU state
let currentPreviewSku = '';

// POST /api/setPreviewSku
app.post('/api/setPreviewSku', (req, res) => {
  const { sku } = req.body;
  if (!sku) return res.status(400).json({ error: 'SKU is required' });
  currentPreviewSku = sku;
  res.json({ success: true, sku });
});

// GET /api/getPreviewSku
app.get('/api/getPreviewSku', (req, res) => {
  res.json({ sku: currentPreviewSku });
});

app.get('/api/product/:sku', async (req, res) => {
  const { sku } = req.params;
  if (!sku) return res.status(400).json({ error: 'SKU is required' });
  try {
    const { data } = await findProductBySku(sku);
    if (!data) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json({ product: data });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/openProductDetail', async (req, res) => {
  const { sku } = req.body;
  if (!sku) return res.status(400).json({ error: 'SKU is required' });
  try {
    const { data } = await findProductBySku(sku);
    if (!data) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json({ product: data });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Backend running on port ${PORT}`));
