'use client';

interface UserAvatarProps {
  name: string;
  avatarUrl: string | null;
  size?: number;
  className?: string;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export default function UserAvatar({ name, avatarUrl, size = 40, className = '' }: UserAvatarProps) {
  const initials = getInitials(name || 'U');

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        width={size}
        height={size}
        className={`rounded-full object-cover flex-shrink-0 ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <div
      className={`rounded-full flex items-center justify-center flex-shrink-0 ${className}`}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.38,
        fontWeight: 600,
        background: '#00F0FF',
        color: '#09090B',
        boxShadow: '0 0 12px rgba(0,240,255,0.2)',
      }}
    >
      {initials}
    </div>
  );
}
