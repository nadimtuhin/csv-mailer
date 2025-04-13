'use client'; // This component handles client-side logic

import React, { useState, useEffect, useCallback } from 'react'; // Import useCallback
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
  scheduledAt?: string | null; // Add optional scheduledAt
}

export default function CampaignsListPageClient() {
  const [campaigns, setCampaigns] = useState<CampaignSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isArchiving, setIsArchiving] = useState<string | null>(null); // State for archiving status
  const [archiveError, setArchiveError] = useState<string | null>(null); // State for archiving error
  const [isProcessing, setIsProcessing] = useState<string | null>(null); // Track processing/retry status
  const [processError, setProcessError] = useState<string | null>(null); // Track processing/retry error

  // Define fetchCampaigns using useCallback
  const fetchCampaigns = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setArchiveError(null); // Clear archive error on fetch
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
  }, []); // Empty dependency array as it doesn't depend on props/state

  // Fetch campaigns on mount
  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]); // Add fetchCampaigns to dependency array

  // Function to archive a campaign
  const handleArchiveCampaign = async (campaignId: string) => {
    if (!window.confirm('Are you sure you want to archive this campaign?')) {
      return;
    }
    setIsArchiving(campaignId);
    setArchiveError(null);
    setError(null); // Clear general errors

    try {
      const response = await fetch(`/api/campaigns/${campaignId}`, {
        method: 'PATCH',
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to archive campaign');
      }
      // Refresh the list to remove the archived campaign
      await fetchCampaigns(); // Re-use the fetch function
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An unknown error occurred during archiving.';
      setArchiveError(message);
      console.error("Archive campaign error:", err);
    } finally {
      setIsArchiving(null);
    }
  };

  // Function to trigger processing (initial run or retry)
  const triggerProcessing = async (campaignId: string, retry: boolean = false) => {
      setIsProcessing(campaignId); // Set loading state for this campaign
      setProcessError(null); // Clear previous errors
      setError(null); // Clear general errors
      console.log(`${retry ? 'Retrying failed for' : 'Triggering processing for'} campaign ${campaignId}...`);

      try {
          const response = await fetch(`/api/campaigns/${campaignId}/process`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ retryFailed: retry }), // Send retry flag
          });
          const result = await response.json();
          if (!response.ok) {
              throw new Error(result.message || `Failed to ${retry ? 'retry' : 'trigger'} processing`);
          }
          alert(`Processing ${retry ? 'retry ' : ''}triggered for ${campaignId}: ${result.message}`);
          // Refresh the list to show updated status
          await fetchCampaigns();
      } catch (err) {
          const message = `Error ${retry ? 'retrying' : 'triggering'} processing: ${err instanceof Error ? err.message : 'Unknown error'}`;
          setProcessError(message); // Set specific process error
          alert(message); // Also show alert for immediate feedback
          console.error("Trigger processing/retry error:", err);
      } finally {
          setIsProcessing(null); // Clear loading state
      }
  };


  return (
    <main className="flex flex-col items-center p-6 md:p-12 bg-gray-50 min-h-screen"> {/* Adjusted padding */}
      <div className="w-full max-w-6xl">
        <div className="mb-8 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-800">Active Campaigns</h1> {/* Updated title */}
          {/* TODO: Add toggle/link to view archived campaigns */}
          <Link href="/" className="text-blue-600 hover:text-blue-800 hover:underline">
            &larr; Back to Home
          </Link>
        </div>

        {isLoading && <p>Loading campaigns...</p>}
        {/* Display general, archive, or processing errors */}
        {error && !archiveError && !processError && <p className="text-red-600">Error loading campaigns: {error}</p>}
        {archiveError && <p className="text-red-600">Error archiving campaign: {archiveError}</p>}
        {processError && <p className="text-red-600">{processError}</p>}

        {!isLoading && !error && !archiveError && !processError && (
          <div className="bg-white p-6 rounded-lg shadow overflow-x-auto">
            {campaigns.length === 0 ? (
              <p>No active campaigns found.</p>
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
                     // Use the larger of processed count or totalRecipients for percentage denominator
                     const displayTotal = Math.max(processed, campaign.totalRecipients);
                     // Base percentage on *sent* vs displayTotal
                     const progressPercent = displayTotal > 0 ? (campaign.sentCount / displayTotal) * 100 : 0;
                     return (
                       <tr key={campaign.id}>
                         <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{campaign.name || campaign.id}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                           <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                               campaign.status === 'completed' ? 'bg-green-100 text-green-800' :
                               campaign.status === 'completed' ? 'bg-green-100 text-green-800' :
                               campaign.status === 'failed' ? 'bg-red-100 text-red-800' :
                               campaign.status === 'processing' ? 'bg-yellow-100 text-yellow-800' :
                               campaign.status === 'scheduled' ? 'bg-blue-100 text-blue-800' : // Style for scheduled
                               'bg-gray-100 text-gray-800' // pending, queued
                           }`}>
                             {campaign.status === 'scheduled' && campaign.scheduledAt
                               ? `Scheduled (${format(new Date(campaign.scheduledAt), 'Pp')})`
                               : campaign.status}
                            </span>
                         </td>
                         <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                            {/* Progress bar represents % Sent out of the displayTotal */}
                            {/* Added margin-bottom to the progress bar div */}
                            <div className="w-full bg-gray-200 rounded-full h-1.5 mb-1" title={`${progressPercent.toFixed(1)}% Sent`}>
                              <div className="bg-green-600 h-1.5 rounded-full" style={{ width: `${progressPercent}%` }}></div>
                            </div>
                            {/* Display S/F/K counts below the bar */}
                            <span className="text-xs text-green-600">S: {campaign.sentCount}</span>, <span className="text-xs text-red-600">F: {campaign.failedCount}</span>, <span className="text-xs text-gray-500">K: {campaign.skippedCount}</span>
                         </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{format(new Date(campaign.createdAt), 'PPpp')}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium space-x-2">
                          {/* Details Button */}
                          <Link
                            href={`/campaigns/${campaign.id}`}
                            className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                          >
                            Details
                          </Link>
                           {/* Process Button (Initial Run) */}
                           {/* Process Button (Only show for 'queued' or 'pending', hide for 'scheduled') */}
                           {(campaign.status === 'queued' || campaign.status === 'pending') && (
                               <button
                                 onClick={() => triggerProcessing(campaign.id, false)}
                                 className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                 disabled={isProcessing === campaign.id}
                               >
                                 {isProcessing === campaign.id ? 'Processing...' : 'Process Now'}
                               </button>
                           )}
                           {/* Note: Scheduled campaigns are processed automatically by the backend trigger/cron job */}
                           {/* Retry Failed Button */}
                           {campaign.failedCount > 0 && campaign.status !== 'processing' && (
                              <button
                                onClick={() => triggerProcessing(campaign.id, true)}
                                className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                disabled={isProcessing === campaign.id}
                              >
                                {isProcessing === campaign.id ? 'Retrying...' : 'Retry Failed'}
                              </button>
                           )}
                           {/* Archive button */}
                           <button
                             onClick={() => handleArchiveCampaign(campaign.id)}
                             className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                             disabled={isArchiving === campaign.id}
                           >
                             {isArchiving === campaign.id ? 'Archiving...' : 'Archive'}
                           </button>
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
