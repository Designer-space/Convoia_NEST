'use client';

import { useState } from 'react';
import Link from 'next/link';
import { apiRequest } from '@/lib/api';
import { setAccessToken } from '@/lib/authStore';

function safeRedirect() {
  if (typeof window === 'undefined') return '/chat';
  const target = new URLSearchParams(window.location.search).get('redirect');
  // Only allow same-site relative paths to avoid open redirects.
  if (target && target.startsWith('/') && !target.startsWith('//')) return target;
  return '/chat';
}

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const data = await apiRequest({
        url: '/auth/login',
        method: 'POST',
        data: { email, password },
      });

      if (!data?.accessToken) throw new Error('Login failed');

      setAccessToken(data.accessToken);
      window.location.href = safeRedirect();
    } catch (err) {
      setError(
        err.response?.data?.message || err.message || 'An error occurred during login',
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-t-border bg-t-surface p-8 shadow-sm">
          <div className="mb-8 text-center">
            <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-t-primary">
              <svg
                className="h-8 w-8 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
            </div>
            <h2 className="text-3xl font-bold text-foreground">Welcome Back</h2>
            <p className="mt-2 text-t-muted">Sign in to continue to your account</p>
          </div>

          {error && (
            <div
              role="alert"
              className="mb-6 rounded-lg border border-red-300 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20"
            >
              <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6" noValidate>
            <div>
              <label
                htmlFor="email"
                className="mb-2 block text-sm font-medium text-foreground"
              >
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full rounded-lg border border-t-border bg-background px-4 py-3 text-foreground outline-none placeholder:text-t-muted focus:border-t-primary focus:ring-2 focus:ring-t-primary"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-sm font-medium text-foreground"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full rounded-lg border border-t-border bg-background px-4 py-3 pr-16 text-foreground outline-none placeholder:text-t-muted focus:border-t-primary focus:ring-2 focus:ring-t-primary"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-t-muted hover:text-foreground"
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-lg bg-t-primary py-3 font-semibold text-white transition hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-t-primary disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-t-muted">
            Don&apos;t have an account?{' '}
            <Link href="/register" className="font-semibold text-t-primary hover:underline">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
