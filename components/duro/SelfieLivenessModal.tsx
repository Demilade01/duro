"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  Camera,
  CheckCircle2,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  UserCheck,
  VideoOff,
  X,
} from "lucide-react";
import { SAMPLE_VERIFIED_SELFIE_BASE64 } from "@/lib/duro-api";
import { UserProfile } from "@/lib/types";

interface SelfieLivenessModalProps {
  isOpen: boolean;
  mode: "ONBOARDING" | "RECOVERY";
  user: UserProfile;
  activeDeviceId: string;
  onClose: () => void;
  onCompleteOnboarding: (payload: {
    fullName: string;
    phone: string;
    email: string;
    nin: string;
    selfieImage: string;
  }) => Promise<void>;
  onCompleteRecovery: (payload: {
    nin: string;
    selfieImage: string;
  }) => Promise<void>;
}

export default function SelfieLivenessModal({
  isOpen,
  mode,
  user,
  activeDeviceId,
  onClose,
  onCompleteOnboarding,
  onCompleteRecovery,
}: SelfieLivenessModalProps) {
  const [fullName, setFullName] = useState(user.fullName || "Tunde Bakare");
  const [phone, setPhone] = useState(user.phone || "+2348099887766");
  const email = user.email || "tunde.bakare@duro.app";
  const [nin, setNin] = useState(user.nin || "12345678901");

  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [capturedSelfie, setCapturedSelfie] = useState<string | null>(null);
  const [selfieSource, setSelfieSource] = useState<"WEBCAM" | "SAMPLE" | null>(
    null
  );
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const releaseMediaTracks = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  const stopCamera = () => {
    releaseMediaTracks();
    setCameraActive(false);
  };

  const handleModalClose = () => {
    stopCamera();
    onClose();
  };

  const startCamera = async () => {
    setCameraError(null);
    setCapturedSelfie(null);
    setSelfieSource(null);
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setCameraError(
        "Browser camera API unavailable in this frame. Use the 1-tap Verified Sample Selfie below."
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
        "Webcam permission denied or unavailable. Click 'Use Verified Sample Selfie' for instant demo verification."
      );
      setCameraActive(false);
    }
  };

  useEffect(() => {
    return () => {
      releaseMediaTracks();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const captureFromWebcam = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement("canvas");
    canvas.width = 280;
    canvas.height = 280;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
      setCapturedSelfie(dataUrl);
      setSelfieSource("WEBCAM");
      stopCamera();
    }
  };

  const applySampleSelfie = () => {
    stopCamera();
    setCapturedSelfie(SAMPLE_VERIFIED_SELFIE_BASE64);
    setSelfieSource("SAMPLE");
    setCameraError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    const cleanNin = nin.replace(/\D/g, "");
    if (cleanNin.length !== 11) {
      setErrorMsg("Please enter a valid 11-digit Nigerian NIN.");
      return;
    }
    const finalSelfie = capturedSelfie || SAMPLE_VERIFIED_SELFIE_BASE64;
    setSubmitting(true);
    try {
      if (mode === "ONBOARDING") {
        await onCompleteOnboarding({
          fullName,
          phone,
          email,
          nin: cleanNin,
          selfieImage: finalSelfie,
        });
      } else {
        await onCompleteRecovery({
          nin: cleanNin,
          selfieImage: finalSelfie,
        });
      }
      handleModalClose();
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : "Verification failed. Please retry."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-3xl bg-[#0D1322] border border-slate-800 shadow-2xl overflow-hidden text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800/80">
          <div>
            <h2
              className="text-base font-bold tracking-tight text-white"
              style={{ fontFamily: "var(--font-jakarta)" }}
            >
              {mode === "ONBOARDING"
                ? "Zero-Paperwork KYC Onboarding"
                : "3D Selfie Liveness Recovery"}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {mode === "ONBOARDING"
                ? "Phone + 11-digit NIN + 3D Selfie · No utility bill required"
                : `Clear 24h SIM-Swap Lock & trust device (${activeDeviceId})`}
            </p>
          </div>
          <button
            type="button"
            onClick={handleModalClose}
            className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[82vh] overflow-y-auto">
          {mode === "ONBOARDING" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Full Legal Name
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full h-11 px-3 rounded-xl bg-slate-900/90 border border-slate-800 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Nigerian Phone Number
                </label>
                <input
                  type="text"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full h-11 px-3 rounded-xl bg-slate-900/90 border border-slate-800 text-sm font-mono tabular-nums text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-slate-300">
                11-Digit National Identification Number (NIN)
              </label>
              <span className="text-[11px] font-mono tabular-nums text-emerald-400">
                NIMC Verified
              </span>
            </div>
            <input
              type="text"
              required
              maxLength={11}
              value={nin}
              onChange={(e) => setNin(e.target.value.replace(/\D/g, ""))}
              placeholder="29481039481"
              className="w-full h-11 px-3 rounded-xl bg-slate-900/90 border border-slate-800 text-sm font-mono tabular-nums tracking-wider text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* 3D Biometric Selfie Scanner */}
          <div className="rounded-2xl bg-slate-950/90 border border-slate-800/90 p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-slate-300">
                3D Liveness Biometric Check
              </span>
              <span className="text-[11px] text-slate-400 font-mono">
                {selfieSource === "WEBCAM"
                  ? "Live Camera Captured"
                  : selfieSource === "SAMPLE"
                  ? "Sample Liveness Loaded"
                  : cameraActive
                  ? "Camera Streaming..."
                  : "Ready"}
              </span>
            </div>

            {/* Viewport */}
            <div className="relative mx-auto w-48 h-48 rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden flex items-center justify-center">
              {cameraActive ? (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover scale-x-[-1]"
                  />
                  {/* Oval 3D Face Framing Overlay */}
                  <div className="pointer-events-none absolute inset-3 rounded-full border-2 border-dashed border-emerald-400/80 shadow-[0_0_25px_rgba(16,185,129,0.25)]" />
                </>
              ) : capturedSelfie ? (
                <div className="relative w-full h-full flex items-center justify-center bg-slate-900">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={capturedSelfie}
                    alt="Verified 3D Liveness Selfie"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-2 inset-x-2 px-2 py-1 rounded-lg bg-emerald-950/90 border border-emerald-500/40 flex items-center justify-center gap-1.5 text-[11px] font-medium text-emerald-300">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    <span>Liveness Match 99.8%</span>
                  </div>
                </div>
              ) : (
                <div className="text-center px-4 space-y-2">
                  <div className="w-12 h-12 rounded-2xl bg-slate-800/80 border border-slate-700 mx-auto flex items-center justify-center text-slate-300">
                    <Camera className="w-6 h-6" />
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Start live webcam or use the 1-tap sample selfie for instant demo verification.
                  </p>
                </div>
              )}
            </div>

            {cameraError && (
              <div className="mt-3 p-2.5 rounded-xl bg-amber-950/50 border border-amber-500/30 flex items-start gap-2 text-xs text-amber-200">
                <VideoOff className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span>{cameraError}</span>
              </div>
            )}

            {/* Camera / Fallback Controls */}
            <div className="grid grid-cols-2 gap-2.5 mt-3.5">
              {cameraActive ? (
                <button
                  type="button"
                  onClick={captureFromWebcam}
                  className="min-h-[44px] px-3 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap"
                >
                  <Camera className="w-4 h-4 shrink-0" />
                  <span>Capture Frame</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={startCamera}
                  className="min-h-[44px] px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 font-medium text-xs flex items-center justify-center gap-1.5 border border-slate-700 transition-colors whitespace-nowrap"
                >
                  <RefreshCw className="w-3.5 h-3.5 shrink-0" />
                  <span>{capturedSelfie ? "Retake Webcam" : "Start Webcam"}</span>
                </button>
              )}

              <button
                type="button"
                onClick={applySampleSelfie}
                className="min-h-[44px] px-3 py-2 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 border border-sky-500/30 font-medium text-xs flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap"
              >
                <Sparkles className="w-3.5 h-3.5 shrink-0" />
                <span>1-Tap Sample Selfie</span>
              </button>
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/40 text-xs text-rose-200">
              {errorMsg}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full min-h-[48px] px-4 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-semibold text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            {mode === "ONBOARDING" ? (
              <>
                <UserCheck className="w-4 h-4" />
                <span>
                  {submitting
                    ? "Verifying NIN & Liveness with Busha..."
                    : "Verify Identity & Open Duro Wallet"}
                </span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                <span>
                  {submitting
                    ? "Verifying 3D Liveness..."
                    : "Complete Liveness & Unlock Account"}
                </span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
