import type { Metadata } from 'next';
import TemplateManager from '@/components/TemplateManager';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'CSV Mailer - Manage Templates',
  description: 'Manage your email templates, create new ones, or upload existing templates.',
};

export default function TemplatesPage() {
  return (
    <main className="flex min-h-screen flex-col items-center p-12 bg-gray-50">
       <div className="w-full max-w-4xl">
         <div className="mb-8 flex justify-between items-center">
            <h1 className="text-3xl font-bold text-gray-800">Manage Templates</h1>
            <Link href="/" className="text-blue-600 hover:text-blue-800 hover:underline">
              &larr; Back to Mailer
            </Link>
         </div>
        <section className="bg-white p-6 rounded-lg shadow">
           {/* Render the existing TemplateManager component here */}
           <TemplateManager />
         </section>
       </div>
    </main>
  );
}
