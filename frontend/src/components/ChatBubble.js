import React from 'react';

// Inline SVG alternatives to lucide-react icons (no extra dependency)
function BotIcon({ size = 16 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 3v4" />
      <rect x="7" y="7" width="10" height="10" rx="2" />
      <path d="M5 11H3" />
      <path d="M21 11h-2" />
      <circle cx="10" cy="12" r="1" />
      <circle cx="14" cy="12" r="1" />
      <path d="M8 16h8" />
    </svg>
  );
}

function UserIcon({ size = 16 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M20 21a8 8 0 0 0-16 0" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

// Basic markdown to HTML (bold, italic, line breaks, lists)
function formatMarkdown(text) {
  if (!text) return '';
  let html = text
    .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>') // bold
    .replace(/\*(.*?)\*/g, '<i>$1</i>') // italic
    .replace(/\n/g, '<br />') // line breaks
    .replace(/\r/g, '')
    .replace(/\n\s*\d+\./g, '<br /><b>$&</b>') // numbered list
    .replace(/\n\s*-/g, '<br />•'); // bullet list
  return html;
}

function stripHtml(html) {
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || '';
}

export default function ChatBubble({ message, onProductClick }) {
  const isAgent = message.sender === 'agent';

  // Try to extract a JSON product_list block from the message
  let text = stripHtml(message.text || '');
  let productList = null, intro = '', outro = '';

  function extractProductJSON(s) {
    if (!s) return null;
    // Normalize quotes and entities
    const normalized = s
      .replace(/[“”]/g, '"')
      .replace(/[‘’]/g, "'")
      .replace(/&quot;/g, '"');
    const typeToken = '"type":"product_list"';
    const typeIdx = normalized.indexOf(typeToken);
    if (typeIdx === -1) return null;
    // Find the opening brace for the JSON object
    let start = normalized.lastIndexOf('{', typeIdx);
    if (start === -1) return null;
    // Scan forward with brace balance while respecting strings
    let depth = 0; let inStr = false; let esc = false; let end = -1;
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
      else if (ch === '}') {
        depth--;
        if (depth === 0) { end = i + 1; break; }
      }
    }
    if (end === -1) return null;
    let jsonStr = normalized.slice(start, end);
    // Repairs: remove trailing commas
    jsonStr = jsonStr.replace(/,(\s*[}\]])/g, '$1');
    try {
      const obj = JSON.parse(jsonStr);
      return { obj, start, end };
    } catch (e) {
      console.error('Balanced-parse JSON error:', e, jsonStr);
      return null;
    }
  }

  if (isAgent && text.includes('"type":"product_list"')) {
    const found = extractProductJSON(text);
    if (found && found.obj && Array.isArray(found.obj.products)) {
      productList = found.obj;
      intro = text.slice(0, found.start).trim();
      outro = text.slice(found.end).trim();
    }
  }

  const avatar = (
    <div
      aria-hidden
      style={{
        width: 32,
        height: 32,
        minWidth: 32,
        minHeight: 32,
        maxWidth: 32,
        maxHeight: 32,
        flex: '0 0 32px',
        borderRadius: 8,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: isAgent ? 'linear-gradient(135deg, #60a5fa, #2563eb)' : '#1f2937',
        color: '#fff',
        boxShadow: isAgent ? '0 4px 12px rgba(37,99,235,0.35)' : '0 3px 10px rgba(0,0,0,0.25)',
        marginTop: 4,
      }}
      title={isAgent ? 'Assistant' : 'You'}
    >
      {isAgent ? <BotIcon size={16} /> : <UserIcon size={16} />}
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: isAgent ? 'row' : 'row-reverse', alignItems: 'flex-start', gap: 12 }}>
      {avatar}
      <div style={{
        background: isAgent ? '#ffffff' : 'linear-gradient(135deg, #2563eb, #1e40af)',
        color: isAgent ? '#374151' : '#ffffff',
        border: isAgent ? '1px solid #e5e7eb' : 'none',
        borderRadius: 14,
        padding: '12px 16px',
        maxWidth: 520,
        fontSize: 16,
        boxShadow: isAgent ? '0 2px 10px rgba(0,0,0,0.06)' : '0 6px 16px rgba(37,99,235,0.35)',
        wordBreak: 'break-word',
        whiteSpace: 'pre-line',
      }}>
        {isAgent && productList ? (
          <>
            {intro && <div style={{ marginBottom: 10 }} dangerouslySetInnerHTML={{ __html: formatMarkdown(intro) }} />}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, margin: '12px 0' }}>
              {productList.products.map((p, i) => (
                <div
                  key={i}
                  style={{ background: 'linear-gradient(135deg, #f8fafc, #ffffff)', border: '1px solid #e5e7eb', borderRadius: 10, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', padding: 12, display: 'flex', flexDirection: 'column', gap: 6, cursor: 'pointer' }}
                  onClick={() => onProductClick && onProductClick(p.SKU)}
                  tabIndex={0}
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') onProductClick && onProductClick(p.SKU); }}
                  aria-label={`Preview ${p.name}`}
                  role="button"
                >
                  <div style={{ fontWeight: 600, fontSize: 16, color: '#0f172a' }}>{p.name}</div>
                  <div style={{ color: '#16a34a', fontWeight: 600 }}>${p.price}</div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 12, color: '#334155', background: '#f1f5f9', border: '1px solid #e2e8f0', padding: '2px 8px', borderRadius: 8 }}>SKU: {p.SKU}</span>
                    {p.aisle && <span style={{ fontSize: 13, color: '#475569' }}>Location: {p.aisle}{p.section ? ` ${p.section}` : ''}</span>}
                  </div>
                </div>
              ))}
            </div>
            {outro && <div style={{ marginTop: 10 }} dangerouslySetInnerHTML={{ __html: formatMarkdown(outro) }} />}
          </>
        ) : isAgent ? (
          <span dangerouslySetInnerHTML={{ __html: formatMarkdown(text) }} />
        ) : (
          text
        )}
        <div style={{ fontSize: 11, color: isAgent ? '#9ca3af' : '#e0e7ff', marginTop: 6, textAlign: isAgent ? 'left' : 'right' }}>{message.timestamp}</div>
      </div>
    </div>
  );
}
