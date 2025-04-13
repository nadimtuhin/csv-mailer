'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import RichTextEditor from './RichTextEditor';

interface Template {
  id: string;
  name: string;
  htmlContent: string;
  createdAt: string;
}

export default function TemplateManager() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formTemplateName, setFormTemplateName] = useState('');
  const [editorContent, setEditorContent] = useState('');
  const [isUploadingDocx, setIsUploadingDocx] = useState(false);
  const [docxError, setDocxError] = useState<string | null>(null);
  const [isArchiving, setIsArchiving] = useState<string | null>(null);
  const [archiveError, setArchiveError] = useState<string | null>(null);

  const fetchTemplates = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/templates');
      if (!response.ok) {
        throw new Error(`Failed to fetch templates: ${response.statusText}`);
      }
      const data = await response.json();
      setTemplates(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      console.error("Fetch templates error:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const handleEditorChange = (content: string) => {
    setEditorContent(content);
    if (error === 'Template name and content cannot be empty.') {
       setError(null);
       setDocxError(null);
     }
   };

  const handleArchiveTemplate = async (templateId: string) => {
    if (!window.confirm('Are you sure you want to archive this template? Archived templates can be viewed separately.')) {
      return;
    }
    setIsArchiving(templateId);
    setArchiveError(null);
    setError(null);
    try {
      const response = await fetch(`/api/templates/${templateId}`, { method: 'PATCH' });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to archive template: ${response.statusText}`);
      }
      await fetchTemplates();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An unknown error occurred during archiving.';
      setArchiveError(message);
      console.error("Archive template error:", err);
    } finally {
      setIsArchiving(null);
    }
  };

   const handleShowCreateForm = () => {
    setFormTemplateName('');
    setEditorContent('');
    setError(null);
    setDocxError(null);
    setShowForm(true);
  };

  const handleSaveTemplate = async () => {
    if (!formTemplateName.trim() || !editorContent.trim()) {
      setError('Template name and content cannot be empty.');
      return;
    }
    setIsSaving(true);
    setError(null);
    const url = '/api/templates';
    const method = 'POST';
    const body = JSON.stringify({ name: formTemplateName, htmlContent: editorContent });
    try {
      const response = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: body,
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to create template: ${response.statusText}`);
      }
      setFormTemplateName('');
      setEditorContent('');
      setShowForm(false);
      await fetchTemplates();
    } catch (err) {
       setError(err instanceof Error ? err.message : `An unknown error occurred while saving`);
       console.error("Save template error:", err);
    } finally {
       setIsSaving(false);
    }
  };

  const handleDocxFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.docx') && file.type !== 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        setDocxError('Please select a .docx file.');
        return;
     }
    setIsUploadingDocx(true);
    setDocxError(null);
    setError(null);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const response = await fetch('/api/templates/upload-docx', {
        method: 'POST',
        body: formData,
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || `Failed to upload/convert DOCX: ${response.statusText}`);
      }
      setEditorContent(result.htmlContent || '');
      if (!formTemplateName) {
          setFormTemplateName(file.name.replace(/\.docx$/i, ''));
      }
    } catch (err) {
       const message = err instanceof Error ? err.message : 'An unknown error occurred during DOCX processing.';
       setDocxError(message);
       console.error("DOCX upload/conversion error:", err);
    } finally {
      setIsUploadingDocx(false);
    }
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      <h2 className="text-xl font-semibold text-gray-800">Manage Templates</h2>

      {/* Template List Section */}
      <div>
        <h3 className="text-lg font-medium text-gray-700 mb-3">Active Templates</h3>
        {isLoading && <p className="text-sm text-gray-500">Loading templates...</p>}
        {error && !archiveError && <p className="text-sm text-red-600">Error loading templates: {error}</p>}
        {archiveError && <p className="text-sm text-red-600">Error archiving template: {archiveError}</p>}
        {!isLoading && !error && !archiveError && templates.length === 0 && (
          <p className="text-sm text-gray-500">No active templates found.</p>
        )}
        {!isLoading && !error && !archiveError && templates.length > 0 && (
          <ul className="space-y-3">
            {templates.map((template) => (
              <li key={template.id} className="border p-3 rounded-lg bg-white shadow-sm flex justify-between items-center gap-4">
                <span className="font-medium text-gray-800 flex-1 truncate">{template.name}</span>
                <div className="flex gap-2 flex-shrink-0">
                   <button
                      type="button"
                      onClick={() => router.push(`/templates/${template.id}/edit`)}
                      className="px-3 py-1 text-xs font-semibold text-white bg-yellow-500 rounded-md shadow-sm hover:bg-yellow-600 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:ring-offset-1"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleArchiveTemplate(template.id)}
                      className={`px-3 py-1 text-xs font-semibold text-white bg-red-500 rounded-md shadow-sm hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed`}
                      disabled={isArchiving === template.id}
                    >
                      {isArchiving === template.id ? 'Archiving...' : 'Archive'}
                    </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <hr className="my-6 border-gray-200" />

      {/* Create Template Section */}
      <div>
        {!showForm ? (
           <button
              type="button"
              onClick={handleShowCreateForm}
              className="w-full px-4 py-2 font-medium text-white bg-indigo-600 rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
             Create New Template
           </button>
        ) : (
          <div className="space-y-5 border p-4 rounded-lg bg-gray-50 shadow-sm">
             <h3 className="text-lg font-medium text-gray-700">Create New Template</h3>

              <div className="p-3 border border-dashed border-gray-300 rounded-md bg-white">
                   <label htmlFor="docxUpload" className="block text-sm font-medium text-gray-700 mb-1">
                     Or Upload Word Document (.docx) to Prefill Content
                   </label>
                   <input
                     type="file"
                     id="docxUpload"
                     accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                     onChange={handleDocxFileChange}
                     disabled={isUploadingDocx}
                     className="block w-full text-sm text-gray-500 file:mr-4 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 disabled:opacity-50 cursor-pointer"
                   />
                   {isUploadingDocx && <p className="text-sm text-indigo-600 mt-1 animate-pulse">Processing document...</p>}
                   {docxError && <p className="text-sm text-red-600 mt-1">{docxError}</p>}
                   <p className="text-xs text-gray-500 mt-1">Uploading a DOCX will replace the current content in the editor below.</p>
              </div>

             <div>
               <label htmlFor="templateName" className="block text-sm font-medium text-gray-700 mb-1">
                 Template Name <span className="text-red-500">*</span>
               </label>
               <input
                 type="text"
                 id="templateName"
                 value={formTemplateName}
                 onChange={(e) => {
                    setFormTemplateName(e.target.value);
                    if (error === 'Template name and content cannot be empty.') {
                       setError(null);
                    }
                 }}
                 className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                 placeholder="e.g., Welcome Email Q1"
                 required
               />
             </div>

             <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                   Template Content <span className="text-red-500">*</span>
                 </label>
                 <RichTextEditor
                   content={editorContent}
                   onChange={handleEditorChange}
                   placeholder="Enter your email template HTML here. Use {{column_name}} for placeholders..."
                 />
              </div>

               {error && <p className="text-sm text-red-600 mt-2">{error}</p>}

              <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                >
                  Cancel
                 </button>
                 <button
                   type="button"
                   onClick={handleSaveTemplate}
                   className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                   disabled={isSaving || !formTemplateName || !editorContent}
                 >
                   {isSaving ? 'Saving...' : 'Save Template'}
                 </button>
             </div>
          </div>
        )}
      </div>
    </div>
  );
}
