# 🎤 AI Family Feud (Real-Time RAG Edition)

An intelligent, infinitely replayable game show experience where the questions are generated from live internet trends and your answers are judged by their meaning, not just their spelling.

**Live Demo:** https://ai-family-feud.vercel.app/ 
**Backend API:** https://ai-family-feud.onrender.com/api

---

## 🚀 Key Features

- **Dynamic RAG Boards:** Every game is unique. The backend scrapes live discussions from `r/AskReddit` and uses GPT-4o to synthesize a weighted game board.
- **Semantic Judging:** Uses GPT-4o-mini to evaluate user guesses. It understands synonyms, context, and intent (e.g., "Automobile" matches "Car").
- **Resilient Architecture:** Features a built-in fallback data layer to ensure 100% uptime even when external APIs (Reddit) rate-limit the server.
- **Game Show Polish:** Includes sound effects, strike tracking, score management, and a "Full Reveal" endgame state.

---

## 🛠️ Tech Stack

- **Frontend:** React, TypeScript, Vite, Lucide-React, Axios.
- **Backend:** Python, FastAPI, Requests, Pydantic (Structured Outputs).
- **AI:** OpenAI GPT-4o (Generation) & GPT-4o-mini (Judging).
- **Deployment:** Vercel (Frontend) & Render (Backend).

---

## 💻 Local Setup

### 1. Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
# Create a .env file with: OPENAI_API_KEY=your_key_here
uvicorn main:app --reload
```

### 2. Frontend
```bash
cd frontend
npm install
# Ensure VITE_API_URL is set to http://localhost:8000/api in your environment
npm run dev
