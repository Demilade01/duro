"use client";

import React, { useEffect, useState } from "react";
import {
  CheckCircle2,
  Clock,
  Lock,
  Plus,
  Send,
  ShieldAlert,
  ShieldCheck,
  UserPlus,
} from "lucide-react";
import { NIGERIAN_BANKS, useDuro } from "@/components/duro-context";
import type { BushaTransfer } from "@/lib/api-types";

export default function SendPage() {
  const {
    wallet,
    sendRemittance,
    pollRemittance,
    openRecoveryModal,
  } = useDuro();

  const recipients = wallet?.recipients ?? [];
  const [selectedRecipientId, setSelectedRecipientId] = useState<string>(
    recipients[0]?.id ?? "",
  );
  const [addingNew, setAddingNew] = useState(false);

  // New recipient fields
  const [newLabel, setNewLabel] = useState("Cousin Segun");
  const [newBankCode, setNewBankCode] = useState<string>(
    NIGERIAN_BANKS[1].code,
  );
  const [newAccountNumber, setNewAccountNumber] = useState("0099887766");
  const [newAccountName, setNewAccountName] = useState("SEGUN OLADIPO");

  const [amountNgn, setAmountNgn] = useState<string>("20000");
  const [narration, setNarration] = useState<string>("Upkeep & groceries");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [activeTransfer, setActiveTransfer] = useState<{
    transfer: BushaTransfer;
    recipientLabel: string;
  } | null>(null);

  useEffect(() => {
    if (!selectedRecipientId && recipients[0]?.id) {
      setSelectedRecipientId(recipients[0].id);
    }
  }, [recipients, selectedRecipientId]);

  // Live 1-second polling while a payout transfer is progressing through the 4 stages
  useEffect(() => {
    if (!activeTransfer) return;
    if (
      activeTransfer.transfer.status === "funds_delivered" ||
      activeTransfer.transfer.status === "failed"
    ) {
      return;
    }
    const timer = setInterval(async () => {
      try {
        const res = await pollRemittance(activeTransfer.transfer.id);
        setActiveTransfer((prev) =>
          prev ? { ...prev, transfer: res.transfer } : null,
        );
      } catch {
        // ignore transient poll error
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [activeTransfer, pollRemittance]);

  if (!wallet) return null;

  const spendAvailable = wallet.balances?.spend.available ?? 0;
  const isLocked = wallet.lock.active;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    const amount = Number(amountNgn);
    if (!amount || amount < 100) {
      setErrorMsg("Minimum transfer amount is ₦100.");
      return;
    }
    setSubmitting(true);
    try {
      const bank =
        NIGERIAN_BANKS.find((b) => b.code === newBankCode) ?? NIGERIAN_BANKS[0];
      const res = await sendRemittance(
        addingNew
          ? {
              newRecipient: {
                label: newLabel.trim() || newAccountName.trim(),
                bankCode: bank.code,
                bankName: bank.name,
                accountNumber: newAccountNumber.trim(),
                accountName: newAccountName.trim(),
              },
              amountNgn: amount,
              narration: narration.trim() || undefined,
            }
          : {
              recipientId: selectedRecipientId,
              amountNgn: amount,
              narration: narration.trim() || undefined,
            },
      );
      setActiveTransfer({
        transfer: res.transfer,
        recipientLabel: `${res.recipient.label} (${res.recipient.bankName})`,
      });
      setAddingNew(false);
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : "Transfer could not be completed.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1
          className="text-2xl font-bold text-slate-900"
          style={{ fontFamily: "var(--font-jakarta)" }}
        >
          Send Money Home
        </h1>
        <p className="text-sm text-slate-600">
          Send Naira directly from your Spend balance to any Nigerian bank
          account in seconds.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="rounded-3xl bg-white border border-[#E4E7DF] p-6 space-y-5"
      >
        <div className="flex items-center justify-between">
          <div>
            <h2
              className="text-base font-bold text-slate-900"
              style={{ fontFamily: "var(--font-jakarta)" }}
            >
              Recipient Details
            </h2>
            <p className="text-xs text-slate-500">
              Choose a saved family beneficiary or add a new bank account
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setAddingNew((prev) => !prev);
              setErrorMsg(null);
            }}
            className="h-9 px-3.5 rounded-xl bg-[#F7F8F5] hover:bg-slate-200/70 border border-[#E4E7DF] text-xs font-semibold text-slate-800 flex items-center gap-1.5 cursor-pointer"
          >
            {addingNew ? (
              <span>Choose Saved Recipient</span>
            ) : (
              <>
                <UserPlus className="w-3.5 h-3.5" />
                <span>New Bank Account</span>
              </>
            )}
          </button>
        </div>

        {!addingNew ? (
          <div className="space-y-2.5">
            {recipients.map((rec) => {
              const isSelected = selectedRecipientId === rec.id;
              const blocked = isLocked && !rec.isPreVerified;
              return (
                <button
                  key={rec.id}
                  type="button"
                  onClick={() => {
                    setSelectedRecipientId(rec.id);
                    setErrorMsg(null);
                  }}
                  className={`w-full p-4 rounded-2xl border text-left transition-colors flex items-center justify-between gap-3 cursor-pointer ${
                    isSelected
                      ? "bg-emerald-50/70 border-[#0A3622]"
                      : "bg-[#F7F8F5] border-[#E4E7DF] hover:bg-slate-100/70"
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-900 truncate">
                        {rec.label}
                      </span>
                      {rec.isPreVerified && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-[#0A3622] text-[11px] font-semibold">
                          <ShieldCheck className="w-3 h-3" />
                          <span>Trusted Family</span>
                        </span>
                      )}
                    </div>
                    <div className="text-xs font-mono text-slate-500 mt-1">
                      {rec.bankName} · {rec.accountNumber} ({rec.accountName})
                    </div>
                  </div>
                  {blocked && <Lock className="w-4 h-4 text-rose-600 shrink-0" />}
                </button>
              );
            })}
          </div>
        ) : (
          <div className="p-4 rounded-2xl bg-[#F7F8F5] border border-[#E4E7DF] space-y-3.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5 text-[#0A3622]" />
                <span>New Nigerian Bank Recipient</span>
              </span>
              {isLocked && (
                <span className="text-[11px] font-semibold text-rose-700 bg-rose-100 px-2.5 py-0.5 rounded-full">
                  Restricted during 24h new-device lock
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Bank
                </label>
                <select
                  value={newBankCode}
                  onChange={(e) => setNewBankCode(e.target.value)}
                  className="w-full h-11 px-3 rounded-xl bg-white border border-[#E4E7DF] text-xs text-slate-900 focus:outline-none focus:border-[#0A3622]"
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
                  required
                  value={newAccountNumber}
                  onChange={(e) =>
                    setNewAccountNumber(e.target.value.replace(/\D/g, ""))
                  }
                  className="w-full h-11 px-3 rounded-xl bg-white border border-[#E4E7DF] text-xs font-mono text-slate-900 focus:outline-none focus:border-[#0A3622]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Account Holder Name
                </label>
                <input
                  type="text"
                  required
                  value={newAccountName}
                  onChange={(e) => setNewAccountName(e.target.value)}
                  className="w-full h-11 px-3 rounded-xl bg-white border border-[#E4E7DF] text-xs text-slate-900 focus:outline-none focus:border-[#0A3622]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nickname / Label
                </label>
                <input
                  type="text"
                  required
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  className="w-full h-11 px-3 rounded-xl bg-white border border-[#E4E7DF] text-xs text-slate-900 focus:outline-none focus:border-[#0A3622]"
                />
              </div>
            </div>
          </div>
        )}

        {/* Amount & Narration */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-700">
                Amount (NGN)
              </label>
              <span className="text-xs font-mono text-slate-500">
                Spend available: ₦{spendAvailable.toLocaleString("en-NG")}
              </span>
            </div>
            <input
              type="number"
              min={100}
              step={500}
              value={amountNgn}
              onChange={(e) => setAmountNgn(e.target.value)}
              className="w-full h-11 px-3.5 rounded-xl bg-[#F7F8F5] border border-[#E4E7DF] text-sm font-mono tabular-nums text-slate-900 focus:outline-none focus:border-[#0A3622] focus:bg-white"
            />
            <div className="flex items-center gap-1.5 mt-2">
              {[5000, 10000, 20000, 50000].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setAmountNgn(String(preset))}
                  className="h-7 px-2.5 rounded-lg bg-[#F7F8F5] hover:bg-slate-200/70 border border-[#E4E7DF] text-[11px] font-mono text-slate-700 cursor-pointer"
                >
                  ₦{(preset / 1000).toFixed(0)}k
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Note (Optional)
            </label>
            <input
              type="text"
              value={narration}
              onChange={(e) => setNarration(e.target.value)}
              placeholder="e.g. Mama upkeep"
              className="w-full h-11 px-3.5 rounded-xl bg-[#F7F8F5] border border-[#E4E7DF] text-sm text-slate-900 focus:outline-none focus:border-[#0A3622] focus:bg-white"
            />
          </div>
        </div>

        {errorMsg && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-800 space-y-2.5">
            <div className="flex items-start gap-2.5">
              <ShieldAlert className="w-4 h-4 text-rose-700 shrink-0 mt-0.5" />
              <span className="leading-relaxed">{errorMsg}</span>
            </div>
            {isLocked && (
              <button
                type="button"
                onClick={openRecoveryModal}
                className="h-9 px-3.5 rounded-xl bg-rose-700 hover:bg-rose-800 text-white font-semibold text-xs cursor-pointer"
              >
                Verify NIN & Selfie to Unlock New Recipients
              </button>
            )}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full h-12 rounded-xl bg-[#0A3622] hover:bg-[#14532D] disabled:opacity-50 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
        >
          <Send className="w-4 h-4" />
          <span>
            {submitting
              ? "Sending Transfer..."
              : `Send ₦${Number(amountNgn || 0).toLocaleString("en-NG")} Now`}
          </span>
        </button>
      </form>

      {/* Live 4-Stage Delivery Tracker */}
      {activeTransfer && (
        <div className="rounded-3xl bg-white border border-[#E4E7DF] p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3
                className="text-base font-bold text-slate-900"
                style={{ fontFamily: "var(--font-jakarta)" }}
              >
                Live Delivery Tracker
              </h3>
              <p className="text-xs text-slate-500">
                ₦{Number(activeTransfer.transfer.target_amount).toLocaleString("en-NG")}{" "}
                to {activeTransfer.recipientLabel}
              </p>
            </div>
            <span
              className={`px-3 py-1 rounded-full text-xs font-semibold capitalize ${
                activeTransfer.transfer.status === "funds_delivered"
                  ? "bg-emerald-50 text-[#0A3622]"
                  : "bg-amber-50 text-amber-800"
              }`}
            >
              {activeTransfer.transfer.status.replace(/_/g, " ")}
            </span>
          </div>

          <div className="space-y-3.5 pt-2">
            {activeTransfer.transfer.timeline.map((step) => (
              <div key={step.status} className="flex items-start gap-3">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                    step.done
                      ? "bg-[#0A3622] text-white"
                      : "bg-slate-100 border border-slate-300 text-slate-400"
                  }`}
                >
                  {step.done ? (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  ) : (
                    <Clock className="w-3.5 h-3.5" />
                  )}
                </div>
                <div className="flex-1 flex items-center justify-between gap-2">
                  <div>
                    <div
                      className={`text-xs font-semibold ${
                        step.done ? "text-slate-900" : "text-slate-400"
                      }`}
                    >
                      {step.label}
                    </div>
                    <div className="text-[11px] text-slate-400 capitalize">
                      {step.status.replace(/_/g, " ")}
                    </div>
                  </div>
                  {step.timestamp && (
                    <span className="text-[11px] font-mono text-slate-500">
                      {new Date(step.timestamp).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
