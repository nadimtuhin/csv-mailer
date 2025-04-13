import type { Metadata } from 'next';
import HomePageClient from '@/components/HomePageClient'; // Import the new client component

// Metadata can be defined in a Server Component
export const metadata: Metadata = {
  title: 'CSV Mailer - Home',
  description: 'Welcome to CSV Mailer. Create and manage email campaigns.',
};

// This is now a Server Component
export default function Home() {
  // Render the client component which handles fetching and displaying data
  return <HomePageClient />;
}
