# CONNECT

> AI-powered teammate matching platform for engineering students.

## Architecture

Single Express monolith with Next.js 14 frontend.

| Layer | Tech |
|-------|------|
| Backend | Node.js, Express |
| Database | PostgreSQL (raw `pg` parameterized queries) |
| Auth | JWT in HTTP-only cookies, bcrypt |
| AI | Google Gemini API (free tier) |
| Real-time | Socket.io |
| Frontend | Next.js 14, Tailwind CSS |

## Quick Start

### Backend

```bash
cd backend
cp .env.example .env        # update DATABASE_URL + GEMINI_API_KEY
npm install
npm run migrate              # creates all tables + seeds skills
npm run dev                  # starts on http://localhost:5000
```

### Frontend

```bash
cd frontend
npm install
npm run dev                  # starts on http://localhost:3000
```

### Test Suite

With the backend running:

```bash
cd backend
node test-auth.js            # Steps 1 & 2
node test-step3.js           # Step 3
node test-step4.js           # Step 4
node test-steps5-8.js        # Steps 5 & 8
node test-step6.js           # Step 6
node test-step7.js           # Step 7
```

## Build Sequence

- [x] Step 1: Foundation & Database
- [x] Step 2: Auth System
- [x] Step 3: Profile & Skills
- [x] Step 4: Project Management
- [x] Step 5: AI Matchmaking Engine
- [x] Step 6: Application Flow
- [x] Step 7: Real-time Chat (Socket.io)
- [x] Step 8: AI Advisor
- [ ] Step 9: Frontend (Next.js)
