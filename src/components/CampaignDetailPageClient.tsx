'use client'; // This component handles client-side logic

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
// No need for useParams here, campaignId will be passed as a prop
import { format } from 'date-fns';
import type { Campaign, CampaignRecipient } from '@prisma/client'; // Import types

// Define the structure for the detailed campaign data
interface CampaignDetails extends Campaign {
  recipients: Pick<CampaignRecipient, 'id' | 'recipientEmail' | 'status' | 'errorMessage' | 'processedAt'>[];
}

// Define props for the client component
interface CampaignDetailPageClientProps {
  campaignId: string;
}

export default function CampaignDetailPageClient({ campaignId }: CampaignDetailPageClientProps) {
  // campaignId is now a prop

  const [campaign, setCampaign] = useState<CampaignDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);

  // Fetch campaign details function - uses the campaignId prop
  const fetchCampaignDetails = useCallback(async () => {
    if (!campaignId) return;
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/campaigns/${campaignId}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch campaign details');
      }
      const data = await response.json();
      setCampaign(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      console.error("Fetch campaign details error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [campaignId]); // Dependency is the campaignId prop

  // Fetch details on mount and when campaignId changes
  useEffect(() => {
    fetchCampaignDetails();
  }, [fetchCampaignDetails]);

  // Function to trigger retry for failed recipients
  const handleRetryFailed = async () => {
      if (!campaignId) return;
      setIsRetrying(true);
      setError(null); // Clear previous errors
      console.log(`Triggering retry for failed recipients in campaign ${campaignId}...`);
      try {
          const response = await fetch(`/api/campaigns/${campaignId}/process`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ retryFailed: true })
          });
          const result = await response.json();
          if (!response.ok) {
              throw new Error(result.message || 'Failed to trigger retry processing');
          }
          alert(`Retry triggered: ${result.message}`);
          fetchCampaignDetails(); // Refresh details
      } catch (err) {
          const message = err instanceof Error ? err.message : 'Unknown error triggering retry';
          setError(message);
          alert(`Error triggering retry: ${message}`);
          console.error("Trigger retry error:", err);
      } finally {
          setIsRetrying(false);
      }
  };

  // Helper to render status badges
  const StatusBadge = ({ status }: { status: string }) => (
     <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
         status === 'sent' ? 'bg-green-100 text-green-800' :
         status === 'failed' ? 'bg-red-100 text-red-800' :
         status === 'skipped' ? 'bg-yellow-100 text-yellow-800' :
         status === 'processing' ? 'bg-yellow-100 text-yellow-800' : // Added processing style
         status === 'scheduled' ? 'bg-blue-100 text-blue-800' : // Added scheduled style
         'bg-gray-100 text-gray-800' // pending, queued
     }`}>
       {status}
     </span>
  );

  if (isLoading) return <p className="p-12 text-center">Loading campaign details...</p>;
  if (error && !campaign) return <p className="p-12 text-center text-red-600">Error loading campaign: {error}</p>;
  if (!campaign) return <p className="p-12 text-center">Campaign not found.</p>;

  const processed = campaign.sentCount + campaign.failedCount + campaign.skippedCount;
  const displayTotal = Math.max(processed, campaign.totalRecipients);
  const progressPercent = displayTotal > 0 ? (campaign.sentCount / displayTotal) * 100 : 0;

  return (
    <main className="flex min-h-screen flex-col items-center p-12 bg-gray-50">
      <div className="w-full max-w-6xl">
        <div className="mb-6 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-800 truncate pr-4">
            Campaign: {campaign.name || campaign.id}
          </h1>
          <Link href="/campaigns" className="text-blue-600 hover:text-blue-800 hover:underline flex-shrink-0">
            &larr; Back to Campaigns List
          </Link>
        </div>

        {/* Campaign Summary Section */}
        <section className="bg-white p-6 rounded-lg shadow mb-8">
            <h2 className="text-xl font-semibold mb-4 text-gray-700">Summary</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
               <div><strong>Status:</strong> <StatusBadge status={campaign.status} /></div>
               {/* Display Scheduled At if applicable */}
               {campaign.status === 'scheduled' && campaign.scheduledAt ? (
                   <div><strong>Scheduled At:</strong> {format(new Date(campaign.scheduledAt), 'PPpp')}</div>
               ) : (
                   <div><strong>Created:</strong> {format(new Date(campaign.createdAt), 'PPpp')}</div>
               )}
               <div><strong>Subject:</strong> {campaign.subject}</div>
               <div><strong>From:</strong> {campaign.fromName ? `${campaign.fromName} <${campaign.fromEmail}>` : campaign.fromEmail}</div>
              <div><strong>Reply-To:</strong> {campaign.replyToEmail}</div>
              {campaign.pdfTemplatePath && <div><strong>PDF Template:</strong> Attached</div>}
              {/* Progress Bar */}
              <div className="col-span-2 md:col-span-4">
                 <strong>Progress:</strong> {processed} processed (out of {campaign.totalRecipients} expected recipients)
                 <div className="w-full bg-gray-200 rounded-full h-2.5 mt-1" title={`${progressPercent.toFixed(1)}% Sent`}>
                    <div className="bg-green-600 h-2.5 rounded-full" style={{ width: `${progressPercent}%` }}></div>
                 </div>
                 <div className="flex justify-between text-xs mt-1">
                    <span className="text-green-600">Sent: {campaign.sentCount}</span>
                    <span className="text-red-600">Failed: {campaign.failedCount}</span>
                    <span className="text-gray-500">Skipped: {campaign.skippedCount}</span>
                 </div>
              </div>
           </div>
            {/* Action Buttons */}
           <div className="mt-6 flex gap-4">
                <button
                    onClick={fetchCampaignDetails} // Refresh button
                    disabled={isLoading}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 disabled:opacity-50"
                >
                    Refresh Status
                </button>
                {campaign.failedCount > 0 && campaign.status !== 'processing' && (
                    <button
                        onClick={handleRetryFailed}
                        disabled={isRetrying}
                        className="px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 disabled:opacity-50"
                    >
                        {isRetrying ? 'Retrying...' : `Retry ${campaign.failedCount} Failed`}
                    </button>
                )}
                 {(campaign.status === 'queued' || campaign.status === 'pending') && (
                     <button onClick={() => { alert('Triggering processing...'); fetch(`/api/campaigns/${campaignId}/process`, { method: 'POST' }); }} className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600">
                         Manual Process Trigger
                     </button>
                 )}
           </div>
           {error && <p className="text-red-600 mt-4">Error during action: {error}</p>}
        </section>

        {/* Recipient Details Section */}
        <section className="bg-white p-6 rounded-lg shadow overflow-x-auto">
           <h2 className="text-xl font-semibold mb-4 text-gray-700">Recipient Status</h2>
           {campaign.recipients.length === 0 ? (
              <p>No recipient data available yet.</p>
           ) : (
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                 <thead className="bg-gray-50">
                    <tr>
                       <th scope="col" className="px-4 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">Email</th>
                       <th scope="col" className="px-4 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">Status</th>
                       <th scope="col" className="px-4 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">Details / Error</th>
                       <th scope="col" className="px-4 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">Processed At</th>
                    </tr>
                 </thead>
                 <tbody className="bg-white divide-y divide-gray-200">
                    {campaign.recipients.map((recipient) => (
                       <tr key={recipient.id}>
                          <td className="px-4 py-2 whitespace-nowrap">{recipient.recipientEmail}</td>
                          <td className="px-4 py-2 whitespace-nowrap"><StatusBadge status={recipient.status} /></td>
                          <td className="px-4 py-2">{recipient.errorMessage || '-'}</td>
                          <td className="px-4 py-2 whitespace-nowrap">{recipient.processedAt ? format(new Date(recipient.processedAt), 'Pp') : '-'}</td>
                       </tr>
                    ))}
                 </tbody>
              </table>
           )}
        </section>
      </div>
    </main>
  );
}
