import type { Metadata } from 'next';
import Link from 'next/link'; // Import Link for navigation

// Metadata for the landing page
export const metadata: Metadata = {
  title: 'CSV Mailer - Send Personalized Emails Easily',
  description: 'Upload your CSV, design your template, and send personalized emails effortlessly.',
};

// This is the Landing Page (Server Component)
export default function LandingPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 text-center px-4">
      <main className="max-w-2xl">
        <h1 className="text-4xl md:text-5xl font-bold text-gray-800 mb-4">
          Welcome to CSV Mailer
        </h1>
        <p className="text-lg md:text-xl text-gray-600 mb-8">
          The simplest way to send personalized emails to your audience using a CSV file.
          Upload your list, use our template editor, and reach your contacts effectively.
        </p>
        <div className="space-x-4">
          <Link
            href="/signup"
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-6 rounded-lg shadow-md transition duration-300 ease-in-out"
          >
            Get Started - Sign Up
          </Link>
          <Link
            href="/login"
            className="bg-white hover:bg-gray-100 text-indigo-600 font-semibold py-3 px-6 rounded-lg border border-indigo-600 shadow-md transition duration-300 ease-in-out"
          >
            Log In
          </Link>
        </div>
      </main>

      {/* How to Use Section */}
      <section className="mt-16 w-full max-w-4xl px-4 text-left">
        <h2 className="text-3xl font-semibold text-gray-800 mb-6 text-center">How It Works</h2>
        <div className="grid md:grid-cols-3 gap-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-indigo-600 mb-3 text-center">
              {/* Placeholder Icon (replace with actual SVG or icon component) */}
              {/* eslint-disable-next-line react/no-unescaped-entities */}
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 inline-block" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}><path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2 text-center">1. Upload CSV</h3>
            <p className="text-gray-600 text-sm">Prepare your contact list with columns for email and any personalization fields (like <code>'name'</code>, <code>'company'</code>). Upload it easily.</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
             <div className="text-indigo-600 mb-3 text-center">
               {/* Placeholder Icon */}
               {/* eslint-disable-next-line react/no-unescaped-entities */}
               <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 inline-block" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2 text-center">2. Design Template</h3>
            <p className="text-gray-600 text-sm">Use our rich text editor or upload a DOCX template. Insert placeholders like <code>{`{{name}}`}</code> for personalization.</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
             <div className="text-indigo-600 mb-3 text-center">
               {/* Placeholder Icon */}
               {/* eslint-disable-next-line react/no-unescaped-entities */}
               <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 inline-block" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2 text-center">3. Send Emails</h3>
            <p className="text-gray-600 text-sm">Configure sender details, preview your emails, and send your campaign immediately or schedule it for later.</p>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="mt-16 w-full max-w-4xl px-4 text-left">
        <h2 className="text-3xl font-semibold text-gray-800 mb-6 text-center">Features</h2>
        <ul className="list-disc list-inside space-y-2 text-gray-700 bg-white p-6 rounded-lg shadow">
          <li>Easy CSV Upload: Quickly import your contact lists.</li>
          <li>Rich Text Editor: Craft beautiful HTML emails directly in the app.</li>
          <li>DOCX Template Upload: Use your existing Word documents as templates.</li>
          <li>Personalization: Use placeholders (e.g., <code>{`{{column_name}}`}</code>) to tailor emails.</li>
          <li>Campaign Management: Track status (pending, sent, failed) for each campaign.</li>
          <li>Recipient Tracking: See the status for each individual email recipient.</li>
          <li>Scheduling: Send campaigns at the optimal time (Pro Feature).</li>
          <li>Template Saving: Reuse your email designs for future campaigns.</li>
          {/* Add more features as needed */}
        </ul>
      </section>

      {/* Pricing Tiers Section */}
      <section className="mt-16 w-full max-w-4xl px-4 text-left">
        <h2 className="text-3xl font-semibold text-gray-800 mb-6 text-center">Plans & Pricing</h2>
        <div className="grid md:grid-cols-2 gap-8">
          {/* Free Tier */}
          <div className="border border-gray-200 rounded-lg p-6 shadow bg-white">
            <h3 className="text-2xl font-semibold text-gray-700 mb-4 text-center">Free</h3>
            <p className="text-gray-600 text-center mb-6">Perfect for getting started and small campaigns.</p>
            <ul className="list-disc list-inside space-y-2 text-gray-700 mb-6">
              <li>Up to 100 emails per campaign</li>
              <li>Up to 5 campaigns per month</li>
              <li>CSV Upload</li>
              <li>Rich Text Editor</li>
              <li>Basic Personalization</li>
              <li>Template Saving (up to 3)</li>
              <li>Campaign Tracking</li>
            </ul>
            <div className="text-center">
               <Link href="/signup" className="text-indigo-600 hover:text-indigo-800 font-semibold">
                 Sign Up for Free
               </Link>
            </div>
          </div>
          {/* Pro Tier */}
          <div className="border-2 border-indigo-600 rounded-lg p-6 shadow-lg bg-white relative">
             <span className="absolute top-0 right-0 bg-indigo-600 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">POPULAR</span>
            <h3 className="text-2xl font-semibold text-indigo-700 mb-4 text-center">Pro</h3>
            <p className="text-gray-600 text-center mb-6">For power users and larger campaigns.</p>
            <ul className="list-disc list-inside space-y-2 text-gray-700 mb-6">
              <li><strong>Everything in Free, plus:</strong></li>
              <li>Unlimited emails per campaign*</li>
              <li>Unlimited campaigns per month</li>
              <li>DOCX Template Upload</li>
              <li>Advanced Personalization Options</li>
              <li>Unlimited Template Saving</li>
              <li>Email Scheduling</li>
              <li>Priority Support</li>
              <li>Detailed Analytics (Coming Soon)</li>
            </ul>
             <div className="text-center">
               <Link href="/signup?plan=pro" className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-lg shadow transition duration-300">
                 Go Pro
               </Link>
               <p className="text-xs text-gray-500 mt-2">*Subject to fair use and email provider limits.</p>
            </div>
          </div>
        </div>
      </section>

      <footer className="mt-16 mb-8 text-gray-500 text-sm">
        © {new Date().getFullYear()} CSV Mailer. All rights reserved.
      </footer>
    </div>
  );
}
