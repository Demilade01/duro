"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
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
import { useDuro } from "@/components/duro-context";
import type { PassportStatementResponse } from "@/lib/api-types";

const COLLATERAL_RATIO = 1.5;

export default function CreditPage() {
  const {
    wallet,
    fetchStatement,
    requestRentAdvance,
  } = useDuro();

  const [passport, setPassport] = useState<PassportStatementResponse | null>(
    null,
  );
  const [loadingPassport, setLoadingPassport] = useState(true);
  const [showPrintModal, setShowPrintModal] = useState(false);

  const [advanceNgn, setAdvanceNgn] = useState<number>(10000);
  const [purpose, setPurpose] = useState<"RENT" | "SCHOOL_FEES" | "EMERGENCY">(
    "RENT",
  );
  const [requesting, setRequesting] = useState(false);
  const [advanceError, setAdvanceError] = useState<string | null>(null);
  const [advanceSuccess, setAdvanceSuccess] = useState<string | null>(null);

  const loadStatement = useCallback(async () => {
    setLoadingPassport(true);
    try {
      const data = await fetchStatement({ interval: "monthly" });
      setPassport(data);
      if (data.creditOffer.maxAdvanceNgn >= 1000) {
        setAdvanceNgn(Math.min(10000, data.creditOffer.maxAdvanceNgn));
      }
    } finally {
      setLoadingPassport(false);
    }
  }, [fetchStatement]);

  useEffect(() => {
    let ignore = false;
    fetchStatement({ interval: "monthly" })
      .then((data) => {
        if (!ignore) {
          setPassport(data);
          if (data.creditOffer.maxAdvanceNgn >= 1000) {
            setAdvanceNgn(Math.min(10000, data.creditOffer.maxAdvanceNgn));
          }
        }
      })
      .finally(() => {
        if (!ignore) {
          setLoadingPassport(false);
        }
      });
    return () => {
      ignore = true;
    };
  }, [fetchStatement]);

  if (!wallet) return null;

  const fxRate = wallet.rate.usdNgn;
  const availableUsdc = wallet.balances?.save.available ?? 0;
  const lockedUsdc = wallet.balances?.save.locked ?? 0;
  const isLocked = wallet.lock.active;

  const requiredCollateralUsdc =
    Math.ceil(((advanceNgn * COLLATERAL_RATIO) / fxRate) * 100) / 100;

  const maxInflow = Math.max(
    ...(passport?.statement.series.map((s) => s.inflow) ?? [150000]),
    150000,
  );

  const handleRequestAdvance = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdvanceError(null);
    setAdvanceSuccess(null);
    setRequesting(true);
    try {
      const res = await requestRentAdvance(advanceNgn, purpose);
      setAdvanceSuccess(
        `₦${res.advanceNgn.toLocaleString("en-NG")} has been added to your Naira Spend balance. $${res.collateralUsdc.toFixed(2)} of your US Dollar savings is safely held as collateral.`,
      );
      await loadStatement();
    } catch (err) {
      setAdvanceError(
        err instanceof Error ? err.message : "Could not process rent advance.",
      );
    } finally {
      setRequesting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1
          className="text-2xl font-bold text-slate-900"
          style={{ fontFamily: "var(--font-jakarta)" }}
        >
          Credit & Income Statements
        </h1>
        <p className="text-sm text-slate-600">
          Prove your income to Lagos landlords or unlock a Naira rent advance
          without selling your US Dollar savings.
        </p>
      </div>

      {/* Section 1: Verified Landlord Income Statement */}
      <div className="rounded-3xl bg-white border border-[#E4E7DF] p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#0A3622]">
              Financial Passport
            </span>
            <h2
              className="text-lg font-bold text-slate-900 mt-0.5"
              style={{ fontFamily: "var(--font-jakarta)" }}
            >
              Verified Cash-Flow Statement
            </h2>
            <p className="text-xs text-slate-500">
              Official multi-month income summary accepted by landlords and
              property managers
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              type="button"
              onClick={loadStatement}
              className="h-9 px-3 rounded-xl bg-[#F7F8F5] hover:bg-slate-200/70 border border-[#E4E7DF] text-xs font-semibold text-slate-700 flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${loadingPassport ? "animate-spin" : ""}`}
              />
              <span>Refresh</span>
            </button>
            <button
              type="button"
              disabled={!passport}
              onClick={() => setShowPrintModal(true)}
              className="h-9 px-3.5 rounded-xl bg-[#0A3622] hover:bg-[#14532D] disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>View & Print Statement</span>
            </button>
          </div>
        </div>

        {loadingPassport && !passport && (
          <div className="space-y-4 animate-pulse">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="h-20 rounded-2xl bg-[#F7F8F5] border border-[#E4E7DF]" />
              <div className="h-20 rounded-2xl bg-[#F7F8F5] border border-[#E4E7DF]" />
              <div className="h-20 rounded-2xl bg-emerald-50/70 border border-emerald-200" />
            </div>
            <div className="h-40 rounded-2xl bg-[#F7F8F5] border border-[#E4E7DF]" />
          </div>
        )}

        {passport && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-4 rounded-2xl bg-[#F7F8F5] border border-[#E4E7DF]">
                <div className="text-xs text-slate-500">Total Inflow</div>
                <div className="mt-1 text-lg font-bold font-mono tabular-nums text-[#0A3622]">
                  ₦
                  {passport.statement.summary.totalInflow.toLocaleString(
                    "en-NG",
                  )}
                </div>
              </div>
              <div className="p-4 rounded-2xl bg-[#F7F8F5] border border-[#E4E7DF]">
                <div className="text-xs text-slate-500">Total Outflow</div>
                <div className="mt-1 text-lg font-bold font-mono tabular-nums text-slate-900">
                  ₦
                  {passport.statement.summary.totalOutflow.toLocaleString(
                    "en-NG",
                  )}
                </div>
              </div>
              <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200">
                <div className="text-xs text-emerald-900">Net Cash Surplus</div>
                <div className="mt-1 text-lg font-bold font-mono tabular-nums text-[#0A3622]">
                  +₦
                  {passport.statement.summary.netCashFlow.toLocaleString(
                    "en-NG",
                  )}
                </div>
              </div>
            </div>

            {/* Monthly Bar Chart */}
            <div className="p-4 rounded-2xl bg-[#F7F8F5] border border-[#E4E7DF] space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-600">
                <span className="font-semibold flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-[#0A3622]" />
                  <span>Monthly Inflow vs. Net Surplus</span>
                </span>
                <span className="font-mono text-slate-500">
                  Avg monthly inflow: ₦
                  {passport.creditOffer.avgMonthlyInflow.toLocaleString("en-NG")}
                </span>
              </div>

              <div className="grid grid-cols-4 gap-3 items-end h-28 pt-2">
                {passport.statement.series.slice(-4).map((pt) => {
                  const inflowPct = Math.max(
                    12,
                    Math.round((pt.inflow / maxInflow) * 100),
                  );
                  const netPct = Math.max(
                    8,
                    Math.round((Math.max(0, pt.net) / maxInflow) * 100),
                  );
                  const monthLabel = new Date(
                    `${pt.date}T00:00:00Z`,
                  ).toLocaleDateString("en-NG", {
                    month: "short",
                    year: "2-digit",
                  });
                  return (
                    <div
                      key={pt.date}
                      className="flex flex-col items-center justify-end h-full gap-1.5"
                    >
                      <div className="w-full flex items-end justify-center gap-1.5 h-full">
                        <div
                          style={{ height: `${inflowPct}%` }}
                          className="w-3.5 rounded-t bg-[#0A3622]"
                          title={`Inflow: ₦${pt.inflow.toLocaleString("en-NG")}`}
                        />
                        <div
                          style={{ height: `${netPct}%` }}
                          className="w-3.5 rounded-t bg-emerald-400"
                          title={`Net: ₦${pt.net.toLocaleString("en-NG")}`}
                        />
                      </div>
                      <span className="text-[11px] font-mono text-slate-500">
                        {monthLabel}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Section 2: Rent Micro-Advance Backed by US Dollar Savings */}
      <form
        onSubmit={handleRequestAdvance}
        className="rounded-3xl bg-white border border-[#E4E7DF] p-6 space-y-5"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-amber-800">
              Keep Your Dollars
            </span>
            <h2
              className="text-lg font-bold text-slate-900 mt-0.5 flex items-center gap-2"
              style={{ fontFamily: "var(--font-jakarta)" }}
            >
              <Landmark className="w-4 h-4 text-[#0A3622]" />
              <span>Instant Naira Rent Advance</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Unlock Naira for rent or emergencies using your US Dollar Save
              balance as collateral—without selling a single dollar.
            </p>
          </div>
          {isLocked && <Lock className="w-4 h-4 text-rose-600 shrink-0" />}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Advance Amount Needed (NGN)
            </label>
            <input
              type="number"
              min={1000}
              step={1000}
              value={advanceNgn}
              onChange={(e) => setAdvanceNgn(Number(e.target.value) || 0)}
              className="w-full h-11 px-3.5 rounded-xl bg-[#F7F8F5] border border-[#E4E7DF] text-sm font-mono tabular-nums text-slate-900 focus:outline-none focus:border-[#0A3622] focus:bg-white"
            />
            <div className="flex items-center gap-1.5 mt-2">
              {[5000, 10000, 15000, 25000].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setAdvanceNgn(preset)}
                  className="h-7 px-2.5 rounded-lg bg-[#F7F8F5] hover:bg-slate-200/70 border border-[#E4E7DF] text-[11px] font-mono text-slate-700 cursor-pointer"
                >
                  ₦{(preset / 1000).toFixed(0)}k
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Purpose
            </label>
            <select
              value={purpose}
              onChange={(e) =>
                setPurpose(
                  e.target.value as "RENT" | "SCHOOL_FEES" | "EMERGENCY",
                )
              }
              className="w-full h-11 px-3.5 rounded-xl bg-[#F7F8F5] border border-[#E4E7DF] text-sm text-slate-900 focus:outline-none focus:border-[#0A3622] focus:bg-white"
            >
              <option value="RENT">Rent & Housing</option>
              <option value="SCHOOL_FEES">School & Training Fees</option>
              <option value="EMERGENCY">Family Emergency</option>
            </select>
          </div>
        </div>

        {/* Collateral Breakdown */}
        <div className="p-4 rounded-2xl bg-[#F7F8F5] border border-[#E4E7DF] grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div>
            <div className="text-slate-500">Naira Disbursed to Spend</div>
            <div className="text-base font-bold font-mono text-[#0A3622] mt-0.5">
              +₦{advanceNgn.toLocaleString("en-NG")}
            </div>
          </div>
          <div>
            <div className="text-slate-500">US Dollar Collateral Required</div>
            <div className="text-base font-bold font-mono text-slate-900 mt-0.5">
              ${requiredCollateralUsdc.toFixed(2)} USD
            </div>
          </div>
          <div>
            <div className="text-slate-500">Your Available Dollar Save</div>
            <div className="text-base font-bold font-mono text-slate-900 mt-0.5">
              ${availableUsdc.toFixed(2)} USD
              {lockedUsdc > 0 && (
                <span className="text-[11px] font-normal text-amber-800 block">
                  (${lockedUsdc.toFixed(2)} currently pledged)
                </span>
              )}
            </div>
          </div>
        </div>

        {advanceError && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-800">
            <p>{advanceError}</p>
          </div>
        )}

        {advanceSuccess && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 font-medium">
            {advanceSuccess}
          </div>
        )}

        <button
          type="submit"
          disabled={requesting || advanceNgn < 1000}
          className="w-full h-12 rounded-xl bg-[#0A3622] hover:bg-[#14532D] disabled:opacity-50 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
        >
          <ShieldCheck className="w-4 h-4" />
          <span>
            {requesting
              ? "Disbursing Advance..."
              : `Unlock ₦${advanceNgn.toLocaleString("en-NG")} Advance (Lock $${requiredCollateralUsdc.toFixed(2)} USD)`}
          </span>
        </button>
      </form>

      {/* Printable Statement Modal */}
      {showPrintModal && passport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-xl rounded-3xl bg-white text-slate-900 shadow-2xl overflow-hidden border border-[#E4E7DF]">
            <div className="px-6 py-4 bg-[#0A3622] text-white flex items-center justify-between no-print">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-300" />
                <span className="text-xs font-semibold">
                  Duro Official Landlord Income Statement
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3.5 py-1.5 rounded-xl bg-white text-[#0A3622] font-semibold text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print / Save PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowPrintModal(false)}
                  className="p-1.5 rounded-lg text-emerald-100 hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="p-6 sm:p-8 space-y-5 text-xs">
              <div className="flex items-start justify-between border-b border-slate-200 pb-4">
                <div>
                  <div
                    className="text-xl font-bold text-slate-900"
                    style={{ fontFamily: "var(--font-jakarta)" }}
                  >
                    DURO FINANCIAL PASSPORT
                  </div>
                  <div className="text-slate-500 mt-0.5">
                    Consented Income & Savings Verification Certificate
                  </div>
                </div>
                <div className="text-right font-mono">
                  <div className="font-bold text-[#0A3622]">
                    IDENTITY VERIFIED
                  </div>
                  <div className="text-slate-500 mt-0.5">
                    Ref: {passport.statement.statementId}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 bg-[#F7F8F5] p-4 rounded-2xl border border-[#E4E7DF]">
                <div>
                  <div className="text-slate-500">Account Holder</div>
                  <div className="font-bold text-sm text-slate-900 mt-0.5">
                    {passport.statement.holder.fullName}
                  </div>
                  <div className="text-slate-500 mt-2">Phone & NIN</div>
                  <div className="font-mono text-slate-800 mt-0.5">
                    {passport.statement.holder.phone} · NIN{" "}
                    {passport.statement.holder.ninMasked}
                  </div>
                </div>
                <div>
                  <div className="text-slate-500">Verification Method</div>
                  <div className="font-bold text-sm text-slate-900 mt-0.5">
                    NIMC NIN + Biometric Selfie
                  </div>
                  <div className="text-slate-500 mt-2">
                    US Dollar Savings Reserve
                  </div>
                  <div className="font-mono font-bold text-[#0A3622] mt-0.5">
                    ${passport.statement.savings.usdc.toFixed(2)} USD (≈ ₦
                    {passport.statement.savings.ngnEquivalent.toLocaleString(
                      "en-NG",
                    )}
                    )
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-3.5 rounded-2xl border border-[#E4E7DF]">
                  <div className="text-slate-500">Verified Inflow</div>
                  <div className="text-sm font-bold font-mono text-[#0A3622] mt-1">
                    ₦
                    {passport.statement.summary.totalInflow.toLocaleString(
                      "en-NG",
                    )}
                  </div>
                </div>
                <div className="p-3.5 rounded-2xl border border-[#E4E7DF]">
                  <div className="text-slate-500">Total Outflow</div>
                  <div className="text-sm font-bold font-mono text-slate-900 mt-1">
                    ₦
                    {passport.statement.summary.totalOutflow.toLocaleString(
                      "en-NG",
                    )}
                  </div>
                </div>
                <div className="p-3.5 rounded-2xl border border-[#E4E7DF]">
                  <div className="text-slate-500">Net Positive Surplus</div>
                  <div className="text-sm font-bold font-mono text-[#0A3622] mt-1">
                    +₦
                    {passport.statement.summary.netCashFlow.toLocaleString(
                      "en-NG",
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-200 text-[11px] text-slate-500">
                <span className="flex items-center gap-1.5 text-[#0A3622] font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Verified by Duro Financial Access</span>
                </span>
                <span className="font-mono">
                  Issued: {passport.statement.generatedAt.slice(0, 10)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
