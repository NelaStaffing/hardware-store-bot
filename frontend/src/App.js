import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import ChatBubble from './components/ChatBubble';
import VoiceButton from './components/VoiceButton';
import LoadingSpinner from './components/LoadingSpinner';

const API_URL = 'http://localhost:5001/api/chat';

// Generate or retrieve a persistent sessionId
function getSessionId() {
  let id = localStorage.getItem('sessionId');
  if (!id) {
    id = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substr(2, 16);
    localStorage.setItem('sessionId', id);
  }
  return id;
}

const INITIAL_MSG = { sender: 'agent', text: 'Hi! What can I help you with?', timestamp: new Date().toLocaleString() };

import NavBar from './components/NavBar';
import Footer from './components/Footer';
import Products from './components/Products';
import ChatbotSection from './components/ChatbotSection';
import ShoppingCart from './components/ShoppingCart';
import Modal from './components/Modal';
import Drawer from './components/Drawer';
import './App.css';

export default function App() {
  const [selectedProductSKU, setSelectedProductSKU] = React.useState(null);
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' ? window.innerWidth <= 768 : false);
  const [openPreview, setOpenPreview] = useState(false);
  const [openCart, setOpenCart] = useState(false);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Auto-open product preview modal on mobile when a product is selected from chat
  useEffect(() => {
    if (isMobile && selectedProductSKU) {
      setOpenPreview(true);
    }
  }, [isMobile, selectedProductSKU]);

  return (
    <div className="app-root">
      <NavBar />
      {isMobile ? (
        <main className="mobile-main">
          <ChatbotSection selectedProductSKU={selectedProductSKU} setSelectedProductSKU={setSelectedProductSKU} />

          <Modal open={openPreview} onClose={() => setOpenPreview(false)} title="Product Preview">
            <Products selectedProductSKU={selectedProductSKU} isMobile onClosePreview={() => setOpenPreview(false)} />
          </Modal>

          <Drawer open={openCart} onClose={() => setOpenCart(false)} title="Shopping List" side="right">
            <ShoppingCart />
          </Drawer>

          <div className="fab-container">
            <button className="fab fab-secondary" onClick={() => setOpenCart(true)} aria-label="Open shopping cart">Cart</button>
          </div>
        </main>
      ) : (
        <main className="main-layout">
          <Products selectedProductSKU={selectedProductSKU} />
          <ChatbotSection selectedProductSKU={selectedProductSKU} setSelectedProductSKU={setSelectedProductSKU} />
          <ShoppingCart />
        </main>
      )}
      <Footer />
    </div>
  );
}
