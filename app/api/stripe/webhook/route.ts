import { NextRequest, NextResponse } from 'next/server';
import type Stripe from 'stripe';

import { validateEnvVars } from '@/lib/env';
import { getStripeClient, getStripeWebhookSecret } from '@/lib/stripe';
import { getSupabaseAdminClient } from '@/lib/supabase';

export const runtime = 'nodejs';

type SubscriptionStatus = 'free' | 'premium' | 'pro';

async function updateSubscriptionStatus(userId: string, subscriptionStatus: SubscriptionStatus) {
  const admin = getSupabaseAdminClient();

  const { error } = await admin
    .from('users')
    .update({ subscription_status: subscriptionStatus })
    .eq('id', userId);

  if (error) {
    throw new Error(`Failed to update subscription status: ${error.message}`);
  }
}

function getUserIdFromCheckoutSession(session: Stripe.Checkout.Session): string | null {
  if (typeof session.client_reference_id === 'string' && session.client_reference_id.length > 0) {
    return session.client_reference_id;
  }

  if (session.metadata && typeof session.metadata.userId === 'string' && session.metadata.userId.length > 0) {
    return session.metadata.userId;
  }

  return null;
}

function getUserIdFromSubscription(subscription: Stripe.Subscription): string | null {
  if (
    subscription.metadata &&
    typeof subscription.metadata.userId === 'string' &&
    subscription.metadata.userId.length > 0
  ) {
    return subscription.metadata.userId;
  }

  return null;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    validateEnvVars();

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        {
          error:
            'SUPABASE_SERVICE_ROLE_KEY is not configured. It is required for Stripe webhook handlers to update database records.',
        },
        { status: 500 }
      );
    }

    const stripe = getStripeClient();
    const webhookSecret = getStripeWebhookSecret();

    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
    }

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Invalid signature';
      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = getUserIdFromCheckoutSession(session);

      if (userId) {
        await updateSubscriptionStatus(userId, 'premium');
      }
    }

    if (event.type === 'customer.subscription.updated') {
      const subscription = event.data.object as Stripe.Subscription;
      const userId = getUserIdFromSubscription(subscription);

      if (userId) {
        const nextStatus: SubscriptionStatus =
          subscription.status === 'active' || subscription.status === 'trialing' ? 'premium' : 'free';

        await updateSubscriptionStatus(userId, nextStatus);
      }
    }

    if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object as Stripe.Subscription;
      const userId = getUserIdFromSubscription(subscription);

      if (userId) {
        await updateSubscriptionStatus(userId, 'free');
      }
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
