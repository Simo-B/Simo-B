import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { validateEnvVars } from '@/lib/env';

export async function POST(request: NextRequest) {
  try {
    validateEnvVars();
    const { walletAddress, blockchain, currency, userId } = await request.json();

    if (!walletAddress || !blockchain || !currency || !userId) {
      return NextResponse.json(
        { error: 'Wallet address, blockchain, currency, and userId are required' },
        { status: 400 }
      );
    }

    const { data: analysis, error: analysisError } = await supabase
      .from('analyses')
      .insert({
        user_id: userId,
        wallet_address: walletAddress,
        blockchain,
        currency,
        last_fetch: new Date().toISOString(),
      })
      .select()
      .single();

    if (analysisError) {
      return NextResponse.json(
        { error: analysisError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: analysis }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    validateEnvVars();
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    const { data: analyses, error } = await supabase
      .from('analyses')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: analyses }, { status: 200 });
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
