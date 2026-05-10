<![CDATA[# CONNECT

> **AI-powered teammate matching platform for engineering students.**

CONNECT helps engineering students find the perfect teammates for their projects using AI-powered skill matching, real-time chat, and smart project management.

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🤖 **AI Matchmaking** | SQL-based skill scoring (0–100%) + optional Gemini AI explanations |
| 💬 **Real-time Chat** | Socket.io-powered project rooms with persistent message history |
| 📋 **Smart Roadmaps** | AI-generated project roadmaps with phases, tasks, and risk analysis |
| 🎯 **Skill Profiles** | Rate your skills 1–5 across categories; projects specify what they need |
| 📩 **Application Flow** | One-click apply, owner accept/reject, real-time notifications |
| 🛠 **Debug Advisor** | AI-powered debugging help with root cause analysis |
| 🔐 **Secure Auth** | JWT in HTTP-only cookies, bcrypt password hashing |

---

## 🏗 Architecture

Single **Express monolith** backend with a **Next.js** frontend.

```
connect-platform/
├── backend/                 # Express API server
│   ├── src/
│   │   ├── server.js        # Entry point + Socket.io setup
│   │   ├── db/
│   │   │   ├── pool.js      # PostgreSQL connection pool
│   │   │   └── migrate.js   # Schema + seed data
│   │   ├── middleware/
│   │   │   └── auth.js      # JWT cookie verification
│   │   ├── routes/
│   │   │   ├── auth.js      # Register, login, logout, me
│   │   │   ├── users.js     # Profile CRUD
│   │   │   ├── skills.js    # Skill catalog + assignment
│   │   │   ├── projects.js  # Project CRUD + search
│   │   │   ├── applications.js  # Apply, accept, reject + notifications
│   │   │   ├── ai.js        # Matchmaking, roadmap, debug
│   │   │   └── chat.js      # Message history REST endpoint
│   │   └── ai/
│   │       └── gemini.js    # Google Gemini API wrapper
│   ├── test-*.js            # Integration test suite (115 assertions)
│   ├── test-config.js       # Centralized test fixtures
│   └── .env.example         # Environment template
│
└── frontend/                # Next.js client
    ├── app/
    │   ├── page.js           # Landing page
    │   ├── layout.js         # Root layout + AuthProvider
    │   ├── globals.css       # Design system (dark theme)
    │   ├── login/            # Login page
    │   ├── register/         # Registration page
    │   ├── dashboard/        # User dashboard
    │   ├── projects/         # Project list, create, detail
    │   │   ├── [id]/         # Project detail + chat
    │   │   └── new/          # Create project form
    │   ├── profile/          # Profile + skill management
    │   ├── ai-advisor/       # Roadmap generator + debug helper
    │   └── notifications/    # Notification center
    ├── components/
    │   └── Navbar.js         # Glass morphism navigation bar
    └── lib/
        ├── api.js            # Axios API client
        └── AuthContext.js    # React auth context provider
```

### Tech Stack

| Layer | Technology |
|-------|-----------|
| **Backend** | Node.js, Express |
| **Database** | PostgreSQL (raw `pg` parameterized queries — no ORM) |
| **Auth** | JWT in HTTP-only cookies, bcrypt |
| **AI** | Google Gemini API (free tier) |
| **Real-time** | Socket.io |
| **Frontend** | Next.js 16, React 19, Tailwind CSS 4 |
| **HTTP Client** | Axios |

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** ≥ 18
- **PostgreSQL** running locally with a database created:
  ```sql
  CREATE DATABASE connect_db;
  ```

### 1. Backend

```bash
cd backend
cp .env.example .env          # ← Edit with your real credentials
npm install
npm run migrate               # Creates tables + seeds 30+ skills
npm start                     # Starts on http://localhost:5000
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev                   # Starts on http://localhost:3000
```

Open **http://localhost:3000** — you should see the landing page.

### 3. Run Tests

With the backend running on port 5000:

```bash
cd backend
node test-auth.js             # Auth (17 assertions)
node test-step3.js            # Profile & Skills (20 assertions)
node test-step4.js            # Projects (22 assertions)
node test-steps5-8.js         # AI Matchmaking & Advisor (18 assertions)
node test-step6.js            # Applications & Notifications (23 assertions)
node test-step7.js            # Real-time Chat (15 assertions)
```

**Total: 115 assertions, all passing.**

---

## 🔑 Environment Variables

### Backend (`backend/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `JWT_SECRET` | ✅ | Random string (min 32 chars) for signing tokens |
| `PORT` | ❌ | Server port (default: `5000`) |
| `NODE_ENV` | ❌ | `development` or `production` |
| `FRONTEND_URL` | ❌ | Frontend origin for CORS (default: `http://localhost:3000`) |
| `GEMINI_API_KEY` | ❌ | Google Gemini API key for AI features |
| `DATABASE_SSL` | ❌ | Set to `true` for cloud DBs (Render, Railway) |

> **⚠️ Security:** Never commit `.env` files. The `.gitignore` excludes them automatically.
>
> Generate a JWT secret: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`
>
> Get a free Gemini API key: https://aistudio.google.com/app/apikey

---

## 📡 API Reference

All endpoints are prefixed with `/api`. Auth endpoints set/read HTTP-only JWT cookies.

### Auth

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/register` | Create account |
| `POST` | `/api/auth/login` | Sign in |
| `GET` | `/api/auth/me` | Get current user |
| `GET` | `/api/auth/logout` | Sign out |

### Profile & Skills

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/users/profile` | Get own profile + skills |
| `PUT` | `/api/users/profile` | Update bio, institution, github_url |
| `GET` | `/api/skills` | List all skills (grouped by category) |
| `POST` | `/api/skills/assign` | Assign skills with levels |
| `DELETE` | `/api/skills/:skillId` | Remove a skill |

### Projects

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/projects` | List projects (supports `?search=`, `?status=`) |
| `POST` | `/api/projects` | Create project with skills |
| `GET` | `/api/projects/:id` | Get project detail |
| `PUT` | `/api/projects/:id` | Update project (owner only) |
| `DELETE` | `/api/projects/:id` | Delete project (owner only) |

### Applications & Notifications

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/projects/:id/apply` | Apply to a project |
| `GET` | `/api/projects/:id/applications` | List applicants (owner only) |
| `PATCH` | `/api/applications/:id` | Accept/reject (owner only) |
| `GET` | `/api/applications/mine` | My applications |
| `GET` | `/api/notifications` | Get notifications |
| `PATCH` | `/api/notifications/:id/read` | Mark as read |

### AI

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/ai/match/:projectId` | AI-powered candidate matching |
| `POST` | `/api/ai/roadmap` | Generate project roadmap |
| `POST` | `/api/ai/debug` | AI debugging assistant |

### Chat

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/chat/:projectId/messages` | Get message history |

**Socket.io Events:**
- `join_room` → Join a project chat room
- `send_message` → Send a message
- `new_message` → Receive a message (broadcast)
- `user_joined` / `user_left` → Presence events

---

## 🎨 Frontend Pages

| Route | Page | Auth |
|-------|------|------|
| `/` | Landing page | Public |
| `/login` | Login form | Public |
| `/register` | Registration form | Public |
| `/dashboard` | User dashboard with quick actions | 🔒 |
| `/projects` | Browse & search projects | 🔒 |
| `/projects/new` | Create a new project | 🔒 |
| `/projects/:id` | Project detail (3 tabs: Details, Applications, AI Match) | 🔒 |
| `/projects/:id/chat` | Real-time project chat | 🔒 |
| `/profile` | Edit profile & manage skills | 🔒 |
| `/ai-advisor` | AI Roadmap Generator + Debug Helper | 🔒 |
| `/notifications` | Notification center | 🔒 |

---

## 🧪 Testing

The test suite uses a centralized `test-config.js` with dev-only dummy credentials — no real secrets in test files.

```bash
# Run all tests sequentially
cd backend
node test-auth.js && node test-step3.js && node test-step4.js && node test-steps5-8.js && node test-step6.js && node test-step7.js
```

---

## 📦 Production

### Backend

```bash
cd backend
NODE_ENV=production npm start
```

### Frontend

```bash
cd frontend
npm run build                 # Creates optimized production build
npm start                     # Serves on port 3000
```

> **Note:** In production, update `FRONTEND_URL` in the backend `.env` and configure the frontend to point to your deployed backend URL.

---

## 📄 License

MIT
]]>
