"use client";

import React, { useState } from "react";
import {
  CheckCircle2,
  Laptop,
  LogOut,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  UserCheck,
} from "lucide-react";
import { useDuro } from "@/components/duro-context";

export default function SettingsPage() {
  const {
    wallet,
    switchToUnrecognizedDevice,
    openRecoveryModal,
    startFreshOnboarding,
    resetDemoAccount,
  } = useDuro();

  const [switchingDevice, setSwitchingDevice] = useState(false);
  const [resetting, setResetting] = useState(false);

  if (!wallet) return null;

  const isLocked = wallet.lock.active;
  const activeDeviceId = wallet.device.id ?? wallet.profile.trustedDeviceId;

  const handleSimulateNewDevice = async () => {
    setSwitchingDevice(true);
    try {
      await switchToUnrecognizedDevice();
    } finally {
      setSwitchingDevice(false);
    }
  };

  const handleReset = async () => {
    setResetting(true);
    try {
      await resetDemoAccount();
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1
          className="text-2xl font-bold text-slate-900"
          style={{ fontFamily: "var(--font-jakarta)" }}
        >
          Security & Devices
        </h1>
        <p className="text-sm text-slate-600">
          Manage your verified identity, trusted devices, and 24-hour SIM-swap
          protection.
        </p>
      </div>

      {/* Identity & Verification Card */}
      <div className="rounded-3xl bg-white border border-[#E4E7DF] p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-[#0A3622] flex items-center justify-center">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h2
                className="text-base font-bold text-slate-900"
                style={{ fontFamily: "var(--font-jakarta)" }}
              >
                {wallet.profile.fullName}
              </h2>
              <p className="text-xs text-slate-500">{wallet.profile.email}</p>
            </div>
          </div>

          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-xs font-semibold text-[#0A3622]">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>NIMC Tier 3 Verified</span>
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          <div className="p-3.5 rounded-2xl bg-[#F7F8F5] border border-[#E4E7DF]">
            <div className="text-xs text-slate-500">Phone Number</div>
            <div className="text-sm font-mono font-semibold text-slate-900 mt-0.5">
              {wallet.profile.phone}
            </div>
          </div>
          <div className="p-3.5 rounded-2xl bg-[#F7F8F5] border border-[#E4E7DF]">
            <div className="text-xs text-slate-500">National ID (NIN)</div>
            <div className="text-sm font-mono font-semibold text-slate-900 mt-0.5">
              {wallet.profile.ninMasked}
            </div>
          </div>
          <div className="p-3.5 rounded-2xl bg-[#F7F8F5] border border-[#E4E7DF]">
            <div className="text-xs text-slate-500">Auto-Save Split</div>
            <div className="text-sm font-mono font-semibold text-[#0A3622] mt-0.5">
              {wallet.profile.autoSavePercent}% of deposits
            </div>
          </div>
        </div>
      </div>

      {/* Trusted Devices & Lost-Phone / SIM-Swap Protection */}
      <div className="rounded-3xl bg-white border border-[#E4E7DF] p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#0A3622]">
              Lost-Phone Guardrail
            </span>
            <h2
              className="text-lg font-bold text-slate-900 mt-0.5"
              style={{ fontFamily: "var(--font-jakarta)" }}
            >
              Trusted Devices & 24-Hour Velocity Lock
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              If someone signs in with your SIM on a new phone, Duro freezes
              your US Dollar savings for 24 hours and blocks transfers to
              unknown bank accounts until you verify with a live selfie.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {/* Primary Trusted Device */}
          <div
            className={`p-4 rounded-2xl border flex items-center justify-between gap-3 ${
              !isLocked
                ? "bg-emerald-50/60 border-[#0A3622]"
                : "bg-[#F7F8F5] border-[#E4E7DF]"
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white border border-[#E4E7DF] text-[#0A3622] flex items-center justify-center">
                <Smartphone className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-slate-900">
                    {wallet.profile.firstName}&apos;s Primary Phone
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-[#0A3622] text-[11px] font-semibold">
                    Trusted Device
                  </span>
                </div>
                <div className="text-xs font-mono text-slate-500 mt-0.5">
                  Lagos, Nigeria · ID: {wallet.profile.trustedDeviceId}
                </div>
              </div>
            </div>
            {!isLocked && (
              <span className="text-xs font-semibold text-[#0A3622] flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" />
                <span>Active</span>
              </span>
            )}
          </div>

          {/* Unrecognized Device Test Row */}
          <div
            className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
              isLocked
                ? "bg-rose-50 border-rose-300"
                : "bg-[#F7F8F5] border-[#E4E7DF]"
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  isLocked
                    ? "bg-rose-100 text-rose-700"
                    : "bg-white border border-[#E4E7DF] text-slate-600"
                }`}
              >
                {isLocked ? (
                  <ShieldAlert className="w-5 h-5" />
                ) : (
                  <Laptop className="w-5 h-5" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-slate-900">
                    New / Unrecognized Device
                  </span>
                  {isLocked && (
                    <span className="px-2 py-0.5 rounded-full bg-rose-200 text-rose-900 text-[11px] font-semibold">
                      24h Lock Triggered
                    </span>
                  )}
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  {isLocked
                    ? `Active session on ${activeDeviceId} — US Dollar withdrawals & new recipients blocked`
                    : "Switch to an unrecognized device to experience Duro's lost-phone protection"}
                </div>
              </div>
            </div>

            {isLocked ? (
              <button
                type="button"
                onClick={openRecoveryModal}
                className="h-10 px-4 rounded-xl bg-[#0A3622] hover:bg-[#14532D] text-white text-xs font-semibold whitespace-nowrap cursor-pointer"
              >
                Verify Selfie to Trust Device
              </button>
            ) : (
              <button
                type="button"
                disabled={switchingDevice}
                onClick={handleSimulateNewDevice}
                className="h-10 px-4 rounded-xl bg-white hover:bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold whitespace-nowrap cursor-pointer"
              >
                {switchingDevice
                  ? "Switching..."
                  : "Simulate New-Device Sign-In"}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Account Actions */}
      <div className="rounded-3xl bg-white border border-[#E4E7DF] p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2
            className="text-sm font-bold text-slate-900"
            style={{ fontFamily: "var(--font-jakarta)" }}
          >
            Onboarding & Account Reset
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Walk through the 3-step NIN + Selfie onboarding screen again or
            reset balances to zero.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            disabled={resetting}
            onClick={handleReset}
            className="h-10 px-4 rounded-xl bg-[#F7F8F5] hover:bg-slate-200/70 border border-[#E4E7DF] text-slate-800 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{resetting ? "Resetting..." : "Reset Balances"}</span>
          </button>

          <button
            type="button"
            onClick={startFreshOnboarding}
            className="h-10 px-4 rounded-xl bg-white hover:bg-rose-50 border border-[#E4E7DF] hover:border-rose-200 text-slate-800 hover:text-rose-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  );
}
