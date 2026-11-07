"use client";

import React, { useEffect, useState } from "react";
import {
  Building2,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  RefreshCw,
  Share2,
  Store,
} from "lucide-react";
import { useDuro } from "@/components/duro-context";
import type { FundingSource } from "@/lib/api-types";

export default function FundPage() {
  const {
    wallet,
    activeVirtualAccount,
    createFundingAccount,
    confirmDepositTransfer,
  } = useDuro();

  const [source, setSource] = useState<FundingSource>(
    activeVirtualAccount?.source ?? "EMPLOYER",
  );
  const [amountNgn, setAmountNgn] = useState<number>(
    activeVirtualAccount?.amountNgn ?? 150000,
  );
  const [generating, setGenerating] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(3600);
  const [lastReceipt, setLastReceipt] = useState<{
    creditedNgn: number;
    savedUsdc: number;
    savedNgn: number;
  } | null>(null);

  useEffect(() => {
    if (!activeVirtualAccount?.account.expiresAt) return;
    const tick = () => {
      const diff = Math.max(
        0,
        Math.floor(
          (Date.parse(activeVirtualAccount.account.expiresAt) - Date.now()) /
            1000,
        ),
      );
      setRemainingSeconds(diff);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [activeVirtualAccount?.account.expiresAt]);

  if (!wallet) return null;

  const fxRate = wallet.rate.usdNgn;
  const splitPct = wallet.profile.autoSavePercent;
  const autoSaveNgn = Math.round((amountNgn * splitPct) / 100);
  const spendNgn = amountNgn - autoSaveNgn;
  const autoSaveUsdc = (autoSaveNgn / fxRate).toFixed(2);

  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLastReceipt(null);
    setGenerating(true);
    try {
      await createFundingAccount(amountNgn, source);
    } finally {
      setGenerating(false);
    }
  };

  const handleConfirmTransfer = async () => {
    setConfirming(true);
    try {
      const res = await confirmDepositTransfer(amountNgn, source);
      setLastReceipt({
        creditedNgn: res.credited,
        savedUsdc: res.autoSaved?.usdc ?? 0,
        savedNgn: res.autoSaved?.ngn ?? 0,
      });
    } finally {
      setConfirming(false);
    }
  };

  const handleCopy = (value: string, label: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(value);
      setCopiedField(label);
      setTimeout(() => setCopiedField(null), 2000);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1
          className="text-2xl font-bold text-slate-900"
          style={{ fontFamily: "var(--font-jakarta)" }}
        >
          Add Money
        </h1>
        <p className="text-sm text-slate-600">
          Receive your salary from your employer or deposit cash with any
          neighborhood POS agent—no traditional bank account needed.
        </p>
      </div>

      {/* Funding Method & Amount Card */}
      <form
        onSubmit={handleGenerate}
        className="rounded-3xl bg-white border border-[#E4E7DF] p-6 space-y-5"
      >
        {/* Source Selector */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setSource("EMPLOYER")}
            className={`p-4 rounded-2xl border text-left transition-colors flex items-start gap-3 cursor-pointer ${
              source === "EMPLOYER"
                ? "bg-emerald-50/70 border-[#0A3622]"
                : "bg-[#F7F8F5] border-[#E4E7DF] hover:bg-slate-100/70"
            }`}
          >
            <div className="w-9 h-9 rounded-xl bg-white border border-[#E4E7DF] text-[#0A3622] flex items-center justify-center shrink-0">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900">
                Employer Salary Transfer
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Share a dedicated Providus Bank account with HR or payroll
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setSource("POS_AGENT")}
            className={`p-4 rounded-2xl border text-left transition-colors flex items-start gap-3 cursor-pointer ${
              source === "POS_AGENT"
                ? "bg-emerald-50/70 border-[#0A3622]"
                : "bg-[#F7F8F5] border-[#E4E7DF] hover:bg-slate-100/70"
            }`}
          >
            <div className="w-9 h-9 rounded-xl bg-white border border-[#E4E7DF] text-[#0A3622] flex items-center justify-center shrink-0">
              <Store className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900">
                Neighborhood POS Cash-In
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Hand cash to any POS agent and have them transfer to your
                account
              </p>
            </div>
          </button>
        </div>

        {/* Amount Input */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Expected Deposit Amount (NGN)
          </label>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <input
              type="number"
              min={100}
              step="any"
              value={amountNgn}
              onChange={(e) => setAmountNgn(Number(e.target.value) || 0)}
              className="flex-1 h-12 px-4 rounded-xl bg-[#F7F8F5] border border-[#E4E7DF] text-base font-mono tabular-nums text-slate-900 focus:outline-none focus:border-[#0A3622] focus:bg-white"
            />
            <button
              type="submit"
              disabled={generating}
              className="h-12 px-5 rounded-xl bg-[#0A3622] hover:bg-[#14532D] disabled:opacity-50 text-white font-semibold text-xs flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${generating ? "animate-spin" : ""}`}
              />
              <span>
                {activeVirtualAccount
                  ? "Generate New Account"
                  : "Get Bank Account Details"}
              </span>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2 mt-2.5">
            {[25000, 50000, 150000, 250000].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setAmountNgn(preset)}
                className={`h-8 px-3 rounded-lg text-xs font-mono font-medium transition-colors cursor-pointer ${
                  amountNgn === preset
                    ? "bg-[#0A3622] text-white font-semibold"
                    : "bg-[#F7F8F5] text-slate-700 hover:bg-slate-200/70 border border-[#E4E7DF]"
                }`}
              >
                ₦{preset.toLocaleString("en-NG")}
              </button>
            ))}
          </div>
        </div>

        {/* Live Automatic Split Breakdown */}
        <div className="pt-4 border-t border-[#E4E7DF] grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="p-3.5 rounded-2xl bg-[#F7F8F5] border border-[#E4E7DF]">
            <div className="text-xs text-slate-500">
              {100 - splitPct}% goes to Naira Spend
            </div>
            <div className="mt-1 text-base font-bold font-mono tabular-nums text-slate-900">
              +₦{spendNgn.toLocaleString("en-NG")}
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200">
            <div className="text-xs text-emerald-900">
              {splitPct}% auto-saved in US Dollars
            </div>
            <div className="mt-1 text-base font-bold font-mono tabular-nums text-[#0A3622]">
              +${autoSaveUsdc}{" "}
              <span className="text-xs font-normal text-emerald-800">
                (₦{autoSaveNgn.toLocaleString("en-NG")} @ ₦
                {fxRate.toLocaleString("en-NG")}/$)
              </span>
            </div>
          </div>
        </div>
      </form>

      {/* Active Virtual Account Card */}
      {activeVirtualAccount && (
        <div className="rounded-3xl bg-white border-2 border-[#0A3622] p-6 space-y-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#0A3622]">
              Transfer to This Bank Account
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-xs font-mono font-semibold text-amber-900">
              <Clock className="w-3.5 h-3.5" />
              <span>
                Expires in {String(minutes).padStart(2, "0")}:
                {String(seconds).padStart(2, "0")}
              </span>
            </span>
          </div>

          <div className="rounded-2xl bg-[#F7F8F5] border border-[#E4E7DF] p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-slate-500">Bank Name</div>
                <div className="text-sm font-bold text-slate-900 mt-0.5">
                  {activeVirtualAccount.account.bankName}
                </div>
              </div>
              <span className="text-xs font-medium text-slate-500">
                Instant NIP Transfer
              </span>
            </div>

            <div className="pt-3 border-t border-[#E4E7DF] flex items-center justify-between gap-3">
              <div>
                <div className="text-xs text-slate-500">Account Number</div>
                <div
                  className="text-2xl font-bold font-mono tabular-nums tracking-wider text-[#0A3622] mt-0.5"
                  style={{ fontFamily: "var(--font-jakarta)" }}
                >
                  {activeVirtualAccount.account.accountNumber}
                </div>
              </div>
              <button
                type="button"
                onClick={() =>
                  handleCopy(
                    activeVirtualAccount.account.accountNumber,
                    "account",
                  )
                }
                className="h-10 px-3.5 rounded-xl bg-white hover:bg-slate-50 border border-[#E4E7DF] text-xs font-semibold text-slate-800 flex items-center gap-1.5 cursor-pointer"
              >
                {copiedField === "account" ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Number</span>
                  </>
                )}
              </button>
            </div>

            <div className="pt-3 border-t border-[#E4E7DF] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <div className="text-xs text-slate-500">Beneficiary Name</div>
                <div className="text-sm font-mono font-semibold text-slate-900 mt-0.5">
                  {activeVirtualAccount.account.accountName}
                </div>
              </div>
              <div className="text-xs text-slate-500">
                Expected: ₦{amountNgn.toLocaleString("en-NG")}
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <button
              type="button"
              onClick={() =>
                handleCopy(
                  `${activeVirtualAccount.account.bankName} · ${activeVirtualAccount.account.accountNumber} (${activeVirtualAccount.account.accountName})`,
                  "memo",
                )
              }
              className="h-12 px-4 rounded-xl bg-[#F7F8F5] hover:bg-slate-200/70 border border-[#E4E7DF] text-slate-800 text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer"
            >
              {copiedField === "memo" ? (
                <>
                  <Check className="w-4 h-4 text-emerald-700" />
                  <span>Account Details Copied</span>
                </>
              ) : (
                <>
                  <Share2 className="w-4 h-4" />
                  <span>Share Account Details</span>
                </>
              )}
            </button>

            <button
              type="button"
              disabled={confirming}
              onClick={handleConfirmTransfer}
              className="flex-1 h-12 px-5 rounded-xl bg-[#0A3622] hover:bg-[#14532D] disabled:opacity-50 text-white text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>
                {confirming
                  ? "Checking for incoming transfer..."
                  : `I've made this ₦${amountNgn.toLocaleString("en-NG")} transfer — Check for deposit`}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Quick Deposit Button even before generating account */}
      {!activeVirtualAccount && (
        <div className="rounded-3xl bg-white border border-[#E4E7DF] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="text-xs font-bold text-slate-900">
              Already transferred or testing payroll?
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Process an incoming ₦{amountNgn.toLocaleString("en-NG")}{" "}
              {source === "EMPLOYER" ? "employer salary" : "POS deposit"} right
              away.
            </p>
          </div>
          <button
            type="button"
            disabled={confirming}
            onClick={handleConfirmTransfer}
            className="h-10 px-4 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-[#0A3622] text-xs font-semibold whitespace-nowrap cursor-pointer"
          >
            {confirming
              ? "Processing deposit..."
              : `Receive ₦${amountNgn.toLocaleString("en-NG")} Deposit Now`}
          </button>
        </div>
      )}

      {/* Confirmation Receipt */}
      {lastReceipt && (
        <div className="rounded-3xl bg-emerald-50 border border-emerald-200 p-5 flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#0A3622] text-white flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div className="space-y-1 text-xs">
            <div className="font-bold text-slate-900 text-sm">
              Deposit Received & Automatically Split
            </div>
            <p className="text-slate-700">
              <strong>
                ₦
                {(
                  lastReceipt.creditedNgn - lastReceipt.savedNgn
                ).toLocaleString("en-NG")}
              </strong>{" "}
              was added to your Naira Spend balance and{" "}
              <strong>${lastReceipt.savedUsdc.toFixed(2)}</strong> (₦
              {lastReceipt.savedNgn.toLocaleString("en-NG")}) was automatically
              protected in your US Dollar Save balance.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
