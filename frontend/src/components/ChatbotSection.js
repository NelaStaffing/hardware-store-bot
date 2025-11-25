import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';

import LoadingSpinner from './LoadingSpinner';
import VoiceButton from './VoiceButton';
import ChatBubble from './ChatBubble';
import Drawer from './Drawer';

export default function ChatbotSection({ selectedProductSKU, setSelectedProductSKU }) {
  const handleProductClick = sku => setSelectedProductSKU(sku);

  const [messages, setMessages] = useState([
    {
      sender: 'agent',
      text: 'Hi! What can I help you with?',
      timestamp: new Date().toLocaleString()
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState(() => localStorage.getItem('chat_mode') || 'llm');
  const [model, setModel] = useState(() => localStorage.getItem('chat_model') || 'gpt-4o-mini');
  const chatEndRef = useRef(null);
  const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5001';
  const [sessions, setSessions] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [selectedSessionId, setSelectedSessionId] = useState(() => localStorage.getItem('sessionId') || '');
  const [openSessions, setOpenSessions] = useState(false);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    const load = async () => {
      try {
        setSessionsLoading(true);
        const res = await axios.get(`${API_BASE}/api/sessions`);
        setSessions(res.data?.sessions || []);
      } catch {
        setSessions([]);
      } finally {
        setSessionsLoading(false);
      }
    };
    load();
  }, [API_BASE]);

  const openSession = async (sid) => {
    try {
      setSelectedSessionId(sid);
      localStorage.setItem('sessionId', sid);
      const res = await axios.get(`${API_BASE}/api/sessions/${sid}/messages`);
      const rows = res.data?.messages || [];
      const mapped = rows.map(r => ({ sender: r.sender, text: r.text, timestamp: r.timestamp }));
      setMessages(mapped.length ? mapped : [{ sender: 'agent', text: 'Hi! What can I help you with?' }]);
      setOpenSessions(false);
    } catch {
      setMessages([{ sender: 'agent', text: 'Hi! What can I help you with?' }]);
    }
  };

  const newSession = () => {
    const sid = (window.crypto?.randomUUID?.() || Date.now().toString());
    localStorage.setItem('sessionId', sid);
    setSelectedSessionId(sid);
    setMessages([{ sender: 'agent', text: 'Hi! What can I help you with?' }]);
    setInput('');
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;
    const userMsg = { sender: 'user', text: input };
    setMessages(msgs => [...msgs, userMsg]);
    setInput('');
    setLoading(true);
    try {
      let sessionId = localStorage.getItem('sessionId');
      if (!sessionId) {
        sessionId = (window.crypto?.randomUUID?.() || Date.now().toString());
        localStorage.setItem('sessionId', sessionId);
      }
      const res = await axios.post(`${API_BASE}/api/chat`, {
        message: input,
        history: messages,
        sessionId,
        mode: mode === 'rule' ? 'rule' : 'llm',
        model: mode === 'llm' ? model : undefined,
      });

      // Check if the response looks like a tool call for openProductDetail
      let botMsg = res.data.reply;
      let productMsg = null;
      try {
        const parsed = typeof botMsg === 'string' ? JSON.parse(botMsg) : botMsg;
        if (parsed && parsed.tool === 'openProductDetail' && parsed.tool_input?.id) {
          // Fetch product detail from backend
          const prodRes = await axios.post(`${API_BASE}/api/openProductDetail`, {
            sku: parsed.tool_input.id
          });
          if (prodRes.data && prodRes.data.product) {
            const p = prodRes.data.product;
            productMsg = `Product Details\nName: ${p.name || ''}\nSKU: ${p.SKU || ''}\nPrice: $${p.price || ''}\n${p.description ? 'Description: ' + p.description + '\n' : ''}${p.URL ? 'URL: ' + p.URL : ''}`;
          } else {
            productMsg = 'Product not found.';
          }
        }
      } catch (err) { /* Not a tool call, treat as normal reply */ }

      setMessages(msgs => [
        ...msgs,
        { sender: 'agent', text: productMsg || (typeof botMsg === 'string' ? botMsg : JSON.stringify(botMsg)) }
      ]);
    } catch (err) {
      setMessages(msgs => [...msgs, { sender: 'agent', text: 'Sorry, there was an error connecting to the assistant.' }]);
    }
    setLoading(false);
  };


  const handleClear = () => {
    setMessages([{ sender: 'agent', text: 'Hi! What can I help you with?' }]);
    setInput('');
    localStorage.removeItem('sessionId');
  };

  const handleModeChange = (e) => {
    const m = e.target.value;
    setMode(m);
    localStorage.setItem('chat_mode', m);
    // Clear chat and reset session to start a new conversation when switching agent type
    setMessages([{ sender: 'agent', text: 'Hi! What can I help you with?' }]);
    setInput('');
    localStorage.removeItem('sessionId');
  };

  const handleModelChange = (e) => {
    const m = e.target.value;
    setModel(m);
    localStorage.setItem('chat_model', m);
    // Clear chat and reset session to start a new conversation when switching model
    setMessages([{ sender: 'agent', text: 'Hi! What can I help you with?' }]);
    setInput('');
    localStorage.removeItem('sessionId');
  };

  return (
    <section className="chatbot-section">
      <div className="chatbot-header">
        <div className="chatbot-title">Chatbot</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <label htmlFor="mode-select" style={{ fontSize: 12, opacity: 0.8 }}>Mode</label>
          <select id="mode-select" value={mode} onChange={handleModeChange}>
            <option value="llm">LLM-driven</option>
            <option value="rule">Rule-based</option>
          </select>
          {mode === 'llm' && (
            <>
              <label htmlFor="model-select" style={{ fontSize: 12, opacity: 0.8 }}>Model</label>
              <select id="model-select" value={model} onChange={handleModelChange}>
                <option value="gpt-4o-mini">gpt-4o-mini</option>
                <option value="gpt-4o">gpt-4o</option>
                <option value="gpt-4.1-mini">gpt-4.1-mini</option>
                <option value="gpt-4.1">gpt-4.1</option>
                <option value="gpt-5">gpt-5</option>
                <option value="gpt-5.1">gpt-5.1</option>
              </select>
            </>
          )}
          <button onClick={() => setOpenSessions(true)} style={{ fontSize: 12 }}>Sessions</button>
          <button className="btn-clear" onClick={handleClear}>Clear Chat</button>
        </div>
      </div>
      <div className="chatbot-messages">
        {messages.map((msg, idx) => (
          <ChatBubble key={idx} message={msg} onProductClick={handleProductClick} />
        ))}
        {loading && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 8 }}>
            <LoadingSpinner />
          </div>
        )}
        <div ref={chatEndRef} />
      </div>
      <form className="chatbot-input" onSubmit={handleSend} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Type a message..."
          style={{ flex: 1 }}
        />
        <button type="submit" style={{ minWidth: 60 }}>Send</button>
        <VoiceButton disabled={loading} onResult={t => setInput(t)} />
      </form>
      <Drawer open={openSessions} onClose={() => setOpenSessions(false)} title="Sessions" side="right">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <div style={{ fontWeight: 600 }}>Sessions</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={newSession} disabled={loading} style={{ fontSize: 12 }}>New</button>
            <button onClick={async () => { try { setSessionsLoading(true); const res = await axios.get(`${API_BASE}/api/sessions`); setSessions(res.data?.sessions || []); } finally { setSessionsLoading(false); } }} style={{ fontSize: 12 }}>Refresh</button>
          </div>
        </div>
        <div style={{ maxHeight: '70vh', overflow: 'auto' }}>
          {sessionsLoading ? (
            <div style={{ padding: 8, fontSize: 12, opacity: 0.7 }}>Loading...</div>
          ) : (
            (sessions || []).map(s => (
              <div key={s.session_id}
                   onClick={() => openSession(s.session_id)}
                   style={{ padding: 8, cursor: 'pointer', background: selectedSessionId === s.session_id ? '#f3f4f6' : 'transparent', borderRadius: 6, marginBottom: 6 }}>
                <div style={{ fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.session_id}</div>
                <div style={{ fontSize: 12, opacity: 0.7, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{s.last_text || ''}</div>
                <div style={{ fontSize: 11, opacity: 0.6 }}>{s.last_timestamp ? new Date(s.last_timestamp).toLocaleString() : ''}</div>
              </div>
            ))
          )}
        </div>
      </Drawer>
    </section>
  );
}
