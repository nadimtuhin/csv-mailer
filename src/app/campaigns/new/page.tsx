'use client'; // Required for hooks

import React, { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation'; // To redirect after creation
import CsvUploader from '@/components/CsvUploader';
import SendForm from '@/components/SendForm';
import { CsvRow, Template, CampaignResult } from '@/types'; // Import shared types

export default function NewCampaignPage() {
  const router = useRouter();

  // State for CSV data
  const [csvData, setCsvData] = useState<CsvRow[]>([]);
  // const [csvHeaders, setCsvHeaders] = useState<string[]>([]); // Keep if needed by SendForm later

  // State for templates fetched for the SendForm dropdown
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  const [templateError, setTemplateError] = useState<string | null>(null);

  // State for the result of the campaign creation attempt
  const [creationStatus, setCreationStatus] = useState<CampaignResult | null>(null);

  // Callback for CsvUploader - remove unused 'headers' param
  const handleDataParsed = useCallback((data: CsvRow[]) => {
    setCsvData(data);
    // setCsvHeaders(headers); // Headers not currently used here
    setCreationStatus(null); // Clear status on new CSV
  }, []);

  // Callback for CsvUploader
  const handleClearData = useCallback(() => {
    setCsvData([]);
    // setCsvHeaders([]);
    setCreationStatus(null); // Clear status
  }, []);

  // Callbacks for SendForm campaign creation result
  const handleCampaignCreated = useCallback((campaignId: string, message: string) => {
      setCreationStatus({ type: 'success', message, campaignId });
      // Redirect to the campaign detail page after a short delay
      setTimeout(() => {
          router.push(`/campaigns/${campaignId}`);
      }, 1500); // 1.5 second delay
  }, [router]);

  const handleCampaignError = useCallback((errorMessage: string) => {
       setCreationStatus({ type: 'error', message: errorMessage });
  }, []);

  // Fetch templates when component mounts
  useEffect(() => {
    const fetchTemplatesForDropdown = async () => {
      setIsLoadingTemplates(true);
      setTemplateError(null);
      try {
        const response = await fetch('/api/templates');
        if (!response.ok) {
          throw new Error(`Failed to fetch templates: ${response.statusText}`);
        }
        const data = await response.json();
        setTemplates(data);
      } catch (err) {
        setTemplateError(err instanceof Error ? err.message : 'An unknown error occurred');
        console.error("Fetch templates error (New Campaign page):", err);
      } finally {
        setIsLoadingTemplates(false);
      }
    };
    fetchTemplatesForDropdown();
  }, []);

  return (
    <main className="flex min-h-screen flex-col items-center p-12 bg-gray-50">
       <div className="w-full max-w-4xl">
         <div className="mb-8 flex justify-between items-center">
            <h1 className="text-3xl font-bold text-gray-800">Create New Campaign</h1>
            <Link href="/campaigns" className="text-blue-600 hover:text-blue-800 hover:underline">
              &larr; Back to Campaigns List
            </Link>
         </div>

         {/* Status Message Area */}
         {creationStatus && (
             <div className={`mb-6 p-4 rounded-md text-sm ${creationStatus.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                 {creationStatus.message}
                 {creationStatus.type === 'success' && " Redirecting..."}
             </div>
         )}


         <div className="grid grid-cols-1 gap-8">
            {/* Step 1: Upload CSV */}
            <section className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-semibold mb-4 text-gray-700 border-b pb-2">1. Upload Recipient CSV</h2>
              <CsvUploader onDataParsed={handleDataParsed} onClearData={handleClearData} />
            </section>

            {/* Step 2: Configure & Create */}
            <section className="bg-white p-6 rounded-lg shadow">
               <h2 className="text-xl font-semibold mb-4 text-gray-700 border-b pb-2">2. Configure & Create</h2>
               <SendForm
                 templates={templates}
                 isLoadingTemplates={isLoadingTemplates}
                 templateError={templateError}
                 csvData={csvData}
                 onCampaignCreated={handleCampaignCreated}
                 onCampaignError={handleCampaignError}
               />
            </section>
         </div>
       </div>
    </main>
  );
}
