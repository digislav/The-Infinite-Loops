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
import { buildDuplicateDocumentName } from '@/lib/utils/documentNames';
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
  const [renamedId, setRenamedId] = useState<string | null>(null);
  const [duplicatedId, setDuplicatedId] = useState<string | null>(null);

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

  async function handleRename(doc: SavedDocument) {
    const nextName = window.prompt('Rename this document:', doc.name)?.trim();

    if (!nextName || nextName === doc.name) return;

    try {
      setError(null);
      const res = await fetch(`/api/documents/${doc.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: nextName }),
      });

      if (!res.ok) {
        setError('Could not rename this document.');
        return;
      }

      const updatedDoc = await res.json();
      setDocuments((prev) =>
        prev.map((item) => (item.id === doc.id ? { ...item, ...updatedDoc } : item)),
      );
      setRenamedId(doc.id);
      window.setTimeout(() => setRenamedId(null), 2000);
    } catch {
      setError('Could not rename this document.');
    }
  }

  async function handleDuplicate(doc: SavedDocument) {
    try {
      setError(null);
      const res = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          job_id: doc.job_id,
          type: doc.type,
          name: buildDuplicateDocumentName(doc.name),
          content: doc.content,
        }),
      });

      if (!res.ok) {
        setError('Could not duplicate this document.');
        return;
      }

      const json = await res.json();
      if (json.data) {
        setDocuments((prev) => [json.data, ...prev]);
      }
      setDuplicatedId(doc.id);
      window.setTimeout(() => setDuplicatedId(null), 2000);
    } catch {
      setError('Could not duplicate this document.');
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
                {copiedId === doc.id ? 'Copied!' : 'Copy'}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => void handleDuplicate(doc)}
                className="h-7 px-3 text-xs text-gray-500 hover:text-gray-700"
              >
                {duplicatedId === doc.id ? 'Duplicated!' : 'Duplicate'}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => void handleRename(doc)}
                className="h-7 px-3 text-xs text-gray-500 hover:text-gray-700"
              >
                {renamedId === doc.id ? 'Renamed!' : 'Rename'}
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
