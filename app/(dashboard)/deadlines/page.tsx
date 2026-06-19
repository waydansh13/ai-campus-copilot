'use client';

import { useState, useEffect, useCallback } from 'react';
import { Clock, Plus, Trash2, Bell, BellOff, Calendar, ChevronLeft, ChevronRight, X } from 'lucide-react';

type Priority = 'High' | 'Medium' | 'Low';
type Deadline = {
  id: string;
  title: string;
  subject: string;
  date: string;
  time: string;
  priority: Priority;
  notified: boolean;
  createdAt: string;
};

const PRIORITY_COLORS = {
  High:   { bg: 'bg-red-500/20',    border: 'border-red-500',    text: 'text-red-400',    dot: 'bg-red-400' },
  Medium: { bg: 'bg-yellow-500/20', border: 'border-yellow-500', text: 'text-yellow-400', dot: 'bg-yellow-400' },
  Low:    { bg: 'bg-green-500/20',  border: 'border-green-500',  text: 'text-green-400',  dot: 'bg-green-400' },
};

const SUBJECTS = [
  'Mathematics', 'Physics', 'Chemistry', 'Biology',
  'Computer Science', 'Data Structures', 'Machine Learning',
  'Database Management', 'Computer Networks', 'Software Engineering',
  'Operating Systems', 'Algorithms', 'History', 'Economics', 'Other',
];

