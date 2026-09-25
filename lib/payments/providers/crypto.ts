import { NotImplementedError, type PaymentProvider } from "../types";

/**
 * Placeholder so checkout and the webhook route already handle more than one
 * provider. See docs/SPEC.md → 3.6 for what the real implementation needs.
 */
export const cryptoProvider: PaymentProvider = {
  id: "crypto",
  label: "Crypto",
  isEnabled: () => process.env.ENABLE_CRYPTO === "true",
  initialize: async () => {
    throw new NotImplementedError("Crypto payments");
  },
  verify: async () => {
    throw new NotImplementedError("Crypto payments");
  },
  parseWebhook: async () => {
    throw new NotImplementedError("Crypto payments");
  },
};
