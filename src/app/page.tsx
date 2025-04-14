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
    // Use a very light solid background, increase vertical padding
    <div className="flex flex-col items-center min-h-screen bg-slate-50 px-4 py-16 md:py-24">
      {/* Hero Section - Increased bottom margin */}
      <main className="max-w-3xl text-center mb-20 md:mb-32">
        {/* Slightly larger heading, darker text, tighter leading */}
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-slate-900 mb-6 leading-tight tracking-tight">
          Welcome to CSV Mailer
        </h1>
        {/* Slightly darker paragraph text, increased line height */}
        <p className="text-lg md:text-xl text-slate-600 mb-12 leading-relaxed">
          The simplest way to send personalized emails to your audience using a CSV file.
          Upload your list, use our template editor, and reach your contacts effectively.
        </p>
        {/* Consistent button styles, slightly larger */}
        <div className="flex flex-col sm:flex-row justify-center items-center gap-5">
          <Link
            href="/signup"
            className="w-full sm:w-auto inline-block bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 px-8 rounded-lg shadow-md hover:shadow-lg transition duration-300 ease-in-out text-lg"
          >
            Get Started - Sign Up
          </Link>
          <Link
            href="/login"
            className="w-full sm:w-auto inline-block bg-white hover:bg-slate-100 text-indigo-600 font-medium py-3 px-8 rounded-lg border border-slate-300 hover:border-slate-400 shadow-sm hover:shadow transition duration-300 ease-in-out text-lg"
          >
            Log In
          </Link>
        </div>
      </main>

      {/* How to Use Section - Increased spacing, darker text, refined cards */}
      <section className="w-full max-w-5xl px-4 mb-20 md:mb-32">
        {/* Darker heading, increased bottom margin */}
        <h2 className="text-3xl md:text-4xl font-semibold text-slate-800 mb-12 md:mb-16 text-center">How It Works</h2>
        <div className="grid md:grid-cols-3 gap-8 md:gap-12">
          {/* Step Card - Increased padding, softer shadow, darker text */}
          <div className="bg-white p-8 rounded-xl shadow-lg text-center transition-shadow duration-300 hover:shadow-xl">
            <div className="text-indigo-600 mb-5">
              {/* Placeholder Icon - Adjusted size/stroke */}
              {/* eslint-disable-next-line react/no-unescaped-entities */}
              <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 inline-block" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
            </div>
            <h3 className="text-xl font-semibold text-slate-800 mb-3">1. Upload CSV</h3>
            <p className="text-slate-600 text-base leading-relaxed">Prepare your contact list with columns for email and personalization fields (like <code>'name'</code>). Upload it easily.</p>
          </div>
          {/* Step Card */}
          <div className="bg-white p-8 rounded-xl shadow-lg text-center transition-shadow duration-300 hover:shadow-xl">
             <div className="text-indigo-600 mb-5">
               {/* Placeholder Icon */}
               {/* eslint-disable-next-line react/no-unescaped-entities */}
               <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 inline-block" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
            </div>
            <h3 className="text-xl font-semibold text-slate-800 mb-3">2. Design Template</h3>
            <p className="text-slate-600 text-base leading-relaxed">Use our rich text editor or upload DOCX. Insert placeholders like <code>{`{{name}}`}</code>.</p>
          </div>
          {/* Step Card */}
          <div className="bg-white p-8 rounded-xl shadow-lg text-center transition-shadow duration-300 hover:shadow-xl">
             <div className="text-indigo-600 mb-5">
               {/* Placeholder Icon */}
               {/* eslint-disable-next-line react/no-unescaped-entities */}
               <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 inline-block" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
            </div>
            <h3 className="text-xl font-semibold text-slate-800 mb-3">3. Send Emails</h3>
            <p className="text-slate-600 text-base leading-relaxed">Configure sender details, preview, and send or schedule your campaign.</p>
          </div>
        </div>
      </section>

      {/* Features Section - Darker text, refined list style */}
      <section className="w-full max-w-4xl px-4 mb-20 md:mb-32">
        <h2 className="text-3xl md:text-4xl font-semibold text-slate-800 mb-12 md:mb-16 text-center">Core Features</h2>
        <div className="bg-white p-8 md:p-10 rounded-xl shadow-lg">
          {/* Use grid for better alignment on larger screens */}
          <div className="grid md:grid-cols-2 gap-x-10 gap-y-6">
          {[
            "Easy CSV Upload: Quickly import your contact lists.",
            "Rich Text Editor: Craft beautiful HTML emails directly in the app.",
            "DOCX Template Upload: Use your existing Word documents as templates.",
            "Personalization: Use placeholders (e.g., <code>{`{{column_name}}`}</code>) to tailor emails.",
            "Campaign Management: Track status (pending, sent, failed).",
            "Recipient Tracking: See the status for each individual email.",
            "Scheduling: Send campaigns at the optimal time (Pro Feature).",
            "Template Saving: Reuse your email designs for future campaigns."
          ].map((feature, index) => (
            <div key={index} className="flex items-start space-x-3">
              {/* Checkmark Icon */}
              <svg className="h-6 w-6 text-indigo-500 flex-shrink-0 mt-0.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              {/* Use dangerouslySetInnerHTML for the code tag within the string */}
              <span className="text-slate-700 leading-relaxed" dangerouslySetInnerHTML={{ __html: feature.replace('<code>{{column_name}}</code>', '<code>{`{{column_name}}`}</code>') }}></span>
            </div>
          ))}
          </div>
        </div>
      </section>

      {/* Pricing Tiers Section - Refined card styles, spacing, typography */}
      <section className="w-full max-w-5xl px-4 mb-20 md:mb-32">
        <h2 className="text-3xl md:text-4xl font-semibold text-slate-800 mb-12 md:mb-16 text-center">Choose Your Plan</h2>
        <div className="grid md:grid-cols-2 gap-8 md:gap-12">
          {/* Free Tier Card - Softer border, consistent padding */}
          <div className="border border-slate-200 rounded-xl p-8 shadow-lg bg-white flex flex-col">
            <h3 className="text-2xl font-semibold text-slate-800 mb-4 text-center">Free</h3>
            <p className="text-slate-500 text-center mb-8 flex-grow">Perfect for getting started and small campaigns.</p>
            <ul className="space-y-4 text-slate-700 mb-10">
              {[
                "Up to 100 emails per campaign",
                "Up to 5 campaigns per month",
                "CSV Upload",
                "Rich Text Editor",
                "Basic Personalization",
                "Template Saving (up to 3)",
                "Campaign Tracking"
              ].map((item, index) => (
                <li key={index} className="flex items-center space-x-3">
                  {/* Checkmark Icon */}
                  <svg className="h-5 w-5 text-green-500 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
            <div className="text-center mt-auto pt-6"> {/* Added top padding */}
               <Link href="/signup" className="w-full block bg-white hover:bg-slate-100 text-indigo-600 font-medium py-3 px-8 rounded-lg border border-slate-300 hover:border-slate-400 shadow-sm hover:shadow transition duration-300 text-lg">
                 Sign Up for Free
               </Link>
            </div>
          </div>
          {/* Pro Tier Card - Consistent padding, refined badge */}
          <div className="border-2 border-indigo-600 rounded-xl p-8 shadow-xl bg-white relative flex flex-col">
             <span className="absolute top-0 right-8 -mt-4 bg-indigo-600 text-white text-xs font-bold px-4 py-1 rounded-full shadow-md">POPULAR</span>
            <h3 className="text-2xl font-semibold text-indigo-600 mb-4 text-center">Pro</h3>
            <p className="text-slate-500 text-center mb-8 flex-grow">For power users and larger campaigns.</p>
            <ul className="space-y-4 text-slate-700 mb-10">
               {[
                "Everything in Free, plus:",
                "Unlimited emails per campaign*",
                "Unlimited campaigns per month",
                "DOCX Template Upload",
                "Advanced Personalization Options",
                "Unlimited Template Saving",
                "Email Scheduling",
                "Priority Support",
                "Detailed Analytics (Coming Soon)"
              ].map((item, index) => (
                <li key={index} className={`flex items-center space-x-3 ${index === 0 ? 'text-indigo-600 font-semibold' : ''}`}>
                   {/* Checkmark Icon or Star for first item */}
                   <svg className={`h-5 w-5 ${index === 0 ? 'text-indigo-600' : 'text-green-500'} flex-shrink-0`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
             <div className="text-center mt-auto pt-6"> {/* Added top padding */}
               <Link href="/signup?plan=pro" className="w-full block bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 px-8 rounded-lg shadow-md hover:shadow-lg transition duration-300 text-lg">
                 Go Pro
               </Link>
               <p className="text-xs text-slate-500 mt-4">*Subject to fair use and provider limits.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer - Darker text */}
      <footer className="mt-24 md:mt-32 text-slate-500 text-sm">
        © {new Date().getFullYear()} CSV Mailer. All rights reserved.
      </footer>
    </div>
  );
}
