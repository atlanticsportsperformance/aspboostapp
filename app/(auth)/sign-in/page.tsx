'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { signIn } from '@/lib/auth/helpers';

export default function SignInPage() {
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const searchParams = useSearchParams();

  useEffect(() => {
    const errorParam = searchParams.get('error');
    if (errorParam === 'account_inactive') {
      setError('Your account has been deactivated. Please contact your coach or administrator for assistance.');
    }
  }, [searchParams]);

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
      {/* Animated gradient background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-[#9BDDFF]/5 via-transparent to-transparent" />
        <div className="absolute top-0 right-0 h-[600px] w-[600px] rounded-full bg-[#9BDDFF]/5 blur-[120px] animate-pulse-slow" />
        <div className="absolute bottom-0 left-0 h-[500px] w-[500px] rounded-full bg-[#7BC5F0]/5 blur-[100px] animate-pulse-slower" />
      </div>

      {/* Grid pattern overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.02)_1px,transparent_1px)] bg-[size:72px_72px] [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_80%)]" />

      <div className="relative z-10 w-full max-w-md">
        {/* Logo / Brand */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#9BDDFF] via-[#B0E5FF] to-[#7BC5F0] shadow-2xl shadow-[#9BDDFF]/30">
            <span className="text-2xl font-bold text-black">A</span>
          </div>
          <h1 className="mb-2 text-4xl font-bold tracking-tight text-white sm:text-5xl">
            ASP <span className="bg-gradient-to-r from-[#9BDDFF] to-[#7BC5F0] bg-clip-text text-transparent">Boost+</span>
          </h1>
          <p className="text-sm text-white/50 sm:text-base">
            Professional Athlete Performance Platform
          </p>
        </div>

        {/* Main Card */}
        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur-xl sm:p-10">
          {/* Card glow effect */}
          <div className="absolute -top-24 left-1/2 h-48 w-48 -translate-x-1/2 rounded-full bg-[#9BDDFF]/10 blur-3xl" />

          <div className="relative">
            {/* Welcome Text */}
            <div className="mb-8 text-center">
              <h2 className="mb-1 text-2xl font-bold text-white">Welcome Back</h2>
              <p className="text-sm text-white/60">Sign in to access your training dashboard</p>
            </div>

            <form action={handleSubmit} className="space-y-6">
              {/* Error Message */}
              {error && (
                <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 backdrop-blur-sm animate-shake">
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
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                    <svg className="h-5 w-5 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                    </svg>
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    placeholder="your.email@example.com"
                    className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-12 pr-4 text-white placeholder-white/40 backdrop-blur-sm transition-all duration-200 focus:border-[#9BDDFF]/50 focus:bg-white/10 focus:outline-none focus:ring-2 focus:ring-[#9BDDFF]/20"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label htmlFor="password" className="block text-sm font-medium text-white/90">
                    Password
                  </label>
                  <button
                    type="button"
                    className="text-xs text-[#9BDDFF] hover:text-[#7BC5F0] transition-colors"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                    <svg className="h-5 w-5 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    placeholder="••••••••••••"
                    className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-12 pr-4 text-white placeholder-white/40 backdrop-blur-sm transition-all duration-200 focus:border-[#9BDDFF]/50 focus:bg-white/10 focus:outline-none focus:ring-2 focus:ring-[#9BDDFF]/20"
                  />
                </div>
              </div>

              {/* Remember Me */}
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 rounded border-white/10 bg-white/5 text-[#9BDDFF] focus:ring-2 focus:ring-[#9BDDFF]/20 focus:ring-offset-0"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-white/70">
                  Remember me for 30 days
                </label>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="group relative w-full overflow-hidden rounded-xl bg-gradient-to-r from-[#9BDDFF] to-[#7BC5F0] py-3.5 font-semibold text-black shadow-lg shadow-[#9BDDFF]/25 transition-all duration-300 hover:shadow-xl hover:shadow-[#9BDDFF]/40 disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.98]"
              >
                <span className="relative z-10 flex items-center justify-center gap-2">
                  {loading ? (
                    <>
                      <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Signing in...
                    </>
                  ) : (
                    <>
                      Sign In
                      <svg className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </>
                  )}
                </span>
                <div className="absolute inset-0 -z-0 bg-gradient-to-r from-[#7BC5F0] to-[#9BDDFF] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
              </button>
            </form>

            {/* Security Badge */}
            <div className="mt-8 flex items-center justify-center gap-2 text-xs text-white/40">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <span>Secured with industry-standard encryption</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center">
          <p className="text-xs text-white/30">
            &copy; 2025 Atlantic Sports Performance. All rights reserved.
          </p>
        </div>
      </div>

      <style jsx>{`
        @keyframes pulse-slow {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.5; }
        }
        @keyframes pulse-slower {
          0%, 100% { opacity: 0.2; }
          50% { opacity: 0.4; }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
          20%, 40%, 60%, 80% { transform: translateX(4px); }
        }
        .animate-pulse-slow {
          animation: pulse-slow 8s ease-in-out infinite;
        }
        .animate-pulse-slower {
          animation: pulse-slower 10s ease-in-out infinite;
        }
        .animate-shake {
          animation: shake 0.5s ease-in-out;
        }
      `}</style>
    </div>
  );
}
