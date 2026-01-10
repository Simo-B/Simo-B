import { NextRequest, NextResponse } from 'next/server';
import type Stripe from 'stripe';

import { validateEnvVars } from '@/lib/env';
import { getStripeClient, getStripeWebhookSecret } from '@/lib/stripe';
import { supabase } from '@/lib/supabase';

export const runtime = 'nodejs';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    validateEnvVars();

    const stripe = getStripeClient();
    const webhookSecret = getStripeWebhookSecret();

    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      return NextResponse.json(
        { error: 'Missing stripe-signature header' },
        { status: 400 }
      );
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
      const userId = session.client_reference_id;

      if (userId) {
        const { error } = await supabase
          .from('users')
          .update({ subscription_status: 'premium' })
          .eq('id', userId);

        if (error) {
          return NextResponse.json(
            { error: 'Failed to update subscription status' },
            { status: 500 }
          );
        }
      }
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
