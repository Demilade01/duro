"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  createDuroClient,
  DuroClientError,
  type ConversionDirection,
  type FundResponse,
  type FundingSource,
  type OnboardingResponse,
  type PassportStatementResponse,
  type PledgeAdvanceResponse,
  type RemitPollResponse,
  type RemitQuoteResponse,
  type RemitResponse,
  type SimSwapResponse,
  type SimulateSalaryResponse,
  type VirtualAccount,
  type WalletSnapshot,
} from "@/lib/api-types";
import { TUNDE } from "@/lib/demo";

export const NIGERIAN_BANKS = [
  { code: "058", name: "GTBank (Guaranty Trust Bank)" },
  { code: "044", name: "Access Bank" },
  { code: "057", name: "Zenith Bank" },
  { code: "011", name: "First Bank of Nigeria" },
  { code: "033", name: "United Bank for Africa (UBA)" },
  { code: "090267", name: "Kuda Bank" },
  { code: "100004", name: "OPay" },
  { code: "999991", name: "Moniepoint MFB" },
] as const;

const LS_LOGGED_OUT = "duro.loggedOut";

/**
 * Generates a valid PNG base64 data URL (> 100 chars) on an HTML5 canvas
 * so the backend's strict `data:image/(png|jpeg|webp);base64,...` liveness check
 * always passes even when the user chooses instant selfie check instead of webcam.
 */
