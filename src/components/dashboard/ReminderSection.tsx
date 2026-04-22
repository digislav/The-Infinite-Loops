'use client';

import { useEffect, useState } from 'react';
import { BellRing, CheckCircle2, Clock3 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { formatTimestamp } from '@/lib/utils/dateFormatters';

interface ReminderSectionProps {
  jobId: string;
  onReminderSaved: () => void;
}

interface Reminder {
  id: string;
  notes?: string;
  interview_date?: string;
  activity_date: string;
  activity_type: 'REMINDER_SET';
  timeline_event_type?: string;
  is_completed?: boolean;
}

function getReminderDate(reminder: Reminder) {
  return reminder.interview_date ?? reminder.activity_date;
}

function isReminderOverdue(reminder: Reminder) {
  if (reminder.is_completed) return false;
  return new Date(getReminderDate(reminder)).getTime() < Date.now();
}

function sortReminders(reminders: Reminder[]) {
  return [...reminders].sort((a, b) => {
    if (Boolean(a.is_completed) !== Boolean(b.is_completed)) {
      return a.is_completed ? 1 : -1;
    }
    return new Date(getReminderDate(a)).getTime() - new Date(getReminderDate(b)).getTime();
  });
}

function getMinDateTimeLocal() {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 16);
}

export function ReminderSection({ jobId, onReminderSaved }: ReminderSectionProps) {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [updatingReminderId, setUpdatingReminderId] = useState<string | null>(null);
  const [reminderDate, setReminderDate] = useState('');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const pendingCount = reminders.filter((reminder) => !reminder.is_completed).length;
  const overdueCount = reminders.filter(isReminderOverdue).length;

  useEffect(() => {
    let cancelled = false;

    const loadReminders = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/jobs/${jobId}/activities`);
        if (!res.ok) return;
        const json = await res.json();
        const all = json.data ?? [];

        if (!cancelled) {
          setReminders(
            sortReminders(
              all.filter((activity: Reminder) => activity.activity_type === 'REMINDER_SET'),
            ),
          );
        }
      } catch {
        // The timeline still remains usable if the compact reminder list fails.
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadReminders();
    return () => {
      cancelled = true;
    };
  }, [jobId]);

  function resetForm() {
    setReminderDate('');
    setNotes('');
    setFormError(null);
  }

  function handleCancel() {
    setIsAdding(false);
    resetForm();
  }

  async function handleSave() {
    if (!reminderDate) {
      setFormError('Please select a reminder date and time.');
      return;
    }

    const selectedDate = new Date(reminderDate);
    if (Number.isNaN(selectedDate.getTime())) {
      setFormError('Please enter a valid reminder date.');
      return;
    }

    if (selectedDate.getTime() < Date.now()) {
      setFormError('Reminder date must be in the future.');
      return;
    }

    setIsSaving(true);
    setFormError(null);

    try {
      const res = await fetch(`/api/jobs/${jobId}/activities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reminder_date: selectedDate.toISOString(),
          notes: notes.trim() || undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json?.success) {
        setFormError('Failed to save reminder. Please try again.');
        return;
      }

      const saved: Reminder = json.data;
      setReminders((prev) => sortReminders([saved, ...prev]));
      setIsAdding(false);
      resetForm();
      onReminderSaved();
    } catch {
      setFormError('Failed to save reminder. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleToggleReminder(reminder: Reminder) {
    setUpdatingReminderId(reminder.id);
    try {
      const completed = !reminder.is_completed;
      const res = await fetch(`/api/jobs/${jobId}/activities/${reminder.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_completed: completed }),
      });

      const json = await res.json();
      if (!res.ok || !json?.success) {
        throw new Error('Failed to update reminder.');
      }

      setReminders((current) =>
        sortReminders(
          current.map((item) =>
            item.id === reminder.id ? { ...item, is_completed: completed } : item,
          ),
        ),
      );
      onReminderSaved();
    } catch {
      setFormError('Unable to update reminder status. Please try again.');
    } finally {
      setUpdatingReminderId(null);
    }
  }

  return (
    <section className="flex flex-col gap-4 rounded-xl border border-blue-100 bg-blue-50/40 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700">
            <BellRing className="h-4 w-4" aria-hidden="true" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-800">Follow-ups & Reminders</h3>
            <p className="text-xs text-gray-500">
              Keep the next action visible so applications do not go stale.
            </p>
            {!loading && reminders.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                <Badge className="rounded-full border-0 bg-white px-2 py-0.5 text-xs text-blue-700">
                  {pendingCount} pending
                </Badge>
                {overdueCount > 0 && (
                  <Badge className="rounded-full border-0 bg-red-100 px-2 py-0.5 text-xs text-red-700">
                    {overdueCount} overdue
                  </Badge>
                )}
              </div>
            )}
          </div>
        </div>

        {!isAdding && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setIsAdding(true);
              setFormError(null);
            }}
            className="h-8 rounded-full bg-white px-3 text-xs font-semibold text-blue-700 shadow-sm hover:bg-blue-100"
          >
            + Add Reminder
          </Button>
        )}
      </div>

      {isAdding && (
        <div className="flex flex-col gap-3 rounded-lg border border-blue-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="reminder-date" className="text-xs font-medium text-gray-600">
              Reminder Date & Time <span className="text-red-500">*</span>
            </Label>
            <Input
              id="reminder-date"
              type="datetime-local"
              min={getMinDateTimeLocal()}
              value={reminderDate}
              onChange={(e) => {
                setReminderDate(e.target.value);
                setFormError(null);
              }}
              className="text-sm"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="reminder-notes" className="text-xs font-medium text-gray-600">
              Notes <span className="text-xs text-gray-400">(optional)</span>
            </Label>
            <textarea
              id="reminder-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Send thank you email or follow up if no response"
              className="min-h-[72px] rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:border-[#2E75B6] focus:ring-2 focus:ring-[#2E75B6]/30 focus:outline-none"
            />
          </div>

          {formError && <p className="text-xs font-medium text-red-600">{formError}</p>}

          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCancel}
              disabled={isSaving}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={isSaving}
              className="bg-[#2E75B6] text-xs text-white hover:bg-[#1F4E79] disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : 'Save Reminder'}
            </Button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-14 w-full rounded-lg" />
          <Skeleton className="h-14 w-full rounded-lg" />
        </div>
      ) : reminders.length === 0 && !isAdding ? (
        <div className="rounded-lg border border-dashed border-blue-200 bg-white/70 px-4 py-5 text-center">
          <p className="text-sm font-medium text-gray-700">No reminders yet</p>
          <p className="mt-1 text-xs text-gray-500">
            Add one when you need to follow up with a recruiter or hiring manager.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {reminders.map((reminder) => {
            const overdue = isReminderOverdue(reminder);
            return (
              <div
                key={reminder.id}
                className={cn(
                  'flex flex-col gap-3 rounded-lg border bg-white px-3 py-3 shadow-sm sm:flex-row sm:items-start sm:justify-between',
                  reminder.is_completed && 'border-emerald-100 bg-emerald-50/40',
                  overdue && 'border-red-100 bg-red-50/50',
                  !reminder.is_completed && !overdue && 'border-gray-100',
                )}
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    {reminder.is_completed ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden="true" />
                    ) : (
                      <Clock3
                        className={cn('h-4 w-4', overdue ? 'text-red-600' : 'text-blue-600')}
                        aria-hidden="true"
                      />
                    )}
                    <span
                      className={cn(
                        'text-xs font-semibold',
                        reminder.is_completed && 'text-emerald-700',
                        overdue && 'text-red-700',
                        !reminder.is_completed && !overdue && 'text-blue-700',
                      )}
                    >
                      {formatTimestamp(getReminderDate(reminder))}
                    </span>
                    <Badge
                      className={cn(
                        'rounded-full border-0 px-2 py-0.5 text-xs',
                        reminder.is_completed && 'bg-emerald-100 text-emerald-700',
                        overdue && 'bg-red-100 text-red-700',
                        !reminder.is_completed && !overdue && 'bg-blue-100 text-blue-700',
                      )}
                    >
                      {reminder.is_completed ? 'Completed' : overdue ? 'Overdue' : 'Pending'}
                    </Badge>
                  </div>
                  {reminder.notes ? (
                    <p className="mt-1 text-xs text-gray-600">{reminder.notes}</p>
                  ) : (
                    <p className="mt-1 text-xs text-gray-400">No note added.</p>
                  )}
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleToggleReminder(reminder)}
                  disabled={updatingReminderId === reminder.id}
                  className="h-7 shrink-0 rounded-full px-2 text-xs text-gray-600 hover:bg-gray-100"
                >
                  {updatingReminderId === reminder.id
                    ? 'Updating...'
                    : reminder.is_completed
                      ? 'Reopen'
                      : 'Complete'}
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
