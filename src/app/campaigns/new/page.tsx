import type { Metadata } from 'next';
import NewCampaignPageClient from '@/components/NewCampaignPageClient'; // Import the client component

// Metadata can be defined in a Server Component
export const metadata: Metadata = {
  title: 'CSV Mailer - New Campaign',
  description: 'Create a new email campaign by uploading a CSV file and configuring settings.',
};

// This is now a Server Component
export default function NewCampaignPage() {
  // Render the client component which handles the form logic
  return <NewCampaignPageClient />;
}
