import Link from 'next/link';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-12 bg-gray-50">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-8 text-gray-800">CSV Mailer</h1>
        <p className="text-lg text-gray-600 mb-10">
          Create and manage email campaigns based on CSV data.
        </p>

        <div className="flex flex-col sm:flex-row justify-center gap-4">
           <Link
             href="/campaigns/new"
             className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-md shadow hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
           >
             Create New Campaign
           </Link>
           <Link
             href="/campaigns"
             className="px-6 py-3 bg-gray-200 text-gray-700 font-semibold rounded-md shadow hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
           >
             View Campaigns
           </Link>
           <Link
             href="/templates"
             className="px-6 py-3 bg-gray-200 text-gray-700 font-semibold rounded-md shadow hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
           >
             Manage Templates
           </Link>
        </div>
      </div>
    </main>
  );
}
