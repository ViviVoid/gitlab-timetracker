'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';

export default function DashboardPage() {
  const router = useRouter();
  const { user, isAuthenticated, clearAuth } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
    }
  }, [isAuthenticated, router]);

  const handleLogout = () => {
    clearAuth();
    router.push('/login');
  };

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500">
      <div className="container mx-auto p-6">
        {/* Header */}
        <div className="mb-6 rounded-lg bg-white p-6 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">GitLab Time Tracker</h1>
              <p className="mt-1 text-gray-600">Welcome back, {user.name}!</p>
            </div>
            <button
              onClick={handleLogout}
              className="rounded-md bg-red-600 px-4 py-2 text-white hover:bg-red-700"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Setup Instructions */}
        <div className="rounded-lg bg-white p-8 shadow-lg">
          <h2 className="mb-4 text-2xl font-bold text-gray-900">Getting Started</h2>
          
          <div className="space-y-6">
            <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-6">
              <h3 className="mb-2 text-lg font-semibold text-indigo-900">Step 1: Connect GitLab</h3>
              <p className="text-indigo-700">
                Add your GitLab instance URL and create a personal access token to get started.
              </p>
              <button className="mt-4 rounded-md bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700">
                Add GitLab Connection
              </button>
            </div>

            <div className="rounded-lg border border-purple-200 bg-purple-50 p-6">
              <h3 className="mb-2 text-lg font-semibold text-purple-900">Step 2: Select Project</h3>
              <p className="text-purple-700">
                Choose a GitLab project to track time entries from.
              </p>
            </div>

            <div className="rounded-lg border border-pink-200 bg-pink-50 p-6">
              <h3 className="mb-2 text-lg font-semibold text-pink-900">Step 3: View Analytics</h3>
              <p className="text-pink-700">
                See cumulative time charts, team statistics, and detailed time entry breakdowns.
              </p>
            </div>
          </div>

          <div className="mt-8 rounded-lg border border-gray-200 bg-gray-50 p-6">
            <h3 className="mb-3 text-lg font-semibold text-gray-900">Features</h3>
            <ul className="space-y-2 text-gray-700">
              <li className="flex items-center">
                <span className="mr-2">✓</span>
                <span>Sync time entries from GitLab issues automatically</span>
              </li>
              <li className="flex items-center">
                <span className="mr-2">✓</span>
                <span>Visualize cumulative time with beautiful charts</span>
              </li>
              <li className="flex items-center">
                <span className="mr-2">✓</span>
                <span>Filter by date range, milestone, or team member</span>
              </li>
              <li className="flex items-center">
                <span className="mr-2">✓</span>
                <span>Export reports to CSV, PDF, or Excel</span>
              </li>
              <li className="flex items-center">
                <span className="mr-2">✓</span>
                <span>Secure token storage with Azure Key Vault</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
