'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Profile } from '@/types/profile.types';

interface PersonalInfoSectionProps {
  initialData: Profile;
  onSave: (data: Partial<Profile>) => Promise<void>;
}

const PERSONAL_INFO_FIELDS = [
  'first_name',
  'last_name',
  'email',
  'phone',
  'location',
  'linkedin_url',
  'github_url',
  'portfolio_url',
] as const satisfies (keyof Profile)[];

export function PersonalInfoSection({ initialData, onSave }: PersonalInfoSectionProps) {
  const [data, setData] = useState<Partial<Profile>>(initialData);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const hasUnsavedChanges = PERSONAL_INFO_FIELDS.some(
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

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
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
    if (!data.first_name?.trim()) {
      errors.first_name = 'First name is required.';
    }
    if (!data.last_name?.trim()) {
      errors.last_name = 'Last name is required.';
    }
    if (!data.email?.trim()) {
      errors.email = 'Email is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      errors.email = 'Please enter a valid email address.';
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
      console.error('Failed to save personal info:', error);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-gray-200 bg-white p-6">
      {/* Section Header */}
      <div className="flex items-center justify-between border-b pb-4">
        <h3 className="text-lg font-semibold text-gray-900">Personal Information</h3>
        {/* Status indicator in header */}
        {saveStatus === 'success' && (
          <span className="text-xs font-medium text-emerald-600">✓ Saved</span>
        )}
        {saveStatus === 'error' && (
          <span className="text-xs font-medium text-red-600">✗ Error</span>
        )}
        {hasUnsavedChanges && <span className="text-xs font-medium text-amber-600">● Unsaved</span>}
      </div>

      {/* First and Last Name */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="first_name">
            First Name <span className="text-red-500">*</span>
          </Label>
          <Input
            id="first_name"
            name="first_name"
            value={data.first_name || ''}
            onChange={handleChange}
            placeholder="Jane"
            className={fieldErrors.first_name ? 'border-red-500' : ''}
          />
          {fieldErrors.first_name && (
            <p className="text-xs text-red-600">{fieldErrors.first_name}</p>
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="last_name">
            Last Name <span className="text-red-500">*</span>
          </Label>
          <Input
            id="last_name"
            name="last_name"
            value={data.last_name || ''}
            onChange={handleChange}
            placeholder="Smith"
            className={fieldErrors.last_name ? 'border-red-500' : ''}
          />
          {fieldErrors.last_name && <p className="text-xs text-red-600">{fieldErrors.last_name}</p>}
        </div>
      </div>

      {/* Email and Phone */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">
            Email <span className="text-red-500">*</span>
          </Label>
          <Input
            id="email"
            name="email"
            type="email"
            value={data.email || ''}
            onChange={handleChange}
            placeholder="jane@example.com"
            className={fieldErrors.email ? 'border-red-500' : ''}
          />
          {fieldErrors.email && <p className="text-xs text-red-600">{fieldErrors.email}</p>}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="phone">
            Phone <span className="text-xs text-gray-400">(optional)</span>
          </Label>
          <Input
            id="phone"
            name="phone"
            type="tel"
            value={data.phone || ''}
            onChange={handleChange}
            placeholder="+1 (555) 000-0000"
          />
        </div>
      </div>

      {/* Location */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="location">
          Location <span className="text-xs text-gray-400">(optional)</span>
        </Label>
        <Input
          id="location"
          name="location"
          value={data.location || ''}
          onChange={handleChange}
          placeholder="New York, NY"
        />
      </div>

      {/* Professional Links */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="linkedin_url">
            LinkedIn <span className="text-xs text-gray-400">(optional)</span>
          </Label>
          <Input
            id="linkedin_url"
            name="linkedin_url"
            value={data.linkedin_url || ''}
            onChange={handleChange}
            placeholder="linkedin.com/in/jane"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="github_url">
            GitHub <span className="text-xs text-gray-400">(optional)</span>
          </Label>
          <Input
            id="github_url"
            name="github_url"
            value={data.github_url || ''}
            onChange={handleChange}
            placeholder="github.com/jane"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="portfolio_url">
            Portfolio <span className="text-xs text-gray-400">(optional)</span>
          </Label>
          <Input
            id="portfolio_url"
            name="portfolio_url"
            value={data.portfolio_url || ''}
            onChange={handleChange}
            placeholder="janesmith.com"
          />
        </div>
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
