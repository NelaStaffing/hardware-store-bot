import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fetch from 'node-fetch';
import { supabase } from './supabaseClient.js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());


app.post('/api/chat', async (req, res) => {
  console.log('Received /api/chat request:', req.body);
  const { message, history, sessionId } = req.body;
  try {
    // 1. Upsert session
    await supabase.from('chat_sessions').upsert({ session_id: sessionId });
    // 2. Insert user message
    await supabase.from('chat_messages').insert({
      session_id: sessionId,
      sender: 'user',
      text: message,
      timestamp: new Date().toISOString()
    });
    // 3. Get agent reply from n8n
    const response = await fetch('https://n8n-diebotschaft.onrender.com/webhook/939c40d4-52fb-4670-bc4a-8b7b3e0d72a3/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, history, sessionId })
    });
    if (!response.ok) {
      throw new Error(`n8n webhook error: ${response.statusText}`);
    }
    const data = await response.json();
    // 4. Insert agent reply
    let agentReply = data.reply || data.output || (Array.isArray(data) && data[0]?.output) || JSON.stringify(data);
    await supabase.from('chat_messages').insert({
      session_id: sessionId,
      sender: 'agent',
      text: agentReply,
      timestamp: new Date().toISOString()
    });
    // 5. Respond to frontend
    res.json({ reply: agentReply });
  } catch (err) {
    console.error('n8n webhook error:', err);
    res.status(500).json({ reply: 'Error from n8n webhook.' });
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
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('SKU', sku)
      .single();
    if (error || !data) {
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
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('SKU', sku)
      .single();
    if (error || !data) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json({ product: data });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Backend running on port ${PORT}`));
