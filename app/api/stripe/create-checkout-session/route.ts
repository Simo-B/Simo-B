import { NextRequest, NextResponse } from 'next/server';
import { createCheckoutSession } from '@/lib/stripe';

export async function POST(req: NextRequest) {
  try {
    const { analysisId, planType, email } = await req.json();

    if (!analysisId) {
      return NextResponse.json({ error: 'analysisId is required' }, { status: 400 });
    }

    if (!planType || !['monthly', 'yearly'].includes(planType)) {
      return NextResponse.json({ error: 'Invalid planType' }, { status: 400 });
    }

    if (!email) {
      return NextResponse.json({ error: 'email is required' }, { status: 400 });
    }

    const origin = req.headers.get('origin') || new URL(req.url).origin;
    const successUrl = `${origin}/results/${analysisId}?success=true`;
    const cancelUrl = `${origin}/results/${analysisId}?canceled=true`;

    const session = await createCheckoutSession({
      analysisId,
      planType,
      email,
      successUrl,
      cancelUrl,
    });

    if (!session.url) {
      return NextResponse.json({ error: 'Failed to create checkout session URL' }, { status: 500 });
    }

    return NextResponse.json({ sessionUrl: session.url });
  } catch (error: any) {
    console.error('Error creating checkout session:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
