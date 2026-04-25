'use client';

// ExperienceSection — S2-016: Implement Experience Section CRUD.
// Displays all professional experience records and allows the user to add, edit,
// and delete entries.
//
// Follows the pattern of EducationSection per S1-002 §12.1 — consistency across profile sections.
// Per S1-002 §11.1 — each profile section saves independently.
// Per S1-002 §5.3 — uses controlled inputs throughout.
// Per S1-003 — auth and ownership enforced on the backend.

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import type { Experience } from '@/lib/services/experienceServices';
import { isEndDateBeforeStartDate } from '@/lib/utils/dateValidation';

export function ExperienceSection() {
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Form field state
  const [companyName, setCompanyName] = useState('');
  const [roleTitle, setRoleTitle] = useState('');
  const [location, setLocation] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isCurrent, setIsCurrent] = useState(false);
  const [description, setDescription] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // Fetch experiences on mount
  useEffect(() => {
    let cancelled = false;

    const loadExperiences = async () => {
      if (!cancelled) {
        setLoading(true);
        setError(null);
      }

      try {
        const res = await fetch('/api/experiences');
        if (!res.ok) {
          if (!cancelled) setError('Could not load experience records.');
          return;
        }
        const json = await res.json();
        // Assuming your standard API returns { data: [...] }
        if (!cancelled) setExperiences(json.data ?? json);
      } catch {
        if (!cancelled) setError('Could not load experience records.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadExperiences();
    return () => {
      cancelled = true;
    };
  }, []);

  function resetForm() {
    setCompanyName('');
    setRoleTitle('');
    setLocation('');
    setStartDate('');
    setEndDate('');
    setIsCurrent(false);
    setDescription('');
    setFormError(null);
  }

  function populateForm(record: Experience) {
    setCompanyName(record.company_name);
    setRoleTitle(record.role_title);
    setLocation(record.location ?? '');
    setStartDate(record.start_date ?? '');
    setEndDate(record.end_date ?? '');
    setIsCurrent(record.is_current);
    setDescription(record.description ?? '');
    setFormError(null);
  }

  function handleStartAdd() {
    resetForm();
    setEditingId(null);
    setIsAdding(true);
  }

  function handleStartEdit(record: Experience) {
    populateForm(record);
    setEditingId(record.id ?? null);
    setIsAdding(false);
  }

  function handleCancel() {
    setIsAdding(false);
    setEditingId(null);
    resetForm();
  }

  function validateForm(): boolean {
    if (!companyName.trim()) {
      setFormError('Company name is required.');
      return false;
    }
    if (!roleTitle.trim()) {
      setFormError('Role title is required.');
      return false;
    }
    if (!isCurrent && isEndDateBeforeStartDate(startDate, endDate)) {
      setFormError('End date cannot be before the start date.');
      return false;
    }
    return true;
  }

  async function handleSave() {
    if (!validateForm()) return;

    setIsSaving(true);
    setFormError(null);

    const payload = {
      company_name: companyName.trim(),
      role_title: roleTitle.trim(),
      location: location.trim() || undefined,
      start_date: startDate || undefined,
      end_date: isCurrent ? undefined : endDate || undefined,
      is_current: isCurrent,
      description: description.trim() || undefined,
      order_index: editingId
        ? (experiences.find((e) => e.id === editingId)?.order_index ?? 0)
        : experiences.length,
    };

    try {
      const url = editingId ? `/api/experiences/${editingId}` : '/api/experiences';
      const method = editingId ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        setFormError('Failed to save experience. Please try again.');
        return;
      }

      const json = await res.json();
      const savedData = json.data ?? json;

      if (editingId) {
        setExperiences((prev) => prev.map((e) => (e.id === editingId ? savedData : e)));
        setEditingId(null);
      } else {
        setExperiences((prev) => [...prev, savedData]);
        setIsAdding(false);
      }
      resetForm();
    } catch (_err) {
      setFormError('Failed to save experience. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(record: Experience) {
    const confirmed = window.confirm(`Delete "${record.role_title} at ${record.company_name}"?`);
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/experiences/${record.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      setExperiences((prev) => prev.filter((e) => e.id !== record.id));
    } catch {
      alert('Failed to delete experience.');
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-5 w-1/3" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  if (error) return <p className="text-sm text-red-500">{error}</p>;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between border-b pb-2">
        <h2 className="text-xl font-semibold text-gray-900">Experience</h2>
        {!isAdding && !editingId && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleStartAdd}
            className="h-8 rounded-full bg-blue-50 px-4 text-xs font-semibold text-blue-600"
          >
            + Add Experience
          </Button>
        )}
      </div>

      {(isAdding || editingId) && (
        <div className="flex flex-col gap-4 rounded-lg border border-blue-100 bg-blue-50/50 p-4">
          <h3 className="text-sm font-semibold text-gray-700">
            {editingId ? 'Edit Experience' : 'New Experience'}
          </h3>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="exp-company">
              Company <span className="text-red-500">*</span>
            </Label>
            <Input
              id="exp-company"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Google"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="exp-role">
                Role Title <span className="text-red-500">*</span>
              </Label>
              <Input
                id="exp-role"
                value={roleTitle}
                onChange={(e) => setRoleTitle(e.target.value)}
                placeholder="Software Engineer"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="exp-location">Location</Label>
              <Input
                id="exp-location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Remote / New York"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="exp-start">Start Date</Label>
              <Input
                id="exp-start"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="exp-end">End Date</Label>
              <Input
                id="exp-end"
                type="date"
                min={startDate || undefined}
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                disabled={isCurrent}
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="exp-current"
              checked={isCurrent}
              onCheckedChange={(checked) => {
                setIsCurrent(!!checked);
                if (checked) setEndDate('');
              }}
            />
            <Label htmlFor="exp-current" className="text-sm text-gray-600">
              I currently work here
            </Label>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="exp-description">Description</Label>
            <textarea
              id="exp-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Key achievements and responsibilities..."
              className="min-h-[80px] w-full rounded-md border border-gray-300 p-2 text-sm focus:ring-2 focus:ring-blue-500/50 focus:outline-none"
            />
          </div>

          {formError && <p className="text-sm text-red-600">{formError}</p>}

          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={handleCancel}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={isSaving}
              className="bg-[#2E75B6] text-white"
            >
              {isSaving ? 'Saving...' : 'Save Experience'}
            </Button>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {experiences.map((record) => (
          <div
            key={record.id}
            className="flex flex-col gap-1 rounded-lg border border-gray-100 bg-white p-4"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-semibold text-gray-900">{record.role_title}</span>
                <span className="text-sm text-gray-600">{record.company_name}</span>
                <span className="text-xs text-gray-400">
                  {record.start_date}{' '}
                  {record.is_current ? '— Present' : record.end_date ? `— ${record.end_date}` : ''}
                </span>
                {record.description && (
                  <p className="mt-1 text-xs whitespace-pre-wrap text-gray-500">
                    {record.description}
                  </p>
                )}
              </div>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleStartEdit(record)}
                  className="h-7 text-xs text-gray-400 hover:text-blue-600"
                >
                  Edit
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(record)}
                  className="h-7 text-xs text-gray-400 hover:text-red-600"
                >
                  Delete
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
