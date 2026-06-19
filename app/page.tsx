'use client';

import type { CSSProperties } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  BookOpen,
  Brain,
  Mic,
  Users,
  Library,
  ArrowRight,
  Sparkles,
  GraduationCap,
  Zap,
  ChevronRight,
  Quote,
  Check,
} from 'lucide-react';

/* ─── Neon Colors  */
const NEON = '#00F0FF';
const NEON_DIM = 'rgba(0,240,255,0.6)';
const NEON_BG = 'rgba(0,240,255,0.06)';
const NEON_BORDER = 'rgba(0,240,255,0.12)';
const NEON_GLOW = '0 0 20px rgba(0,240,255,0.25)';
const BG = '#09090B';
const CARD = '#111116';
const TEXT = '#F0F2F5';
const TEXT_SEC = '#7A8BA0';
const TEXT_DIM = '#4A5568';
const BORDER = 'rgba(255,255,255,0.06)';
const BORDER_HOVER = 'rgba(255,255,255,0.12)';

/* ─── Shared layout container ─────────────────────────────────────────
   Every section's outer content block uses the SAME max-width + the
   same centering rules. Previously each section had its own ad-hoc
   maxWidth (960 / 1080 / 1200 / 640), so the left/right edges of the
   page content drifted from section to section as you scrolled —
   that drift is what reads as "a gap on the right". Centering is set
   directly via inline styles (not just a `mx-auto` class) and paired
   with `boxSizing: 'border-box'` so padding is always included inside
   the max-width rather than added on top of it. ─────────────────── */
const CONTAINER_MAX = 1200;
const CONTAINER_PAD = 24;
const containerStyle = (extra: CSSProperties = {}): CSSProperties => ({
  width: '100%',
  maxWidth: CONTAINER_MAX,
  marginLeft: 'auto',
  marginRight: 'auto',
  paddingLeft: CONTAINER_PAD,
  paddingRight: CONTAINER_PAD,
  boxSizing: 'border-box',
  ...extra,
});

/* ─── Data ─────────────────────────────────────────────────────────── */

const features = [
  {
    icon: BookOpen,
    title: 'AI Study Assistant',
    description:
      'Chat with an intelligent tutor that explains complex topics and adapts to your learning style.',
  },
  {
    icon: Brain,
    title: 'AI Quiz Generator',
    description:
      'Upload any document or enter a topic — get instant, customized quizzes with explanations.',
  },
  {
    icon: Mic,
    title: 'AI Viva Simulator',
    description:
      'Practice oral examinations with a virtual professor who provides real-time feedback.',
  },
  {
    icon: Users,
    title: 'Study Rooms',
    description:
      'Join virtual study rooms with video, chat, and ambient music. Study together in real-time.',
  },
  {
    icon: Library,
    title: 'Smart Library',
    description:
      'Search academic resources, chat with documents, and build your personal knowledge base.',
  },
];

const stats = [
  { value: '50K+', label: 'Active Students' },
  { value: '98%', label: 'Satisfaction Rate' },
  { value: '2M+', label: 'Quizzes Generated' },
  { value: '24/7', label: 'AI Availability' },
];

const howItWorks = [
  {
    step: '01',
    title: 'Create Your Account',
    description: 'Sign up in seconds — no credit card required.',
  },
  {
    step: '02',
    title: 'Choose Your Tool',
    description: 'Pick from Study Assistant, Quiz Generator, Viva Simulator, or Study Rooms.',
  },
  {
    step: '03',
    title: 'Start Learning',
    description: 'Get personalized help and collaborate with peers instantly.',
  },
];

const testimonials = [
  {
    name: 'Priya S.',
    role: 'Computer Science',
    text: 'The AI quiz generator saved me hours of study prep. It knows exactly what to test me on and the explanations are incredibly detailed.',
    initial: 'P',
  },
  {
    name: 'Rahul M.',
    role: 'Engineering',
    text: 'The viva simulator is incredible — I felt so much more confident walking into my oral exam. It\'s like having a private tutor.',
    initial: 'R',
  },
  {
    name: 'Ananya K.',
    role: 'Medical Student',
    text: 'Having all my study tools in one place with AI assistance is a complete game changer. I can\'t imagine studying without it.',
    initial: 'A',
  },
];

