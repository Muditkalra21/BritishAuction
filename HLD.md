# High-Level Design — British Auction RFQ System

## 1. System Overview

A **real-time reverse auction platform** for logistics procurement. The buyer (Admin) creates freight RFQs and multiple logistics suppliers compete by bidding the **lowest total freight quote**. The system auto-extends auction time when bids arrive near closing (British Auction rule), ensuring a fair price discovery process.

---

## 2. Architecture Diagram

```mermaid
flowchart TD
    A["&#x1F4BB; Admin Browser"] -->|"HTTP REST (admin_token JWT)"| E
    B["&#x1F69B; Supplier Browser"] -->|"HTTP REST (supplier_token JWT)"| E
    B -->|"Socket.IO (real-time)"| E
    C["&#x1F453; Guest Browser"] -->|"View Only (no auth)"| E

    subgraph Backend ["&#x2699;&#xFE0F; Express.js Backend (Node.js + Socket.IO)"]
        E["API Gateway\n/api/auth\n/api/rfq\n/api/supplier"]
        F["&#x1F510; Auth Middleware\nrequireAdmin / requireSupplier\n(JWT verification)"]
        G["&#x26A1; Auction Engine\nauctionEngine.js\n- Bid validation\n- Rank computation\n- Trigger A/B/C\n- Time extension"]
        H["&#x23F0; Scheduler\nnode-cron (every 10s)\nPENDING→ACTIVE\nACTIVE→CLOSED"]
        I["&#x1F4E7; Email Service\nnodemailer + Gmail SMTP\nOutbid notifications"]
    end

    subgraph DB ["&#x1F5C4;&#xFE0F; Neon PostgreSQL (Cloud)"]
        J[("RFQ")]
        K[("Supplier")]
        L[("Bid")]
        M[("AuctionLog")]
    end

    E --> F --> G
    G -->|"db read/write"| L
    G -->|"log events"| M
    G -->|"emit bid_update"| B
    G -->|"send outbid email"| I
    H -->|"status updates"| J
    E -->|"Prisma ORM"| DB
```

---

## 3. Component Breakdown

```mermaid
flowchart LR
    subgraph Frontend ["React 18 Frontend (Vite + Tailwind)"]
        F1["AuctionList\n- Dashboard\n- Create RFQ (Admin)"]
        F2["AuctionDetail\n- Live countdown\n- Activity log\n- Bid rankings"]
        F3["BidForm\n- Supplier-locked form\n- Quick-Bid buttons\n- Live total"]
        F4["SupplierAuthPage\n- Register / Login\n- JWT stored in localStorage"]
        F5["Navbar\n- Admin state\n- Supplier state\n- Guest state"]
    end

    subgraph State ["State Management"]
        S1["AuthContext\nadmin_token"]
        S2["SupplierAuthContext\nsupplier_token + supplier_data"]
    end

    subgraph API ["API Layer"]
        A1["axios.js\nAuto-attaches JWT\nbased on route type"]
        A2["Socket.IO Client\nJoins rfq:id room\nListens: bid_update"]
    end

    F3 --> S2
    F1 --> S1
    Frontend --> API
```

---

## 4. Bid Submission Flow

```mermaid
sequenceDiagram
    participant S as Supplier Browser
    participant API as Express API
    participant AE as Auction Engine
    participant DB as PostgreSQL
    participant IO as Socket.IO
    participant EM as Email (SMTP)

    S->>API: POST /api/rfq/:id/bid (Bearer supplier_token)
    API->>API: requireSupplier middleware<br/>verifies JWT, extracts companyName
    API->>AE: submitBid(rfqId, bidData)

    AE->>DB: Load RFQ (status, times, minDecrement)
    AE->>AE: Check status = ACTIVE
    AE->>AE: Check bidStart ≤ now ≤ bidClose/forcedClose
    AE->>DB: Get supplier's current lowest bid
    AE->>AE: Validate: new bid < own previous best
    AE->>DB: Get global L1 (lowest bid across all suppliers)
    AE->>AE: Validate: new bid ≤ L1 - minDecrement

    AE->>DB: Snapshot pre-bid ranks
    AE->>DB: INSERT new Bid row
    AE->>DB: Recompute and UPDATE ranks

    AE->>DB: INSERT AuctionLog (BID_SUBMITTED)

    alt Previous L1 supplier was outbid
        AE->>DB: Fetch old L1 supplier email
        AE->>EM: Send outbid notification email
    end

    alt Bid lands in trigger window
        AE->>AE: Check extensionTrigger (A/B/C)
        AE->>DB: UPDATE rfq.bidClose = min(close+Y, forcedClose)
        AE->>DB: INSERT AuctionLog (TIME_EXTENDED)
    end

    AE->>IO: emit('bid_update', {rfq, rankedBids})
    IO->>S: Real-time broadcast to all in rfq:id room
    API->>S: 201 { bid, rfq }
```

---

## 5. Auction Lifecycle (State Machine)

```mermaid
stateDiagram-v2
    [*] --> PENDING : Admin creates RFQ\n(bidStart is in the future)

    PENDING --> ACTIVE : Scheduler detects\nnow ≥ bidStart

    ACTIVE --> ACTIVE : Bid arrives in trigger window\n→ bidClose extended by Y min\n(capped at forcedClose)

    ACTIVE --> CLOSED : Scheduler detects\nnow ≥ bidClose\n(no extension triggered)

    ACTIVE --> FORCE_CLOSED : Scheduler detects\nnow ≥ forcedClose\n(hard deadline reached)

    CLOSED --> [*]
    FORCE_CLOSED --> [*]
```

---

## 6. Extension Trigger Logic

```mermaid
flowchart TD
    A["New bid submitted"] --> B{"Is now ≥ bidClose − triggerX?"}
    B -->|No| Z["No extension"]
    B -->|Yes — in trigger window| C{"extensionTrigger type?"}

    C -->|A — Any Bid| E["Extend always"]
    C -->|B — Any Rank Change| D{"Did any supplier's rank change?"}
    C -->|C — L1 Change| F{"Did the L1 supplier change?"}

    D -->|Yes| E
    D -->|No| Z
    F -->|Yes| E
    F -->|No| Z

    E --> G["newClose = min(bidClose + Y, forcedClose)"]
    G --> H{"newClose > bidClose?"}
    H -->|Yes| I["UPDATE rfq.bidClose\nLOG TIME_EXTENDED\nEmit socket update"]
    H -->|No| Z
```

---

## 7. Security Architecture

```mermaid
flowchart LR
    subgraph "What is Protected"
        R1["POST /api/rfq\nCreate Auction"]
        R2["POST /api/rfq/:id/bid\nSubmit Bid"]
        R3["DELETE /api/rfq/:id\nDelete Auction"]
    end

    subgraph "Guards"
        G1["requireAdmin\n- Checks Bearer token\n- role must be 'admin'"]
        G2["requireSupplier\n- Checks Bearer token\n- role must be 'supplier'\n- companyName from JWT\n (cannot be faked)"]
    end

    R1 --> G1
    R3 --> G1
    R2 --> G2
```

---

## 8. Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18, Vite, Tailwind CSS, Zustand, React Router v6, Socket.IO Client |
| **Backend** | Node.js, Express 5, Socket.IO, node-cron |
| **Auth** | JSON Web Tokens (jsonwebtoken), bcryptjs |
| **Validation** | Zod |
| **ORM** | Prisma 7 (`@prisma/adapter-pg`) |
| **Database** | PostgreSQL (Neon serverless cloud) |
| **Email** | Nodemailer + Gmail SMTP |
| **HTTP Client** | Axios (with JWT interceptor) |
