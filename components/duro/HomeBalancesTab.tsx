"use client";

import React, { useState } from "react";
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
import { WalletStateResponse, WalletTab, WalletTransaction } from "@/lib/types";

interface HomeBalancesTabProps {
  wallet: WalletStateResponse;
  onNavigateTab: (tab: WalletTab) => void;
  onUpdateSplitOrSwap: (payload: {
    autoSavePercent?: number;
    swap?: { direction: "CNGN_TO_USDC" | "USDC_TO_CNGN"; amount: number };
  }) => Promise<{ error?: string }>;
  onOpenRecoveryModal: () => void;
}

export default function HomeBalancesTab({
  wallet,
  onNavigateTab,
  onUpdateSplitOrSwap,
  onOpenRecoveryModal,
}: HomeBalancesTabProps) {
  const { balances, user, transactions, security } = wallet;
  const fxRate = balances.fxRateNgnPerUsd;

  const spendNgn = balances.cNGN.available_balance;
  const saveUsdc = balances.USDC.available_balance;
  const lockedUsdc = balances.USDC.locked_balance || 0;
  const saveNgnEquivalent = Math.round(saveUsdc * fxRate);
  const totalPurchasingPowerNgn = spendNgn + saveNgnEquivalent;

  const [splitPercent, setSplitPercent] = useState<number>(user.autoSavePercent);
  const [savingSplit, setSavingSplit] = useState(false);
  const [splitFeedback, setSplitFeedback] = useState<string | null>(null);

  // Quick Swap state
  const [showSwapPanel, setShowSwapPanel] = useState(false);
  const [swapDirection, setSwapDirection] = useState<
    "CNGN_TO_USDC" | "USDC_TO_CNGN"
  >("CNGN_TO_USDC");
  const [swapAmount, setSwapAmount] = useState<string>("15000");
  const [swapLoading, setSwapLoading] = useState(false);
  const [swapError, setSwapError] = useState<string | null>(null);
  const [swapSuccess, setSwapSuccess] = useState<string | null>(null);

  // Expanded transaction ID
  const [expandedTxId, setExpandedTxId] = useState<string | null>(null);

  const handleSaveSplitRule = async (newPct: number) => {
    setSplitPercent(newPct);
    setSavingSplit(true);
    setSplitFeedback(null);
    await onUpdateSplitOrSwap({ autoSavePercent: newPct });
    setSavingSplit(false);
    setSplitFeedback(`Auto-Save split updated to ${newPct}%`);
    setTimeout(() => setSplitFeedback(null), 2500);
  };

  const handleExecuteSwap = async (e: React.FormEvent) => {
    e.preventDefault();
    setSwapError(null);
    setSwapSuccess(null);
    const numericAmount = Number(swapAmount);
    if (!numericAmount || numericAmount <= 0) {
      setSwapError("Enter a valid amount greater than zero.");
      return;
    }
    setSwapLoading(true);
    const res = await onUpdateSplitOrSwap({
      swap: { direction: swapDirection, amount: numericAmount },
    });
    setSwapLoading(false);
    if (res.error) {
      setSwapError(res.error);
    } else {
      setSwapSuccess(
        swapDirection === "CNGN_TO_USDC"
          ? `Converted ₦${numericAmount.toLocaleString()} to $${(
              numericAmount / fxRate
            ).toFixed(2)} USD Save.`
          : `Withdrew $${numericAmount.toFixed(2)} USD Save to ₦${Math.round(
              numericAmount * fxRate
            ).toLocaleString()} Spend.`
      );
    }
  };

  const renderTxIcon = (tx: WalletTransaction) => {
    if (tx.type === "SALARY_INFLOW") {
      return (
        <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
          <ArrowDownLeft className="w-4 h-4" />
        </div>
      );
    }
    if (tx.type === "AUTO_SAVE_SPLIT" || tx.type === "MANUAL_SWAP") {
      return (
        <div className="w-9 h-9 rounded-xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400 shrink-0">
          <Shield className="w-4 h-4" />
        </div>
      );
    }
    return (
      <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 shrink-0">
        <ArrowUpRight className="w-4 h-4" />
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Total Purchasing Power Card */}
      <div className="rounded-2xl bg-[#131C31] border border-slate-800/90 p-4">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>Total Purchasing Power</span>
          <span className="font-mono tabular-nums text-slate-300">
            Rate: ₦{fxRate.toLocaleString()} / $1
          </span>
        </div>
        <div
          className="mt-1.5 text-3xl font-bold tracking-tight text-white font-mono tabular-nums"
          style={{ fontFamily: "var(--font-jakarta)" }}
        >
          ₦{totalPurchasingPowerNgn.toLocaleString("en-NG")}
        </div>
        <div className="mt-1 text-xs text-slate-400 flex items-center gap-1.5">
          <span>One Wallet, Two Balances</span>
          <span aria-hidden="true">·</span>
          <span className="text-emerald-400 font-medium">
            {user.autoSavePercent}% Auto-Save Shield Active
          </span>
        </div>

        {/* Quick Actions Row */}
        <div className="grid grid-cols-3 gap-2 mt-4">
          <button
            type="button"
            onClick={() => onNavigateTab("fund")}
            className="min-h-[44px] px-3 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer"
          >
            <Plus className="w-4 h-4 shrink-0" />
            <span>Add Cash</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigateTab("send")}
            className="min-h-[44px] px-3 py-2 rounded-xl bg-slate-800/90 hover:bg-slate-800 text-slate-100 border border-slate-700/80 font-medium text-xs flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer"
          >
            <Send className="w-3.5 h-3.5 shrink-0" />
            <span>Send Home</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setShowSwapPanel((prev) => !prev);
              setSwapError(null);
              setSwapSuccess(null);
            }}
            className="min-h-[44px] px-3 py-2 rounded-xl bg-slate-800/90 hover:bg-slate-800 text-slate-100 border border-slate-700/80 font-medium text-xs flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer"
          >
            <ArrowLeftRight className="w-3.5 h-3.5 shrink-0" />
            <span>Move Funds</span>
          </button>
        </div>
      </div>

      {/* Dual Balance Cards: Spend (cNGN) & Save (USDC) */}
      <div className="grid grid-cols-2 gap-3">
        {/* Spend (cNGN) */}
        <div className="rounded-2xl bg-[#131C31] border border-slate-800/90 p-3.5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-emerald-400">
                Spend (Naira)
              </span>
              <Wallet className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="mt-2 text-xl font-bold font-mono tabular-nums text-white">
              ₦{spendNgn.toLocaleString("en-NG")}
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-800/80 text-[11px] text-slate-400">
            1:1 Pegged (cNGN) · Daily transport & transfers
          </div>
        </div>

        {/* Save (USDC) */}
        <div className="rounded-2xl bg-[#131C31] border border-slate-800/90 p-3.5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-sky-400">
                Save (US Dollars)
              </span>
              {security.isSimSwapLocked ? (
                <Lock className="w-4 h-4 text-rose-400" />
              ) : (
                <Shield className="w-4 h-4 text-sky-400" />
              )}
            </div>
            <div className="mt-2 text-xl font-bold font-mono tabular-nums text-white">
              ${saveUsdc.toFixed(2)}
            </div>
            <div className="text-xs font-mono tabular-nums text-slate-400 mt-0.5">
              ≈ ₦{saveNgnEquivalent.toLocaleString("en-NG")}
            </div>
          </div>
          <div className="mt-2.5 pt-2 border-t border-slate-800/80 text-[11px] text-slate-400">
            {security.isSimSwapLocked ? (
              <span className="text-rose-400 font-medium">
                24h Velocity Freeze Active
              </span>
            ) : lockedUsdc > 0 ? (
              <span className="text-amber-300 font-mono tabular-nums">
                +${lockedUsdc.toFixed(2)} Pledged for Rent
              </span>
            ) : (
              <span>Protected Dollar Shield (USDC)</span>
            )}
          </div>
        </div>
      </div>

      {/* Collapsible Manual Move Funds / Quick Swap Panel */}
      {showSwapPanel && (
        <form
          onSubmit={handleExecuteSwap}
          className="rounded-2xl bg-[#131C31] border border-slate-700/80 p-4 space-y-3"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-white">
              Move Money Between Spend & Save
            </h3>
            <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-900 border border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setSwapDirection("CNGN_TO_USDC");
                  setSwapAmount("15000");
                  setSwapError(null);
                }}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors whitespace-nowrap cursor-pointer ${
                  swapDirection === "CNGN_TO_USDC"
                    ? "bg-emerald-500 text-slate-950 font-semibold"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Spend → Save ($)
              </button>
              <button
                type="button"
                onClick={() => {
                  setSwapDirection("USDC_TO_CNGN");
                  setSwapAmount("10");
                  setSwapError(null);
                }}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors whitespace-nowrap cursor-pointer ${
                  swapDirection === "USDC_TO_CNGN"
                    ? "bg-sky-400 text-slate-950 font-semibold"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Save ($) → Spend
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <input
                type="number"
                step="any"
                min="1"
                value={swapAmount}
                onChange={(e) => setSwapAmount(e.target.value)}
                className="w-full h-11 pl-3 pr-16 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono tabular-nums text-white focus:outline-none focus:border-emerald-500"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-400">
                {swapDirection === "CNGN_TO_USDC" ? "NGN" : "USDC"}
              </span>
            </div>
            <button
              type="submit"
              disabled={swapLoading}
              className="min-h-[44px] px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-semibold text-xs whitespace-nowrap cursor-pointer"
            >
              {swapLoading ? "Converting..." : "Convert Now"}
            </button>
          </div>

          <div className="text-[11px] text-slate-400 font-mono tabular-nums">
            {swapDirection === "CNGN_TO_USDC"
              ? `You receive ≈ $${(Number(swapAmount || 0) / fxRate).toFixed(
                  2
                )} USD Save`
              : `You receive ≈ ₦${Math.round(
                  Number(swapAmount || 0) * fxRate
                ).toLocaleString()} Naira Spend`}
          </div>

          {swapError && (
            <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/40 text-xs text-rose-200 space-y-2">
              <p>{swapError}</p>
              {security.isSimSwapLocked && (
                <button
                  type="button"
                  onClick={onOpenRecoveryModal}
                  className="px-3 py-1.5 rounded-lg bg-rose-500 hover:bg-rose-400 text-slate-950 font-semibold text-xs cursor-pointer"
                >
                  Verify NIN + 3D Selfie to Unlock
                </button>
              )}
            </div>
          )}

          {swapSuccess && (
            <div className="p-2.5 rounded-xl bg-emerald-950/50 border border-emerald-500/30 text-xs text-emerald-300">
              {swapSuccess}
            </div>
          )}
        </form>
      )}

      {/* Automated Salary Split Rule Control */}
      <div className="rounded-2xl bg-[#131C31] border border-slate-800/90 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-sky-400" />
            <span className="text-xs font-semibold text-white">
              Automatic Salary Dollar Split
            </span>
          </div>
          <span className="text-xs font-mono tabular-nums text-sky-400 font-semibold">
            {splitPercent}% Save · {100 - splitPercent}% Spend
          </span>
        </div>
        <p className="text-xs text-slate-400 mt-1">
          Every Naira deposit automatically shields {splitPercent}% in US Dollars (`USDC`) via Busha Quotes.
        </p>

        <div className="mt-3 flex items-center gap-3">
          <input
            type="range"
            min={0}
            max={50}
            step={5}
            value={splitPercent}
            onChange={(e) => handleSaveSplitRule(Number(e.target.value))}
            aria-label="Auto-Save Split Percentage"
            className="w-full accent-emerald-500 cursor-pointer"
          />
          <div className="flex items-center gap-1 shrink-0">
            {[10, 15, 25].map((preset) => (
              <button
                key={preset}
                type="button"
                disabled={savingSplit}
                onClick={() => handleSaveSplitRule(preset)}
                className={`min-h-[32px] px-2.5 rounded-lg text-xs font-mono tabular-nums transition-colors cursor-pointer ${
                  splitPercent === preset
                    ? "bg-sky-400 text-slate-950 font-semibold"
                    : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
                }`}
              >
                {preset}%
              </button>
            ))}
          </div>
        </div>

        {splitFeedback && (
          <p className="text-[11px] text-emerald-400 mt-2 font-medium">
            {splitFeedback}
          </p>
        )}
      </div>

      {/* Recent Activity Feed */}
      <div className="rounded-2xl bg-[#131C31] border border-slate-800/90 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-800/80 flex items-center justify-between">
          <h3 className="text-xs font-semibold text-white">Recent Wallet Activity</h3>
          <span className="text-[11px] text-slate-400 font-mono tabular-nums">
            {transactions.length} entries
          </span>
        </div>

        <div className="divide-y divide-slate-800/70">
          {transactions.slice(0, 6).map((tx) => {
            const isExpanded = expandedTxId === tx.id;
            const isInflow =
              tx.type === "SALARY_INFLOW" || tx.type === "RENT_ADVANCE_PLEDGE";
            const isSplit =
              tx.type === "AUTO_SAVE_SPLIT" ||
              (tx.type === "MANUAL_SWAP" && tx.targetCurrency === "USDC");

            return (
              <div key={tx.id} className="transition-colors hover:bg-slate-900/40">
                <button
                  type="button"
                  onClick={() =>
                    setExpandedTxId(isExpanded ? null : tx.id)
                  }
                  className="w-full px-4 py-3 flex items-center justify-between gap-3 text-left cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {renderTxIcon(tx)}
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-slate-100 truncate">
                        {tx.title}
                      </div>
                      <div className="text-[11px] text-slate-400 truncate mt-0.5">
                        {tx.subtitle}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <div className="text-right">
                      <div
                        className={`text-xs font-mono tabular-nums font-semibold ${
                          isInflow
                            ? "text-emerald-400"
                            : isSplit
                            ? "text-sky-400"
                            : "text-slate-100"
                        }`}
                      >
                        {isInflow
                          ? `+₦${tx.targetAmount.toLocaleString()}`
                          : isSplit
                          ? `+$${tx.targetAmount.toFixed(2)}`
                          : `-₦${tx.sourceAmount.toLocaleString()}`}
                      </div>
                      <div className="text-[10px] font-mono tabular-nums text-slate-500">
                        {new Date(tx.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="w-3.5 h-3.5 text-slate-500" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                    )}
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-4 pb-3.5 pt-1 bg-slate-950/60 border-t border-slate-800/60 text-[11px] space-y-1.5 font-mono text-slate-400">
                    <div className="flex justify-between">
                      <span>Busha Transfer ID</span>
                      <span className="text-slate-200">{tx.bushaTransferId}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Busha Quote ID</span>
                      <span className="text-slate-200">{tx.quoteId}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Settlement Status</span>
                      <span className="text-emerald-400">{tx.status}</span>
                    </div>
                    {tx.recipientName && (
                      <div className="flex justify-between">
                        <span>Beneficiary</span>
                        <span className="text-slate-200">
                          {tx.recipientName} ({tx.recipientAccount})
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
