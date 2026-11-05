import type { Metadata } from "next";
import { Plus_Jakarta_Sans, DM_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Duro — One Wallet, Two Balances",
  description:
    "Zero-paperwork everyday Naira spend (cNGN) and automated dollar shield (USDC) wallet powered by Busha APIs, with SIM-swap velocity guardrails and landlord financial passport.",
  openGraph: {
    title: "Duro — One Wallet, Two Balances",
    description:
      "Zero-paperwork everyday Naira spend (cNGN) and automated dollar shield (USDC) wallet powered by Busha APIs, with SIM-swap velocity guardrails and landlord financial passport.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`dark ${jakarta.variable} ${dmSans.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#090D16] text-slate-100 selection:bg-emerald-500/30 selection:text-emerald-200">
        {children}
      </body>
    </html>
  );
}
