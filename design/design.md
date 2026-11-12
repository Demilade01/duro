# Duro — Design System & Tokens (`design.md`)

All screens and sections read colours, typography, radius, spacing, and motion from these named tokens. Raw hex values are forbidden in components.

## 1. Colour Tokens (2 Brand Colours + Calm Neutrals + Status)

| Token | CSS Variable | Value | Purpose | Contrast vs Background |
|---|---|---|---|---|
| Background | `--background` | `#F7F8F5` | Primary page canvas | — |
| Card | `--card` | `#FFFFFF` | Elevated cards and bento surfaces | — |
| Muted | `--muted` | `#EEF0EA` | Secondary wells, pill tracks, table headers | — |
| Border | `--border` | `#E2E5DC` | Hairline dividers and card outlines | — |
| Foreground | `--foreground` | `#111814` | Primary headings and body copy | `16.4:1` (AAA) |
| Muted Foreground | `--muted-foreground` | `#4A554E` | Subtitles and secondary paragraphs | `7.1:1` (AA) |
| Subtle | `--subtle` | `#68736C` | Captions, metadata, timestamps | `4.6:1` (AA) |
| Brand | `--brand` | `#0A3622` | Primary actions, active pills, dark bento surface | `11.8:1` on `#F7F8F5` |
| Brand Foreground | `--brand-foreground` | `#F7F8F5` | Text/icons on `--brand` surfaces | `11.8:1` |
| Accent | `--accent` | `#DDF7B6` | Highlight pill surface on dark brand cards | `10.2:1` vs `--brand` |
| Status Success | `--status-success` | `#166534` | Verified KYC, completed payout, trusted device | `6.8:1` |
| Status Warning | `--status-warning` | `#9A3412` | Pending deposit, collateral lock notice | `6.4:1` |
| Status Danger | `--status-danger` | `#991B1B` | 24-hour anti-coercion lock alert | `7.2:1` |

## 2. Typography

- **Heading Font (`--font-serif`)**: `Instrument Serif` — Regular `400` only. Titles are never bold.
- **Body Font (`--font-sans`)**: `DM Sans` — Regular `400` and Medium `500` only. Nothing heavier than `font-medium` (`500`).
- **Numeric / Ledger Font (`--font-mono`)**: `JetBrains Mono` — Regular `400` and Medium `500` for NGN/USD amounts, rates, and account numbers.
- **Type Scale**:
  - Hero Display: `clamp(2.5rem, 5vw, 4.25rem)`, line-height `1.06`, letter-spacing `-0.02em`, weight `400`
  - Section Heading (H2): `2rem` (`32px`) mobile / `2.5rem` (`40px`) desktop, line-height `1.12`, weight `400`
  - Card Title (H3): `1.25rem` (`20px`), line-height `1.3`, weight `500`
  - Body: `1rem` (`16px`), line-height `1.6`, weight `400`
  - Caption / Label: `0.75rem` (`12px`), line-height `1.4`, weight `500`

## 3. Radius Scale (Fully Rounded)

- `--radius-pill`: `9999px` (all buttons, badges, floating header, segmented tabs)
- `--radius-card`: `24px` (`1.5rem`, bento cards, modals, hero frame)
- `--radius-control`: `16px` (`1rem`, inputs, inner wells)

## 4. Spacing Scale

- Section vertical rhythm: `py-16` (`64px`) mobile, `py-24` (`96px`) desktop
- Container max width: `1120px` (`max-w-6xl`), horizontal padding `px-5 sm:px-8`
- Grid gap: `16px` (`gap-4`) mobile, `20px` (`gap-5`) desktop

## 5. Gradients, Shadows & Motion

- **Gradients**: Subtle architectural grid + single radial bottom glow using `color-mix(in srgb, var(--brand) 8%, transparent)` and `var(--background)`. Reused in Hero and Bottom CTA only.
- **Shadows**: Zero hover drop-shadows. Elevation uses `1px solid var(--border)`.
- **Micro-Interactions**:
  - `btn-slide`: Icon inside primary/secondary button slides `4px` right on hover (`150ms cubic-bezier(0.22, 1, 0.36, 1)`).
  - Respects `@media (prefers-reduced-motion: reduce)`.
