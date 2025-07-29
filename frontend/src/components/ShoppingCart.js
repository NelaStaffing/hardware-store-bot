import React, { useEffect, useState } from 'react';
import jsPDF from 'jspdf';

export default function ShoppingCart() {
  // ...existing state and hooks

  // PDF export handler
  const handlePrintList = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text('Shopping List Checklist', 14, 18);
    doc.setFontSize(12);
    let y = 30;
    cart.forEach((item, idx) => {
      // Draw checkbox
      doc.rect(14, y - 4, 5, 5);
      // Product info
      doc.text(`${item.name}  ($${item.price})`, 22, y);
      doc.text(`SKU: ${item.SKU}`, 140, y);
      y += 12;
      // Add page if needed
      if (y > 270 && idx < cart.length - 1) {
        doc.addPage();
        y = 20;
      }
    });
    doc.save('shopping-list.pdf');
  };
  const [cart, setCart] = useState([]);

  // Load cart from localStorage on mount
  useEffect(() => {
    const loadCart = () => {
      const stored = localStorage.getItem('shoppingList');
      setCart(stored ? JSON.parse(stored) : []);
    };
    loadCart();
    window.addEventListener('storage', loadCart);
    window.addEventListener('shoppingListUpdated', loadCart);
    return () => {
      window.removeEventListener('storage', loadCart);
      window.removeEventListener('shoppingListUpdated', loadCart);
    };
  }, []);

  // Remove item from cart
  const removeFromCart = (sku) => {
    const updated = cart.filter(item => item.SKU !== sku);
    setCart(updated);
    localStorage.setItem('shoppingList', JSON.stringify(updated));
  };

  // Clear cart
  const clearCart = () => {
    setCart([]);
    localStorage.setItem('shoppingList', '[]');
  };

  // Calculate total
  const total = cart.reduce((sum, item) => sum + (parseFloat(item.price) || 0), 0);

  return (
    <section className="cart-section" style={{ maxWidth: 480, margin: '0 auto', padding: 24 }}>
      <h2 style={{ color: '#007aff', marginBottom: 24 }}>Shopping List</h2>
      <div className="cart-list" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {cart.length === 0 ? (
          <div style={{ color: '#888', textAlign: 'center' }}>Your shopping cart is empty.</div>
        ) : cart.map(item => (
          <div
            className="cart-item"
            key={item.SKU}
            style={{ display: 'flex', alignItems: 'center', background: '#fff', borderRadius: 12, padding: 16, boxShadow: '0 2px 8px #e3e3e3', gap: 16 }}
          >
            <img
              src="https://kruyefkcggouvvgldipa.supabase.co/storage/v1/object/public/images-app//Blue-print-tools-icons_lg.png"
              alt="Product"
              style={{ width: 56, height: 56, objectFit: 'contain', background: '#f6f8fa', borderRadius: 8 }}
            />
            <div className="cart-details" style={{ flex: 1 }}>
              <div className="cart-name" style={{ fontWeight: 600, color: '#263238' }}>{item.name}</div>
              <div className="cart-price" style={{ color: '#388e3c', fontWeight: 500 }}>${item.price}</div>
              <div className="cart-sku" style={{ color: '#888', fontSize: 12 }}>SKU: {item.SKU}</div>
            </div>
            <button
              className="btn-remove"
              style={{ background: '#f44336', border: 'none', borderRadius: '50%', width: 36, height: 36, color: '#fff', fontSize: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              title="Remove"
              onClick={() => removeFromCart(item.SKU)}
            >
              ✕
            </button>
          </div>
        ))}
      </div>
      <div className="cart-total" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 24, fontWeight: 600, fontSize: 18 }}>
        <span>Total:</span>
        <span>${total.toFixed(2)}</span>
      </div>
      <div style={{ display: 'flex', gap: 16, marginTop: 24 }}>
        <button
          className="btn-clear"
          style={{ background: '#bdbdbd', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', fontWeight: 600, cursor: 'pointer', flex: 1 }}
          onClick={clearCart}
          disabled={cart.length === 0}
        >
          Clear Cart
        </button>
        <button
          className="btn-checkout"
          style={{ background: '#007aff', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', fontWeight: 600, cursor: 'pointer', flex: 1 }}
          onClick={handlePrintList}
          disabled={cart.length === 0}
        >
          Print List
        </button>
      </div>
    </section>
  );
}



