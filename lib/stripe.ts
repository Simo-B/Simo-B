import Stripe from 'stripe';

import { getRequiredEnvVar } from './env';

const STRIPE_API_VERSION: Stripe.LatestApiVersion = '2025-12-15.clover';

let cachedStripeClient: Stripe | null = null;

export function getStripeClient(): Stripe {
  if (cachedStripeClient) {
    return cachedStripeClient;
  }

  const secretKey = getRequiredEnvVar('STRIPE_SECRET_KEY');

  cachedStripeClient = new Stripe(secretKey, {
    apiVersion: STRIPE_API_VERSION,
    typescript: true,
  });

  return cachedStripeClient;
}

export function getStripeWebhookSecret(): string {
  return getRequiredEnvVar('STRIPE_WEBHOOK_SECRET');
}
