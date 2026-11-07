export type DuroErrorCode =
  | "VALIDATION"
  | "NOT_ONBOARDED"
  | "NOT_FOUND"
  | "DEVICE_ID_REQUIRED"
  | "VELOCITY_LOCKED"
  | "UNVERIFIED_RECIPIENT_LOCKED"
  | "RECIPIENT_ADDITION_LOCKED"
  | "RECIPIENT_MUTATION_LOCKED"
  | "INSUFFICIENT_FUNDS"
  | "INVALID_SIGNATURE"
  | "KYC_FAILED"
  | "CONSENT_REQUIRED"
  | "QUOTE_EXPIRED"
  | "BUSHA_NOT_CONFIGURED"
  | "BUSHA_UPSTREAM"
  | "INTERNAL";

/** Application-level error, mapped 1:1 to the `{ ok:false, error }` response. */
export class DuroError extends Error {
  constructor(
    public readonly code: DuroErrorCode,
    message: string,
    public readonly status: number,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "DuroError";
  }
}

/** Raised by BushaClient when Busha (live or mock) returns a non-2xx response. */
export class BushaApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly errorName: string,
    message: string,
    public readonly body?: unknown,
  ) {
    super(message);
    this.name = "BushaApiError";
  }
}

/** Translate upstream Busha failures into Duro error codes the UI understands. */
export function mapBushaError(err: BushaApiError): DuroError {
  switch (err.errorName) {
    case "insufficient_balance":
      return new DuroError("INSUFFICIENT_FUNDS", err.message, 422, err.body);
    case "quote_expired":
      return new DuroError("QUOTE_EXPIRED", err.message, 409, err.body);
    case "verification_failed":
      return new DuroError("KYC_FAILED", err.message, 403, err.body);
    case "not_found":
      return new DuroError("NOT_FOUND", err.message, 404, err.body);
    case "validation_error":
      return new DuroError("VALIDATION", err.message, 400, err.body);
    default:
      return new DuroError(
        "BUSHA_UPSTREAM",
        `Busha error (${err.status}): ${err.message}`,
        502,
        err.body,
      );
  }
}