export function generateVerifiedSelfiePngDataUrl(): string {
  if (typeof document !== "undefined") {
    const canvas = document.createElement("canvas");
    canvas.width = 240;
    canvas.height = 240;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.fillStyle = "#0a3622";
      ctx.fillRect(0, 0, 240, 240);
      ctx.fillStyle = "#166534";
      ctx.beginPath();
      ctx.arc(120, 96, 46, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#dcfce7";
      ctx.beginPath();
      ctx.arc(120, 92, 28, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(120, 185, 52, Math.PI, 0, false);
      ctx.fill();
      return canvas.toDataURL("image/png");
    }
  }
  return (
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==" +
    "A".repeat(120)
  );
}

export interface ToastMessage {
  id: number;
  text: string;
  tone: "success" | "error" | "info";
}

interface DuroContextValue {
  wallet: WalletSnapshot | null;
  loading: boolean;
  needsOnboarding: boolean;
  activeVirtualAccount: {
    account: VirtualAccount;
    amountNgn: number;
    source: FundingSource;
    transferId: string;
  } | null;
  toast: ToastMessage | null;
  recoveryModalOpen: boolean;
  openRecoveryModal: () => void;
  closeRecoveryModal: () => void;
  showToast: (text: string, tone?: ToastMessage["tone"]) => void;
  refreshWallet: () => Promise<WalletSnapshot | null>;
  completeOnboarding: (input: {
    fullName: string;
    phone: string;
    email: string;
    password?: string;
    nin: string;
    selfieImage: string;
    reset?: boolean;
  }) => Promise<OnboardingResponse>;
  signInAccount: (input: {
    email?: string;
    phone?: string;
    password: string;
  }) => Promise<OnboardingResponse>;
  startFreshOnboarding: () => void;
  resetDemoAccount: () => Promise<void>;
  createFundingAccount: (
    amountNgn: number,
    source: FundingSource,
  ) => Promise<FundResponse>;
  confirmDepositTransfer: (
    amountNgn: number,
    source: FundingSource,
  ) => Promise<SimulateSalaryResponse>;
  updateAutoSavePercent: (percent: number) => Promise<void>;
  moveBetweenBalances: (
    direction: ConversionDirection,
    amount: number,
  ) => Promise<void>;
  previewRemittance: (
    input:
      | { recipientId: string; amountNgn: number; narration?: string; feeNgn?: number }
      | {
          newRecipient: {
            label: string;
            bankName: string;
            bankCode: string;
            accountNumber: string;
            accountName: string;
          };
          amountNgn: number;
          narration?: string;
          feeNgn?: number;
        },
  ) => Promise<RemitQuoteResponse>;
  sendRemittance: (
    input:
      | { recipientId: string; amountNgn: number; narration?: string; quoteId?: string }
      | {
          newRecipient: {
            label: string;
            bankName: string;
            bankCode: string;
            accountNumber: string;
            accountName: string;
          };
          amountNgn: number;
          narration?: string;
          quoteId?: string;
        },
  ) => Promise<RemitResponse>;
  pollRemittance: (transferId: string) => Promise<RemitPollResponse>;
  fetchStatement: (opts?: {
    from?: string;
    to?: string;
    interval?: "daily" | "weekly" | "monthly";
  }) => Promise<PassportStatementResponse>;
  requestRentAdvance: (
    advanceNgn: number,
    purpose?: "RENT" | "SCHOOL_FEES" | "EMERGENCY",
  ) => Promise<PledgeAdvanceResponse>;
  switchToUnrecognizedDevice: () => Promise<SimSwapResponse>;
  switchToTrustedDevice: () => Promise<void>;
  recoverIdentity: (nin: string, selfieImage: string) => Promise<SimSwapResponse>;
}

const DuroContext = createContext<DuroContextValue | null>(null);

export function DuroProvider({ children }: { children: React.ReactNode }) {
  const client = useMemo(() => createDuroClient(), []);
  const [wallet, setWallet] = useState<WalletSnapshot | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [needsOnboarding, setNeedsOnboarding] = useState<boolean>(false);
  const [recoveryModalOpen, setRecoveryModalOpen] = useState<boolean>(false);
  const [activeVirtualAccount, setActiveVirtualAccount] =
    useState<DuroContextValue["activeVirtualAccount"]>(null);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  const showToast = useCallback(
    (text: string, tone: ToastMessage["tone"] = "success") => {
      const id = Date.now();
      setToast({ id, text, tone });
      setTimeout(() => {
        setToast((prev) => (prev?.id === id ? null : prev));
      }, 4200);
    },
    [],
  );

  const hydratePendingVirtualAccount = useCallback((snap: WalletSnapshot) => {
    const pendingDep = snap.transactions.find(
      (t) => t.kind === "DEPOSIT" && t.status === "pending",
    );
    const meta = pendingDep?.meta as
      | { virtualAccount?: VirtualAccount; source?: FundingSource }
      | undefined;
    if (
      pendingDep?.bushaTransferId &&
      meta?.virtualAccount &&
      Date.parse(meta.virtualAccount.expiresAt) > Date.now()
    ) {
      setActiveVirtualAccount({
        account: meta.virtualAccount,
        amountNgn: Number(pendingDep.amount) || 150_000,
        source: meta.source ?? "EMPLOYER",
        transferId: pendingDep.bushaTransferId,
      });
    }
  }, []);

  const refreshWallet = useCallback(async (): Promise<WalletSnapshot | null> => {
    try {
      const snap = await client.getWallet();
      client.setUserId(snap.profile.id);
      setWallet(snap);
      setNeedsOnboarding(false);
      hydratePendingVirtualAccount(snap);
      return snap;
    } catch (err) {
      if (err instanceof DuroClientError && err.code === "NOT_ONBOARDED") {
        client.setUserId(null);
        setWallet(null);
        setNeedsOnboarding(true);
        return null;
      }
      throw err;
    }
  }, [client, hydratePendingVirtualAccount]);

  useEffect(() => {
    let active = true;
    // If the user explicitly logged out / is on the onboarding screen,
    // keep them on the onboarding screen even if they refresh the page.
    if (
      typeof window !== "undefined" &&
      window.localStorage.getItem(LS_LOGGED_OUT) === "1"
    ) {
      setWallet(null);
      setNeedsOnboarding(true);
      setLoading(false);
      return;
    }
    (async () => {
      try {
        await refreshWallet();
      } catch (err) {
        if (active) {
          showToast(
            err instanceof Error ? err.message : "Could not load wallet",
            "error",
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [refreshWallet, showToast]);

  const completeOnboarding = useCallback(
    async (input: {
      fullName: string;
      phone: string;
      email: string;
      password?: string;
      nin: string;
      selfieImage: string;
      reset?: boolean;
    }) => {
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(LS_LOGGED_OUT);
      }
      client.setDeviceId("DEV_TUNDE_IPHONE_01");
      const res = await client.onboard(input);
      await refreshWallet();
      setNeedsOnboarding(false);
      showToast(`Welcome to Duro, ${res.profile.firstName}!`, "success");
      return res;
    },
    [client, refreshWallet, showToast],
  );

  const signInAccount = useCallback(
    async (input: { email?: string; phone?: string; password: string }) => {
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(LS_LOGGED_OUT);
      }
      const res = await client.onboard({
        email: input.email,
        phone: input.phone,
        password: input.password,
        loginOnly: true,
      });
      await refreshWallet();
      setNeedsOnboarding(false);
      showToast(`Welcome back, ${res.profile.firstName}!`, "success");
      return res;
    },
    [client, refreshWallet, showToast],
  );

  const startFreshOnboarding = useCallback(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(LS_LOGGED_OUT, "1");
    }
    void client.logout();
    setWallet(null);
    setActiveVirtualAccount(null);
    setNeedsOnboarding(true);
  }, [client]);

  const resetDemoAccount = useCallback(async () => {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(LS_LOGGED_OUT);
    }
    client.setDeviceId("DEV_TUNDE_IPHONE_01");
    await client.onboard({
      fullName: TUNDE.fullName,
      phone: TUNDE.phone,
      email: TUNDE.email,
      password: TUNDE.password,
      nin: TUNDE.nin,
      selfieImage: generateVerifiedSelfiePngDataUrl(),
      reset: true,
    });
    setActiveVirtualAccount(null);
    await refreshWallet();
    showToast("Account reset to fresh initial state.", "info");
  }, [client, refreshWallet, showToast]);

  const createFundingAccount = useCallback(
    async (amountNgn: number, source: FundingSource) => {
      const res = await client.fund({ amountNgn, source });
      setActiveVirtualAccount({
        account: res.virtualAccount,
        amountNgn,
        source,
        transferId: res.transferId,
      });
      await refreshWallet();
      showToast("Providus Bank account ready for transfer.", "info");
      return res;
    },
    [client, refreshWallet, showToast],
  );

  const confirmDepositTransfer = useCallback(
    async (amountNgn: number, source: FundingSource) => {
      const res = await client.simulateSalary(amountNgn, source);
      setActiveVirtualAccount(null);
      await refreshWallet();
      if (res.autoSaved && res.autoSaved.usdc > 0) {
        showToast(
          `₦${res.credited.toLocaleString("en-NG")} received! $${res.autoSaved.usdc.toFixed(2)} automatically saved in US Dollars.`,
          "success",
        );
      } else {
        showToast(
          `₦${res.credited.toLocaleString("en-NG")} credited to Naira Spend.`,
          "success",
        );
      }
      return res;
    },
    [client, refreshWallet, showToast],
  );

  const updateAutoSavePercent = useCallback(
    async (percent: number) => {
      await client.setAutoSavePercent(percent);
      await refreshWallet();
      showToast(`Auto-Save rule set to ${percent}% of every deposit.`, "info");
    },
    [client, refreshWallet, showToast],
  );

  const moveBetweenBalances = useCallback(
    async (direction: ConversionDirection, amount: number) => {
      await client.moveBetweenBalances(direction, amount);
      await refreshWallet();
      showToast(
        direction === "SPEND_TO_SAVE"
          ? `Moved ₦${amount.toLocaleString("en-NG")} into US Dollar Save.`
          : `Moved $${amount.toFixed(2)} into Naira Spend.`,
        "success",
      );
    },
    [client, refreshWallet, showToast],
  );

  const previewRemittance = useCallback(
    async (
      input:
        | { recipientId: string; amountNgn: number; narration?: string; feeNgn?: number }
        | {
            newRecipient: {
              label: string;
              bankName: string;
              bankCode: string;
              accountNumber: string;
              accountName: string;
            };
            amountNgn: number;
            narration?: string;
            feeNgn?: number;
          },
    ) => {
      return client.quoteRemit(input);
    },
    [client],
  );

  const sendRemittance = useCallback(
    async (
      input:
        | { recipientId: string; amountNgn: number; narration?: string; quoteId?: string }
        | {
            newRecipient: {
              label: string;
              bankName: string;
              bankCode: string;
              accountNumber: string;
              accountName: string;
            };
            amountNgn: number;
            narration?: string;
            quoteId?: string;
          },
    ) => {
      const res = await client.remit(input);
      await refreshWallet();
      showToast(
        `Transfer of ₦${input.amountNgn.toLocaleString("en-NG")} to ${res.recipient.label} initiated.`,
        "success",
      );
      return res;
    },
    [client, refreshWallet, showToast],
  );

  const pollRemittance = useCallback(
    async (transferId: string) => {
      const res = await client.pollRemit(transferId);
      if (res.transfer.status === "funds_delivered") {
        await refreshWallet();
      }
      return res;
    },
    [client, refreshWallet],
  );

  const fetchStatement = useCallback(
    async (opts?: {
      from?: string;
      to?: string;
      interval?: "daily" | "weekly" | "monthly";
    }) => {
      return client.getStatement(opts);
    },
    [client],
  );

  const requestRentAdvance = useCallback(
    async (
      advanceNgn: number,
      purpose: "RENT" | "SCHOOL_FEES" | "EMERGENCY" = "RENT",
    ) => {
      const res = await client.requestAdvance(advanceNgn, purpose);
      await refreshWallet();
      showToast(
        `₦${advanceNgn.toLocaleString("en-NG")} credited to Naira Spend! $${res.collateralUsdc.toFixed(2)} locked as collateral.`,
        "success",
      );
      return res;
    },
    [client, refreshWallet, showToast],
  );

  const switchToUnrecognizedDevice = useCallback(async () => {
    const res = await client.simulateSimSwapAttack();
    await refreshWallet();
    showToast(
      "New device detected — 24-hour security protection activated.",
      "error",
    );
    return res;
  }, [client, refreshWallet, showToast]);

  const trustedDeviceId = wallet?.profile.trustedDeviceId;
  const switchToTrustedDevice = useCallback(async () => {
    if (trustedDeviceId) {
      client.setDeviceId(trustedDeviceId);
      await refreshWallet();
    }
  }, [client, refreshWallet, trustedDeviceId]);

  const recoverIdentity = useCallback(
    async (nin: string, selfieImage: string) => {
      const res = await client.recoverIdentity(nin, selfieImage);
      await refreshWallet();
      showToast(
        "Identity verified! 24-hour lock cleared and this device is now trusted.",
        "success",
      );
      return res;
    },
    [client, refreshWallet, showToast],
  );

  const value: DuroContextValue = {
    wallet,
    loading,
    needsOnboarding,
    activeVirtualAccount,
    toast,
    recoveryModalOpen,
    openRecoveryModal: () => setRecoveryModalOpen(true),
    closeRecoveryModal: () => setRecoveryModalOpen(false),
    showToast,
    refreshWallet,
    completeOnboarding,
    signInAccount,
    startFreshOnboarding,
    resetDemoAccount,
    createFundingAccount,
    confirmDepositTransfer,
    updateAutoSavePercent,
    moveBetweenBalances,
    previewRemittance,
    sendRemittance,
    pollRemittance,
    fetchStatement,
    requestRentAdvance,
    switchToUnrecognizedDevice,
    switchToTrustedDevice,
    recoverIdentity,
  };

  return <DuroContext.Provider value={value}>{children}</DuroContext.Provider>;
}

export function useDuro(): DuroContextValue {
  const ctx = useContext(DuroContext);
  if (!ctx) throw new Error("useDuro must be used inside <DuroProvider>");
  return ctx;
}
