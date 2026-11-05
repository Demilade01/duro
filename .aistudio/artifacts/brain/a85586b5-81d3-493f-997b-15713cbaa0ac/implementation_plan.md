# Duro — "One Wallet, Two Balances" Frontend Architecture Plan

Duro is a mobile-first consumer fintech web application built for the Busha Build Challenge (Financial Access Track) that empowers unbanked Nigerians like Tunde to receive salary inflows without a traditional bank account, automatically shield a percentage of every deposit in US Dollars (`USDC`), send instant remittances to family bank accounts, generate a verified Landlord Financial Passport, and stay protected against stolen-phone SIM-swap attacks.

## User Review & Critical Decisions

> [!IMPORTANT]
> The following architectural and UX decisions have been aligned based on your input and will govern the frontend build:

- **Confirmed Decision 1 — Frontend UI Scope with Clean Backend API Bindings**: We will focus on building the complete interactive Frontend UI layer, typed API client hooks, and state management wired directly to your 8 backend endpoints (`/api/onboarding`, `/api/wallet`, `/api/fund`, `/api/webhooks/busha`, `/api/split`, `/api/remit`, `/api/passport`, `/api/security/sim-swap`). To ensure the UI remains testable while you connect or iterate on backend routes, the client service will also include a seamless optimistic fallback mode if a backend route is not yet reachable.
- **Confirmed Decision 2 — Unified Dark Mode + Vercel-Toggleable & Collapsible Judge Console**: Both the Duro Wallet and the Judge Telemetry & Chaos Console will share a cohesive, high-contrast dark fintech aesthetic. To prevent UI clutter, the Judge Console is built as a **collapsible slide-over drawer / split pane** that can be toggled open or closed in the UI, and completely disabled in production via a Vercel environment variable (`NEXT_PUBLIC_ENABLE_JUDGE_CONSOLE="false"`).
- **Confirmed Decision 3 — Live Webcam + One-Tap Sample Selfie Liveness**: Both the initial Zero-Paperwork Onboarding flow and the SIM-Swap Liveness Recovery modal will support a live `getUserMedia` camera feed framed inside an oval 3D liveness guide, paired with an instant **"Use Verified Sample Selfie"** button for frictionless hackathon judging.

---

## 1. Overview & Core Concept

- **What It Does**: Provides Tunde with a plain-Naira everyday wallet backed by two seamlessly coordinated balances—**Spend (`cNGN`)** for daily Lagos transport, food, and instant bank transfers, and **Save (`USDC`)** as an automated inflation shield—paired with a real-time developer/judge inspection drawer.
- **Target Audience / Persona**:
  - **Primary User (Tunde)**: Newly relocated worker in Lagos with a phone and NIN, needing instant salary collection, automatic dollar savings, family remittance to Mama's GTBank account, and landlord rent verification without crypto jargon.
  - **Hackathon Judge / Developer**: Evaluates real-time Busha API payloads (`X-BU-PROFILE-ID`, `/v1/quotes`, `/v1/transfers`, `/v1/pledges`), webhook HMAC triggers, and SIM-swap velocity guardrails via the toggleable Judge Console.
- **Key Value**: Eliminates paperwork barriers to financial access while protecting users from currency devaluation and SIM-swap account drain.

---

## 2. User Experience & Visual Design

### Key User Flows

1. **Zero-Paperwork Onboarding Sheet / View (`POST /api/onboarding`)**:
   - Captures Phone Number, 11-digit NIN, and a Live Webcam / One-Tap Sample 3D Selfie.
   - Seeds Tunde's verified Busha profile (`BUS_tunde99887766`) and pre-verified family recipient (*Mama - Abosede Bakare, GTBank 0123456789*).
2. **Home & Dual-Balance Hub (`GET /api/wallet`, `POST /api/split`)**:
   - Displays total purchasing power in Naira alongside side-by-side **Spend (`cNGN`)** and **Save (`USDC`)** balance cards with live exchange rate context (`₦1,593 / $1`).
   - Interactive **Auto-Save Split Slider** (`0%` to `50%`, default `15%`) that updates `autoSavePercent` on `/api/split`, plus a one-tap **Quick Swap** modal to move funds between Spend (`cNGN`) and Save (`USDC`).
   - Scrollable recent activity feed with expandable transaction receipts.
3. **Fund Wallet Without a Bank Account (`POST /api/fund`)**:
   - Generates a Busha Temporary Virtual Bank Account (*Providus Bank • 9981234567 • BUSHA / TUNDE BAKARE*) with a live expiry countdown timer, one-tap copy for Account Number, and a formatted "Share Salary Details with Employer / POS Agent" summary card.
