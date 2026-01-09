import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  console.warn('STRIPE_SECRET_KEY is missing');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-01-27.acacia' as any,
});

export interface SubscriptionData {
  status: 'active' | 'inactive' | null;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
}

/**
 * Create a Stripe Checkout session for a subscription
 */
export async function createCheckoutSession({
  analysisId,
  planType,
  email,
  successUrl,
  cancelUrl,
}: {
  analysisId: string;
  planType: 'monthly' | 'yearly';
  email: string;
  successUrl: string;
  cancelUrl: string;
}) {
  const amount = planType === 'monthly' ? 2900 : 29000;
  const interval = planType === 'monthly' ? 'month' : 'year';

  const session = await stripe.checkout.sessions.create({
    customer_email: email,
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: 'eur',
          product_data: {
            name: `Discipline Rule - ${planType.charAt(0).toUpperCase() + planType.slice(1)} Plan`,
            description: planType === 'monthly' ? 'Full access to your analysis results' : 'Full access to your analysis results for a year (save 33%)',
          },
          unit_amount: amount,
          recurring: {
            interval: interval as Stripe.Checkout.SessionCreateParams.LineItem.PriceData.Recurring.Interval,
          },
        },
        quantity: 1,
      },
    ],
    mode: 'subscription',
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      analysisId,
      planType,
    },
  });

  return session;
}

/**
 * Verify a subscription status from Stripe
 */
export async function verifySubscription(subscriptionId: string): Promise<Stripe.Subscription> {
  return await stripe.subscriptions.retrieve(subscriptionId);
}

/**
 * Get subscription status for a user from the database
 * Note: This depends on the database schema being updated
 */
export async function getSubscriptionStatus(supabase: any, userId: string): Promise<SubscriptionData> {
  const { data, error } = await supabase
    .from('users')
    .select('subscription_status, stripe_customer_id, stripe_subscription_id')
    .eq('id', userId)
    .single();

  if (error || !data) {
    return { status: null };
  }

  return {
    status: data.subscription_status as 'active' | 'inactive' | null,
    stripeCustomerId: data.stripe_customer_id,
    stripeSubscriptionId: data.stripe_subscription_id,
  };
}
