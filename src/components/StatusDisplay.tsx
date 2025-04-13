'use client';

import React from 'react';
import Link from 'next/link';

// Type for the result prop passed from the Home page
interface CampaignResult {
    type: 'success' | 'error';
    message: string;
    campaignId?: string;
}

interface StatusDisplayProps {
  result: CampaignResult | null;
}

export default function StatusDisplay({ result }: StatusDisplayProps) {

  if (!result) {
    return <p className="text-sm text-gray-500">Submit the form above to create a campaign.</p>;
  }

  return (
    <div className={`p-4 rounded-md ${result.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
        <p className="font-medium">
            {result.type === 'success' ? 'Campaign Created Successfully!' : 'Campaign Creation Failed'}
        </p>
        <p className="text-sm mt-1">{result.message}</p>
        {result.type === 'success' && result.campaignId && (
            <p className="text-sm mt-2">
                <Link href={`/campaigns/${result.campaignId}`} className="text-blue-600 hover:text-blue-800 hover:underline font-medium">
                    View Campaign Details &rarr;
                </Link>
            </p>
        )}
    </div>
  );
}
