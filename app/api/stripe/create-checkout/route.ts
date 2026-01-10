import { NextRequest, NextResponse } from 'next/server';

import { getStripeClient } from '@/lib/stripe';

export const runtime = 'nodejs';

type CreateCheckoutRequestBody = {
  userId: string;
  priceId: string;
};

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = (await request.json()) as Partial<CreateCheckoutRequestBody>;
    const userId = typeof body.userId === 'string' ? body.userId : null;
    const priceId = typeof body.priceId === 'string' ? body.priceId : null;

    if (!userId || !priceId) {
      return NextResponse.json(
        { error: 'userId and priceId are required' },
        { status: 400 }
      );
    }

    const stripe = getStripeClient();
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${request.nextUrl.origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${request.nextUrl.origin}/cancel`,
      client_reference_id: userId,
      metadata: {
        userId,
      },
      subscription_data: {
        metadata: {
          userId,
        },
      },
    });

    return NextResponse.json({ sessionId: session.id }, { status: 200 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
