# British Auction — RFQ System

> A real-time **reverse auction platform** for logistics and freight procurement. Suppliers compete by quoting the lowest price. The platform auto-extends auction time when bids arrive near closing — the British Auction rule — squeezing out the best market rate.

---

## What It Does

In traditional freight procurement, logistics managers call 10 transporters individually or negotiate over WhatsApp for hours. This platform replaces that entire process with a **transparent, 15–60 minute live bidding room**:

1. **Admin** creates an RFQ (e.g. *"10 trucks, Mumbai → Delhi, pickup Nov 25"*) with bidding times and rules
2. **Suppliers** (registered logistics vendors) log into their verified accounts and submit their lowest freight quote
3. The platform ranks all bids live — lowest total wins (L1)
4. **Anti-sniping:** any bid near closing auto-extends the timer, giving other suppliers a fair chance to counter-bid
5. When the auction closes, the L1 supplier wins the contract

---

## Features

### Core Auction
- **Real-time live rankings** via Socket.IO — rankings update instantly on all screens the moment a bid is submitted, no page refresh needed
- **British Auction time extension** — configurable trigger window (X minutes before close) and extension duration (Y minutes), capped at a hard forced-close deadline
- **Three extension trigger modes:**
  - **Mode A** — extend on any valid bid
  - **Mode B** — extend only if any supplier's rank changes
  - **Mode C** — extend only if the L1 (winning) supplier changes
- **Forced-close hard deadline** — auction never runs beyond this, regardless of extensions
- **Automatic status transitions** — `PENDING → ACTIVE → CLOSED / FORCE_CLOSED` via background scheduler (runs every 10 seconds)
- **Immutable activity log** — every bid, extension, and status change is recorded with timestamps

### Bidding Rules
- **Minimum decrement** — new bid must beat the current L1 (global best) by at least ₹X (configurable per auction), preventing ₹1 spam bids
- **Own-bid rule** — a supplier must always beat their own previous lowest bid
- **Server-side total computation** — freight + origin + destination charges summed on the server; client total is never trusted
- **Quick-Bid buttons** — reduce freight by fixed amounts (−₹500, −₹1,000, −₹2,500, −₹5,000) or by percentage (−2%, −5%, −10%) with one click
- **Fill Last Bid** — pre-fills the form with a supplier's previous bid details so they only need to adjust the price

### Supplier Authentication & Security
- **Verified supplier accounts** — company name, email, bcrypt-hashed password stored in database
- **JWT-locked identity** — when a supplier bids, their company name is read directly from the signed JWT, not from the form. It is cryptographically impossible to submit a bid under another supplier's name
- **Separate token namespaces** — `admin_token` and `supplier_token` stored separately in localStorage; a supplier JWT cannot access admin routes and vice versa
- **Admin login** — single hardcoded admin account for auction management (create, delete, view full analytics)
- **Guest access** — anyone with the auction link can view live rankings and activity, but cannot bid without a supplier account

### Outbid Email Notifications
- When a supplier loses their **L1 (winning) position**, they receive an **instant email notification** via Gmail SMTP
- Email shows: their current bid amount, the new L1 amount, their new rank, auction closing time, and a direct link back to the auction to counter-bid
- Suppliers don't need to stare at the screen — they get pulled back only when it matters
- Email failures are caught silently and never interrupt the auction flow

### Admin Dashboard
- Create new auctions with full configuration (route, times, trigger rules, min decrement)
- View per-auction stats: number of participating suppliers, current lowest bid
- Delete auctions (cascades to bids and logs)
- Full activity log per auction (bids, extensions, status changes)

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18, Vite, Tailwind CSS, React Router v6, Socket.IO Client, Axios |
| **Backend** | Node.js, Express 5, Socket.IO |
| **Auth** | JSON Web Tokens, bcryptjs |
| **Validation** | Zod |
| **ORM** | Prisma 7 (`@prisma/adapter-pg`) |
| **Database** | PostgreSQL (Neon serverless cloud) |
| **Scheduler** | node-cron |
| **Email** | Nodemailer + Gmail SMTP |

---

## Project Structure

