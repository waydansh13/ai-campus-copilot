'use client';

import { useAuth } from '@/contexts/auth-context';
import { motion } from 'framer-motion';
import {
  BookOpen,
  Brain,
  Mic,
  Upload,
  FileText,
  BarChart3,
  Zap,
  ArrowRight,
  Sparkles,
  ChevronRight,
  Target,
  Award,
  FolderOpen,
  HelpCircle,
} from 'lucide-react';
import { useRouter } from 'next/navigation';

const NEON = '#00F0FF';
const BG = '#09090B';
const CARD = '#111116';
const TEXT = '#F0F2F5';
const TEXT_SEC = '#7A8BA0';
const TEXT_DIM = '#4A5568';
const BORDER = 'rgba(255,255,255,0.06)';
const BORDER_HOVER = 'rgba(255,255,255,0.12)';
const NEON_BORDER = 'rgba(0,240,255,0.15)';
const NEON_BG = 'rgba(0,240,255,0.06)';
const NEON_GLOW = '0 0 20px rgba(0,240,255,0.25)';

const quickActions = [
  {
    title: 'Start Studying',
    description: 'Chat with your AI study assistant',
    icon: BookOpen,
    href: '/study',
  },
  {
    title: 'Generate Quiz',
    description: 'Create an AI-powered quiz on any topic',
    icon: Brain,
    href: '/quiz',
  },
  {
    title: 'Practice Viva',
    description: 'Simulate a viva examination',
    icon: Mic,
    href: '/viva',
  },
  {
    title: 'Digital Library',
    description: 'Upload study materials to analyze',
    icon: FolderOpen,
    href: '/library',
  },
];

const stats = [
  { label: 'Total Quizzes', value: '—', icon: Brain },
  { label: 'Documents', value: '—', icon: FileText },
  { label: 'Study Sessions', value: '—', icon: BarChart3 },
];

const recentActivity = [
  { title: 'Start your first quiz', description: 'Generate a quiz on any topic to begin', icon: Brain, time: 'Get started', href: '/quiz' },
  { title: 'Chat with AI Assistant', description: 'Ask questions about any subject', icon: BookOpen, time: 'Available now', href: '/study' },
  { title: 'Upload study materials', description: 'Build your personal knowledge base', icon: FolderOpen, time: 'Add now', href: '/library' },
];

const suggestedTopics = [
  'Introduction to Machine Learning',
  'Data Structures & Algorithms',
  'Organic Chemistry Basics',
  'Financial Accounting',
];

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
}

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
};

const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' as const } },
};

