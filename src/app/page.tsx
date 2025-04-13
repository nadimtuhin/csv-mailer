'use client'; // Required for useState, useCallback, useEffect

import { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import CsvUploader from '@/components/CsvUploader';
import SendForm from '@/components/SendForm';
import StatusDisplay from '@/components/StatusDisplay';

// Define CsvRow type (consider moving to a shared types file)
interface CsvRow {
  email: string;
  [key: string]: string | number | boolean;
}

// Define Template type (consider moving to a shared types file)
interface Template {
  id: string;
  name: string;
  htmlContent: string;
  createdAt: string;
  updatedAt: string;
}

// Define type for campaign creation result message
interface CampaignResult {
    type: 'success' | 'error';
    message: string;
    campaignId?: string;
}

export default function Home() {
  // State for CSV data
  const [csvData, setCsvData] = useState<CsvRow[]>([]);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]); // Keep headers for potential future use

  // State for templates fetched for the SendForm dropdown
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  const [templateError, setTemplateError] = useState<string | null>(null);

  // State for the result of the *last* campaign creation attempt
  const [lastCampaignResult, setLastCampaignResult] = useState<CampaignResult | null>(null);


  // Callback for CsvUploader
  const handleDataParsed = useCallback((data: CsvRow[], headers: string[]) => {
    console.log('CSV Data Parsed:', data.length, 'rows', 'Headers:', headers);
    setCsvData(data);
    setCsvHeaders(headers); // Store headers
    setLastCampaignResult(null); // Clear status when new CSV is parsed
  }, []);

  // Callback for CsvUploader
  const handleClearData = useCallback(() => {
    console.log('Clearing CSV Data');
    setCsvData([]);
    setCsvHeaders([]);
    setLastCampaignResult(null); // Clear status when CSV is cleared
  }, []);

  // Callbacks for SendForm campaign creation result
  const handleCampaignCreated = useCallback((campaignId: string, message: string) => {
      setLastCampaignResult({ type: 'success', message, campaignId });
      // Clear CSV data after successful campaign creation to prevent accidental resubmission
      setCsvData([]);
      setCsvHeaders([]);
      // Consider clearing SendForm fields as well if needed (requires passing reset function)
  }, []);

  const handleCampaignError = useCallback((errorMessage: string) => {
       setLastCampaignResult({ type: 'error', message: errorMessage });
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
        console.error("Fetch templates error (Home page):", err);
      } finally {
        setIsLoadingTemplates(false);
      }
    };
    fetchTemplatesForDropdown();
  }, []); // Empty dependency array means run once on mount


  return (
    <main className="flex min-h-screen flex-col items-center p-12 bg-gray-50">
       <div className="w-full max-w-6xl mb-8 flex justify-between items-center">
         <h1 className="text-4xl font-bold text-gray-800">CSV Mailer</h1>
         <div className="flex gap-4">
            <Link href="/templates" className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300">
                Manage Templates
            </Link>
             <Link href="/campaigns" className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300">
                View Campaigns
            </Link>
         </div>
       </div>

      <div className="w-full max-w-6xl grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Column 1: Upload */}
        <div className="space-y-8">
          <section className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-2xl font-semibold mb-4 text-gray-700">1. Upload CSV</h2>
            <CsvUploader onDataParsed={handleDataParsed} onClearData={handleClearData} />
          </section>
        </div>

        {/* Column 2: Sending Configuration and Status */}
        <div className="space-y-8">
          <section className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-2xl font-semibold mb-4 text-gray-700">3. Configure & Create Campaign</h2>
            <SendForm
              templates={templates}
              isLoadingTemplates={isLoadingTemplates}
              templateError={templateError}
              csvData={csvData}
              onCampaignCreated={handleCampaignCreated} // Pass callback
              onCampaignError={handleCampaignError}     // Pass callback
            />
          </section>

          <section className="bg-white p-6 rounded-lg shadow">
             <h2 className="text-2xl font-semibold mb-4 text-gray-700">4. Last Action Status</h2>
             {/* Pass last campaign creation result to StatusDisplay */}
            <StatusDisplay result={lastCampaignResult} />
          </section>
        </div>
      </div>
    </main>
  );
}
