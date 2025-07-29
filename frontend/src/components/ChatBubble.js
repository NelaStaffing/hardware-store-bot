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
  if (isAgent && text.includes('"type":"product_list"')) {
    try {
      // Use regex to extract the JSON block for product_list
      const match = text.match(/({[\s\S]*?"type"\s*:\s*"product_list"[\s\S]*})/m);
      if (match) {
        let jsonStr = match[1];
        // Log the raw matched string before sanitization
        console.log('Matched JSON string:', jsonStr);
        // Attempt to repair common issues
        jsonStr = jsonStr
          .replace(/,(\s*[}\]])/g, '$1') // Remove trailing commas
          .replace(/'/g, '"') // Replace single with double quotes
          .replace(/&quot;/g, '"'); // Replace HTML entity quotes
        // Log for debugging
        console.log('Sanitized JSON string:', jsonStr);
        productList = JSON.parse(jsonStr);
        intro = text.slice(0, match.index).trim();
        outro = text.slice(match.index + match[1].length).trim();
        console.log('REGEX Parsed productList:', productList);
      } else {
        productList = null;
        console.error('No product_list JSON found.');
      }
    } catch (e) {
      productList = null;
      console.error('REGEX JSON parse error:', e);
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
