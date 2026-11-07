"use client";

import React, { useState } from "react";
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  Laptop,
  Lock,
  LogOut,
  Plus,
  RotateCcw,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  Trash2,
  UserCheck,
  X,
} from "lucide-react";
import { NIGERIAN_BANKS, useDuro } from "@/components/duro-context";

export default function SettingsPage() {
  const {
    wallet,
    switchToUnrecognizedDevice,
    openRecoveryModal,
    startFreshOnboarding,
    resetDemoAccount,
    addTrustedRecipient,
    deleteTrustedRecipient,
  } = useDuro();

  const [switchingDevice, setSwitchingDevice] = useState(false);
  const [resetting, setResetting] = useState(false);

  // Trusted Beneficiaries Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [label, setLabel] = useState("");
  const [bankCode, setBankCode] = useState<string>(NIGERIAN_BANKS[0].code);
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [addingRecipient, setAddingRecipient] = useState(false);
  const [recipientError, setRecipientError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  if (!wallet) return null;

  const isLocked = wallet.lock.active;
  const activeDeviceId = wallet.device.id ?? wallet.profile.trustedDeviceId;
  const recipients = wallet.recipients ?? [];

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

  const handleAddRecipient = async (e: React.FormEvent) => {
    e.preventDefault();
    setRecipientError(null);

    if (isLocked) {
      setRecipientError(
        "For your safety against coercion and theft, new beneficiaries cannot be added while the 24-hour cooling-off lock is active.",
      );
      return;
    }

    if (!accountNumber || accountNumber.length !== 10) {
      setRecipientError("Account number must be exactly 10 digits.");
      return;
    }

    if (!accountName.trim()) {
      setRecipientError("Please enter the account holder's name.");
      return;
    }

    const bank = NIGERIAN_BANKS.find((b) => b.code === bankCode) ?? NIGERIAN_BANKS[0];
    setAddingRecipient(true);
    try {
      await addTrustedRecipient({
        label: label.trim() || accountName.trim(),
        bankName: bank.name,
        bankCode: bank.code,
        accountNumber: accountNumber.trim(),
        accountName: accountName.trim(),
      });
      setShowAddModal(false);
      setLabel("");
      setAccountNumber("");
      setAccountName("");
    } catch (err) {
      setRecipientError(
        err instanceof Error ? err.message : "Failed to add trusted beneficiary.",
      );
    } finally {
      setAddingRecipient(false);
    }
  };

  const handleDeleteRecipient = async (id: string, name: string) => {
    if (isLocked) return;
    if (recipients.length <= 1) {
      alert("You must keep at least one trusted recipient for emergency payouts.");
      return;
    }
    if (!confirm(`Are you sure you want to remove "${name}" from your trusted accounts?`)) {
      return;
    }

    setDeletingId(id);
    try {
      await deleteTrustedRecipient(id);
    } finally {
      setDeletingId(null);
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
          Manage your verified identity, trusted devices, trusted beneficiaries, and 24-hour SIM-swap protection.
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

      {/* Trusted Accounts & Emergency Beneficiaries Card */}
      <div className="rounded-3xl bg-white border border-[#E4E7DF] p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#0A3622]">
                Anti-Theft Whitelist
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-[#0A3622] text-[11px] font-semibold">
                <Shield className="w-3 h-3" />
                <span>Exempt from 24h Lock</span>
              </span>
            </div>
            <h2
              className="text-lg font-bold text-slate-900 mt-0.5"
              style={{ fontFamily: "var(--font-jakarta)" }}
            >
              Trusted Accounts & Beneficiaries
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              These pre-verified bank accounts can receive the <strong>normal transfer amount</strong> even
              when your account is under a 24-hour device lock. For your protection against coercion,
              new accounts can only be added while in an unlocked state.
            </p>
          </div>

          <div>
            {isLocked ? (
              <div
                title="Adding new beneficiaries is locked during the 24-hour cooling-off period to prevent coercion and theft."
                className="h-10 px-4 rounded-xl bg-slate-100 border border-slate-200 text-slate-400 text-xs font-semibold flex items-center gap-1.5 cursor-not-allowed select-none"
              >
                <Lock className="w-3.5 h-3.5 text-slate-400" />
                <span>Addition Frozen (24h Lock)</span>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setRecipientError(null);
                  setShowAddModal(true);
                }}
                className="h-10 px-4 rounded-xl bg-[#0A3622] hover:bg-[#14532D] text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Trusted Account</span>
              </button>
            )}
          </div>
        </div>

        {isLocked && (
          <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200 flex items-start gap-3">
            <Lock className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-900 leading-relaxed">
              <strong>Anti-Coercion Protection Active:</strong> Because this device is in a 24-hour cooling-off window,
              adding new beneficiaries is strictly disabled. You can still send normal amounts to any of your saved
              trusted accounts below.
            </div>
          </div>
        )}

        <div className="space-y-3">
          {recipients.map((rcp) => (
            <div
              key={rcp.id}
              className="p-4 rounded-2xl bg-[#F7F8F5] border border-[#E4E7DF] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white border border-[#E4E7DF] text-[#0A3622] flex items-center justify-center shrink-0">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-900">{rcp.label}</span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-[#0A3622] text-[11px] font-semibold flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3" />
                      <span>Pre-Verified</span>
                    </span>
                  </div>
                  <div className="text-xs text-slate-600 mt-0.5">
                    {rcp.accountName} · <span className="font-semibold">{rcp.bankName}</span> (
                    <span className="font-mono">{rcp.accountNumberMasked}</span>)
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-2.5">
                <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100">
                  Normal Amount Allowed
                </span>
                {!isLocked && recipients.length > 1 && (
                  <button
                    type="button"
                    disabled={deletingId === rcp.id}
                    onClick={() => handleDeleteRecipient(rcp.id, rcp.label)}
                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                    title="Remove trusted beneficiary"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
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

      {/* Add Trusted Recipient Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl border border-[#E4E7DF] space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-[#0A3622] flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3
                    className="text-base font-bold text-slate-900"
                    style={{ fontFamily: "var(--font-jakarta)" }}
                  >
                    Add Trusted Beneficiary
                  </h3>
                  <p className="text-xs text-slate-500">
                    Exempt from 24h SIM-swap & device locks
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {recipientError && (
              <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div className="text-xs text-rose-700">{recipientError}</div>
              </div>
            )}

            <form onSubmit={handleAddRecipient} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Recipient Nickname / Label
                </label>
                <input
                  type="text"
                  placeholder="e.g. Mama Adunni, Spouse, Landlord"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl bg-[#F7F8F5] border border-[#E4E7DF] text-xs font-medium text-slate-900 focus:outline-none focus:border-[#0A3622]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Destination Bank
                </label>
                <select
                  value={bankCode}
                  onChange={(e) => setBankCode(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl bg-[#F7F8F5] border border-[#E4E7DF] text-xs font-medium text-slate-900 focus:outline-none focus:border-[#0A3622]"
                >
                  {NIGERIAN_BANKS.map((b) => (
                    <option key={b.code} value={b.code}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  10-Digit Account Number
                </label>
                <input
                  type="text"
                  maxLength={10}
                  placeholder="0123456789"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ""))}
                  className="w-full h-11 px-3.5 rounded-xl bg-[#F7F8F5] border border-[#E4E7DF] text-xs font-mono font-medium text-slate-900 focus:outline-none focus:border-[#0A3622]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Account Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Adunni Bakare"
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl bg-[#F7F8F5] border border-[#E4E7DF] text-xs font-medium text-slate-900 focus:outline-none focus:border-[#0A3622]"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="h-10 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addingRecipient}
                  className="h-10 px-5 rounded-xl bg-[#0A3622] hover:bg-[#14532D] text-white text-xs font-semibold cursor-pointer disabled:opacity-50"
                >
                  {addingRecipient ? "Saving..." : "Save as Trusted Beneficiary"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
