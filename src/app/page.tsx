'use client'; // Make it a client component to fetch data

import React, { useState, useEffect, useCallback } from 'react'; // Import hooks
import Link from 'next/link';
import { format } from 'date-fns'; // For formatting dates

// Define Campaign Summary type (matching API response)
interface CampaignSummary {
  id: string;
  name: string | null;
  status: string;
  totalRecipients: number;
  sentCount: number;
  failedCount: number;
  skippedCount: number;
  createdAt: string;
  updatedAt: string;
}

export default function Home() {
  const [campaigns, setCampaigns] = useState<CampaignSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch campaigns function
  const fetchCampaigns = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Fetch only a few recent campaigns (adjust limit as needed)
      const response = await fetch('/api/campaigns?limit=5'); // Assuming API supports limit, otherwise fetch all and slice
      if (!response.ok) {
        const errorData = await response.json();
         throw new Error(errorData.message || 'Failed to fetch campaigns');
       }
       const data = await response.json(); // Use const instead of let
       // If API doesn't support limit, slice here: data = data.slice(0, 5);
       setCampaigns(data);
     } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      console.error("Fetch campaigns error:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch on mount
  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  return (
    <main className="flex flex-col items-center p-6 bg-gray-50 min-h-screen"> {/* Added min-h-screen back */}
      <div className="w-full max-w-4xl"> {/* Increased max-width */}
        {/* Welcome Section */}
        <div className="text-center mb-12"> {/* Added margin bottom */}
          <h1 className="text-4xl font-bold mb-6 text-gray-800">Welcome to CSV Mailer</h1>
          <p className="text-lg text-gray-600 mb-8">
            Create and manage email campaigns based on CSV data.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
           <Link
             href="/campaigns/new"
             className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-md shadow hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
           >
             Create New Campaign
           </Link>
           <Link
             href="/campaigns"
             className="px-6 py-3 bg-gray-200 text-gray-700 font-semibold rounded-md shadow hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
           >
             View Campaigns
           </Link>
           <Link
             href="/templates"
             className="px-6 py-3 bg-gray-200 text-gray-700 font-semibold rounded-md shadow hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
           >
            Manage Templates
          </Link>
          </div>
        </div>

        {/* Recent Campaigns Section */}
        <div className="mt-10 w-full">
          <h2 className="text-2xl font-semibold mb-4 text-gray-700">Recent Campaigns</h2>
          {isLoading && <p>Loading recent campaigns...</p>}
          {error && <p className="text-red-600">Error: {error}</p>}
          {!isLoading && !error && (
            <div className="bg-white p-4 rounded-lg shadow">
              {campaigns.length === 0 ? (
                <p className="text-gray-600">No recent campaigns found.</p>
              ) : (
                <ul className="divide-y divide-gray-200">
                  {campaigns.map((campaign) => (
                    <li key={campaign.id} className="py-3 flex justify-between items-center">
                      <div>
                        <Link href={`/campaigns/${campaign.id}`} className="text-indigo-600 hover:text-indigo-800 font-medium">
                          {campaign.name || campaign.id}
                        </Link>
                        <p className="text-sm text-gray-500">
                          Status: <span className={`font-medium ${
                            campaign.status === 'completed' ? 'text-green-600' :
                            campaign.status === 'failed' ? 'text-red-600' :
                            campaign.status === 'processing' ? 'text-yellow-600' :
                            'text-gray-600'
                          }`}>{campaign.status}</span>
                          {' '}| Created: {format(new Date(campaign.createdAt), 'PP')}
                        </p>
                      </div>
                      <Link href={`/campaigns/${campaign.id}`} className="text-sm text-blue-500 hover:underline">
                        View Details
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
              {campaigns.length > 0 && (
                 <div className="mt-4 text-center">
                    <Link href="/campaigns" className="text-blue-600 hover:underline">
                      View All Campaigns &rarr;
                    </Link>
                 </div>
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
