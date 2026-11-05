"use client";

import React, { useEffect, useState } from "react";
import {
  Building2,
  Check,
  Clock,
  Copy,
  RefreshCw,
  Share2,
  Sparkles,
  Zap,
} from "lucide-react";
import { WalletStateResponse } from "@/lib/types";

interface FundWalletTabProps {
  wallet: WalletStateResponse;
  onGenerateAccount: (amountNgn: number) => Promise<void>;
  onSimulateSalaryInflow: (amountNgn: number) => Promise<void>;
}

export default function FundWalletTab({
  wallet,
  onGenerateAccount,
  onSimulateSalaryInflow,
}: FundWalletTabProps) {
  const { user, virtualAccount, balances } = wallet;
  const fxRate = balances.fxRateNgnPerUsd;

  const [amountNgn, setAmountNgn] = useState<number>(
    virtualAccount?.expected_amount_ngn || 150000
  );
  const [generating, setGenerating] = useState(false);
  const [simulatingInflow, setSimulatingInflow] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(1800);

  useEffect(() => {
    if (!virtualAccount?.expires_at) return;
    const updateTimer = () => {
      const diff = Math.max(
        0,
        Math.floor(
          (new Date(virtualAccount.expires_at).getTime() - Date.now()) / 1000
        )
      );
      setRemainingSeconds(diff);
    };
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [virtualAccount?.expires_at]);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setGenerating(true);
    try {
      await onGenerateAccount(amountNgn);
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = (text: string, label: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedField(label);
      setTimeout(() => setCopiedField(null), 2000);
    }
  };

  const handleSimulateInflow = async () => {
    setSimulatingInflow(true);
    try {
      await onSimulateSalaryInflow(amountNgn);
    } finally {
      setSimulatingInflow(false);
    }
  };

  const splitPct = user.autoSavePercent;
  const autoSaveNgn = Math.round((amountNgn * splitPct) / 100);
  const spendNgn = amountNgn - autoSaveNgn;
  const autoSaveUsdc = (autoSaveNgn / fxRate).toFixed(2);

  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;

  return (
    <div className="space-y-4">
      {/* Header Explanation */}
      <div className="rounded-2xl bg-[#131C31] border border-slate-800/90 p-4">
        <div className="flex items-center justify-between">
          <h2
            className="text-sm font-bold text-white"
            style={{ fontFamily: "var(--font-jakarta)" }}
          >
            Fund Without a Bank Account
          </h2>
          <Building2 className="w-4 h-4 text-emerald-400" />
        </div>
        <p className="text-xs text-slate-400 mt-1 leading-relaxed">
          Generate a Busha Temporary Virtual Bank Account (`pay_in`) to give your employer for monthly salary or a neighborhood POS agent for cash deposits.
        </p>

        {/* Expected Deposit & Split Calculator */}
        <form onSubmit={handleGenerate} className="mt-3.5 space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Expected Salary or POS Cash-In Amount (NGN)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1000}
                step={500}
                value={amountNgn}
                onChange={(e) => setAmountNgn(Number(e.target.value) || 0)}
                className="w-full h-11 px-3 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono tabular-nums text-white focus:outline-none focus:border-emerald-500"
              />
              <button
                type="submit"
                disabled={generating}
                className="min-h-[44px] px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-semibold text-xs flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${generating ? "animate-spin" : ""}`}
                />
                <span>
                  {virtualAccount ? "Refresh Account" : "Generate Account"}
                </span>
              </button>
            </div>
          </div>

          {/* Preset Amounts */}
          <div className="flex items-center gap-2">
            {[50000, 150000, 250000].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setAmountNgn(preset)}
                className={`min-h-[34px] px-3 rounded-lg text-xs font-mono tabular-nums transition-colors cursor-pointer ${
                  amountNgn === preset
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-semibold"
                    : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
                }`}
              >
                ₦{preset.toLocaleString()}
              </button>
            ))}
          </div>
        </form>

        {/* Automatic Split Breakdown Preview */}
        <div className="mt-3.5 pt-3 border-t border-slate-800/80 grid grid-cols-2 gap-2.5 text-xs">
          <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80">
            <div className="text-[11px] text-slate-400">
              {100 - splitPct}% Naira Spend (`cNGN`)
            </div>
            <div className="mt-0.5 font-mono tabular-nums font-semibold text-emerald-400">
              +₦{spendNgn.toLocaleString()}
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80">
            <div className="text-[11px] text-slate-400">
              {splitPct}% Auto-Save (`USDC`)
            </div>
            <div className="mt-0.5 font-mono tabular-nums font-semibold text-sky-400">
              +${autoSaveUsdc} (₦{autoSaveNgn.toLocaleString()})
            </div>
          </div>
        </div>
      </div>

      {/* Generated Temporary Virtual Bank Account Card */}
      {virtualAccount ? (
        <div className="rounded-2xl bg-[#131C31] border border-emerald-500/30 p-4 space-y-3.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-400">
              Active Busha Temporary Virtual Account
            </span>
            <div className="flex items-center gap-1 text-xs font-mono tabular-nums text-amber-300">
              <Clock className="w-3.5 h-3.5" />
              <span>
                {String(minutes).padStart(2, "0")}:
                {String(seconds).padStart(2, "0")}
              </span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/90 border border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[11px] text-slate-400">Receiving Bank</div>
                <div className="text-sm font-semibold text-white">
                  {virtualAccount.bank_name}
                </div>
              </div>
              <span className="text-[11px] font-mono text-slate-400">
                Channel: NIP Transfer
              </span>
            </div>

            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
              <div>
                <div className="text-[11px] text-slate-400">
                  Virtual Account Number
                </div>
                <div className="text-xl font-bold font-mono tabular-nums tracking-wider text-emerald-400">
                  {virtualAccount.account_number}
                </div>
              </div>
              <button
                type="button"
                onClick={() =>
                  handleCopy(virtualAccount.account_number, "account")
                }
                className="min-h-[40px] px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-100 flex items-center gap-1.5 cursor-pointer"
              >
                {copiedField === "account" ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>

            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
              <div>
                <div className="text-[11px] text-slate-400">
                  Beneficiary Name
                </div>
                <div className="font-mono text-slate-200 font-medium">
                  {virtualAccount.account_name}
                </div>
              </div>
              <div className="text-right font-mono text-[11px] text-slate-400">
                <div>Quote: {virtualAccount.quote_id}</div>
                <div>Transfer: {virtualAccount.transfer_id}</div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() =>
                handleCopy(
                  `Pay ${user.fullName} via ${virtualAccount.bank_name} | Account: ${virtualAccount.account_number} | Name: ${virtualAccount.account_name}`,
                  "share"
                )
              }
              className="min-h-[44px] px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-medium flex items-center justify-center gap-1.5 border border-slate-700 cursor-pointer"
            >
              {copiedField === "share" ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Details Copied</span>
                </>
              ) : (
                <>
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Copy Employer Memo</span>
                </>
              )}
            </button>

            <button
              type="button"
              disabled={simulatingInflow}
              onClick={handleSimulateInflow}
              className="min-h-[44px] px-3 py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5 shrink-0" />
              <span>
                {simulatingInflow
                  ? "Crediting..."
                  : `Test ₦${amountNgn.toLocaleString()} Inflow`}
              </span>
            </button>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl bg-[#131C31] border border-slate-800/90 p-5 text-center space-y-3">
          <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 mx-auto flex items-center justify-center text-emerald-400">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xs font-semibold text-white">
              Ready to Receive Salary or POS Cash
            </h3>
            <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
              Click &ldquo;Generate Account&rdquo; above to call Busha{" "}
              <code className="text-slate-300 font-mono">POST /v1/quotes</code> +{" "}
              <code className="text-slate-300 font-mono">POST /v1/transfers</code>{" "}
              and provision Tunde&apos;s Providus virtual account.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
