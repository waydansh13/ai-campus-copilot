import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Academic Copilot — Sign In',
  description: 'Sign in to your Academic Copilot account',
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className="min-h-screen w-full flex items-center justify-center relative overflow-hidden"
      style={{ background: '#09090B', padding: 24 }}
    >
      {/* Ambient neon glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          style={{
            position: 'absolute',
            top: '-20%',
            right: '-10%',
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
            bottom: '-20%',
            left: '-10%',
            width: 500,
            height: 500,
            borderRadius: '50%',
            background: 'rgba(0,240,255,0.03)',
            filter: 'blur(100px)',
          }}
        />
      </div>

      <div className="relative z-10 w-full" style={{ maxWidth: 420 }}>
        {children}
      </div>
    </div>
  );
}
