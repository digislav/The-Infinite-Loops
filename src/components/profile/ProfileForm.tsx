'use client';

import { ExperienceSection } from './ExperienceSection';
import { CareerPreferencesSection } from './CareerPreferencesSection';
import { EducationSection } from './EducationSection';
import { SkillsSection } from './SkillsSection';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Profile } from '@/types/profile.types';
import { calculateCompletion } from '@/types/profile.types';
import { CompletionIndicator } from './CompletionIndicator';

interface ProfileFormProps {
  initialProfile: Profile;
}

export function ProfileForm({ initialProfile }: ProfileFormProps) {
  const [profile, setProfile] = useState<Profile>(initialProfile);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const completion = calculateCompletion(profile);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setProfile((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setHasUnsavedChanges(true);
    setSaveStatus('idle');
  }

  async function handleSave() {
    setIsSaving(true);
    setSaveStatus('idle');
    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      });
      if (!res.ok) throw new Error('Failed to save');
      setSaveStatus('success');
      setHasUnsavedChanges(false);
    } catch {
      setSaveStatus('error');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Completion Indicator */}
      <CompletionIndicator percentage={completion} />
      {hasUnsavedChanges && <p className="-mt-4 text-xs text-amber-600">* Unsaved changes</p>}

      {/* Identity and Contact Section */}
      <div className="flex flex-col gap-4">
        <h2 className="border-b pb-2 text-xl font-semibold text-gray-900">Personal Information</h2>

        {/* First and Last Name */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="first_name">
              First Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="first_name"
              name="first_name"
              value={profile.first_name}
              onChange={handleChange}
              placeholder="Jane"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="last_name">
              Last Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="last_name"
              name="last_name"
              value={profile.last_name}
              onChange={handleChange}
              placeholder="Smith"
            />
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
              value={profile.email}
              onChange={handleChange}
              placeholder="jane@example.com"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="phone">
              Phone <span className="text-xs text-gray-400">(optional)</span>
            </Label>
            <Input
              id="phone"
              name="phone"
              type="tel"
              value={profile.phone}
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
            value={profile.location}
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
              value={profile.linkedin_url}
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
              value={profile.github_url}
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
              value={profile.portfolio_url}
              onChange={handleChange}
              placeholder="janesmith.com"
            />
          </div>
        </div>
      </div>

      {/* Professional Summary Section */}
      <div className="flex flex-col gap-4">
        <h2 className="border-b pb-2 text-xl font-semibold text-gray-900">Professional Summary</h2>

        {/* Headline */}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="headline">
            Headline <span className="text-red-500">*</span>
          </Label>
          <Input
            id="headline"
            name="headline"
            value={profile.headline}
            onChange={handleChange}
            placeholder="Full Stack Engineer | React | Node.js"
          />
        </div>

        {/* Summary */}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="summary">
            Summary <span className="text-red-500">*</span>
          </Label>
          <textarea
            id="summary"
            name="summary"
            value={profile.summary}
            onChange={handleChange}
            rows={5}
            placeholder="Write a short professional summary..."
            className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring w-full resize-none rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
          />
        </div>
      </div>

      {/* Experience Section — S2-016 */}
      <ExperienceSection />

      {/* Education Section — S2-017 */}
      <EducationSection />

      {/* Skills Section — S2-018 */}
      <SkillsSection />

      {/* Career Preferences Section — S2-019 */}
      <CareerPreferencesSection />

      {/* Save Button */}
      <div className="flex items-center justify-end gap-4">
        {saveStatus === 'success' && (
          <p className="text-sm font-medium text-emerald-600">✓ Profile saved successfully</p>
        )}
        {saveStatus === 'error' && (
          <p className="text-sm font-medium text-red-600">Failed to save. Please try again.</p>
        )}
        <Button
          onClick={handleSave}
          disabled={Boolean(isSaving || !hasUnsavedChanges)}
          className="bg-[#2E75B6] text-white hover:bg-[#1F4E79] disabled:opacity-50"
        >
          {isSaving ? 'Saving...' : 'Save Profile'}
        </Button>
      </div>
    </div>
  );
}
