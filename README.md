# ⚡ 1v1 Coding Arena

A real-time competitive coding platform where two players battle head-to-head on the same coding problem. First correct submission wins. ELO-rated.

---

## 🖼️ Features

- 🔐 **JWT Authentication** — Register/Login with secure token-based auth
- 🏠 **Lobby System** — Create rooms, join by Room ID, or queue for random matchmaking
- ⚔️ **Real-Time 1v1 Matches** — Both players see the same problem; Socket.IO keeps everything in sync
- 🕐 **Synchronized Timer** — 15-minute countdown broadcast to both players via Socket.IO
- 💻 **Monaco Editor** — VS Code-like editor with syntax highlighting for JS, Python, C++, Java
- 🤖 **Judge0 Code Execution** — Real test case evaluation against hidden test cases
- 🏆 **ELO Rating System** — Chess-style rating changes after every match
- 🎯 **Matchmaking Queue** — Automated opponent finding
- 📊 **Match History** — Full history with ELO changes
- 🥇 **Leaderboard** — Global rankings with tier system

---

## 🗂️ Project Structure

```
1v1-coding-arena/
├── client/                    # React frontend
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── context/
│   │   │   ├── AuthContext.js     # JWT auth state
│   │   │   └── SocketContext.js   # Socket.IO connection
│   │   ├── pages/
│   │   │   ├── LoginPage.js
│   │   │   ├── RegisterPage.js
│   │   │   ├── LobbyPage.js       # Room creation/joining/queue
│   │   │   ├── MatchPage.js       # The actual coding arena
│   │   │   ├── ResultPage.js      # Winner/draw screen
│   │   │   ├── LeaderboardPage.js
│   │   │   └── DashboardPage.js   # Match history
│   │   ├── components/
│   │   │   └── Navbar.js
│   │   ├── App.js
│   │   ├── index.js
│   │   └── index.css
│   ├── package.json
│   └── tailwind.config.js
│
├── server/                    # Node.js backend
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── matchController.js
│   │   └── leaderboardController.js
│   ├── middleware/
│   │   ├── auth.js            # JWT middleware
│   │   └── errorHandler.js
│   ├── models/
│   │   ├── User.js            # User + ELO + stats
│   │   ├── Match.js           # Match record
│   │   └── Question.js        # Coding problems
│   ├── routes/
│   │   ├── auth.js
│   │   ├── match.js
│   │   ├── leaderboard.js
│   │   └── question.js
│   ├── socket/
│   │   └── socketHandler.js   # ALL Socket.IO events
│   ├── utils/
│   │   ├── helpers.js         # ELO calc, room ID gen, etc.
│   │   └── judge0.js          # Code execution API
│   ├── seed.js                # Database seeder
│   ├── index.js               # Server entry point
│   └── package.json
│
└── README.md
```

---

## ⚙️ Setup Instructions (Step by Step)

### Prerequisites

