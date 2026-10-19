'use client';

import { useState } from 'react';
import Link from 'next/link';
import { apiRequest } from '@/lib/api';
import { setAccessToken } from '@/lib/authStore';
import ThemeToggle from '../components/ThemeToggle';
import Wordmark from '../components/Wordmark';

function safeRedirect() {
  if (typeof window === 'undefined') return '/chat';
  const target = new URLSearchParams(window.location.search).get('redirect');
  // Only allow same-site relative paths to avoid open redirects.
  if (target && target.startsWith('/') && !target.startsWith('//')) return target;
  return '/chat';
}

const FIELD =
  'w-full rounded-lg border border-t-border-strong bg-background px-3.5 py-2.5 text-foreground outline-none placeholder:text-t-muted focus:border-t-primary';

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
    <div className="grid min-h-full md:grid-cols-[1.05fr_1fr]">
      {/* Brand side: the only place the display serif gets to speak up. */}
      <section className="hidden flex-col justify-between border-r border-t-border bg-t-surface p-10 md:flex">
        <Wordmark size="lg" />
        <div className="rise-in">
          <p className="font-display max-w-[15ch] text-[44px] text-foreground">
            Conversations, kept close.
          </p>
          <p className="mt-5 max-w-sm text-sm leading-6 text-t-muted">
            Direct messages and group threads with the people you already know. Nothing to
            configure, nothing to scroll past.
          </p>
        </div>
        <p className="text-xs text-t-muted">
          Your conversations stay private to the people in them.
        </p>
      </section>

      <section className="flex flex-col px-5 py-6 sm:px-8 sm:py-10">
        <div className="mb-8 flex items-center justify-between gap-3 md:justify-end">
          <span className="md:hidden">
            <Wordmark />
          </span>
          <ThemeToggle />
        </div>

        <div className="mx-auto w-full max-w-sm">
          <h1 className="text-[26px] font-semibold text-foreground">Sign in</h1>
          <p className="mt-1.5 text-sm text-t-muted">
            Pick up your conversations where you left them.
          </p>

          {error && (
            <div
              role="alert"
              className="mt-6 rounded-lg border border-t-danger bg-t-danger-surface px-3.5 py-3"
            >
              <p className="text-[13px] font-medium text-t-danger">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
            <div>
              <label htmlFor="email" className="mb-1.5 block text-[13px] font-medium text-foreground">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className={FIELD}
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-1.5 block text-[13px] font-medium text-foreground"
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
                  className={`${FIELD} pr-20`}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-md px-2.5 py-1.5 text-[13px] font-medium text-t-muted transition-colors hover:bg-t-hover hover:text-foreground"
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="mt-2 w-full rounded-lg bg-t-primary py-2.5 text-sm font-semibold text-t-on-primary transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <p className="mt-6 text-sm text-t-muted">
            New here?{' '}
            <Link href="/register" className="font-medium text-t-primary hover:underline">
              Create an account
            </Link>
          </p>
        </div>
      </section>
    </div>
  );
}
