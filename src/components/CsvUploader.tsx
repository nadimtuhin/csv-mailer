'use client';

import React, { useState, useCallback } from 'react';
import Papa from 'papaparse';

// Define the expected structure of a row after parsing
// Ensure 'email' column is present, allow others
interface CsvRow {
  email: string;
  [key: string]: string | number | boolean;
}

interface CsvUploaderProps {
  // Callback to pass parsed data and headers up to the parent component (Home)
  onDataParsed: (data: CsvRow[], headers: string[]) => void;
  // Callback to clear data if needed
  onClearData: () => void;
}

export default function CsvUploader({ onDataParsed, onClearData }: CsvUploaderProps) {
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [parsing, setParsing] = useState(false);
  const [rowCount, setRowCount] = useState(0);

  const handleFileChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setError(null);
      setFileName(null);
      setRowCount(0);
      onClearData(); // Clear previous data in parent
      const file = event.target.files?.[0];

      if (!file) {
        return;
      }

      if (file.type !== 'text/csv' && !file.name.toLowerCase().endsWith('.csv')) {
        setError('Invalid file type. Please upload a CSV file.');
        return;
      }

      setFileName(file.name);
      setParsing(true);

      Papa.parse<CsvRow>(file, {
        header: true, // Assumes first row is header
        skipEmptyLines: true,
        complete: (results) => {
          setParsing(false);
          if (results.errors.length > 0) {
            console.error('CSV Parsing Errors:', results.errors);
            setError(`Error parsing CSV: ${results.errors[0].message}`);
            onClearData();
            return;
          }

          const headers = results.meta.fields;
          if (!headers || headers.length === 0) {
             setError('Could not detect headers in the CSV file.');
             onClearData();
             return;
          }

          // Validate that an 'email' column exists (case-insensitive check)
          const emailHeader = headers.find(h => h.toLowerCase() === 'email');
          if (!emailHeader) {
              setError("CSV must contain an 'email' column.");
              onClearData();
              return;
          }

          // Ensure data conforms to CsvRow, especially the 'email' field
          const validData = results.data.filter(row => row.email && typeof row.email === 'string');

          if (validData.length !== results.data.length) {
              console.warn("Some rows were filtered out due to missing or invalid 'email' field.");
              // Optionally inform the user more explicitly
          }

          if (validData.length === 0) {
              setError("No valid rows with an 'email' field found in the CSV.");
              onClearData();
              return;
          }

          setRowCount(validData.length);
          // Pass validated data and original headers up
          onDataParsed(validData, headers);
          setError(null); // Clear any previous error
        },
        error: (err) => {
          setParsing(false);
          console.error('CSV Parsing Failed:', err);
          setError(`Failed to parse CSV: ${err.message}`);
          onClearData();
        },
      });
    },
    [onDataParsed, onClearData] // Add dependencies
  );

  // Function to reset the input and state
  const handleClear = () => {
    setError(null);
    setFileName(null);
    setRowCount(0);
    onClearData();
    // Reset the file input element
    const input = document.getElementById('csvFileInput') as HTMLInputElement;
    if (input) {
      input.value = '';
    }
  };


  return (
    <div className="space-y-4">
      <input
        id="csvFileInput"
        type="file"
        accept=".csv, text/csv"
        onChange={handleFileChange}
        className="block w-full text-sm text-gray-500
          file:mr-4 file:py-2 file:px-4
          file:rounded-md file:border-0
          file:text-sm file:font-semibold
          file:bg-blue-50 file:text-blue-700
          hover:file:bg-blue-100"
        disabled={parsing}
      />
      {parsing && <p className="text-sm text-gray-600">Parsing CSV...</p>}
      {fileName && !parsing && (
        <div className="text-sm text-green-700 bg-green-50 p-3 rounded-md flex justify-between items-center">
          <span>
            Uploaded: <strong>{fileName}</strong> ({rowCount} valid rows found)
          </span>
           <button
              onClick={handleClear}
              className="ml-4 text-xs text-red-600 hover:text-red-800 font-medium"
              title="Clear uploaded file"
            >
              Clear
            </button>
        </div>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
      <p className="text-xs text-gray-500">
        Upload a CSV file with at least an &#39;email&#39; column. The first row should contain headers.
      </p>
    </div>
  );
}
