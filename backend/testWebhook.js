import fetch from 'node-fetch';

const url = 'https://n8n-diebotschaft.onrender.com/webhook/939c40d4-52fb-4670-bc4a-8b7b3e0d72a3/chat';

fetch(url, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ message: "test", history: [], sessionId: "test-session" })
})
  .then(res => res.text())
  .then(console.log)
  .catch(console.error);
