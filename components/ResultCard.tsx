"use client";

import { useRouter } from 'next/navigation';

interface ResultCardProps {
  costOrSavedAmount: number;
  currency: string;
  costType: 'saved' | 'lost';
  disciplineScore: number;
  recommendation: string;
  isLoading: boolean;
  error: string | null;
}

export default function ResultCard({
  costOrSavedAmount,
  currency,
  costType,
  disciplineScore,
  recommendation,
  isLoading,
  error
}: ResultCardProps) {
  const router = useRouter();

  const handleBack = () => {
    router.push('/');
  };

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-md overflow-hidden p-8 text-center">
        <div className="flex items-center justify-center h-32">
          <svg className="animate-spin h-8 w-8 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
        <p className="text-gray-600 mt-4">Loading your results...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-md overflow-hidden p-8">
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
        <button
          onClick={handleBack}
          className="w-full px-4 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Back to analyze another wallet
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-md overflow-hidden p-8">
      {/* Hero Metric */}
      <div className="text-center mb-8">
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">
          Last month, your decisions
        </h2>
        <div className="mb-4">
          <span className="text-5xl font-bold text-gray-900">
            {currency === 'USD' ? '$' : '€'}{Math.abs(costOrSavedAmount).toFixed(2)}
          </span>
        </div>
        <div className={`text-xl font-medium ${costType === 'saved' ? 'text-green-600' : 'text-red-600'}`}>
          {costType === 'saved' ? 'saved' : 'cost'} you
        </div>
      </div>

      {/* Discipline Score */}
      <div className="text-center mb-8">
        <h3 className="text-xl font-semibold text-gray-800 mb-2">Discipline Score</h3>
        <div className="text-4xl font-bold text-gray-900 mb-2">
          {disciplineScore}/100
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <div
            className="bg-blue-600 h-2.5 rounded-full"
            style={{ width: `${disciplineScore}%` }}
          ></div>
        </div>
      </div>

      {/* Recommendation */}
      <div className="bg-gray-50 p-4 rounded-lg mb-8">
        <h4 className="text-lg font-medium text-gray-800 mb-2">Recommendation</h4>
        <p className="text-gray-600">{recommendation}</p>
      </div>

      {/* Back Button */}
      <button
        onClick={handleBack}
        className="w-full px-4 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
      >
        Back to analyze another wallet
      </button>
    </div>
  );
}