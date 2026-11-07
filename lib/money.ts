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

/** Busha official NGN fiat withdrawal / payout fee: NGN 100 base + 7.5% VAT = NGN 107.50 */
export const BUSHA_NGN_PAYOUT_FEE = 107.5;

export interface BushaPayoutFeeBreakdown {
  principalNgn: number;
  feeNgn: number;
  baseFeeNgn: number;
  vatNgn: number;
  totalDebitNgn: number;
}

export function getBushaPayoutFeeBreakdown(amountNgn: number): BushaPayoutFeeBreakdown {
  const principal = Math.max(0, Number(amountNgn) || 0);
  const fee = principal > 0 ? BUSHA_NGN_PAYOUT_FEE : 0;
  return {
    principalNgn: principal,
    feeNgn: fee,
    baseFeeNgn: principal > 0 ? 100.0 : 0,
    vatNgn: principal > 0 ? 7.5 : 0,
    totalDebitNgn: round2(principal + fee),
  };
}
