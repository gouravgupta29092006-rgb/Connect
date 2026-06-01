# CONNECT Platform — Deployment Guide (100% Free Tier)

Everything in this guide uses **free tiers only** — no credit card required for the core stack.

| Service | Free Tier Limits | Used For |
|---------|-----------------|----------|
| **Firebase Auth** | Unlimited users, 10K verifications/month | Google Sign-In + email/password auth |
| **Render** | 750 hrs/month web service, spins down after 15min idle | Backend (Express) + Frontend (Next.js) |
| **Neon / Supabase** | 512MB–500MB PostgreSQL, always-on | Database (PostgreSQL) |
| **Google Gemini API** | 15 requests/min free | AI Advisor features |

---

## Step 1 — Set Up Firebase (Authentication)

> Firebase Authentication is completely free on the **Spark plan**. No billing required.

### 1a. Create a Firebase Project
1. Go to [console.firebase.google.com](https://console.firebase.google.com)
2. Click **"Add project"** → enter a name (e.g. `connect-platform`) → Continue
3. Disable Google Analytics (optional, keeps it simple) → **Create project**

### 1b. Enable Sign-In Methods
1. In the Firebase Console sidebar → **Authentication** → **Sign-in method** tab
2. Enable **Google** → set your support email → Save
3. Enable **Email/Password** → toggle on → Save

### 1c. Get the Web App Config (for Frontend)
1. Firebase Console → gear icon → **Project Settings** → **General** tab
2. Scroll to **"Your apps"** → click **"Add app"** → choose **Web** (`</>`)
3. Register the app (nickname: `connect-web`) → Copy the `firebaseConfig` object:

```js
// You need these values:
apiKey: "AIzaSy..."
authDomain: "your-project.firebaseapp.com"
projectId: "your-project"
storageBucket: "your-project.appspot.com"
messagingSenderId: "123456789"
appId: "1:123456789:web:abc123"
```

### 1d. Add Your Deployed Domain to Authorized Domains
1. Firebase Console → **Authentication** → **Settings** → **Authorized domains**
2. Add your Render frontend URL (e.g. `connect-frontend.onrender.com`) after deploying

### 1e. Get the Service Account JSON (for Backend)
1. Firebase Console → gear icon → **Project Settings** → **Service Accounts** tab
2. Click **"Generate new private key"** → confirm → download the JSON file
3. **Minify it to one line** (run this in your terminal):
   ```bash
   node -e "console.log(JSON.stringify(require('./serviceAccountKey.json')))"
   ```
4. Copy the output — this is your `FIREBASE_SERVICE_ACCOUNT` value
5. **Delete the JSON file** and add it to `.gitignore` — never commit it

---

## Step 2 — Set Up a Free PostgreSQL Database

### Option A: Neon (Recommended — always-on free tier)
1. Go to [neon.tech](https://neon.tech) → Sign up free
2. Create a project → copy the **Connection string**
3. It looks like: `postgresql://user:pass@ep-xxx.us-east-2.aws.neon.tech/dbname?sslmode=require`

### Option B: Supabase
1. Go to [supabase.com](https://supabase.com) → create a project (free)
2. Project Settings → Database → copy the **URI** connection string
3. Add `?sslmode=require` to the end

> The database schema and seed data are created automatically on first deploy via `npm run migrate`.

---

## Step 3 — Deploy to Render (Free)

### 3a. Fork / Push your repo to GitHub
Make sure all your code is pushed to GitHub.

### 3b. Create a Render Account
1. Go to [render.com](https://render.com) → **Sign up free** (use GitHub login)
2. Click **"New"** → **"Blueprint"** → connect your GitHub repo
3. Render detects the `render.yaml` file automatically and creates both services

### 3c. Set Environment Variables

After the Blueprint is created, go to **each service → Environment** and set:

#### `connect-backend` environment variables:
| Key | Value | Where to get it |
|-----|-------|-----------------|
| `DATABASE_URL` | `postgresql://...?sslmode=require` | Neon or Supabase dashboard |
| `JWT_SECRET` | 64-char random hex | `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"` |
| `FIREBASE_SERVICE_ACCOUNT` | Minified JSON string | Step 1e above |
| `GEMINI_API_KEY` | `AIzaSy...` | [aistudio.google.com](https://aistudio.google.com/app/apikey) (free) |

#### `connect-frontend` environment variables:
| Key | Value | Where to get it |
|-----|-------|-----------------|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | `AIzaSy...` | Firebase Console → Project Settings → Web App |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | `your-project.firebaseapp.com` | Same |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | `your-project` | Same |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | `your-project.appspot.com` | Same |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | `123456789` | Same |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | `1:123:web:abc` | Same |

### 3d. Deploy
Click **"Apply"** in the Render Blueprint. Both services will build and deploy.

> ⚠️ **Free tier note**: Render free web services spin down after 15 minutes of inactivity.
> The first request after idle takes ~30 seconds to wake up. This is normal on the free tier.

---

## Step 4 — Add Your Live URL to Firebase

Once deployed, go back to Firebase Console:
1. **Authentication** → **Settings** → **Authorized domains**
2. Click **"Add domain"** → paste your Render frontend URL
   - e.g. `connect-frontend.onrender.com`

This is required for Google Sign-In to work on the live site.

---

## Step 5 — Post-Deployment Verification Checklist

- [ ] **Backend health check**: `GET https://connect-backend.onrender.com/api/test` → returns `{ ok: true }`
- [ ] **Database migration**: Check backend logs in Render for `✅ All migrations complete.`
- [ ] **Google Sign-In**: Open the live site → click "Continue with Google" → completes successfully
- [ ] **Email registration**: Register with email/password → lands on dashboard
- [ ] **Returning user**: Close browser, reopen → still logged in (Firebase persists session)
- [ ] **Navbar avatar**: Google users see their profile photo with a blue border
- [ ] **Logout**: Sign out → redirected to `/login`, no lingering session

---

## Local Development Setup

```bash
# 1. Clone and install
git clone https://github.com/your-username/connect-platform.git
cd connect-platform
npm install

# 2. Set up backend env
cd backend
cp .env.example .env
# Edit .env with your DATABASE_URL, JWT_SECRET, FIREBASE_SERVICE_ACCOUNT, GEMINI_API_KEY

# 3. Run database migrations
npm run migrate

# 4. Set up frontend env
cd ../frontend
cp .env.example .env.local
# Edit .env.local with your NEXT_PUBLIC_FIREBASE_* values

# 5. Start both servers (from project root)
cd ..
npm run dev   # runs both backend and frontend concurrently
```

---

## Security Notes

> [!CAUTION]
> Never commit `.env`, `.env.local`, or the Firebase service account JSON to git.
> Our pre-commit scanner (`scripts/check-secrets.js`) actively checks for leaked credentials.

> [!NOTE]
> The `FIREBASE_SERVICE_ACCOUNT` value is a minified JSON string stored as an env var.
> It never touches the filesystem in production — it is read directly from `process.env`.

> [!TIP]
> On Render, use the **Secret Files** feature (under Environment) to store the service account
> JSON as a file if you prefer, then set `GOOGLE_APPLICATION_CREDENTIALS=/etc/secrets/sa.json`.
