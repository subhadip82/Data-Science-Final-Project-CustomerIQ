# CustomerIQ Production Deployment Guide 🚀
### Full-Stack Architecture: Next.js 16 on Vercel + FastAPI & PostgreSQL on Render

This guide walks you step-by-step through deploying the complete **CustomerIQ** application to production using **Vercel** (for the Next.js frontend) and **Render** (for the FastAPI backend and managed PostgreSQL database), secured by **Clerk** authentication.

---

## 📑 Architecture Overview

```mermaid
graph LR
    User([End User Browser])
    Vercel[Vercel: Next.js 16 App Router]
    RenderAPI[Render: FastAPI Backend Python 3.12]
    RenderDB[(Render: PostgreSQL 16 Managed DB)]
    Clerk[Clerk Auth & JWKS]

    User -->|HTTPS| Vercel
    Vercel -->|Bearer JWT + API calls| RenderAPI
    User -->|Clerk Sign-in/Sign-up| Clerk
    RenderAPI -->|JWKS Key Verification| Clerk
    RenderAPI -->|Async SQLAlchemy / asyncpg| RenderDB
```

---

## 🛠 Prerequisites

Before starting, ensure you have free accounts on:
1. **[GitHub](https://github.com)**: Your CustomerIQ code pushed to a GitHub repository.
2. **[Render](https://render.com)**: For hosting the Python backend and PostgreSQL database.
3. **[Vercel](https://vercel.com)**: For hosting the Next.js frontend.
4. **[Clerk](https://clerk.com)**: For user authentication and workspace session management.

---

## 🚀 Phase 1: Deploy Backend & Database on Render

You can deploy using either the **Automated Blueprint** (fastest) or **Manual Dashboard Setup**.

### Option A: Automated Blueprint via `render.yaml` (Recommended)

The repository includes a pre-configured `render.yaml` blueprint.

1. Push all latest changes to your GitHub repository:
   ```bash
   git add .
   git commit -m "Configure production deployment for Vercel and Render"
   git push origin main
   ```
2. Log in to [dashboard.render.com](https://dashboard.render.com).
3. Click **New +** in the top-right corner and select **Blueprint**.
4. Connect your GitHub repository.
5. Render will detect `render.yaml` and display the blueprint plan:
   - **Service**: `customeriq-backend` (Web Service, Python)
   - **Database**: `customeriq-db` (PostgreSQL)
6. Fill in the prompted environment variables:
   - `CLERK_ISSUER`: `https://<your-clerk-frontend-api>.clerk.accounts.dev` (from Clerk Dashboard)
   - `CLERK_JWKS_URL`: `https://<your-clerk-frontend-api>.clerk.accounts.dev/.well-known/jwks.json`
   - `CLERK_SECRET_KEY`: `sk_test_...` or `sk_live_...`
   - `CLERK_PUBLISHABLE_KEY`: `pk_test_...` or `pk_live_...`
   - `ALLOWED_ORIGINS`: `https://*.vercel.app,http://localhost:3000` (you can add your exact Vercel domain later)
7. Click **Apply**. Render will automatically provision the PostgreSQL database and build the FastAPI backend!

---

### Option B: Manual Setup via Render Dashboard

If you prefer configuring each service manually:

#### Step 1: Create Managed PostgreSQL Database
1. In Render Dashboard, click **New +** → **PostgreSQL**.
2. Name: `customeriq-db`
3. Database: `customeriq`
4. User: `customeriq_user`
5. Region: `Oregon (US West)` (or your preferred region)
6. Plan: **Free**
7. Click **Create Database**.
8. Once provisioned, copy the **Internal Database URL** (e.g. `postgres://customeriq_user:...@dpg-...-a:5432/customeriq`).

#### Step 2: Create FastAPI Web Service
1. Click **New +** → **Web Service**.
2. Connect your GitHub repository.
3. Configure the settings:
   - **Name**: `customeriq-backend`
   - **Region**: Same region as your database (e.g., `Oregon (US West)`)
   - **Branch**: `main`
   - **Root Directory**: Leave blank (uses repo root)
   - **Runtime**: `Python`
   - **Build Command**: `pip install -r backend/requirements.txt`
   - **Start Command**: `cd backend && uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - **Plan**: **Free**
4. Expand **Advanced** and set:
   - **Health Check Path**: `/health`
5. Under **Environment Variables**, add:
   | Key | Value / Source |
   |---|---|
   | `DATABASE_URL` | Paste the **Internal Database URL** from Step 1 |
   | `PYTHON_VERSION` | `3.12.7` |
   | `APP_NAME` | `CustomerIQ API` |
   | `ENVIRONMENT` | `production` |
   | `CLERK_ISSUER` | `https://your-domain.clerk.accounts.dev` |
   | `CLERK_JWKS_URL` | `https://your-domain.clerk.accounts.dev/.well-known/jwks.json` |
   | `CLERK_SECRET_KEY` | Your Clerk Secret Key (`sk_...`) |
   | `CLERK_PUBLISHABLE_KEY` | Your Clerk Publishable Key (`pk_...`) |
   | `ALLOWED_ORIGINS` | `https://*.vercel.app,http://localhost:3000` |
6. Click **Create Web Service**.
7. Once deployment finishes, copy your Render Web Service URL (e.g. `https://customeriq-backend.onrender.com`).

#### Step 3: Test Backend Health
Open `https://<your-render-backend-url>.onrender.com/health` in your browser.
You should see:
```json
{"status": "ok"}
```
You can also view interactive Swagger API docs at `https://<your-render-backend-url>.onrender.com/api/docs`.

---

## 🔐 Phase 2: Configure Clerk Authentication

1. Log in to [dashboard.clerk.com](https://dashboard.clerk.com) and select your application.
2. Under **Configure** → **API Keys**:
   - Note down `Publishable key` (`pk_...`) and `Secret key` (`sk_...`).
3. Under **Configure** → **Paths**:
   - Sign-in path: `/login`
   - Sign-up path: `/sign-up`
   - Home URL / After sign-in: `/app`
   - After sign-up: `/app`
4. Under **Configure** → **Domains & Allowlist** / **Allowed Origins**:
   - Add your Vercel domain once generated (e.g., `https://customeriq.vercel.app` and `https://*.vercel.app`).
   - Add `http://localhost:3000` for local development.

---

## ⚡ Phase 3: Deploy Frontend on Vercel

1. Log in to [vercel.com](https://vercel.com) and click **Add New...** → **Project**.
2. Connect your GitHub account and select your **CustomerIQ** repository.
3. In the project configuration screen:
   - **Framework Preset**: `Next.js` (automatically detected).
   - **Root Directory**: Click **Edit** and choose `frontend`. *(Crucial: CustomerIQ frontend code resides in `/frontend`)*.
4. Expand **Environment Variables** and add the following:

   | Key | Value | Notes |
   |---|---|---|
   | `NEXT_PUBLIC_API_URL` | `https://<your-render-backend>.onrender.com` | Your Render Backend URL from Phase 1 (no trailing slash) |
   | `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | `pk_test_...` or `pk_live_...` | From Clerk Dashboard |
   | `CLERK_SECRET_KEY` | `sk_test_...` or `sk_live_...` | From Clerk Dashboard |
   | `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | `/login` | Default Clerk login route |
   | `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | `/sign-up` | Default Clerk signup route |
   | `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL` | `/app` | Redirect to main dashboard |
   | `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL` | `/app` | Redirect to main dashboard |

5. Click **Deploy**.
6. Vercel will build and deploy the Next.js app in ~60 seconds. Once complete, you will receive your live domain (e.g. `https://customeriq-xxx.vercel.app`).

---

## 🔄 Phase 4: Final Linkage & CORS Update

Now that you have your live Vercel domain:
1. Return to **Render Dashboard** → `customeriq-backend` → **Environment**.
2. Update `ALLOWED_ORIGINS` to include your exact Vercel domain:
   ```env
   ALLOWED_ORIGINS=https://customeriq-xxx.vercel.app,https://*.vercel.app,http://localhost:3000
   ```
3. Click **Save Changes**. Render will perform a zero-downtime redeploy.
4. In **Clerk Dashboard**, ensure your Vercel production domain is added to **Allowed Origins** and **Redirect URLs**.

---

## ✅ Phase 5: Production Verification Checklist

Run through this quick verification checklist on your live Vercel URL:

- [ ] **Landing Page**: Visit `https://<your-vercel-domain>.vercel.app/` — verify animations, pricing, solutions pages render cleanly.
- [ ] **Authentication**: Click **Get Started** or **Sign In** — verify Clerk modal opens and successfully logs you in.
- [ ] **Workspace Redirection**: Confirm you are redirected to `/app`.
- [ ] **Data Ingestion**: Navigate to `/app/upload` and upload `frontend/public/data/sample_retail_data.csv`.
- [ ] **Analytics Engine**: Check `/app/analytics` — verify revenue metrics, delta badges, and charts render.
- [ ] **RFM & Segments**: Visit `/app/rfm` and `/app/segments` — confirm customers are scored (1–5) and segmented into VIP, Loyal, Potential, and At-Risk cohorts.
- [ ] **Reports & Sharing**: Generate a PDF report in `/app/reports` and test link generation in `/app/reports`.

---

## 💡 Production Tips & Troubleshooting

### 1. Handling Render Free Tier Cold Starts
Render's free tier web services spin down after 15 minutes of inactivity. When a new request arrives, it takes ~30–45 seconds to spin back up.
- **Solution**: You can use a free uptime monitor (e.g. [UptimeRobot](https://uptimerobot.com) or [cron-job.org](https://cron-job.org)) to send an HTTP GET request to `https://<your-backend>.onrender.com/health` every 10 minutes. This keeps your free tier instance warm 24/7 at no cost.

### 2. Large File Uploads (50MB CSVs)
- CustomerIQ's frontend API client is specifically engineered to send upload requests directly to the FastAPI backend (`NEXT_PUBLIC_API_URL`), bypassing Vercel's 4.5MB serverless function payload limit.
- FastAPI streams and parses the uploaded CSV with progress tracking.

### 3. Database Schema Migration
- On first startup, FastAPI's `lifespan` automatically executes `Base.metadata.create_all` against the PostgreSQL database. All tables, foreign keys, and indexes are created automatically without manual SQL execution.

### 4. Custom Domain (Optional)
- To attach your own domain (e.g. `customeriq.com`):
  - In Vercel: Go to **Settings** → **Domains** → Add `customeriq.com` and follow DNS CNAME instructions.
  - In Render: Go to `customeriq-backend` → **Settings** → **Custom Domains** → Add `api.customeriq.com`.
  - Update `NEXT_PUBLIC_API_URL=https://api.customeriq.com` in Vercel.
