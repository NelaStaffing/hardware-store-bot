import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fetch from 'node-fetch';
import { supabase } from './supabaseClient.js';
import { chatAgent, handleUserMessage } from './agent.js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// In-memory rule-based session state keyed by sessionId
const sessionState = new Map();

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
  const { message, history = [], sessionId, mode, model } = req.body || {};
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

      // If chat_sessions.title is empty for this session, set it from the user's first input
      if (sessionId) {
        try {
          const titleCandidate = String(message || '')
            .replace(/\s+/g, ' ')
            .trim()
            .slice(0, 80);
          if (titleCandidate) {
            const { data: sess } = await supabase
              .from('chat_sessions')
              .select('title')
              .eq('session_id', sessionId)
              .maybeSingle();
            if (!sess || !sess.title) {
              await supabase
                .from('chat_sessions')
                .update({ title: titleCandidate })
                .eq('session_id', sessionId);
            }
          }
        } catch (_) { /* ignore title update errors */ }
      }
    }

    // Rule-based mode: bypass LLM agent
    if ((mode || '').toLowerCase() === 'rule') {
      console.log(`[chat] Rule mode active: sessionId=${sessionId || 'local'} message="${(message || '').slice(0, 120)}"`);
      const state = sessionId ? (sessionState.get(sessionId) || { retrievedList: [] }) : { retrievedList: [] };
      const reply = await handleUserMessage(message || '', state);
      if (sessionId) sessionState.set(sessionId, state);

      await supabase.from('chat_messages').insert({
        session_id: sessionId || 'local',
        sender: 'agent',
        text: reply,
        timestamp: new Date().toISOString()
      });
      return res.json({ reply });
    }

    // LLM-driven default mode
    const mappedHistory = (history || []).map(m => ({
      role: m.sender === 'agent' ? 'assistant' : 'user',
      content: m.text || ''
    }));

    const assistantMsg = await chatAgent(mappedHistory, message || '', { model });

    // Always return the assistant's final natural-language content.
    // The agent internally loops tools until a final message, so we should not leak tool_calls here.
    const reply = assistantMsg.content || '';

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

app.get('/api/sessions', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('session_id,sender,text,timestamp')
      .order('timestamp', { ascending: false })
      .limit(2000);
    if (error) return res.status(500).json({ error: 'DB error' });
    const seen = new Set();
    const sessions = [];
    for (const m of data || []) {
      const sid = m.session_id || 'local';
      if (!seen.has(sid)) {
        seen.add(sid);
        sessions.push({ session_id: sid, last_timestamp: m.timestamp, last_text: m.text || '' });
      }
    }

    // Overlay stored titles from chat_sessions if available
    try {
      const ids = sessions.map(s => s.session_id);
      if (ids.length) {
        const { data: stored } = await supabase
          .from('chat_sessions')
          .select('session_id,title')
          .in('session_id', ids);
        const byId = Object.fromEntries((stored || []).map(r => [r.session_id, r.title]));
        for (const s of sessions) {
          if (byId[s.session_id]) s.title = byId[s.session_id];
        }
      }
    } catch (_) { /* ignore title fetch errors */ }

    // Fallback: compute a title from first USER message when not stored
    for (const s of sessions) {
      if (s.title) continue;
      try {
        const { data: firstMsg } = await supabase
          .from('chat_messages')
          .select('text,timestamp')
          .eq('session_id', s.session_id)
          .eq('sender', 'user')
          .order('timestamp', { ascending: true })
          .limit(1)
          .maybeSingle();
        const titleRaw = (firstMsg && firstMsg.text) ? String(firstMsg.text) : '';
        const title = titleRaw
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, 80);
        if (title) s.title = title;
      } catch (_) { /* ignore per-session errors */ }
    }

    res.json({ sessions });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/sessions/:sessionId/messages', async (req, res) => {
  const { sessionId } = req.params;
  if (!sessionId) return res.status(400).json({ error: 'sessionId is required' });
  try {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('timestamp', { ascending: true });
    if (error) return res.status(500).json({ error: 'DB error' });
    res.json({ messages: data || [] });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Backend running on port ${PORT}`));
