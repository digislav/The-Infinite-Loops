'use client';

// SkillsSection — S2-018: Implement Skills Section CRUD.
// Displays all skill records and allows the user to add, edit, and delete entries.
// Follows the same pattern as ExperienceSection per S1-002 §12.1.
// Per S1-002 §11.1 — each profile section saves independently.
// Per S1-002 §5.3 — uses controlled inputs throughout.
// Per S1-003 — auth and ownership enforced on the backend.

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import type { Skill, Proficiency } from '@/types/skill.types';

const PROFICIENCY_LEVELS: Proficiency[] = ['Beginner', 'Intermediate', 'Advanced', 'Expert'];

export function SkillsSection() {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [skillName, setSkillName] = useState('');
  const [category, setCategory] = useState('');
  const [proficiency, setProficiency] = useState<Proficiency | ''>('');
  const [formError, setFormError] = useState<string | null>(null);

  // Fetch existing skills on mount.
  // Auth and ownership enforced server-side per S1-003 §5.4.
  useEffect(() => {
    let cancelled = false;

    const loadSkills = async () => {
      try {
        const res = await fetch('/api/skills');
        if (!res.ok) {
          if (!cancelled) setError('Could not load skills.');
          return;
        }
        const data = await res.json();
        if (!cancelled) setSkills(data ?? []);
      } catch {
        if (!cancelled) setError('Could not load skills.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadSkills();
    return () => {
      cancelled = true;
    };
  }, []);

  function resetForm() {
    setSkillName('');
    setCategory('');
    setProficiency('');
    setFormError(null);
  }

  function populateForm(record: Skill) {
    setSkillName(record.skill_name);
    setCategory(record.category ?? '');
    setProficiency(record.proficiency ?? '');
    setFormError(null);
  }

  function handleStartAdd() {
    resetForm();
    setEditingId(null);
    setIsAdding(true);
  }

  function handleStartEdit(record: Skill) {
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
    if (!skillName.trim()) {
      setFormError('Skill name is required.');
      return false;
    }
    return true;
  }

  async function handleSave() {
    if (!validateForm()) return;
    setIsSaving(true);
    setFormError(null);

    const payload: Skill = {
      skill_name: skillName.trim(),
      category: category.trim() || undefined,
      proficiency: proficiency || undefined,
      order_index: editingId
        ? (skills.find((s) => s.id === editingId)?.order_index ?? 0)
        : skills.length,
    };

    try {
      const url = editingId ? `/api/skills/${editingId}` : '/api/skills';
      const method = editingId ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        setFormError('Failed to save skill. Please try again.');
        return;
      }

      const json = await res.json();
      const savedData: Skill = json.data ?? json;

      if (editingId) {
        setSkills((prev) => prev.map((s) => (s.id === editingId ? savedData : s)));
        setEditingId(null);
      } else {
        setSkills((prev) => [...prev, savedData]);
        setIsAdding(false);
      }
      resetForm();
    } catch {
      setFormError('Failed to save skill. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(record: Skill) {
    const confirmed = window.confirm(`Delete "${record.skill_name}"?`);
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/skills/${record.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      setSkills((prev) => prev.filter((s) => s.id !== record.id));
    } catch {
      alert('Failed to delete skill.');
    }
  }

  // LOADING STATE — skeletons per S1-002 §9.2.
  if (loading) {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-5 w-1/4" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  // ERROR STATE — human-friendly message per S1-001 §6.3.
  if (error) {
    return <p className="text-sm text-red-500">{error}</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between border-b pb-2">
        <h2 className="text-xl font-semibold text-gray-900">Skills</h2>
        {!isAdding && !editingId && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleStartAdd}
            className="h-8 rounded-full bg-blue-50 px-4 text-xs font-semibold text-blue-600"
          >
            + Add Skill
          </Button>
        )}
      </div>

      {(isAdding || editingId) && (
        <div className="flex flex-col gap-4 rounded-lg border border-blue-100 bg-blue-50/50 p-4">
          <h3 className="text-sm font-semibold text-gray-700">
            {editingId ? 'Edit Skill' : 'New Skill'}
          </h3>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="skill-name">
              Skill Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="skill-name"
              value={skillName}
              onChange={(e) => setSkillName(e.target.value)}
              placeholder="e.g. React, Python, Figma"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="skill-category">
                Category <span className="text-xs text-gray-400">(optional)</span>
              </Label>
              <Input
                id="skill-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="e.g. Frontend, Design, DevOps"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="skill-proficiency">
                Proficiency <span className="text-xs text-gray-400">(optional)</span>
              </Label>
              <Select
                value={proficiency}
                onValueChange={(val) => setProficiency(val as Proficiency)}
              >
                <SelectTrigger id="skill-proficiency">
                  <SelectValue placeholder="Select level" />
                </SelectTrigger>
                <SelectContent>
                  {PROFICIENCY_LEVELS.map((level) => (
                    <SelectItem key={level} value={level}>
                      {level}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
              {isSaving ? 'Saving...' : 'Save Skill'}
            </Button>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {skills.length === 0 && !isAdding && (
          <p className="text-sm text-gray-400">No skills added yet.</p>
        )}
        {skills.map((record) => (
          <div
            key={record.id}
            className="flex items-center justify-between rounded-lg border border-gray-100 bg-white p-4"
          >
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-semibold text-gray-900">{record.skill_name}</span>
              <div className="flex gap-2 text-xs text-gray-400">
                {record.category && <span>{record.category}</span>}
                {record.category && record.proficiency && <span>·</span>}
                {record.proficiency && <span>{record.proficiency}</span>}
              </div>
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
        ))}
      </div>
    </div>
  );
}
