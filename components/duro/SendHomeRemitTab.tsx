"use client";

import React, { useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Lock,
  Plus,
  Send,
  ShieldAlert,
  ShieldCheck,
  UserPlus,
} from "lucide-react";
import { NIGERIAN_BANKS } from "@/lib/duro-api";
import { WalletStateResponse, WalletTransaction } from "@/lib/types";

interface SendHomeRemitTabProps {
  wallet: WalletStateResponse;
  onSendRemittance: (payload: {
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
  }) => Promise<{ transaction?: WalletTransaction; error?: string }>;
  onOpenRecoveryModal: () => void;
}

export default function SendHomeRemitTab({
  wallet,
  onSendRemittance,
  onOpenRecoveryModal,
}: SendHomeRemitTabProps) {
  const { user, balances, security, transactions } = wallet;
  const recipients = user.recipients;

  const [selectedRecipientId, setSelectedRecipientId] = useState<string>(
    recipients[0]?.id || ""
  );
  const [addingNew, setAddingNew] = useState(false);

  // New recipient form state
  const [newLabel, setNewLabel] = useState("Cousin Segun (Untrusted Test)");
  const [newBankCode, setNewBankCode] = useState(NIGERIAN_BANKS[1].code);
  const [newAccountNumber, setNewAccountNumber] = useState("0099887766");
  const [newAccountName, setNewAccountName] = useState("SEGUN OLADIPO");

  const [amountNgn, setAmountNgn] = useState<string>("20000");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activeTransfer, setActiveTransfer] = useState<WalletTransaction | null>(
    transactions.find((t) => t.type === "FAMILY_REMIT") || null
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    const numericAmount = Number(amountNgn);
    if (!numericAmount || numericAmount < 500) {
      setErrorMsg("Minimum transfer amount is ₦500.");
      return;
    }

    setSubmitting(true);
    const bankObj =
      NIGERIAN_BANKS.find((b) => b.code === newBankCode) || NIGERIAN_BANKS[0];

    const res = await onSendRemittance(
      addingNew
        ? {
            newRecipient: {
              label: newLabel.trim() || newAccountName.trim(),
              bankCode: bankObj.code,
              bankName: bankObj.name,
              accountNumber: newAccountNumber.trim(),
              accountName: newAccountName.trim(),
            },
            amountNgn: numericAmount,
          }
        : {
            recipientId: selectedRecipientId,
            amountNgn: numericAmount,
          }
    );
    setSubmitting(false);

    if (res.error) {
      setErrorMsg(res.error);
    } else if (res.transaction) {
      setActiveTransfer(res.transaction);
      setAddingNew(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Recipient & Remittance Form */}
      <form
        onSubmit={handleSubmit}
        className="rounded-2xl bg-[#131C31] border border-slate-800/90 p-4 space-y-3.5"
      >
        <div className="flex items-center justify-between">
          <div>
            <h2
              className="text-sm font-bold text-white"
              style={{ fontFamily: "var(--font-jakarta)" }}
            >
              Send Money Home (Instant NGN)
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Spend (`cNGN`) settles 1:1 to any Nigerian bank via Busha Payouts
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setAddingNew((prev) => !prev);
              setErrorMsg(null);
            }}
            className="min-h-[36px] px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 flex items-center gap-1.5 border border-slate-700 cursor-pointer whitespace-nowrap"
          >
            {addingNew ? (
              <span>Select Saved</span>
            ) : (
              <>
                <UserPlus className="w-3.5 h-3.5" />
                <span>New Recipient</span>
              </>
            )}
          </button>
        </div>

        {/* Saved Recipients Selector vs New Recipient Form */}
        {!addingNew ? (
          <div className="space-y-2">
            <label className="block text-xs font-medium text-slate-300">
              Choose Beneficiary (`recipient_id`)
            </label>
            <div className="space-y-2">
              {recipients.map((rec) => {
                const isSelected = selectedRecipientId === rec.id;
                const isBlockedByLock =
                  security.isSimSwapLocked && !rec.isPreVerified;
                return (
                  <button
                    key={rec.id}
                    type="button"
                    onClick={() => {
                      setSelectedRecipientId(rec.id);
                      setErrorMsg(null);
                    }}
                    className={`w-full p-3 rounded-xl border text-left transition-colors flex items-center justify-between gap-2 cursor-pointer ${
                      isSelected
                        ? "bg-emerald-500/10 border-emerald-500/50"
                        : "bg-slate-950/70 border-slate-800 hover:border-slate-700"
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold text-white truncate">
                          {rec.label}
                        </span>
                        <span aria-hidden="true" className="text-slate-600">
                          ·
                        </span>
                        {rec.isPreVerified ? (
                          <span className="text-[11px] text-emerald-400 flex items-center gap-1 font-medium">
                            <ShieldCheck className="w-3 h-3" />
                            Pre-Verified
                          </span>
                        ) : (
                          <span className="text-[11px] text-amber-400 flex items-center gap-1 font-medium">
                            <AlertTriangle className="w-3 h-3" />
                            Unverified New
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] font-mono tabular-nums text-slate-400 mt-0.5">
                        {rec.bankName} · {rec.accountNumber} ({rec.accountName})
                      </div>
                    </div>

                    {isBlockedByLock && (
                      <Lock className="w-4 h-4 text-rose-400 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="p-3.5 rounded-xl bg-slate-950/90 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5 text-emerald-400" />
                Add New Nigerian Bank Recipient
              </span>
              {security.isSimSwapLocked && (
                <span className="text-[11px] text-rose-400 font-medium">
                  Blocked During 24h Lock
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">
                  Bank
                </label>
                <select
                  value={newBankCode}
                  onChange={(e) => setNewBankCode(e.target.value)}
                  className="w-full h-10 px-2.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  {NIGERIAN_BANKS.map((b) => (
                    <option key={b.code} value={b.code}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">
                  10-Digit NUBAN Account
                </label>
                <input
                  type="text"
                  maxLength={10}
                  required
                  value={newAccountNumber}
                  onChange={(e) =>
                    setNewAccountNumber(e.target.value.replace(/\D/g, ""))
                  }
                  className="w-full h-10 px-2.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono tabular-nums text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">
                  Resolved Account Name
                </label>
                <input
                  type="text"
                  required
                  value={newAccountName}
                  onChange={(e) => setNewAccountName(e.target.value)}
                  className="w-full h-10 px-2.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">
                  Relationship Label
                </label>
                <input
                  type="text"
                  required
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  className="w-full h-10 px-2.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* Amount Input */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-medium text-slate-300">
              Amount to Send (NGN)
            </label>
            <span className="text-[11px] font-mono tabular-nums text-slate-400">
              Spend Available: ₦
              {balances.cNGN.available_balance.toLocaleString()}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={500}
              step={500}
              value={amountNgn}
              onChange={(e) => setAmountNgn(e.target.value)}
              className="w-full h-11 px-3 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono tabular-nums text-white focus:outline-none focus:border-emerald-500"
            />
            {[10000, 25000, 50000].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setAmountNgn(String(preset))}
                className="min-h-[44px] px-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-mono tabular-nums text-slate-300 cursor-pointer shrink-0"
              >
                ₦{(preset / 1000).toFixed(0)}k
              </button>
            ))}
          </div>
        </div>

        {/* Velocity Guard Error Callout */}
        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-rose-950/70 border border-rose-500/40 text-xs text-rose-200 space-y-2.5">
            <div className="flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span className="leading-relaxed">{errorMsg}</span>
            </div>
            {security.isSimSwapLocked && (
              <button
                type="button"
                onClick={onOpenRecoveryModal}
                className="min-h-[38px] px-3 py-1.5 rounded-lg bg-rose-500 hover:bg-rose-400 text-slate-950 font-semibold text-xs cursor-pointer"
              >
                Complete 3D Selfie Liveness Recovery
              </button>
            )}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full min-h-[48px] px-4 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-semibold text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
        >
          <Send className="w-4 h-4" />
          <span>
            {submitting
              ? "Executing Busha Payout..."
              : `Send ₦${Number(amountNgn || 0).toLocaleString()} Now`}
          </span>
        </button>
      </form>

      {/* Live 4-Stage Transfer Timeline */}
      {activeTransfer && activeTransfer.timeline && (
        <div className="rounded-2xl bg-[#131C31] border border-slate-800/90 p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-xs font-semibold text-white">
                4-Stage Busha Transfer Timeline
              </h3>
              <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                {activeTransfer.bushaTransferId} · ₦
                {activeTransfer.targetAmount.toLocaleString()} to{" "}
                {activeTransfer.recipientName}
              </p>
            </div>
            <span className="text-xs font-mono text-emerald-400 font-medium">
              {activeTransfer.status}
            </span>
          </div>

          <div className="space-y-3 relative before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-px before:bg-emerald-500/40">
            {activeTransfer.timeline.map((stage) => (
              <div
                key={stage.step}
                className="relative flex items-start gap-3 pl-1"
              >
                <div className="w-5 h-5 rounded-full bg-emerald-950 border border-emerald-500 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-slate-100">
                      {stage.label}
                    </span>
                    <span className="text-[10px] font-mono tabular-nums text-slate-400">
                      {stage.step}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {stage.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
