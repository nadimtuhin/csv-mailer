'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

export default function UnsubscribePage() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [alreadyUnsubscribed, setAlreadyUnsubscribed] = useState(false);
  const [unsubscribed, setUnsubscribed] = useState(false);
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (!token) {
      setError('Invalid unsubscribe link');
      setLoading(false);
      return;
    }

    // Verify token and get email
    fetch(`/api/unsubscribe?token=${encodeURIComponent(token)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
        } else {
          setEmail(data.email);
          setAlreadyUnsubscribed(data.alreadyUnsubscribed);
        }
        setLoading(false);
      })
      .catch(() => {
        setError('Failed to verify unsubscribe link');
        setLoading(false);
      });
  }, [token]);

  const handleUnsubscribe = async () => {
    if (!token) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, reason: reason.trim() || undefined }),
      });

      const data = await res.json();

      if (data.error) {
        setError(data.error);
      } else {
        setUnsubscribed(true);
      }
    } catch {
      setError('Failed to process unsubscribe request');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-8">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
              <svg
                className="h-6 w-6 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
            <h2 className="mt-4 text-2xl font-bold text-gray-900">Error</h2>
            <p className="mt-2 text-gray-600">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (unsubscribed || alreadyUnsubscribed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-8">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
              <svg
                className="h-6 w-6 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h2 className="mt-4 text-2xl font-bold text-gray-900">
              {alreadyUnsubscribed
                ? 'Already Unsubscribed'
                : 'Successfully Unsubscribed'}
            </h2>
            <p className="mt-2 text-gray-600">
              {alreadyUnsubscribed
                ? `${email} was already unsubscribed from our emails.`
                : `${email} has been unsubscribed from future emails.`}
            </p>
            <p className="mt-4 text-sm text-gray-500">
              You will no longer receive emails from us.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-8">
        <div className="text-center mb-6">
          <h2 className="text-3xl font-bold text-gray-900">Unsubscribe</h2>
          <p className="mt-2 text-gray-600">
            We are sorry to see you go!
          </p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-blue-800">
            <strong>Email:</strong> {email}
          </p>
        </div>

        <div className="mb-6">
          <label
            htmlFor="reason"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Why are you unsubscribing? (Optional)
          </label>
          <textarea
            id="reason"
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="Too many emails, not relevant, etc."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </div>

        <button
          onClick={handleUnsubscribe}
          disabled={loading}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Processing...' : 'Confirm Unsubscribe'}
        </button>

        <p className="mt-4 text-xs text-center text-gray-500">
          By clicking confirm, you will stop receiving emails from us.
        </p>
      </div>
    </div>
  );
}