function getDaysLeft(date: string, time: string) {
  const due = new Date(`${date}T${time || '23:59'}`);
  const now = new Date();
  const diff = due.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function getStatusLabel(days: number) {
  if (days < 0) return { label: 'Overdue', color: 'text-red-400 bg-red-500/20' };
  if (days === 0) return { label: 'Due Today', color: 'text-orange-400 bg-orange-500/20' };
  if (days === 1) return { label: 'Due Tomorrow', color: 'text-yellow-400 bg-yellow-500/20' };
  if (days <= 3) return { label: `${days}d left`, color: 'text-yellow-400 bg-yellow-500/20' };
  if (days <= 7) return { label: `${days}d left`, color: 'text-blue-400 bg-blue-500/20' };
  return { label: `${days}d left`, color: 'text-green-400 bg-green-500/20' };
}

export default function DeadlineTracker() {
  const [deadlines, setDeadlines] = useState<Deadline[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [activeTab, setActiveTab] = useState<'list' | 'calendar'>('list');
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [notifEnabled, setNotifEnabled] = useState(false);
  const [filterPriority, setFilterPriority] = useState<Priority | 'All'>('All');
  const [sortBy, setSortBy] = useState<'date' | 'priority'>('date');
  const [form, setForm] = useState({
    title: '', subject: 'Computer Science', date: '', time: '23:59', priority: 'High' as Priority,
  });
  const [toast, setToast] = useState<string | null>(null);

  // Load from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('campus-deadlines');
    if (saved) setDeadlines(JSON.parse(saved));
    const notif = localStorage.getItem('campus-notif');
    if (notif === 'true') setNotifEnabled(true);
  }, []);

  // Save to localStorage
  useEffect(() => {
    localStorage.setItem('campus-deadlines', JSON.stringify(deadlines));
  }, [deadlines]);

  // Show toast
  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  // Check reminders every minute
  const checkReminders = useCallback(() => {
    const now = new Date();
    deadlines.forEach(d => {
      if (d.notified) return;
      const due = new Date(`${d.date}T${d.time || '23:59'}`);
      const diff = due.getTime() - now.getTime();
      const hoursLeft = diff / (1000 * 60 * 60);

      // Remind if due within 24 hours
      if (hoursLeft > 0 && hoursLeft <= 24) {
        const label = hoursLeft <= 1 ? 'less than 1 hour' : `${Math.ceil(hoursLeft)} hours`;
        showToast(`⏰ "${d.title}" is due in ${label}!`);

        // Browser notification
        if (notifEnabled && Notification.permission === 'granted') {
          new Notification(`📚 Deadline Reminder`, {
            body: `"${d.title}" (${d.subject}) is due in ${label}!`,
            icon: '/favicon.ico',
          });
        }

        setDeadlines(prev =>
          prev.map(x => x.id === d.id ? { ...x, notified: true } : x)
        );
      }

      // Overdue alert
      if (hoursLeft < 0 && hoursLeft > -1) {
        showToast(`🚨 "${d.title}" is now overdue!`);
      }
    });
  }, [deadlines, notifEnabled]);

  useEffect(() => {
    checkReminders();
    const interval = setInterval(checkReminders, 60000);
    return () => clearInterval(interval);
  }, [checkReminders]);

  // Request notification permission
  const enableNotifications = async () => {
    if (!('Notification' in window)) {
      showToast('Browser notifications not supported.');
      return;
    }
    const perm = await Notification.requestPermission();
    if (perm === 'granted') {
      setNotifEnabled(true);
      localStorage.setItem('campus-notif', 'true');
      showToast('✅ Browser notifications enabled!');
    } else {
      showToast('Notifications blocked. Please allow in browser settings.');
    }
  };

  const addDeadline = () => {
    if (!form.title.trim() || !form.date) {
      showToast('Please fill in title and date.');
      return;
    }
    const newDl: Deadline = {
      id: Date.now().toString(),
      title: form.title.trim(),
      subject: form.subject,
      date: form.date,
      time: form.time,
      priority: form.priority,
      notified: false,
      createdAt: new Date().toISOString(),
    };
    setDeadlines(prev => [...prev, newDl]);
    setForm({ title: '', subject: 'Computer Science', date: '', time: '23:59', priority: 'High' });
    setShowForm(false);
    showToast('✅ Deadline added!');
  };

  const deleteDeadline = (id: string) => {
    setDeadlines(prev => prev.filter(d => d.id !== id));
    showToast('Deadline removed.');
  };

  // Filter + sort
  const filtered = deadlines
    .filter(d => filterPriority === 'All' || d.priority === filterPriority)
    .sort((a, b) => {
      if (sortBy === 'date') return new Date(a.date + 'T' + a.time).getTime() - new Date(b.date + 'T' + b.time).getTime();
      const order = { High: 0, Medium: 1, Low: 2 };
      return order[a.priority] - order[b.priority];
    });

  const overdue = filtered.filter(d => getDaysLeft(d.date, d.time) < 0);
  const upcoming = filtered.filter(d => getDaysLeft(d.date, d.time) >= 0);

  // Calendar helpers
  const calYear = calendarDate.getFullYear();
  const calMonth = calendarDate.getMonth();
  const firstDay = new Date(calYear, calMonth, 1).getDay();
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];

  const getDeadlinesForDay = (day: number) => {
    const dateStr = `${calYear}-${String(calMonth + 1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    return deadlines.filter(d => d.date === dateStr);
  };

  const today = new Date();
  const isToday = (day: number) =>
    day === today.getDate() && calMonth === today.getMonth() && calYear === today.getFullYear();

  return (
    <div className="flex flex-col h-full">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-zinc-800 border border-zinc-700 text-white text-sm px-5 py-3 rounded-2xl shadow-xl animate-pulse max-w-sm">
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-900 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Clock size={20} className="text-yellow-400" />
          <h2 className="text-base font-semibold text-white">Deadline Tracker</h2>
          <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2.5 py-1 rounded-lg">
            {upcoming.length} upcoming
          </span>
          {overdue.length > 0 && (
            <span className="text-xs bg-red-500/20 text-red-400 px-2.5 py-1 rounded-lg">
              {overdue.length} overdue
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={notifEnabled ? undefined : enableNotifications}
            className={`flex items-center gap-2 text-xs px-3 py-2 rounded-xl border transition-colors ${
              notifEnabled
                ? 'bg-green-500/20 border-green-500 text-green-400'
                : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-yellow-500 hover:text-yellow-400'
            }`}
          >
            {notifEnabled ? <Bell size={14} /> : <BellOff size={14} />}
            {notifEnabled ? 'Alerts On' : 'Enable Alerts'}
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 text-sm bg-yellow-500 hover:bg-yellow-400 text-black px-4 py-2 rounded-xl font-medium transition-colors"
          >
            <Plus size={16} /> Add Deadline
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 px-6 pt-4 border-b border-zinc-800">
        {(['list', 'calendar'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium rounded-t-xl transition-colors capitalize ${
              activeTab === tab
                ? 'bg-zinc-800 text-white border-b-2 border-yellow-400'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {tab === 'list' ? '📋 List View' : '📅 Calendar'}
          </button>
        ))}

        {activeTab === 'list' && (
          <div className="ml-auto flex items-center gap-2 pb-2">
            <select
              value={filterPriority}
              onChange={e => setFilterPriority(e.target.value as any)}
              className="bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs rounded-lg px-2 py-1.5 focus:outline-none"
            >
              <option>All</option>
              <option>High</option>
              <option>Medium</option>
              <option>Low</option>
            </select>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as any)}
              className="bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs rounded-lg px-2 py-1.5 focus:outline-none"
            >
              <option value="date">Sort: Date</option>
              <option value="priority">Sort: Priority</option>
            </select>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">

        {/* LIST VIEW */}
        {activeTab === 'list' && (
          <div className="max-w-2xl mx-auto space-y-6">
            {deadlines.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <Clock size={48} className="text-zinc-700 mb-4" />
                <p className="text-zinc-500 text-sm">No deadlines yet.</p>
                <p className="text-zinc-600 text-xs mt-1">Click "Add Deadline" to get started.</p>
              </div>
            )}

            {overdue.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-red-400 uppercase tracking-wider mb-3">🚨 Overdue</p>
                <div className="space-y-3">
                  {overdue.map(d => <DeadlineCard key={d.id} d={d} onDelete={deleteDeadline} />)}
                </div>
              </div>
            )}

            {upcoming.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">📌 Upcoming</p>
                <div className="space-y-3">
                  {upcoming.map(d => <DeadlineCard key={d.id} d={d} onDelete={deleteDeadline} />)}
                </div>
              </div>
            )}
          </div>
        )}

        {/* CALENDAR VIEW */}
        {activeTab === 'calendar' && (
          <div className="max-w-2xl mx-auto">
            {/* Calendar nav */}
            <div className="flex items-center justify-between mb-6">
              <button
                onClick={() => setCalendarDate(new Date(calYear, calMonth - 1))}
                className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors"
              >
                <ChevronLeft size={18} />
              </button>
              <h3 className="text-white font-semibold text-lg">
                {monthNames[calMonth]} {calYear}
              </h3>
              <button
                onClick={() => setCalendarDate(new Date(calYear, calMonth + 1))}
                className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors"
              >
                <ChevronRight size={18} />
              </button>
            </div>

            {/* Day labels */}
            <div className="grid grid-cols-7 mb-2">
              {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(day => (
                <div key={day} className="text-center text-xs font-medium text-zinc-500 py-2">{day}</div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: firstDay }).map((_, i) => (
                <div key={`empty-${i}`} />
              ))}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const dayDeadlines = getDeadlinesForDay(day);
                const hasHigh = dayDeadlines.some(d => d.priority === 'High');
                const hasMed = dayDeadlines.some(d => d.priority === 'Medium');
                return (
                  <div
                    key={day}
                    className={`min-h-[64px] rounded-xl p-2 border transition-colors ${
                      isToday(day)
                        ? 'bg-yellow-500/20 border-yellow-500'
                        : dayDeadlines.length > 0
                        ? 'bg-zinc-800 border-zinc-700'
                        : 'bg-zinc-900 border-zinc-800'
                    }`}
                  >
                    <div className={`text-xs font-medium mb-1 ${isToday(day) ? 'text-yellow-400' : 'text-zinc-400'}`}>
                      {day}
                    </div>
                    {dayDeadlines.slice(0, 2).map(d => (
                      <div
                        key={d.id}
                        className={`text-xs px-1.5 py-0.5 rounded-md mb-0.5 truncate ${PRIORITY_COLORS[d.priority].bg} ${PRIORITY_COLORS[d.priority].text}`}
                        title={d.title}
                      >
                        {d.title}
                      </div>
                    ))}
                    {dayDeadlines.length > 2 && (
                      <div className="text-xs text-zinc-500">+{dayDeadlines.length - 2} more</div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 mt-4 justify-center">
              {(['High','Medium','Low'] as Priority[]).map(p => (
                <div key={p} className="flex items-center gap-1.5 text-xs text-zinc-400">
                  <div className={`w-2.5 h-2.5 rounded-full ${PRIORITY_COLORS[p].dot}`} />
                  {p}
                </div>
              ))}
              <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" /> Today
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add Deadline Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-white font-semibold text-lg">Add New Deadline</h3>
              <button onClick={() => setShowForm(false)} className="text-zinc-500 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs text-zinc-400 mb-1.5 block">Assignment Title *</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. ML Assignment 3, Physics Lab Report..."
                  className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-yellow-500 placeholder-zinc-500"
                  autoFocus
                />
              </div>

              <div>
                <label className="text-xs text-zinc-400 mb-1.5 block">Subject</label>
                <select
                  value={form.subject}
                  onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
                  className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-yellow-500"
                >
                  {SUBJECTS.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-zinc-400 mb-1.5 block">Due Date *</label>
                  <input
                    type="date"
                    value={form.date}
                    onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                    className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-yellow-500"
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
                <div>
                  <label className="text-xs text-zinc-400 mb-1.5 block">Due Time</label>
                  <input
                    type="time"
                    value={form.time}
                    onChange={e => setForm(f => ({ ...f, time: e.target.value }))}
                    className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-yellow-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-zinc-400 mb-1.5 block">Priority</label>
                <div className="flex gap-2">
                  {(['High','Medium','Low'] as Priority[]).map(p => (
                    <button
                      key={p}
                      onClick={() => setForm(f => ({ ...f, priority: p }))}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-all ${
                        form.priority === p
                          ? `${PRIORITY_COLORS[p].bg} ${PRIORITY_COLORS[p].border} ${PRIORITY_COLORS[p].text}`
                          : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-600'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowForm(false)}
                  className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 py-3 rounded-xl font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={addDeadline}
                  className="flex-1 bg-yellow-500 hover:bg-yellow-400 text-black py-3 rounded-xl font-medium transition-colors"
                >
                  Add Deadline
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DeadlineCard({ d, onDelete }: { d: Deadline; onDelete: (id: string) => void }) {
  const days = getDaysLeft(d.date, d.time);
  const { label, color } = getStatusLabel(days);
  const pc = PRIORITY_COLORS[d.priority];
  const due = new Date(`${d.date}T${d.time}`);

  return (
    <div className={`bg-zinc-900 border rounded-2xl p-4 flex items-center gap-4 ${days < 0 ? 'border-red-500/30' : 'border-zinc-800'}`}>
      <div className={`w-1 self-stretch rounded-full ${pc.dot}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <p className="text-white font-medium text-sm truncate">{d.title}</p>
          <span className={`text-xs px-2 py-0.5 rounded-lg ${pc.bg} ${pc.text} flex-shrink-0`}>{d.priority}</span>
        </div>
        <p className="text-zinc-500 text-xs">{d.subject}</p>
        <p className="text-zinc-600 text-xs mt-0.5">
          {due.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} at {d.time}
        </p>
      </div>
      <div className="flex items-center gap-3 flex-shrink-0">
        <span className={`text-xs font-medium px-2.5 py-1 rounded-lg ${color}`}>{label}</span>
        <button
          onClick={() => onDelete(d.id)}
          className="text-zinc-600 hover:text-red-400 transition-colors p-1"
        >
          <Trash2 size={15} />
        </button>
      </div>
    </div>
  );
}