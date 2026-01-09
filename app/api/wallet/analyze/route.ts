import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { validateEnvVars } from '@/lib/env';
import { 
  fetchStablecoinTransfers, 
  isSupportedChain, 
  validateWalletAddress,
  type SupportedChain 
} from '@/lib/alchemy';
import { analyzeTransfers } from '@/lib/analysis';

export async function POST(request: NextRequest) {
  try {
    validateEnvVars();
    
    // Validate Alchemy API key
    if (!process.env.ALCHEMY_API_KEY) {
      return NextResponse.json(
        { error: 'Alchemy API key is not configured' },
        { status: 500 }
      );
    }

    const { walletAddress, blockchain, currency, userId } = await request.json();

    // Validate required fields
    if (!walletAddress || !blockchain || !currency || !userId) {
      return NextResponse.json(
        { error: 'Wallet address, blockchain, currency, and userId are required' },
        { status: 400 }
      );
    }

    // Validate wallet address format
    if (!validateWalletAddress(walletAddress)) {
      return NextResponse.json(
        { error: 'Invalid wallet address format. Please provide a valid Ethereum address.' },
        { status: 400 }
      );
    }

    // Validate blockchain support
    if (!isSupportedChain(blockchain)) {
      return NextResponse.json(
        { 
          error: `Unsupported blockchain: ${blockchain}. Supported chains are: ethereum, polygon, arbitrum, optimism, base` 
        },
        { status: 400 }
      );
    }

    // Fetch stablecoin transfers from Alchemy
    let transfers;
    try {
      transfers = await fetchStablecoinTransfers(walletAddress, blockchain as SupportedChain);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Handle rate limiting gracefully
      if (errorMessage.includes('rate limit') || errorMessage.includes('429')) {
        return NextResponse.json(
          { error: 'Rate limit exceeded. Please try again in a few moments.' },
          { status: 429 }
        );
      }

      // Handle other Alchemy errors
      return NextResponse.json(
        { error: `Failed to fetch wallet data: ${errorMessage}` },
        { status: 500 }
      );
    }

    // Analyze the transfers to detect conversion patterns
    const analysisData = analyzeTransfers(transfers, walletAddress);

    // Store analysis record in database
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
        { error: `Database error: ${analysisError.message}` },
        { status: 500 }
      );
    }

    // Return comprehensive analysis data
    return NextResponse.json({ 
      data: {
        analysis,
        transferCount: transfers.length,
        conversions: analysisData.conversions,
        totalConversions: analysisData.totalConversions,
        frequency: analysisData.frequency,
        averageAmount: analysisData.averageAmount,
        totalVolume: analysisData.totalVolume,
        averageDaysBetweenConversions: analysisData.averageDaysBetweenConversions,
        firstConversionDate: analysisData.firstConversionDate,
        lastConversionDate: analysisData.lastConversionDate,
      }
    }, { status: 201 });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Analysis error:', errorMessage);
    
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
