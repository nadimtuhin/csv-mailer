'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import RichTextEditor from '@/components/RichTextEditor'; // Assuming this path is correct
import { Template } from '@/types'; // Assuming types are defined here

const EditTemplatePage = () => {
    const router = useRouter();
    const params = useParams();
    const templateId = params.templateId as string;

    const [template, setTemplate] = useState<Template | null>(null);
    const [name, setName] = useState('');
    // Subject removed as it's not in the Template type
    const [htmlContent, setHtmlContent] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchTemplate = useCallback(async () => {
        if (!templateId) return;
        setIsLoading(true);
        setError(null);
        try {
            const response = await fetch(`/api/templates/${templateId}`);
            if (!response.ok) {
                throw new Error(`Failed to fetch template: ${response.statusText}`);
            }
            const data: Template = await response.json();
            setTemplate(data);
            setName(data.name);
            // Set htmlContent instead of subject/body
            setHtmlContent(data.htmlContent);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred');
            console.error("Fetch error:", err);
        } finally {
            setIsLoading(false);
        }
    }, [templateId]);

    useEffect(() => {
        fetchTemplate();
    }, [fetchTemplate]);

    const handleSave = async () => {
        if (!templateId) return;
        setIsSaving(true);
        setError(null);
        try {
            const response = await fetch(`/api/templates/${templateId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                // Send htmlContent instead of subject/body
                body: JSON.stringify({ name, htmlContent }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `Failed to update template: ${response.statusText}`);
            }
            // Optionally show a success message or redirect
            router.push('/templates'); // Redirect back to the templates list after saving
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred');
            console.error("Save error:", err);
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return <div className="container mx-auto p-4">Loading template...</div>;
    }

    if (error && !template) {
        // Show error only if template couldn't be loaded initially
        return <div className="container mx-auto p-4 text-red-500">Error: {error}</div>;
    }

    if (!template) {
         // Should ideally not happen if not loading and no error, but good practice
        return <div className="container mx-auto p-4">Template not found.</div>;
    }

    return (
        <div className="container mx-auto p-4">
            <h1 className="text-2xl font-bold mb-4">Edit Template: {template.name}</h1>

            {error && <div className="mb-4 p-3 bg-red-100 text-red-700 border border-red-400 rounded">Error: {error}</div>}

            <div className="mb-4">
                <label htmlFor="templateName" className="block text-sm font-medium text-gray-700 mb-1">
                    Template Name
                </label>
                <input
                    type="text"
                    id="templateName"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    disabled={isSaving}
                />
            </div>

            {/* Subject field removed */}

            <div className="mb-4">
                 <label className="block text-sm font-medium text-gray-700 mb-1">
                    Content
                </label>
                {/* Pass htmlContent to 'content' prop and setHtmlContent to 'onChange' */}
                <RichTextEditor content={htmlContent} onChange={setHtmlContent} readOnly={isSaving} />
                 <p className="mt-2 text-sm text-gray-500">
                    Use {'{{placeholder}}'} for variables (e.g., {'{{name}}'}, {'{{email}}'}).
                </p>
            </div>

            <div className="flex justify-end space-x-2">
                 <button
                    type="button"
                    onClick={() => router.back()} // Go back to previous page
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    disabled={isSaving}
                >
                    Cancel
                </button>
                <button
                    type="button"
                    onClick={handleSave}
                    disabled={isSaving || isLoading}
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                >
                    {isSaving ? 'Saving...' : 'Save Template'}
                </button>
            </div>
        </div>
    );
};

export default EditTemplatePage;
