<div align="center">

<img src="frontend/public/logo.png" alt="CONNECT Logo" width="80" />

# CONNECT

### *The AI-Powered Engineering Collaboration Platform*

**Find teammates. Build projects. Ship faster — together.**

[![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?style=flat-square&logo=nodedotjs&logoColor=white)](https://nodejs.org)
[![Next.js](https://img.shields.io/badge/Next.js-16-000000?style=flat-square&logo=nextdotjs&logoColor=white)](https://nextjs.org)
[![Firebase](https://img.shields.io/badge/Firebase-Auth-FFCA28?style=flat-square&logo=firebase&logoColor=black)](https://firebase.google.com)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Database-4169E1?style=flat-square&logo=postgresql&logoColor=white)](https://postgresql.org)
[![Socket.io](https://img.shields.io/badge/Socket.io-Real--time-010101?style=flat-square&logo=socketdotio&logoColor=white)](https://socket.io)
[![License: MIT](https://img.shields.io/badge/License-MIT-00d4ff?style=flat-square)](LICENSE)
[![Free Tier](https://img.shields.io/badge/Deploy-100%25%20Free-22c55e?style=flat-square&logo=render&logoColor=white)](DEPLOYMENT.md)

</div>

---

## What is CONNECT?

CONNECT is a full-stack engineering collaboration portal that uses **AI** to match students and engineers with the right teammates and projects. Think of it as the perfect blend of GitHub, LinkedIn, and a smart recruiter — built for builders.

- 🔐 **Real Gmail login** via Firebase Authentication (Google Sign-In)
- 🤖 **AI teammate matching** — scored 0–100% based on skills compatibility
- 💬 **Live project chat** — Socket.io rooms with persistent history
- 🗺 **AI roadmap generation** — phases, tasks, and risk analysis via Gemini
- 📊 **Engineering dashboard** — metrics, sprints, system logs, and AI optimizer

---

## ✨ Features at a Glance

| | Feature | What it does |
|---|---------|-------------|
| 🔐 | **Firebase Auth** | Google Sign-In + email/password, free forever |
| 🤖 | **AI Matchmaking** | SQL-ranked candidates with Gemini AI explanations |
| 💬 | **Real-time Chat** | Socket.io project rooms, persistent message history |
| 🗺 | **Smart Roadmaps** | AI-generated project plans with phases and risk analysis |
| 🎯 | **Skill Profiles** | Rate skills 1–5 across 7 categories (Frontend, AI/ML, DevOps...) |
| 📩 | **Application Flow** | One-click apply → accept/reject → instant notifications |
| 🛠 | **Debug Advisor** | AI-powered root cause analysis for technical blockers |
| 📊 | **Live Dashboard** | Network throughput chart, sprint tracker, system logs |

---

## 🏗 Architecture

```
connect-platform/
│
├── backend/                      Express API + Socket.io
│   └── src/
│       ├── server.js             Entry point
│       ├── config/
│       │   ├── env.js            Fail-fast env validation
│       │   └── firebase.js       Firebase Admin SDK init  ← NEW
│       ├── db/
│       │   ├── pool.js           PostgreSQL connection pool
│       │   └── migrate.js        Schema migrations + seed data
│       ├── middleware/
│       │   └── auth.js           JWT cookie verification
│       ├── routes/
│       │   ├── auth.js           Register, login, logout, me, /firebase  ← NEW
│       │   ├── users.js          Profile CRUD
│       │   ├── skills.js         Skill catalog + assignment
│       │   ├── projects.js       Project CRUD + search
│       │   ├── applications.js   Apply, accept, reject + notifications
│       │   ├── ai.js             Matchmaking, roadmap, debug
│       │   └── chat.js           Message history REST
│       └── socket.js             Socket.io event handlers
│
└── frontend/                     Next.js 16 + React 19
    ├── app/
    │   ├── page.js               Landing page (particle canvas)
    │   ├── layout.js             Root layout + AuthProvider
    │   ├── globals.css           Design system (dark theme, 300+ tokens)
    │   ├── login/                Firebase login page
    │   ├── register/             Firebase registration page
    │   ├── dashboard/            Command center + charts
    │   ├── projects/             Browse, create, detail, chat
    │   ├── profile/              Profile + skill manager
    │   ├── ai-advisor/           Roadmap generator + debug helper
    │   └── notifications/        Notification center
    ├── components/
    │   ├── Navbar.js             Glass morphism nav + Google avatar  ← NEW
    │   ├── Sidebar.js            Collapsible sidebar
    │   └── GoogleSignInButton.js Official Google OAuth button  ← NEW
    └── lib/
        ├── firebase.js           Firebase app init  ← NEW
        ├── api.js                Axios client
        └── AuthContext.js        Firebase auth state + backend sync  ← NEW
```

### Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| **Backend** | Node.js + Express | Fast, unopinionated, great ecosystem |
| **Database** | PostgreSQL (raw `pg` — no ORM) | Full SQL control, parameterized queries |
| **Auth** | Firebase Auth + JWT HTTP-only cookies | Google OAuth + email/password, free, secure |
| **AI** | Google Gemini API (free tier) | Best free AI for structured generation |
| **Real-time** | Socket.io | Reliable WebSocket abstraction |
| **Frontend** | Next.js 16, React 19 | App Router, server components, fast builds |
| **Styling** | Vanilla CSS (dark design system) | Zero dependencies, full control |

---

## 🚀 Quick Start (Local Dev)

### Prerequisites
- **Node.js** ≥ 18
- **PostgreSQL** running locally
- **Firebase project** (free — see [DEPLOYMENT.md](DEPLOYMENT.md))

### 1 — Clone & Install

```bash
git clone https://github.com/gouravgupta29092006-rgb/Connect.git
cd connect-platform
```

### 2 — Configure the Backend

```bash
cd backend
cp .env.example .env
```

Edit `.env` and fill in:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/connect_db
JWT_SECRET=<run: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))">
FIREBASE_SERVICE_ACCOUNT=<paste minified service account JSON — see DEPLOYMENT.md>
GEMINI_API_KEY=<optional — https://aistudio.google.com/app/apikey>
```

Then:

```bash
npm install
npm run migrate       # Creates all tables + seeds 30+ skills
npm run dev           # Starts backend on http://localhost:5000
```

### 3 — Configure the Frontend

```bash
cd ../frontend
cp .env.example .env.local
```

Edit `.env.local` with your Firebase web config:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSy...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123:web:abc123
```

Then:

```bash
npm install
npm run dev           # Starts frontend on http://localhost:3000
```

Open **[http://localhost:3000](http://localhost:3000)** — you'll see the landing page with a live particle canvas. ✨

---

## 🔑 Environment Variables

### Backend (`backend/.env`)

| Variable | Required | Description |
|----------|:--------:|-------------|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `JWT_SECRET` | ✅ | Random 64-char hex string |
| `FIREBASE_SERVICE_ACCOUNT` | ✅ | Minified service account JSON |
| `PORT` | — | Server port (default: `5000`) |
| `NODE_ENV` | — | `development` or `production` |
| `FRONTEND_URL` | — | CORS origin (default: `http://localhost:3000`) |
| `GEMINI_API_KEY` | — | Free key from [AI Studio](https://aistudio.google.com/app/apikey) |
| `DATABASE_SSL` | — | `true` for cloud databases |

### Frontend (`frontend/.env.local`)

| Variable | Required | Where to get it |
|----------|:--------:|----------------|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | ✅ | Firebase Console → Project Settings → Web App |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | ✅ | Same |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | ✅ | Same |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | ✅ | Same |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | ✅ | Same |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | ✅ | Same |
| `NEXT_PUBLIC_API_URL` | — | Backend URL (production only) |

---

## 📡 API Reference

All endpoints are prefixed with `/api`. Protected routes require a valid JWT cookie.

<details>
<summary><strong>🔐 Auth Endpoints</strong></summary>

| Method | Endpoint | Auth | Description |
|--------|----------|:----:|-------------|
| `POST` | `/api/auth/firebase` | — | Verify Firebase ID token → sync user to DB |
| `POST` | `/api/auth/register` | — | Create account (email/password) |
| `POST` | `/api/auth/login` | — | Sign in (email/password) |
| `GET` | `/api/auth/me` | 🔒 | Get current user |
| `GET` | `/api/auth/logout` | — | Clear session cookie |

</details>

<details>
<summary><strong>👤 Profile & Skills</strong></summary>

| Method | Endpoint | Auth | Description |
|--------|----------|:----:|-------------|
| `GET` | `/api/users/profile` | 🔒 | Get own profile + skills |
| `PUT` | `/api/users/profile` | 🔒 | Update bio, institution, github_url |
| `GET` | `/api/skills` | 🔒 | List all skills (grouped by category) |
| `POST` | `/api/skills/assign` | 🔒 | Assign skills with proficiency levels |
| `DELETE` | `/api/skills/:id` | 🔒 | Remove a skill |

</details>

<details>
<summary><strong>📋 Projects</strong></summary>

| Method | Endpoint | Auth | Description |
|--------|----------|:----:|-------------|
| `GET` | `/api/projects` | 🔒 | List projects (`?search=`, `?status=`) |
| `POST` | `/api/projects` | 🔒 | Create project with required skills |
| `GET` | `/api/projects/:id` | 🔒 | Project detail (info + applicants) |
| `PUT` | `/api/projects/:id` | 🔒 | Update project (owner only) |
| `DELETE` | `/api/projects/:id` | 🔒 | Delete project (owner only) |

</details>

<details>
<summary><strong>📩 Applications & Notifications</strong></summary>

| Method | Endpoint | Auth | Description |
|--------|----------|:----:|-------------|
| `POST` | `/api/projects/:id/apply` | 🔒 | Apply to a project |
| `GET` | `/api/projects/:id/applications` | 🔒 | List applicants (owner only) |
| `PATCH` | `/api/applications/:id` | 🔒 | Accept or reject (owner only) |
| `GET` | `/api/applications/mine` | 🔒 | My submitted applications |
| `GET` | `/api/notifications` | 🔒 | Get all notifications |
| `PATCH` | `/api/notifications/:id/read` | 🔒 | Mark notification as read |

</details>

<details>
<summary><strong>🤖 AI Endpoints</strong></summary>

| Method | Endpoint | Auth | Description |
|--------|----------|:----:|-------------|
| `GET` | `/api/ai/match/:projectId` | 🔒 | AI-scored candidate matching (0–100%) |
| `POST` | `/api/ai/roadmap` | 🔒 | Generate project roadmap (Gemini) |
| `POST` | `/api/ai/debug` | 🔒 | AI debugging assistant |

</details>

<details>
<summary><strong>💬 Real-time Chat</strong></summary>

**REST:**

| Method | Endpoint | Auth | Description |
|--------|----------|:----:|-------------|
| `GET` | `/api/chat/:projectId/messages` | 🔒 | Get message history |

**Socket.io Events:**

| Event | Direction | Description |
|-------|-----------|-------------|
| `join_room` | Client → Server | Join a project chat room |
| `send_message` | Client → Server | Send a message |
| `new_message` | Server → Client | Receive a broadcast message |
| `user_joined` | Server → Client | Presence: user joined |
| `user_left` | Server → Client | Presence: user left |

</details>

---

## 🎨 Pages

| Route | Page | Protected |
|-------|------|:---------:|
| `/` | Landing page (particle canvas, features, stats) | — |
| `/login` | Firebase login (Google + email/password) | — |
| `/register` | Firebase registration (Google + email/password) | — |
| `/dashboard` | Command center (charts, sprints, AI optimizer, logs) | 🔒 |
| `/projects` | Browse & search projects | 🔒 |
| `/projects/new` | Create a new project | 🔒 |
| `/projects/:id` | Project detail — 3 tabs: Overview, Applicants, AI Match | 🔒 |
| `/projects/:id/chat` | Real-time project chat | 🔒 |
| `/profile` | Edit profile & manage skill ratings | 🔒 |
| `/ai-advisor` | Roadmap generator + AI debug assistant | 🔒 |
| `/notifications` | Notification center | 🔒 |

---

## 🧪 Testing

The backend ships with **115 integration assertions** covering every API route. Tests use a centralized `test-config.js` — no real secrets in test files.

```bash
cd backend

# Run individual suites
node test-auth.js          # Auth flows           (17 assertions)
node test-step3.js         # Profile & Skills     (20 assertions)
node test-step4.js         # Projects             (22 assertions)
node test-steps5-8.js      # AI features          (18 assertions)
node test-step6.js         # Applications & Notifs (23 assertions)
node test-step7.js         # Real-time Chat       (15 assertions)
```

CI runs automatically on every push via GitHub Actions (`.github/workflows/ci.yml`).

---

## 🌐 Deploy for Free

The entire platform runs on **free tiers** — no credit card required.

| Service | Free Tier | Role |
|---------|-----------|------|
| [Firebase](https://console.firebase.google.com) | Unlimited auth, 10K verifications/mo | Authentication |
| [Render](https://render.com) | 750 hrs/mo, auto-detected `render.yaml` | Backend + Frontend hosting |
| [Neon](https://neon.tech) | 512 MB PostgreSQL, always-on | Database |
| [Google AI Studio](https://aistudio.google.com) | 15 req/min free | Gemini AI features |

```bash
# The render.yaml in this repo auto-configures both services.
# Just connect your GitHub repo in Render and set the env vars.
```

📖 **Full deployment walkthrough:** [DEPLOYMENT.md](DEPLOYMENT.md)

---

## 🔒 Security

- Firebase ID tokens verified server-side using Firebase Admin SDK
- JWT stored in **HTTP-only cookies** (not accessible to JavaScript)
- Passwords hashed with **bcrypt** (12 salt rounds)
- All SQL uses **parameterized queries** — zero raw string interpolation
- Pre-commit hook scans staged files for accidentally leaked secrets
- `password_hash` never returned in API responses

---

## 📄 License

MIT © 2025 CONNECT — Built with ❤️ for engineers who build.

<div align="center">

---

*Star ⭐ this repo if CONNECT helped you find your team.*

</div>
