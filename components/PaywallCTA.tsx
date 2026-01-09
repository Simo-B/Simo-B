"use client";

import { useState } from 'react';

interface PaywallCTAProps {
  analysisId: string;
  email: string;
}

export default function PaywallCTA({ analysisId, email }: PaywallCTAProps) {
  const [loading, setLoading] = useState<string | null>(null);

  const handleSubscribe = async (planType: 'monthly' | 'yearly') => {
    setLoading(planType);
    try {
      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          analysisId,
          planType,
          email,
        }),
      });

      const data = await response.json();

      if (data.sessionUrl) {
        window.location.href = data.sessionUrl;
      } else {
        alert(data.error || 'Failed to create checkout session');
        setLoading(null);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('An error occurred. Please try again.');
      setLoading(null);
    }
  };

  return (
    <div id="pricing" className="mt-8 border-t pt-8">
      <div className="text-center mb-6">
        <h3 className="text-2xl font-bold text-gray-900">Unlock your full analysis</h3>
        <p className="text-gray-600 mt-2">Choose a plan to see your full potential savings and detailed insights.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Monthly Plan */}
        <div className="border rounded-xl p-6 bg-white shadow-sm flex flex-col justify-between">
          <div>
            <h4 className="text-lg font-semibold text-gray-800">Monthly Plan</h4>
            <p className="text-3xl font-bold text-gray-900 mt-2">€29<span className="text-sm font-normal text-gray-500">/month</span></p>
            <ul className="mt-4 space-y-2 text-sm text-gray-600">
              <li className="flex items-center">
                <svg className="h-4 w-4 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="5 13l4 4L19 7"></path>
                </svg>
                Full analysis results
              </li>
              <li className="flex items-center">
                <svg className="h-4 w-4 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="5 13l4 4L19 7"></path>
                </svg>
                Monthly updates
              </li>
            </ul>
          </div>
          <button
            onClick={() => handleSubscribe('monthly')}
            disabled={!!loading}
            className="mt-6 w-full py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {loading === 'monthly' ? 'Loading...' : 'Subscribe Monthly'}
          </button>
        </div>

        {/* Yearly Plan */}
        <div className="border-2 border-blue-500 rounded-xl p-6 bg-blue-50 shadow-md relative flex flex-col justify-between">
          <div className="absolute top-0 right-0 transform translate-x-1/4 -translate-y-1/2">
            <span className="bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full uppercase">
              Save 33%
            </span>
          </div>
          <div>
            <h4 className="text-lg font-semibold text-gray-800">Yearly Plan</h4>
            <p className="text-3xl font-bold text-gray-900 mt-2">€290<span className="text-sm font-normal text-gray-500">/year</span></p>
            <p className="text-sm text-blue-600 font-medium">Best Value</p>
            <ul className="mt-4 space-y-2 text-sm text-gray-600">
              <li className="flex items-center">
                <svg className="h-4 w-4 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="5 13l4 4L19 7"></path>
                </svg>
                Everything in Monthly
              </li>
              <li className="flex items-center">
                <svg className="h-4 w-4 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="5 13l4 4L19 7"></path>
                </svg>
                2 months free
              </li>
            </ul>
          </div>
          <button
            onClick={() => handleSubscribe('yearly')}
            disabled={!!loading}
            className="mt-6 w-full py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {loading === 'yearly' ? 'Loading...' : 'Subscribe Yearly'}
          </button>
        </div>
      </div>
    </div>
  );
}
