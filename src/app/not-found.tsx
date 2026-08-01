'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { FileQuestion, Home, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  const router = useRouter();

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="text-center max-w-md bg-white border border-gray-200 rounded-lg p-8">
        <div className="w-24 h-24 bg-primary-50 flex items-center justify-center mx-auto mb-6 rounded-lg">
          <FileQuestion className="w-12 h-12 text-primary-500" />
        </div>

        <h1 className="text-6xl font-bold text-gray-900 mb-4">404</h1>

        <h2 className="text-2xl font-semibold text-gray-800 mb-3">Page Not Found</h2>

        <p className="text-gray-600 mb-8">
          The page you are looking for does not exist or has been moved. Please check the URL or
          navigate back to the homepage.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary-600 text-white font-medium hover:bg-primary-700 transition-colors rounded-md"
          >
            <Home className="w-4 h-4" />
            Back to Home
          </Link>

          <button
            onClick={() => router.back()}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors rounded-md"
          >
            <ArrowLeft className="w-4 h-4" />
            Go Back
          </button>
        </div>
      </div>
    </div>
  );
}
