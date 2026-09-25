import { cryptoProvider } from "./providers/crypto";
import { paystackProvider } from "./providers/paystack";
import type { PaymentProvider, ProviderId } from "./types";

const PROVIDERS: Record<ProviderId, PaymentProvider> = {
  paystack: paystackProvider,
  crypto: cryptoProvider,
};

export function getProvider(id: ProviderId): PaymentProvider {
  return PROVIDERS[id];
}

/** Providers the customer can choose at checkout (payment method radio shows only if > 1). */
export function getEnabledProviders(): PaymentProvider[] {
  return Object.values(PROVIDERS).filter((p) => p.isEnabled());
}

export function isProviderId(id: string): id is ProviderId {
  return id in PROVIDERS;
}

export type { PaymentProvider, ProviderId } from "./types";
