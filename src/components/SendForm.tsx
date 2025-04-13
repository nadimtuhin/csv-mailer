'use client';

import React, { useState, useEffect } from 'react'; // Add useEffect

// Define needed types (or import from shared location)
interface CsvRow {
  email: string;
  [key: string]: string | number | boolean;
}
interface Template {
  id: string;
  name: string;
  htmlContent: string; // Keep this, needed for sending
  createdAt: string;
  updatedAt: string;
}

interface SendFormProps {
  templates: Template[];
  isLoadingTemplates: boolean;
  templateError: string | null;
  csvData: CsvRow[];
  // csvHeaders: string[]; // Prop removed from interface
  // TODO: Add props for status updates
  onCampaignCreated: (campaignId: string, message: string) => void; // Callback after creation
  onCampaignError: (errorMessage: string) => void; // Callback on creation error
}

export default function SendForm({
  templates,
  isLoadingTemplates,
  templateError,
  csvData,
  onCampaignCreated, // Destructure callbacks
  onCampaignError
}: SendFormProps) {
  const [campaignName, setCampaignName] = useState(''); // Optional campaign name
  const [subject, setSubject] = useState('');
  const [fromEmail, setFromEmail] = useState('');
  const [fromName, setFromName] = useState(''); // Optional
  const [replyToEmail, setReplyToEmail] = useState('shibbir.ahmad@pathao.com'); // Default from requirements
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [pdfTemplatePath, setPdfTemplatePath] = useState<string | null>(null); // State for temp PDF path
  const [pdfFileName, setPdfFileName] = useState<string | null>(null); // State for PDF filename display
  const [isUploadingPdf, setIsUploadingPdf] = useState(false); // PDF upload state
  const [pdfError, setPdfError] = useState<string | null>(null); // PDF specific error
  const [isSending, setIsSending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Reset selected template/PDF if lists/data change
  useEffect(() => {
    if (selectedTemplateId && !templates.find(t => t.id === selectedTemplateId)) {
      setSelectedTemplateId('');
    }
    // Consider resetting PDF path if CSV data changes? Depends on workflow.
  }, [templates, selectedTemplateId]);

  const handlePdfTemplateChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
     const file = event.target.files?.[0];
     event.target.value = ''; // Reset input to allow re-uploading

     // Clear previous state on new selection attempt
     setPdfTemplatePath(null);
     setPdfFileName(null);
     setPdfError(null);

     if (!file) return;

     if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
       setPdfError('Please select a .pdf file.');
       return;
     }

     setIsUploadingPdf(true);
     setFormError(null); // Clear general errors

     const formData = new FormData();
     formData.append('file', file);

     try {
       const response = await fetch('/api/pdf/upload-template', {
         method: 'POST',
         body: formData,
       });
       const result = await response.json();

       if (!response.ok) {
         throw new Error(result.message || 'Failed to upload PDF template.');
       }

       setPdfTemplatePath(result.tempFilePath);
       setPdfFileName(file.name);
       console.log('PDF Template uploaded, path:', result.tempFilePath);

     } catch (err) {
       const message = err instanceof Error ? err.message : 'Unknown PDF upload error.';
       setPdfError(message);
       // Keep filename null if upload fails
     } finally {
       setIsUploadingPdf(false);
     }
   };

   const clearPdfTemplate = () => {
       setPdfTemplatePath(null);
       setPdfFileName(null);
       setPdfError(null);
       // We don't need to delete the temp file here via API,
       // the backend send route is responsible for cleanup after use.
       // Reset the file input visually if possible
       const input = document.getElementById('pdfTemplateUpload') as HTMLInputElement;
       if (input) input.value = '';
   };


  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSending(true);
    setFormError(null);

    // --- Validation ---
    if (!csvData || csvData.length === 0) {
      setFormError('Please upload a valid CSV file first.');
      setIsSending(false);
      return;
    }
    if (!selectedTemplateId) {
       setFormError('Please select a template.');
       setIsSending(false);
       return;
    }
    const selectedTemplate = templates.find(t => t.id === selectedTemplateId);
    if (!selectedTemplate) {
        setFormError('Selected template not found. Please refresh or select another.');
        setIsSending(false);
        return;
    }
     if (!subject.trim() || !fromEmail.trim() || !replyToEmail.trim()) {
        setFormError('Please fill in Subject, From Email, and Reply-To Email.');
        setIsSending(false);
        return;
     }
    // --- End Validation ---


    console.log('Creating Campaign with Data:', {
      campaignName,
      subject,
      fromEmail,
      fromName,
      replyToEmail,
      selectedTemplateId: selectedTemplate.id,
      recipientsCount: csvData.length,
    });

    // alert('Sending logic not yet implemented.'); // Remove alert

    // --- API Call to Create Campaign ---
    try {
       const response = await fetch('/api/campaigns', { // Target campaigns endpoint
         method: 'POST',
         headers: {
           'Content-Type': 'application/json',
         },
         body: JSON.stringify({
           recipients: csvData,
           templateId: selectedTemplate.id, // Pass template ID
           templateHtml: selectedTemplate.htmlContent, // Still pass HTML for now
           subject,
           fromEmail,
           fromName,
           replyToEmail,
           pdfTemplatePath: pdfTemplatePath,
           campaignName: campaignName || undefined, // Pass optional name
         }),
       });

       const result = await response.json();

       if (!response.ok) {
         throw new Error(result.message || `Failed to create campaign: ${response.statusText}`);
       }

       console.log('Campaign Creation Response:', result);
       // Call parent callback on success
       onCampaignCreated(result.campaignId, result.message);
       // Optionally clear the form here or let parent handle it
       // setSubject(''); setCampaignName(''); setSelectedTemplateId(''); etc.

     } catch (err) {
       const message = err instanceof Error ? err.message : 'An unknown error occurred creating campaign.';
       setFormError(message);
       onCampaignError(message); // Call parent callback on error
       console.error("Create campaign error:", err);
     } finally {
       setIsSending(false);
     }
    // --- End API Call ---
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="subject" className="block text-sm font-medium text-gray-700">
          Email Subject
        </label>
        <input
          type="text"
          id="subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          required
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          placeholder="Your Email Subject"
        />
      </div>

       {/* Optional Campaign Name */}
       <div>
         <label htmlFor="campaignName" className="block text-sm font-medium text-gray-700">
           Campaign Name (Optional)
         </label>
         <input
           type="text"
           id="campaignName"
           value={campaignName}
           onChange={(e) => setCampaignName(e.target.value)}
           className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
           placeholder={`Campaign - ${new Date().toLocaleDateString()}`}
         />
       </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
         <div>
           <label htmlFor="fromEmail" className="block text-sm font-medium text-gray-700">
             From Email (Official HR Address)
           </label>
           <input
             type="email"
             id="fromEmail"
             value={fromEmail}
             onChange={(e) => setFromEmail(e.target.value)}
             required
             className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
             placeholder="hr@pathao.com"
           />
         </div>
          <div>
           <label htmlFor="fromName" className="block text-sm font-medium text-gray-700">
             From Name (Optional)
           </label>
           <input
             type="text"
             id="fromName"
             value={fromName}
             onChange={(e) => setFromName(e.target.value)}
             className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
             placeholder="Pathao HR Team"
           />
         </div>
      </div>


      <div>
        <label htmlFor="replyToEmail" className="block text-sm font-medium text-gray-700">
          Reply-To Email
        </label>
        <input
          type="email"
          id="replyToEmail"
          value={replyToEmail}
          onChange={(e) => setReplyToEmail(e.target.value)}
          required
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
        />
      </div>

       <div>
        <label htmlFor="templateSelect" className="block text-sm font-medium text-gray-700">
          Select Template
        </label>
        <select
          id="templateSelect"
          value={selectedTemplateId}
          onChange={(e) => setSelectedTemplateId(e.target.value)}
          required
          className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100"
          disabled={isLoadingTemplates || templates.length === 0}
        >
          <option value="" disabled>
             {isLoadingTemplates ? 'Loading templates...' : templateError ? 'Error loading' : templates.length === 0 ? 'No templates available' : '-- Select a template --'}
          </option>
          {!isLoadingTemplates && !templateError && templates.map((template) => (
            <option key={template.id} value={template.id}>
              {template.name}
            </option>
          ))}
        </select>
        {templateError && <p className="text-xs text-red-600 mt-1">{templateError}</p>}
      </div>

      {/* PDF Template Upload Section */}
      <div className="p-4 border border-gray-200 rounded-md bg-gray-50">
         <label htmlFor="pdfTemplateUpload" className="block text-sm font-medium text-gray-700 mb-1">
           PDF Attachment Template (Optional)
         </label>
         <input
           type="file"
           id="pdfTemplateUpload"
           accept=".pdf,application/pdf"
           onChange={handlePdfTemplateChange}
           disabled={isUploadingPdf || isSending}
           className="block w-full text-sm text-gray-500 file:mr-4 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 disabled:opacity-50"
         />
         {isUploadingPdf && <p className="text-sm text-indigo-600 mt-1">Uploading PDF...</p>}
         {pdfError && <p className="text-sm text-red-600 mt-1">{pdfError}</p>}
         {pdfTemplatePath && pdfFileName && !pdfError && !isUploadingPdf && (
             <div className="text-sm text-green-700 mt-2 flex justify-between items-center">
               <span>Using PDF: <strong>{pdfFileName}</strong></span>
               <button
                 type="button"
                 onClick={clearPdfTemplate}
                 className="ml-2 text-xs text-red-600 hover:text-red-800 font-medium"
                 title="Remove PDF template"
                 disabled={isSending}
               >
                 Clear PDF
               </button>
             </div>
         )}
         <p className="text-xs text-gray-500 mt-1">
             If uploaded, text like {'{{column_name}}'} in the PDF will be replaced using CSV data for each recipient.
         </p>
      </div>


      {formError && <p className="text-sm text-red-600 mt-2">{formError}</p>}

      <button
        type="submit"
        disabled={isSending || isUploadingPdf || isLoadingTemplates || !csvData.length || !selectedTemplateId}
        className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
      >
        {isSending ? 'Creating Campaign...' : 'Create & Queue Campaign'}
      </button>
       <p className="text-xs text-gray-500">
        This will create a campaign record and queue emails for background sending. Monitor progress on the Campaigns page.
      </p>
    </form>
  );
}
