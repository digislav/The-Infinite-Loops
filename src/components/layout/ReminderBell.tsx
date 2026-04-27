'use client';

import { Bell } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

interface Reminder {
  id: string;
  notes: string | null;
  interview_date: string;
  timeline_event_type: string | null;
  job_id: string;
  jobs: {
    job_title: string;
    company_name: string;
  };
}

export function ReminderBell() {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/reminders')
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (!cancelled && json?.data) setReminders(json.data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const count = reminders.length;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        aria-label={`${count} upcoming reminder${count !== 1 ? 's' : ''}`}
        className={cn(
          'hover:bg-accent relative flex h-9 w-9 items-center justify-center rounded-md transition-colors',
          open && 'bg-accent',
        )}
      >
        <Bell size={22} fill="#2E75B6" stroke="white" strokeWidth={1.5} />
        {count > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 rounded-md border bg-white shadow-lg">
          <div className="border-b px-4 py-3">
            <p className="text-sm font-semibold text-gray-900">Upcoming Reminders</p>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {reminders.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-gray-400">No upcoming reminders</p>
            ) : (
              <ul className="flex flex-col divide-y">
                {reminders.map((r) => (
                  <li key={r.id} className="flex flex-col gap-0.5 px-4 py-3">
                    <span className="text-sm font-semibold text-gray-900">{r.jobs.job_title}</span>
                    <span className="text-xs text-gray-500">{r.jobs.company_name}</span>
                    {r.notes && <span className="text-xs text-gray-500">{r.notes}</span>}
                    <span className="mt-0.5 text-xs font-medium text-[#2E75B6]">
                      {new Date(r.interview_date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
