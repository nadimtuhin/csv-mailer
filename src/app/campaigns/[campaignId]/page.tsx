import type { Metadata } from 'next';
import type { Campaign } from '@prisma/client'; // Import type for metadata fetch
import CampaignDetailPageClient from '@/components/CampaignDetailPageClient'; // Import the client component

interface CampaignDetailPageProps {
  params: { campaignId: string };
}

// Function to generate dynamic metadata (runs on server)
export async function generateMetadata(
  { params }: CampaignDetailPageProps
): Promise<Metadata> {
  const campaignId = params.campaignId;

  try {
    // Fetch minimal data needed for title
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/campaigns/${campaignId}?fields=name`); // Adjust URL if needed
    if (!response.ok) {
      console.error(`Failed to fetch campaign name for metadata: ${response.status}`);
      return {
        title: `Campaign ${campaignId} - CSV Mailer`,
        description: `Details for campaign ${campaignId}.`,
      };
    }
    const campaign: Pick<Campaign, 'name'> = await response.json();
    const title = campaign.name ? `Campaign: ${campaign.name}` : `Campaign ${campaignId}`;

    return {
      title: `${title} - CSV Mailer`,
      description: `Details and recipient status for campaign ${campaign.name || campaignId}.`,
    };
  } catch (error) {
    console.error("Error fetching campaign metadata:", error);
    return {
      title: `Campaign ${campaignId} - CSV Mailer`,
      description: `Details for campaign ${campaignId}.`,
    };
  }
}

// This is now a Server Component
export default function CampaignDetailPage({ params }: CampaignDetailPageProps) {
  // Pass the campaignId from params to the client component
  return <CampaignDetailPageClient campaignId={params.campaignId} />;
}
