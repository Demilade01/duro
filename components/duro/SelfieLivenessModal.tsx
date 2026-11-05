"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  Camera,
  CheckCircle2,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  VideoOff,
  X,
} from "lucide-react";
import {
  generateVerifiedSelfiePngDataUrl,
  useDuro,
} from "@/components/duro-context";
import { TUNDE } from "@/lib/demo";

export default function SelfieLivenessModal() {
  const { wallet, recoveryModalOpen, closeRecoveryModal, recoverIdentity } =
    useDuro();

  const [nin, setNin] = useState<string>(TUNDE.nin);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [capturedSelfie, setCapturedSelfie] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, [recoveryModalOpen]);

  if (!recoveryModalOpen) return null;

  const handleClose = () => {
    stopCamera();
    setErrorMsg(null);
    closeRecoveryModal();
  };

  const startCamera = async () => {
    setCameraError(null);
    setCapturedSelfie(null);
    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices?.getUserMedia
    ) {
      setCameraError(
        "Camera API unavailable here. Tap 'Instant Selfie Check' below.",
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
        "Camera permission was not granted. Use 'Instant Selfie Check' below.",
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

  const applySampleSelfie = () => {
    stopCamera();
    setCapturedSelfie(generateVerifiedSelfiePngDataUrl());
    setCameraError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    const cleanNin = nin.replace(/\D/g, "");
    if (cleanNin.length !== 11) {
      setErrorMsg("Please enter your 11-digit NIN.");
      return;
    }
    setSubmitting(true);
    try {
      const selfie = capturedSelfie || generateVerifiedSelfiePngDataUrl();
      await recoverIdentity(cleanNin, selfie);
      handleClose();
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : "Identity verification failed.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
      <div className="w-full max-w-md rounded-3xl bg-white border border-[#E4E7DF] shadow-2xl overflow-hidden text-slate-900">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E4E7DF]">
          <div>
            <h2
              className="text-base font-bold text-slate-900"
              style={{ fontFamily: "var(--font-jakarta)" }}
            >
              Verify Your Identity
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Confirm your NIN and selfie to trust this device and unfreeze your
              US Dollar savings
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="w-9 h-9 flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-700">
                11-Digit NIN ({wallet?.profile.ninMasked ?? "•••••••8901"})
              </label>
              <span className="text-[11px] font-medium text-emerald-700">
                NIMC Match
              </span>
            </div>
            <input
              type="text"
              required
              maxLength={11}
              value={nin}
              onChange={(e) => setNin(e.target.value.replace(/\D/g, ""))}
              placeholder="12345678901"
              className="w-full h-11 px-3.5 rounded-xl bg-[#F7F8F5] border border-[#E4E7DF] text-sm font-mono tracking-wider text-slate-900 focus:outline-none focus:border-[#0A3622] focus:bg-white"
            />
          </div>

          <div className="rounded-2xl bg-[#F7F8F5] border border-[#E4E7DF] p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-700">
                Selfie Liveness Check
              </span>
              <span className="text-[11px] text-slate-500">
                {capturedSelfie
                  ? "Selfie captured"
                  : cameraActive
                    ? "Camera active"
                    : "Ready"}
              </span>
            </div>

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
                    <span>Liveness Confirmed</span>
                  </div>
                </div>
              ) : (
                <div className="text-center px-4 space-y-2">
                  <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-[#0A3622] mx-auto flex items-center justify-center">
                    <Camera className="w-5 h-5" />
                  </div>
                  <p className="text-xs text-slate-500">
                    Position your face in the frame or use Instant Check
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
                  <span>Capture</span>
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
                onClick={applySampleSelfie}
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

          <button
            type="submit"
            disabled={submitting}
            className="w-full h-12 rounded-xl bg-[#0A3622] hover:bg-[#14532D] disabled:opacity-50 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>
              {submitting
                ? "Verifying..."
                : "Verify Identity & Unlock Savings"}
            </span>
          </button>
        </form>
      </div>
    </div>
  );
}
