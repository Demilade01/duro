"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  Landmark,
  Lock,
  Plus,
  Send,
  ShieldAlert,
  ShieldCheck,
  UserPlus,
  X,
} from "lucide-react";
import { NIGERIAN_BANKS, useDuro } from "@/components/duro-context";
import type { BushaTransfer } from "@/lib/api-types";
import { getBushaPayoutFeeBreakdown } from "@/lib/money";

export default function SendPage() {
  const {
    wallet,
    sendRemittance,
    pollRemittance,
    openRecoveryModal,
  } = useDuro();

  const recipients = useMemo(() => wallet?.recipients ?? [], [wallet?.recipients]);
  const [selectedRecipientId, setSelectedRecipientId] = useState<string>("");
  const activeRecipientId = selectedRecipientId || recipients[0]?.id || "";
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

  // Pre-send confirmation prompt modal state
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const [activeTransfer, setActiveTransfer] = useState<{
    transfer: BushaTransfer;
    recipientLabel: string;
  } | null>(null);

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

  // Fee calculation (Busha official fiat payout schedule: ₦100 base + 7.5% VAT = ₦107.50)
  const parsedAmount = Number(amountNgn) || 0;
  const feeBreakdown = getBushaPayoutFeeBreakdown(parsedAmount);
  const totalDebitNgn = feeBreakdown.totalDebitNgn;
  const hasEnoughBalance = spendAvailable >= totalDebitNgn;

  // Resolve current recipient details for review prompt
  const currentRecipient = addingNew
    ? {
        label: newLabel.trim() || newAccountName.trim() || "New Recipient",
        bankName:
          NIGERIAN_BANKS.find((b) => b.code === newBankCode)?.name ??
          "Nigerian Bank",
        accountNumber: newAccountNumber.trim() || "0000000000",
        accountName: newAccountName.trim() || "Account Holder",
        isPreVerified: false,
      }
    : recipients.find((r) => r.id === activeRecipientId) ?? {
        label: "Selected Recipient",
        bankName: "Nigerian Bank",
        accountNumber: "0000000000",
        accountName: "Account Holder",
        isPreVerified: true,
      };

  const handleOpenReviewModal = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!parsedAmount || parsedAmount < 100) {
      setErrorMsg("Minimum transfer amount is ₦100.");
      return;
    }

    if (!hasEnoughBalance) {
      setErrorMsg(
        `Insufficient Spend balance. Total needed is ₦${totalDebitNgn.toLocaleString("en-NG", { minimumFractionDigits: 2 })} (including ₦${feeBreakdown.feeNgn.toFixed(2)} Busha payout fee), but you only have ₦${spendAvailable.toLocaleString("en-NG", { minimumFractionDigits: 2 })}.`,
      );
      return;
    }

    if (addingNew) {
      if (!newAccountNumber || newAccountNumber.length !== 10) {
        setErrorMsg("Please enter a valid 10-digit Nigerian bank account number.");
        return;
      }
      if (!newAccountName.trim()) {
        setErrorMsg("Please enter the account holder's name.");
        return;
      }
      if (isLocked) {
        setErrorMsg(
          "24-Hour Security Lock Active: Payouts to new recipients are restricted. You can only send money to pre-verified family beneficiaries.",
        );
        return;
      }
    } else {
      if (!currentRecipient.isPreVerified && isLocked) {
        setErrorMsg(
          "24-Hour Security Lock Active: Payouts to this unverified recipient are restricted until identity re-verification.",
        );
        return;
      }
    }

    setShowConfirmModal(true);
  };

  const handleExecuteTransfer = async () => {
    setSubmitting(true);
    setErrorMsg(null);
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
              amountNgn: parsedAmount,
              feeNgn: feeBreakdown.feeNgn,
              narration: narration.trim() || undefined,
            }
          : {
              recipientId: activeRecipientId,
              amountNgn: parsedAmount,
              feeNgn: feeBreakdown.feeNgn,
              narration: narration.trim() || undefined,
            },
      );
      setShowConfirmModal(false);
      setActiveTransfer({
        transfer: res.transfer,
        recipientLabel: `${res.recipient.label} (${res.recipient.bankName})`,
      });
      setAddingNew(false);
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : "Transfer could not be completed.",
      );
      setShowConfirmModal(false);
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
        onSubmit={handleOpenReviewModal}
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
              const isSelected = activeRecipientId === rec.id;
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
                Amount to Send (NGN)
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
              placeholder="e.g. 20000"
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

        {/* Real-time Fee & Debit Cost Preview */}
        {parsedAmount > 0 && (
          <div className="p-4 rounded-2xl bg-[#F7F8F5] border border-[#E4E7DF] space-y-2 text-xs">
            <div className="flex items-center justify-between text-slate-600">
              <span>Transfer to Recipient</span>
              <span className="font-mono font-semibold text-slate-900">
                ₦{parsedAmount.toLocaleString("en-NG", { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex items-center justify-between text-slate-600">
              <span className="flex items-center gap-1">
                <span>Busha Payout Fee</span>
                <span className="text-[10px] text-slate-400 font-normal">
                  (₦{feeBreakdown.baseFeeNgn.toFixed(2)} + 7.5% VAT ₦{feeBreakdown.vatNgn.toFixed(2)})
                </span>
              </span>
              <span className="font-mono font-medium text-slate-700">
                +₦{feeBreakdown.feeNgn.toFixed(2)}
              </span>
            </div>
            <div className="pt-2 border-t border-[#E4E7DF] flex items-center justify-between font-bold text-slate-900">
              <span>Total Debited from Spend Balance</span>
              <span
                className={`font-mono text-sm tabular-nums ${
                  hasEnoughBalance ? "text-[#0A3622]" : "text-rose-600"
                }`}
              >
                ₦{totalDebitNgn.toLocaleString("en-NG", { minimumFractionDigits: 2 })}
              </span>
            </div>
            {!hasEnoughBalance && (
              <div className="text-[11px] text-rose-600 font-medium pt-1 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>
                  Insufficient Spend balance (₦{spendAvailable.toLocaleString("en-NG")} available)
                </span>
              </div>
            )}
          </div>
        )}

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
          disabled={!hasEnoughBalance || parsedAmount < 100}
          className="w-full h-12 rounded-xl bg-[#0A3622] hover:bg-[#14532D] disabled:opacity-50 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
        >
          <span>
            {parsedAmount < 100
              ? "Enter Transfer Amount"
              : `Review Transfer & Fees (₦${totalDebitNgn.toLocaleString("en-NG", { minimumFractionDigits: 2 })})`}
          </span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </form>

      {/* Pre-Send Confirmation Prompt Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-3xl border border-[#E4E7DF] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-[#0A3622] text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center">
                  <ArrowUpRight className="w-4 h-4 text-emerald-300" />
                </div>
                <div>
                  <h3
                    className="text-sm font-bold tracking-tight text-white"
                    style={{ fontFamily: "var(--font-jakarta)" }}
                  >
                    Confirm Bank Transfer
                  </h3>
                  <p className="text-[11px] text-emerald-100/80">
                    Busha Payout Review
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="p-1.5 rounded-xl text-emerald-100 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-5">
              {/* Recipient Card */}
              <div className="p-4 rounded-2xl bg-[#F7F8F5] border border-[#E4E7DF] space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">Destination Beneficiary</span>
                  {currentRecipient.isPreVerified ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-[#0A3622] text-[10px] font-semibold">
                      <ShieldCheck className="w-3 h-3" />
                      <span>Trusted Family</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 text-[10px] font-semibold">
                      <span>New Beneficiary</span>
                    </span>
                  )}
                </div>
                <div className="text-sm font-bold text-slate-900">
                  {currentRecipient.label}
                </div>
                <div className="text-xs font-mono text-slate-600 flex items-center gap-1.5">
                  <Landmark className="w-3.5 h-3.5 text-slate-400" />
                  <span>
                    {currentRecipient.bankName} · {currentRecipient.accountNumber} ({currentRecipient.accountName})
                  </span>
                </div>
              </div>

              {/* Itemized Financial Breakdown */}
              <div className="rounded-2xl border border-[#E4E7DF] p-4 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Transfer Amount</span>
                  <span className="font-mono font-bold text-slate-900">
                    ₦{parsedAmount.toLocaleString("en-NG", { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <div className="space-y-0.5">
                    <span className="text-slate-500 block">Busha Payout Fee</span>
                    <span className="text-[10px] text-slate-400 block">
                      ₦{feeBreakdown.baseFeeNgn.toFixed(2)} base + 7.5% VAT (₦{feeBreakdown.vatNgn.toFixed(2)})
                    </span>
                  </div>
                  <span className="font-mono font-medium text-slate-700">
                    ₦{feeBreakdown.feeNgn.toFixed(2)}
                  </span>
                </div>

                <div className="pt-2.5 border-t border-[#E4E7DF] flex items-center justify-between text-sm font-bold">
                  <span className="text-slate-900">Total Deducted from Spend</span>
                  <span className="font-mono text-base text-[#0A3622]">
                    ₦{totalDebitNgn.toLocaleString("en-NG", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Account Balance Impact & Narration */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-[#F7F8F5] border border-[#E4E7DF]">
                  <div className="text-slate-500 text-[11px]">Current Spend</div>
                  <div className="font-mono font-semibold text-slate-800 mt-0.5">
                    ₦{spendAvailable.toLocaleString("en-NG")}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200">
                  <div className="text-emerald-900 text-[11px]">Remaining After Send</div>
                  <div className="font-mono font-semibold text-[#0A3622] mt-0.5">
                    ₦{(spendAvailable - totalDebitNgn).toLocaleString("en-NG", { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </div>

              {narration && (
                <div className="text-xs text-slate-500 bg-[#F7F8F5] px-3.5 py-2.5 rounded-xl border border-[#E4E7DF]">
                  <span className="font-semibold text-slate-700">Narration:</span> &ldquo;{narration}&rdquo;
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => setShowConfirmModal(false)}
                  className="flex-1 h-11 rounded-xl bg-[#F7F8F5] hover:bg-slate-200/70 border border-[#E4E7DF] text-xs font-semibold text-slate-700 transition-colors cursor-pointer"
                >
                  Edit Details
                </button>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={handleExecuteTransfer}
                  className="flex-1 h-11 rounded-xl bg-[#0A3622] hover:bg-[#14532D] text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer"
                >
                  {submitting ? (
                    <>
                      <Clock className="w-3.5 h-3.5 animate-spin" />
                      <span>Sending Transfer...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Confirm & Send ₦{totalDebitNgn.toLocaleString("en-NG", { minimumFractionDigits: 2 })}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
