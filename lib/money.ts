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

/**
 * Busha Sandbox NGN fiat payout fee schedule (returned by POST /v1/quotes):
 *  - Base fee: NGN 200.00 ("Fees")
 *  - VAT (7.5%): NGN 15.00 ("VAT on Fee (7.5%)")
 *  - Total fee: NGN 215.00
 */
export const BUSHA_NGN_PAYOUT_BASE_FEE = 200.0;
export const BUSHA_NGN_PAYOUT_VAT = 15.0;
export const BUSHA_NGN_PAYOUT_FEE = 215.0;

export interface BushaQuoteFeeItem {
  name: string;
  amount: { amount: string; currency: string };
}

export interface BushaPayoutFeeBreakdown {
  principalNgn: number;
  feeNgn: number;
  baseFeeNgn: number;
  vatNgn: number;
  totalDebitNgn: number;
}

export function getBushaPayoutFeeBreakdown(
  amountNgn: number,
  quoteFees?: BushaQuoteFeeItem[],
): BushaPayoutFeeBreakdown {
  const principal = Math.max(0, Number(amountNgn) || 0);
  if (principal <= 0) {
    return { principalNgn: 0, feeNgn: 0, baseFeeNgn: 0, vatNgn: 0, totalDebitNgn: 0 };
  }

  if (quoteFees && quoteFees.length > 0) {
    let baseFee = 0;
    let vatFee = 0;
    for (const f of quoteFees) {
      const val = Number(f.amount?.amount ?? 0) || 0;
      if (/vat/i.test(f.name)) {
        vatFee += val;
      } else {
        baseFee += val;
      }
    }
    const totalFee = round2(baseFee + vatFee);
    return {
      principalNgn: principal,
      feeNgn: totalFee,
      baseFeeNgn: round2(baseFee),
      vatNgn: round2(vatFee),
      totalDebitNgn: round2(principal + totalFee),
    };
  }

  return {
    principalNgn: principal,
    feeNgn: BUSHA_NGN_PAYOUT_FEE,
    baseFeeNgn: BUSHA_NGN_PAYOUT_BASE_FEE,
    vatNgn: BUSHA_NGN_PAYOUT_VAT,
    totalDebitNgn: round2(principal + BUSHA_NGN_PAYOUT_FEE),
  };
}
