# Duro Landing Page — Product Requirements Document (PRD)

## 1. Overview
**Duro** (from Yoruba *Dúró* — "to stand firm, hold your ground") is a dual-balance consumer wallet built for Nigerian earners on Busha payment rails. Every incoming Naira deposit is split automatically between a **Naira Spend (`cNGN`)** balance for daily transfers and a **US Dollar Save (`USDC`)** balance that protects wages against inflation.

## 2. Audience
- Salaried workers, dispatch riders, artisans, freelancers, and remote contractors in Lagos and across Nigeria.
- People who get paid in Naira via bank transfers or POS agents, need to send money to family on Nigerian banks, and want automatic US Dollar savings without crypto jargon, seed phrases, or utility-bill paperwork.

## 3. Must-Haves
- **Floating Pill Header**: Brand mark, anchor links (`Problem`, `How It Works`, `Fees`, `FAQ`), and two actions (`Sign In`, `Open Wallet`).
- **Centred Hero**: 2-line regular-weight serif headline, 3-line subtitle, primary + secondary buttons with 4px right-slide icon micro-interaction, and an interactive dual-balance wallet preview peeking up from the bottom edge.
- **Problem Section**: Direct breakdown of the three traps facing Nigerian earners (wage inflation, utility-bill exclusion, and street-level phone coercion) paired with a custom vector diagram.
- **Solution Bento Grid**: Asymmetric 4-card bento layout with custom SVG illustrations (never six identical icon cards):
  1. Automatic Salary Split (`15%` default to US Dollars on every Providus Bank deposit)
  2. Transparent NIP Bank Payouts (`₦200` fee + `₦15` VAT shown before you send)
  3. Dollar-Backed Naira Credit & Landlord Statements (`150%` collateral ratio, zero dollar sale)
  4. 24-Hour Anti-Coercion Lock (freezes US Dollars and new recipients on unknown devices; keeps pre-saved Trusted Accounts open)
- **Pricing / Fee Transparency**: Honest, real numbers from the product (`₦0` account opening, `0%` auto-save split fee, `₦215` flat bank payout fee including `7.5%` VAT).
- **Calm FAQ**: Narrow single column, plain dividers (no card-per-question), first item open by default.
- **Centred CTA + 4-Column Footer**: Reuses the hero grid/radial glow background, 2-line headline, single primary button.

## 4. Nice-to-Haves
- Interactive Auto-Save Split preview slider inside the Hero wallet frame so visitors can test how a `₦150,000` salary splits between Naira Spend and US Dollar Save.
- Direct link to `/design-system` in the footer for design token inspection.

## 5. Non-Functional Requirements
- **Zero Slop Tells**: No invented stats (`1M+`, `99.9%`), no fake logos or testimonials, no bold hero titles, no hover drop-shadows, no emoji badges, no off-token hex values.
- **Contrast & Accessibility**: Minimum `4.5:1` body contrast and `3:1` large text contrast; visible `:focus-visible` rings; honours `prefers-reduced-motion`.
- **Responsive**: Mobile-first touch targets (`>= 44px`), tested per section.

## 6. Colour & Design Direction
- **Primary Brand (`--brand`)**: `#0A3622` (Deep Forest Green)
- **Secondary Accent (`--accent`)**: `#D9F99D` / `#15803D` (Warm Lime / Botanical Green)
- **Calm Neutrals**:
  - `--background`: `#F7F8F5` (Warm Alabaster)
  - `--card`: `#FFFFFF` (Pure Surface)
  - `--muted`: `#EEF0EA` (Soft Stone)
  - `--border`: `#E2E5DC` (Hairline Sage Border)
  - `--foreground`: `#111814` (Deep Charcoal Ink)
  - `--muted-foreground`: `#4A554E` (Muted Slate Green)
  - `--subtle`: `#717D75` (Caption Grey)
- **Corner Style**: Fully rounded (`rounded-full` buttons/pills, `24px` card radius).
- **3 Reference Adjectives**: Grounded, Editorial, Trustworthy.
