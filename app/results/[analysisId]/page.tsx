"use client";

import { useEffect, useState } from 'react';
import ResultCard from '@/components/ResultCard';
import Disclaimer from '@/components/Disclaimer';

interface ResultData {
  costOrSavedAmount: number;
  disciplineScore: number;
  recommendation: string;
}

export default function ResultsPage({ params }: { params: { analysisId: string } }) {
  const [resultData, setResultData] = useState<ResultData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchResults = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Calculate and store results by calling the POST endpoint
        const calculateResponse = await fetch('/api/wallet/results', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            analysisId: params.analysisId,
            walletBalance: 10000, // This would come from the user's wallet in production
            targetCurrency: 'USD' // This would come from the analysis data
          })
        });
        
        if (!calculateResponse.ok) {
          const errorData = await calculateResponse.json();
          throw new Error(errorData.error || 'Failed to calculate results');
        }
        
        const calculationResult = await calculateResponse.json();
        
        // Use the results from the POST response directly
        setResultData({
          costOrSavedAmount: calculationResult.data.costOrSavedAmount,
          disciplineScore: calculationResult.data.disciplineScore,
          recommendation: calculationResult.data.recommendation
        });
        
      } catch (err) {
        console.error('Error fetching results:', err);
        setError(err instanceof Error ? err.message : 'Failed to load results');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchResults();
  }, [params.analysisId]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 bg-gray-50">
      <div className="w-full max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-8 text-center">
          Your Wallet Analysis Results
        </h1>

        {resultData && (
          <ResultCard
            costOrSavedAmount={resultData.costOrSavedAmount}
            currency="USD"
            costType={resultData.costOrSavedAmount >= 0 ? 'saved' : 'lost'}
            disciplineScore={resultData.disciplineScore}
            recommendation={resultData.recommendation}
            isLoading={isLoading}
            error={error}
          />
        )}

        {!resultData && !isLoading && !error && (
          <ResultCard
            costOrSavedAmount={0}
            currency="USD"
            costType="saved"
            disciplineScore={0}
            recommendation=""
            isLoading={isLoading}
            error={error}
          />
        )}

        <Disclaimer />
      </div>
    </main>
  );
}