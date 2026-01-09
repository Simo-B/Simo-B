"use client";

import { useEffect, useState, use } from 'react';
import ResultCard from '@/components/ResultCard';
import Disclaimer from '@/components/Disclaimer';
import PaywallCTA from '@/components/PaywallCTA';
import Link from 'next/link';

interface ResultData {
  costOrSavedAmount: number;
  disciplineScore: number;
  recommendation: string;
  previewVisible: boolean;
  email: string;
  subscriptionStatus: string | null;
}

export default function ResultsPage({ params }: { params: Promise<{ analysisId: string }> }) {
  const { analysisId } = use(params);
  const [resultData, setResultData] = useState<ResultData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchResults = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Check if results exist first
        const getResponse = await fetch(`/api/wallet/results?analysisId=${analysisId}`);
        
        if (getResponse.ok) {
          const existingResults = await getResponse.json();
          setResultData({
            costOrSavedAmount: existingResults.data.costOrSavedAmount,
            disciplineScore: existingResults.data.disciplineScore,
            recommendation: existingResults.data.recommendation,
            previewVisible: existingResults.data.previewVisible,
            email: existingResults.data.email,
            subscriptionStatus: existingResults.data.subscriptionStatus
          });
          setIsLoading(false);
          return;
        }

        // Calculate and store results by calling the POST endpoint
        const calculateResponse = await fetch('/api/wallet/results', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            analysisId: analysisId,
            walletBalance: 10000, // This would come from the user's wallet in production
            targetCurrency: 'USD' // This would come from the analysis data
          })
        });
        
        if (!calculateResponse.ok) {
          const errorData = await calculateResponse.json();
          throw new Error(errorData.error || 'Failed to calculate results');
        }
        
        // After calculation, fetch again to get all fields including email
        const refreshResponse = await fetch(`/api/wallet/results?analysisId=${analysisId}`);
        const refreshedData = await refreshResponse.json();

        setResultData({
          costOrSavedAmount: refreshedData.data.costOrSavedAmount,
          disciplineScore: refreshedData.data.disciplineScore,
          recommendation: refreshedData.data.recommendation,
          previewVisible: refreshedData.data.previewVisible,
          email: refreshedData.data.email,
          subscriptionStatus: refreshedData.data.subscriptionStatus
        });
        
      } catch (err) {
        console.error('Error fetching results:', err);
        setError(err instanceof Error ? err.message : 'Failed to load results');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchResults();
  }, [analysisId]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 bg-gray-50">
      <div className="w-full max-w-2xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">
            Your Wallet Analysis Results
          </h1>
          {resultData?.subscriptionStatus === 'active' && (
            <Link 
              href={`/api/stripe/customer-portal?email=${resultData.email}`} 
              className="text-sm text-blue-600 hover:underline font-medium"
            >
              Manage Subscription
            </Link>
          )}
        </div>

        {resultData && (
          <>
            <ResultCard
              costOrSavedAmount={resultData.costOrSavedAmount}
              currency="USD"
              costType={resultData.costOrSavedAmount >= 0 ? 'saved' : 'lost'}
              disciplineScore={resultData.disciplineScore}
              recommendation={resultData.recommendation}
              isLoading={isLoading}
              error={error}
              previewVisible={resultData.previewVisible}
            />
            {!resultData.previewVisible && (
              <PaywallCTA analysisId={analysisId} email={resultData.email} />
            )}
          </>
        )}

        {isLoading && !resultData && (
          <ResultCard
            costOrSavedAmount={0}
            currency="USD"
            costType="saved"
            disciplineScore={0}
            recommendation=""
            isLoading={true}
            error={null}
          />
        )}

        {error && !resultData && (
          <ResultCard
            costOrSavedAmount={0}
            currency="USD"
            costType="saved"
            disciplineScore={0}
            recommendation=""
            isLoading={false}
            error={error}
          />
        )}

        <div className="mt-8">
          <Disclaimer />
        </div>
      </div>
    </main>
  );
}
