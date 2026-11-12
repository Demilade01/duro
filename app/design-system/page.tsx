"use client";

import React, { useState } from "react";
import Link from "next/link";

const COLOUR_TOKENS = [
  { name: "--background", role: "Primary page canvas", bgClass: "bg-[var(--background)]", textClass: "text-[var(--foreground)]" },
  { name: "--card", role: "Elevated cards & bento surfaces", bgClass: "bg-[var(--card)]", textClass: "text-[var(--foreground)]" },
  { name: "--muted", role: "Secondary wells & pill tracks", bgClass: "bg-[var(--muted)]", textClass: "text-[var(--foreground)]" },
  { name: "--border", role: "Hairline dividers & outlines", bgClass: "bg-[var(--border)]", textClass: "text-[var(--foreground)]" },
  { name: "--foreground", role: "Primary headings & body copy", bgClass: "bg-[var(--foreground)]", textClass: "text-[var(--background)]" },
  { name: "--muted-foreground", role: "Subtitles & secondary text", bgClass: "bg-[var(--muted-foreground)]", textClass: "text-[var(--background)]" },
  { name: "--subtle", role: "Captions & metadata", bgClass: "bg-[var(--subtle)]", textClass: "text-[var(--background)]" },
  { name: "--brand", role: "Primary actions & dark bento", bgClass: "bg-[var(--brand)]", textClass: "text-[var(--brand-foreground)]" },
  { name: "--accent", role: "Highlight pill on dark brand surface", bgClass: "bg-[var(--accent)]", textClass: "text-[var(--brand)]" },
  { name: "--status-success", role: "Verified KYC & delivered payout", bgClass: "bg-[var(--status-success)]", textClass: "text-[var(--brand-foreground)]" },
  { name: "--status-warning", role: "Pending deposit & collateral lock", bgClass: "bg-[var(--status-warning)]", textClass: "text-[var(--brand-foreground)]" },
  { name: "--status-danger", role: "24-hour anti-coercion lock alert", bgClass: "bg-[var(--status-danger)]", textClass: "text-[var(--brand-foreground)]" },
] as const;

