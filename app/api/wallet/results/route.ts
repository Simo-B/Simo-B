import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { validateEnvVars } from '@/lib/env';
import { ConversionEvent } from '@/lib/types';
import { simulateDisciplineRule } from '@/lib/disciplineRule';
import { calculateCostSavings } from '@/lib/costCalculator';
import { calculateDisciplineScore } from '@/lib/disciplineScore';
import { generateRecommendation } from '@/lib/recommendation';

/**
 * Fetch analysis record by ID
 */
async function fetchAnalysis(analysisId: string) {
  const { data, error } = await supabase
    .from('analyses')
    .select('*')
    .eq('id', analysisId)
    .single();
  
  if (error) {
    throw new Error(error.message);
  }
  
  return data;
}

/**
 * Fetch existing transfers for the wallet (simulated from analysis)
 * In production, this would fetch from Alchemy or database cache
 */
async function fetchTransfersForAnalysis(
  walletAddress: string,
  blockchain: string
): Promise<ConversionEvent[]> {
  // This is a simplified version - in production, you'd fetch from Alchemy
  // or use a cached version stored with the analysis
  // For now, we return an empty array if no cached transfers exist
  
  // Check if there's a transfers table or cached data
  const { data: cachedData } = await supabase
    .from('analysis_cache')
    .select('transfers')
    .eq('wallet_address', walletAddress)
    .eq('blockchain', blockchain)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  
  if (cachedData?.transfers) {
    return cachedData.transfers as ConversionEvent[];
  }
  
  return [];
}

/**
 * POST /api/wallet/results
 * Calculate and store discipline rule analysis results
 */
export async function POST(request: NextRequest) {
  try {
    validateEnvVars();
    
    const { analysisId, walletBalance, targetCurrency = 'USD' } = await request.json();
    
    // Validate required fields
    if (!analysisId) {
      return NextResponse.json(
        { error: 'analysisId is required' },
        { status: 400 }
      );
    }
    
    if (!walletBalance || walletBalance <= 0) {
      return NextResponse.json(
        { error: 'Valid walletBalance is required' },
        { status: 400 }
      );
    }
    
    // Fetch the analysis record
    let analysis;
    try {
      analysis = await fetchAnalysis(analysisId);
    } catch {
      return NextResponse.json(
        { error: 'Analysis not found. Please verify the analysisId is correct.' },
        { status: 404 }
      );
    }
    
    // Fetch conversion history
    const conversions = await fetchTransfersForAnalysis(
      analysis.wallet_address,
      analysis.blockchain
    );
    
    // Need at least 2 conversions for meaningful analysis
    if (conversions.length < 2) {
      return NextResponse.json(
        { error: 'Insufficient conversion data. At least 2 conversions are required to calculate results.' },
        { status: 400 }
      );
    }
    
    // Run discipline rule simulation
    const simulation = simulateDisciplineRule(
      conversions,
      walletBalance,
      targetCurrency
    );
    
    // Calculate cost/savings
    const costResult = calculateCostSavings(
      conversions,
      walletBalance,
      targetCurrency
    );
    
    // Calculate discipline score
    const scoreResult = calculateDisciplineScore(conversions);
    
    // Generate recommendation
    const recommendationResult = generateRecommendation(costResult, scoreResult);
    
    // Store results in analysis_results table
    const { data: resultRecord, error: insertError } = await supabase
      .from('analysis_results')
      .insert({
        analysis_id: analysisId,
        cost_saved_or_lost: costResult.costOrSavedAmount,
        discipline_score: scoreResult.score,
        recommendation: recommendationResult.recommendation,
        preview_visible: true,
      })
      .select()
      .single();
    
    if (insertError) {
      console.error('Failed to store results:', insertError);
      return NextResponse.json(
        { error: 'Failed to store analysis results' },
        { status: 500 }
      );
    }
    
    // Return comprehensive results
    return NextResponse.json({
      data: {
        analysisId,
        costOrSavedAmount: costResult.costOrSavedAmount,
        currency: costResult.currency,
        costType: costResult.costType,
        disciplineScore: scoreResult.score,
        scoreExplanation: scoreResult.explanation,
        scoreComponents: scoreResult.components,
        recommendation: recommendationResult.recommendation,
        simulationDetails: {
          conversionPercentage: simulation.conversionPercentage,
          targetDayOfMonth: simulation.targetDayOfMonth,
          simulatedConversionCount: simulation.simulatedConversions.length,
          actualConversionCount: conversions.length,
        },
        resultId: resultRecord.id,
      },
    }, { status: 201 });
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Results calculation error:', errorMessage);
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/wallet/results
 * Fetch results for a specific analysis
 */
export async function GET(request: NextRequest) {
  try {
    validateEnvVars();
    
    const searchParams = request.nextUrl.searchParams;
    const analysisId = searchParams.get('analysisId');
    
    if (!analysisId) {
      return NextResponse.json(
        { error: 'analysisId is required' },
        { status: 400 }
      );
    }
    
    // Fetch analysis to verify ownership
    const { data: analysis, error: analysisError } = await supabase
      .from('analyses')
      .select('user_id')
      .eq('id', analysisId)
      .single();
    
    if (analysisError || !analysis) {
      return NextResponse.json(
        { error: 'Analysis not found' },
        { status: 404 }
      );
    }
    
    // Fetch results
    const { data: results, error: resultsError } = await supabase
      .from('analysis_results')
      .select('*')
      .eq('analysis_id', analysisId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    if (resultsError || !results) {
      return NextResponse.json(
        { error: 'No results found for this analysis' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      data: {
        analysisId,
        costOrSavedAmount: results.cost_saved_or_lost,
        disciplineScore: results.discipline_score,
        recommendation: results.recommendation,
        createdAt: results.created_at,
        previewVisible: results.preview_visible,
      },
    }, { status: 200 });
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Results fetch error:', errorMessage);
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
