import type { Metadata } from 'next';
import CampaignsListPageClient from '@/components/CampaignsListPageClient'; // Import the client component

// Metadata can be defined in a Server Component
export const metadata: Metadata = {
  title: 'CSV Mailer - Campaigns',
  description: 'View and manage your email campaigns.',
};

// This is now a Server Component
export default function CampaignsListPage() {
  // Render the client component which handles fetching and displaying data
  return <CampaignsListPageClient />;
}