4. **Send Home Remittance & 4-Stage Timeline (`POST /api/remit`)**:
   - Allows selecting a saved recipient (e.g., *Mama — Pre-Verified*) or adding a new Nigerian bank account (`bankCode`, `accountNumber`, `accountName`).
   - Renders a live 4-stage transfer tracker (`pending` $\rightarrow$ `processing` $\rightarrow$ `outgoing_payment_sent` $\rightarrow$ `funds_delivered`) with tabular timestamps.
5. **Financial Passport & Rent Micro-Advance (`GET /api/passport`, `POST /api/passport`)**:
   - **Landlord Cash-Flow Statement**: Visualizes Busha `Insights` inflow/outflow trends (`total_inflow`, `total_outflow`, `net_cash_flow`, monthly/weekly series) with a clean printable/exportable Landlord Verification Certificate view.
   - **Collateralized Rent Advance (`Pledges` API)**: Interactive calculator where Tunde pledges his `USDC` savings to unlock an instant `cNGN` rent micro-advance without selling his dollars.
6. **SIM-Swap Velocity Lock & 3D Liveness Recovery (`POST /api/security/sim-swap`)**:
   - When an unrecognized `x-device-id` (`DEV_HACKER_99`) is active, a high-contrast crimson **24-Hour Cooling-Off Lock Banner** appears at the top of the wallet (`simSwapLockedUntil`).
   - Visually indicates locked states on `USDC` withdrawals and blocks payouts to newly added/unverified recipients (`isPreVerified: false`) while still permitting emergency remittances to Mama (`isPreVerified: true`).
   - Clicking **"Verify Identity to Unlock Device"** opens the **NIN + 3D Selfie Liveness Recovery Modal** (`action: "RECOVER_IDENTITY"`), restoring full access and trusting the new device.
7. **Collapsible & Vercel-Configurable Judge Telemetry Drawer**:
   - Controlled by `NEXT_PUBLIC_ENABLE_JUDGE_CONSOLE` (defaults to enabled unless set to `"false"` in Vercel environment settings).
   - When enabled in env, a clean floating/header toggle button (`Judge Console`) expands or collapses the right-hand telemetry drawer so the wallet can be viewed either distraction-free or side-by-side.
   - Houses the `MOCK` vs. `LIVE` Busha API mode switch, the 3 Chaos Simulation triggers (*Salary Inflow ₦150k*, *SIM-Swap Attack*, *Liveness Recovery*), active `x-device-id` badge, and a real-time filterable Busha HTTP & Webhook inspector.

### Visual Identity & Theme

- **Aesthetic Direction**: Modern Nigerian consumer neo-bank meets precision developer telemetry—clean, authoritative, zero-jargon dark mode interface inspired by high-trust mobile fintechs and Vercel/Linear developer consoles.
- **Color Palette & Mood (60-30-10 Dark Mode Discipline)**:
  - **60% Dominant Canvas**: Deep obsidian night (`#090D16` / `bg-slate-950`) for the outer workspace and `#0D1322` for the mobile viewport chassis.
  - **30% Structural Surfaces**: Elevated slate cards (`#131C31` / `bg-slate-900/90`) with crisp `1px solid rgba(255,255,255,0.08)` hairline borders and muted slate metadata (`#94A3B8`).
  - **10% Semantic Accents**:
    - **Spend (`cNGN`) Primary Accent**: Vibrant Naira Emerald (`#10B981` / `emerald-500`) signalling liquid everyday cash.
    - **Save (`USDC`) Shield Accent**: Sovereign Sky Cyan (`#38BDF8` / `sky-400`) signalling protected dollar reserves.
    - **Security / Velocity Lock Alert**: High-visibility Crimson (`#F43F5E` / `rose-500`) paired with explicit lock iconography and countdown timers.
- **Typography & Hierarchy (2+1 Font Rule)**:
  - **Display & Headings**: `Plus Jakarta Sans` (SemiBold/Bold 600–700) for crisp wallet balances, navigation headers, and card titles.
  - **Body Prose**: `DM Sans` (Regular/Medium 400–500) for plain-language Naira descriptions and zero-jargon guidance.
  - **Data, Balances & Telemetry**: `JetBrains Mono` with `tabular-nums` strictly enforced on all currency figures (`₦127,500.00`, `$14.12`), account numbers, countdown timers, and HTTP telemetry logs.
