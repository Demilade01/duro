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
import type { BushaTransfer, RemitQuoteResponse } from "@/lib/api-types";
import { getBushaPayoutFeeBreakdown } from "@/lib/money";

export default function SendPage() {
  const {
    wallet,
    previewRemittance,
    sendRemittance,
    pollRemittance,
    openRecoveryModal,
  } = useDuro();

  const recipients = useMemo(() => wallet?.recipients ?? [], [wallet?.recipients]);
  const [selectedRecipientId, setSelectedRecipientId] = useState<string>("");
  const activeRecipientId = selectedRecipientId || recipients[0]?.id || "";
  const [addingNew, setAddingNew] = useState(false);

  // New recipient fields
  const [newLabel, setNewLabel] = useState("");
  const [newBankCode, setNewBankCode] = useState<string>(NIGERIAN_BANKS[0].code);
  const [newAccountNumber, setNewAccountNumber] = useState("");
  const [newAccountName, setNewAccountName] = useState("");

  // Transfer fields
  const [amountNgn, setAmountNgn] = useState<string>("20000");
  const [narration, setNarration] = useState<string>("Family upkeep");
  const [quoting, setQuoting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Pre-send confirmation prompt modal state + live Busha quote preview
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [quotePreview, setQuotePreview] = useState<RemitQuoteResponse | null>(null);

  const [activeTransfer, setActiveTransfer] = useState<{
    transfer: BushaTransfer;
    recipientLabel: string;
  } | null>(null);

  // Live 1-second polling while a payout transfer is progressing through the 4 stages
  useEffect(() => {
    if (!activeTransfer) return;
    if (
      activeTransfer.transfer.status === "funds_delivered" ||
      activeTransfer.transfer.status === "failed" ||
      activeTransfer.transfer.status === "cancelled"
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
        // Ignore transient poll errors
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [activeTransfer, pollRemittance]);

  if (!wallet) return null;

  const spendAvailable = wallet.balances?.spend.available ?? 0;
  const isLocked = wallet.lock.active;

  // Automatic fee calculation: uses live Busha quote fees when quoted, or Busha Sandbox schedule for instant preview
  const parsedAmount = Number(amountNgn) || 0;
  const feeBreakdown = quotePreview
    ? quotePreview.feeBreakdown
    : getBushaPayoutFeeBreakdown(parsedAmount);
  const totalDebitNgn = feeBreakdown.totalDebitNgn;
  const hasEnoughBalance = spendAvailable >= totalDebitNgn;

  // Resolve current recipient details for review prompt
  const currentRecipient = quotePreview?.recipient
    ? quotePreview.recipient
    : addingNew
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

  const handleOpenReviewModal = async (e: React.FormEvent) => {
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

    // Automatically fetch a real Busha Payout Quote (`POST /v1/quotes` with `target_amount`)
    // so Busha returns the exact live `fees` and `source_amount` before confirmation.
    setQuoting(true);
    try {
      const bank =
        NIGERIAN_BANKS.find((b) => b.code === newBankCode) ?? NIGERIAN_BANKS[0];
      const preview = await previewRemittance(
        addingNew
          ? {
              newRecipient: {
                label: newLabel.trim() || newAccountName.trim(),
                bankName: bank.name,
                bankCode: bank.code,
                accountNumber: newAccountNumber.trim(),
                accountName: newAccountName.trim(),
              },
              amountNgn: parsedAmount,
              narration: narration.trim() || undefined,
            }
          : {
              recipientId: activeRecipientId,
              amountNgn: parsedAmount,
              narration: narration.trim() || undefined,
            },
      );
      setQuotePreview(preview);
      setShowConfirmModal(true);
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : "Could not fetch payout quote from Busha.",
      );
    } finally {
      setQuoting(false);
    }
  };

  const handleExecuteTransfer = async () => {
    setSubmitting(true);
    setErrorMsg(null);
    try {
      const bank =
        NIGERIAN_BANKS.find((b) => b.code === newBankCode) ?? NIGERIAN_BANKS[0];

      const res = await sendRemittance(
        addingNew && !quotePreview?.recipient?.id
          ? {
              newRecipient: {
                label: newLabel.trim() || newAccountName.trim(),
                bankName: bank.name,
                bankCode: bank.code,
                accountNumber: newAccountNumber.trim(),
                accountName: newAccountName.trim(),
              },
              amountNgn: parsedAmount,
              narration: narration.trim() || undefined,
              quoteId: quotePreview?.quote.id,
            }
          : {
              recipientId: quotePreview?.recipient?.id || activeRecipientId,
              amountNgn: parsedAmount,
              narration: narration.trim() || undefined,
              quoteId: quotePreview?.quote.id,
            },
      );
      setShowConfirmModal(false);
      setQuotePreview(null);
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

  const payouts = wallet.transactions.filter((t) => t.kind === "PAYOUT");

  return (
    <div className="space-y-6">
      <div>
        <span className="text-xs font-semibold uppercase tracking-wider text-[#0A3622]">
          Send Home
        </span>
        <h1
          className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight mt-0.5"
          style={{ fontFamily: "var(--font-jakarta)" }}
        >
          Instant Bank Transfers
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          Send Naira directly from your Spend balance to family and trusted Nigerian bank accounts.
        </p>
      </div>

      <form
        noValidate
        onSubmit={handleOpenReviewModal}
        className="rounded-3xl bg-white border border-[#E4E7DF] p-6 space-y-5"
      >
        <div className="flex items-center justify-between">
          <h2
            className="text-base font-bold text-slate-900"
            style={{ fontFamily: "var(--font-jakarta)" }}
          >
            1. Choose Recipient
          </h2>
          <button
            type="button"
            onClick={() => {
              setAddingNew((v) => !v);
              setQuotePreview(null);
              setErrorMsg(null);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#F7F8F5] hover:bg-emerald-50 border border-[#E4E7DF] text-xs font-semibold text-slate-700 hover:text-[#0A3622] transition-colors cursor-pointer"
          >
            {addingNew ? (
              <span>Select Saved Recipient</span>
            ) : (
              <>
                <Plus className="w-3.5 h-3.5" />
                <span>Add New Recipient</span>
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
                    setQuotePreview(null);
                  }}
                  className={`w-full p-4 rounded-2xl border text-left transition-all flex items-center justify-between gap-3 cursor-pointer ${
                    isSelected
                      ? "bg-emerald-50/70 border-[#0A3622] ring-2 ring-[#0A3622]/10"
                      : "bg-[#F7F8F5] border-[#E4E7DF] hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-[#0A3622] text-white font-bold text-sm flex items-center justify-center shrink-0">
                      {rec.label.slice(0, 1).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-slate-900 truncate flex items-center gap-2">
                        <span>{rec.label}</span>
                        {rec.isPreVerified && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-[#0A3622] text-[10px] font-semibold">
                            <ShieldCheck className="w-3 h-3" />
                            <span>Trusted Family</span>
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500 font-mono mt-0.5 truncate">
                        {rec.bankName} · {rec.accountNumber} ({rec.accountName})
                      </div>
                    </div>
                  </div>
                  {blocked && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 text-[11px] font-semibold shrink-0">
                      <Lock className="w-3 h-3" />
                      <span>Locked</span>
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ) : (
          <div className="p-4 rounded-2xl bg-[#F7F8F5] border border-[#E4E7DF] space-y-3.5">
            {isLocked && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-2.5 text-xs text-amber-900">
                <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">24-Hour Security Lock Active:</span>{" "}
                  Transfers to new beneficiaries are blocked while on an unrecognized device. Pre-verified family accounts remain open.
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Relationship / Nickname
                </label>
                <input
                  type="text"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  placeholder="e.g. Uncle Segun"
                  className="w-full h-10 px-3 rounded-xl bg-white border border-[#E4E7DF] text-sm text-slate-900 focus:outline-none focus:border-[#0A3622]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Bank
                </label>
                <select
                  value={newBankCode}
                  onChange={(e) => setNewBankCode(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl bg-white border border-[#E4E7DF] text-sm text-slate-900 focus:outline-none focus:border-[#0A3622]"
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
                  value={newAccountNumber}
                  onChange={(e) =>
                    setNewAccountNumber(e.target.value.replace(/\D/g, ""))
                  }
                  placeholder="0123456789"
                  className="w-full h-10 px-3 rounded-xl bg-white border border-[#E4E7DF] text-sm font-mono text-slate-900 focus:outline-none focus:border-[#0A3622]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Account Holder Name
                </label>
                <input
                  type="text"
                  value={newAccountName}
                  onChange={(e) => setNewAccountName(e.target.value)}
                  placeholder="Segun Bakare"
                  className="w-full h-10 px-3 rounded-xl bg-white border border-[#E4E7DF] text-sm text-slate-900 focus:outline-none focus:border-[#0A3622]"
                />
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-[#E4E7DF]">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-700">
                Amount Recipient Gets (NGN)
              </label>
              <span className="text-xs font-mono text-slate-500">
                Spend available: ₦{spendAvailable.toLocaleString("en-NG")}
              </span>
            </div>
            <input
              type="number"
              min={100}
              step="any"
              value={amountNgn}
              onChange={(e) => {
                setAmountNgn(e.target.value);
                setQuotePreview(null);
              }}
              placeholder="e.g. 20000"
              className="w-full h-11 px-3.5 rounded-xl bg-[#F7F8F5] border border-[#E4E7DF] text-sm font-mono tabular-nums text-slate-900 focus:outline-none focus:border-[#0A3622] focus:bg-white"
            />
            <div className="flex items-center gap-1.5 mt-2">
              {[10000, 20000, 35000, 50000].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => {
                    setAmountNgn(String(preset));
                    setQuotePreview(null);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-[#F7F8F5] hover:bg-emerald-50 border border-[#E4E7DF] text-[11px] font-mono font-medium text-slate-700 cursor-pointer"
                >
                  ₦{(preset / 1000).toFixed(0)}k
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Transfer Note (Optional)
            </label>
            <input
              type="text"
              value={narration}
              onChange={(e) => setNarration(e.target.value)}
              placeholder="e.g. Family upkeep"
              className="w-full h-11 px-3.5 rounded-xl bg-[#F7F8F5] border border-[#E4E7DF] text-sm text-slate-900 focus:outline-none focus:border-[#0A3622] focus:bg-white"
            />
          </div>
        </div>

        {/* Real-time Fee & Debit Cost Preview */}
        {parsedAmount > 0 && (
          <div className="p-4 rounded-2xl bg-[#F7F8F5] border border-[#E4E7DF] space-y-2 text-xs">
            <div className="flex items-center justify-between text-slate-600">
              <span>Recipient Receives</span>
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
              <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="leading-relaxed font-medium">{errorMsg}</div>
            </div>
            {isLocked && (
              <button
                type="button"
                onClick={openRecoveryModal}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-700 hover:bg-rose-800 text-white font-semibold text-xs transition-colors cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Verify NIN & Selfie to Unlock New Recipients</span>
              </button>
            )}
          </div>
        )}

        <button
          type="submit"
          disabled={!hasEnoughBalance || parsedAmount < 100 || quoting}
          className="w-full h-12 rounded-xl bg-[#0A3622] hover:bg-[#14532D] disabled:opacity-50 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
        >
          <span>
            {quoting
              ? "Fetching Live Busha Quote..."
              : parsedAmount < 100
                ? "Enter Transfer Amount"
                : `Review Transfer & Fees (₦${totalDebitNgn.toLocaleString("en-NG", { minimumFractionDigits: 2 })})`}
          </span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </form>

      {/* Pre-Send Confirmation Prompt Modal (populated from live Busha Quote API) */}
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
                  <p className="text-[11px] text-emerald-100/80 font-mono">
                    {quotePreview?.quote.id
                      ? `Busha Quote · ${quotePreview.quote.id}`
                      : "Busha Payout Review"}
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
                      <span>Verified Beneficiary</span>
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

              {/* Itemized Financial Breakdown from Busha Quote */}
              <div className="rounded-2xl border border-[#E4E7DF] p-4 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Recipient Gets</span>
                  <span className="font-mono font-bold text-slate-900">
                    ₦{parsedAmount.toLocaleString("en-NG", { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <div className="space-y-0.5">
                    <span className="text-slate-500 block">Busha Payout Fee (Auto-Quoted)</span>
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
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-[#0A3622]">
                Live Delivery Tracker
              </span>
              <h3
                className="text-base font-bold text-slate-900 mt-0.5"
                style={{ fontFamily: "var(--font-jakarta)" }}
              >
                ₦{Number(activeTransfer.transfer.target_amount).toLocaleString("en-NG")} to{" "}
                {activeTransfer.recipientLabel}
              </h3>
            </div>
            <span
              className={`px-3 py-1 rounded-full text-xs font-semibold ${
                activeTransfer.transfer.status === "funds_delivered"
                  ? "bg-emerald-100 text-[#0A3622]"
                  : "bg-amber-100 text-amber-900"
              }`}
            >
              {activeTransfer.transfer.status === "funds_delivered"
                ? "Delivered"
                : "In Progress"}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2">
            {activeTransfer.transfer.timeline.map((step, idx) => (
              <div
                key={step.status}
                className={`p-3.5 rounded-2xl border ${
                  step.done
                    ? "bg-emerald-50/70 border-emerald-200"
                    : "bg-[#F7F8F5] border-[#E4E7DF]"
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-mono font-bold text-slate-400">
                    STEP 0{idx + 1}
                  </span>
                  {step.done ? (
                    <CheckCircle2 className="w-4 h-4 text-[#0A3622]" />
                  ) : (
                    <Clock className="w-4 h-4 text-slate-400 animate-pulse" />
                  )}
                </div>
                <div className="text-xs font-semibold text-slate-900">
                  {step.label}
                </div>
                <div className="text-[11px] text-slate-500 font-mono mt-1">
                  {step.timestamp
                    ? new Date(step.timestamp).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })
                    : "Pending..."}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Past Remittances */}
      {payouts.length > 0 && (
        <div className="rounded-3xl bg-white border border-[#E4E7DF] p-6 space-y-3">
          <h3
            className="text-sm font-bold text-slate-900"
            style={{ fontFamily: "var(--font-jakarta)" }}
          >
            Recent Transfers
          </h3>
          <div className="divide-y divide-[#E4E7DF]">
            {payouts.slice(0, 5).map((tx) => (
              <div
                key={tx.id}
                className="py-3 flex items-center justify-between text-xs"
              >
                <div>
                  <div className="font-semibold text-slate-900">
                    {tx.description}
                  </div>
                  <div className="text-slate-500 mt-0.5">
                    {new Date(tx.createdAt).toLocaleString()} · {tx.status}
                  </div>
                </div>
                <div className="font-mono font-bold text-slate-900">
                  -₦{Number(tx.amount).toLocaleString("en-NG")}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
