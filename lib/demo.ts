/** Demo persona & fixtures for the Busha Build Challenge walkthrough. */

/** 1x1 PNG — stands in for a webcam selfie when the judge doesn't grant camera access. */
export const SAMPLE_SELFIE_BASE64 =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";

export const TUNDE = {
  phone: "+2348099887766",
  email: "tunde.bakare@duro.app",
  fullName: "Tunde Bakare",
  nin: "12345678901",
  password: "Duro1234!",
} as const;

export const MAMA = {
  label: "Mama (Abosede Bakare)",
  bankName: "GTBank",
  bankCode: "058",
  accountNumber: "0123456789",
  accountName: "ABOSEDE BAKARE",
} as const;

export const DEMO_SALARY_NGN = 150_000;
