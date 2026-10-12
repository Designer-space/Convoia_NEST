'use client';

import { useState } from 'react';
import Link from 'next/link';
import { apiRequest } from '@/lib/api';
import { setAccessToken } from '@/lib/authStore';

function passwordStrength(password) {
  let score = 0;
  if (password.length >= 8) score += 1;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^a-zA-Z0-9]/.test(password)) score += 1;
  return score;
}

const STRENGTH_LABELS = ['', 'Weak', 'Fair', 'Good', 'Strong'];
const STRENGTH_COLORS = [
  'bg-t-border',
  'bg-red-500',
  'bg-amber-500',
  'bg-blue-500',
  'bg-green-500',
];

export default function RegisterPage() {
  const [form, setForm] = useState({
    name: '',
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const strength = passwordStrength(form.password);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (strength < 2) {
      setError('Please use a stronger password');
      return;
    }

    setIsLoading(true);
    try {
      const data = await apiRequest({
        url: '/auth/register',
        method: 'POST',
        data: {
          name: form.name,
          username: form.username,
          email: form.email,
          password: form.password,
        },
      });

      if (!data?.accessToken) throw new Error('Registration failed');
      setAccessToken(data.accessToken);
      window.location.href = '/chat';
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  const inputClass =
    'w-full rounded-lg border border-t-border bg-background px-4 py-3 text-foreground outline-none placeholder:text-t-muted focus:border-t-primary focus:ring-2 focus:ring-t-primary';
  const labelClass = 'mb-2 block text-sm font-medium text-foreground';

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
                  d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
                />
              </svg>
            </div>
            <h2 className="text-3xl font-bold text-foreground">Create Account</h2>
            <p className="mt-2 text-t-muted">Join us today and start chatting</p>
          </div>

          {error && (
            <div
              role="alert"
              className="mb-6 rounded-lg border border-red-300 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20"
            >
              <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            <div>
              <label htmlFor="name" className={labelClass}>
                Full Name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                autoComplete="name"
                value={form.name}
                onChange={handleChange}
                required
                className={inputClass}
                placeholder="John Doe"
              />
            </div>

            <div>
              <label htmlFor="username" className={labelClass}>
                Username
              </label>
              <input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                value={form.username}
                onChange={handleChange}
                required
                className={inputClass}
                placeholder="johndoe"
              />
            </div>

            <div>
              <label htmlFor="email" className={labelClass}>
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                value={form.email}
                onChange={handleChange}
                required
                className={inputClass}
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label htmlFor="password" className={labelClass}>
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={form.password}
                  onChange={handleChange}
                  required
                  className={`${inputClass} pr-16`}
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
              {form.password && (
                <div className="mt-2">
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-xs text-t-muted">Password strength</span>
                    <span className="text-xs font-medium text-foreground">
                      {STRENGTH_LABELS[strength]}
                    </span>
                  </div>
                  <div className="flex gap-1" aria-hidden="true">
                    {[1, 2, 3, 4].map((level) => (
                      <div
                        key={level}
                        className={`h-1 flex-1 rounded ${
                          level <= strength ? STRENGTH_COLORS[strength] : 'bg-t-border'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div>
              <label htmlFor="confirmPassword" className={labelClass}>
                Confirm Password
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirm ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={form.confirmPassword}
                  onChange={handleChange}
                  required
                  className={`${inputClass} pr-16`}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((v) => !v)}
                  aria-label={showConfirm ? 'Hide password' : 'Show password'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-t-muted hover:text-foreground"
                >
                  {showConfirm ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-lg bg-t-primary py-3 font-semibold text-white transition hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-t-primary disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoading ? 'Creating account…' : 'Create Account'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-t-muted">
            Already have an account?{' '}
            <Link href="/login" className="font-semibold text-t-primary hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