```
british_auction/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma          # DB schema (Rfq, Supplier, Bid, AuctionLog)
│   │   └── prisma.config.ts       # Prisma 7 config with adapter-pg
│   ├── src/
│   │   ├── index.js               # Express + Socket.IO server
│   │   ├── db.js                  # Prisma client singleton
│   │   ├── middleware/
│   │   │   └── auth.js            # requireAdmin + requireSupplier
│   │   ├── routes/
│   │   │   ├── rfq.routes.js      # RFQ + bid endpoints
│   │   │   ├── auth.routes.js     # Admin login/verify
│   │   │   └── supplier.routes.js # Supplier register/login/verify
│   │   └── services/
│   │       ├── auctionEngine.js   # Bid validation, ranking, trigger logic
│   │       ├── scheduler.js       # node-cron lifecycle manager
│   │       └── emailService.js    # Outbid email notifications
│   └── .env
├── frontend/
│   └── src/
│       ├── pages/
│       │   ├── AuctionList.jsx    # Dashboard
│       │   ├── AuctionDetail.jsx  # Live auction room
│       │   ├── LoginPage.jsx      # Admin login
│       │   └── SupplierAuthPage.jsx # Supplier register/login
│       ├── components/
│       │   ├── BidForm.jsx        # Bid submission form
│       │   ├── BidTable.jsx       # Live ranked leaderboard
│       │   └── CreateRfqForm.jsx  # New auction creation
│       ├── context/
│       │   ├── AuthContext.jsx         # Admin auth state
│       │   └── SupplierAuthContext.jsx # Supplier auth state
│       └── api/
│           └── axios.js           # HTTP client with JWT interceptor
├── HLD.md                         # High-Level Design & Architecture
└── SCHEMA.md                      # Database Schema
```

---

## Quick Start

### Prerequisites
- Node.js 18+
- A PostgreSQL connection string (free tier at [neon.tech](https://neon.tech))
- A Gmail account with an [App Password](https://myaccount.google.com/apppasswords) (for outbid emails)

### 1. Configure environment

Create `backend/.env`:
```env
PORT=3001
DATABASE_URL="postgresql://user:password@host/dbname?sslmode=require"
JWT_SECRET="your-long-random-secret-key"
ADMIN_USERNAME="admin"
ADMIN_PASSWORD="your-admin-password"
EMAIL_USER="your_gmail@gmail.com"
EMAIL_PASS="your 16-char app password"
FRONTEND_URL="http://localhost:5173"
CLIENT_URL="http://localhost:5173"
```

### 2. Backend setup
```bash
cd backend
npm install
npx prisma generate
npx prisma db push
npm start
```
Backend runs on `http://localhost:3001`

### 3. Frontend setup
```bash
cd frontend
npm install
npm run dev
```
Frontend runs on `http://localhost:5173`

### 4. First use
1. Open `http://localhost:5173` and click **Admin Login** — use the credentials from your `.env`
2. Create your first auction from the dashboard
3. Register a supplier account at `/supplier/login`
4. Open the auction link and start bidding

---

## API Reference

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/auth/login` | None | Admin login — returns admin JWT |
| `GET` | `/api/auth/verify` | Admin JWT | Verify admin token |
| `POST` | `/api/supplier/register` | None | Register new supplier account |
| `POST` | `/api/supplier/login` | None | Supplier login — returns supplier JWT |
| `GET` | `/api/supplier/verify` | Supplier JWT | Verify supplier token |
| `GET` | `/api/rfq` | None | List all auctions |
| `POST` | `/api/rfq` | Admin JWT | Create new auction |
| `GET` | `/api/rfq/:id` | None | Get auction + ranked bids + logs |
| `POST` | `/api/rfq/:id/bid` | Supplier JWT | Submit a bid |
| `GET` | `/api/rfq/:id/logs` | None | Get activity log for auction |
| `DELETE` | `/api/rfq/:id` | Admin JWT | Delete auction and all its data |

### Socket.IO Events

| Event | Direction | Payload |
|---|---|---|
| `join_rfq` | Client → Server | `rfqId` — join the auction room |
| `bid_update` | Server → Client | `{ rfq, rankedBids }` — broadcast after every bid |

---

## Deployment

### Single-service (Render / Railway)
The backend serves the compiled frontend from `frontend/dist/`.

**Build command:**
```bash
cd frontend && npm install && npm run build && cd ../backend && npm install && npx prisma generate
```
**Start command:**
```bash
cd backend && npm start
```

### Separate services (Vercel + Render)
- **Backend** (Render): root `backend/`, start `npm start`, set all `.env` vars
- **Frontend** (Vercel): root `frontend/`, set `VITE_API_URL` and `VITE_WS_URL` to backend URL

---

## Documentation

- [HLD.md](./HLD.md) — High-Level Design, architecture diagrams, bid flow sequence, trigger logic
- [SCHEMA.md](./SCHEMA.md) — Full database schema with ER diagram and column descriptions
