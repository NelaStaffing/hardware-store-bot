{{ ... }}

- **Rule-based (deterministic)**
  - Backend handler: `backend/agent.js` → `handleUserMessage()`.
  - Performs intent classification and multi-wave query expansion (`expandQueries()`), then calls `tools.searchInventory` and formats a single-line JSON `product_list`.
  - Keeps per-session retrieved items (`retrievedList`) so follow-ups like “show details for item 2” work without re-searching.
  - No OpenAI dependency; fast and predictable. Great for guaranteed product cards and consistent behavior.

- **LLM-driven (OpenAI + tool-calling)**
  - Backend handler: `backend/agent.js` → `chatAgent()`.
  - Uses OpenAI Chat Completions with tool-calling to invoke `searchInventory` and `openProductDetail`.
  - Anti-hallucination guard ensures any `product_list` JSON reflects real retrieved results; if none were found, it avoids emitting product JSON and asks a clarifying question.
  - The selected model is sent from the UI. Default comes from `OPENAI_MODEL` (fallback `gpt-4o-mini`).
  - For low-reasoning models (e.g., gpt-5 family) that may not perform tool calls, the backend routes to the rule-based flow to ensure product cards still appear.

- **Switching modes in the UI**
  - The chat header contains a Mode dropdown:
    - LLM-driven
    - Rule-based
  - Changing Mode clears the chat and resets the session to start fresh.
  - When Mode is LLM-driven, a Model dropdown appears (e.g., `gpt-4o-mini`, `gpt-4o`, `gpt-4.1-mini`, `gpt-4.1`, `gpt-5`). Changing Model also clears the chat and resets the session.
  - The frontend sends `mode` with every request and `model` only when Mode is LLM-driven.

- **Output format (for product cards)**
  - A single one-line JSON block is embedded in the assistant reply when products are found:
    - `{"type":"product_list","products":[{"name":"...","SKU":"...","price":19.99,"aisle":"..."}]}`
  - The UI (`frontend/src/components/ChatBubble.js`) detects this JSON and renders clickable product cards.

- **When to use which?**
  - Use Rule-based for reliable product lists and a guided, predictable experience.
  - Use LLM-driven for more open-ended conversations; switch back to Rule-based if your chosen model doesn’t surface product cards.

---

## Local Deployment (Detailed)

- **Backend (`backend/`)**
  - Copy env and fill values:
    - `cp .env.example .env`
    - Required: `OPENAI_API_KEY`
    - Optional: `OPENAI_MODEL` (defaults to `gpt-4o-mini`)
    - If using Supabase product search: `SUPABASE_URL`, `SUPABASE_KEY`
    - Optional: `PORT` (defaults to `5000`)
  - Install & start:
    - `npm install`
    - `npm start` → runs at `http://localhost:5000`

- **Frontend (`frontend/`)**
  - Copy env and set API URL:
    - `cp .env.example .env`
    - Set `REACT_APP_API_URL=http://localhost:5000`
  - Install & start:
    - `npm install`
    - `npm start` → opens at `http://localhost:3000`

- **Using Chat Modes**
  - In the chat header, choose Mode: `LLM-driven` or `Rule-based`.
  - When Mode is `LLM-driven`, choose a Model (e.g., `gpt-4o-mini`, `gpt-4o`, `gpt-4.1-mini`, `gpt-4.1`, `gpt-5`).
  - Changing Mode or Model clears the chat and resets the session.

- **Notes**
  - CORS is enabled server-side via `cors()`.
  - If product cards don’t appear with certain models (e.g., `gpt-5`), the backend routes through the rule-based flow so cards still render.

---

## Deploying to Render

- **Backend (`backend/`)**
  - Create a new **Web Service** on Render
  - Root Directory: `backend`
  - Build Command: `npm install`
  - Start Command: `npm start`
  - Set environment variables in Render dashboard

  Example backend env on Render:

  ```env
  OPENAI_API_KEY=...
  OPENAI_MODEL=gpt-4o-mini   # optional
  SUPABASE_URL=...           # if using Supabase
  SUPABASE_KEY=...           # if using Supabase
  PORT=10000                 # optional; Render sets PORT automatically for web services
  ```

- **Frontend (`frontend/`)**
  - Create a new **Static Site** on Render
  - Root Directory: `frontend`
  - Build Command: `npm install && npm run build`
  - Publish Directory: `build`
  - Set `REACT_APP_API_URL` to your backend Render URL

  Example frontend env on Render:

  ```env
  REACT_APP_API_URL=https://your-backend.onrender.com
  ```

- **When to use which?**
  - Use Rule-based for reliable product lists and a guided, predictable experience.
  - Use LLM-driven for more open-ended conversations; switch back ### 4. Test
 - Visit your frontend Render URL and verify chat, product preview, and cart features work.

---

## Production Tips

- **Cold starts**: Free tiers can cold start; first request may be slower.
- **Model selection**: If product cards don’t appear for some models, switch to `Rule-based` or use a tool-calling-friendly model like `gpt-4o-mini`.
- **CORS/domains**: When adding custom domains, keep `REACT_APP_API_URL` aligned with your backend URL.

---
