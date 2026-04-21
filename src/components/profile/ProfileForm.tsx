'use client';

import { ExperienceSection } from './ExperienceSection';
import { CareerPreferencesSection } from './CareerPreferencesSection';
import { EducationSection } from './EducationSection';
import { SkillsSection } from './SkillsSection';
import { useState } from 'react';
import type { Profile } from '@/types/profile.types';
import { calculateCompletion } from '@/types/profile.types';
import { CompletionIndicator } from './CompletionIndicator';
import { PersonalInfoSection } from './PersonalInfoSection';
import { ProfessionalSummarySection } from './ProfessionalSummarySection';

interface ProfileFormProps {
  initialProfile: Profile;
}

export function ProfileForm({ initialProfile }: ProfileFormProps) {
  const [profile, setProfile] = useState<Profile>(initialProfile);
  const [globalError, setGlobalError] = useState<string | null>(null);

  const completion = calculateCompletion(profile);

  async function handleSectionSave(sectionData: Partial<Profile>) {
    setGlobalError(null);
    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sectionData),
      });

      if (!res.ok) {
        const error = await res.text();
        throw new Error(error || 'Failed to save');
      }

      const updatedProfile = await res.json();
      setProfile(updatedProfile);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An error occurred';
      setGlobalError(message);
      throw error;
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <CompletionIndicator percentage={completion} />

      {globalError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-medium text-red-800">{globalError}</p>
        </div>
      )}

      <PersonalInfoSection initialData={profile} onSave={handleSectionSave} />
      <ProfessionalSummarySection initialData={profile} onSave={handleSectionSave} />
      <ExperienceSection />
      <EducationSection />
      <SkillsSection />
      <CareerPreferencesSection />
    </div>
  );
}
