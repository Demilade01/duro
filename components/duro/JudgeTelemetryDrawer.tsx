"use client";

import React, { useState } from "react";
import {
  Activity,
  ChevronDown,
  ChevronRight,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  Terminal,
  X,
  Zap,
} from "lucide-react";
import {
  BushaApiMode,
  TelemetryLogEntry,
  WalletStateResponse,
} from "@/lib/types";

interface JudgeTelemetryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  wallet: WalletStateResponse;
  apiMode: BushaApiMode;
  activeDeviceId: string;
  onToggleApiMode: (mode: BushaApiMode) => void;
  onSimulateSalaryInflow: () => Promise<void>;
  onSimulateSimSwapAttack: () => Promise<void>;
  onOpenRecoveryModal: () => void;
  onResetSandbox: () => void;
}

export default function JudgeTelemetryDrawer({
  isOpen,
  onClose,
  wallet,
  apiMode,
  activeDeviceId,
  onToggleApiMode,
  onSimulateSalaryInflow,
  onSimulateSimSwapAttack,
  onOpenRecoveryModal,
  onResetSandbox,
}: JudgeTelemetryDrawerProps) {
  const [runningChaos, setRunningChaos] = useState<string | null>(null);
  const [logFilter, setLogFilter] = useState<
    "ALL" | "OUTGOING_API" | "INCOMING_WEBHOOK" | "SECURITY_GUARD"
  >("ALL");
  const [expandedLogId, setExpandedLogId] = useState<string | null>(
    wallet.telemetry[0]?.id || null
  );

  if (!isOpen) return null;

  const filteredLogs = wallet.telemetry.filter((entry) =>
    logFilter === "ALL" ? true : entry.direction === logFilter
  );

  const handleSalaryTrigger = async () => {
    setRunningChaos("SALARY");
    try {
      await onSimulateSalaryInflow();
    } finally {
      setRunningChaos(null);
    }
  };

  const handleAttackTrigger = async () => {
    setRunningChaos("ATTACK");
    try {
      await onSimulateSimSwapAttack();
    } finally {
      setRunningChaos(null);
    }
  };

  const renderStatusColor = (entry: TelemetryLogEntry) => {
    if (entry.status >= 400) return "text-rose-400";
    if (entry.direction === "INCOMING_WEBHOOK") return "text-sky-400";
    return "text-emerald-400";
  };

  return (
    <aside className="w-full lg:w-[500px] xl:w-[540px] shrink-0 rounded-3xl bg-[#0D1322] border border-slate-800/90 flex flex-col overflow-hidden shadow-2xl">
      {/* Drawer Header */}
      <div className="px-5 py-4 border-b border-slate-800/90 flex items-center justify-between gap-4 bg-slate-950/60">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-emerald-400 shrink-0">
            <Terminal className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h2
              className="text-sm font-bold text-white truncate"
              style={{ fontFamily: "var(--font-jakarta)" }}
            >
              Judge Telemetry & Chaos Console
            </h2>
            <p className="text-[11px] text-slate-400 truncate">
              Toggleable drawer · Hide in prod via{" "}
              <code className="font-mono text-slate-300">
                NEXT_PUBLIC_ENABLE_JUDGE_CONSOLE=false
              </code>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={onResetSandbox}
            title="Reset Sandbox State"
            className="min-h-[36px] px-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs text-slate-300 flex items-center gap-1 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Collapse Judge Console"
            className="min-h-[36px] min-w-[36px] rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="p-5 space-y-4 overflow-y-auto flex-1">
        {/* 1. Busha API Mode Toggle & Active Device Fingerprint */}
        <div className="rounded-2xl bg-[#131C31] border border-slate-800/90 p-3.5 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="text-xs font-semibold text-white">
                1. Busha SDK Runtime Mode
              </div>
              <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                {apiMode === "LIVE"
                  ? "https://api.sandbox.busha.so"
                  : "Stateful MockBushaStore + /api/*"}
              </div>
            </div>

            <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-950 border border-slate-800">
              <button
                type="button"
                onClick={() => onToggleApiMode("MOCK")}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-colors cursor-pointer whitespace-nowrap ${
                  apiMode === "MOCK"
                    ? "bg-emerald-500 text-slate-950 font-semibold"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                MOCK
              </button>
              <button
                type="button"
                onClick={() => onToggleApiMode("LIVE")}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-colors cursor-pointer whitespace-nowrap ${
                  apiMode === "LIVE"
                    ? "bg-sky-400 text-slate-950 font-semibold"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                LIVE
              </button>
            </div>
          </div>

          <div className="pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-xs font-mono">
            <span className="text-slate-400">Header `x-device-id`:</span>
            <span
              className={
                wallet.security.isSimSwapLocked
                  ? "text-rose-400 font-semibold"
                  : "text-emerald-400 font-semibold"
              }
            >
              {activeDeviceId}
            </span>
          </div>
        </div>

        {/* 2. Chaos Simulation Triggers */}
        <div className="rounded-2xl bg-[#131C31] border border-slate-800/90 p-4 space-y-2.5">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-white">
              2. Chaos Simulation Triggers
            </h3>
            <span className="text-[11px] text-slate-400 font-mono">
              One-Click Scenarios
            </span>
          </div>

          {/* Trigger A: Employer Salary Inflow */}
          <button
            type="button"
            disabled={runningChaos !== null}
            onClick={handleSalaryTrigger}
            className="w-full min-h-[48px] p-3 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/35 text-left transition-colors flex items-center justify-between gap-3 cursor-pointer"
          >
            <div className="min-w-0">
              <div className="text-xs font-semibold text-emerald-300 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 shrink-0" />
                <span>Simulate Employer Salary Inflow: ₦150,000</span>
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5 font-mono">
                HMAC webhook → +₦127,500 cNGN (85%) & +$14.12 USDC (15%)
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-emerald-400 shrink-0" />
          </button>

          {/* Trigger B: Stolen Phone / SIM-Swap Attack */}
          <button
            type="button"
            disabled={runningChaos !== null}
            onClick={handleAttackTrigger}
            className="w-full min-h-[48px] p-3 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/35 text-left transition-colors flex items-center justify-between gap-3 cursor-pointer"
          >
            <div className="min-w-0">
              <div className="text-xs font-semibold text-rose-300 flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                <span>Simulate Stolen Phone / SIM-Swap Attack</span>
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5 font-mono">
                Mutates x-device-id to DEV_HACKER_99 → 24h Velocity Lock
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-rose-400 shrink-0" />
          </button>

          {/* Trigger C: Complete Liveness Selfie Recovery */}
          <button
            type="button"
            onClick={onOpenRecoveryModal}
            className="w-full min-h-[48px] p-3 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/35 text-left transition-colors flex items-center justify-between gap-3 cursor-pointer"
          >
            <div className="min-w-0">
              <div className="text-xs font-semibold text-sky-300 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                <span>Complete Liveness Selfie Recovery</span>
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5 font-mono">
                Verifies NIN + Live Webcam / Sample Base64 Selfie to unlock
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-sky-400 shrink-0" />
          </button>
        </div>

        {/* 3. Live Busha API & Webhook Inspector */}
        <div className="rounded-2xl bg-[#131C31] border border-slate-800/90 overflow-hidden">
          <div className="p-3.5 border-b border-slate-800/80 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-white">
                <Activity className="w-3.5 h-3.5 text-emerald-400" />
                <span>3. Live Busha API & Webhook Inspector</span>
              </div>
              <span className="text-[11px] font-mono tabular-nums text-slate-400">
                {filteredLogs.length} events
              </span>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-950 border border-slate-800 overflow-x-auto">
              {(
                [
                  { id: "ALL", label: "All Logs" },
                  { id: "OUTGOING_API", label: "Busha HTTP" },
                  { id: "INCOMING_WEBHOOK", label: "Webhooks" },
                  { id: "SECURITY_GUARD", label: "Velocity Guard" },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setLogFilter(tab.id)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors whitespace-nowrap cursor-pointer ${
                    logFilter === tab.id
                      ? "bg-slate-800 text-white"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="divide-y divide-slate-800/80 max-h-[380px] overflow-y-auto">
            {filteredLogs.map((entry) => {
              const isExpanded = expandedLogId === entry.id;
              return (
                <div key={entry.id} className="bg-slate-950/40">
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedLogId(isExpanded ? null : entry.id)
                    }
                    className="w-full px-3.5 py-2.5 flex items-center justify-between gap-2 text-left hover:bg-slate-900/60 transition-colors cursor-pointer"
                  >
                    <div className="min-w-0 flex-1 font-mono">
                      <div className="flex items-center gap-2 text-xs">
                        <span
                          className={`font-bold ${renderStatusColor(entry)}`}
                        >
                          {entry.method} {entry.status}
                        </span>
                        <span className="text-slate-200 truncate">
                          {entry.endpoint}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-2">
                        <span>
                          {new Date(entry.timestamp).toLocaleTimeString([], {
                            hour12: false,
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit",
                          })}
                        </span>
                        <span>·</span>
                        <span>{entry.durationMs}ms</span>
                        <span>·</span>
                        <span>Mode: {entry.mode}</span>
                      </div>
                    </div>
                    <ChevronDown
                      className={`w-3.5 h-3.5 text-slate-500 transition-transform ${
                        isExpanded ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {isExpanded && (
                    <div className="px-3.5 pb-3 pt-1 space-y-2 text-[11px] font-mono bg-slate-950 border-t border-slate-900">
                      <div>
                        <div className="text-slate-400 mb-1">Headers:</div>
                        <pre className="p-2 rounded-lg bg-slate-900/90 text-slate-300 overflow-x-auto text-[10px] leading-relaxed">
                          {JSON.stringify(entry.headers, null, 2)}
                        </pre>
                      </div>
                      {entry.requestBody !== undefined && (
                        <div>
                          <div className="text-slate-400 mb-1">
                            Request Payload:
                          </div>
                          <pre className="p-2 rounded-lg bg-slate-900/90 text-emerald-300 overflow-x-auto text-[10px] leading-relaxed">
                            {JSON.stringify(entry.requestBody, null, 2)}
                          </pre>
                        </div>
                      )}
                      {entry.responseBody !== undefined && (
                        <div>
                          <div className="text-slate-400 mb-1">
                            Response Payload:
                          </div>
                          <pre className="p-2 rounded-lg bg-slate-900/90 text-sky-300 overflow-x-auto text-[10px] leading-relaxed">
                            {JSON.stringify(entry.responseBody, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </aside>
  );
}
