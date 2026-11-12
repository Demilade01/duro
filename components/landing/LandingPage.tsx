"use client";

import React, { useState } from "react";
import Link from "next/link";

interface LandingPageProps {
  onOpenAccount?: () => void;
  onSignIn?: () => void;
  isAuthenticated?: boolean;
}

const FAQ_ITEMS = [
  {
    q: "Do I need a utility bill or international passport to open a Duro wallet?",
    a: "No. You only need your 11-digit National Identification Number (NIN), a Nigerian phone number, an email address, and a live selfie check.",
  },
  {
    q: "How does the automatic US Dollar split work when I get paid?",
    a: "When your employer or a POS agent sends Naira to your Duro virtual account, Duro credits your Naira Spend balance and immediately converts your chosen percentage (15% by default) into US Dollars.",
  },
  {
    q: "What happens if my phone is stolen or someone forces me to sign in on a new device?",
    a: "Signing in from an unrecognized device triggers an automatic 24-hour cooling-off lock. During those 24 hours, US Dollar savings cannot be withdrawn and new bank beneficiaries cannot be added—even with a selfie—while normal transfers to your pre-saved Trusted Accounts remain open.",
  },
  {
    q: "How can I pay rent in Naira without selling my US Dollar savings?",
    a: "In the Credit & Statements tab, you can pledge your US Dollar balance as collateral (at 150% coverage) and receive an instant Naira advance directly into your Spend balance.",
  },
  {
    q: "What fees does Duro charge on bank transfers?",
    a: "Sending Naira to any Nigerian bank costs a flat ₦200 transfer fee plus ₦15 VAT (₦215 total). The exact fee and total debit are shown in a confirmation modal before you approve the payout.",
  },
] as const;