- **Component Styling & Ergonomics**:
  - **Touch Hitboxes**: All interactive buttons, bottom navigation tabs, and quick actions enforce $\ge 44 \times 44\text{px}$ touch targets.
  - **15% Sticky Cap**: Compact sticky top bar ($52\text{px}$) and fixed 4-tab bottom navigation bar ($60\text{px}$) stay well within the 15% mobile viewport cap.
  - **Anti-Slop & Zero-Pill Discipline**: Metadata (timestamps, bank names, exchange rates, request methods) renders as clean inline text with typographic separators (`·`) rather than cluttered pill badges. Single-level card elevation with hairline dividers.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Environment-Gated & User-Collapsible Judge Console**
  - *Chosen Approach*: Gate the entire Judge Telemetry Console behind `process.env.NEXT_PUBLIC_ENABLE_JUDGE_CONSOLE !== "false"` AND provide a clean UI toggle button (`Show / Hide Judge Console`) in the top bar.
  - *Why*: Lets you deploy a pure consumer wallet experience on Vercel simply by setting `NEXT_PUBLIC_ENABLE_JUDGE_CONSOLE=false`, while during demos or judging you can toggle the console open for split-screen chaos testing or collapse it to showcase the clean mobile wallet centered on screen.
  - *Alternatives Considered*: Hardcoding a permanent 50/50 split screen, which clutters the UI when demonstrating the consumer experience on smaller screens or production links.
- **Decision 2: Live WebRTC Camera with Instant Sample Fallback for Liveness**
  - *Chosen Approach*: Build a reusable `SelfieLivenessScanner` component that requests `navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } })` with a real-time video canvas capture, alongside a one-click **"Use Sample Verified Selfie"** button that injects a valid deterministic Base64 portrait payload.
  - *Why*: Delivers an authentic 3D biometric feel on laptops/phones with webcams while guaranteeing zero demo failures if a judge denies camera permission or tests in a headless browser.
- **Decision 3: Typed API Client with Automatic Header Injection & Resilient State**
  - *Chosen Approach*: Centralize all frontend-to-backend calls in a single client controller that automatically attaches `x-device-id` (switching between `DEV_TUNDE_IPHONE_01` and `DEV_HACKER_99` during SIM-swap simulations) and `x-busha-mode` (`MOCK` vs. `LIVE`), and refreshes wallet + telemetry state after every mutation.
  - *Why*: Ensures every button click in the Duro Wallet and Judge Console hits the real Next.js API routes with exact headers and immediately reflects balance changes, velocity lock errors (`403 Forbidden`), and new Busha HTTP logs.

---

## 4. Technical Architecture & Data Strategy *(Technical Reference)*

### Architecture & Component Diagram

```
┌────────────────────────────────────────────────────────────────────────────────────┐
│                     Workspace Root (Unified Dark Theme Canvas)                     │
│  ┌──────────────────────────────────────────────────────┐  ┌────────────────────┐  │
│  │ Top Bar: Duro Brand · Device Badge · [Judge Toggle]* │  │ *Visible when env  │  │
│  └──────────────────────────────────────────────────────┘  │  NEXT_PUBLIC_      │  │
│                                                            │  ENABLE_JUDGE_     │  │
│  ┌──────────────────────────────────────────┐              │  CONSOLE != false  │  │
│  │     Duro Mobile Wallet (max-w-[420px])   │              └─────────┬──────────┘  │
│  │  ┌────────────────────────────────────┐  │                        │             │
│  │  │ SIM-Swap 24h Velocity Lock Banner  │  │   ┌────────────────────▼──────────┐  │
│  │  │ (Conditional: simSwapLockedUntil)  │  │   │ Collapsible Judge Telemetry   │  │
│  │  └────────────────────────────────────┘  │   │ & Chaos Drawer (Right Pane)   │  │
│  │  ┌────────────────────────────────────┐  │   │ ┌───────────────────────────┐ │  │
│  │  │ Active View Container:             │  │   │ │ Mode Switch: MOCK │ LIVE  │ │  │
│  │  │  1. Home / Dual Balances & Split   │  │   │ └───────────────────────────┘ │  │
│  │  │  2. Fund Wallet (Virtual Account)  │  │   │ ┌───────────────────────────┐ │  │
│  │  │  3. Send Home (Remit & 4-Stage UI) │  │   │ │ Chaos Triggers:           │ │  │
│  │  │  4. Passport (Insights & Pledges)  │  │   │ │ • Salary Inflow (₦150k)   │ │  │
│  │  └────────────────────────────────────┘  │   │ │ • SIM-Swap Attack         │ │  │
│  │  ┌────────────────────────────────────┐  │   │ │ • Liveness Recovery       │ │  │
│  │  │ Modals / Sheets:                   │  │   │ └───────────────────────────┘ │  │
│  │  │  • Zero-Paperwork Onboarding       │  │   │ ┌───────────────────────────┐ │  │
│  │  │  • 3D Selfie Liveness Recovery     │  │   │ │ Live Busha API & Webhook  │ │  │
│  │  │  • Printable Landlord Statement    │  │   │ │ Inspector (JSON + Headers)│ │  │
│  │  └────────────────────────────────────┘  │   │ └───────────────────────────┘ │  │
│  │  ┌────────────────────────────────────┐  │   └───────────────┬───────────────┘  │
│  │  │ 4-Tab Thumb Bar (Home/Fund/Send/ID)│  │                   │                  │
│  └──┴────────────────────────────────────┴──┘                   │                  │
│                       │                                         │                  │
│                       └────────────────────┬────────────────────┘                  │
│                                            ▼                                       │
│            ┌───────────────────────────────────────────────────────┐               │
│            │   Typed Duro API Client (Attaches x-device-id & Mode) │               │
│            └───────────────────────────────┬───────────────────────┘               │
└────────────────────────────────────────────┼───────────────────────────────────────┘
                                             ▼
┌────────────────────────────────────────────────────────────────────────────────────┐
│                        Next.js Backend API Routes (/api/*)                         │
│  /api/onboarding  │ /api/wallet │ /api/fund     │ /api/webhooks/busha              │
│  /api/split       │ /api/remit  │ /api/passport │ /api/security/sim-swap           │
└────────────────────────────────────────────────────────────────────────────────────┘
```

