# CustomerIQ 🚀
### Enterprise E-commerce Customer Intelligence & Predictive Analytics Platform

> **A production-grade SaaS platform that transforms raw e-commerce transaction data into automated RFM scores, K-Means customer cohorts, predictive business insights, and segment-specific action playbooks.**

---

## 🌟 Key Features

- **RFM Analysis Engine**: Mathematical quintile scoring (1–5) on Recency, Frequency, and Monetary dimensions for each customer.
- **K-Means ML Segmentation**: Unsupervised machine learning clustering with optimal $k$ discovery (Elbow method & Silhouette analysis) and 2D PCA projection.
- **Automated Insights Generator**: Rule-based business intelligence alerting you to VIP revenue concentration, at-risk churn, repeat purchase velocity, and geographic skew.
- **Actionable Segment Playbooks**: Pre-built operational recommendations with impact & effort ratings for every cohort (VIP, Loyal, Potential, At-Risk).
- **Executive Analytics Dashboard**: Interactive area, bar, scatter, and pie charts with period-over-period delta indicators.
- **CSV Data Pipeline**: Streaming ingestion supporting the standard UCI Online Retail format with background ML execution, error tracking, and progress polling.
- **Multi-Tenant Architecture**: Every database query is scoped by `workspace_id`. Authentication is handled via Clerk JWT with cryptographic JWKS signature verification.
- **Light & Dark Theme System**: Built with CSS tokens, backdrop filters, smooth gradients, and glassmorphism.

---

## 🏗 Architecture & Tech Stack

```mermaid
graph TD
    Client[Next.js 14 App Router + TailwindCSS] -->|Clerk Bearer JWT| FastAPIServer[FastAPI Backend Python 3.12]
    Client -->|Clerk Auth SDK| ClerkService[Clerk Identity Provider]
    FastAPIServer -->|Async SQLAlchemy / asyncpg| PostgresDB[(PostgreSQL 16 DB)]
    FastAPIServer -->|Background Processing| MLWorker[Scikit-Learn ML Pipeline]
    MLWorker -->|Clean / RFM / KMeans / PCA| PostgresDB
```

| Layer | Technologies |
|---|---|
| **Frontend** | Next.js 14 (App Router), TypeScript, TailwindCSS v4, Recharts, Lucide Icons, next-themes |
| **Authentication** | Clerk (JWT verification via JWKS endpoint, multi-tenant workspace mapping) |
| **Backend API** | FastAPI, Pydantic v2, Uvicorn, Async SQLAlchemy 2.0 |
| **Database** | PostgreSQL 16 (dockerized or local), Alembic migrations, asyncpg driver |
| **Data Science / ML** | Python `pandas`, `scikit-learn` (KMeans, StandardScaler, PCA), `numpy`, `scipy` |
| **Containerization** | Docker, Docker Compose multi-service architecture |

---

## 🚀 Quick Start (Local Development)

### 1. Prerequisites
- **Node.js**: v18+ (tested on Node v20/v24)
- **Python**: v3.11+ (tested on Python 3.12)
- **Docker**: For running PostgreSQL (or a local PostgreSQL instance)

### 2. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Fill in your Clerk credentials from [dashboard.clerk.com](https://dashboard.clerk.com):
```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
CLERK_ISSUER=https://your-clerk-domain.clerk.accounts.dev
CLERK_JWKS_URL=https://your-clerk-domain.clerk.accounts.dev/.well-known/jwks.json
DATABASE_URL=postgresql+asyncpg://customeriq:customeriq@localhost:5432/customeriq
```

### 3. Start Database (Docker)
```bash
docker compose up db -d
```

### 4. Setup Backend
```bash
cd backend
python -m venv venv
# On Windows:
.\venv\Scripts\activate
# On Linux/macOS:
source venv/bin/activate

pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```
Backend API documentation will be available at: [http://localhost:8000/api/docs](http://localhost:8000/api/docs)

### 5. Setup Frontend
```bash
cd frontend
npm install
npm run dev
```
Frontend will be running at: [http://localhost:3000](http://localhost:3000)

### 6. Seed Demo Data (Optional)
To immediately populate the platform with 500 realistic customers and 5,000 orders:
```bash
python scripts/seed_demo_data.py
```

---

## 📊 Standard CSV Ingestion Format

To upload transaction data via the UI (`/app/upload`), ensure your CSV has the following columns (compatible with the UCI Online Retail dataset):

| Column | Type | Example |
|---|---|---|
| `InvoiceNo` | String | `536365` |
| `StockCode` | String | `85123A` |
| `Description` | String | `WHITE HANGING HEART T-LIGHT HOLDER` |
| `Quantity` | Integer | `6` |
| `InvoiceDate` | Date/DateTime | `2023-12-01 08:26:00` |
| `UnitPrice` | Float | `2.55` |
| `CustomerID` | String / Int | `17850` |
| `Country` | String | `United Kingdom` |

A pre-packaged sample CSV is available in `frontend/public/data/sample_retail_data.csv` for immediate testing.

---

## 🧠 Machine Learning Methodology

1. **Data Sanitization**: Drops cancelled orders (`InvoiceNo` starting with 'C'), handles non-positive quantities/unit prices, and standardizes dates.
2. **RFM Derivation**:
   - **Recency ($R$)**: $\text{Reference Date} - \max(\text{InvoiceDate})$
   - **Frequency ($F$)**: $\text{Count of unique } \text{InvoiceNo}$
   - **Monetary ($M$)**: $\sum (\text{Quantity} \times \text{UnitPrice})$
3. **Log-Transform & Scaling**: Applies $\ln(x+1)$ transform to counter monetary/frequency power-law distributions, followed by `StandardScaler(mean=0, std=1)`.
4. **Clustering**: Runs `KMeans(n_clusters=k, random_state=42)` across standardized $(R, F, M)$ vectors.
5. **PCA Projection**: Reduces normalized 3D coordinates to 2 dimensions via `PCA(n_components=2)` for interactive browser scatter plotting.
6. **Persona Mapping**: Automated sorting assigns business personas based on average recency and spending profiles:
   - **VIP Customers**: Low recency, top monetary spend.
   - **Loyal Customers**: High purchase frequency, steady engagement.
   - **Potential Customers**: Recent single or low-frequency purchases.
   - **At-Risk Customers**: High recency (dormant), formerly active.

---

## 🐳 Docker Deployment (Full-Stack)

Run the entire platform with a single command:
```bash
docker compose up --build -d
```
Services started:
- `customeriq-db`: PostgreSQL on port 5432
- `customeriq-backend`: FastAPI on port 8000
- `customeriq-frontend`: Next.js on port 3000

---

## 🛡 Security & Compliance
- **Authentication**: JWT token validation verified against Clerk JWKS public keys.
- **Tenant Isolation**: Strict `workspace_id` foreign key enforcement across all DB entities.
- **Input Validation**: Strict schema enforcement via Pydantic v2.
- **Rate Limiting & File Bounds**: 50MB maximum upload limit with streaming memory validation.

---

## 📝 License
Proprietary SaaS Application — CustomerIQ Platform © 2024. All rights reserved.
