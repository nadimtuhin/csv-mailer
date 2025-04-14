'use client'; // Make it a client component to handle interaction

'use client'; // Make it a client component to handle interaction

import Link from 'next/link';
import React from 'react';
// Removed unused useRouter import

const Navbar = () => {
  // Removed unused router variable

  const handleLogout = async () => {
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
      });

      if (response.ok) {
        // Redirect to login page after successful logout
        // Use window.location to ensure full page refresh and state clearing
        window.location.href = '/login';
      } else {
        console.error('Logout failed:', await response.text());
        // Optionally show an error message to the user
      }
    } catch (error) {
      console.error('Logout request failed:', error);
      // Optionally show an error message to the user
    }
  };

  // Removed placeholder isLoggedIn variable and TODO comment

  return (
    <nav className="bg-gray-800 p-4">
      <div className="container mx-auto flex justify-between items-center">
        <Link href="/" className="text-white text-lg font-bold">
          CSV Mailer
        </Link>
        <div className="space-x-4 flex items-center">
          {/* Links for logged-in users */}
          <Link href="/" className="text-gray-300 hover:text-white">
            Home
          </Link>
          <Link href="/campaigns" className="text-gray-300 hover:text-white">
            Campaigns
          </Link>
          <Link href="/templates" className="text-gray-300 hover:text-white">
            Templates
          </Link>
          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className="bg-red-600 hover:bg-red-700 text-white py-1 px-3 rounded text-sm"
          >
            Logout
          </button>
          {/* Removed commented-out block for Login/Signup links */}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
