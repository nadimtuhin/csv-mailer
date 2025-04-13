'use client';

import React, { useState, useEffect } from 'react';
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

export default function CampaignsListPage() {
  const [campaigns, setCampaigns] = useState<CampaignSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch campaigns on mount
  useEffect(() => {
    const fetchCampaigns = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/campaigns');
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to fetch campaigns');
        }
        const data = await response.json();
        setCampaigns(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
        console.error("Fetch campaigns error:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchCampaigns();
  }, []);

  // Function to manually trigger processing (for development/testing)
  const triggerProcessing = async (campaignId: string) => {
      // TODO: Add loading state per row or globally
      console.log(`Triggering processing for campaign ${campaignId}...`);
      try {
          const response = await fetch(`/api/campaigns/${campaignId}/process`, { method: 'POST' });
          const result = await response.json();
          if (!response.ok) {
              throw new Error(result.message || 'Failed to trigger processing');
          }
          alert(`Processing triggered for ${campaignId}: ${result.message}`);
          // Optionally refresh the list or update status locally
      } catch (err) {
          alert(`Error triggering processing: ${err instanceof Error ? err.message : 'Unknown error'}`);
          console.error("Trigger processing error:", err);
      }
  };


  return (
    <main className="flex min-h-screen flex-col items-center p-12 bg-gray-50">
      <div className="w-full max-w-6xl">
        <div className="mb-8 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-800">Campaigns</h1>
          <Link href="/" className="text-blue-600 hover:text-blue-800 hover:underline">
            &larr; Back to Mailer
          </Link>
        </div>

        {isLoading && <p>Loading campaigns...</p>}
        {error && <p className="text-red-600">Error loading campaigns: {error}</p>}

        {!isLoading && !error && (
          <div className="bg-white p-6 rounded-lg shadow overflow-x-auto">
            {campaigns.length === 0 ? (
              <p>No campaigns found.</p>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Progress</th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {campaigns.map((campaign) => {
                    const processed = campaign.sentCount + campaign.failedCount + campaign.skippedCount;
                    const progressPercent = campaign.totalRecipients > 0 ? (processed / campaign.totalRecipients) * 100 : 0;
                    return (
                      <tr key={campaign.id}>
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{campaign.name || campaign.id}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                           <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                               campaign.status === 'completed' ? 'bg-green-100 text-green-800' :
                               campaign.status === 'failed' ? 'bg-red-100 text-red-800' :
                               campaign.status === 'processing' ? 'bg-yellow-100 text-yellow-800' :
                               'bg-gray-100 text-gray-800' // pending, queued
                           }`}>
                             {campaign.status}
                           </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                           {processed} / {campaign.totalRecipients} ({progressPercent.toFixed(0)}%)
                           <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                             <div className="bg-blue-600 h-1.5 rounded-full" style={{ width: `${progressPercent}%` }}></div>
                           </div>
                           <span className="text-xs text-green-600">S: {campaign.sentCount}</span>, <span className="text-xs text-red-600">F: {campaign.failedCount}</span>, <span className="text-xs text-gray-500">K: {campaign.skippedCount}</span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{format(new Date(campaign.createdAt), 'PPpp')}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium space-x-2">
                          <Link href={`/campaigns/${campaign.id}`} className="text-indigo-600 hover:text-indigo-900">Details</Link>
                          {/* Add manual trigger button */}
                          {(campaign.status === 'queued' || campaign.status === 'pending') && (
                              <button onClick={() => triggerProcessing(campaign.id)} className="text-green-600 hover:text-green-900">Process</button>
                          )}
                           {/* TODO: Add Retry button */}
                           {/* {campaign.failedCount > 0 && campaign.status !== 'processing' && ( ... )} */}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
