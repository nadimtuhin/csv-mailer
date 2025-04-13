'use client';

import React, { useState, useEffect, useCallback } from 'react';
import RichTextEditor from './RichTextEditor'; // Import the editor

// Define the structure of a template object (matching API)
interface Template {
  id: string;
  name: string;
  htmlContent: string;
  createdAt: string;
}

// No props needed for now
// interface TemplateManagerProps {
//   // TODO: Add props for selecting a template, passing headers for placeholders
//   // onTemplateSelect: (template: Template) => void;
//   // availableHeaders: string[];
// }


export default function TemplateManager() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false); // Renamed from showCreateForm
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [formTemplateName, setFormTemplateName] = useState('');
  const [editorContent, setEditorContent] = useState('');
  const [isUploadingDocx, setIsUploadingDocx] = useState(false); // State for DOCX upload
  const [docxError, setDocxError] = useState<string | null>(null); // Specific error for DOCX
  const [isArchiving, setIsArchiving] = useState<string | null>(null); // Track which template is being archived
  const [archiveError, setArchiveError] = useState<string | null>(null); // Specific error for archiving
  const [isEditorReadOnly, setIsEditorReadOnly] = useState(false); // State for editor read-only mode

  // Function to fetch templates
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
  }, []); // No dependencies, fetch logic is self-contained

  // Fetch existing templates on mount
  useEffect(() => {
    const fetchTemplates = async () => {
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
    };
    fetchTemplates();
  }, [fetchTemplates]);

  const handleEditorChange = (content: string) => {
    setEditorContent(content);
    // Clear validation error when user starts typing
    if (error === 'Template name and content cannot be empty.') {
       setError(null); // Clear general form error
       setDocxError(null); // Clear docx error
     }
   };

  // Handler for archiving a template
  const handleArchiveTemplate = async (templateId: string) => {
    // Optional: Add a confirmation dialog
    if (!window.confirm('Are you sure you want to archive this template? Archived templates can be viewed separately.')) {
      return;
    }

    setIsArchiving(templateId); // Indicate archiving is in progress
    setArchiveError(null); // Clear previous archive errors
    setError(null); // Clear general errors

    try {
      // Use PATCH method to the specific template ID endpoint
      const response = await fetch(`/api/templates/${templateId}`, {
        method: 'PATCH',
        // No body needed if the endpoint implicitly handles archiving
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to archive template: ${response.statusText}`);
      }

      // Refresh the list (which now excludes archived items by default)
      await fetchTemplates();

    } catch (err) {
      const message = err instanceof Error ? err.message : 'An unknown error occurred during archiving.';
      setArchiveError(message); // Set specific archive error
      console.error("Archive template error:", err);
    } finally {
      setIsArchiving(null); // Reset archiving state
    }
  };


   // Function to open the form for creating a new template
   const handleShowCreateForm = () => {
    setFormMode('create');
    setEditingTemplateId(null);
    setFormTemplateName('');
    setEditorContent('');
    setError(null);
    setDocxError(null); // Reset docx error
    setIsEditorReadOnly(false); // Editor is editable in create mode
    setShowForm(true);
  };

  // Function to open the form for editing an existing template
  const handleShowEditForm = (template: Template) => {
    setFormMode('edit');
    setEditingTemplateId(template.id);
    setFormTemplateName(template.name);
    setEditorContent(template.htmlContent);
    setError(null);
    setDocxError(null); // Reset docx error
    setIsEditorReadOnly(true); // Start in read-only mode for editing
    setShowForm(true);
  };

  // Unified save handler for create and edit
  const handleSaveTemplate = async () => {
    if (!formTemplateName.trim() || !editorContent.trim()) {
      setError('Template name and content cannot be empty.');
      return;
    }
    setIsSaving(true);
    setError(null);

    const url = '/api/templates';
    const method = formMode === 'create' ? 'POST' : 'PUT';
    const body = JSON.stringify(
       formMode === 'create'
         ? { name: formTemplateName, htmlContent: editorContent }
         : { id: editingTemplateId, name: formTemplateName, htmlContent: editorContent }
     );

    try {
      const response = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: body,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to ${formMode} template: ${response.statusText}`);
      }

      // Reset form, hide, and refetch
      setFormTemplateName('');
      setEditorContent('');
      setShowForm(false); // Use unified state
      setEditingTemplateId(null); // Clear editing ID
      await fetchTemplates(); // Refresh the list

    } catch (err) {
       setError(err instanceof Error ? err.message : `An unknown error occurred while ${formMode === 'create' ? 'saving' : 'updating'}`);
       console.error("Save template error:", err);
    } finally {
       setIsSaving(false);
    }
  };

  // Handler for DOCX file input change
  const handleDocxFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = ''; // Reset file input to allow re-uploading the same file

    if (!file) return;

    // Basic client-side type check (optional, backend validates too)
     if (!file.name.toLowerCase().endsWith('.docx') && file.type !== 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        setDocxError('Please select a .docx file.');
        return;
     }

    setIsUploadingDocx(true);
    setDocxError(null);
    setError(null); // Clear general errors

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/templates/upload-docx', {
        method: 'POST',
        body: formData, // Send as FormData
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || `Failed to upload/convert DOCX: ${response.statusText}`);
      }

      // Set editor content with converted HTML
      // IMPORTANT: This replaces existing content in the editor
      setEditorContent(result.htmlContent || '');
      // Optionally try to prefill name from filename if name field is empty
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
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-gray-600">Active Templates</h3> {/* Updated title */}
      {/* TODO: Add toggle/button to show archived templates */}
      {isLoading && <p>Loading templates...</p>}
      {/* Display general loading/fetch error */}
      {error && !archiveError && <p className="text-red-600">Error loading templates: {error}</p>}
      {/* Display specific archive error */}
      {archiveError && <p className="text-red-600">Error archiving template: {archiveError}</p>}
      {!isLoading && !error && !archiveError && templates.length === 0 && (
        <p className="text-sm text-gray-500">No active templates found.</p> // Updated message
      )}
      {!isLoading && !error && templates.length > 0 && (
        <ul className="space-y-2">
          {templates.map((template) => (
            <li key={template.id} className="border p-3 rounded-md bg-gray-50 flex justify-between items-center gap-2">
              <span className="font-medium flex-1 truncate">{template.name}</span>
              <div className="flex gap-2">
                 {/* TODO: Add Select button functionality */}
                 <button className="text-sm text-blue-600 hover:text-blue-800">Select</button>
                 <button
                    onClick={() => handleShowEditForm(template)}
                    className="text-sm text-yellow-600 hover:text-yellow-800"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleArchiveTemplate(template.id)} // Use archive handler
                    className={`text-sm text-orange-600 hover:text-orange-800 disabled:opacity-50 disabled:cursor-not-allowed`} // Changed color
                    disabled={isArchiving === template.id} // Disable while archiving
                  >
                    {isArchiving === template.id ? 'Archiving...' : 'Archive'} {/* Changed text */}
                  </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <hr className="my-6" />

      {!showForm ? (
         <button
            onClick={handleShowCreateForm} // Use specific handler
            className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
          >
           Create New Template
         </button>
      ) : (
        <div className="space-y-4 border p-4 rounded-md bg-white">
           <h3 className="text-lg font-medium text-gray-600 mb-4">
             {formMode === 'create' ? 'Create New Template' : 'Edit Template'}
           </h3>

            {/* Option to Upload DOCX (only in create mode maybe?) */}
            {formMode === 'create' && (
              <div className="mb-4 p-3 border border-dashed rounded-md bg-gray-50">
                 <label htmlFor="docxUpload" className="block text-sm font-medium text-gray-700 mb-1">
                   Or Upload Word Document (.docx)
                 </label>
                 <input
                   type="file"
                   id="docxUpload"
                   accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                   onChange={handleDocxFileChange}
                   disabled={isUploadingDocx}
                   className="block w-full text-sm text-gray-500 file:mr-4 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50"
                 />
                 {isUploadingDocx && <p className="text-sm text-blue-600 mt-1">Processing document...</p>}
                 {docxError && <p className="text-sm text-red-600 mt-1">{docxError}</p>}
                 <p className="text-xs text-gray-500 mt-1">Uploading a DOCX will replace the current content in the editor below.</p>
              </div>
            )}


           <div>
             <label htmlFor="templateName" className="block text-sm font-medium text-gray-700 mb-1">
               Template Name
             </label>
             <input
               type="text"
               id="templateName"
               value={formTemplateName} // Use unified state
               onChange={(e) => {
                  setFormTemplateName(e.target.value);
                  // Clear validation error when user types
                  if (error === 'Template name and content cannot be empty.') {
                     setError(null);
                  }
               }}
               className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
               placeholder="e.g., Welcome Email Q1"
             />
           </div>
           <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                 Template Content
               </label>
               {/* Conditionally show Edit Content button */}
               {formMode === 'edit' && isEditorReadOnly && (
                 <button
                   type="button"
                   onClick={() => setIsEditorReadOnly(false)}
                   className="mb-2 px-3 py-1 bg-yellow-500 text-white text-sm rounded-md hover:bg-yellow-600"
                 >
                   Edit Content
                 </button>
               )}
               <RichTextEditor
                 content={editorContent}
                 onChange={handleEditorChange}
                 placeholder="Enter your email template HTML here. Use {{column_name}} for placeholders..."
                 readOnly={isEditorReadOnly} // Pass readOnly state
               />
            </div>
             {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
            <div className="flex justify-end space-x-3 mt-4"> {/* Added margin-top */}
              <button
                onClick={() => setShowForm(false)} // Use unified state
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
              >
                Cancel
               </button>
               {/* Disable save/update if editor is read-only */}
               <button
                 onClick={handleSaveTemplate} // Use unified handler
                 className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                 disabled={isSaving || !formTemplateName || !editorContent || isEditorReadOnly}
               >
                 {isSaving ? 'Saving...' : (formMode === 'create' ? 'Save Template' : 'Update Template')}
               </button>
           </div>
        </div>
      )}
    </div>
  );
}