const footerLinks = {
  Product: ['Features', 'Study Rooms', 'Quiz Generator', 'Viva Simulator'],
  Resources: ['Help Center', 'Documentation', 'Blog', 'Tutorials'],
  Company: ['About', 'Careers', 'Press', 'Contact'],
  Legal: ['Privacy Policy', 'Terms of Service', 'Cookie Policy'],
};

/* ─── Animation Variants ───────────────────────────────────────────── */

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const item = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' as const } },
};

/* ─── Page ──────────────────────────────────────────────────────────── */

export default function LandingPage() {
  return (
    <div className="min-h-screen overflow-x-hidden" style={{ background: BG }}>

      {/* ─── Navbar ──────────────────────────────────────────────── */}
      <nav
        id="navbar"
        className="fixed top-0 left-0 right-0 z-50"
        style={{
          background: 'rgba(9,9,11,0.8)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderBottom: `1px solid ${BORDER}`,
        }}
      >
        <div
          className="flex items-center justify-between"
          style={containerStyle({ height: 64, paddingTop: 0, paddingBottom: 0 })}
        >
          <Link href="/" className="flex items-center gap-3 no-underline">
            <div
              className="flex items-center justify-center"
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: NEON,
                boxShadow: NEON_GLOW,
              }}
            >
              <GraduationCap style={{ width: 18, height: 18, color: BG }} />
            </div>
            <span style={{ fontSize: 17, fontWeight: 700, color: TEXT }}>
              GuruGenZ
            </span>
          </Link>

          <div className="hidden md:flex items-center" style={{ gap: 32 }}>
            {['Features', 'How It Works', 'Testimonials'].map((label) => (
              <a
                key={label}
                href={`#${label.toLowerCase().replace(/\s+/g, '-')}`}
                className="no-underline transition-colors"
                style={{ fontSize: 14, fontWeight: 500, color: TEXT_SEC }}
                onMouseEnter={(e) => (e.currentTarget.style.color = NEON)}
                onMouseLeave={(e) => (e.currentTarget.style.color = TEXT_SEC)}
              >
                {label}
              </a>
            ))}
          </div>

          <div className="flex items-center" style={{ gap: 12 }}>
            <Link
              href="/login"
              className="hidden sm:inline-flex no-underline transition-colors"
              style={{ fontSize: 14, fontWeight: 500, color: TEXT_SEC }}
              onMouseEnter={(e) => (e.currentTarget.style.color = TEXT)}
              onMouseLeave={(e) => (e.currentTarget.style.color = TEXT_SEC)}
            >
              Sign In
            </Link>
            <Link
              href="/signup"
              className="inline-flex items-center no-underline transition-all"
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: BG,
                background: NEON,
                padding: '8px 20px',
                borderRadius: 10,
                gap: 6,
                boxShadow: NEON_GLOW,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = '0 0 30px rgba(0,240,255,0.4)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = NEON_GLOW;
              }}
            >
              Get Started
              <ArrowRight style={{ width: 14, height: 14 }} />
            </Link>
          </div>
        </div>
      </nav>

      {/* ─── Hero ────────────────────────────────────────────────── */}
      <section
        id="hero"
        className="relative"
        style={{ paddingTop: 160, paddingBottom: 96 }}
      >
        {/* Ambient neon glow */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div
            style={{
              position: 'absolute',
              top: '10%',
              left: '30%',
              width: 500,
              height: 500,
              borderRadius: '50%',
              background: 'rgba(0,240,255,0.04)',
              filter: 'blur(120px)',
            }}
          />
          <div
            style={{
              position: 'absolute',
              top: '30%',
              right: '20%',
              width: 400,
              height: 400,
              borderRadius: '50%',
              background: 'rgba(0,240,255,0.03)',
              filter: 'blur(100px)',
            }}
          />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' as const }}
          className="relative z-10"
          style={containerStyle()}
        >
          {/* Centered content with balanced padding */}
          <div className="text-center" style={{ maxWidth: 720, margin: '0 auto' }}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.15 }}
              className="inline-flex items-center"
              style={{
                gap: 8,
                padding: '6px 16px',
                borderRadius: 9999,
                border: `1px solid ${NEON_BORDER}`,
                background: NEON_BG,
                marginBottom: 32,
              }}
            >
              <Sparkles style={{ width: 14, height: 14, color: NEON }} />
              <span style={{ fontSize: 13, fontWeight: 500, color: NEON }}>
                AI-Powered Learning Platform
              </span>
            </motion.div>

            <h1
              style={{
                fontSize: 'clamp(40px, 5vw, 64px)',
                fontWeight: 700,
                lineHeight: 1.1,
                letterSpacing: '-0.02em',
                color: TEXT,
                marginBottom: 24,
              }}
            >
              Welcome to{' '}
              <span style={{ color: NEON, textShadow: '0 0 30px rgba(0,240,255,0.4)' }}>
                GuruGenZ
              </span>
            </h1>

            <p
              className="mx-auto"
              style={{
                fontSize: 17,
                lineHeight: 1.7,
                color: TEXT_SEC,
                maxWidth: 560,
                marginBottom: 40,
              }}
            >
              AI-powered study tools that help you learn smarter — from intelligent tutoring
              to quiz generation, viva practice, and collaborative study rooms.
            </p>

            <div
              className="flex flex-col sm:flex-row items-center justify-center"
              style={{ gap: 16 }}
            >
              <Link
                href="/signup"
                className="inline-flex items-center no-underline transition-all"
                style={{
                  fontSize: 16,
                  fontWeight: 600,
                  color: BG,
                  background: NEON,
                  padding: '14px 32px',
                  borderRadius: 12,
                  gap: 8,
                  boxShadow: NEON_GLOW,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = '0 0 35px rgba(0,240,255,0.45)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = NEON_GLOW;
                }}
              >
                Start Learning Free
                <ArrowRight style={{ width: 16, height: 16 }} />
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center no-underline transition-all"
                style={{
                  fontSize: 16,
                  fontWeight: 600,
                  color: TEXT,
                  background: 'transparent',
                  padding: '14px 32px',
                  borderRadius: 12,
                  border: `1px solid ${BORDER_HOVER}`,
                  gap: 8,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = NEON_BORDER;
                  e.currentTarget.style.color = NEON;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = BORDER_HOVER;
                  e.currentTarget.style.color = TEXT;
                }}
              >
                Sign In
                <ChevronRight style={{ width: 16, height: 16 }} />
              </Link>
            </div>
          </div>

          {/* Dashboard Preview - full width with balanced padding */}
          <motion.div
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.7, ease: 'easeOut' as const }}
            className="relative z-10"
            style={{ marginTop: 64 }}
          >
            <div
              style={{
                borderRadius: 16,
                border: `1px solid ${NEON_BORDER}`,
                boxShadow: '0 0 40px rgba(0,240,255,0.06), 0 8px 32px rgba(0,0,0,0.4)',
                overflow: 'hidden',
                background: CARD,
              }}
            >
              <div
                className="flex items-center"
                style={{
                  padding: '12px 16px',
                  borderBottom: `1px solid ${BORDER}`,
                  background: '#0D0D12',
                  gap: 8,
                }}
              >
                <div className="flex" style={{ gap: 6 }}>
                  <div style={{ width: 10, height: 10, borderRadius: 9999, background: '#EF4444' }} />
                  <div style={{ width: 10, height: 10, borderRadius: 9999, background: '#FBBF24' }} />
                  <div style={{ width: 10, height: 10, borderRadius: 9999, background: '#22C55E' }} />
                </div>
                <div
                  className="flex-1 mx-auto"
                  style={{
                    maxWidth: 320,
                    height: 28,
                    borderRadius: 8,
                    background: 'rgba(255,255,255,0.04)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <span style={{ fontSize: 11, color: TEXT_DIM }}>gurugenz.ai/dashboard</span>
                </div>
              </div>

              <div style={{ padding: 24, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                <div
                  className="hidden sm:flex"
                  style={{
                    width: 160,
                    flexShrink: 0,
                    flexDirection: 'column',
                    gap: 4,
                  }}
                >
                  {['Dashboard', 'Study Assistant', 'Quiz Generator', 'Viva Simulator'].map(
                    (label, idx) => (
                      <div
                        key={label}
                        style={{
                          padding: '8px 12px',
                          borderRadius: 8,
                          fontSize: 12,
                          fontWeight: idx === 0 ? 600 : 400,
                          color: idx === 0 ? NEON : TEXT_DIM,
                          background: idx === 0 ? NEON_BG : 'transparent',
                        }}
                      >
                        {label}
                      </div>
                    )
                  )}
                </div>

                <div className="flex-1" style={{ display: 'flex', flexDirection: 'column', gap: 12, minWidth: 200 }}>
                  <div
                    style={{
                      height: 48,
                      borderRadius: 10,
                      background: 'rgba(255,255,255,0.03)',
                      border: `1px solid ${BORDER}`,
                      display: 'flex',
                      alignItems: 'center',
                      padding: '0 16px',
                    }}
                  >
                    <span style={{ fontSize: 13, fontWeight: 600, color: TEXT }}>
                      Welcome back, Student
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3" style={{ gap: 12 }}>
                    {['Quizzes Taken', 'Study Hours', 'Documents'].map((label) => (
                      <div
                        key={label}
                        style={{
                          padding: 16,
                          borderRadius: 10,
                          background: 'rgba(255,255,255,0.03)',
                          border: `1px solid ${BORDER}`,
                        }}
                      >
                        <div style={{ fontSize: 18, fontWeight: 700, color: TEXT, marginBottom: 2 }}>
                          —
                        </div>
                        <div style={{ fontSize: 11, color: TEXT_DIM }}>{label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* ─── Stats Bar ───────────────────────────────────────────── */}
      <section
        style={{
          padding: '48px 0',
          background: '#0D0D12',
          borderTop: `1px solid ${BORDER}`,
          borderBottom: `1px solid ${BORDER}`,
        }}
      >
        <div
          className="grid grid-cols-2 md:grid-cols-4"
          style={containerStyle({ gap: 32 })}
        >
          {stats.map((stat, idx) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.08 }}
              className="text-center"
            >
              <div style={{ fontSize: 32, fontWeight: 700, color: NEON, marginBottom: 4, textShadow: '0 0 20px rgba(0,240,255,0.3)' }}>
                {stat.value}
              </div>
              <div style={{ fontSize: 14, color: TEXT_SEC }}>{stat.label}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ─── Features ────────────────────────────────────────────── */}
      <section id="features" style={{ padding: '96px 0' }}>
        <div style={containerStyle()}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.5 }}
            className="text-center"
            style={{ marginBottom: 64 }}
          >
            <h2
              style={{
                fontSize: 'clamp(28px, 3vw, 40px)',
                fontWeight: 600,
                color: TEXT,
                marginBottom: 16,
                lineHeight: 1.2,
              }}
            >
              Everything you need to{' '}
              <span style={{ color: NEON, textShadow: '0 0 20px rgba(0,240,255,0.3)' }}>excel</span>
            </h2>
            <p
              className="mx-auto"
              style={{ fontSize: 17, color: TEXT_SEC, maxWidth: 480, lineHeight: 1.7 }}
            >
              Five powerful AI-driven tools, all in one place. Built for students who want to study smarter.
            </p>
          </motion.div>

          <motion.div
            variants={container}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.1 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
            style={{ gap: 24 }}
          >
            {features.map((feature) => (
              <motion.div
                key={feature.title}
                variants={item}
                className="group transition-all"
                style={{
                  padding: 32,
                  borderRadius: 16,
                  border: `1px solid ${BORDER}`,
                  background: CARD,
                }}
                whileHover={{
                  y: -4,
                  borderColor: 'rgba(0,240,255,0.2)',
                  boxShadow: '0 0 30px rgba(0,240,255,0.08)',
                }}
              >
                <div
                  className="flex items-center justify-center"
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 12,
                    background: NEON_BG,
                    border: `1px solid ${NEON_BORDER}`,
                    marginBottom: 24,
                  }}
                >
                  <feature.icon style={{ width: 22, height: 22, color: NEON }} />
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 600, color: TEXT, marginBottom: 8 }}>
                  {feature.title}
                </h3>
                <p style={{ fontSize: 15, lineHeight: 1.7, color: TEXT_SEC }}>
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ─── How It Works ────────────────────────────────────────── */}
      <section
        id="how-it-works"
        style={{ padding: '96px 0', background: '#0D0D12' }}
      >
        <div style={containerStyle()}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.5 }}
            className="text-center"
            style={{ marginBottom: 64 }}
          >
            <h2
              style={{
                fontSize: 'clamp(28px, 3vw, 40px)',
                fontWeight: 600,
                color: TEXT,
                marginBottom: 16,
                lineHeight: 1.2,
              }}
            >
              Get started in{' '}
              <span style={{ color: NEON, textShadow: '0 0 20px rgba(0,240,255,0.3)' }}>three steps</span>
            </h2>
            <p
              className="mx-auto"
              style={{ fontSize: 17, color: TEXT_SEC, maxWidth: 480, lineHeight: 1.7 }}
            >
              Join thousands of students already studying smarter with GuruGenZ.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3" style={{ gap: 48 }}>
            {howItWorks.map((step, idx) => (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.12 }}
                className="text-center relative"
              >
                {idx < howItWorks.length - 1 && (
                  <div
                    className="hidden md:block absolute"
                    style={{
                      top: 32,
                      left: '60%',
                      width: '80%',
                      height: 1,
                      background: `linear-gradient(to right, ${NEON_BORDER}, transparent)`,
                    }}
                  />
                )}

                <div
                  className="inline-flex items-center justify-center mx-auto"
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: 16,
                    background: NEON_BG,
                    border: `1px solid ${NEON_BORDER}`,
                    marginBottom: 24,
                  }}
                >
                  <span style={{ fontSize: 24, fontWeight: 700, color: NEON }}>
                    {step.step}
                  </span>
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 600, color: TEXT, marginBottom: 8 }}>
                  {step.title}
                </h3>
                <p style={{ fontSize: 15, lineHeight: 1.7, color: TEXT_SEC }}>
                  {step.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Testimonials ────────────────────────────────────────── */}
      <section id="testimonials" style={{ padding: '96px 0' }}>
        <div style={containerStyle()}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.5 }}
            className="text-center"
            style={{ marginBottom: 64 }}
          >
            <h2
              style={{
                fontSize: 'clamp(28px, 3vw, 40px)',
                fontWeight: 600,
                color: TEXT,
                marginBottom: 16,
                lineHeight: 1.2,
              }}
            >
              Loved by{' '}
              <span style={{ color: NEON, textShadow: '0 0 20px rgba(0,240,255,0.3)' }}>students</span>
            </h2>
            <p
              className="mx-auto"
              style={{ fontSize: 17, color: TEXT_SEC, maxWidth: 480, lineHeight: 1.7 }}
            >
              See what students are saying about their AI-powered study experience.
            </p>
          </motion.div>

          <motion.div
            variants={container}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.1 }}
            className="grid grid-cols-1 md:grid-cols-3"
            style={{ gap: 24 }}
          >
            {testimonials.map((t) => (
              <motion.div
                key={t.name}
                variants={item}
                style={{
                  padding: 32,
                  borderRadius: 16,
                  border: `1px solid ${BORDER}`,
                  background: CARD,
                }}
              >
                <Quote
                  style={{
                    width: 24,
                    height: 24,
                    color: 'rgba(0,240,255,0.2)',
                    marginBottom: 16,
                  }}
                />
                <p
                  style={{
                    fontSize: 15,
                    lineHeight: 1.7,
                    color: '#C8D0DA',
                    marginBottom: 24,
                  }}
                >
                  &ldquo;{t.text}&rdquo;
                </p>
                <div className="flex items-center" style={{ gap: 12 }}>
                  <div
                    className="flex items-center justify-center"
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 9999,
                      background: NEON,
                      color: BG,
                      fontSize: 15,
                      fontWeight: 600,
                      boxShadow: '0 0 12px rgba(0,240,255,0.25)',
                    }}
                  >
                    {t.initial}
                  </div>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 600, color: TEXT }}>{t.name}</p>
                    <p style={{ fontSize: 13, color: TEXT_DIM }}>{t.role}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ─── CTA ─────────────────────────────────────────────────── */}
      <section style={{ padding: '96px 24px', background: '#0D0D12' }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.5 }}
          className="text-center"
          style={{
            width: '100%',
            maxWidth: 640,
            marginLeft: 'auto',
            marginRight: 'auto',
            padding: '64px 48px',
            borderRadius: 16,
            background: CARD,
            border: `1px solid ${NEON_BORDER}`,
            boxShadow: '0 0 40px rgba(0,240,255,0.06)',
            boxSizing: 'border-box',
          }}
        >
          <div
            className="inline-flex items-center justify-center mx-auto"
            style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              background: NEON,
              marginBottom: 24,
              boxShadow: NEON_GLOW,
            }}
          >
            <Sparkles style={{ width: 26, height: 26, color: BG }} />
          </div>
          <h2
            style={{
              fontSize: 'clamp(24px, 3vw, 36px)',
              fontWeight: 600,
              color: TEXT,
              marginBottom: 16,
              lineHeight: 1.2,
            }}
          >
            Ready to study smarter?
          </h2>
          <p
            style={{
              fontSize: 17,
              color: TEXT_SEC,
              marginBottom: 32,
              lineHeight: 1.7,
            }}
          >
            Join thousands of students using AI to ace their exams. Free to get started.
          </p>
          <Link
            href="/signup"
            className="inline-flex items-center no-underline transition-all"
            style={{
              fontSize: 16,
              fontWeight: 600,
              color: BG,
              background: NEON,
              padding: '14px 32px',
              borderRadius: 12,
              gap: 8,
              boxShadow: NEON_GLOW,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = '0 0 35px rgba(0,240,255,0.45)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = NEON_GLOW;
            }}
          >
            Create Free Account
            <ArrowRight style={{ width: 16, height: 16 }} />
          </Link>
          <p style={{ fontSize: 13, color: TEXT_DIM, marginTop: 16 }}>
            No credit card required · Free forever
          </p>
        </motion.div>
      </section>

      {/* ─── Footer ──────────────────────────────────────────────── */}
      <footer
        style={{
          padding: '64px 0 32px',
          borderTop: `1px solid ${BORDER}`,
        }}
      >
        <div style={containerStyle()}>
          <div
            className="grid grid-cols-2 md:grid-cols-5"
            style={{ gap: 48, marginBottom: 48 }}
          >
            <div className="col-span-2 md:col-span-1">
              <Link href="/" className="flex items-center no-underline" style={{ gap: 10, marginBottom: 16 }}>
                <div
                  className="flex items-center justify-center"
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    background: NEON,
                    boxShadow: '0 0 12px rgba(0,240,255,0.2)',
                  }}
                >
                  <GraduationCap style={{ width: 16, height: 16, color: BG }} />
                </div>
                <span style={{ fontSize: 15, fontWeight: 700, color: TEXT }}>
                  GuruGenZ
                </span>
              </Link>
              <p style={{ fontSize: 14, color: TEXT_DIM, lineHeight: 1.6 }}>
                AI-powered tools for smarter studying.
              </p>
            </div>

            {Object.entries(footerLinks).map(([category, links]) => (
              <div key={category}>
                <h4 style={{ fontSize: 13, fontWeight: 600, color: TEXT_SEC, marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {category}
                </h4>
                <ul style={{ listStyle: 'none', padding: 0 }}>
                  {links.map((link) => (
                    <li key={link} style={{ marginBottom: 10 }}>
                      <a
                        href="#"
                        className="no-underline transition-colors"
                        style={{ fontSize: 14, color: TEXT_DIM }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = NEON)}
                        onMouseLeave={(e) => (e.currentTarget.style.color = TEXT_DIM)}
                      >
                        {link}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div
            style={{
              paddingTop: 24,
              borderTop: `1px solid ${BORDER}`,
              textAlign: 'center',
            }}
          >
            <p style={{ fontSize: 13, color: TEXT_DIM }}>
              ©️ {new Date().getFullYear()} GuruGenZ. Built with care for students everywhere.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}