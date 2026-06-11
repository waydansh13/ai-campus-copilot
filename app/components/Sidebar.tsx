'use client';
import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  BookOpen,
  Mic,
  Clock,
  Users,
  Menu,
  X,
  Brain,
  Library,
} from 'lucide-react';

const menuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
  { icon: BookOpen, label: 'AI Study Assistant', path: '/study' },
  { icon: Mic, label: 'AI Viva Simulator', path: '/viva' },
  { icon: Brain, label: 'AI Quiz Generator', path: '/quiz' },
  { icon: Clock, label: 'Deadline Tracker', path: '/deadlines' },
  { icon: Users, label: 'Study Rooms', path: '/rooms' },
  { icon: Library, label: 'Smart Library System', path: '/library' },
];
export default function Sidebar() {
  const [open, setOpen] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  return (
    <div className={`bg-zinc-900 border-r border-zinc-800 h-screen flex-shrink-0 flex flex-col transition-all duration-300 ${open ? 'w-72' : 'w-20'}`}>
      <div className="p-6 flex items-center justify-between border-b border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center font-bold text-xl flex-shrink-0">AI</div>
          {open && <h1 className="text-xl font-bold text-white">Campus Copilot</h1>}
        </div>
        <button onClick={() => setOpen(!open)} className="text-zinc-400 hover:text-white p-1">
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>
      <nav className="p-4 flex-1 overflow-y-auto">
        {menuItems.map((item) => (
          <button
            key={item.path}
            onClick={() => router.push(item.path)}
            className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl mb-1 transition-all text-left ${pathname === item.path
              ? item.label === 'AI Quiz Generator'
                ? 'bg-zinc-800 text-emerald-400'
                : 'bg-zinc-800 text-blue-400'
              : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
              }`}
          >
            <item.icon size={20} className="flex-shrink-0" />
            {open && <span className="text-sm">{item.label}</span>}
          </button>
        ))}
      </nav>
    </div>
  );
}