"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FileText,
  Home,
  LogOut,
  PlusCircle,
  Send,
  Shield,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import { useDuro } from "@/components/duro-context";
import OnboardingFlow from "./OnboardingFlow";
import SelfieLivenessModal from "@/components/duro/SelfieLivenessModal";

const NAV_ITEMS = [
  { href: "/", label: "Home", icon: Home },
  { href: "/fund", label: "Add Money", icon: PlusCircle },
  { href: "/send", label: "Send Money", icon: Send },
  { href: "/credit", label: "Credit & Statements", icon: FileText },
  { href: "/settings", label: "Security & Devices", icon: Shield },
] as const;

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const {
    wallet,
    loading,
    needsOnboarding,
    toast,
    openRecoveryModal,
    startFreshOnboarding,
  } = useDuro();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F7F8F5] text-slate-900 flex flex-col lg:flex-row">
        {/* Desktop Left Sidebar Skeleton */}
        <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 bg-white border-r border-[#E4E7DF] px-5 py-6 justify-between">
          <div className="space-y-7">
            <div className="flex items-center gap-2.5 px-2">
              <div className="w-9 h-9 rounded-xl bg-[#0A3622] text-white flex items-center justify-center font-bold text-base">
                D
              </div>
              <div>
                <span
                  className="text-xl font-bold tracking-tight text-slate-900 block leading-none"
                  style={{ fontFamily: "var(--font-jakarta)" }}
                >
                  Duro
                </span>
                <span className="text-[11px] text-slate-500">
                  Spend Naira · Save Dollars
                </span>
              </div>
            </div>

            <nav className="space-y-1.5">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const active =
                  item.href === "/"
                    ? pathname === "/"
                    : pathname.startsWith(item.href);
                return (
                  <div
                    key={item.href}
                    className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium ${
                      active
                        ? "bg-[#0A3622] text-white font-semibold"
                        : "text-slate-500"
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </div>
                );
              })}
            </nav>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#F7F8F5] border border-[#E4E7DF] space-y-2 animate-pulse">
            <div className="h-3.5 w-28 bg-slate-200 rounded" />
            <div className="h-2.5 w-36 bg-slate-200/80 rounded" />
          </div>
        </aside>

        {/* Main Workspace Skeleton */}
        <div className="flex-1 lg:pl-64 flex flex-col min-h-screen">
          <header className="sticky top-0 z-30 bg-[#F7F8F5]/90 backdrop-blur-md border-b border-[#E4E7DF] px-4 sm:px-8 h-16 flex items-center justify-between">
            <div className="flex items-center gap-2.5 lg:hidden">
              <div className="w-8 h-8 rounded-xl bg-[#0A3622] text-white flex items-center justify-center font-bold text-sm">
                D
              </div>
              <span
                className="text-lg font-bold tracking-tight text-slate-900"
                style={{ fontFamily: "var(--font-jakarta)" }}
              >
                Duro
              </span>
            </div>
            <div className="hidden lg:block h-4 w-44 bg-slate-200 rounded animate-pulse" />
            <div className="flex items-center gap-3">
              <div className="h-8 w-32 rounded-full bg-white border border-[#E4E7DF] animate-pulse" />
              <div className="h-9 w-28 rounded-full bg-white border border-[#E4E7DF] animate-pulse" />
            </div>
          </header>

          <main className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-8 py-6 sm:py-8 space-y-6">
            {/* Hero Portfolio Banner Skeleton */}
            <div className="h-48 w-full rounded-3xl bg-[#0A3622]/90 p-7 flex flex-col justify-between animate-pulse">
              <div className="space-y-3">
                <div className="h-3.5 w-40 bg-emerald-200/30 rounded" />
                <div className="h-10 w-64 bg-white/20 rounded-xl" />
              </div>
              <div className="flex items-center gap-3">
                <div className="h-10 w-32 bg-white/20 rounded-xl" />
                <div className="h-10 w-32 bg-white/10 rounded-xl" />
              </div>
            </div>

            {/* Two-Column Spend & Save Cards Skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="h-44 rounded-3xl bg-white border border-[#E4E7DF] p-6 flex flex-col justify-between animate-pulse">
                <div className="flex items-center justify-between">
                  <div className="h-8 w-36 bg-slate-200 rounded-lg" />
                  <div className="h-6 w-14 bg-emerald-100 rounded-full" />
                </div>
                <div className="h-8 w-44 bg-slate-200 rounded-lg" />
                <div className="h-3.5 w-52 bg-slate-100 rounded" />
              </div>
              <div className="h-44 rounded-3xl bg-white border border-[#E4E7DF] p-6 flex flex-col justify-between animate-pulse">
                <div className="flex items-center justify-between">
                  <div className="h-8 w-36 bg-slate-200 rounded-lg" />
                  <div className="h-6 w-14 bg-amber-100 rounded-full" />
                </div>
                <div className="h-8 w-44 bg-slate-200 rounded-lg" />
                <div className="h-3.5 w-52 bg-slate-100 rounded" />
              </div>
            </div>

            {/* Bottom Section Skeleton */}
            <div className="h-56 rounded-3xl bg-white border border-[#E4E7DF] p-6 space-y-4 animate-pulse">
              <div className="h-5 w-48 bg-slate-200 rounded" />
              <div className="h-12 w-full bg-slate-100 rounded-2xl" />
              <div className="h-12 w-full bg-slate-100 rounded-2xl" />
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (needsOnboarding || !wallet) {
    return <OnboardingFlow />;
  }

  const isLocked = wallet.lock.active;
  const initials = wallet.profile.fullName
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="min-h-screen bg-[#F7F8F5] text-slate-900 flex flex-col lg:flex-row">
      {/* Desktop Left Sidebar */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 bg-white border-r border-[#E4E7DF] px-5 py-6 justify-between no-print">
        <div className="space-y-7">
          {/* Brand */}
          <Link href="/" className="flex items-center gap-2.5 px-2">
            <div className="w-9 h-9 rounded-xl bg-[#0A3622] text-white flex items-center justify-center font-bold text-base">
              D
            </div>
            <div>
              <span
                className="text-xl font-bold tracking-tight text-slate-900 block leading-none"
                style={{ fontFamily: "var(--font-jakarta)" }}
              >
                Duro
              </span>
              <span className="text-[11px] text-slate-500">
                Spend Naira · Save Dollars
              </span>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="space-y-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active =
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    active
                      ? "bg-[#0A3622] text-white font-semibold"
                      : "text-slate-600 hover:text-slate-900 hover:bg-[#F7F8F5]"
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </span>
                  {item.href === "/settings" && isLocked && (
                    <span className="w-2 h-2 rounded-full bg-rose-500" />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom Profile Summary + Sign Out */}
        <div className="space-y-3">
          <div className="p-3.5 rounded-2xl bg-[#F7F8F5] border border-[#E4E7DF]">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-700">
                Auto-Save Rule
              </span>
              <span className="font-mono font-bold text-[#0A3622]">
                {wallet.profile.autoSavePercent}% to USD
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
              Every incoming Naira deposit automatically saves{" "}
              {wallet.profile.autoSavePercent}% in US Dollars.
            </p>
          </div>

          <div className="flex items-center justify-between gap-2 p-2 rounded-2xl bg-[#F7F8F5]/70 border border-[#E4E7DF]">
            <Link
              href="/settings"
              className="flex items-center gap-2.5 min-w-0 flex-1 p-1 rounded-xl hover:bg-white transition-colors"
            >
              <div className="w-9 h-9 rounded-full bg-emerald-100 text-[#0A3622] font-bold text-xs flex items-center justify-center shrink-0">
                {initials}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-slate-900 truncate">
                  {wallet.profile.fullName}
                </div>
                <div className="text-[11px] text-emerald-700 font-medium flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  <span>NIMC Verified</span>
                </div>
              </div>
            </Link>

            <button
              type="button"
              onClick={startFreshOnboarding}
              title="Sign Out"
              className="p-2 rounded-xl text-slate-500 hover:text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer shrink-0"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Top Header */}
      <header className="lg:hidden sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-[#E4E7DF] px-4 py-3 flex items-center justify-between no-print">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-[#0A3622] text-white flex items-center justify-center font-bold text-sm">
            D
          </div>
          <span
            className="text-lg font-bold tracking-tight text-slate-900"
            style={{ fontFamily: "var(--font-jakarta)" }}
          >
            Duro
          </span>
        </Link>

        <div className="flex items-center gap-2">
          <Link
            href="/settings"
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-full bg-[#F7F8F5] border border-[#E4E7DF] text-xs font-medium text-slate-800"
          >
            <span className="w-5 h-5 rounded-full bg-emerald-100 text-[#0A3622] font-bold text-[10px] flex items-center justify-center">
              {initials}
            </span>
            <span>{wallet.profile.firstName}</span>
            {isLocked && <span className="w-2 h-2 rounded-full bg-rose-500" />}
          </Link>
          <button
            type="button"
            onClick={startFreshOnboarding}
            title="Sign Out"
            className="p-2 rounded-full bg-[#F7F8F5] border border-[#E4E7DF] text-slate-600 hover:text-rose-700 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 lg:pl-64 flex flex-col min-h-screen pb-20 lg:pb-0">
        {/* Conditional 24-Hour New-Device Security Lock Banner */}
        {isLocked && (
          <div className="bg-rose-50 border-b border-rose-200 px-4 sm:px-8 py-3.5 no-print">
            <div className="max-w-4xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0 mt-0.5">
                  <ShieldAlert className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-rose-900">
                    24-Hour Security Protection Active (New Device Detected)
                  </div>
                  <p className="text-xs text-rose-700 mt-0.5">
                    To protect your money after a SIM swap or lost phone, US
                    Dollar withdrawals are frozen and bank transfers can only go
                    to saved family recipients.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={openRecoveryModal}
                className="h-9 px-4 rounded-xl bg-rose-700 hover:bg-rose-800 text-white font-semibold text-xs whitespace-nowrap shrink-0 cursor-pointer"
              >
                Verify Selfie to Unlock
              </button>
            </div>
          </div>
        )}

        {/* Toast Notification */}
        {toast && (
          <div className="fixed bottom-20 lg:bottom-6 right-4 lg:right-8 z-50 max-w-sm rounded-2xl bg-slate-900 text-white px-4 py-3 shadow-xl border border-slate-800 text-xs font-medium flex items-center gap-2.5 no-print">
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${
                toast.tone === "error"
                  ? "bg-rose-400"
                  : toast.tone === "info"
                    ? "bg-amber-400"
                    : "bg-emerald-400"
              }`}
            />
            <span>{toast.text}</span>
          </div>
        )}

        {/* Route Content */}
        <main className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-8 py-6 sm:py-8">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-white/95 backdrop-blur-md border-t border-[#E4E7DF] grid grid-cols-5 px-1 py-1.5 no-print">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center py-1.5 rounded-xl text-[10px] font-medium transition-colors ${
                active ? "text-[#0A3622] font-bold" : "text-slate-500"
              }`}
            >
              <Icon className="w-4 h-4 mb-0.5" />
              <span className="truncate max-w-[64px]">
                {item.label === "Credit & Statements"
                  ? "Credit"
                  : item.label === "Security & Devices"
                    ? "Security"
                    : item.label}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Selfie Liveness Verification Modal */}
      <SelfieLivenessModal />
    </div>
  );
}
