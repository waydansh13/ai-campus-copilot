'use client';

import { Suspense, useState } from 'react';
import { createClient } from '@/lib/supabase-client';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Mail, Lock, ArrowRight, Loader2, GraduationCap } from 'lucide-react';

const NEON = '#00F0FF';
const BG = '#09090B';
const CARD = '#111116';
const TEXT = '#F0F2F5';
const TEXT_SEC = '#7A8BA0';
const BORDER = 'rgba(255,255,255,0.06)';
const NEON_BORDER = 'rgba(0,240,255,0.15)';
const NEON_BG = 'rgba(0,240,255,0.06)';
const NEON_GLOW = '0 0 20px rgba(0,240,255,0.25)';

function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [showResetForm, setShowResetForm] = useState(false);
  const [resetEmail, setResetEmail] = useState('');

  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirectTo') || '/dashboard';
  const authError = searchParams.get('error');

  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        if (signInError.message.includes('Email not confirmed')) {
          setError('Please verify your email before signing in. Check your inbox.');
        } else {
          setError(signInError.message);
        }
        return;
      }

      router.push(redirectTo);
      router.refresh();
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        resetEmail,
        {
          redirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
        }
      );

      if (resetError) {
        setError(resetError.message);
        return;
      }

      setResetSent(true);
    } catch {
      setError('An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    height: 48,
    padding: '0 16px 0 44px',
    fontSize: 15,
    color: TEXT,
    background: 'rgba(255,255,255,0.04)',
    border: `1px solid ${BORDER}`,
    borderRadius: 12,
    outline: 'none',
    transition: 'border-color 0.15s, box-shadow 0.15s',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: 14,
    fontWeight: 500,
    color: TEXT_SEC,
    marginBottom: 6,
  };

  const iconStyle: React.CSSProperties = {
    position: 'absolute',
    left: 14,
    top: '50%',
    transform: 'translateY(-50%)',
    width: 18,
    height: 18,
    color: '#4A5568',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' as const }}
    >
      <div className="text-center" style={{ marginBottom: 32 }}>
        <Link href="/" className="inline-flex items-center no-underline" style={{ gap: 10, marginBottom: 24 }}>
          <div
            className="flex items-center justify-center"
            style={{ width: 40, height: 40, borderRadius: 12, background: NEON, boxShadow: NEON_GLOW }}
          >
            <GraduationCap style={{ width: 20, height: 20, color: BG }} />
          </div>
          <span style={{ fontSize: 20, fontWeight: 700, color: TEXT }}>Academic Copilot</span>
        </Link>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: TEXT, marginBottom: 8 }}>
          {showResetForm ? 'Reset Password' : 'Welcome back'}
        </h1>
        <p style={{ fontSize: 15, color: TEXT_SEC }}>
          {showResetForm
            ? 'Enter your email to receive a reset link'
            : 'Sign in to continue your learning journey'}
        </p>
      </div>

      <div
        style={{
          padding: 32,
          borderRadius: 16,
          background: CARD,
          border: `1px solid ${BORDER}`,
          boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
        }}
      >
        {authError && (
          <div
            style={{
              marginBottom: 16,
              padding: 12,
              borderRadius: 12,
              background: 'rgba(239,68,68,0.08)',
              border: '1px solid rgba(239,68,68,0.2)',
              color: '#F87171',
              fontSize: 14,
            }}
          >
            Authentication error. Please try again.
          </div>
        )}

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              marginBottom: 16,
              padding: 12,
              borderRadius: 12,
              background: 'rgba(239,68,68,0.08)',
              border: '1px solid rgba(239,68,68,0.2)',
              color: '#F87171',
              fontSize: 14,
            }}
          >
            {error}
          </motion.div>
        )}

        {showResetForm ? (
          resetSent ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center"
              style={{ padding: '16px 0' }}
            >
              <div
                className="flex items-center justify-center mx-auto"
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 9999,
                  background: NEON_BG,
                  border: `1px solid ${NEON_BORDER}`,
                  marginBottom: 16,
                }}
              >
                <Mail style={{ width: 24, height: 24, color: NEON }} />
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 600, color: TEXT, marginBottom: 8 }}>
                Check your email
              </h3>
              <p style={{ fontSize: 14, color: TEXT_SEC, marginBottom: 24 }}>
                We&apos;ve sent a password reset link to{' '}
                <strong style={{ color: TEXT }}>{resetEmail}</strong>
              </p>
              <button
                onClick={() => { setShowResetForm(false); setResetSent(false); }}
                style={{
                  padding: '10px 24px',
                  borderRadius: 10,
                  fontSize: 14,
                  fontWeight: 600,
                  color: TEXT,
                  background: 'transparent',
                  border: `1px solid ${BORDER}`,
                  cursor: 'pointer',
                }}
              >
                Back to Login
              </button>
            </motion.div>
          ) : (
            <form onSubmit={handlePasswordReset} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label htmlFor="reset-email" style={labelStyle}>Email Address</label>
                <div style={{ position: 'relative' }}>
                  <Mail style={iconStyle} />
                  <input
                    id="reset-email"
                    type="email"
                    placeholder="you@university.edu"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    required
                    style={inputStyle}
                    onFocus={(e) => {
                      e.target.style.borderColor = NEON;
                      e.target.style.boxShadow = '0 0 0 2px rgba(0,240,255,0.15)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = BORDER;
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%',
                  height: 48,
                  borderRadius: 12,
                  fontSize: 15,
                  fontWeight: 600,
                  color: BG,
                  background: NEON,
                  border: 'none',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.7 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: NEON_GLOW,
                }}
              >
                {loading ? (
                  <Loader2 style={{ width: 18, height: 18 }} className="animate-spin" />
                ) : (
                  'Send Reset Link'
                )}
              </button>

              <button
                type="button"
                onClick={() => setShowResetForm(false)}
                style={{
                  width: '100%',
                  textAlign: 'center',
                  fontSize: 14,
                  color: TEXT_SEC,
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                Back to Login
              </button>
            </form>
          )
        ) : (
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label htmlFor="email" style={labelStyle}>Email Address</label>
              <div style={{ position: 'relative' }}>
                <Mail style={iconStyle} />
                <input
                  id="email"
                  type="email"
                  placeholder="you@university.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  style={inputStyle}
                  onFocus={(e) => {
                    e.target.style.borderColor = NEON;
                    e.target.style.boxShadow = '0 0 0 2px rgba(0,240,255,0.15)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = BORDER;
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between" style={{ marginBottom: 6 }}>
                <label htmlFor="password" style={{ ...labelStyle, marginBottom: 0 }}>Password</label>
                <button
                  type="button"
                  onClick={() => { setShowResetForm(true); setResetEmail(email); }}
                  style={{
                    fontSize: 13,
                    color: NEON,
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontWeight: 500,
                  }}
                >
                  Forgot password?
                </button>
              </div>
              <div style={{ position: 'relative' }}>
                <Lock style={iconStyle} />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  style={{ ...inputStyle, paddingRight: 44 }}
                  onFocus={(e) => {
                    e.target.style.borderColor = NEON;
                    e.target.style.boxShadow = '0 0 0 2px rgba(0,240,255,0.15)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = BORDER;
                    e.target.style.boxShadow = 'none';
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: 14,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#4A5568',
                    display: 'flex',
                  }}
                >
                  {showPassword ? <EyeOff style={{ width: 18, height: 18 }} /> : <Eye style={{ width: 18, height: 18 }} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                height: 48,
                borderRadius: 12,
                fontSize: 15,
                fontWeight: 600,
                color: BG,
                background: NEON,
                border: 'none',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                marginTop: 8,
                boxShadow: NEON_GLOW,
              }}
            >
              {loading ? (
                <Loader2 style={{ width: 18, height: 18 }} className="animate-spin" />
              ) : (
                <>
                  Sign In
                  <ArrowRight style={{ width: 16, height: 16 }} />
                </>
              )}
            </button>
          </form>
        )}

        {!showResetForm && (
          <div
            className="text-center"
            style={{
              marginTop: 24,
              paddingTop: 24,
              borderTop: `1px solid ${BORDER}`,
            }}
          >
            <p style={{ fontSize: 14, color: TEXT_SEC }}>
              Don&apos;t have an account?{' '}
              <Link
                href="/signup"
                className="no-underline"
                style={{ color: NEON, fontWeight: 600 }}
              >
                Create one
              </Link>
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center" style={{ padding: '80px 0' }}>
        <div
          className="animate-spin"
          style={{
            width: 32,
            height: 32,
            border: '2px solid rgba(0,240,255,0.2)',
            borderTopColor: NEON,
            borderRadius: 9999,
          }}
        />
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