function ArrowSlideIcon() {
  return (
    <svg
      className="btn-slide-icon w-4 h-4"
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

export default function DesignSystemPage() {
  const [activeTab, setActiveTab] = useState<"SPEND" | "SAVE">("SPEND");
  const [splitPercent, setSplitPercent] = useState<number>(15);

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] py-12 px-5 sm:px-8">
      <div className="max-w-5xl mx-auto space-y-16">
        {/* Top bar */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-8 border-b border-[var(--border)]">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--muted)] border border-[var(--border)] text-xs font-medium text-[var(--muted-foreground)]">
              <span>Duro Design System</span>
            </div>
            <h1
              className="text-3xl sm:text-4xl font-normal tracking-tight text-[var(--foreground)]"
              style={{ fontFamily: "var(--font-serif)" }}
            >
              Tokens &amp; primitives
            </h1>
            <p className="text-sm text-[var(--muted-foreground)] max-w-2xl">
              These are the tokens and components Duro is built from; changes happen here first.
            </p>
          </div>
          <Link
            href="/landing"
            className="btn-slide inline-flex items-center gap-2 h-11 px-5 rounded-full bg-[var(--brand)] text-[var(--brand-foreground)] text-sm font-medium self-start focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)]"
          >
            <span>View Landing Page</span>
            <ArrowSlideIcon />
          </Link>
        </header>

        {/* 1. Colours */}
        <section className="space-y-5">
          <h2
            className="text-2xl font-normal text-[var(--foreground)]"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            1. Colour tokens
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {COLOUR_TOKENS.map((t) => (
              <div
                key={t.name}
                className="rounded-3xl bg-[var(--card)] border border-[var(--border)] p-4 flex items-center gap-3.5"
              >
                <div
                  className={`w-12 h-12 rounded-2xl border border-[var(--border)] shrink-0 flex items-center justify-center text-xs font-mono ${t.bgClass} ${t.textClass}`}
                >
                  Aa
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-mono font-medium text-[var(--foreground)]">
                    {t.name}
                  </div>
                  <div className="text-xs text-[var(--muted-foreground)] mt-0.5">
                    {t.role}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 2. Typography */}
        <section className="space-y-5">
          <h2
            className="text-2xl font-normal text-[var(--foreground)]"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            2. Typography scale (Regular 400 &amp; Medium 500 only)
          </h2>
          <div className="rounded-3xl bg-[var(--card)] border border-[var(--border)] divide-y divide-[var(--border)]">
            <div className="p-6 space-y-1">
              <span className="text-xs font-mono text-[var(--subtle)]">
                Display · Instrument Serif Regular 400
              </span>
              <p
                className="text-4xl sm:text-5xl font-normal tracking-tight text-[var(--foreground)]"
                style={{ fontFamily: "var(--font-serif)" }}
              >
                Spend in Naira. Save automatically in US Dollars.
              </p>
            </div>
            <div className="p-6 space-y-1">
              <span className="text-xs font-mono text-[var(--subtle)]">
                Heading (32px) · Instrument Serif Regular 400
              </span>
              <p
                className="text-3xl font-normal text-[var(--foreground)]"
                style={{ fontFamily: "var(--font-serif)" }}
              >
                Four guardrails that make your income stand firm.
              </p>
            </div>
            <div className="p-6 space-y-1">
              <span className="text-xs font-mono text-[var(--subtle)]">
                Body (16px) · DM Sans Regular 400 / Medium 500
              </span>
              <p className="text-base font-normal text-[var(--muted-foreground)] max-w-2xl">
                Every time your salary or POS cash-in lands, Duro moves a set percentage straight into US Dollars—no utility bill or crypto jargon required.
              </p>
            </div>
            <div className="p-6 space-y-1">
              <span className="text-xs font-mono text-[var(--subtle)]">
                Caption &amp; Ledger Mono (12px) · JetBrains Mono Regular 400
              </span>
              <p className="text-xs font-mono text-[var(--foreground)]">
                ₦150,000.00 INFLOW → ₦127,500.00 SPEND (85%) + $14.12 SAVE (15% @ ₦1,593.00/$1)
              </p>
            </div>
          </div>
        </section>

        {/* 3. Buttons, Tabs & Controls */}
        <section className="space-y-5">
          <h2
            className="text-2xl font-normal text-[var(--foreground)]"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            3. Buttons, segmented tabs &amp; controls (fully rounded)
          </h2>
          <div className="rounded-3xl bg-[var(--card)] border border-[var(--border)] p-6 space-y-6">
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                className="btn-slide h-11 px-6 rounded-full bg-[var(--brand)] text-[var(--brand-foreground)] text-sm font-medium inline-flex items-center gap-2 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)]"
              >
                <span>Open Your Wallet</span>
                <ArrowSlideIcon />
              </button>

              <button
                type="button"
                className="btn-slide h-11 px-6 rounded-full bg-[var(--muted)] border border-[var(--border)] text-[var(--foreground)] text-sm font-medium inline-flex items-center gap-2 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)]"
              >
                <span>Sign In to Existing Account</span>
                <ArrowSlideIcon />
              </button>

              <div className="inline-flex p-1 rounded-full bg-[var(--muted)] border border-[var(--border)]">
                {(["SPEND", "SAVE"] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveTab(tab)}
                    className={`h-9 px-4 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                      activeTab === tab
                        ? "bg-[var(--brand)] text-[var(--brand-foreground)]"
                        : "text-[var(--muted-foreground)]"
                    }`}
                  >
                    {tab === "SPEND" ? "Naira Spend" : "US Dollar Save"}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-xs font-medium text-[var(--foreground)] mb-1.5">
                  Email or Nigerian phone number
                </label>
                <input
                  type="text"
                  defaultValue="tunde.bakare@duro.app"
                  className="w-full h-11 px-4 rounded-2xl bg-[var(--background)] border border-[var(--border)] text-sm text-[var(--foreground)] focus:outline-none focus:border-[var(--brand)]"
                />
              </div>
              <div>
                <div className="flex items-center justify-between text-xs font-medium text-[var(--foreground)] mb-1.5">
                  <span>Auto-Save Split Rule</span>
                  <span className="font-mono">{splitPercent}% to US Dollars</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={50}
                  step={5}
                  value={splitPercent}
                  onChange={(e) => setSplitPercent(Number(e.target.value))}
                  className="w-full accent-[var(--brand)] cursor-pointer mt-2"
                />
              </div>
            </div>
          </div>
        </section>

        {/* 4. Status Chips & Feedback */}
        <section className="space-y-5">
          <h2
            className="text-2xl font-normal text-[var(--foreground)]"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            4. Status tokens &amp; feedback banners
          </h2>
          <div className="rounded-3xl bg-[var(--card)] border border-[var(--border)] p-6 space-y-4">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--status-success-subtle)] text-[var(--status-success)] text-xs font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--status-success)]" />
                <span>NIMC Tier 3 Verified</span>
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--status-warning-subtle)] text-[var(--status-warning)] text-xs font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--status-warning)]" />
                <span>150% Collateral Locked</span>
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--status-danger-subtle)] text-[var(--status-danger)] text-xs font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--status-danger)]" />
                <span>24-Hour Anti-Coercion Lock Active</span>
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-[var(--status-danger-subtle)] border border-[var(--border)] text-xs text-[var(--status-danger)]">
              24-Hour Anti-Coercion Lock Active: Sign-ins on an unrecognized device freeze US Dollar withdrawals and new bank recipients for 24 hours while keeping pre-saved Trusted Accounts open.
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
