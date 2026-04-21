'use client';

// SavedDocuments — S2-024: Implement Document Save from Job Context.
// Displays all saved document drafts for the authenticated user.
// Shows cover letters and resumes with their linked job context.
// Users can view, copy, or delete saved documents.
//
// Per S1-002 §11.1 — each section manages its own data independently.
// Per S1-003 — auth and ownership enforced on the backend.

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { formatTimestamp } from '@/lib/utils/dateFormatters';

interface SavedDocument {
  id: string;
  job_id: string;
  type: 'cover_letter' | 'resume';
  name: string;
  content: string;
  created_at: string;
}

interface SavedDocumentsProps {
  // refreshKey increments when a new document is saved so the list re-fetches.
  refreshKey: number;
}

export function SavedDocuments({ refreshKey }: SavedDocumentsProps) {
  const [documents, setDocuments] = useState<SavedDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Fetch all saved documents on mount and when refreshKey changes.
  // Auth and ownership enforced server-side per S1-003 §5.4.
  useEffect(() => {
    let cancelled = false;

    const loadDocuments = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/documents');
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
  }, [refreshKey]);

  // handleCopy — copies the document content to clipboard.
  async function handleCopy(doc: SavedDocument) {
    try {
      const parsed = JSON.parse(doc.content);
      const text =
        doc.type === 'cover_letter'
          ? `${parsed.name}\n${parsed.location}\n\n${parsed.date}\n\n${parsed.greeting}\n\n${parsed.body}\n\n${parsed.signoff}`
          : JSON.stringify(parsed, null, 2);
      await navigator.clipboard.writeText(text);
      setCopiedId(doc.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      await navigator.clipboard.writeText(doc.content);
      setCopiedId(doc.id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  }

  // handleDelete — deletes a saved document after confirmation.
  async function handleDelete(doc: SavedDocument) {
    const confirmed = window.confirm(`Delete "${doc.name}"?`);
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/documents/${doc.id}`, { method: 'DELETE' });
      if (!res.ok) return;
      setDocuments((prev) => prev.filter((d) => d.id !== doc.id));
      if (expandedId === doc.id) setExpandedId(null);
    } catch {
      // Silently fail.
    }
  }

  // LOADING STATE — skeletons per S1-002 §9.2.
  if (loading) {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  // ERROR STATE — human-friendly per S1-001 §6.3.
  if (error) {
    return <p className="text-sm text-red-500">{error}</p>;
  }

  // EMPTY STATE — per S1-002 §5.7.
  if (documents.length === 0) {
    return (
      <p className="text-sm text-gray-400">
        No saved documents yet. Generate a cover letter or resume and save it.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {documents.map((doc) => (
        <div key={doc.id} className="flex flex-col rounded-lg border border-gray-200 bg-white">
          {/* Document header row */}
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex flex-col gap-0.5">
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
                <span className="text-sm font-semibold text-gray-800">{doc.name}</span>
              </div>
              <span className="text-xs text-gray-400">Saved {formatTimestamp(doc.created_at)}</span>
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
                {copiedId === doc.id ? '✓ Copied!' : 'Copy'}
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

          {/* Expanded content view */}
          {expandedId === doc.id && (
            <div className="border-t border-gray-100 px-4 py-3">
              {(() => {
                try {
                  const parsed = JSON.parse(doc.content);

                  if (doc.type === 'cover_letter') {
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

                  // Resume — render full Classic template canvas
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
                            {parsed.experiences?.map(
                              (
                                exp: {
                                  role: string;
                                  company: string;
                                  dateRange: string;
                                  bullets: string[];
                                },
                                i: number,
                              ) => (
                                <div key={i}>
                                  <div className="flex items-baseline justify-between">
                                    <h3 className="text-sm font-bold">{exp.role}</h3>
                                    <span className="text-xs font-semibold">{exp.dateRange}</span>
                                  </div>
                                  <div className="mb-1.5 text-sm italic">{exp.company}</div>
                                  <ul className="flex list-disc flex-col gap-1 pl-5 text-sm">
                                    {exp.bullets?.map((bull: string, j: number) => (
                                      <li key={j}>{bull}</li>
                                    ))}
                                  </ul>
                                </div>
                              ),
                            )}
                          </div>
                        </div>

                        <div>
                          <h2 className="mb-2 border-b border-gray-300 pb-1 text-sm font-bold tracking-wider uppercase">
                            Education
                          </h2>
                          <div className="flex flex-col gap-3">
                            {parsed.education?.map(
                              (
                                edu: {
                                  institution: string;
                                  degree: string;
                                  field: string;
                                  dateRange: string;
                                },
                                i: number,
                              ) => (
                                <div key={i} className="flex items-baseline justify-between">
                                  <div>
                                    <div className="text-sm font-bold">{edu.institution}</div>
                                    <div className="text-sm italic">
                                      {edu.degree} in {edu.field}
                                    </div>
                                  </div>
                                  <div className="text-xs font-semibold">{edu.dateRange}</div>
                                </div>
                              ),
                            )}
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
                } catch {
                  return <p className="text-sm whitespace-pre-wrap text-gray-600">{doc.content}</p>;
                }
              })()}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
