import React, { useEffect, useState } from 'react';
import axios from 'axios';

export default function Products({ selectedProductSKU, isMobile = false, onClosePreview }) {
  const sku = selectedProductSKU || '';
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [added, setAdded] = useState(false);



  // Fetch product when SKU changes via POST
  useEffect(() => {
    if (!sku) {
      setProduct(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    axios.post(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/openProductDetail`, { sku })
      .then(res => {
        setProduct(res.data.product);
        setLoading(false);
      })
      .catch(() => {
        setProduct(null);
        setError('Product not found.');
        setLoading(false);
      });
  }, [sku]);

  return (
    <section className="products-section" style={{ maxHeight: '520px', overflowY: 'auto' }}>
      <div style={{ padding: '16px', marginBottom: 16, color: '#fff', background: 'linear-gradient(135deg, #266eff, #1e60e5)', borderRadius: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ padding: 8, background: 'rgba(255,255,255,0.22)', borderRadius: 10 }}>🛠️</div>
          <div>
            <div style={{ fontWeight: 700 }}>Product Details</div>
            <div style={{ fontSize: 12, opacity: 0.9 }}>Select a product from the chat to view details</div>
          </div>
        </div>
      </div>
      {loading ? (
        <div>Loading product...</div>
      ) : !sku || error || !product ? (
        <div style={{ textAlign: 'center', color: '#888', padding: '48px 0', fontSize: 20 }}>
          <img src="https://kruyefkcggouvvgldipa.supabase.co/storage/v1/object/public/images-app//Blue-print-tools-icons_lg.png" alt="Preview Placeholder" style={{ width: 80, marginBottom: 16, opacity: 0.18 }} />
          <div>Ask and preview any product.</div>
        </div>
      ) : (
        <div className="product-card" key={product.id}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            {(() => {
              const defaultImg = 'https://kruyefkcggouvvgldipa.supabase.co/storage/v1/object/public/images-app//Blue-print-tools-icons_lg.png';
              const url = (product.thumbnail_url && /^https?:\/\//i.test(product.thumbnail_url)) ? product.thumbnail_url : defaultImg;
              return (
                <img
                  src={url}
                  alt="Product"
                  onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = defaultImg; }}
                  style={{ width: 96, height: 96, objectFit: 'contain', background: '#f6f8fa', borderRadius: 12, border: '1px solid #dadee6' }}
                />
              );
            })()}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="product-name" style={{ marginBottom: 6 }}>{product.name}</div>
              {(product.url || product.URL) ? (
                <a href={(product.url || product.URL)} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-block', fontSize: 13, color: '#2563eb', textDecoration: 'none', fontWeight: 600 }}>
                  {(product.sku || product.SKU || 'N/A')}
                </a>
              ) : (
                <span style={{ display: 'inline-block', fontSize: 13, color: '#2563eb', fontWeight: 600 }}>{(product.sku || product.SKU || 'N/A')}</span>
              )}
            </div>
          </div>
          <div style={{ height: 1, background: '#e5e9f2', margin: '16px 0' }} />

          {product.description && (
            <div style={{ marginTop: 12 }}>
              <div style={{ fontWeight: 600, color: '#334155', marginBottom: 8 }}>Item Description</div>
              <div className="product-desc">{product.description}</div>
            </div>
          )}

          <div style={{ marginTop: 12 }}>
            <div className="product-price" style={{ background: '#eafff3', border: '1px solid #c8f1d9', padding: 14, borderRadius: 14, display: 'inline-flex', alignItems: 'baseline', gap: 8 }}>
              <span style={{ color: '#15803d', fontSize: 20, fontWeight: 700 }}>${(parseFloat(product.price) || 0).toFixed(2)}</span>
              <span style={{ color: '#16a34a', fontSize: 13 }}>each</span>
            </div>
          </div>

          {(() => {
            const loc = product.aisle_store_location_lititz_pa ||
              ((product.aisle || product.section) ? `Aisle ${product.aisle || ''}${product.section ? ` Section ${product.section}` : ''}` : '');
            return loc ? (
              <div style={{ marginTop: 18 }}>
                <div style={{ fontWeight: 600, color: '#334155', marginBottom: 6 }}>Location</div>
                <div style={{ color: '#475569' }}>{loc}</div>
              </div>
            ) : null;
          })()}

          {(product.url || product.URL) && (
            <a href={(product.url || product.URL)} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: '#2563eb', marginTop: 14, textDecoration: 'none' }}>
              <span aria-hidden>🔗</span>
              <span>View product page</span>
            </a>
          )}

          <div className="product-actions" style={{ display: 'flex', gap: 12, marginTop: 18 }}>
            <button
              className="btn-add"
              style={{ background: added ? 'linear-gradient(135deg,#16a34a,#15803d)' : 'linear-gradient(135deg,#266eff,#1e60e5)', border: 'none', borderRadius: 12, padding: '12px 16px', color: '#fff', fontWeight: 700, cursor: 'pointer', width: '100%', boxShadow: '0 6px 18px rgba(38,110,255,0.25)' }}
              title="Add to Shopping List"
              onClick={() => {
                // Add to shopping list
                let list = JSON.parse(localStorage.getItem('shoppingList') || '[]');
                const currentSku = (product.sku || product.SKU || '').toString();
                if (!list.find(item => ((item.sku || item.SKU || '').toString()) === currentSku)) {
                  // Normalize to ensure `SKU` exists
                  const normalized = { ...product, SKU: currentSku };
                  list.push(normalized);
                  localStorage.setItem('shoppingList', JSON.stringify(list));
                  window.dispatchEvent(new Event('shoppingListUpdated'));
                  setAdded(true);
                  setTimeout(() => setAdded(false), 1200);
                } else {
                  setAdded(true);
                  setTimeout(() => setAdded(false), 800);
                }
              }}
            >
              <span aria-hidden style={{ marginRight: 8 }}>🛒</span>
              {added ? 'Added!' : 'Add to Cart'}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
