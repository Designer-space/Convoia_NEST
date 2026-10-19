'use client';

import { useState } from 'react';
import Link from 'next/link';
import { apiRequest } from '@/lib/api';
import { setAccessToken } from '@/lib/authStore';
import ThemeToggle from '../components/ThemeToggle';
import Wordmark from '../components/Wordmark';

function passwordStrength(password) {
  let score = 0;
  if (password.length >= 8) score += 1;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^a-zA-Z0-9]/.test(password)) score += 1;
  return score;
}

const STRENGTH_LABELS = ['', 'Weak', 'Fair', 'Good', 'Strong'];

// Weak/strong is feedback, not brand colour: it uses the semantic tokens so it
// reads the same in all four themes.
const STRENGTH_COLOURS = [
  'bg-t-border',
  'bg-t-danger',
  'bg-t-warning',
  'bg-t-primary',
  'bg-t-primary',
];

const FIELD =
  'w-full rounded-lg border border-t-border-strong bg-background px-3.5 py-2.5 text-foreground outline-none placeholder:text-t-muted focus:border-t-primary';
const LABEL = 'mb-1.5 block text-[13px] font-medium text-foreground';

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

  return (
    <div className="grid min-h-full md:grid-cols-[1.05fr_1fr]">
      <section className="hidden flex-col justify-between border-r border-t-border bg-t-surface p-10 md:flex">
        <Wordmark size="lg" />
        <div className="rise-in">
          <p className="font-display max-w-[15ch] text-[44px] text-foreground">
            Start with your name.
          </p>
          <p className="mt-5 max-w-sm text-sm leading-6 text-t-muted">
            Add the people you talk to most, then keep the conversation going wherever you
            are.
          </p>
        </div>
        <p className="text-xs text-t-muted">
          You can change your details later from your profile.
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
          <h1 className="text-[26px] font-semibold text-foreground">Create an account</h1>
          <p className="mt-1.5 text-sm text-t-muted">
            Two details and you are in. Everything else can wait.
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
              <label htmlFor="name" className={LABEL}>
                Name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                autoComplete="name"
                value={form.name}
                onChange={handleChange}
                required
                className={FIELD}
                placeholder="Aarav Mehta"
              />
            </div>

            <div>
              <label htmlFor="username" className={LABEL}>
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
                className={FIELD}
                placeholder="aarav"
              />
            </div>

            <div>
              <label htmlFor="email" className={LABEL}>
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                value={form.email}
                onChange={handleChange}
                required
                className={FIELD}
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label htmlFor="password" className={LABEL}>
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
              {form.password && (
                <div className="mt-2">
                  <div className="mb-1.5 flex items-center justify-between">
                    <span className="text-xs text-t-muted">Password strength</span>
                    <span className="text-xs font-medium text-foreground">
                      {STRENGTH_LABELS[strength]}
                    </span>
                  </div>
                  <div className="flex gap-1" aria-hidden="true">
                    {[1, 2, 3, 4].map((level) => (
                      <div
                        key={level}
                        className={`h-1 flex-1 rounded-full ${
                          level <= strength ? STRENGTH_COLOURS[strength] : 'bg-t-border'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div>
              <label htmlFor="confirmPassword" className={LABEL}>
                Confirm password
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
                  className={`${FIELD} pr-20`}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((v) => !v)}
                  aria-label={showConfirm ? 'Hide password' : 'Show password'}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-md px-2.5 py-1.5 text-[13px] font-medium text-t-muted transition-colors hover:bg-t-hover hover:text-foreground"
                >
                  {showConfirm ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="mt-2 w-full rounded-lg bg-t-primary py-2.5 text-sm font-semibold text-t-on-primary transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading ? 'Creating account…' : 'Create account'}
            </button>
          </form>

          <p className="mt-6 text-sm text-t-muted">
            Already have an account?{' '}
            <Link href="/login" className="font-medium text-t-primary hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </section>
    </div>
  );
}