function ArrowSlideIcon() {
  return (
    <svg
      className="btn-slide-icon w-4 h-4 shrink-0"
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M4.5 10H15.5M15.5 10L10.75 5.25M15.5 10L10.75 14.75"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CheckDotIcon() {
  return (
    <svg
      className="w-4 h-4 shrink-0 text-[var(--status-success)] mt-0.5"
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M6.75 10.25L9 12.5L13.5 7.75"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function LandingPage({
  onOpenAccount,
  onSignIn,
  isAuthenticated = false,
}: LandingPageProps) {
  const [splitPercent, setSplitPercent] = useState<number>(15);
  const [openFaqIndex, setOpenFaqIndex] = useState<number>(0);

  const sampleInflowNgn = 150_000;
  const fxRate = 1593;
  const savedNgn = Math.round((sampleInflowNgn * splitPercent) / 100);
  const spendNgn = sampleInflowNgn - savedNgn;
  const savedUsd = (savedNgn / fxRate).toFixed(2);

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] flex flex-col">
      {/* 1. Floating Pill Header */}
      <header className="sticky top-4 z-40 px-4 sm:px-8">
        <div className="max-w-5xl mx-auto h-14 px-3 sm:px-5 rounded-full bg-[var(--card)] border border-[var(--border)] flex items-center justify-between gap-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)] rounded-full"
          >
            <span className="w-8 h-8 rounded-full bg-[var(--brand)] text-[var(--brand-foreground)] inline-flex items-center justify-center text-sm font-medium">
              D
            </span>
            <span className="text-base font-medium tracking-tight text-[var(--foreground)]">
              Duro
            </span>
          </Link>

          <nav
            aria-label="Primary"
            className="hidden md:flex items-center gap-6 text-xs font-medium text-[var(--muted-foreground)]"
          >
            <a
              href="#problem"
              className="hover:text-[var(--foreground)] transition-colors"
            >
              Why Duro
            </a>
            <a
              href="#solution"
              className="hover:text-[var(--foreground)] transition-colors"
            >
              How It Works
            </a>
            <a
              href="#fees"
              className="hover:text-[var(--foreground)] transition-colors"
            >
              Fee Schedule
            </a>
            <a
              href="#faq"
              className="hover:text-[var(--foreground)] transition-colors"
            >
              FAQ
            </a>
          </nav>

          <div className="flex items-center gap-2">
            {isAuthenticated ? (
              <Link
                href="/"
                className="btn-slide h-9 px-4 rounded-full bg-[var(--brand)] text-[var(--brand-foreground)] text-xs font-medium inline-flex items-center gap-1.5"
              >
                <span>Go to Wallet</span>
                <ArrowSlideIcon />
              </Link>
            ) : (
              <>
                <button
                  type="button"
                  onClick={onSignIn}
                  className="h-9 px-3.5 rounded-full text-xs font-medium text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)]"
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={onOpenAccount}
                  className="btn-slide h-9 px-4 rounded-full bg-[var(--brand)] text-[var(--brand-foreground)] text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)]"
                >
                  <span>Open Wallet</span>
                  <ArrowSlideIcon />
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* 2. Centred Hero with Interactive Wallet Peeking from Bottom */}
        <section className="duro-grid-surface pt-14 sm:pt-20 pb-0 px-5 sm:px-8 border-b border-[var(--border)] overflow-hidden">
          <div className="max-w-4xl mx-auto text-center space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[var(--card)] border border-[var(--border)] text-xs font-medium text-[var(--muted-foreground)]">
              <span className="w-2 h-2 rounded-full bg-[var(--brand)]" />
              <span>Dúró · Built on Busha payment rails</span>
            </div>

            <h1
              className="text-4xl sm:text-6xl font-normal tracking-tight text-[var(--foreground)] leading-[1.06]"
              style={{ fontFamily: "var(--font-serif)" }}
            >
              Spend in Naira.
              <br />
              Save automatically in US Dollars.
            </h1>

            <p className="text-base sm:text-lg font-normal text-[var(--muted-foreground)] max-w-2xl mx-auto leading-relaxed">
              One wallet with two balances for working Nigerians. Every time your
              salary or POS cash-in lands, Duro moves a set percentage straight
              into US Dollars—no utility bill or crypto jargon required.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={onOpenAccount}
                className="btn-slide w-full sm:w-auto h-12 px-7 rounded-full bg-[var(--brand)] text-[var(--brand-foreground)] text-sm font-medium inline-flex items-center justify-center gap-2 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)]"
              >
                <span>Open Your Wallet</span>
                <ArrowSlideIcon />
              </button>

              <button
                type="button"
                onClick={onSignIn}
                className="btn-slide w-full sm:w-auto h-12 px-6 rounded-full bg-[var(--card)] border border-[var(--border)] text-[var(--foreground)] text-sm font-medium inline-flex items-center justify-center gap-2 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)]"
              >
                <span>Sign In to Existing Account</span>
                <ArrowSlideIcon />
              </button>
            </div>
          </div>

          {/* Product surface peeking from bottom edge */}
          <div className="max-w-4xl mx-auto mt-12 sm:mt-14">
            <div className="rounded-t-3xl bg-[var(--card)] border-t border-x border-[var(--border)] p-5 sm:p-8 space-y-6">
              {/* Top bar inside product preview */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-[var(--border)]">
                <div className="flex items-center gap-3">
                  <span className="px-3 py-1 rounded-full bg-[var(--muted)] text-xs font-mono text-[var(--foreground)]">
                    PROVIDUS · 9974820193
                  </span>
                  <span className="text-xs text-[var(--muted-foreground)]">
                    Incoming salary deposit: <strong className="font-mono font-medium text-[var(--foreground)]">₦150,000.00</strong>
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <label
                    htmlFor="hero-split-range"
                    className="text-xs font-medium text-[var(--muted-foreground)]"
                  >
                    Auto-Save rule: <span className="font-mono text-[var(--foreground)]">{splitPercent}%</span>
                  </label>
                  <input
                    id="hero-split-range"
                    type="range"
                    min={5}
                    max={50}
                    step={5}
                    value={splitPercent}
                    onChange={(e) => setSplitPercent(Number(e.target.value))}
                    className="w-28 accent-[var(--brand)] cursor-pointer"
                  />
                </div>
              </div>

              {/* Dual-balance preview cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-2xl bg-[var(--background)] border border-[var(--border)] p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-[var(--muted-foreground)]">
                      Naira Spend · Daily transfers &amp; bills
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-[var(--muted)] text-xs font-mono text-[var(--foreground)]">
                      {100 - splitPercent}% kept
                    </span>
                  </div>
                  <div className="text-2xl sm:text-3xl font-mono font-medium text-[var(--foreground)]">
                    ₦{spendNgn.toLocaleString("en-NG")}.00
                  </div>
                  <div className="text-xs text-[var(--subtle)]">
                    Ready for NIP transfers to GTBank, Access, Zenith, OPay &amp; Moniepoint
                  </div>
                </div>

                <div className="rounded-2xl bg-[var(--brand)] text-[var(--brand-foreground)] p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-[var(--brand-foreground)] opacity-85">
                      US Dollar Save · Protected from inflation
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-[var(--accent)] text-[var(--brand)] text-xs font-mono font-medium">
                      {splitPercent}% auto-saved
                    </span>
                  </div>
                  <div className="text-2xl sm:text-3xl font-mono font-medium">
                    ${savedUsd} <span className="text-sm font-normal opacity-80">USD</span>
                  </div>
                  <div className="text-xs opacity-80 font-mono">
                    Converted from ₦{savedNgn.toLocaleString("en-NG")} at ₦{fxRate.toLocaleString("en-NG")}/$1
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 3. Problem Section */}
        <section
          id="problem"
          className="py-16 sm:py-24 px-5 sm:px-8 border-b border-[var(--border)]"
        >
          <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-6 space-y-5">
              <span className="inline-block text-xs font-mono uppercase tracking-wider text-[var(--muted-foreground)]">
                Why wages slip away
              </span>
              <h2
                className="text-3xl sm:text-4xl font-normal text-[var(--foreground)] leading-[1.12]"
                style={{ fontFamily: "var(--font-serif)" }}
              >
                Working hard in Naira shouldn&apos;t mean
                <br />
                watching your savings shrink every quarter.
              </h2>
              <p className="text-base text-[var(--muted-foreground)] leading-relaxed">
                Salaried staff, riders, and freelancers in Nigeria face three
                roadblocks when trying to protect what they earn.
              </p>

              <div className="space-y-4 pt-2">
                <div className="p-4 rounded-2xl bg-[var(--card)] border border-[var(--border)]">
                  <div className="text-sm font-medium text-[var(--foreground)]">
                    1. Manual saving happens too late
                  </div>
                  <p className="text-xs text-[var(--muted-foreground)] mt-1 leading-relaxed">
                    By the time bills and family transfers clear, nothing is left
                    to convert into US Dollars.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-[var(--card)] border border-[var(--border)]">
                  <div className="text-sm font-medium text-[var(--foreground)]">
                    2. Paperwork locks out everyday earners
                  </div>
                  <p className="text-xs text-[var(--muted-foreground)] mt-1 leading-relaxed">
                    Domiciliary bank accounts ask for utility bills, two current-account
                    referees, and minimum deposits.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-[var(--card)] border border-[var(--border)]">
                  <div className="text-sm font-medium text-[var(--foreground)]">
                    3. Street-level phone theft drains accounts
                  </div>
                  <p className="text-xs text-[var(--muted-foreground)] mt-1 leading-relaxed">
                    A stolen SIM or forced sign-in on an unknown phone can empty
                    months of savings in a single transfer.
                  </p>
                </div>
              </div>
            </div>

            {/* Custom Architectural SVG Diagram comparing Unprotected Naira vs Duro Split */}
            <div className="lg:col-span-6">
              <div className="rounded-3xl bg-[var(--card)] border border-[var(--border)] p-6 sm:p-8 space-y-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-[var(--foreground)]">
                    Purchasing Power Path
                  </span>
                  <span className="text-xs font-mono text-[var(--subtle)]">
                    Payday → Month 3
                  </span>
                </div>

                <svg
                  viewBox="0 0 460 240"
                  className="w-full h-auto"
                  role="img"
                  aria-label="Comparison showing Duro automatic US Dollar split preserving savings vs unprotected Naira balance"
                >
                  {/* Grid lines */}
                  <line x1="30" y1="40" x2="430" y2="40" stroke="var(--border)" strokeDasharray="4 4" />
                  <line x1="30" y1="115" x2="430" y2="115" stroke="var(--border)" strokeDasharray="4 4" />
                  <line x1="30" y1="190" x2="430" y2="190" stroke="var(--border)" />

                  {/* Duro protected path (steady upward/firm line) */}
                  <path
                    d="M 40 140 C 140 120, 260 85, 420 58"
                    fill="none"
                    stroke="var(--brand)"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                  <circle cx="420" cy="58" r="5" fill="var(--brand)" />

                  {/* Unprotected manual path (draining line) */}
                  <path
                    d="M 40 140 C 150 152, 270 172, 420 184"
                    fill="none"
                    stroke="var(--subtle)"
                    strokeWidth="2"
                    strokeDasharray="6 6"
                    strokeLinecap="round"
                  />
                  <circle cx="420" cy="184" r="4" fill="var(--subtle)" />

                  {/* Labels */}
                  <rect x="268" y="28" width="144" height="24" rx="12" fill="var(--muted)" />
                  <text x="340" y="44" textAnchor="middle" fontSize="10" fill="var(--brand)" fontFamily="var(--font-dm-sans)">
                    Duro Auto-Save (15% USD)
                  </text>

                  <text x="335" y="172" textAnchor="middle" fontSize="10" fill="var(--subtle)" fontFamily="var(--font-dm-sans)">
                    Unprotected cash balance
                  </text>
                </svg>

                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-[var(--border)] text-xs">
                  <div>
                    <div className="text-[var(--subtle)]">Account requirement</div>
                    <div className="font-medium text-[var(--foreground)] mt-0.5">
                      11-digit NIN + live selfie only
                    </div>
                  </div>
                  <div>
                    <div className="text-[var(--subtle)]">Default payday rule</div>
                    <div className="font-mono font-medium text-[var(--foreground)] mt-0.5">
                      85% NGN Spend / 15% USD Save
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 4. Solution Bento Grid (4 Asymmetric Cards with Custom SVGs) */}
        <section
          id="solution"
          className="py-16 sm:py-24 px-5 sm:px-8 border-b border-[var(--border)]"
        >
          <div className="max-w-5xl mx-auto space-y-12">
            <div className="max-w-2xl space-y-3">
              <span className="inline-block text-xs font-mono uppercase tracking-wider text-[var(--muted-foreground)]">
                How Duro works
              </span>
              <h2
                className="text-3xl sm:text-4xl font-normal text-[var(--foreground)] leading-[1.12]"
                style={{ fontFamily: "var(--font-serif)" }}
              >
                Four guardrails that make your
                <br />
                income stand firm.
              </h2>
              <p className="text-base text-[var(--muted-foreground)]">
                Every deposit, family payout, rent statement, and device check
                runs on licensed Nigerian payment rails.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* Bento Card 1 (7 cols): Automatic Salary Split */}
              <div className="lg:col-span-7 rounded-3xl bg-[var(--card)] border border-[var(--border)] p-6 sm:p-8 flex flex-col justify-between gap-6">
                <div className="space-y-2.5">
                  <span className="inline-flex items-center px-3 py-1 rounded-full bg-[var(--muted)] text-xs font-mono text-[var(--foreground)]">
                    01 · Payday Split
                  </span>
                  <h3 className="text-xl font-medium text-[var(--foreground)]">
                    Save in US Dollars before you spend a kobo
                  </h3>
                  <p className="text-sm text-[var(--muted-foreground)] leading-relaxed">
                    Receive your salary or POS agent deposit into a Providus Bank
                    account. Duro keeps 85% in Naira Spend and moves 15% into US
                    Dollar Save automatically.
                  </p>
                </div>

                {/* Custom Flow Illustration */}
                <div className="rounded-2xl bg-[var(--background)] border border-[var(--border)] p-4">
                  <svg
                    viewBox="0 0 480 110"
                    className="w-full h-auto"
                    role="img"
                    aria-label="Inflow split diagram"
                  >
                    <rect x="10" y="33" width="130" height="44" rx="12" fill="var(--card)" stroke="var(--border)" />
                    <text x="75" y="52" textAnchor="middle" fontSize="10" fill="var(--subtle)" fontFamily="var(--font-dm-sans)">
                      Salary / POS Inflow
                    </text>
                    <text x="75" y="67" textAnchor="middle" fontSize="11" fill="var(--foreground)" fontFamily="var(--font-jetbrains-mono)">
                      ₦150,000
                    </text>

                    <path d="M 140 55 C 185 55, 195 26, 245 26" fill="none" stroke="var(--foreground)" strokeWidth="1.5" />
                    <path d="M 140 55 C 185 55, 195 84, 245 84" fill="none" stroke="var(--brand)" strokeWidth="2" />

                    <rect x="245" y="6" width="220" height="40" rx="12" fill="var(--card)" stroke="var(--border)" />
                    <text x="262" y="30" fontSize="11" fill="var(--foreground)" fontFamily="var(--font-jetbrains-mono)">
                      85% Naira Spend · ₦127,500
                    </text>

                    <rect x="245" y="64" width="220" height="40" rx="12" fill="var(--brand)" />
                    <text x="262" y="88" fontSize="11" fill="var(--brand-foreground)" fontFamily="var(--font-jetbrains-mono)">
                      15% Dollar Save · $14.12 USD
                    </text>
                  </svg>
                </div>
              </div>

              {/* Bento Card 2 (5 cols): Transparent NIP Bank Payouts */}
              <div className="lg:col-span-5 rounded-3xl bg-[var(--card)] border border-[var(--border)] p-6 sm:p-8 flex flex-col justify-between gap-6">
                <div className="space-y-2.5">
                  <span className="inline-flex items-center px-3 py-1 rounded-full bg-[var(--muted)] text-xs font-mono text-[var(--foreground)]">
                    02 · Pre-Send Quote
                  </span>
                  <h3 className="text-xl font-medium text-[var(--foreground)]">
                    Exact bank fees shown before you send
                  </h3>
                  <p className="text-sm text-[var(--muted-foreground)] leading-relaxed">
                    Send Naira to any Nigerian bank with a clear quote upfront:
                    ₦200 transfer fee plus ₦15 VAT (₦215 total) and a 4-stage NIP
                    delivery tracker.
                  </p>
                </div>

                <div className="rounded-2xl bg-[var(--background)] border border-[var(--border)] p-4 space-y-2.5 text-xs font-mono">
                  <div className="flex justify-between text-[var(--muted-foreground)]">
                    <span>Recipient gets (Mama · GTBank)</span>
                    <span className="text-[var(--foreground)]">₦20,000.00</span>
                  </div>
                  <div className="flex justify-between text-[var(--muted-foreground)]">
                    <span>Busha NIP fee + 7.5% VAT</span>
                    <span className="text-[var(--foreground)]">₦215.00</span>
                  </div>
                  <div className="pt-2 border-t border-[var(--border)] flex justify-between font-medium text-[var(--foreground)]">
                    <span>Total Naira Spend debit</span>
                    <span>₦20,215.00</span>
                  </div>
                </div>
              </div>

              {/* Bento Card 3 (5 cols): Dollar-Backed Credit & Statements */}
              <div className="lg:col-span-5 rounded-3xl bg-[var(--card)] border border-[var(--border)] p-6 sm:p-8 flex flex-col justify-between gap-6">
                <div className="space-y-2.5">
                  <span className="inline-flex items-center px-3 py-1 rounded-full bg-[var(--muted)] text-xs font-mono text-[var(--foreground)]">
                    03 · Credit &amp; Statements
                  </span>
                  <h3 className="text-xl font-medium text-[var(--foreground)]">
                    Borrow Naira for rent without selling your Dollars
                  </h3>
                  <p className="text-sm text-[var(--muted-foreground)] leading-relaxed">
                    Export a verified cash-flow statement for Lagos landlords, or
                    lock your US Dollars at 150% coverage to receive an instant
                    Naira advance.
                  </p>
                </div>

                <div className="rounded-2xl bg-[var(--background)] border border-[var(--border)] p-4 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[var(--muted-foreground)]">Collateral coverage</span>
                    <span className="px-2.5 py-0.5 rounded-full bg-[var(--status-warning-subtle)] text-[var(--status-warning)] font-mono">
                      150% USD Locked
                    </span>
                  </div>
                  <div className="w-full h-2.5 rounded-full bg-[var(--muted)] overflow-hidden">
                    <div className="w-2/3 h-full rounded-full bg-[var(--brand)]" />
                  </div>
                  <div className="flex justify-between text-xs font-mono text-[var(--muted-foreground)]">
                    <span>$47.09 USD kept intact</span>
                    <span className="text-[var(--foreground)]">→ ₦50,000 NGN Advance</span>
                  </div>
                </div>
              </div>

              {/* Bento Card 4 (7 cols): 24-Hour Anti-Coercion Lock */}
              <div className="lg:col-span-7 rounded-3xl bg-[var(--brand)] text-[var(--brand-foreground)] p-6 sm:p-8 flex flex-col justify-between gap-6">
                <div className="space-y-2.5">
                  <span className="inline-flex items-center px-3 py-1 rounded-full bg-[var(--accent)] text-[var(--brand)] text-xs font-mono font-medium">
                    04 · 24-Hour Anti-Coercion Lock
                  </span>
                  <h3 className="text-xl font-medium">
                    Built for lost phones and street-level safety
                  </h3>
                  <p className="text-sm opacity-85 leading-relaxed">
                    Sign-ins on an unrecognized device freeze US Dollar
                    withdrawals and new bank recipients for 24 hours—even under
                    coercion—while keeping pre-saved Trusted Accounts open for
                    family emergencies.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3.5 rounded-2xl bg-[var(--background)] text-[var(--foreground)] space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">New Beneficiary / USD Out</span>
                      <span className="px-2 py-0.5 rounded-full bg-[var(--status-danger-subtle)] text-[var(--status-danger)] font-mono">
                        Frozen 24h
                      </span>
                    </div>
                    <p className="text-[var(--muted-foreground)]">
                      Cannot be bypassed with a selfie on an unknown phone
                    </p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-[var(--background)] text-[var(--foreground)] space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Saved Trusted Accounts</span>
                      <span className="px-2 py-0.5 rounded-full bg-[var(--status-success-subtle)] text-[var(--status-success)] font-mono">
                        Allowed
                      </span>
                    </div>
                    <p className="text-[var(--muted-foreground)]">
                      Pre-verified family accounts still receive normal amounts
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 5. Pricing / Fee Schedule */}
        <section
          id="fees"
          className="py-16 sm:py-24 px-5 sm:px-8 border-b border-[var(--border)]"
        >
          <div className="max-w-5xl mx-auto space-y-12">
            <div className="max-w-2xl space-y-3">
              <span className="inline-block text-xs font-mono uppercase tracking-wider text-[var(--muted-foreground)]">
                Plain fee schedule
              </span>
              <h2
                className="text-3xl sm:text-4xl font-normal text-[var(--foreground)] leading-[1.12]"
                style={{ fontFamily: "var(--font-serif)" }}
              >
                No monthly maintenance fees.
                <br />
                You only pay when sending to a bank.
              </h2>
              <p className="text-base text-[var(--muted-foreground)]">
                Every fee comes directly from a live Busha quote before you
                confirm a transfer.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Fee Card 1 */}
              <div className="rounded-3xl bg-[var(--card)] border border-[var(--border)] p-6 sm:p-8 flex flex-col justify-between space-y-6">
                <div className="space-y-4">
                  <div className="flex items-baseline justify-between gap-2">
                    <h3 className="text-lg font-medium text-[var(--foreground)]">
                      Everyday Wallet &amp; Auto-Save
                    </h3>
                    <span className="px-3 py-1 rounded-full bg-[var(--muted)] text-xs font-mono text-[var(--foreground)]">
                      Included
                    </span>
                  </div>

                  <div className="flex items-baseline gap-1.5">
                    <span
                      className="text-4xl font-normal font-mono text-[var(--foreground)]"
                    >
                      ₦0
                    </span>
                    <span className="text-xs text-[var(--muted-foreground)]">
                      / month
                    </span>
                  </div>

                  <p className="text-sm text-[var(--muted-foreground)]">
                    Open with your 11-digit NIN and a quick selfie check.
                  </p>

                  <ul className="space-y-3 pt-2 text-sm text-[var(--foreground)]">
                    <li className="flex items-start gap-2.5">
                      <CheckDotIcon />
                      <span>₦0 account opening or minimum balance</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <CheckDotIcon />
                      <span>Automatic 15% (or custom 0%–90%) split into US Dollars</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <CheckDotIcon />
                      <span>Instant moves between Naira Spend and Dollar Save at live rates</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <CheckDotIcon />
                      <span>Verified PDF cash-flow statements for landlords</span>
                    </li>
                  </ul>
                </div>

                <button
                  type="button"
                  onClick={onOpenAccount}
                  className="btn-slide w-full h-11 rounded-full bg-[var(--brand)] text-[var(--brand-foreground)] text-xs font-medium inline-flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Open Your Wallet</span>
                  <ArrowSlideIcon />
                </button>
              </div>

              {/* Fee Card 2 */}
              <div className="rounded-3xl bg-[var(--card)] border border-[var(--border)] p-6 sm:p-8 flex flex-col justify-between space-y-6">
                <div className="space-y-4">
                  <div className="flex items-baseline justify-between gap-2">
                    <h3 className="text-lg font-medium text-[var(--foreground)]">
                      External Bank Payouts &amp; Credit
                    </h3>
                    <span className="px-3 py-1 rounded-full bg-[var(--muted)] text-xs font-mono text-[var(--foreground)]">
                      Pay per payout
                    </span>
                  </div>

                  <div className="flex items-baseline gap-1.5">
                    <span className="text-4xl font-normal font-mono text-[var(--foreground)]">
                      ₦215
                    </span>
                    <span className="text-xs text-[var(--muted-foreground)]">
                      / bank transfer (₦200 + ₦15 VAT)
                    </span>
                  </div>

                  <p className="text-sm text-[var(--muted-foreground)]">
                    Flat NIP bank payout fee quoted before you approve any transfer.
                  </p>

                  <ul className="space-y-3 pt-2 text-sm text-[var(--foreground)]">
                    <li className="flex items-start gap-2.5">
                      <CheckDotIcon />
                      <span>₦200.00 base NIP payout fee + ₦15.00 (7.5% VAT)</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <CheckDotIcon />
                      <span>4-stage live bank delivery status timeline</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <CheckDotIcon />
                      <span>Dollar-backed Naira advances at 150% collateral coverage</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <CheckDotIcon />
                      <span>Pre-saved Trusted Accounts exempt from 24-hour device lock</span>
                    </li>
                  </ul>
                </div>

                <button
                  type="button"
                  onClick={onSignIn}
                  className="btn-slide w-full h-11 rounded-full bg-[var(--muted)] border border-[var(--border)] text-[var(--foreground)] text-xs font-medium inline-flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Try Live Demo Account</span>
                  <ArrowSlideIcon />
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* 6. Calm FAQ (Narrow Column, Plain Dividers, First Answer Open) */}
        <section
          id="faq"
          className="py-16 sm:py-24 px-5 sm:px-8 border-b border-[var(--border)]"
        >
          <div className="max-w-2xl mx-auto space-y-10">
            <div className="space-y-2">
              <span className="inline-block text-xs font-mono uppercase tracking-wider text-[var(--muted-foreground)]">
                Common questions
              </span>
              <h2
                className="text-3xl sm:text-4xl font-normal text-[var(--foreground)] leading-[1.12]"
                style={{ fontFamily: "var(--font-serif)" }}
              >
                Straight answers before
                <br />
                you open an account.
              </h2>
            </div>

            <div className="divide-y divide-[var(--border)] border-y border-[var(--border)]">
              {FAQ_ITEMS.map((item, idx) => {
                const isOpen = openFaqIndex === idx;
                return (
                  <div key={item.q} className="py-5">
                    <button
                      type="button"
                      onClick={() => setOpenFaqIndex(isOpen ? -1 : idx)}
                      aria-expanded={isOpen}
                      className="w-full flex items-center justify-between gap-4 text-left text-base font-medium text-[var(--foreground)] cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)]"
                    >
                      <span>{item.q}</span>
                      <span className="text-lg font-mono text-[var(--muted-foreground)] shrink-0">
                        {isOpen ? "−" : "+"}
                      </span>
                    </button>
                    {isOpen && (
                      <p className="text-sm text-[var(--muted-foreground)] mt-3 leading-relaxed">
                        {item.a}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* 7. Bottom CTA (Reuses Hero Grid Surface, 2 Lines Max, One Button) */}
        <section className="duro-grid-surface py-20 sm:py-28 px-5 sm:px-8 border-b border-[var(--border)]">
          <div className="max-w-2xl mx-auto text-center space-y-6">
            <h2
              className="text-3xl sm:text-5xl font-normal text-[var(--foreground)] leading-[1.08]"
              style={{ fontFamily: "var(--font-serif)" }}
            >
              Give your Naira earnings a place
              <br />
              to stand firm.
            </h2>
            <p className="text-base text-[var(--muted-foreground)] max-w-lg mx-auto">
              Open your Duro wallet in 60 seconds with your 11-digit NIN—or sign
              in to test the live demo.
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={onOpenAccount}
                className="btn-slide h-12 px-8 rounded-full bg-[var(--brand)] text-[var(--brand-foreground)] text-sm font-medium inline-flex items-center gap-2 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)]"
              >
                <span>Open Your Wallet</span>
                <ArrowSlideIcon />
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* 8. Footer (4 Columns Max, Social Icons Under Logo) */}
      <footer className="bg-[var(--background)] py-14 px-5 sm:px-8">
        <div className="max-w-5xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Col 1: Brand + Social Icons */}
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-full bg-[var(--brand)] text-[var(--brand-foreground)] inline-flex items-center justify-center text-xs font-medium">
                D
              </span>
              <span className="text-base font-medium text-[var(--foreground)]">
                Duro
              </span>
            </div>
            <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">
              One wallet, two balances. Spend Naira daily and automatically save
              in US Dollars.
            </p>
            <div className="flex items-center gap-3 pt-1 text-[var(--muted-foreground)]">
              <a
                href="https://github.com/Demilade01/duro"
                target="_blank"
                rel="noreferrer"
                aria-label="Duro GitHub repository"
                className="w-8 h-8 rounded-full bg-[var(--muted)] border border-[var(--border)] inline-flex items-center justify-center hover:text-[var(--foreground)]"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                </svg>
              </a>
            </div>
          </div>

          {/* Col 2: Navigation */}
          <div className="space-y-2.5 text-xs">
            <div className="font-medium text-[var(--foreground)]">Product</div>
            <ul className="space-y-2 text-[var(--muted-foreground)]">
              <li>
                <a href="#problem" className="hover:text-[var(--foreground)]">
                  Why Duro
                </a>
              </li>
              <li>
                <a href="#solution" className="hover:text-[var(--foreground)]">
                  How It Works
                </a>
              </li>
              <li>
                <a href="#fees" className="hover:text-[var(--foreground)]">
                  Fee Schedule
                </a>
              </li>
              <li>
                <a href="#faq" className="hover:text-[var(--foreground)]">
                  Common Questions
                </a>
              </li>
            </ul>
          </div>

          {/* Col 3: Security & Rails */}
          <div className="space-y-2.5 text-xs">
            <div className="font-medium text-[var(--foreground)]">Guardrails</div>
            <ul className="space-y-2 text-[var(--muted-foreground)]">
              <li>NIMC 11-Digit NIN Verification</li>
              <li>24-Hour Anti-Coercion Device Lock</li>
              <li>Pre-Verified Trusted Beneficiaries</li>
              <li>150% Collateral Rent Advances</li>
            </ul>
          </div>

          {/* Col 4: System & Legal */}
          <div className="space-y-2.5 text-xs">
            <div className="font-medium text-[var(--foreground)]">System</div>
            <ul className="space-y-2 text-[var(--muted-foreground)]">
              <li>
                <Link
                  href="/design-system"
                  className="hover:text-[var(--foreground)] underline underline-offset-4"
                >
                  Design System &amp; Tokens
                </Link>
              </li>
              <li>Powered by Busha Sandbox v1</li>
              <li>Lagos, Nigeria</li>
            </ul>
          </div>
        </div>
      </footer>
    </div>
  );
}
