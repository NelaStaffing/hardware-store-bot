# Hardware Store Chatbot MVP

A modern chatbot web app for hardware stores, with a React frontend and Node.js/Express backend. Features product search, preview, and shopping list management. Ready for deployment on Render.

---

## Features
- Conversational UI with clickable product cards
- Product preview section with live details
- Shopping cart/list with PDF export
- Persistent chat sessions
- Voice input (coming soon)

---

## Local Development

### Backend
```bash
cd backend
cp .env.example .env # Fill in your SUPABASE, OPENAI, etc. keys
npm install
npm start
```

### Frontend
```bash
cd frontend
cp .env.example .env # Set REACT_APP_API_URL as needed
npm install
npm start
```
- Frontend: [http://localhost:3000](http://localhost:3000)
- Backend: [http://localhost:5000](http://localhost:5000)

---

## Environment Variables

### Backend (`backend/.env`)
- `PORT` (optional, default 5000)
- `SUPABASE_URL`, `SUPABASE_KEY` (if using Supabase)
- `OPENAI_API_KEY` (if using OpenAI)

### Frontend (`frontend/.env`)
- `REACT_APP_API_URL` (e.g. `https://your-backend.onrender.com`)

---

## Deploying to Render

### 1. Push to GitHub
- Ensure your repo has this structure:
  ```
  /hardware-store-bot
    /backend
    /frontend
  ```

### 2. Deploy Backend
- Create a new **Web Service** on Render
- Root Directory: `backend`
- Build Command: `npm install`
- Start Command: `npm start`
- Set environment variables in Render dashboard

### 3. Deploy Frontend
- Create a new **Static Site** on Render
- Root Directory: `frontend`
- Build Command: `npm install && npm run build`
- Publish Directory: `build`
- Set `REACT_APP_API_URL` to your backend Render URL

### 4. Test
- Visit your frontend Render URL and verify chat, product preview, and cart features work.

---

## Example `.env` Files
See `backend/.env.example` and `frontend/.env.example` for required variables.

---
MIT License
