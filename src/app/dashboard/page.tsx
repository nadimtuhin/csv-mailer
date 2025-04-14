import type { Metadata } from 'next';
import HomePageClient from '@/components/HomePageClient'; // Import the client component
import Navbar from '@/components/Navbar'; // Import Navbar

// Metadata for the dashboard page
export const metadata: Metadata = {
  title: 'CSV Mailer - Dashboard',
  description: 'Manage your email campaigns and templates.',
};

// This is the Dashboard Page (Server Component)
// It's protected by the middleware
export default function DashboardPage() {
  return (
    <div>
      <Navbar /> {/* Include the standard navbar */}
      <div className="container mx-auto px-4 py-8">
        {/* Render the client component which handles fetching and displaying user data */}
        <HomePageClient />
      </div>
    </div>
  );
}
