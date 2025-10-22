'use client';

import { useState } from 'react';
import { signIn } from '@/lib/auth/helpers';

export default function SignInPage() {
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError('');

    try {
      const result = await signIn(formData);
      if (result?.error) {
        setError(result.error);
      }
    } catch (err) {
      // redirect() throws an error, which is expected behavior
      if (err instanceof Error && !err.message.includes('NEXT_REDIRECT')) {
        setError('An unexpected error occurred');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0A0A0A] px-4">
      {/* Gradient background effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] via-transparent to-transparent" />
      <div className="absolute top-0 left-1/4 h-96 w-96 rounded-full bg-white/[0.01] blur-3xl" />
      <div className="absolute bottom-0 right-1/4 h-96 w-96 rounded-full bg-white/[0.01] blur-3xl" />

      <div className="relative z-10 w-full max-w-md">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mb-3 inline-flex items-center justify-center rounded-2xl bg-white/[0.03] px-4 py-2 backdrop-blur-sm border border-white/[0.05]">
            <span className="text-sm font-medium text-white/90">ASP Workout Platform</span>
          </div>
          <h1 className="text-gradient mb-3 text-4xl font-bold tracking-tight">
            Welcome Back
          </h1>
          <p className="text-white/50 text-sm">
            Sign in to continue to your dashboard
          </p>
        </div>

        {/* Main Card */}
        <div className="glass-card shadow-premium-lg rounded-2xl p-8">
          <form action={handleSubmit} className="space-y-5">
            {/* Error Message */}
            {error && (
              <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-4 backdrop-blur-sm">
                <div className="flex items-start gap-3">
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-500/20">
                    <svg className="h-3 w-3 text-red-400" fill="currentColor" viewBox="0 0 12 12">
                      <path d="M6 0a6 6 0 100 12A6 6 0 006 0zm0 10a1 1 0 110-2 1 1 0 010 2zm0-3a1 1 0 01-1-1V3a1 1 0 112 0v3a1 1 0 01-1 1z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-red-400">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Email Input */}
            <div className="space-y-2">
              <label htmlFor="email" className="block text-sm font-medium text-white/90">
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder="athlete1@elitebaseball.com"
                className="input-premium"
              />
            </div>

            {/* Password Input */}
            <div className="space-y-2">
              <label htmlFor="password" className="block text-sm font-medium text-white/90">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                placeholder="••••••••"
                className="input-premium"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Signing in...
                </span>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/[0.06]" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-[#0A0A0A] px-3 text-white/40">Test Credentials</span>
            </div>
          </div>

          {/* Test Credentials */}
          <div className="rounded-xl bg-white/[0.02] border border-white/[0.05] p-4">
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-white/50">Athlete:</span>
                <code className="rounded bg-white/[0.05] px-2 py-1 font-mono text-white/70">
                  athlete1@elitebaseball.com
                </code>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-white/50">Coach:</span>
                <code className="rounded bg-white/[0.05] px-2 py-1 font-mono text-white/70">
                  coach1@elitebaseball.com
                </code>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-white/50">Owner:</span>
                <code className="rounded bg-white/[0.05] px-2 py-1 font-mono text-white/70">
                  owner@elitebaseball.com
                </code>
              </div>
              <div className="mt-3 border-t border-white/[0.05] pt-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-white/50">Password:</span>
                  <code className="rounded bg-white/[0.05] px-2 py-1 font-mono text-white/70">
                    password123
                  </code>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-xs text-white/30">
          Professional baseball & softball training management
        </p>
      </div>
    </div>
  );
}
