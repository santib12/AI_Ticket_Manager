# 🚀 How to Run AI Ticket Orchestrator

## Prerequisites

- Python 3.8+ installed
- Node.js 18+ and npm installed
- OpenAI API key set in `.env` file

---

## 📋 Quick Start Guide

### Step 1: Set up Environment Variables

Make sure you have a `.env` file in the root directory (`Hackathon/.env`) with your OpenAI API key:

```env
OPENAI_API_KEY=sk-your-actual-api-key-here
```

### Step 2: Install Backend Dependencies

Open a terminal and run:

```bash
cd AI_Ticket_Manager/backend
pip install -r requirements.txt
```

### Step 3: Start the Backend Server

In the same terminal (or a new one), run:

```bash
cd AI_Ticket_Manager/backend
python main.py
```

**OR** using uvicorn directly:

```bash
cd AI_Ticket_Manager/backend
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

The backend will start at: **http://localhost:8000**

You should see:
```
INFO:     Uvicorn running on http://0.0.0.0:8000
```

### Step 4: Install Frontend Dependencies

Open a **NEW terminal window** (keep the backend running) and run:

```bash
cd AI_Ticket_Manager/frontend
npm install
```

This will install all React dependencies (first time only).

### Step 5: Start the Frontend

In the same terminal, run:

```bash
cd AI_Ticket_Manager/frontend
npm run dev
```

The frontend will start at: **http://localhost:3000**

You should see:
```
  VITE v5.x.x  ready in xxx ms

  ➜  Local:   http://localhost:3000/
```

---

## 🎯 Access the Application

1. **Frontend UI**: Open your browser and go to **http://localhost:3000**
2. **Backend API**: The API is available at **http://localhost:8000**
   - API Docs: http://localhost:8000/docs (Swagger UI)
   - Health Check: http://localhost:8000/

---

## 📝 Running in Separate Terminals

You need **TWO terminal windows**:

### Terminal 1 - Backend:
```bash
cd AI_Ticket_Manager/backend
python main.py
```

### Terminal 2 - Frontend:
```bash
cd AI_Ticket_Manager/frontend
npm run dev
```

---

## ✅ Verify Everything is Working

1. **Backend Check**: Visit http://localhost:8000/ - should see `{"message":"AI Ticket Orchestrator API","status":"running"}`

2. **Frontend Check**: Visit http://localhost:3000/ - should see the AI Ticket Orchestrator UI with tickets loaded

3. **Test Assignment**: 
   - Click "🚀 Assign Tickets with AI" button
   - Wait for AI processing (may take a minute for many tickets)
   - View assignment results with reasoning

---

## 🐛 Troubleshooting

### Backend Issues:

**Port 8000 already in use:**
```bash
# Change port in main.py or use:
uvicorn main:app --reload --port 8001
```

**Module not found errors:**
```bash
pip install -r requirements.txt
```

**OpenAI API key error:**
- Make sure `.env` file exists in root directory
- Check that `OPENAI_API_KEY` is set correctly

### Frontend Issues:

**Port 3000 already in use:**
- Vite will automatically use the next available port (3001, 3002, etc.)

**npm install fails:**
```bash
# Clear cache and retry
npm cache clean --force
npm install
```

**Can't connect to backend:**
- Make sure backend is running on port 8000
- Check that CORS is enabled (it should be by default)
- Update `VITE_API_URL` in frontend if backend is on different port

---

## 🛑 Stopping the Servers

- **Backend**: Press `Ctrl+C` in the backend terminal
- **Frontend**: Press `Ctrl+C` in the frontend terminal

---

## 📦 Production Build (Optional)

To build the frontend for production:

```bash
cd AI_Ticket_Manager/frontend
npm run build
```

The built files will be in `frontend/dist/`

