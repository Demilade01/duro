"use client";

import React, { useState } from "react";
import {
  Award,
  CheckCircle2,
  FileText,
  Landmark,
  Lock,
  Printer,
  RefreshCw,
  ShieldCheck,
  TrendingUp,
  X,
} from "lucide-react";
import { WalletStateResponse } from "@/lib/types";

interface FinancialPassportTabProps {
  wallet: WalletStateResponse;
  onRefreshInsights: () => Promise<void>;
  onCreateRentPledge: (payload: {
    collateralUsdc: number;
    advanceNgn: number;
  }) => Promise<{ error?: string }>;
  onOpenRecoveryModal: () => void;
}

export default function FinancialPassportTab({
  wallet,
  onRefreshInsights,
  onCreateRentPledge,
  onOpenRecoveryModal,
}: FinancialPassportTabProps) {
  const { user, balances, insights, pledges, security } = wallet;
  const fxRate = balances.fxRateNgnPerUsd;
  const availableUsdc = balances.USDC.available_balance;

  const [refreshing, setRefreshing] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);

  // Rent Micro-Advance (Pledges API) calculator state
  const [collateralUsdc, setCollateralUsdc] = useState<number>(
    Math.min(40, Math.max(10, Math.floor(availableUsdc)))
  );
  const [pledging, setPledging] = useState(false);
  const [pledgeError, setPledgeError] = useState<string | null>(null);
  const [pledgeSuccess, setPledgeSuccess] = useState<string | null>(null);

  // 75% LTV micro-advance calculation in NGN
  const advanceNgn = Math.round(collateralUsdc * fxRate * 0.75);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await onRefreshInsights();
    } finally {
      setRefreshing(false);
    }
  };

  const handleActivatePledge = async (e: React.FormEvent) => {
    e.preventDefault();
    setPledgeError(null);
    setPledgeSuccess(null);
    if (collateralUsdc <= 0) {
      setPledgeError("Select a valid USDC collateral amount.");
      return;
    }
    setPledging(true);
    const res = await onCreateRentPledge({ collateralUsdc, advanceNgn });
    setPledging(false);
    if (res.error) {
      setPledgeError(res.error);
    } else {
      setPledgeSuccess(
        `Authorized! Locked $${collateralUsdc.toFixed(
          2
        )} USDC and credited +₦${advanceNgn.toLocaleString()} to your Naira Spend balance.`
      );
    }
  };

  const maxInflow = Math.max(
    ...insights.series.map((s) => s.inflow),
    150000
  );

  return (
    <div className="space-y-4">
      {/* Busha Insights: Cash-Flow Financial Passport */}
      <div className="rounded-2xl bg-[#131C31] border border-slate-800/90 p-4 space-y-3.5">
        <div className="flex items-center justify-between">
          <div>
            <h2
              className="text-sm font-bold text-white flex items-center gap-1.5"
              style={{ fontFamily: "var(--font-jakarta)" }}
            >
              <Award className="w-4 h-4 text-emerald-400" />
              <span>Financial Passport (`Insights` API)</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Consented cash-flow verification for Lagos landlords & micro-lenders
            </p>
          </div>
          <button
            type="button"
            onClick={handleRefresh}
            className="min-h-[36px] px-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 flex items-center gap-1 border border-slate-700 cursor-pointer"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`}
            />
            <span>Sync</span>
          </button>
        </div>

        {/* Summary Metrics */}
        <div className="grid grid-cols-3 gap-2">
          <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800">
            <div className="text-[10px] text-slate-400">Verified Inflow</div>
            <div className="mt-1 text-xs font-bold font-mono tabular-nums text-emerald-400">
              ₦{insights.summary.total_inflow.toLocaleString()}
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800">
            <div className="text-[10px] text-slate-400">Total Outflow</div>
            <div className="mt-1 text-xs font-bold font-mono tabular-nums text-slate-200">
              ₦{insights.summary.total_outflow.toLocaleString()}
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800">
            <div className="text-[10px] text-slate-400">Net Cash Flow</div>
            <div className="mt-1 text-xs font-bold font-mono tabular-nums text-sky-400">
              +₦{insights.summary.net_cash_flow.toLocaleString()}
            </div>
          </div>
        </div>

        {/* 6-Month Cash-Flow Bar Visualization */}
        <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80">
          <div className="flex items-center justify-between text-[11px] text-slate-400 mb-2.5">
            <span className="flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
              6-Month Verified Cash-Flow Series
            </span>
            <span className="font-mono text-slate-400">
              Retention: {insights.summary.savings_retention_rate}%
            </span>
          </div>
          <div className="grid grid-cols-6 gap-2 items-end h-24 pt-2">
            {insights.series.map((pt) => {
              const inflowHeight = Math.max(
                18,
                Math.round((pt.inflow / maxInflow) * 100)
              );
              const netHeight = Math.max(
                10,
                Math.round((pt.net / maxInflow) * 100)
              );
              return (
                <div
                  key={pt.date}
                  className="flex flex-col items-center justify-end h-full gap-1"
                >
                  <div className="w-full flex items-end justify-center gap-1 h-full">
                    <div
                      style={{ height: `${inflowHeight}%` }}
                      className="w-2.5 rounded-t bg-emerald-500/80"
                      title={`Inflow: ₦${pt.inflow.toLocaleString()}`}
                    />
                    <div
                      style={{ height: `${netHeight}%` }}
                      className="w-2.5 rounded-t bg-sky-400/80"
                      title={`Net: ₦${pt.net.toLocaleString()}`}
                    />
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">
                    {pt.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowPrintModal(true)}
          className="w-full min-h-[44px] px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 font-medium text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
        >
          <FileText className="w-4 h-4 text-emerald-400" />
          <span>Export Verified Landlord Cash-Flow Statement</span>
        </button>
      </div>

      {/* Busha Pledges: Collateralized Rent Micro-Advance */}
      <form
        onSubmit={handleActivatePledge}
        className="rounded-2xl bg-[#131C31] border border-slate-800/90 p-4 space-y-3.5"
      >
        <div className="flex items-center justify-between">
          <div>
            <h3
              className="text-sm font-bold text-white flex items-center gap-1.5"
              style={{ fontFamily: "var(--font-jakarta)" }}
            >
              <Landmark className="w-4 h-4 text-sky-400" />
              <span>Rent Micro-Advance (`Pledges` API)</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Unlock instant Naira for rent using your Dollar Save (`USDC`) without selling a single dollar.
            </p>
          </div>
          {security.isSimSwapLocked && (
            <Lock className="w-4 h-4 text-rose-400 shrink-0" />
          )}
        </div>

        <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-300">
              Pledge Collateral (`USDC` Available: ${availableUsdc.toFixed(2)})
            </span>
            <span className="font-mono tabular-nums font-semibold text-sky-400">
              ${collateralUsdc.toFixed(2)} USDC
            </span>
          </div>

          <input
            type="range"
            min={5}
            max={Math.max(10, Math.floor(availableUsdc))}
            step={1}
            value={collateralUsdc}
            onChange={(e) => setCollateralUsdc(Number(e.target.value))}
            className="w-full accent-sky-400 cursor-pointer"
          />

          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
            <div>
              <div className="text-[11px] text-slate-400">
                Instant Naira Disbursed (75% LTV)
              </div>
              <div className="text-lg font-bold font-mono tabular-nums text-emerald-400">
                +₦{advanceNgn.toLocaleString("en-NG")}
              </div>
            </div>
            <div className="text-right text-[11px] text-slate-400 font-mono">
              <div>0% Liquidation Sell</div>
              <div className="text-slate-300">30-Day Flexible Term</div>
            </div>
          </div>
        </div>

        {pledgeError && (
          <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/40 text-xs text-rose-200 space-y-2">
            <p>{pledgeError}</p>
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

        {pledgeSuccess && (
          <div className="p-3 rounded-xl bg-emerald-950/50 border border-emerald-500/30 text-xs text-emerald-300">
            {pledgeSuccess}
          </div>
        )}

        <button
          type="submit"
          disabled={pledging || availableUsdc < 5}
          className="w-full min-h-[48px] px-4 py-3 rounded-xl bg-sky-400 hover:bg-sky-300 disabled:opacity-50 text-slate-950 font-semibold text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
        >
          <ShieldCheck className="w-4 h-4" />
          <span>
            {pledging
              ? "Activating Busha Pledge..."
              : `Unlock ₦${advanceNgn.toLocaleString()} Rent Advance`}
          </span>
        </button>

        {/* Active Pledges List */}
        {pledges.length > 0 && (
          <div className="pt-2 space-y-2">
            <div className="text-xs font-semibold text-slate-300">
              Active Collateralized Pledges
            </div>
            {pledges.map((plg) => (
              <div
                key={plg.id}
                className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between text-xs font-mono"
              >
                <div>
                  <div className="text-white font-semibold">
                    +₦{plg.advanceNgn.toLocaleString()} Advance
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {plg.id} · Locked ${plg.collateralUsdc.toFixed(2)} USDC
                  </div>
                </div>
                <span className="text-emerald-400 text-[11px]">
                  {plg.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </form>

      {/* Printable Landlord Cash-Flow Certificate Modal */}
      {showPrintModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-3xl bg-white text-slate-900 shadow-2xl overflow-hidden">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between no-print">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-semibold">
                  Duro × Busha Verified Landlord Statement
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print / Save PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowPrintModal(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-5 text-xs">
              <div className="flex items-start justify-between border-b border-slate-200 pb-4">
                <div>
                  <div className="text-lg font-bold text-slate-900">
                    DURO FINANCIAL PASSPORT
                  </div>
                  <div className="text-slate-500 mt-0.5">
                    Powered by Busha Licensed B2B2C Insights API (`/v1/insights/transactions/trends`)
                  </div>
                </div>
                <div className="text-right font-mono">
                  <div className="font-semibold text-emerald-700">
                    STATUS: KYC & NIMC VERIFIED
                  </div>
                  <div className="text-slate-500">
                    Profile: {user.bushaProfileId}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <div className="text-slate-500">Tenant Full Name</div>
                  <div className="font-bold text-sm text-slate-900 mt-0.5">
                    {user.fullName}
                  </div>
                  <div className="text-slate-500 mt-2">Verified Phone & NIN</div>
                  <div className="font-mono text-slate-800 mt-0.5">
                    {user.phone} · NIN *****{user.nin.slice(-4)}
                  </div>
                </div>
                <div>
                  <div className="text-slate-500">Verified Payroll Source</div>
                  <div className="font-bold text-sm text-slate-900 mt-0.5">
                    {insights.summary.verified_employer}
                  </div>
                  <div className="text-slate-500 mt-2">
                    Liquid Dollar Shield Reserve
                  </div>
                  <div className="font-mono font-bold text-slate-900 mt-0.5">
                    ${balances.USDC.total_balance.toFixed(2)} USDC (≈ ₦
                    {Math.round(
                      balances.USDC.total_balance * fxRate
                    ).toLocaleString()}
                    )
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-3 rounded-xl border border-slate-200">
                  <div className="text-slate-500">6-Mo Verified Inflow</div>
                  <div className="text-sm font-bold font-mono text-emerald-700 mt-1">
                    ₦{insights.summary.total_inflow.toLocaleString()}
                  </div>
                </div>
                <div className="p-3 rounded-xl border border-slate-200">
                  <div className="text-slate-500">6-Mo Total Outflow</div>
                  <div className="text-sm font-bold font-mono text-slate-800 mt-1">
                    ₦{insights.summary.total_outflow.toLocaleString()}
                  </div>
                </div>
                <div className="p-3 rounded-xl border border-slate-200">
                  <div className="text-slate-500">Net Positive Surplus</div>
                  <div className="text-sm font-bold font-mono text-sky-700 mt-1">
                    +₦{insights.summary.net_cash_flow.toLocaleString()}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-200 text-[11px] text-slate-500">
                <span className="flex items-center gap-1 text-emerald-700 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Cryptographically attested by Duro × Busha Sandbox
                </span>
                <span className="font-mono">
                  Issued: {new Date().toISOString().slice(0, 10)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
