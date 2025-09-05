import React from 'react';

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

  return (
    <div style={{ display: 'flex', flexDirection: isAgent ? 'row' : 'row-reverse', alignItems: 'flex-end', gap: 12 }}>
      <div style={{
        background: isAgent ? '#f3f4f6' : '#d1eaff',
        color: '#222',
        borderRadius: 14,
        padding: '10px 16px',
        maxWidth: 480,
        fontSize: 16,
        boxShadow: isAgent ? '0 1px 4px #0001' : '0 2px 8px #6cf2',
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
                  style={{ background: '#fff', borderRadius: 10, boxShadow: '0 1px 4px #0001', padding: 12, display: 'flex', flexDirection: 'column', gap: 4, cursor: 'pointer' }}
                  onClick={() => onProductClick && onProductClick(p.SKU)}
                  tabIndex={0}
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') onProductClick && onProductClick(p.SKU); }}
                  aria-label={`Preview ${p.name}`}
                  role="button"
                >
                  <div style={{ fontWeight: 600, fontSize: 16 }}>{p.name}</div>
                  <div style={{ color: '#388e3c', fontWeight: 500 }}>${p.price}</div>
                  <div style={{ color: '#888', fontSize: 13 }}>SKU: {p.SKU}</div>
                  {p.aisle && <div style={{ color: '#1976d2', fontSize: 13 }}>Aisle: {p.aisle}</div>}
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
        <div style={{ fontSize: 11, color: '#888', marginTop: 4, textAlign: isAgent ? 'left' : 'right' }}>{message.timestamp}</div>
      </div>
    </div>
  );
}
