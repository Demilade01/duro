"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  Award,
  Building2,
  Home,
  Send,
  ShieldAlert,
  ShieldCheck,
  Terminal,
  UserCheck,
} from "lucide-react";
import { DuroApiClient } from "@/lib/duro-api";
import {
  BushaApiMode,
  WalletStateResponse,
  WalletTab,
} from "@/lib/types";
import HomeBalancesTab from "@/components/duro/HomeBalancesTab";
import FundWalletTab from "@/components/duro/FundWalletTab";
import SendHomeRemitTab from "@/components/duro/SendHomeRemitTab";
import FinancialPassportTab from "@/components/duro/FinancialPassportTab";
import SelfieLivenessModal from "@/components/duro/SelfieLivenessModal";
import JudgeTelemetryDrawer from "@/components/duro/JudgeTelemetryDrawer";

/**
 * Environment-driven flag for the Judge Telemetry Console.
 * Defaults to enabled unless NEXT_PUBLIC_ENABLE_JUDGE_CONSOLE === "false" in Vercel settings.
 */
const IS_JUDGE_CONSOLE_ENABLED_IN_ENV =
  process.env.NEXT_PUBLIC_ENABLE_JUDGE_CONSOLE !== "false";

export default function DuroWorkspacePage() {
  const [activeTab, setActiveTab] = useState<WalletTab>("home");
  const [apiMode, setApiMode] = useState<BushaApiMode>("MOCK");
  const [activeDeviceId, setActiveDeviceId] = useState<string>(
    "DEV_TUNDE_IPHONE_01"
  );
  const [wallet, setWallet] = useState<WalletStateResponse | null>(null);

  // Judge Console Drawer visibility (can be toggled open/closed by the user)
  const [isJudgeDrawerOpen, setIsJudgeDrawerOpen] = useState<boolean>(false);

  // Liveness / Onboarding Modal state
  const [livenessModal, setLivenessModal] = useState<{
    open: boolean;
    mode: "ONBOARDING" | "RECOVERY";
  }>({ open: false, mode: "ONBOARDING" });

  // Toast banner for immediate user feedback
  const [toastMessage, setToastMessage] = useState<{
    text: string;
    tone: "emerald" | "rose" | "sky";
  } | null>(null);

  const showToast = useCallback(
    (text: string, tone: "emerald" | "rose" | "sky" = "emerald") => {
      setToastMessage({ text, tone });
      setTimeout(() => {
        setToastMessage((prev) => (prev?.text === text ? null : prev));
      }, 4000);
    },
    []
  );

  useEffect(() => {
    let mounted = true;
    DuroApiClient.getWallet(activeDeviceId, apiMode).then((data) => {
      if (mounted) {
        setWallet(data);
      }
    });
    return () => {
      mounted = false;
    };
  }, [activeDeviceId, apiMode]);

  if (!wallet) {
    return (
      <div className="min-h-screen bg-[#090D16] text-slate-100 flex items-center justify-center p-6">
        <div className="w-full max-w-[420px] rounded-3xl bg-[#0D1322] border border-slate-800 p-6 space-y-4 animate-pulse">
          <div className="h-6 w-36 bg-slate-800 rounded-lg" />
          <div className="h-28 w-full bg-slate-900 rounded-2xl" />
          <div className="grid grid-cols-2 gap-3">
            <div className="h-24 bg-slate-900 rounded-2xl" />
            <div className="h-24 bg-slate-900 rounded-2xl" />
          </div>
          <div className="h-32 bg-slate-900 rounded-2xl" />
        </div>
      </div>
    );
  }

  const handleCompleteOnboarding = async (payload: {
    fullName: string;
    phone: string;
    email: string;
    nin: string;
    selfieImage: string;
  }) => {
    const next = await DuroApiClient.completeOnboarding(
      payload,
      activeDeviceId,
      apiMode
    );
    setWallet(next);
    showToast(
      `KYC Verified! Busha Profile ${next.user.bushaProfileId} active.`,
      "emerald"
    );
  };

  const handleCompleteRecovery = async (payload: {
    nin: string;
    selfieImage: string;
  }) => {
    const res = await DuroApiClient.handleSimSwapSecurity(
      {
        action: "RECOVER_IDENTITY",
        nin: payload.nin,
        selfieImage: payload.selfieImage,
      },
      activeDeviceId,
      apiMode
    );
    if (res.error) {
      throw new Error(res.error);
    }
    setActiveDeviceId(res.nextDeviceId);
    setWallet(res.state);
    showToast(
      `3D Liveness Verified! 24h SIM-Swap Lock cleared & device ${res.nextDeviceId} trusted.`,
      "emerald"
    );
  };

  const handleSimulateSalaryInflow = async (amount: number = 150000) => {
    const next = await DuroApiClient.simulateSalaryWebhook(
      amount,
      activeDeviceId,
      apiMode
    );
    setWallet(next);
    const splitPct = next.user.autoSavePercent;
    const savedUsdc = (
      Math.round((amount * splitPct) / 100) /
      next.balances.fxRateNgnPerUsd
    ).toFixed(2);
    showToast(
      `Salary Inflow: +₦${amount.toLocaleString()} received! Auto-shielded $${savedUsdc} USDC (${splitPct}%).`,
      "emerald"
    );
  };

  const handleSimulateSimSwapAttack = async () => {
    const res = await DuroApiClient.handleSimSwapSecurity(
      {
        action: "SIMULATE_ATTACK",
        newDeviceId: "DEV_HACKER_99",
      },
      activeDeviceId,
      apiMode
    );
    setActiveDeviceId(res.nextDeviceId);
    setWallet(res.state);
    showToast(
      "SIM-Swap Attack Simulated! Unrecognized device DEV_HACKER_99 triggered 24h Velocity Lock.",
      "rose"
    );
  };

  const handleUpdateSplitOrSwap = async (payload: {
    autoSavePercent?: number;
    swap?: { direction: "CNGN_TO_USDC" | "USDC_TO_CNGN"; amount: number };
  }) => {
    const res = await DuroApiClient.updateSplitOrSwap(
      payload,
      activeDeviceId,
      apiMode
    );
    setWallet(res.state);
    return { error: res.error };
  };

  const handleGenerateAccount = async (amountNgn: number) => {
    const next = await DuroApiClient.generateFundingAccount(
      amountNgn,
      activeDeviceId,
      apiMode
    );
    setWallet(next);
    showToast(
      "Temporary Providus Bank virtual account generated via Busha Quotes.",
      "sky"
    );
  };

  const handleSendRemittance = async (payload: {
    recipientId?: string;
    newRecipient?: {
      label: string;
      bankCode: string;
      bankName: string;
      accountNumber: string;
      accountName: string;
    };
    amountNgn: number;
    narration?: string;
  }) => {
    const res = await DuroApiClient.sendRemittance(
      payload,
      activeDeviceId,
      apiMode
    );
    setWallet(res.state);
    if (!res.error && res.transaction) {
      showToast(
        `₦${payload.amountNgn.toLocaleString()} delivered to ${res.transaction.recipientName}!`,
        "emerald"
      );
    }
    return { transaction: res.transaction, error: res.error };
  };

  const handleRefreshInsights = async () => {
    const next = await DuroApiClient.fetchPassportInsights(
      activeDeviceId,
      apiMode
    );
    setWallet(next);
    showToast("Synced cash-flow trends from Busha Insights API.", "sky");
  };

  const handleCreateRentPledge = async (payload: {
    collateralUsdc: number;
    advanceNgn: number;
  }) => {
    const res = await DuroApiClient.createRentAdvancePledge(
      payload,
      activeDeviceId,
      apiMode
    );
    setWallet(res.state);
    if (!res.error) {
      showToast(
        `Rent Advance Disbursed: +₦${payload.advanceNgn.toLocaleString()} credited to Spend!`,
        "emerald"
      );
    }
    return { error: res.error };
  };

  const handleResetSandbox = () => {
    const fresh = DuroApiClient.resetSandbox();
    setActiveDeviceId("DEV_TUNDE_IPHONE_01");
    setWallet(fresh);
    showToast("Sandbox reset to initial Tunde state.", "sky");
  };

  const navItems: { id: WalletTab; label: string; icon: React.ReactNode }[] = [
    { id: "home", label: "Balances", icon: <Home className="w-4 h-4" /> },
    { id: "fund", label: "Fund", icon: <Building2 className="w-4 h-4" /> },
    { id: "send", label: "Send Home", icon: <Send className="w-4 h-4" /> },
    { id: "passport", label: "Passport", icon: <Award className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#090D16] text-slate-100">
      {/* Top Bar following 3-Zone Contract */}
      <header className="sticky top-0 z-30 flex items-center justify-between gap-8 px-4 sm:px-8 py-3.5 bg-[#090D16]/90 backdrop-blur-md border-b border-slate-800/80 no-print">
        {/* Zone 1: Single text element wordmark */}
        <a
          href="#top"
          className="text-lg font-bold tracking-tight text-white whitespace-nowrap shrink-0"
          style={{ fontFamily: "var(--font-jakarta)" }}
        >
          Duro
        </a>

        {/* Zone 2: 4 Single-line text navigation links */}
        <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-slate-400">
          {navItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveTab(item.id)}
              className={`hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer pb-0.5 ${
                activeTab === item.id
                  ? "text-white border-b-2 border-emerald-400"
                  : ""
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>

        {/* Zone 3: Primary Action (Toggle Judge Console when enabled in Vercel env, or KYC Status) */}
        <div className="flex items-center gap-3 shrink-0">
          {IS_JUDGE_CONSOLE_ENABLED_IN_ENV ? (
            <button
              type="button"
              onClick={() => setIsJudgeDrawerOpen((prev) => !prev)}
              className={`min-h-[38px] px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer border ${
                isJudgeDrawerOpen
                  ? "bg-emerald-500 text-slate-950 border-emerald-400"
                  : "bg-slate-900 hover:bg-slate-800 text-slate-100 border-slate-700"
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>
                {isJudgeDrawerOpen
                  ? "Hide Judge Console"
                  : "Judge & Chaos Console"}
              </span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() =>
                setLivenessModal({ open: true, mode: "ONBOARDING" })
              }
              className="min-h-[38px] px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-slate-100 border border-slate-800 whitespace-nowrap shrink-0 cursor-pointer"
            >
              KYC Profile
            </button>
          )}
        </div>
      </header>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 max-w-md w-[92%] sm:w-auto px-4 py-2.5 rounded-2xl shadow-2xl border text-xs font-medium flex items-center gap-2 bg-slate-900/95 backdrop-blur-md border-slate-700 text-white no-print">
          <span
            className={
              toastMessage.tone === "rose"
                ? "text-rose-400"
                : toastMessage.tone === "sky"
                ? "text-sky-400"
                : "text-emerald-400"
            }
          >
            ●
          </span>
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Main Split-Screen or Centered Mobile Workspace */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 py-6 flex flex-col lg:flex-row items-center lg:items-start justify-center gap-6 no-print">
        {/* Left Pane: Duro Mobile Viewport Container (max-w-[420px]) */}
        <section className="w-full max-w-[420px] shrink-0 rounded-[28px] bg-[#0D1322] border border-slate-800/90 shadow-2xl overflow-hidden flex flex-col">
          {/* Mobile Wallet Status Header */}
          <div className="px-4 py-3.5 border-b border-slate-800/80 flex items-center justify-between gap-2 bg-slate-950/40">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span
                  className="text-sm font-bold text-white truncate"
                  style={{ fontFamily: "var(--font-jakarta)" }}
                >
                  {wallet.user.fullName}
                </span>
                <span aria-hidden="true" className="text-slate-600">
                  ·
                </span>
                <span className="text-[11px] text-emerald-400 font-medium flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  NIMC Tier 3
                </span>
              </div>
              <div className="text-[11px] font-mono text-slate-400 truncate mt-0.5">
                {wallet.user.phone} · {wallet.user.bushaProfileId}
              </div>
            </div>

            <button
              type="button"
              onClick={() =>
                setLivenessModal({ open: true, mode: "ONBOARDING" })
              }
              className="min-h-[36px] px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[11px] font-medium text-slate-300 flex items-center gap-1 shrink-0 cursor-pointer"
            >
              <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>KYC / NIN</span>
            </button>
          </div>

          {/* Conditional Crimson 24-Hour SIM-Swap Velocity Lock Banner */}
          {wallet.security.isSimSwapLocked && (
            <div className="px-4 py-3 bg-rose-950/90 border-b border-rose-500/40 text-xs text-rose-100 space-y-2">
              <div className="flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <div className="font-bold text-rose-200">
                    24-Hour SIM-Swap Velocity Lock Active
                  </div>
                  <p className="text-[11px] text-rose-200/90 leading-relaxed">
                    Unrecognized device{" "}
                    <code className="font-mono font-semibold">
                      {activeDeviceId}
                    </code>{" "}
                    detected. Save (`USDC`) withdrawals are frozen and bank
                    payouts are restricted strictly to pre-verified family.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() =>
                  setLivenessModal({ open: true, mode: "RECOVERY" })
                }
                className="w-full min-h-[38px] px-3 py-1.5 rounded-xl bg-rose-500 hover:bg-rose-400 text-slate-950 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Verify NIN + 3D Selfie Liveness to Unlock</span>
              </button>
            </div>
          )}

          {/* Active Wallet Tab Viewport */}
          <div className="p-4 flex-1">
            {activeTab === "home" && (
              <HomeBalancesTab
                wallet={wallet}
                onNavigateTab={setActiveTab}
                onUpdateSplitOrSwap={handleUpdateSplitOrSwap}
                onOpenRecoveryModal={() =>
                  setLivenessModal({ open: true, mode: "RECOVERY" })
                }
              />
            )}

            {activeTab === "fund" && (
              <FundWalletTab
                wallet={wallet}
                onGenerateAccount={handleGenerateAccount}
                onSimulateSalaryInflow={handleSimulateSalaryInflow}
              />
            )}

            {activeTab === "send" && (
              <SendHomeRemitTab
                wallet={wallet}
                onSendRemittance={handleSendRemittance}
                onOpenRecoveryModal={() =>
                  setLivenessModal({ open: true, mode: "RECOVERY" })
                }
              />
            )}

            {activeTab === "passport" && (
              <FinancialPassportTab
                wallet={wallet}
                onRefreshInsights={handleRefreshInsights}
                onCreateRentPledge={handleCreateRentPledge}
                onOpenRecoveryModal={() =>
                  setLivenessModal({ open: true, mode: "RECOVERY" })
                }
              />
            )}
          </div>

          {/* Mobile Thumb-Zone Bottom Tab Bar */}
          <nav className="grid grid-cols-4 items-center border-t border-slate-800/90 bg-slate-950/90 px-2 py-1.5">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`min-h-[48px] rounded-xl flex flex-col items-center justify-center gap-1 transition-colors cursor-pointer ${
                    isActive
                      ? "text-emerald-400 bg-emerald-500/10 font-semibold"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {item.icon}
                  <span className="text-[10px] tracking-tight whitespace-nowrap">
                    {item.label}
                  </span>
                </button>
              );
            })}
          </nav>
        </section>

        {/* Right Pane: Collapsible & Vercel-Configurable Judge Telemetry & Chaos Drawer */}
        {IS_JUDGE_CONSOLE_ENABLED_IN_ENV && (
          <JudgeTelemetryDrawer
            isOpen={isJudgeDrawerOpen}
            onClose={() => setIsJudgeDrawerOpen(false)}
            wallet={wallet}
            apiMode={apiMode}
            activeDeviceId={activeDeviceId}
            onToggleApiMode={setApiMode}
            onSimulateSalaryInflow={() => handleSimulateSalaryInflow(150000)}
            onSimulateSimSwapAttack={handleSimulateSimSwapAttack}
            onOpenRecoveryModal={() =>
              setLivenessModal({ open: true, mode: "RECOVERY" })
            }
            onResetSandbox={handleResetSandbox}
          />
        )}
      </main>

      {/* Reusable Zero-Paperwork Onboarding & 3D Liveness Recovery Modal */}
      <SelfieLivenessModal
        isOpen={livenessModal.open}
        mode={livenessModal.mode}
        user={wallet.user}
        activeDeviceId={activeDeviceId}
        onClose={() => setLivenessModal((prev) => ({ ...prev, open: false }))}
        onCompleteOnboarding={handleCompleteOnboarding}
        onCompleteRecovery={handleCompleteRecovery}
      />
    </div>
  );
}
