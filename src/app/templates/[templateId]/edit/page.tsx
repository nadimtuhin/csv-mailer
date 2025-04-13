import type { Metadata } from 'next';
import { Template } from '@/types'; // Import type for metadata fetch
import EditTemplatePageClient from '@/components/EditTemplatePageClient'; // Import the client component

interface EditTemplatePageProps {
  params: { templateId: string };
}

// Function to generate dynamic metadata (runs on server)
export async function generateMetadata(
  { params }: EditTemplatePageProps
): Promise<Metadata> {
  const templateId = params.templateId;

  try {
    // Fetch minimal data needed for title
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/templates/${templateId}?fields=name`); // Adjust URL if needed
    if (!response.ok) {
      console.error(`Failed to fetch template name for metadata: ${response.status}`);
      return {
        title: `Edit Template ${templateId} - CSV Mailer`,
        description: `Edit template ${templateId}.`,
      };
    }
    const template: Pick<Template, 'name'> = await response.json();
    const title = template.name ? `Edit: ${template.name}` : `Edit Template ${templateId}`;

    return {
      title: `${title} - CSV Mailer`,
      description: `Edit the email template "${template.name || templateId}".`,
    };
  } catch (error) {
    console.error("Error fetching template metadata:", error);
    return {
      title: `Edit Template ${templateId} - CSV Mailer`,
      description: `Edit template ${templateId}.`,
    };
  }
}

// This is now a Server Component
export default function EditTemplatePage({ params }: EditTemplatePageProps) {
  // Pass the templateId from params to the client component
  return <EditTemplatePageClient templateId={params.templateId} />;
}
