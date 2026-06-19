'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase-client';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Mail, Lock, User, ArrowRight, Loader2, Check, X, GraduationCap } from 'lucide-react';

const NEON = '#00F0FF';
const BG = '#09090B';
const CARD = '#111116';
const TEXT = '#F0F2F5';
const TEXT_SEC = '#7A8BA0';
const TEXT_DIM = '#4A5568';
const BORDER = 'rgba(255,255,255,0.06)';
const NEON_BORDER = 'rgba(0,240,255,0.15)';
const NEON_BG = 'rgba(0,240,255,0.06)';
const NEON_GLOW = '0 0 20px rgba(0,240,255,0.25)';

interface PasswordStrength {
  score: number;
  label: string;
  color: string;
  checks: { label: string; met: boolean }[];
}

function getPasswordStrength(password: string): PasswordStrength {
  const checks = [
    { label: 'At least 8 characters', met: password.length >= 8 },
    { label: 'One uppercase letter', met: /[A-Z]/.test(password) },
    { label: 'One lowercase letter', met: /[a-z]/.test(password) },
    { label: 'One number', met: /[0-9]/.test(password) },
    { label: 'One special character', met: /[^A-Za-z0-9]/.test(password) },
  ];

  const score = checks.filter((c) => c.met).length;

  let label = 'Very weak';
  let color = '#EF4444';
  if (score >= 5) { label = 'Strong'; color = '#00F0FF'; }
  else if (score >= 4) { label = 'Good'; color = '#22D3EE'; }
  else if (score >= 3) { label = 'Fair'; color = '#FBBF24'; }
  else if (score >= 2) { label = 'Weak'; color = '#F97316'; }

  return { score, label, color, checks };
}

export default function SignupPage() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const supabase = createClient();
  const strength = getPasswordStrength(password);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (strength.score < 3) {
      setError('Password is too weak. Please meet at least 3 of the requirements.');
      return;
    }

    setLoading(true);

    try {
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (signUpError) {
        setError(signUpError.message);
        return;
      }

      setSuccess(true);
    } catch {
      setError('An unexpected error occurred. Please try again.');
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
    color: TEXT_DIM,
  };

  const focusInput = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.style.borderColor = NEON;
    e.target.style.boxShadow = '0 0 0 2px rgba(0,240,255,0.15)';
  };

  const blurInput = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.style.borderColor = BORDER;
    e.target.style.boxShadow = 'none';
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
          Create your account
        </h1>
        <p style={{ fontSize: 15, color: TEXT_SEC }}>
          Start your intelligent learning journey today
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

        {success ? (
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
            <p style={{ fontSize: 14, color: TEXT_SEC, marginBottom: 8 }}>
              We&apos;ve sent a verification link to
            </p>
            <p style={{ fontSize: 15, fontWeight: 600, color: NEON, marginBottom: 24 }}>
              {email}
            </p>
            <p style={{ fontSize: 13, color: TEXT_DIM, marginBottom: 24 }}>
              Click the link in the email to verify your account and start using Academic Copilot.
            </p>
            <Link
              href="/login"
              className="inline-flex no-underline"
              style={{
                padding: '10px 24px',
                borderRadius: 10,
                fontSize: 14,
                fontWeight: 600,
                color: TEXT,
                border: `1px solid ${BORDER}`,
              }}
            >
              Back to Login
            </Link>
          </motion.div>
        ) : (
          <form onSubmit={handleSignup} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label htmlFor="fullName" style={labelStyle}>Full Name</label>
              <div style={{ position: 'relative' }}>
                <User style={iconStyle} />
                <input
                  id="fullName"
                  type="text"
                  placeholder="John Doe"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  style={inputStyle}
                  onFocus={focusInput}
                  onBlur={blurInput}
                />
              </div>
            </div>

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
                  onFocus={focusInput}
                  onBlur={blurInput}
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" style={labelStyle}>Password</label>
              <div style={{ position: 'relative' }}>
                <Lock style={iconStyle} />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Create a strong password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  style={{ ...inputStyle, paddingRight: 44 }}
                  onFocus={focusInput}
                  onBlur={blurInput}
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
                    color: TEXT_DIM,
                    display: 'flex',
                  }}
                >
                  {showPassword ? <EyeOff style={{ width: 18, height: 18 }} /> : <Eye style={{ width: 18, height: 18 }} />}
                </button>
              </div>

              {password && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  style={{ marginTop: 10 }}
                >
                  <div className="flex items-center" style={{ gap: 8, marginBottom: 8 }}>
                    <div
                      style={{
                        flex: 1,
                        height: 4,
                        borderRadius: 9999,
                        background: 'rgba(255,255,255,0.06)',
                        overflow: 'hidden',
                      }}
                    >
                      <motion.div
                        style={{
                          height: '100%',
                          borderRadius: 9999,
                          backgroundColor: strength.color,
                          boxShadow: strength.score >= 4 ? `0 0 8px ${strength.color}` : 'none',
                        }}
                        initial={{ width: 0 }}
                        animate={{ width: `${(strength.score / 5) * 100}%` }}
                        transition={{ duration: 0.3 }}
                      />
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 500, color: strength.color }}>
                      {strength.label}
                    </span>
                  </div>
                  <div className="grid grid-cols-2" style={{ gap: 4 }}>
                    {strength.checks.map((check) => (
                      <div key={check.label} className="flex items-center" style={{ gap: 6 }}>
                        {check.met ? (
                          <Check style={{ width: 12, height: 12, color: NEON, flexShrink: 0 }} />
                        ) : (
                          <X style={{ width: 12, height: 12, color: '#2A2A35', flexShrink: 0 }} />
                        )}
                        <span style={{ fontSize: 12, color: check.met ? TEXT_SEC : '#2A2A35' }}>
                          {check.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </div>

            <div>
              <label htmlFor="confirmPassword" style={labelStyle}>Confirm Password</label>
              <div style={{ position: 'relative' }}>
                <Lock style={iconStyle} />
                <input
                  id="confirmPassword"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Confirm your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  style={{
                    ...inputStyle,
                    paddingRight: 44,
                    borderColor:
                      confirmPassword && confirmPassword !== password
                        ? 'rgba(239,68,68,0.4)'
                        : BORDER,
                  }}
                  onFocus={focusInput}
                  onBlur={(e) => {
                    e.target.style.borderColor =
                      confirmPassword && confirmPassword !== password
                        ? 'rgba(239,68,68,0.4)'
                        : BORDER;
                    e.target.style.boxShadow = 'none';
                  }}
                />
                {confirmPassword && (
                  <div
                    style={{
                      position: 'absolute',
                      right: 14,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      display: 'flex',
                    }}
                  >
                    {confirmPassword === password ? (
                      <Check style={{ width: 18, height: 18, color: NEON }} />
                    ) : (
                      <X style={{ width: 18, height: 18, color: '#EF4444' }} />
                    )}
                  </div>
                )}
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
                  Create Account
                  <ArrowRight style={{ width: 16, height: 16 }} />
                </>
              )}
            </button>
          </form>
        )}

        {!success && (
          <div
            className="text-center"
            style={{
              marginTop: 24,
              paddingTop: 24,
              borderTop: `1px solid ${BORDER}`,
            }}
          >
            <p style={{ fontSize: 14, color: TEXT_SEC }}>
              Already have an account?{' '}
              <Link
                href="/login"
                className="no-underline"
                style={{ color: NEON, fontWeight: 600 }}
              >
                Sign in
              </Link>
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
