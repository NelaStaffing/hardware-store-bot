import React, { useEffect, useState } from 'react';
import jsPDF from 'jspdf';

export default function ShoppingCart() {
  // ...existing state and hooks

  // PDF export handler
  const handlePrintList = () => {
    const doc = new jsPDF();

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 14;

    const fmt = (n) => `$${(parseFloat(n) || 0).toFixed(2)}`;
    const now = new Date().toLocaleString();

    const getColumns = () => {
      const usable = pageWidth - margin * 2 - 4; // small inner padding
      const checkW = 8; // checkbox column
      const remaining = usable - checkW;
      const ratios = { name: 0.46, sku: 0.14, loc: 0.24, qty: 0.06, price: 0.10 };
      let nameW = remaining * ratios.name;
      let skuW = remaining * ratios.sku;
      let locW = remaining * ratios.loc;
      let qtyW = Math.max(14, remaining * ratios.qty);
      let priceW = remaining * ratios.price;
      const computedSum = nameW + skuW + locW + qtyW + priceW;
      const delta = remaining - computedSum;
      priceW += delta; // fix rounding
      return [
        { key: 'check', title: '', width: checkW },
        { key: 'name', title: 'Item', width: nameW },
        { key: 'sku', title: 'SKU', width: skuW },
        { key: 'loc', title: 'Location', width: locW },
        { key: 'qty', title: 'Qty', width: qtyW },
        { key: 'price', title: 'Price', width: priceW },
      ];
    };

    const drawHeader = () => {
      // Title block
      doc.setFontSize(20);
      doc.setTextColor(0, 0, 0);
      doc.text('PaulB Hardware Store', margin, margin + 4);
      doc.setFontSize(14);
      doc.setTextColor(30);
      doc.text('Shopping List Checklist', margin, margin + 12);
      doc.setFontSize(10);
      doc.setTextColor(120);
      doc.text(`Generated: ${now}`, margin, margin + 18);

      // Table header background
      const headerY = margin + 26;
      doc.setFillColor(240, 243, 248);
      doc.rect(margin, headerY - 6, pageWidth - margin * 2, 8, 'F');

      doc.setTextColor(40);
      doc.setFontSize(11);
      const cols = getColumns();
      let x = margin + 2;
      cols.forEach(col => {
        doc.text(col.title, x, headerY);
        x += col.width;
      });

      // Rule
      doc.setDrawColor(210);
      doc.line(margin, headerY + 2, pageWidth - margin, headerY + 2);

      return headerY + 8; // next Y position
    };

    let y = drawHeader();
    doc.setFontSize(10);
    doc.setTextColor(0);
    const cols = getColumns();
    const usableWidth = pageWidth - margin * 2 - 4;
    const lineHeight = 6;
    let runningTotal = 0;

    cart.forEach((rawItem, idx) => {
      const item = {
        ...rawItem,
        sku: (rawItem.sku || rawItem.SKU || '').toString(),
        location: rawItem.aisle_store_location_lititz_pa || '',
        price: parseFloat(rawItem.price) || 0,
        quantity: rawItem.quantity && rawItem.quantity > 0 ? rawItem.quantity : 1,
      };

      const subtotal = item.price * item.quantity;
      runningTotal += subtotal;

      // Wrap text for columns
      const nameMaxWidth = cols[1].width - 4;
      const locMaxWidth = cols[3].width - 4;
      const nameLines = doc.splitTextToSize(item.name || '', nameMaxWidth);
      const locLines = doc.splitTextToSize(item.location || '—', locMaxWidth);
      const rowLines = Math.max(1, Math.max(nameLines.length, locLines.length));
      const rowHeight = rowLines + (lineHeight * rowLines) - (lineHeight - 2);

      // Page break
      if (y + rowHeight > pageHeight - margin - 20) {
        doc.addPage();
        y = drawHeader();
      }

      // Draw row
      let x = margin + 2;
      doc.setDrawColor(180);
      doc.rect(x, y - lineHeight + 2, 4, 4); // checkbox
      x += cols[0].width;

      // Name
      doc.setTextColor(0);
      nameLines.forEach((ln, i) => doc.text(ln, x, y + i * lineHeight));
      x += cols[1].width;

      // SKU
      doc.setTextColor(60);
      doc.text(item.sku || '—', x, y);
      x += cols[2].width;

      // Location
      doc.setTextColor(60);
      locLines.forEach((ln, i) => doc.text(ln, x, y + i * lineHeight));
      x += cols[3].width;

      // Qty (right-aligned)
      doc.setTextColor(0);
      const qtyStr = String(item.quantity);
      const qtyWidth = doc.getTextWidth(qtyStr);
      doc.text(qtyStr, x + cols[4].width - 2 - qtyWidth, y);
      x += cols[4].width;

      // Price (right-aligned)
      const priceStr = fmt(item.price);
      const priceWidth = doc.getTextWidth(priceStr);
      doc.text(priceStr, x + cols[5].width - 2 - priceWidth, y);

      // Row separator
      doc.setDrawColor(235);
      const rowBottom = y + (lineHeight * (rowLines - 1)) + 3;
      doc.line(margin, rowBottom, margin + usableWidth, rowBottom);

      y += Math.max(lineHeight, lineHeight * rowLines);
    });

    // Summary
    if (y > pageHeight - margin - 30) {
      doc.addPage();
      y = drawHeader();
    }
    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text('Summary', margin, y + 6);
    doc.setFontSize(11);
    doc.setTextColor(60);
    doc.text(`Items: ${cart.length}`, margin, y + 14);
    doc.text(`Total: ${fmt(runningTotal)}`, margin + 50, y + 14);

    // Footer page numbers
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(9);
      doc.setTextColor(120);
      doc.text(`Page ${i} of ${pageCount}`, pageWidth - margin - 28, pageHeight - 8);
    }

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