### Data Model & Client State

The frontend synchronizes with the backend response shapes across four cohesive state slices:
1. **User & Security State**: `profile` (`id`, `fullName`, `phone`, `nin`, `bushaProfileId`, `kycStatus`, `autoSavePercent`, `trustedDeviceId`, `simSwapLockedUntil`), plus client-side `activeDeviceId` (`DEV_TUNDE_IPHONE_01` by default, mutated to `DEV_HACKER_99` on simulated attack) and `apiMode` (`MOCK` | `LIVE`).
2. **Dual Balances & Activity State**:
   - `spendBalance` (`cNGN` available, pending, and Naira 1:1 display).
   - `saveBalance` (`USDC` available, pledged/locked collateral, and Naira equivalent at `₦1,593/$`).
   - `transactions` list including salary inflows, automatic 15% `cNGN -> USDC` splits, and outgoing bank remittances with their 4-stage `timeline` array.
3. **Passport & Credit State**:
   - `insights` (`total_inflow`, `total_outflow`, `net_cash_flow`, and time-series bars from `/api/passport`).
   - `activePledges` (`id`, `collateralUsdc`, `advanceNgn`, `status: "authorized"`).
4. **Telemetry Inspector State**:
   - Array of captured Busha API/webhook log entries (`id`, `timestamp`, `method`, `endpoint`, `status`, `durationMs`, `requestHeaders`, `requestBody`, `responseBody`) with expandable JSON payload inspection.

### Interactive Component & State Mapping

| Component / View | User Interaction | API Route & Payload | UI State Transition & Feedback |
| :--- | :--- | :--- | :--- |
| **Onboarding Modal** | Enter Phone + NIN, capture webcam/sample selfie, click *Complete Verification* | `POST /api/onboarding` `{ phone, fullName, nin, selfieImage }` | Creates verified profile, seeds Mama's GTBank recipient, logs `POST /v1/customers` + `/verify` in telemetry, transitions to Wallet Home. |
| **Home: Auto-Save Split & Quick Swap** | Drag Auto-Save slider (`0–50%`) or submit manual `cNGN <-> USDC` swap | `POST /api/split` `{ autoSavePercent }` or `{ direction, amount }` | Updates split percentage badge; executes conversion quote + transfer. If `direction === "USDC_TO_CNGN"` while SIM-swap locked, displays velocity guard block alert. |
| **Fund Wallet Tab** | Click *Generate Temporary Salary/POS Account* | `POST /api/fund` `{ amount }` | Calls quote + transfer, renders Providus Bank virtual account card (`9981234567`), starts 30-min countdown timer, enables 1-tap copy. |
| **Send Home Tab** | Pick *Mama (Pre-Verified)* or add new recipient, enter NGN amount, click *Send Now* | `POST /api/remit` `{ recipientId / newRecipient, amount }` | Animates 4-stage transfer timeline (`pending` $\rightarrow$ `funds_delivered`). If SIM-swap locked and recipient is unverified, shows `Velocity Guardrail Blocked` banner with recovery CTA. |
| **Financial Passport Tab** | View cash-flow trends, click *Print Landlord Statement*, or submit *Unlock Rent Advance* | `GET /api/passport` & `POST /api/passport` `{ collateralUsdc, advanceNgn }` | Opens formatted Landlord Cash-Flow Certificate modal (`window.print()` ready); locks `USDC` collateral and credits `cNGN` Spend balance via Busha Pledges. |
| **Judge Console Drawer** | Toggle `MOCK`/`LIVE`, click *Simulate ₦150k Salary*, *Simulate SIM-Swap*, or *Liveness Recovery* | `POST /api/webhooks/busha` (HMAC signed), `POST /api/security/sim-swap` | Immediately mutates wallet balances (₦127.5k `cNGN` + $14.12 `USDC`), activates/clears crimson 24h velocity lock banner, and appends live HTTP trace to inspector. |
