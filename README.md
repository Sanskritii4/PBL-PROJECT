# 🧬 AI-Driven Adaptive Packet Routing

A full-stack system that trains a **Reinforcement Learning agent** (Q-Learning + SARSA) to route packets through a simulated network, and compares its performance against **Dijkstra's shortest-path algorithm**.

> **Result**: The RL agent achieves **100% packet delivery** vs Dijkstra's **~27%** under dynamic network conditions.

---

## 🎯 What This Does

- Simulates a network of routers with **dynamic congestion, delay, bandwidth, and packet loss**
- Trains a **Q-Learning agent** that learns optimal routes through trial and error
- Compares AI-learned routes against the classic **Dijkstra** baseline
- Provides a **React dashboard** with interactive graph visualization and charts

## 🛠 Tech Stack

| Layer | Technologies |
|---|---|
| **Backend** | Python, FastAPI, NetworkX, NumPy, Pydantic |
| **Frontend** | React 18, Vite, Recharts, Axios |
| **AI/ML** | Q-Learning, SARSA (Reinforcement Learning) |

## 📁 Project Structure

```
├── backend/
│   ├── core/           # RL engine: network simulator + Q-Learning agent
│   ├── api/            # FastAPI routers (10 REST endpoints)
│   ├── models/         # Pydantic request/response schemas
│   ├── services/       # Service layer (singleton pattern)
│   └── main.py         # App entry point with CORS + Swagger docs
└── frontend/
    └── src/
        ├── components/ # NetworkGraph, ControlPanel, Charts, etc.
        └── services/   # Axios API client
```

## 🚀 Quick Start

### Backend
```bash
cd backend
pip install -r requirements.txt
cd ..
python3 -m uvicorn backend.main:app --reload --port 8000
```
Open **http://localhost:8000/docs** for Swagger API docs.

### Frontend
```bash
cd frontend
npm install
npm run dev
```
Open **http://localhost:5173** for the dashboard.

## 📊 API Endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/` | Health check |
| `GET` | `/network` | Get topology |
| `POST` | `/network` | Create new topology |
| `POST` | `/network/failure` | Inject/restore link failures |
| `POST` | `/train` | Train Q-Learning agent |
| `GET` | `/route?source=&dest=` | RL-based routing |
| `GET` | `/static-route?source=&dest=` | Dijkstra routing |
| `POST` | `/route/compare` | Batch comparison |
| `GET` | `/metrics` | Training metrics |

## 🧠 How the RL Agent Works

1. **State** = current router node
2. **Action** = which neighbor to forward to
3. **Reward** = +100 for delivery, penalties for delay/congestion/loss
4. **Training** = 5000 episodes of trial and error
5. **Result** = Q-table mapping every (node, neighbor) → expected reward

## 📈 Results

| Metric | Q-Learning | Dijkstra |
|---|---|---|
| Delivery Rate | **100%** | ~27% |
| Adapts to congestion | ✅ | ❌ |
| Adapts to link failures | ✅ | ❌ |

## 👥 Authors

- Utkarsh Saluja
- Sanskriti

## 📄 License

This project is for academic purposes (PBL).
