"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { validateWalletForm, type WalletFormData, type SupportedChain, type SupportedCurrency } from '@/lib/forms';

export default function WalletForm() {
  const router = useRouter();
  const [formData, setFormData] = useState<WalletFormData>({
    walletAddress: '',
    blockchain: 'ethereum',
    currency: 'USD',
    email: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);
    
    // Validate form
    const validation = validateWalletForm(formData);
    if (!validation.valid) {
      setErrors(validation.errors);
      setIsLoading(false);
      return;
    }
    
    try {
      // Call the analyze API
      const response = await fetch('/api/wallet/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          walletAddress: formData.walletAddress,
          blockchain: formData.blockchain,
          currency: formData.currency,
          userId: 'temp-user-id' // In production, this would be the authenticated user ID
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to analyze wallet');
      }
      
      const result = await response.json();
      const analysisId = result.data.analysis.id;
      
      // Redirect to results page with the analysis ID
      router.push(`/results/${analysisId}`);
      
    } catch (error) {
      console.error('Analysis error:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Failed to analyze wallet');
      setIsLoading(false);
    }
  };

  const supportedChains: SupportedChain[] = ['ethereum', 'polygon', 'arbitrum', 'optimism', 'base'];
  const supportedCurrencies: SupportedCurrency[] = ['EUR', 'USD'];

  return (
    <form onSubmit={handleSubmit} className="max-w-md mx-auto space-y-6">
      <div>
        <label htmlFor="walletAddress" className="block text-sm font-medium text-gray-700 mb-1">
          Wallet Address
        </label>
        <input
          type="text"
          id="walletAddress"
          name="walletAddress"
          value={formData.walletAddress}
          onChange={handleChange}
          placeholder="0x..."
          className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.walletAddress ? 'border-red-500' : 'border-gray-300'}`}
        />
        {errors.walletAddress && (
          <p className="mt-1 text-sm text-red-600">{errors.walletAddress}</p>
        )}
      </div>

      <div>
        <label htmlFor="blockchain" className="block text-sm font-medium text-gray-700 mb-1">
          Blockchain
        </label>
        <select
          id="blockchain"
          name="blockchain"
          value={formData.blockchain}
          onChange={handleChange}
          className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.blockchain ? 'border-red-500' : 'border-gray-300'}`}
        >
          {supportedChains.map(chain => (
            <option key={chain} value={chain}>
              {chain.charAt(0).toUpperCase() + chain.slice(1)}
            </option>
          ))}
        </select>
        {errors.blockchain && (
          <p className="mt-1 text-sm text-red-600">{errors.blockchain}</p>
        )}
      </div>

      <div>
        <label htmlFor="currency" className="block text-sm font-medium text-gray-700 mb-1">
          Target Currency
        </label>
        <select
          id="currency"
          name="currency"
          value={formData.currency}
          onChange={handleChange}
          className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.currency ? 'border-red-500' : 'border-gray-300'}`}
        >
          {supportedCurrencies.map(curr => (
            <option key={curr} value={curr}>{curr}</option>
          ))}
        </select>
        {errors.currency && (
          <p className="mt-1 text-sm text-red-600">{errors.currency}</p>
        )}
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
          Email (for results access)
        </label>
        <input
          type="email"
          id="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          placeholder="your@email.com"
          className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.email ? 'border-red-500' : 'border-gray-300'}`}
        />
        {errors.email && (
          <p className="mt-1 text-sm text-red-600">{errors.email}</p>
        )}
      </div>

      {errorMessage && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-700">{errorMessage}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={isLoading}
        className={`w-full px-4 py-2 text-white font-medium rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${isLoading ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
      >
        {isLoading ? (
          <span className="flex items-center justify-center">
            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Analyzing...
          </span>
        ) : 'Analyze My Wallet'}
      </button>
    </form>
  );
}