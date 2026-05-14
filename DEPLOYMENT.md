# CONNECT Platform — Production Cloud Deployment Handbook

This guide details the operational steps, secure secret boundaries, and configuration templates required to successfully promote the **CONNECT** platform from local development environments to live cloud hosting providers (e.g., Render, Railway, AWS App Runner).

---

## 🌩️ 1. Infrastructure-as-Code (IaC) with Render

The platform includes a declarative service blueprint (`render.yaml`) located at the project root. This configuration defines automated builds, static asset routes, and internal network discovery channels out-of-the-box.

### Render Topology Overview
- **Backend Service (`connect-api`):** Mounts the Node.js Express server on internal Port `5000`. Executes `npm run migrate` automatically during deployment build phases to keep production table definitions and base skills mappings fully synchronized.
- **Frontend Web Service (`connect-web`):** Compiles the Next.js static and dynamic routing bundles natively. Uses dynamic build variable ingestion (`RENDER_EXTERNAL_URL`) to seamlessly link web API proxies back to the core API cluster.

---

## 🔐 2. Production Environment Secret Configuration

To adhere to our pre-flight runtime hardening constraints (`backend/src/config/env.js`), the platform enforces fail-fast boot validation. **The server will immediately abort initialization if critical secrets are omitted.**

Configure the following parameters inside your hosting dashboard's Secret Management UI:

```env
# ==============================================================================
# REQUIRED PRODUCTION SECRETS (Must be injected via Cloud Control Panel)
# ==============================================================================

# Primary PostgreSQL connection mapping with embedded authentication parameters.
# IMPORTANT: In production cloud networks, append ?sslmode=require to enforce TLS encryption.
DATABASE_URL=postgresql://<user>:<password>@<host>:<port>/<dbname>?sslmode=require

# Cryptographic signing entropy for stateless JSON Web Tokens.
# SECURITY REQUIREMENT: Must be a completely randomized hexadecimal string >= 32 bytes.
JWT_SECRET=your_super_secret_production_randomized_entropy_key_placeholder

# Optional: Google Gemini AI Key enabling AI Advisor roadmap and debug endpoints.
GEMINI_API_KEY=AIzaSy_your_secure_api_key_placeholder
```

> [!CAUTION]
> Never commit `.env` or production credentials directly into version control repositories. Our pre-commit scanner (`scripts/check-secrets.js`) actively audits git staging indexes to automatically intercept accidental plaintext credential leaks.

---

## 🛡️ 3. Database Connection SSL/TLS Integration

When connecting to managed cloud databases (e.g., Supabase, Neon, AWS RDS), secure transport security is mandatory. Our core driver logic supports passing encrypted connection contexts dynamically.

If your provider requires specific SSL context profiles, set the optional runtime flag:

```env
# Enables robust database driver connection verification
DATABASE_SSL=true
```

### Driver Boot Sequence Integration
When `DATABASE_SSL=true` is detected, the PostgreSQL client pool configures connection streams with custom SSL reject-unauthorized options to block man-in-the-middle network snooping.

---

## 🚀 4. Automated CI/CD Lifecycle Verification

Every single push or Pull Request targeting the primary branch automatically invokes our GitHub Actions test matrix (`.github/workflows/ci.yml`).

### Verification Stages:
1. **Ephemeral Service Instantiation:** Provisions an isolated `postgres:15-alpine` Docker instance locally within the ephemeral runner workflow.
2. **Sequential Schema Seeding:** Runs migrations to construct raw foreign key constraints and verify database parameterization syntax.
3. **Full Harness Execution:** Runs all **115 explicit API assertions** covering stateful user flows, Socket.io dual authentication handshakes, and route data structure validations.
4. **Client Static Extraction:** Verifies Next.js client compilation across all routing blocks to ensure dynamic layouts do not trigger build compilation faults.

---

## 📋 5. Post-Launch Verification Checklist

Once active deployment routes turn green, perform these manual post-launch validation steps:
- [ ] **Verify Authentication Handshakes:** Open the production domain, register a staging user, and inspect network response cookies to confirm `SameSite=Lax` or `SameSite=None; Secure` attributes are properly injected over HTTPS interfaces.
- [ ] **Test Real-Time Chat Channels:** Open two distinct client sessions inside separate browser profiles to confirm cross-origin Socket.io transport handshakes route updates smoothly without triggering CORS protocol rejections.
- [ ] **Verify AI Services:** Trigger an AI Roadmap generation action to confirm network timeout configurations do not cut off external HTTP generation calls prematurely.
