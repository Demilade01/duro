"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Camera,
  CheckCircle2,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  UserCheck,
  VideoOff,
} from "lucide-react";
import {
  generateVerifiedSelfiePngDataUrl,
  useDuro,
} from "@/components/duro-context";
import { TUNDE } from "@/lib/demo";

export default function OnboardingFlow() {
  const { completeOnboarding } = useDuro();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [fullName, setFullName] = useState<string>("");
  const [phone, setPhone] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [nin, setNin] = useState<string>("");

  const handleFillDemoDetails = () => {
    setFullName(TUNDE.fullName);
    setPhone(TUNDE.phone);
    setEmail(TUNDE.email);
    setNin(TUNDE.nin);
    setErrorMsg(null);
  };

  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [capturedSelfie, setCapturedSelfie] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  const startCamera = async () => {
    setCameraError(null);
    setCapturedSelfie(null);
    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices?.getUserMedia
    ) {
      setCameraError(
        "Camera is unavailable on this browser. Use the instant selfie check below.",
      );
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 480 }, height: { ideal: 480 } },
        audio: false,
      });
      streamRef.current = stream;
      setCameraActive(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch {
      setCameraError(
        "Camera permission was declined. You can complete verification with the instant check below.",
      );
      setCameraActive(false);
    }
  };

  const captureFromWebcam = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement("canvas");
    canvas.width = 280;
    canvas.height = 280;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/png");
      setCapturedSelfie(dataUrl);
      stopCamera();
    }
  };

  const handleUseInstantSelfie = () => {
    stopCamera();
    setCameraError(null);
    setCapturedSelfie(generateVerifiedSelfiePngDataUrl());
  };

  const handleFinish = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    const cleanNin = nin.replace(/\D/g, "");
    if (cleanNin.length !== 11) {
      setErrorMsg("Your NIN must be 11 digits.");
      return;
    }
    setSubmitting(true);
    try {
      const selfie = capturedSelfie || generateVerifiedSelfiePngDataUrl();
      await completeOnboarding({
        fullName: fullName.trim(),
        phone: phone.replace(/\s+/g, ""),
        email: email.trim(),
        nin: cleanNin,
        selfieImage: selfie,
        reset: true,
      });
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : "Could not complete onboarding.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F8F5] text-slate-900 flex flex-col justify-between p-4 sm:p-8">
      {/* Top Bar */}
      <header className="max-w-5xl w-full mx-auto flex items-center justify-between py-2">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-[#0A3622] text-white flex items-center justify-center font-bold text-base">
            D
          </div>
          <span
            className="text-xl font-bold tracking-tight text-slate-900"
            style={{ fontFamily: "var(--font-jakarta)" }}
          >
            Duro
          </span>
        </div>
        <span className="text-xs font-medium text-slate-500">
          Zero-paperwork account · Ready in 60 seconds
        </span>
      </header>

      {/* Main Card */}
      <main className="my-auto py-8">
        <div className="max-w-md w-full mx-auto bg-white rounded-3xl border border-[#E4E7DF] shadow-sm p-6 sm:p-8">
          {/* Progress indicator */}
          <div className="flex items-center gap-2 mb-6">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className={`h-1.5 flex-1 rounded-full transition-colors ${
                  n <= step ? "bg-[#0A3622]" : "bg-slate-200"
                }`}
              />
            ))}
          </div>

          {step === 1 && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setStep(2);
              }}
              className="space-y-4"
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-[#0A3622]">
                    Step 1 of 3
                  </span>
                  <button
                    type="button"
                    onClick={handleFillDemoDetails}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-[#0A3622] text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Fill Demo Details</span>
                  </button>
                </div>
                <h1
                  className="text-2xl font-bold text-slate-900 mt-1"
                  style={{ fontFamily: "var(--font-jakarta)" }}
                >
                  Open your Duro account
                </h1>
                <p className="text-sm text-slate-600 mt-1">
                  Spend in Naira and automatically save a slice of every deposit
                  in US Dollars—no utility bill or minimum balance needed.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Full legal name
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Tunde Bakare"
                  className="w-full h-11 px-3.5 rounded-xl bg-[#F7F8F5] border border-[#E4E7DF] text-sm text-slate-900 focus:outline-none focus:border-[#0A3622] focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Nigerian phone number
                </label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+2348099887766"
                  className="w-full h-11 px-3.5 rounded-xl bg-[#F7F8F5] border border-[#E4E7DF] text-sm font-mono text-slate-900 focus:outline-none focus:border-[#0A3622] focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Email address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tunde.bakare@duro.app"
                  className="w-full h-11 px-3.5 rounded-xl bg-[#F7F8F5] border border-[#E4E7DF] text-sm text-slate-900 focus:outline-none focus:border-[#0A3622] focus:bg-white"
                />
              </div>

              <button
                type="submit"
                className="w-full h-12 rounded-xl bg-[#0A3622] hover:bg-[#14532D] text-white font-semibold text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer mt-2"
              >
                <span>Continue</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          {step === 2 && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (nin.replace(/\D/g, "").length !== 11) {
                  setErrorMsg("Enter a valid 11-digit NIN.");
                  return;
                }
                setErrorMsg(null);
                setStep(3);
              }}
              className="space-y-4"
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-[#0A3622]">
                    Step 2 of 3
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setNin(TUNDE.nin);
                      setErrorMsg(null);
                    }}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-[#0A3622] text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Fill Demo NIN</span>
                  </button>
                </div>
                <h1
                  className="text-2xl font-bold text-slate-900 mt-1"
                  style={{ fontFamily: "var(--font-jakarta)" }}
                >
                  Verify your NIN
                </h1>
                <p className="text-sm text-slate-600 mt-1">
                  Enter your 11-digit National Identification Number to unlock
                  instant Nigerian bank transfers.
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-700">
                    11-digit NIN
                  </label>
                  <span className="text-xs font-medium text-emerald-700 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    NIMC Instant Check
                  </span>
                </div>
                <input
                  type="text"
                  maxLength={11}
                  required
                  value={nin}
                  onChange={(e) => setNin(e.target.value.replace(/\D/g, ""))}
                  placeholder="12345678901"
                  className="w-full h-12 px-3.5 rounded-xl bg-[#F7F8F5] border border-[#E4E7DF] text-base font-mono tracking-widest text-slate-900 focus:outline-none focus:border-[#0A3622] focus:bg-white"
                />
              </div>

              {errorMsg && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700">
                  {errorMsg}
                </div>
              )}

              <div className="flex items-center gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="h-12 px-4 rounded-xl border border-[#E4E7DF] text-slate-700 hover:bg-slate-50 text-sm font-medium cursor-pointer"
                >
                  Back
                </button>
                <button
                  type="submit"
                  className="flex-1 h-12 rounded-xl bg-[#0A3622] hover:bg-[#14532D] text-white font-semibold text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <span>Continue to Selfie Check</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          )}

          {step === 3 && (
            <form onSubmit={handleFinish} className="space-y-4">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-[#0A3622]">
                  Step 3 of 3
                </span>
                <h1
                  className="text-2xl font-bold text-slate-900 mt-1"
                  style={{ fontFamily: "var(--font-jakarta)" }}
                >
                  Quick selfie check
                </h1>
                <p className="text-sm text-slate-600 mt-1">
                  This protects your US Dollar savings if your phone or SIM card
                  is ever lost.
                </p>
              </div>

              <div className="rounded-2xl bg-[#F7F8F5] border border-[#E4E7DF] p-4">
                <div className="relative mx-auto w-44 h-44 rounded-2xl bg-white border border-[#E4E7DF] overflow-hidden flex items-center justify-center">
                  {cameraActive ? (
                    <>
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover scale-x-[-1]"
                      />
                      <div className="pointer-events-none absolute inset-3 rounded-full border-2 border-dashed border-emerald-600" />
                    </>
                  ) : capturedSelfie ? (
                    <div className="relative w-full h-full flex items-center justify-center">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={capturedSelfie}
                        alt="Verified Selfie"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute bottom-2 inset-x-2 px-2 py-1 rounded-lg bg-emerald-900/90 text-white flex items-center justify-center gap-1 text-[11px] font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                        <span>Selfie Ready</span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center px-4 space-y-2">
                      <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-[#0A3622] mx-auto flex items-center justify-center">
                        <Camera className="w-5 h-5" />
                      </div>
                      <p className="text-xs text-slate-500">
                        Use your camera or tap Instant Check below
                      </p>
                    </div>
                  )}
                </div>

                {cameraError && (
                  <div className="mt-3 p-2.5 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-2 text-xs text-amber-800">
                    <VideoOff className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <span>{cameraError}</span>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2.5 mt-3.5">
                  {cameraActive ? (
                    <button
                      type="button"
                      onClick={captureFromWebcam}
                      className="h-10 px-3 rounded-xl bg-[#0A3622] text-white font-semibold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>Take Photo</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={startCamera}
                      className="h-10 px-3 rounded-xl bg-white hover:bg-slate-50 text-slate-800 font-medium text-xs flex items-center justify-center gap-1.5 border border-[#E4E7DF] cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>{capturedSelfie ? "Retake" : "Use Camera"}</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleUseInstantSelfie}
                    className="h-10 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-[#0A3622] border border-emerald-200 font-semibold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Instant Check</span>
                  </button>
                </div>
              </div>

              {errorMsg && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700">
                  {errorMsg}
                </div>
              )}

              <div className="flex items-center gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    stopCamera();
                    setStep(2);
                  }}
                  className="h-12 px-4 rounded-xl border border-[#E4E7DF] text-slate-700 hover:bg-slate-50 text-sm font-medium cursor-pointer"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 h-12 rounded-xl bg-[#0A3622] hover:bg-[#14532D] disabled:opacity-50 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <UserCheck className="w-4 h-4" />
                  <span>
                    {submitting ? "Opening your wallet..." : "Complete & Open Wallet"}
                  </span>
                </button>
              </div>
            </form>
          )}
        </div>
      </main>

      <footer className="max-w-5xl w-full mx-auto text-center text-xs text-slate-500 py-2">
        Deposits and transfers are processed via licensed Nigerian payment rails.
      </footer>
    </div>
  );
}