export default function DashboardPage() {
  const { profile, user } = useAuth();
  const router = useRouter();

  const displayName = profile?.full_name || user?.email?.split('@')[0] || 'User';
  const firstName = displayName.split(' ')[0];

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      style={{ padding: '32px 32px', maxWidth: 1120 }}
      className="mx-auto w-full"
    >
      {/* ─── Hero Section ─────────────────────────────────────── */}
      <motion.div variants={item} style={{ marginBottom: 32 }}>
        <div
          style={{
            padding: '32px 32px',
            borderRadius: 16,
            background: CARD,
            border: `1px solid ${BORDER}`,
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Subtle neon ambient */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              width: 200,
              height: 200,
              background: 'rgba(0,240,255,0.03)',
              filter: 'blur(60px)',
              borderRadius: '50%',
            }}
          />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div className="flex items-center" style={{ gap: 8, marginBottom: 12 }}>
              <div
                className="flex items-center justify-center"
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 9999,
                  background: NEON_BG,
                }}
              >
                <Sparkles style={{ width: 13, height: 13, color: NEON }} />
              </div>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: NEON,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                {getGreeting()}
              </span>
            </div>
            <h1
              style={{
                fontSize: 28,
                fontWeight: 700,
                color: TEXT,
                marginBottom: 8,
              }}
            >
              Welcome back,{' '}
              <span style={{ color: NEON, textShadow: '0 0 20px rgba(0,240,255,0.3)' }}>{firstName}</span>
            </h1>
            <p style={{ fontSize: 15, color: TEXT_SEC, maxWidth: 560 }}>
              Ready to continue your learning journey? Pick up where you left off or start something new.
            </p>
          </div>
        </div>
      </motion.div>

      {/* ─── Stats Row ────────────────────────────────────────── */}
      <motion.div
        variants={item}
        className="grid grid-cols-3"
        style={{ gap: 16, marginBottom: 32 }}
      >
        {stats.map((stat) => (
          <div
            key={stat.label}
            style={{
              padding: 20,
              borderRadius: 16,
              background: CARD,
              border: `1px solid ${BORDER}`,
              transition: 'border-color 0.2s, box-shadow 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = NEON_BORDER;
              e.currentTarget.style.boxShadow = '0 0 20px rgba(0,240,255,0.06)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = BORDER;
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <div
              className="flex items-center justify-center"
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: NEON_BG,
                border: `1px solid ${NEON_BORDER}`,
                marginBottom: 12,
              }}
            >
              <stat.icon style={{ width: 18, height: 18, color: NEON }} />
            </div>
            <p style={{ fontSize: 22, fontWeight: 700, color: TEXT, marginBottom: 2 }}>
              {stat.value}
            </p>
            <p
              style={{
                fontSize: 11,
                color: TEXT_DIM,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              {stat.label}
            </p>
          </div>
        ))}
      </motion.div>

      {/* ─── Quick Actions ────────────────────────────────────── */}
      <motion.div variants={item} style={{ marginBottom: 32 }}>
        <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
          <h2
            className="flex items-center"
            style={{ fontSize: 16, fontWeight: 600, color: TEXT, gap: 8 }}
          >
            <Zap style={{ width: 16, height: 16, color: NEON }} />
            Quick Actions
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4" style={{ gap: 16 }}>
          {quickActions.map((action) => (
            <motion.button
              key={action.title}
              onClick={() => router.push(action.href)}
              whileHover={{ y: -3 }}
              whileTap={{ scale: 0.98 }}
              className="relative group text-left"
              style={{
                padding: 20,
                borderRadius: 16,
                background: CARD,
                border: `1px solid ${BORDER}`,
                cursor: 'pointer',
                transition: 'border-color 0.2s, box-shadow 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = NEON_BORDER;
                e.currentTarget.style.boxShadow = '0 0 25px rgba(0,240,255,0.08)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = BORDER;
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div
                className="flex items-center justify-center"
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  background: NEON_BG,
                  border: `1px solid ${NEON_BORDER}`,
                  marginBottom: 16,
                }}
              >
                <action.icon style={{ width: 18, height: 18, color: NEON }} />
              </div>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: TEXT, marginBottom: 4 }}>
                {action.title}
              </h3>
              <p style={{ fontSize: 13, color: TEXT_DIM, lineHeight: 1.5 }}>
                {action.description}
              </p>
              <ArrowRight
                style={{
                  width: 14,
                  height: 14,
                  color: '#2A2A35',
                  position: 'absolute',
                  bottom: 16,
                  right: 16,
                  transition: 'color 0.2s',
                }}
              />
            </motion.button>
          ))}
        </div>
      </motion.div>

      {/* ─── Main Grid: Recommendations ────── */}
      <div className="grid grid-cols-1" style={{ gap: 24 }}>
        <motion.div variants={item}>
          <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
            <h2
              className="flex items-center"
              style={{ fontSize: 16, fontWeight: 600, color: TEXT, gap: 8 }}
            >
              <Sparkles style={{ width: 16, height: 16, color: NEON }} />
              Recommended for You
            </h2>
            <span style={{ fontSize: 12, color: TEXT_DIM }}>Based on your learning goals</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {recentActivity.map((activity) => (
              <button
                key={activity.title}
                onClick={() => router.push(activity.href)}
                className="w-full flex items-center group"
                style={{
                  gap: 12,
                  padding: 16,
                  borderRadius: 16,
                  background: CARD,
                  border: `1px solid ${BORDER}`,
                  cursor: 'pointer',
                  transition: 'border-color 0.2s, box-shadow 0.2s',
                  textAlign: 'left',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = NEON_BORDER;
                  e.currentTarget.style.boxShadow = '0 0 15px rgba(0,240,255,0.04)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = BORDER;
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div
                  className="flex items-center justify-center flex-shrink-0"
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    background: NEON_BG,
                  }}
                >
                  <activity.icon style={{ width: 16, height: 16, color: NEON }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p style={{ fontSize: 14, fontWeight: 500, color: TEXT }}>{activity.title}</p>
                  <p style={{ fontSize: 13, color: TEXT_DIM }}>{activity.description}</p>
                </div>
                <span
                  className="flex-shrink-0 hidden sm:inline"
                  style={{ fontSize: 12, color: TEXT_DIM }}
                >
                  {activity.time}
                </span>
                <ArrowRight
                  className="flex-shrink-0"
                  style={{ width: 14, height: 14, color: '#2A2A35' }}
                />
              </button>
            ))}
          </div>
        </motion.div>
      </div>

      {/* ─── Suggested Topics + AI Tip ──────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2" style={{ gap: 24, marginTop: 24 }}>
        <motion.div variants={item}>
          <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
            <h2
              className="flex items-center"
              style={{ fontSize: 16, fontWeight: 600, color: TEXT, gap: 8 }}
            >
              <Target style={{ width: 16, height: 16, color: NEON }} />
              Suggested Topics
            </h2>
            <button
              style={{
                fontSize: 12,
                color: NEON,
                fontWeight: 500,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              Generate more
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {suggestedTopics.map((topic) => (
              <button
                key={topic}
                onClick={() => router.push(`/quiz?topic=${encodeURIComponent(topic)}`)}
                className="w-full flex items-center justify-between"
                style={{
                  padding: 16,
                  borderRadius: 16,
                  background: CARD,
                  border: `1px solid ${BORDER}`,
                  cursor: 'pointer',
                  transition: 'border-color 0.15s',
                  textAlign: 'left',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = NEON_BORDER)}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = BORDER)}
              >
                <span style={{ fontSize: 14, color: '#C8D0DA' }}>{topic}</span>
                <ChevronRight style={{ width: 16, height: 16, color: '#2A2A35' }} />
              </button>
            ))}
          </div>
        </motion.div>

        {/* AI Tip */}
        <motion.div variants={item}>
          <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
            <h2
              className="flex items-center"
              style={{ fontSize: 16, fontWeight: 600, color: TEXT, gap: 8 }}
            >
              <Award style={{ width: 16, height: 16, color: NEON }} />
              AI Tip of the Day
            </h2>
            <HelpCircle style={{ width: 14, height: 14, color: TEXT_DIM }} />
          </div>
          <div
            style={{
              padding: 24,
              borderRadius: 16,
              background: CARD,
              border: `1px solid ${NEON_BORDER}`,
              boxShadow: '0 0 20px rgba(0,240,255,0.04)',
            }}
          >
            <div className="flex items-start" style={{ gap: 12 }}>
              <div
                className="flex items-center justify-center flex-shrink-0"
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: NEON_BG,
                  border: `1px solid ${NEON_BORDER}`,
                }}
              >
                <Sparkles style={{ width: 16, height: 16, color: NEON }} />
              </div>
              <div>
                <p style={{ fontSize: 14, fontWeight: 600, color: TEXT, marginBottom: 6 }}>
                  Active Recall with AI
                </p>
                <p style={{ fontSize: 14, color: TEXT_SEC, lineHeight: 1.7 }}>
                  Testing yourself with AI-generated quizzes improves long-term retention by 50% compared to passive reading. Try generating a quiz after each study session!
                </p>
              </div>
            </div>
          </div>

          <div
            className="text-center"
            style={{
              marginTop: 12,
              padding: 20,
              borderRadius: 16,
              background: CARD,
              border: `1px solid ${BORDER}`,
            }}
          >
            <p style={{ fontSize: 14, color: TEXT_DIM, fontStyle: 'italic' }}>
              &ldquo;The beautiful thing about learning is that no one can take it away from you.&rdquo;
            </p>
          </div>
        </motion.div>
      </div>

      {/* ─── Footer Note ──────────────────────────────────────── */}
      <motion.div
        variants={item}
        className="text-center"
        style={{
          marginTop: 32,
          paddingTop: 24,
          borderTop: `1px solid ${BORDER}`,
        }}
      >
        <p style={{ fontSize: 13, color: TEXT_DIM }}>
          Need help? Visit our{' '}
          <button
            style={{
              color: NEON,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 500,
              fontSize: 13,
            }}
          >
            Help Center
          </button>
          {' '}or{' '}
          <button
            style={{
              color: NEON,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 500,
              fontSize: 13,
            }}
          >
            Contact Support
          </button>
        </p>
      </motion.div>
    </motion.div>
  );
}