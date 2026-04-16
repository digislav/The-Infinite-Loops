'use client';

// EducationSection — S2-017: Implement Education Section CRUD.
// Displays all education records and allows the user to add, edit,
// and delete entries.
//
// Follows the same pattern as ExperienceSection per S1-002 §12.1 —
// consistency across all profile sections.
// Per S1-002 §11.1 — each profile section saves independently.
// Per S1-002 §5.3 — uses controlled inputs throughout.
// Per S1-003 — auth and ownership enforced on the backend.
//   We never send user_id from the client.

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import type { Education } from '@/lib/services/educationService';

export function EducationSection() {
  const [education, setEducation] = useState<Education[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Controls which record is being edited — null means none.
  const [editingId, setEditingId] = useState<string | null>(null);
  // Controls whether the add form is visible.
  const [isAdding, setIsAdding] = useState(false);
  // Controls save loading state.
  const [isSaving, setIsSaving] = useState(false);

  // Form field state — controlled inputs per S1-002 §5.3.
  const [institution, setInstitution] = useState('');
  const [degree, setDegree] = useState('');
  const [fieldOfStudy, setFieldOfStudy] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isCurrent, setIsCurrent] = useState(false);
  const [honorsGpa, setHonorsGpa] = useState('');
  const [description, setDescription] = useState('');
  // Inline validation error per S1-002 §5.3.
  const [formError, setFormError] = useState<string | null>(null);

  // Fetch all education records on mount.
  useEffect(() => {
    let cancelled = false;

    const loadEducation = async () => {
      if (!cancelled) {
        setLoading(true);
        setError(null);
      }

      try {
        // Fetch from the protected API route.
        // Auth and ownership enforced server-side per S1-003 §5.4.
        const res = await fetch('/api/profile/education');
        if (!res.ok) {
          if (!cancelled) setError('Could not load education records.');
          return;
        }
        const json = await res.json();
        if (!cancelled) setEducation(json.data ?? []);
      } catch {
        if (!cancelled) setError('Could not load education records.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadEducation();
    return () => {
      cancelled = true;
    };
  }, []);

  // resetForm — clears all form fields and validation errors.
  function resetForm() {
    setInstitution('');
    setDegree('');
    setFieldOfStudy('');
    setStartDate('');
    setEndDate('');
    setIsCurrent(false);
    setHonorsGpa('');
    setDescription('');
    setFormError(null);
  }

  // populateForm — fills form fields from an existing record for editing.
  function populateForm(record: Education) {
    setInstitution(record.institution);
    setDegree(record.degree);
    setFieldOfStudy(record.field_of_study);
    setStartDate(record.start_date ?? '');
    setEndDate(record.end_date ?? '');
    setIsCurrent(record.is_current);
    setHonorsGpa(record.honors_gpa ?? '');
    setDescription(record.description ?? '');
    setFormError(null);
  }

  // handleStartAdd — opens the add form.
  function handleStartAdd() {
    resetForm();
    setEditingId(null);
    setIsAdding(true);
  }

  // handleStartEdit — populates form with existing record data.
  function handleStartEdit(record: Education) {
    populateForm(record);
    setEditingId(record.id ?? null);
    setIsAdding(false);
  }

  // handleCancel — closes the form without saving.
  function handleCancel() {
    setIsAdding(false);
    setEditingId(null);
    resetForm();
  }

  // validateForm — checks required fields before saving.
  // Per S1-002 §5.3 — validation runs on submit.
  function validateForm(): boolean {
    if (!institution.trim()) {
      setFormError('Institution name is required.');
      return false;
    }
    if (!degree.trim()) {
      setFormError('Degree is required.');
      return false;
    }
    if (!fieldOfStudy.trim()) {
      setFormError('Field of study is required.');
      return false;
    }
    return true;
  }

  // handleSave — creates or updates an education record.
  async function handleSave() {
    if (!validateForm()) return;

    setIsSaving(true);
    setFormError(null);

    const payload = {
      institution: institution.trim(),
      degree: degree.trim(),
      field_of_study: fieldOfStudy.trim(),
      start_date: startDate || undefined,
      // If currently enrolled end_date should be null.
      end_date: isCurrent ? undefined : endDate || undefined,
      is_current: isCurrent,
      honors_gpa: honorsGpa.trim() || undefined,
      description: description.trim() || undefined,
      order_index: editingId
        ? (education.find((e) => e.id === editingId)?.order_index ?? 0)
        : education.length,
    };

    try {
      if (editingId) {
        // UPDATE existing record.
        // Backend enforces ownership via .eq('user_id', userId).
        // We never send user_id from the client per S1-003 §5.4.
        const res = await fetch(`/api/profile/education/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          setFormError('Failed to update education record. Please try again.');
          return;
        }
        const json = await res.json();
        // Update the record in local state optimistically.
        setEducation((prev) => prev.map((e) => (e.id === editingId ? json.data : e)));
        setEditingId(null);
      } else {
        // CREATE new record.
        const res = await fetch('/api/profile/education', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          setFormError('Failed to save education record. Please try again.');
          return;
        }
        const json = await res.json();
        // Add the new record to local state.
        setEducation((prev) => [...prev, json.data]);
        setIsAdding(false);
      }
      resetForm();
    } catch {
      // Human-friendly error — never raw error objects per S1-001 §6.3.
      setFormError('Failed to save education record. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }

  // handleDelete — deletes an education record with confirmation.
  // Per S1-002 §9.4 — destructive actions require confirmation dialog.
  async function handleDelete(record: Education) {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${record.degree} at ${record.institution}"? This cannot be undone.`,
    );
    if (!confirmed) return;

    try {
      // Backend enforces ownership — we only pass the record ID.
      const res = await fetch(`/api/profile/education/${record.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        alert('Failed to delete education record. Please try again.');
        return;
      }
      // Remove from local state after successful delete.
      setEducation((prev) => prev.filter((e) => e.id !== record.id));
    } catch {
      alert('Failed to delete education record. Please try again.');
    }
  }

  // LOADING STATE — skeletons per S1-002 §9.2.
  if (loading) {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-5 w-1/3" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
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
      <div className="flex items-center justify-between border-b pb-2">
        <h2 className="text-xl font-semibold text-gray-900">Education</h2>
        {/* Only show Add button when no form is open */}
        {!isAdding && !editingId && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleStartAdd}
            className="h-8 rounded-full bg-blue-50 px-4 text-xs font-semibold text-blue-600 hover:bg-blue-100 hover:text-blue-700"
          >
            + Add Education
          </Button>
        )}
      </div>

      {/* ADD / EDIT FORM — inline per S1-002 §11.1 independent section saves.
          Per S1-002 §5.3 — all inputs are controlled with labels.
          Required fields marked with red asterisk per S1-002 §5.3. */}
      {(isAdding || editingId) && (
        <div className="flex flex-col gap-4 rounded-lg border border-blue-100 bg-blue-50/50 p-4">
          <h3 className="text-sm font-semibold text-gray-700">
            {editingId ? 'Edit Education' : 'New Education'}
          </h3>

          {/* Institution — required */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edu-institution" className="text-sm">
              Institution <span className="text-red-500">*</span>
            </Label>
            <Input
              id="edu-institution"
              value={institution}
              onChange={(e) => setInstitution(e.target.value)}
              placeholder="New Jersey Institute of Technology"
            />
          </div>

          {/* Degree and Field of Study — required, side by side on desktop */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edu-degree" className="text-sm">
                Degree <span className="text-red-500">*</span>
              </Label>
              <Input
                id="edu-degree"
                value={degree}
                onChange={(e) => setDegree(e.target.value)}
                placeholder="Bachelor of Science"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edu-field" className="text-sm">
                Field of Study <span className="text-red-500">*</span>
              </Label>
              <Input
                id="edu-field"
                value={fieldOfStudy}
                onChange={(e) => setFieldOfStudy(e.target.value)}
                placeholder="Computer Science"
              />
            </div>
          </div>

          {/* Start and End Date — optional, side by side on desktop */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edu-start" className="text-sm">
                Start Date <span className="text-xs text-gray-400">(optional)</span>
              </Label>
              <Input
                id="edu-start"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edu-end" className="text-sm">
                End Date <span className="text-xs text-gray-400">(optional)</span>
              </Label>
              <Input
                id="edu-end"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                disabled={isCurrent}
              />
            </div>
          </div>

          {/* Currently Enrolled checkbox */}
          <div className="flex items-center gap-2">
            <Checkbox
              id="edu-current"
              checked={isCurrent}
              onCheckedChange={(checked) => {
                setIsCurrent(!!checked);
                // Clear end date when marking as current per S1-002 §5.3.
                if (checked) setEndDate('');
              }}
            />
            <Label htmlFor="edu-current" className="cursor-pointer text-sm text-gray-600">
              Currently enrolled
            </Label>
          </div>

          {/* Honors / GPA — optional */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edu-honors" className="text-sm">
              Honors / GPA <span className="text-xs text-gray-400">(optional)</span>
            </Label>
            <Input
              id="edu-honors"
              value={honorsGpa}
              onChange={(e) => setHonorsGpa(e.target.value)}
              placeholder="Magna Cum Laude / 3.8"
            />
          </div>

          {/* Description — optional */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edu-description" className="text-sm">
              Description <span className="text-xs text-gray-400">(optional)</span>
            </Label>
            <textarea
              id="edu-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Relevant coursework, activities, or achievements..."
              className="min-h-[80px] w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:border-[#2E75B6] focus:ring-2 focus:ring-[#2E75B6]/50 focus:outline-none"
            />
          </div>

          {/* Inline validation error — per S1-002 §5.3 */}
          {formError && <p className="text-sm text-red-600">{formError}</p>}

          {/* Form actions — primary button bottom right per S1-002 §5.2 */}
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCancel}
              disabled={isSaving}
              className="text-gray-500 hover:text-gray-700"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={isSaving}
              className="bg-[#2E75B6] text-white hover:bg-[#1F4E79]"
            >
              {isSaving ? 'Saving...' : editingId ? 'Save Changes' : 'Add Education'}
            </Button>
          </div>
        </div>
      )}

      {/* EDUCATION LIST — shows all records.
          Per S1-002 §5.7 — empty state when no records exist. */}
      {education.length === 0 && !isAdding ? (
        <p className="text-sm text-gray-400">No education records yet. Add your first entry.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {education.map((record) => (
            <div
              key={record.id}
              className="flex flex-col gap-1 rounded-lg border border-gray-100 bg-white p-4"
            >
              {/* Record header — degree and institution */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-semibold text-gray-900">
                    {record.degree} in {record.field_of_study}
                  </span>
                  <span className="text-sm text-gray-600">{record.institution}</span>
                  {/* Date range */}
                  {(record.start_date || record.end_date || record.is_current) && (
                    <span className="text-xs text-gray-400">
                      {record.start_date ?? ''}{' '}
                      {record.is_current
                        ? '— Present'
                        : record.end_date
                          ? `— ${record.end_date}`
                          : ''}
                    </span>
                  )}
                  {/* Honors / GPA */}
                  {record.honors_gpa && (
                    <span className="text-xs text-gray-500">{record.honors_gpa}</span>
                  )}
                  {/* Description */}
                  {record.description && (
                    <p className="mt-1 text-xs text-gray-500">{record.description}</p>
                  )}
                </div>

                {/* Edit and Delete buttons — per S1-002 §5.2 */}
                <div className="flex shrink-0 gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleStartEdit(record)}
                    className="h-7 px-2 text-xs text-gray-400 hover:text-blue-600"
                  >
                    Edit
                  </Button>
                  {/* Destructive action — separated visually per S1-002 §5.2 */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(record)}
                    className="h-7 px-2 text-xs text-gray-400 hover:text-red-600"
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
