'use client';

// SavedDocuments - S2-024 + S3-005.
// Displays all saved document drafts for the authenticated user.
// Shows cover letters and resumes with their linked job context.
// Users can view, copy, download, or delete saved documents.
//
// Per S1-002 section 11.1 - each section manages its own data independently.
// Per S1-003 - auth and ownership enforced on the backend.

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, X } from 'lucide-react';
import { formatTimestamp } from '@/lib/utils/dateFormatters';
import {
  exportDocumentPdf,
  parseDocumentContent,
  getDocumentPlainText,
} from '@/lib/utils/documentExport';

interface SavedDocument {
  id: string;
  job_id: string;
  type: 'cover_letter' | 'resume';
  name: string;
  content: string;
  status: 'draft' | 'final' | 'archived';
  tags: string[];
  created_at: string;
}

interface CoverLetterDocument {
  name?: string;
  location?: string;
  links?: {
    linkedin?: string | null;
    github?: string | null;
    portfolio?: string | null;
  };
  date?: string;
  greeting?: string;
  body?: string;
  signoff?: string;
}

interface ResumeDocument {
  name?: string;
  headline?: string;
  location?: string;
  links?: {
    linkedin?: string | null;
    github?: string | null;
    portfolio?: string | null;
  };
  summary?: string;
  experiences?: {
    role: string;
    company: string;
    dateRange: string;
    bullets: string[];
  }[];
  education?: {
    institution: string;
    degree: string;
    field: string;
    dateRange: string;
  }[];
  skills?: string[];
}

interface SavedDocumentsProps {
  refreshKey: number;
  jobId?: string;
  emptyMessage?: string;
}

