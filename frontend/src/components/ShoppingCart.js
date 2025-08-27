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
      const parsed = stored ? JSON.parse(stored) : [];
      // Ensure every item has a quantity of at least 1
      const normalized = parsed.map(p => ({ ...p, quantity: p.quantity && p.quantity > 0 ? p.quantity : 1 }));
      setCart(normalized);
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

  // Update quantity (delta can be +1 or -1)
  const updateQuantity = (sku, delta) => {
    const updated = cart.map(item => {
      if (item.SKU === sku) {
        const newQty = Math.max(1, (item.quantity || 1) + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    });
    setCart(updated);
    localStorage.setItem('shoppingList', JSON.stringify(updated));
  };

  // Clear cart
  const clearCart = () => {
    setCart([]);
    localStorage.setItem('shoppingList', '[]');
  };

  // Calculate total (price * quantity)
  const total = cart.reduce((sum, item) => {
    const qty = item.quantity || 1;
    return sum + ((parseFloat(item.price) || 0) * qty);
  }, 0);

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
            style={{ display: 'flex', flexDirection: 'column', background: '#fff', borderRadius: 12, padding: 16, boxShadow: '0 2px 8px #e3e3e3', gap: 12 }}
          >
            {/* Row 1: image + details + remove button */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, width: '100%', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, flex: 1 }}>
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

            {/* Row 2: quantity selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
              <button
                aria-label="Decrease quantity"
                onClick={() => updateQuantity(item.SKU, -1)}
                style={{ background: '#e0e0e0', border: 'none', borderRadius: '50%', width: 28, height: 28, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                -
              </button>
              <span style={{ minWidth: 24, textAlign: 'center' }}>{item.quantity || 1}</span>
              <button
                aria-label="Increase quantity"
                onClick={() => updateQuantity(item.SKU, 1)}
                style={{ background: '#e0e0e0', border: 'none', borderRadius: '50%', width: 28, height: 28, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                +
              </button>
            </div>
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



