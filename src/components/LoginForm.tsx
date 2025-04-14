'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation'; // Use next/navigation for App Router

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams(); // Hook to read query parameters

  // Check for signup success message on initial load
  useEffect(() => {
    if (searchParams.get('signupSuccess') === 'true') {
      setSuccessMessage('Account created successfully! Please log in.');
      // Optional: remove the query param from URL without reloading
      // router.replace('/login', { scroll: false }); // Use replace to avoid adding to history
    }
  }, [searchParams, router]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccessMessage(null); // Clear success message on new attempt
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || `Login failed: ${response.statusText}`);
      } else {
        // Login successful, redirect to the dashboard
        console.log('Login successful:', data);
        // Redirect to dashboard page after successful login
        // Use window.location.href for a full page reload to ensure auth state is picked up correctly
        window.location.href = '/dashboard';
      }
    } catch (err) {
      console.error('Login fetch error:', err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-md mx-auto p-8 border rounded-lg shadow-md bg-white">
      <h2 className="text-2xl font-semibold text-center text-gray-800">Log In</h2>
      {error && <p className="text-red-500 text-sm text-center bg-red-100 p-2 rounded">{error}</p>}
      {successMessage && <p className="text-green-600 text-sm text-center bg-green-100 p-2 rounded">{successMessage}</p>}
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700">
          Email address
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          placeholder="you@example.com"
          disabled={isLoading}
        />
      </div>
      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-700">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          placeholder="********"
          disabled={isLoading}
        />
      </div>
      <div>
        <button
          type="submit"
          disabled={isLoading}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Logging In...' : 'Log In'}
        </button>
      </div>
      <div className="text-center text-sm">
        <p className="text-gray-600">
          Don't have an account?{' '}
          <a href="/signup" className="font-medium text-indigo-600 hover:text-indigo-500">
            Sign up
          </a>
        </p>
      </div>
    </form>
  );
}
