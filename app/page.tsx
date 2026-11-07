"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  ChevronDown,
  ChevronUp,
  Lock,
  Plus,
  Send,
  Shield,
  SlidersHorizontal,
  Wallet,
} from "lucide-react";
import { useDuro } from "@/components/duro-context";
import type { ConversionDirection, Transaction } from "@/lib/api-types";

export default function HomePage() {
  const {
    wallet,
    updateAutoSavePercent,
    moveBetweenBalances,
  } = useDuro();

  const [splitDraft, setSplitDraft] = useState<number | null>(null);
  const [savingSplit, setSavingSplit] = useState(false);

  // Move funds inline drawer
  const [showMovePanel, setShowMovePanel] = useState(false);
  const [direction, setDirection] =
    useState<ConversionDirection>("SPEND_TO_SAVE");
  const [moveAmount, setMoveAmount] = useState<string>("15000");
  const [moving, setMoving] = useState(false);
  const [moveError, setMoveError] = useState<string | null>(null);

  const [expandedTxId, setExpandedTxId] = useState<string | null>(null);

  if (!wallet) return null;

  const fxRate = wallet.rate.usdNgn;
  const spendNgn = wallet.balances?.spend.available ?? 0;
  const saveUsdc = wallet.balances?.save.available ?? 0;
  const lockedUsdc = wallet.balances?.save.locked ?? 0;
  const totalSaveUsdc = wallet.balances?.save.total ?? 0;
  const saveNgnEquivalent = wallet.balances?.save.ngnEquivalent ?? 0;
  const totalPortfolioNgn = Math.round(spendNgn + saveNgnEquivalent);

  const currentSplit = splitDraft ?? wallet.profile.autoSavePercent;
  const isLocked = wallet.lock.active;

  const handleSaveSplit = async (pct: number) => {
    setSplitDraft(pct);
    setSavingSplit(true);
    try {
      await updateAutoSavePercent(pct);
    } finally {
      setSavingSplit(false);
      setSplitDraft(null);
    }
  };

  const handleMoveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMoveError(null);
    const amount = Number(moveAmount);
    if (!amount || amount <= 0) {
      setMoveError("Please enter an amount greater than zero.");
      return;
    }
    setMoving(true);
    try {
      await moveBetweenBalances(direction, amount);
      setShowMovePanel(false);
    } catch (err) {
      setMoveError(
        err instanceof Error ? err.message : "Could not move funds.",
      );
    } finally {
      setMoving(false);
    }
  };

  const renderTxBadge = (tx: Transaction) => {
    if (tx.kind === "DEPOSIT" || tx.kind === "PLEDGE_ADVANCE") {
      return (
        <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-200 text-[#0A3622] flex items-center justify-center shrink-0">
          <ArrowDownLeft className="w-4 h-4" />
        </div>
      );
    }
    if (tx.kind === "AUTO_SAVE" || tx.kind === "CONVERSION") {
      return (
        <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 flex items-center justify-center shrink-0">
          <Shield className="w-4 h-4" />
        </div>
      );
    }
    return (
      <div className="w-10 h-10 rounded-2xl bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center shrink-0">
        <ArrowUpRight className="w-4 h-4" />
      </div>
    );
  };

  const formatTxAmount = (tx: Transaction) => {
    const amt = Number(tx.amount);
    if (tx.currency === "USDC") {
      return {
        text: `+$${amt.toFixed(2)}`,
        className: "text-[#0A3622]",
      };
    }
    if (tx.direction === "IN" || tx.direction === "INTERNAL") {
      return {
        text: `+₦${amt.toLocaleString("en-NG")}`,
        className: "text-[#0A3622]",
      };
    }
    return {
      text: `-₦${amt.toLocaleString("en-NG")}`,
      className: "text-slate-900",
    };
  };

  return (
    <div className="space-y-6">
      {/* Page Greeting */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1
            className="text-2xl font-bold text-slate-900"
            style={{ fontFamily: "var(--font-jakarta)" }}
          >
            Good day, {wallet.profile.firstName}
          </h1>
          <p className="text-sm text-slate-600">
            Here is your Naira spending and US Dollar savings overview.
          </p>
        </div>

        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-[#E4E7DF] text-xs font-medium text-slate-700 self-start sm:self-auto">
          <span className="w-2 h-2 rounded-full bg-emerald-600" />
          <span>Rate: $1 = ₦{fxRate.toLocaleString("en-NG")}</span>
        </div>
      </div>

      {/* Hero Total Balance Card */}
      <div className="rounded-3xl bg-[#0A3622] text-white p-6 sm:p-7 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
          <div>
            <span className="text-xs font-medium text-emerald-200/90 uppercase tracking-wider">
              Total Combined Balance
            </span>
            <div
              className="text-3xl sm:text-4xl font-bold tracking-tight font-mono tabular-nums mt-1.5"
              style={{ fontFamily: "var(--font-jakarta)" }}
            >
              ₦{totalPortfolioNgn.toLocaleString("en-NG")}
            </div>
            <p className="text-xs text-emerald-100/80 mt-2">
              {wallet.profile.autoSavePercent}% of every incoming deposit is
              automatically protected in US Dollars.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Link
              href="/fund"
              className="h-11 px-4 rounded-xl bg-white hover:bg-emerald-50 text-[#0A3622] font-semibold text-xs flex items-center gap-2 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Add Money</span>
            </Link>
            <Link
              href="/send"
              className="h-11 px-4 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/20 font-semibold text-xs flex items-center gap-2 transition-colors"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send Money</span>
            </Link>
            <button
              type="button"
              onClick={() => {
                setShowMovePanel((prev) => !prev);
                setMoveError(null);
              }}
              className="h-11 px-4 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/20 font-semibold text-xs flex items-center gap-2 transition-colors cursor-pointer"
            >
              <ArrowLeftRight className="w-3.5 h-3.5" />
              <span>Move Between Balances</span>
            </button>
          </div>
        </div>
      </div>

      {/* Collapsible Move Between Balances Panel */}
      {showMovePanel && (
        <form
          onSubmit={handleMoveSubmit}
          className="rounded-3xl bg-white border border-[#E4E7DF] p-5 sm:p-6 space-y-4 shadow-xs"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2
                className="text-base font-bold text-slate-900"
                style={{ fontFamily: "var(--font-jakarta)" }}
              >
                Move Money Between Balances
              </h2>
              <p className="text-xs text-slate-500">
                Instant conversion at today&apos;s fixed rate (₦
                {fxRate.toLocaleString("en-NG")} / $1)
              </p>
            </div>

            <div className="inline-flex p-1 rounded-xl bg-[#F7F8F5] border border-[#E4E7DF] self-start">
              <button
                type="button"
                onClick={() => {
                  setDirection("SPEND_TO_SAVE");
                  setMoveAmount("15000");
                  setMoveError(null);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  direction === "SPEND_TO_SAVE"
                    ? "bg-[#0A3622] text-white"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Naira Spend → Dollar Save
              </button>
              <button
                type="button"
                onClick={() => {
                  setDirection("SAVE_TO_SPEND");
                  setMoveAmount("5");
                  setMoveError(null);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  direction === "SAVE_TO_SPEND"
                    ? "bg-[#0A3622] text-white"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Dollar Save → Naira Spend
              </button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative flex-1">
              <input
                type="number"
                step="any"
                min="1"
                value={moveAmount}
                onChange={(e) => setMoveAmount(e.target.value)}
                className="w-full h-12 pl-4 pr-16 rounded-xl bg-[#F7F8F5] border border-[#E4E7DF] text-sm font-mono tabular-nums text-slate-900 focus:outline-none focus:border-[#0A3622] focus:bg-white"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-500">
                {direction === "SPEND_TO_SAVE" ? "NGN" : "USD"}
              </span>
            </div>
            <button
              type="submit"
              disabled={moving}
              className="h-12 px-6 rounded-xl bg-[#0A3622] hover:bg-[#14532D] disabled:opacity-50 text-white font-semibold text-xs whitespace-nowrap cursor-pointer"
            >
              {moving ? "Moving..." : "Confirm Transfer"}
            </button>
          </div>

          <div className="text-xs text-slate-500">
            {direction === "SPEND_TO_SAVE"
              ? `You will add approximately $${(
                  Number(moveAmount || 0) / fxRate
                ).toFixed(2)} to your US Dollar Save balance.`
              : `You will add approximately ₦${Math.round(
                  Number(moveAmount || 0) * fxRate,
                ).toLocaleString("en-NG")} to your Naira Spend balance.`}
          </div>

          {moveError && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-800">
              <span>{moveError}</span>
            </div>
          )}
        </form>
      )}

      {/* Two Balance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Naira Spend Card */}
        <div className="rounded-3xl bg-white border border-[#E4E7DF] p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-[#0A3622] flex items-center justify-center">
                  <Wallet className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-900 block">
                    Naira Spend
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Everyday cash & bank transfers
                  </span>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-[#0A3622] text-[11px] font-semibold">
                NGN
              </span>
            </div>

            <div
              className="mt-5 text-3xl font-bold font-mono tabular-nums text-slate-900"
              style={{ fontFamily: "var(--font-jakarta)" }}
            >
              ₦{spendNgn.toLocaleString("en-NG")}
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-[#E4E7DF] flex items-center justify-between text-xs text-slate-500">
            <span>Available for instant bank transfers</span>
            <Link
              href="/send"
              className="font-semibold text-[#0A3622] hover:underline"
            >
              Send money →
            </Link>
          </div>
        </div>

        {/* US Dollar Save Card */}
        <div className="rounded-3xl bg-white border border-[#E4E7DF] p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                    isLocked
                      ? "bg-rose-50 text-rose-700"
                      : "bg-amber-50 text-amber-800"
                  }`}
                >
                  {isLocked ? (
                    <Lock className="w-4 h-4" />
                  ) : (
                    <Shield className="w-4 h-4" />
                  )}
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-900 block">
                    US Dollar Save
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Inflation-protected savings
                  </span>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-900 text-[11px] font-semibold">
                USD
              </span>
            </div>

            <div className="mt-5 flex items-baseline gap-2.5">
              <span
                className="text-3xl font-bold font-mono tabular-nums text-slate-900"
                style={{ fontFamily: "var(--font-jakarta)" }}
              >
                ${saveUsdc.toFixed(2)}
              </span>
              <span className="text-xs font-mono text-slate-500">
                ≈ ₦{Math.round(saveUsdc * fxRate).toLocaleString("en-NG")}
              </span>
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-[#E4E7DF] flex items-center justify-between text-xs">
            {isLocked ? (
              <span className="text-rose-700 font-semibold">
                Frozen for 24h (New device protection)
              </span>
            ) : lockedUsdc > 0 ? (
              <span className="text-amber-800 font-medium">
                ${lockedUsdc.toFixed(2)} pledged for Rent Advance (Total: $
                {totalSaveUsdc.toFixed(2)})
              </span>
            ) : (
              <span className="text-slate-500">
                Auto-saves {wallet.profile.autoSavePercent}% of every salary
              </span>
            )}
            <Link
              href="/credit"
              className="font-semibold text-[#0A3622] hover:underline whitespace-nowrap"
            >
              Rent advance →
            </Link>
          </div>
        </div>
      </div>

      {/* Automatic Salary Split Card */}
      <div className="rounded-3xl bg-white border border-[#E4E7DF] p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#F7F8F5] border border-[#E4E7DF] text-[#0A3622] flex items-center justify-center">
              <SlidersHorizontal className="w-4 h-4" />
            </div>
            <div>
              <h2
                className="text-sm font-bold text-slate-900"
                style={{ fontFamily: "var(--font-jakarta)" }}
              >
                Automatic Salary Dollar Split
              </h2>
              <p className="text-xs text-slate-500">
                Choose how much of every Naira deposit is automatically saved in
                US Dollars
              </p>
            </div>
          </div>

          <div className="text-xs font-mono font-bold text-[#0A3622] bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-full self-start sm:self-auto">
            {currentSplit}% Save ($) · {100 - currentSplit}% Spend (₦)
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
          <input
            type="range"
            min={0}
            max={50}
            step={5}
            disabled={savingSplit}
            value={currentSplit}
            onChange={(e) => handleSaveSplit(Number(e.target.value))}
            aria-label="Auto-Save Split Percentage"
            className="w-full accent-[#0A3622] cursor-pointer"
          />
          <div className="flex items-center gap-1.5 shrink-0">
            {[10, 15, 25, 30].map((preset) => (
              <button
                key={preset}
                type="button"
                disabled={savingSplit}
                onClick={() => handleSaveSplit(preset)}
                className={`h-9 px-3 rounded-xl text-xs font-mono font-semibold transition-colors cursor-pointer ${
                  currentSplit === preset
                    ? "bg-[#0A3622] text-white"
                    : "bg-[#F7F8F5] text-slate-700 hover:bg-slate-200/70 border border-[#E4E7DF]"
                }`}
              >
                {preset}%
              </button>
            ))}
          </div>
        </div>

        <div className="pt-3 border-t border-[#E4E7DF] flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
          <span>Example on a ₦150,000 monthly salary:</span>
          <span className="font-mono font-semibold text-slate-900">
            ₦{(150_000 * (1 - currentSplit / 100)).toLocaleString("en-NG")} to
            Spend + ${((150_000 * (currentSplit / 100)) / fxRate).toFixed(2)} to
            US Dollar Save
          </span>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="rounded-3xl bg-white border border-[#E4E7DF] overflow-hidden">
        <div className="px-6 py-4 border-b border-[#E4E7DF] flex items-center justify-between">
          <h2
            className="text-sm font-bold text-slate-900"
            style={{ fontFamily: "var(--font-jakarta)" }}
          >
            Recent Activity
          </h2>
          <span className="text-xs text-slate-500">
            {wallet.transactions.length} transactions
          </span>
        </div>

        {wallet.transactions.length === 0 ? (
          <div className="p-8 text-center space-y-3">
            <p className="text-sm font-medium text-slate-700">
              No transactions yet
            </p>
            <p className="text-xs text-slate-500 max-w-xs mx-auto">
              Receive your first salary or POS cash deposit to see your
              automatic Naira & US Dollar split in action.
            </p>
            <Link
              href="/fund"
              className="inline-flex h-10 px-4 rounded-xl bg-[#0A3622] text-white text-xs font-semibold items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Money</span>
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-[#E4E7DF]">
            {wallet.transactions.slice(0, 8).map((tx) => {
              const isExpanded = expandedTxId === tx.id;
              const formatted = formatTxAmount(tx);
              return (
                <div key={tx.id}>
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedTxId(isExpanded ? null : tx.id)
                    }
                    className="w-full px-6 py-4 flex items-center justify-between gap-3 text-left hover:bg-[#F7F8F5]/60 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      {renderTxBadge(tx)}
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-slate-900 truncate">
                          {tx.description}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
                          <span>
                            {new Date(tx.createdAt).toLocaleDateString("en-NG", {
                              month: "short",
                              day: "numeric",
                            })}
                          </span>
                          <span>·</span>
                          <span className="capitalize">
                            {tx.status.replace(/_/g, " ")}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0">
                      <div className="text-right">
                        <div
                          className={`text-sm font-mono tabular-nums font-bold ${formatted.className}`}
                        >
                          {formatted.text}
                        </div>
                        {tx.counterAmount != null &&
                          tx.counterCurrency &&
                          tx.counterCurrency !== tx.currency && (
                            <div className="text-[11px] font-mono text-slate-400">
                              from{" "}
                              {tx.counterCurrency === "USDC"
                                ? `$${Number(tx.counterAmount).toFixed(2)}`
                                : `₦${Number(tx.counterAmount).toLocaleString("en-NG")}`}
                            </div>
                          )}
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-slate-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                      )}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="px-6 py-3.5 bg-[#F7F8F5] border-t border-[#E4E7DF] text-xs space-y-1.5 text-slate-600">
                      <div className="flex justify-between">
                        <span>Status</span>
                        <span className="font-semibold text-emerald-800 capitalize">
                          {tx.status.replace(/_/g, " ")}
                        </span>
                      </div>
                      {tx.bushaTransferId && (
                        <div className="flex justify-between">
                          <span>Reference</span>
                          <span className="font-mono text-slate-800">
                            {tx.bushaTransferId}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span>Date & Time</span>
                        <span className="font-mono text-slate-800">
                          {new Date(tx.createdAt).toLocaleString("en-NG")}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
