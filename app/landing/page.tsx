"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useDuro } from "@/components/duro-context";
import LandingPage from "@/components/landing/LandingPage";
import OnboardingFlow from "@/components/shell/OnboardingFlow";

export default function LandingRoutePage() {
  const router = useRouter();
  const { wallet, needsOnboarding } = useDuro();
  const [authMode, setAuthMode] = useState<"NONE" | "LOGIN" | "ONBOARD">("NONE");

  const isAuthenticated = Boolean(wallet && !needsOnboarding);

  if (authMode !== "NONE" && !isAuthenticated) {
    return (
      <OnboardingFlow
        key={authMode}
        initialMode={authMode}
        onBackToLanding={() => setAuthMode("NONE")}
      />
    );
  }

  return (
    <LandingPage
      isAuthenticated={isAuthenticated}
      onOpenAccount={() => {
        if (isAuthenticated) {
          router.push("/");
        } else {
          setAuthMode("ONBOARD");
        }
      }}
      onSignIn={() => {
        if (isAuthenticated) {
          router.push("/");
        } else {
          setAuthMode("LOGIN");
        }
      }}
    />
  );
}
