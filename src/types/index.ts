// Shared type definitions

export interface CsvRow {
  email: string;
  // Allow any other string keys with unknown value types initially
  // Components consuming this might need further validation/casting
  [key: string]: unknown;
}

export interface Template {
  id: string;
  name: string;
  htmlContent: string;
  createdAt: string; // Stored as ISO string
  updatedAt: string; // Stored as ISO string
}

export interface CampaignResult {
    type: 'success' | 'error';
    message: string;
    campaignId?: string;
}

// Add other shared types here as needed, e.g., CampaignSummary, CampaignDetails
