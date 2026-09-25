/** Payment provider contract (SPEC 3.6). Adding crypto later = one new file in providers/. */
export type ProviderId = "paystack" | "crypto";

export interface InitializeInput {
  orderId: string;
  orderNumber: string;
  /** Our own unique reference, already saved on the payments row. */
  reference: string;
  amountNaira: number;
  email: string;
  /** Where the provider sends the customer after paying (or cancelling). */
  callbackUrl: string;
  metadata: Record<string, unknown>;
}

export interface VerifyResult {
  status: "success" | "failed" | "pending";
  /** Amount actually paid, converted to naira. */
  amountNaira: number;
  providerFee?: number;
  raw: unknown;
}

export interface PaymentProvider {
  id: ProviderId;
  /** Shown at checkout, e.g. "Card, bank transfer or USSD". */
  label: string;
  isEnabled(): boolean;
  initialize(input: InitializeInput): Promise<{ reference: string; redirectUrl: string }>;
  verify(reference: string): Promise<VerifyResult>;
  /** Verifies the signature; returns null if invalid or irrelevant. */
  parseWebhook(req: Request): Promise<{ reference: string } | null>;
}

export class NotImplementedError extends Error {
  constructor(what: string) {
    super(`${what} is not implemented yet`);
    this.name = "NotImplementedError";
  }
}