export function SavedDocuments({
  refreshKey,
  jobId,
  emptyMessage = 'No saved documents yet. Generate a cover letter or resume and save it.',
}: SavedDocumentsProps) {
  const [documents, setDocuments] = useState<SavedDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [exportedId, setExportedId] = useState<string | null>(null);
  const [addingTagId, setAddingTagId] = useState<string | null>(null);
  const [newTagText, setNewTagText] = useState<string>('');

  const allUniqueTags = Array.from(new Set(documents.flatMap((d) => d.tags || [])));

  useEffect(() => {
    let cancelled = false;

    const loadDocuments = async () => {
      setLoading(true);
      setError(null);

      try {
        const url = jobId ? `/api/documents?jobId=${encodeURIComponent(jobId)}` : '/api/documents';
        const res = await fetch(url);
        if (!res.ok) {
          if (!cancelled) setError('Could not load saved documents.');
          return;
        }

        const json = await res.json();
        if (!cancelled) setDocuments(json.data ?? []);
      } catch {
        if (!cancelled) setError('Could not load saved documents.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadDocuments();
    return () => {
      cancelled = true;
    };
  }, [jobId, refreshKey]);

  async function handleCopy(doc: SavedDocument) {
    try {
      await navigator.clipboard.writeText(getDocumentPlainText(doc));
      setCopiedId(doc.id);
      window.setTimeout(() => setCopiedId(null), 2000);
    } catch {
      await navigator.clipboard.writeText(doc.content);
      setCopiedId(doc.id);
      window.setTimeout(() => setCopiedId(null), 2000);
    }
  }

  async function handleExportPdf(doc: SavedDocument) {
    try {
      setError(null);
      await exportDocumentPdf(doc);
      setExportedId(doc.id);
      window.setTimeout(() => setExportedId(null), 2000);
    } catch {
      setError('Could not export this document as PDF.');
    }
  }

  async function handleDelete(doc: SavedDocument) {
    const confirmed = window.confirm(`Delete "${doc.name}"?`);
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/documents/${doc.id}`, { method: 'DELETE' });
      if (!res.ok) return;
      setDocuments((prev) => prev.filter((item) => item.id !== doc.id));
      if (expandedId === doc.id) setExpandedId(null);
    } catch {
      // Silently fail.
    }
  }

  async function handleStatusChange(doc: SavedDocument, newStatus: 'draft' | 'final' | 'archived') {
    try {
      const res = await fetch(`/api/documents/${doc.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) return;
      setDocuments((prev) =>
        prev.map((item) => (item.id === doc.id ? { ...item, status: newStatus } : item)),
      );
    } catch {
      // Silently fail.
    }
  }

  async function handleAddTag(doc: SavedDocument, explicitTag?: string) {
    const tagToSave = explicitTag || newTagText.trim();
    if (!tagToSave) {
      setAddingTagId(null);
      return;
    }
    const currentTags = doc.tags || [];
    if (currentTags.includes(tagToSave)) {
      setAddingTagId(null);
      setNewTagText('');
      return;
    }

    const updatedTags = [...currentTags, tagToSave];
    try {
      const res = await fetch(`/api/documents/${doc.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tags: updatedTags }),
      });
      if (!res.ok) return;
      setDocuments((prev) =>
        prev.map((item) => (item.id === doc.id ? { ...item, tags: updatedTags } : item)),
      );
    } catch {
      // Silently fail.
    } finally {
      setAddingTagId(null);
      setNewTagText('');
    }
  }

  async function handleRemoveTag(doc: SavedDocument, tagToRemove: string) {
    const currentTags = doc.tags || [];
    const updatedTags = currentTags.filter((t) => t !== tagToRemove);
    try {
      const res = await fetch(`/api/documents/${doc.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tags: updatedTags }),
      });
      if (!res.ok) return;
      setDocuments((prev) =>
        prev.map((item) => (item.id === doc.id ? { ...item, tags: updatedTags } : item)),
      );
    } catch {
      // Silently fail.
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  if (error) {
    return <p className="text-sm text-red-500">{error}</p>;
  }

  if (documents.length === 0) {
    return <p className="text-sm text-gray-400">{emptyMessage}</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {documents.map((doc) => (
        <div key={doc.id} className="flex flex-col rounded-lg border border-gray-200 bg-white">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2">
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    doc.type === 'cover_letter'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-emerald-100 text-emerald-700'
                  }`}
                >
                  {doc.type === 'cover_letter' ? 'Cover Letter' : 'Resume'}
                </span>
                <button
                  onClick={() =>
                    handleStatusChange(
                      doc,
                      doc.status === 'draft'
                        ? 'final'
                        : doc.status === 'final'
                          ? 'archived'
                          : 'draft',
                    )
                  }
                  className={`cursor-pointer rounded-full px-2 py-0.5 text-xs font-medium transition-colors hover:opacity-80 ${
                    doc.status === 'final'
                      ? 'bg-purple-100 text-purple-700'
                      : doc.status === 'archived'
                        ? 'bg-gray-100 text-gray-700'
                        : 'bg-amber-100 text-amber-700'
                  }`}
                  title="Click to cycle status"
                >
                  {doc.status ? doc.status.charAt(0).toUpperCase() + doc.status.slice(1) : 'Draft'}
                </button>
                <span className="text-sm font-semibold text-gray-800">{doc.name}</span>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <span className="mr-1 text-xs text-gray-400">
                  Saved {formatTimestamp(doc.created_at)}
                </span>
                {doc.tags?.map((tag) => (
                  <Badge
                    key={tag}
                    variant="secondary"
                    className="h-5 bg-gray-100 px-1.5 text-[10px] text-gray-600 hover:bg-gray-200"
                  >
                    {tag}
                    <button
                      onClick={() => handleRemoveTag(doc, tag)}
                      className="ml-1 rounded-full p-0.5 hover:bg-gray-300"
                    >
                      <X className="h-2 w-2" />
                    </button>
                  </Badge>
                ))}
                {addingTagId === doc.id ? (
                  <div className="relative">
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleAddTag(doc);
                      }}
                      className="flex items-center"
                    >
                      <Input
                        ref={(el) => {
                          if (el && addingTagId === doc.id && document.activeElement !== el) {
                            setTimeout(() => el.focus(), 50);
                          }
                        }}
                        size={1}
                        value={newTagText}
                        onChange={(e) => setNewTagText(e.target.value)}
                        onBlur={() => {
                          // Allow click events on dropdown to fire before closing
                          setTimeout(() => {
                            setAddingTagId((prev) => (prev === doc.id ? null : prev));
                            setNewTagText('');
                          }, 150);
                        }}
                        placeholder="Tag..."
                        className="h-5 w-24 px-1.5 py-0 text-[10px]"
                      />
                    </form>
                    {allUniqueTags.filter(
                      (t) =>
                        t.toLowerCase().includes(newTagText.toLowerCase()) &&
                        !(doc.tags || []).includes(t),
                    ).length > 0 && (
                      <div className="absolute top-full left-0 z-50 mt-1 w-32 overflow-hidden rounded-md border border-gray-200 bg-white py-1 shadow-lg">
                        {allUniqueTags
                          .filter(
                            (t) =>
                              t.toLowerCase().includes(newTagText.toLowerCase()) &&
                              !(doc.tags || []).includes(t),
                          )
                          .map((tag) => (
                            <button
                              key={tag}
                              type="button"
                              className="w-full cursor-pointer px-2 py-1 text-left text-[10px] text-gray-700 hover:bg-gray-100"
                              onMouseDown={(e) => {
                                e.preventDefault(); // Prevents input blur
                                handleAddTag(doc, tag);
                              }}
                            >
                              {tag}
                            </button>
                          ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <button
                    onClick={() => setAddingTagId(doc.id)}
                    className="flex h-5 items-center gap-0.5 rounded-full border border-dashed border-gray-300 bg-gray-50 px-1.5 text-[10px] font-medium text-gray-500 hover:bg-gray-100"
                  >
                    <Plus className="h-2.5 w-2.5" /> Tag
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setExpandedId(expandedId === doc.id ? null : doc.id)}
                className="h-7 px-3 text-xs text-gray-500 hover:text-gray-700"
              >
                {expandedId === doc.id ? 'Hide' : 'View'}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleCopy(doc)}
                className="h-7 px-3 text-xs text-gray-500 hover:text-gray-700"
              >
                {copiedId === doc.id ? 'Copied!' : 'Copy'}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => void handleExportPdf(doc)}
                className="h-7 px-3 text-xs text-gray-500 hover:text-gray-700"
              >
                {exportedId === doc.id ? 'Exported!' : 'Export PDF'}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDelete(doc)}
                className="h-7 px-3 text-xs text-gray-400 hover:text-red-500"
              >
                Delete
              </Button>
            </div>
          </div>

          {expandedId === doc.id && (
            <div className="border-t border-gray-100 px-4 py-3">
              {(() => {
                if (doc.type === 'cover_letter') {
                  const parsed = parseDocumentContent<CoverLetterDocument>(doc.content);
                  if (!parsed) {
                    return (
                      <p className="text-sm whitespace-pre-wrap text-gray-600">{doc.content}</p>
                    );
                  }

                  return (
                    <div className="flex flex-col gap-4 p-4 font-serif text-gray-900">
                      <div>
                        <h2 className="text-xl font-bold uppercase">{parsed.name}</h2>
                        <p className="text-sm">{parsed.location}</p>
                        {parsed.links && (
                          <div className="mt-1 flex gap-4 text-xs text-[#2E75B6]">
                            {parsed.links.linkedin && parsed.links.linkedin !== 'None' && (
                              <span>{parsed.links.linkedin}</span>
                            )}
                            {parsed.links.github && parsed.links.github !== 'None' && (
                              <span>{parsed.links.github}</span>
                            )}
                            {parsed.links.portfolio && parsed.links.portfolio !== 'None' && (
                              <span>{parsed.links.portfolio}</span>
                            )}
                          </div>
                        )}
                      </div>
                      <p className="text-sm">{parsed.date}</p>
                      <p className="text-sm">{parsed.greeting}</p>
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{parsed.body}</p>
                      <p className="text-sm whitespace-pre-wrap">{parsed.signoff}</p>
                    </div>
                  );
                }

                const parsed = parseDocumentContent<ResumeDocument>(doc.content);
                if (!parsed) {
                  return <p className="text-sm whitespace-pre-wrap text-gray-600">{doc.content}</p>;
                }

                return (
                  <div className="w-full border border-gray-200 bg-white p-8 text-sm text-gray-900">
                    <div className="mx-auto flex max-w-3xl flex-col gap-6">
                      <div className="border-b-2 border-gray-900 pb-4 text-center">
                        <h1 className="font-serif text-2xl font-bold tracking-wide uppercase">
                          {parsed.name}
                        </h1>
                        <p className="mt-1 text-sm font-medium">{parsed.headline}</p>
                        <p className="mt-0.5 text-xs text-gray-600">{parsed.location}</p>
                        {parsed.links && (
                          <div className="mt-2 flex flex-wrap justify-center gap-4 text-xs font-semibold text-[#2E75B6]">
                            {parsed.links.linkedin && parsed.links.linkedin !== 'None' && (
                              <span>{parsed.links.linkedin}</span>
                            )}
                            {parsed.links.github && parsed.links.github !== 'None' && (
                              <span>{parsed.links.github}</span>
                            )}
                            {parsed.links.portfolio && parsed.links.portfolio !== 'None' && (
                              <span>{parsed.links.portfolio}</span>
                            )}
                          </div>
                        )}
                      </div>
                      <div>
                        <h2 className="mb-2 border-b border-gray-300 pb-1 text-sm font-bold tracking-wider uppercase">
                          Professional Summary
                        </h2>
                        <p className="text-sm leading-relaxed">{parsed.summary}</p>
                      </div>
                      <div>
                        <h2 className="mb-2 border-b border-gray-300 pb-1 text-sm font-bold tracking-wider uppercase">
                          Experience
                        </h2>
                        <div className="flex flex-col gap-4">
                          {parsed.experiences?.map((experience, index) => (
                            <div key={index}>
                              <div className="flex items-baseline justify-between">
                                <h3 className="text-sm font-bold">{experience.role}</h3>
                                <span className="text-xs font-semibold">
                                  {experience.dateRange}
                                </span>
                              </div>
                              <div className="mb-1.5 text-sm italic">{experience.company}</div>
                              <ul className="flex list-disc flex-col gap-1 pl-5 text-sm">
                                {experience.bullets?.map((bullet, bulletIndex) => (
                                  <li key={bulletIndex}>{bullet}</li>
                                ))}
                              </ul>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div>
                        <h2 className="mb-2 border-b border-gray-300 pb-1 text-sm font-bold tracking-wider uppercase">
                          Education
                        </h2>
                        <div className="flex flex-col gap-3">
                          {parsed.education?.map((education, index) => (
                            <div key={index} className="flex items-baseline justify-between">
                              <div>
                                <div className="text-sm font-bold">{education.institution}</div>
                                <div className="text-sm italic">
                                  {education.degree} in {education.field}
                                </div>
                              </div>
                              <div className="text-xs font-semibold">{education.dateRange}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div>
                        <h2 className="mb-2 border-b border-gray-300 pb-1 text-sm font-bold tracking-wider uppercase">
                          Skills
                        </h2>
                        <p className="text-sm leading-relaxed">{parsed.skills?.join(', ')}</p>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
