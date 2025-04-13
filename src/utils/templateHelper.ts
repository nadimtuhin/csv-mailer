// Define recipient data structure (can be shared)
interface RecipientData {
    email: string;
    [key: string]: unknown;
}

// Function to replace placeholders like {{column_name}} in HTML
export function mergeDataIntoTemplate(
  template: string,
  data: RecipientData
): string {
  let mergedHtml = template;
  // Match {{ column_name }} or {{column_name}}
  const placeholderRegex = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;

  mergedHtml = mergedHtml.replace(placeholderRegex, (match, key) => {
    // Check if the key exists in the data object (case-sensitive)
    if (Object.prototype.hasOwnProperty.call(data, key)) {
      // Convert value to string for replacement
      return String(data[key] ?? ''); // Use empty string for null/undefined
    }
    return match; // Keep the original placeholder if key not found
  });

  return mergedHtml;
}
