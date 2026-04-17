'use client';

// CareerPreferencesSection — S2-019: Implement Career Preferences Section CRUD.
// Allows the user to set their target roles, location preferences,
// work mode preference, minimum salary, and currency.
//
// Uses upsert on the backend so save always works whether a record
// exists or not — no separate create/update logic needed on the frontend.
// Per S1-002 §11.1 — each profile section saves independently.
// Per S1-002 §5.3 — uses controlled inputs throughout.
// Per S1-003 — auth and ownership enforced on the backend.
//   We never send user_id from the client.

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// Work mode options matching the DB check constraint.
const WORK_MODES = ['Remote', 'On-site', 'Hybrid', 'Any'] as const;
type WorkMode = (typeof WORK_MODES)[number];

// Currency options — common currencies for salary input.
const CURRENCIES = ['USD', 'EUR', 'GBP', 'CAD', 'AUD'];

export function CareerPreferencesSection() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [hasChanges, setHasChanges] = useState(false);

  // Form field state — controlled inputs per S1-002 §5.3.
  // target_roles and location_preferences are stored as arrays but
  // edited as comma-separated strings for simplicity.
  const [targetRoles, setTargetRoles] = useState('');
  const [locationPreferences, setLocationPreferences] = useState('');
  const [workMode, setWorkMode] = useState<WorkMode>('Any');
  const [minSalary, setMinSalary] = useState('');
  const [currency, setCurrency] = useState('USD');

  // Fetch existing career preferences on mount.
  useEffect(() => {
    let cancelled = false;

    const loadPreferences = async () => {
      if (!cancelled) {
        setLoading(true);
        setError(null);
      }

      try {
        // Fetch from the protected API route.
        // Auth and ownership enforced server-side per S1-003 §5.4.
        const res = await fetch('/api/career-preferences');
        if (!res.ok) {
          if (!cancelled) setError('Could not load career preferences.');
          return;
        }
        const data = await res.json();

        // Populate form fields from existing data.
        // target_roles and location_preferences are arrays — join to string for editing.
        if (!cancelled && data) {
          setTargetRoles((data.target_roles ?? []).join(', '));
          setLocationPreferences((data.location_preferences ?? []).join(', '));
          setWorkMode(data.work_mode ?? 'Any');
          setMinSalary(data.min_salary ? String(data.min_salary) : '');
          setCurrency(data.currency ?? 'USD');
        }
      } catch {
        // Human-friendly error — never raw error objects per S1-001 §6.3.
        if (!cancelled) setError('Could not load career preferences.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadPreferences();
    return () => {
      cancelled = true;
    };
  }, []);

  // markChanged — called on any field change to enable the save button.
  function markChanged() {
    setHasChanges(true);
    setSaveStatus('idle');
  }

  // handleSave — sends a POST (upsert) to the career preferences API.
  // The backend handles both create and update in one operation.
  async function handleSave() {
    setIsSaving(true);
    setSaveStatus('idle');

    try {
      // Parse comma-separated strings back to arrays.
      // Filter out empty strings from trailing commas.
      const payload = {
        target_roles: targetRoles
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        location_preferences: locationPreferences
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        work_mode: workMode,
        // Parse salary as integer — undefined if empty string.
        min_salary: minSalary ? parseInt(minSalary, 10) : undefined,
        currency,
        // user_id is never sent from the client per S1-003 §5.4.
        // The backend sources it from the verified session.
      };

      const res = await fetch('/api/career-preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        setSaveStatus('error');
        return;
      }

      setSaveStatus('success');
      setHasChanges(false);
    } catch {
      setSaveStatus('error');
    } finally {
      setIsSaving(false);
    }
  }

  // LOADING STATE — skeletons per S1-002 §9.2.
  if (loading) {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-5 w-1/3" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-1/2" />
      </div>
    );
  }

  // ERROR STATE — human-friendly message per S1-001 §6.3.
  if (error) {
    return <p className="text-sm text-red-500">{error}</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Section header */}
      <h2 className="border-b pb-2 text-xl font-semibold text-gray-900">Career Preferences</h2>

      {/* Target Roles — comma-separated list of desired job titles */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="target-roles" className="text-sm">
          Target Roles <span className="text-xs text-gray-400">(optional)</span>
        </Label>
        <Input
          id="target-roles"
          value={targetRoles}
          onChange={(e) => {
            setTargetRoles(e.target.value);
            markChanged();
          }}
          placeholder="Software Engineer, Frontend Developer, Full Stack Engineer"
        />
        <p className="text-xs text-gray-400">Separate multiple roles with commas</p>
      </div>

      {/* Location Preferences — comma-separated list of preferred locations */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="location-prefs" className="text-sm">
          Location Preferences <span className="text-xs text-gray-400">(optional)</span>
        </Label>
        <Input
          id="location-prefs"
          value={locationPreferences}
          onChange={(e) => {
            setLocationPreferences(e.target.value);
            markChanged();
          }}
          placeholder="New York, NY, Remote, Newark, NJ"
        />
        <p className="text-xs text-gray-400">Separate multiple locations with commas</p>
      </div>

      {/* Work Mode — dropdown matching DB check constraint values */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="work-mode" className="text-sm">
          Work Mode <span className="text-xs text-gray-400">(optional)</span>
        </Label>
        <Select
          value={workMode}
          onValueChange={(val) => {
            setWorkMode(val as WorkMode);
            markChanged();
          }}
        >
          <SelectTrigger id="work-mode" className="w-full sm:w-1/3">
            <SelectValue placeholder="Select work mode" />
          </SelectTrigger>
          <SelectContent>
            {WORK_MODES.map((mode) => (
              <SelectItem key={mode} value={mode}>
                {mode}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Minimum Salary and Currency — side by side on desktop */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="min-salary" className="text-sm">
            Minimum Salary <span className="text-xs text-gray-400">(optional)</span>
          </Label>
          <Input
            id="min-salary"
            type="number"
            value={minSalary}
            onChange={(e) => {
              setMinSalary(e.target.value);
              markChanged();
            }}
            placeholder="80000"
            min={0}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="currency" className="text-sm">
            Currency <span className="text-xs text-gray-400">(optional)</span>
          </Label>
          <Select
            value={currency}
            onValueChange={(val) => {
              setCurrency(val);
              markChanged();
            }}
          >
            <SelectTrigger id="currency" className="w-full">
              <SelectValue placeholder="Select currency" />
            </SelectTrigger>
            <SelectContent>
              {CURRENCIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Save feedback and button — per S1-002 §11.1 independent section save */}
      <div className="flex items-center justify-end gap-4">
        {saveStatus === 'success' && (
          <p className="text-sm font-medium text-emerald-600">✓ Career preferences saved</p>
        )}
        {saveStatus === 'error' && (
          <p className="text-sm font-medium text-red-600">Failed to save. Please try again.</p>
        )}
        <Button
          onClick={handleSave}
          disabled={isSaving || !hasChanges}
          className="bg-[#2E75B6] text-white hover:bg-[#1F4E79] disabled:opacity-50"
        >
          {isSaving ? 'Saving...' : 'Save Preferences'}
        </Button>
      </div>
    </div>
  );
}
