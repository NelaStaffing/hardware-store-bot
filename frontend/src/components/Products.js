import React, { useEffect, useState } from 'react';
import axios from 'axios';

export default function Products({ selectedProductSKU }) {
  const sku = selectedProductSKU || '';
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);



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
      <h2>Product Preview</h2>
      {loading ? (
        <div>Loading product...</div>
      ) : !sku || error || !product ? (
        <div style={{ textAlign: 'center', color: '#888', padding: '48px 0', fontSize: 20 }}>
          <img src="https://kruyefkcggouvvgldipa.supabase.co/storage/v1/object/public/images-app//Blue-print-tools-icons_lg.png" alt="Preview Placeholder" style={{ width: 80, marginBottom: 16, opacity: 0.18 }} />
          <div>Ask and preview any product.</div>
        </div>
      ) : (
        <div className="product-card" key={product.id}>
          <img
            src="https://kruyefkcggouvvgldipa.supabase.co/storage/v1/object/public/images-app//Blue-print-tools-icons_lg.png"
            alt="Product"
            style={{ width: 120, height: 120, objectFit: 'contain', display: 'block', margin: '0 auto 16px auto', background: '#f6f8fa', borderRadius: 12 }}
          />
          <div className="product-details">
            <div className="product-name">{product.name}</div>
            <div className="product-desc">{product.description}</div>
            <div className="product-price">${product.price}</div>
            <div className="product-sku">SKU: {product.SKU}</div>
            {product.URL && <a href={product.URL} target="_blank" rel="noopener noreferrer">Product Link</a>}
          </div>
          <div className="product-actions" style={{ display: 'flex', gap: 16, marginTop: 16 }}>
            <button
              className="btn-remove"
              style={{ background: '#f44336', border: 'none', borderRadius: '50%', width: 48, height: 48, color: '#fff', fontSize: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              title="Discard"
              onClick={() => {
                // Remove from shopping list
                let list = JSON.parse(localStorage.getItem('shoppingList') || '[]');
                list = list.filter(item => item.SKU !== product.SKU);
                localStorage.setItem('shoppingList', JSON.stringify(list));
                alert('Product removed from shopping list');
              }}
            >
              &#10006;
            </button>
            <button
              className="btn-add"
              style={{ background: '#4caf50', border: 'none', borderRadius: '50%', width: 48, height: 48, color: '#fff', fontSize: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              title="Add to Shopping List"
              onClick={() => {
                // Add to shopping list
                let list = JSON.parse(localStorage.getItem('shoppingList') || '[]');
                if (!list.find(item => item.SKU === product.SKU)) {
                  list.push(product);
                  localStorage.setItem('shoppingList', JSON.stringify(list));
                  window.dispatchEvent(new Event('shoppingListUpdated'));

                  alert('Product added to shopping list');
                } else {
                  alert('Product already in shopping list');
                }
              }}
            >
              &#10004;
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
