/**
 * Money helpers. All arithmetic happens in integer minor units (kobo / cents)
 * to avoid floating-point drift; Busha's wire format is decimal strings.
 */

export const USD_NGN_RATE = Number(process.env.DURO_USD_NGN_RATE ?? "1593");

/** "150000.00" | 150000 -> 15000000 */
export function toMinor(value: string | number): number {
  const n = typeof value === "number" ? value : Number.parseFloat(value);
  if (!Number.isFinite(n)) throw new Error(`Invalid amount: ${value}`);
  return Math.round(n * 100);
}

/** 15000000 -> "150000.00" */
export function fromMinor(minor: number): string {
  return (minor / 100).toFixed(2);
}

/** 15000000 -> 150000 */
export function minorToNumber(minor: number): number {
  return Math.round(minor) / 100;
}

/** NGN kobo -> USD cents at the given rate (rounded down — never over-credit). */
export function ngnToUsdMinor(ngnMinor: number, rate = USD_NGN_RATE): number {
  return Math.floor(ngnMinor / rate);
}

/** USD cents -> NGN kobo at the given rate. */
export function usdToNgnMinor(usdMinor: number, rate = USD_NGN_RATE): number {
  return Math.round(usdMinor * rate);
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