Make sure you have installed:
- **Node.js** (v16 or higher) — [Download here](https://nodejs.org)
- **MongoDB** — Either install locally or use [MongoDB Atlas](https://www.mongodb.com/atlas) (free tier)
- **Judge0 API Key** — Get one free at [RapidAPI Judge0](https://rapidapi.com/judge0-official/api/judge0-ce)

---

### Step 1: Clone / Download the project

```bash
cd 1v1-coding-arena
```

---

### Step 2: Set up the Server

```bash
# Navigate to server folder
cd server

# Install dependencies
npm install

# Create your .env file
cp .env.example .env
```

Now edit `server/.env` with your actual values:

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/coding_arena   # or your Atlas URI
JWT_SECRET=some_long_random_string_here_123456789
JUDGE0_API_URL=https://judge0-ce.p.rapidapi.com
JUDGE0_API_KEY=your_rapidapi_key_here
JUDGE0_API_HOST=judge0-ce.p.rapidapi.com
CLIENT_URL=http://localhost:3000
```

---

### Step 3: Seed the Database

This adds 5 sample coding questions:

```bash
# Make sure MongoDB is running first!
node seed.js
```

You should see:
```
✅ Connected to MongoDB
✅ Seeded 5 questions successfully!
```

---

### Step 4: Start the Server

```bash
# In the server/ directory:
npm run dev     # uses nodemon (auto-restarts on changes)
# OR
npm start       # production start
```

You should see:
```
✅ MongoDB connected successfully
🚀 Server running on http://localhost:5000
🎮 Socket.IO ready for connections
```

---

### Step 5: Set up the Client

```bash
# Open a NEW terminal window
cd client

# Install dependencies
npm install

# Create your .env file
cp .env.example .env
```

`client/.env` should contain:
```env
REACT_APP_SERVER_URL=http://localhost:5000
REACT_APP_SOCKET_URL=http://localhost:5000
```

---

### Step 6: Start the Client

```bash
# In the client/ directory:
npm start
```

The app opens at **http://localhost:3000** 🎉

---

### Step 7: Test It!

1. Open **two different browser windows** (or use incognito)
2. Register two different accounts
3. In Window 1: Click **Create Room**
4. Copy the Room ID (e.g., `X7K2M9`)
5. In Window 2: Click **Join Room**, paste the Room ID
6. Both windows will enter the match — start coding!

---

## 🔌 Socket.IO Events Reference

### Client → Server

| Event | Payload | Description |
|-------|---------|-------------|
| `join_room` | `{ roomId }` | Player joins a room (triggers match start if 2 players) |
| `code_submit` | `{ roomId, code, language }` | Submit code for judging |
| `run_code` | `{ roomId, code, language, customInput }` | Run code without submitting |
| `typing_indicator` | `{ roomId, isTyping }` | Broadcast typing status to opponent |
| `join_queue` | — | Enter matchmaking queue |
| `leave_queue` | — | Leave matchmaking queue |

### Server → Client

| Event | Payload | Description |
|-------|---------|-------------|
| `room_update` | `{ playerCount, players, status }` | Room state changed |
| `start_match` | `{ question, players, duration }` | Match is starting — receive the question |
| `timer_sync` | `{ timeLeft }` | Timer tick (every second) |
| `submission_result` | `{ passed, results, isWinner, error }` | Your submission result |
| `match_result` | `{ result, winner, eloChanges, reason }` | Match over |
| `player_submitting` | `{ username }` | An opponent is submitting |
| `opponent_wrong_answer` | `{ username }` | Opponent got wrong answer |
| `opponent_typing` | `{ username, isTyping }` | Opponent typing status |
| `opponent_disconnected` | `{ username }` | Opponent left |
| `match_found` | `{ roomId, opponent }` | Matchmaking found you an opponent |

---

## 🌐 REST API Reference

### Auth

| Method | Endpoint | Body | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/register` | `{username, email, password}` | Register |
| POST | `/api/auth/login` | `{email, password}` | Login, returns JWT |
| GET | `/api/auth/me` | — (auth required) | Get current user |

### Matches

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/matches/create` | Create a new room |
| POST | `/api/matches/join/:roomId` | Join a room |
| GET | `/api/matches/history` | Get your match history |
| GET | `/api/matches/:roomId` | Get match details |

### Leaderboard

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/leaderboard` | Get top 50 players |
| GET | `/api/leaderboard/rank/:userId` | Get specific player's rank |

---

## 📦 Judge0 API Setup

1. Go to [RapidAPI — Judge0 CE](https://rapidapi.com/judge0-official/api/judge0-ce)
2. Sign up for a free account
3. Subscribe to the **Basic** plan (free, 50 requests/day)
4. Copy your **API Key** from the dashboard
5. Paste it in `server/.env` as `JUDGE0_API_KEY`

> **Note**: The free tier has a limit of 50 requests/day. For production use, consider self-hosting Judge0 or upgrading your plan.

### Self-hosting Judge0 (Optional)

If you want unlimited code execution locally:
```bash
# Requires Docker
git clone https://github.com/judge0/judge0.git
cd judge0
cp judge0.conf.example judge0.conf
docker-compose up
```
Then set `JUDGE0_API_URL=http://localhost:2358` and remove the API key headers in `server/utils/judge0.js`.

---

## 🏆 ELO Rating System

The app uses the standard chess ELO formula:

- **Starting ELO**: 1200 (like chess)
- **K-Factor**: 40 (new players, < 10 games), 32 (regular), 24 (experienced, 30+ games)
- **Win**: ~+20-30 ELO (depends on opponent's rating)
- **Loss**: ~-20-30 ELO
- **Draw**: Small adjustment based on expected outcome
- **Minimum ELO**: 100

**Tier System:**
| Tier | ELO Range |
|------|-----------|
| Bronze | < 1000 |
| Silver | 1000–1199 |
| Gold | 1200–1399 |
| Platinum | 1400–1599 |
| Diamond | 1600–1799 |
| Master | 1800–1999 |
| Grandmaster | 2000+ |

---

## 🔧 Troubleshooting

**"Cannot connect to MongoDB"**
→ Make sure MongoDB is running: `mongod` or start it via MongoDB Compass

**"Judge0 API key invalid"**
→ Check your `.env` file. Make sure there are no extra spaces around the key.

**"Room not found"**
→ Room IDs are case-sensitive and 6 characters. Make sure both players have the same ID.

**Socket not connecting**
→ Make sure the server is running on port 5000, and `REACT_APP_SOCKET_URL` points to it.

**"No questions available"**
→ Run `node seed.js` in the server directory.

---

## 🚀 Deployment Notes

For production deployment:
1. Build the React app: `cd client && npm run build`
2. Serve the `build/` folder from Express (add static file serving)
3. Use MongoDB Atlas for the database
4. Set proper `NODE_ENV=production` and update `CLIENT_URL`
5. Use a process manager like **PM2**: `pm2 start server/index.js`
