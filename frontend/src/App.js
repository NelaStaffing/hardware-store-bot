import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import ChatBubble from './components/ChatBubble';
import VoiceButton from './components/VoiceButton';
import LoadingSpinner from './components/LoadingSpinner';

const API_URL = 'http://localhost:5000/api/chat';

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
import './App.css';

export default function App() {
  const [selectedProductSKU, setSelectedProductSKU] = React.useState(null);
  return (
    <div className="app-root">
      <NavBar />
      <main className="main-layout">
        <Products selectedProductSKU={selectedProductSKU} />
        <ChatbotSection selectedProductSKU={selectedProductSKU} setSelectedProductSKU={setSelectedProductSKU} />
        <ShoppingCart />
      </main>
      <Footer />
    </div>
  );
}

