'use client';

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  BookOpen,
  Mic,
  Users,
  Menu,
  X,
  Brain,
  Library,
  LogOut,
  ChevronLeft,
  GraduationCap,
} from 'lucide-react';
import UserAvatar from './UserAvatar';

const NEON = '#00F0FF';
const BG = '#09090B';
const CARD = '#111116';
const SIDEBAR_BG = '#0D0D12';
const TEXT = '#F0F2F5';
const TEXT_SEC = '#7A8BA0';
const TEXT_DIM = '#4A5568';
const BORDER = 'rgba(255,255,255,0.06)';
const NEON_BORDER = 'rgba(0,240,255,0.15)';
const NEON_BG = 'rgba(0,240,255,0.06)';
const NEON_GLOW = '0 0 12px rgba(0,240,255,0.2)';

const menuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
  { icon: BookOpen, label: 'AI Study Assistant', path: '/study' },
  { icon: Mic, label: 'AI Viva Simulator', path: '/viva' },
  { icon: Brain, label: 'AI Quiz Generator', path: '/quiz' },
  { icon: Users, label: 'Study Rooms', path: '/rooms' },
  { icon: Library, label: 'Smart Library', path: '/library' },
];

export default function DashboardSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const { profile, user, signOut } = useAuth();

  const displayName = profile?.full_name || user?.email?.split('@')[0] || 'User';
  const displayEmail = profile?.email || user?.email || '';

  const handleNavClick = (path: string) => {
    router.push(path);
    setMobileOpen(false);
  };

  const isActive = (path: string) => {
    if (path === '/dashboard') return pathname === '/dashboard';
    return pathname.startsWith(path);
  };

  const SidebarContent = () => (
    <>
      {/* Header */}
      <div
        className={`flex items-center ${collapsed ? 'justify-center' : 'justify-between'}`}
        style={{
          padding: 20,
          borderBottom: `1px solid ${BORDER}`,
        }}
      >
        <div className="flex items-center min-w-0" style={{ gap: 12 }}>
          <div
            className="flex items-center justify-center flex-shrink-0"
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
          <AnimatePresence>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <h1
                  className="whitespace-nowrap"
                  style={{ fontSize: 15, fontWeight: 700, color: TEXT }}
                >
                  Academic Copilot
                </h1>
                <p
                  style={{
                    fontSize: 10,
                    color: TEXT_DIM,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  AI Powered
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden lg:flex"
          style={{
            padding: 6,
            borderRadius: 8,
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            color: TEXT_DIM,
            transition: 'color 0.15s, background 0.15s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = TEXT;
            e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = TEXT_DIM;
            e.currentTarget.style.background = 'transparent';
          }}
        >
          <ChevronLeft
            style={{
              width: 16,
              height: 16,
              transition: 'transform 0.3s',
              transform: collapsed ? 'rotate(180deg)' : 'rotate(0deg)',
            }}
          />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto" style={{ padding: 12 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {menuItems.map((menuItem) => {
            const active = isActive(menuItem.path);
            return (
              <motion.button
                key={menuItem.path}
                onClick={() => handleNavClick(menuItem.path)}
                whileHover={{ x: 2 }}
                whileTap={{ scale: 0.98 }}
                className="w-full flex items-center text-left group relative overflow-hidden"
                style={{
                  gap: 12,
                  padding: '10px 12px',
                  borderRadius: 12,
                  border: 'none',
                  background: active ? NEON_BG : 'transparent',
                  cursor: 'pointer',
                  transition: 'background 0.15s',
                  color: active ? NEON : TEXT_SEC,
                }}
                onMouseEnter={(e) => {
                  if (!active) {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                    e.currentTarget.style.color = TEXT;
                  }
                }}
                onMouseLeave={(e) => {
                  if (!active) {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = TEXT_SEC;
                  }
                }}
              >
                {active && (
                  <motion.div
                    layoutId="activeBar"
                    style={{
                      position: 'absolute',
                      left: 0,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      width: 3,
                      height: 20,
                      borderRadius: '0 4px 4px 0',
                      background: NEON,
                      boxShadow: '0 0 8px rgba(0,240,255,0.4)',
                    }}
                    transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
                  />
                )}

                <menuItem.icon
                  className="flex-shrink-0"
                  style={{
                    width: 18,
                    height: 18,
                    color: active ? NEON : TEXT_DIM,
                    transition: 'color 0.15s',
                  }}
                />
                <AnimatePresence>
                  {!collapsed && (
                    <motion.span
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: 'auto' }}
                      exit={{ opacity: 0, width: 0 }}
                      transition={{ duration: 0.2 }}
                      className="whitespace-nowrap overflow-hidden"
                      style={{
                        fontSize: 14,
                        fontWeight: active ? 600 : 500,
                      }}
                    >
                      {menuItem.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.button>
            );
          })}
        </div>
      </nav>

      {/* User section */}
      <div style={{ padding: 12, borderTop: `1px solid ${BORDER}` }}>
        <div
          className={`flex items-center ${collapsed ? 'justify-center' : ''}`}
          style={{
            gap: 12,
            padding: 12,
            borderRadius: 12,
            background: 'rgba(255,255,255,0.02)',
            transition: 'background 0.15s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
        >
          <UserAvatar
            name={displayName}
            avatarUrl={profile?.avatar_url || null}
            size={36}
          />
          <AnimatePresence>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.2 }}
                className="flex-1 min-w-0 overflow-hidden"
              >
                <p
                  className="truncate"
                  style={{ fontSize: 14, fontWeight: 500, color: TEXT }}
                >
                  {displayName}
                </p>
                <p
                  className="truncate"
                  style={{ fontSize: 11, color: TEXT_DIM }}
                >
                  {displayEmail}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
          <AnimatePresence>
            {!collapsed && (
              <motion.button
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0 }}
                onClick={signOut}
                className="flex-shrink-0"
                title="Sign out"
                style={{
                  padding: 8,
                  borderRadius: 8,
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  color: TEXT_DIM,
                  display: 'flex',
                  transition: 'color 0.15s, background 0.15s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = '#EF4444';
                  e.currentTarget.style.background = 'rgba(239,68,68,0.08)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = TEXT_DIM;
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                <LogOut style={{ width: 16, height: 16 }} />
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>
    </>
  );

  return (
    <>
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed"
        style={{
          top: 16,
          left: 16,
          zIndex: 50,
          padding: 10,
          borderRadius: 12,
          border: `1px solid ${BORDER}`,
          background: 'rgba(13,13,18,0.9)',
          backdropFilter: 'blur(12px)',
          cursor: 'pointer',
          color: TEXT,
          display: 'flex',
        }}
      >
        <Menu style={{ width: 20, height: 20 }} />
      </button>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMobileOpen(false)}
            className="lg:hidden fixed inset-0"
            style={{
              background: 'rgba(0,0,0,0.6)',
              backdropFilter: 'blur(4px)',
              zIndex: 40,
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {mobileOpen && (
          <motion.aside
            initial={{ x: -280 }}
            animate={{ x: 0 }}
            exit={{ x: -280 }}
            transition={{ type: 'spring', bounce: 0, duration: 0.3 }}
            className="lg:hidden fixed left-0 top-0 bottom-0 flex flex-col"
            style={{
              width: 280,
              background: SIDEBAR_BG,
              borderRight: `1px solid ${BORDER}`,
              zIndex: 50,
            }}
          >
            <button
              onClick={() => setMobileOpen(false)}
              style={{
                position: 'absolute',
                top: 16,
                right: 16,
                padding: 6,
                borderRadius: 8,
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                color: TEXT_DIM,
                display: 'flex',
              }}
            >
              <X style={{ width: 16, height: 16 }} />
            </button>
            <SidebarContent />
          </motion.aside>
        )}
      </AnimatePresence>

      <motion.aside
        animate={{ width: collapsed ? 72 : 272 }}
        transition={{ type: 'spring', bounce: 0, duration: 0.3 }}
        className="hidden lg:flex flex-col flex-shrink-0 h-screen sticky top-0"
        style={{
          background: SIDEBAR_BG,
          borderRight: `1px solid ${BORDER}`,
        }}
      >
        <SidebarContent />
      </motion.aside>
    </>
  );
}
