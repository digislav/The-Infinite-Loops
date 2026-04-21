'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Profile } from '@/types/profile.types';

interface ProfessionalSummarySectionProps {
  initialData: Profile;
  onSave: (data: Partial<Profile>) => Promise<void>;
}

const PROFESSIONAL_SUMMARY_FIELDS = ['headline', 'summary'] as const satisfies (keyof Profile)[];

export function ProfessionalSummarySection({
  initialData,
  onSave,
}: ProfessionalSummarySectionProps) {
  const [data, setData] = useState<Partial<Profile>>(initialData);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const hasUnsavedChanges = PROFESSIONAL_SUMMARY_FIELDS.some(
    (key) => (data[key] ?? '') !== (initialData[key] ?? ''),
  );

  useEffect(() => {
    if (!hasUnsavedChanges) return;
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault();
    }
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value } = e.target;
    setData((prev) => ({ ...prev, [name]: value }));
    setSaveStatus('idle');
    // Clear field error on change
    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: '' }));
    }
  }

  function validateSection(): boolean {
    const errors: Record<string, string> = {};

    // Required fields validation
    if (!data.headline?.trim()) {
      errors.headline = 'Headline is required.';
    }
    if (!data.summary?.trim()) {
      errors.summary = 'Summary is required.';
    } else if (data.summary.length < 10) {
      errors.summary = 'Summary must be at least 10 characters.';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return false;
    }

    return true;
  }

  async function handleSave() {
    if (!validateSection()) return;

    setIsSaving(true);
    setSaveStatus('idle');

    try {
      await onSave(data);
      setSaveStatus('success');
      setFieldErrors({});
    } catch (error) {
      setSaveStatus('error');
      console.error('Failed to save professional summary:', error);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-gray-200 bg-white p-6">
      {/* Section Header */}
      <div className="flex items-center justify-between border-b pb-4">
        <h3 className="text-lg font-semibold text-gray-900">Professional Summary</h3>
        {/* Status indicator in header */}
        {saveStatus === 'success' && (
          <span className="text-xs font-medium text-emerald-600">✓ Saved</span>
        )}
        {saveStatus === 'error' && (
          <span className="text-xs font-medium text-red-600">✗ Error</span>
        )}
        {hasUnsavedChanges && <span className="text-xs font-medium text-amber-600">● Unsaved</span>}
      </div>

      {/* Headline */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="headline">
          Headline <span className="text-red-500">*</span>
        </Label>
        <Input
          id="headline"
          name="headline"
          value={data.headline || ''}
          onChange={handleChange}
          placeholder="Full Stack Engineer | React | Node.js"
          className={fieldErrors.headline ? 'border-red-500' : ''}
        />
        {fieldErrors.headline && <p className="text-xs text-red-600">{fieldErrors.headline}</p>}
      </div>

      {/* Summary */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="summary">
            Summary <span className="text-red-500">*</span>
          </Label>
          <span className="text-xs text-gray-400">
            {data.summary?.length || 0} / 500 characters
          </span>
        </div>
        <textarea
          id="summary"
          name="summary"
          value={data.summary || ''}
          onChange={handleChange}
          maxLength={500}
          rows={5}
          placeholder="Write a short professional summary highlighting your expertise, accomplishments, and career goals..."
          className={`border-input bg-background ring-offset-background placeholder:text-muted-foreground w-full resize-none rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none ${
            fieldErrors.summary ? 'border-red-500' : 'focus-visible:ring-[#2E75B6]/50'
          }`}
        />
        {fieldErrors.summary && <p className="text-xs text-red-600">{fieldErrors.summary}</p>}
      </div>

      {/* Save Button and Status */}
      <div className="flex items-center justify-end gap-3 border-t pt-4">
        {saveStatus === 'error' && (
          <p className="text-sm font-medium text-red-600">Failed to save. Please try again.</p>
        )}
        <Button
          onClick={handleSave}
          disabled={Boolean(isSaving || !hasUnsavedChanges)}
          className="bg-[#2E75B6] text-white hover:bg-[#1F4E79] disabled:opacity-50"
        >
          {isSaving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </div>
  );
}
