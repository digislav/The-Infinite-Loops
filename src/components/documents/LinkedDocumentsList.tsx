'use client';

// LinkedDocumentsList — S3-010: Library Visibility in Job Detail Context.
// Shows documents linked to a specific job in a clean, focused view.
// Designed for use inside JobDetailPanel — not the full library page.
// Provides quick actions: inline view, export PDF, and unlink.
//
// Per S1-002 §5.7 — all empty states must have an icon and message.
// Per S1-003 — auth and ownership enforced on the backend.
//   We never send user_id from the client. All fetches go through
//   authenticated API routes.

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { FileText, FileX } from 'lucide-react';
import { formatTimestamp } from '@/lib/utils/dateFormatters';
import {
  exportDocumentPdf,
  parseDocumentContent,
  getDocumentPlainText,
} from '@/lib/utils/documentExport';

// Minimal shape of a document as returned by GET /api/documents?jobId=
interface LinkedDocument {
  id: string;
  type: 'cover_letter' | 'resume';
  name: string;
  content: string;
  status: 'draft' | 'final';
  is_archived?: boolean;
  tags: string[];
  file_path?: string | null;
  original_filename?: string | null;
  created_at: string;
}

interface LinkedDocumentsListProps {
  // The job whose linked documents are shown.
  jobId: string;
  // Incrementing this causes the list to re-fetch — used by parent when
  // a document is linked or unlinked via JobDocumentLinker.
  refreshKey: number;
  // Called when user unlinks a document so parent can refresh the linker.
  onUnlinked?: () => void;
}

export function LinkedDocumentsList({ jobId, refreshKey, onUnlinked }: LinkedDocumentsListProps) {
  const [documents, setDocuments] = useState<LinkedDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Which document is currently expanded for inline preview.
  const [expandedId, setExpandedId] = useState<string | null>(null);
  // Which document is being unlinked (shows loading state on button).
  const [unlinkingId, setUnlinkingId] = useState<string | null>(null);
  // Which document was just copied (shows "Copied!" feedback).
  const [copiedId, setCopiedId] = useState<string | null>(null);
  // Which document was just exported (shows "Exported!" feedback).
  const [exportedId, setExportedId] = useState<string | null>(null);
  // Signed download URLs for file-backed documents, keyed by document id.
  const [downloadUrls, setDownloadUrls] = useState<Record<string, string>>({});
  // Inline action error shown at top of list.
  const [actionError, setActionError] = useState<string | null>(null);

  // Fetch documents linked to this job whenever jobId or refreshKey changes.
  // Auth and ownership enforced server-side per S1-003 §5.2.
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        // jobId scopes the query to only this job's documents.
        // The backend enforces ownership — users can only see their own docs.
        const res = await fetch(`/api/documents?jobId=${encodeURIComponent(jobId)}`);

        if (!res.ok) {
          if (!cancelled) setError('Could not load linked documents.');
          return;
        }

        const json = await res.json();
        // Filter out archived docs in the job context — per S3-008, archived
        // docs are soft-deleted and should not appear in active views.
        if (!cancelled) {
          setDocuments((json.data ?? []).filter((d: LinkedDocument) => !d.is_archived));
        }
      } catch {
        if (!cancelled) setError('Could not load linked documents.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [jobId, refreshKey]);

  // Pre-fetch a signed download URL when a file-backed document is expanded.
  // Signed URLs expire so we fetch them on-demand, not upfront for all docs.
  // Per S1-003 §8 — we never expose the raw file path to the client.
  useEffect(() => {
    if (!expandedId) return;
    const doc = documents.find((d) => d.id === expandedId);
    if (!doc?.file_path || downloadUrls[expandedId]) return;

    let cancelled = false;
    fetch(`/api/documents/${expandedId}/download`)
      .then((res) => res.json())
      .then(({ url }: { url?: string }) => {
        if (url && !cancelled) {
          setDownloadUrls((prev) => ({ ...prev, [expandedId]: url }));
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [expandedId, documents, downloadUrls]);

  // Unlink a document from this job by calling PATCH /api/jobs/:jobId/documents/:docId.
  // Never sends user_id — ownership enforced server-side per S1-003 §5.4.
  async function handleUnlink(doc: LinkedDocument) {
    setUnlinkingId(doc.id);
    setActionError(null);

    try {
      const res = await fetch(`/api/jobs/${jobId}/documents/${doc.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'unlink' }),
      });

      if (!res.ok) {
        setActionError('Failed to unlink document. Please try again.');
        return;
      }

      // Remove from local state immediately so the UI updates without a refetch.
      setDocuments((prev) => prev.filter((d) => d.id !== doc.id));
      if (expandedId === doc.id) setExpandedId(null);

      // Notify parent so JobDocumentLinker can reflect the change.
      onUnlinked?.();
    } catch {
      setActionError('Failed to unlink document. Please try again.');
    } finally {
      setUnlinkingId(null);
    }
  }

  // Copy the plain-text content of a document to the clipboard.
  async function handleCopy(doc: LinkedDocument) {
    try {
      await navigator.clipboard.writeText(getDocumentPlainText(doc));
      setCopiedId(doc.id);
      window.setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // Fall back to raw content if plain-text extraction fails.
      await navigator.clipboard.writeText(doc.content);
      setCopiedId(doc.id);
      window.setTimeout(() => setCopiedId(null), 2000);
    }
  }

  // Export a document as a PDF using the shared documentExport utility.
  function handleExportPdf(doc: LinkedDocument) {
    try {
      setActionError(null);
      exportDocumentPdf(doc);
      setExportedId(doc.id);
      window.setTimeout(() => setExportedId(null), 2000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not export this document.';
      setActionError(msg);
      window.setTimeout(() => setActionError(null), 4000);
    }
  }

  // LOADING STATE — skeleton cards per S1-002 §9.2.
  if (loading) {
    return (
      <div className="flex flex-col gap-2">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  // ERROR STATE — human-friendly message per S1-001 §6.3.
  if (error) {
    return <p className="text-sm text-red-500">{error}</p>;
  }

  // EMPTY STATE — per S1-002 §5.7: icon + message + guidance.
  if (documents.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-gray-200 py-6 text-center">
        <FileX size={20} className="text-gray-300" />
        <p className="text-sm text-gray-400">No documents linked to this job yet.</p>
        <p className="text-xs text-gray-400">
          Use the Link Documents section below to attach library documents.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Document count header — gives the user a clear summary at a glance. */}
      <p className="text-xs font-semibold tracking-wider text-gray-500 uppercase">
        {documents.length} document{documents.length !== 1 ? 's' : ''} linked
      </p>

      {/* Inline action error banner — per S1-001 §6.3. */}
      {actionError && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{actionError}</p>
      )}

      {documents.map((doc) => (
        <div key={doc.id} className="flex flex-col rounded-lg border border-gray-200 bg-white">
          {/* Document card header row */}
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex min-w-0 flex-col gap-0.5">
              <div className="flex flex-wrap items-center gap-2">
                {/* Document type badge — per S1-002 §5.5 and colour tokens §4.5. */}
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                    doc.type === 'cover_letter'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-emerald-100 text-emerald-700'
                  }`}
                >
                  {doc.type === 'cover_letter' ? 'Cover Letter' : 'Resume'}
                </span>

                {/* Status badge — draft/final. Clickable to toggle. */}
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                    doc.status === 'final'
                      ? 'bg-purple-100 text-purple-700'
                      : 'bg-amber-100 text-amber-700'
                  }`}
                >
                  {doc.status === 'final' ? 'Final' : 'Draft'}
                </span>

                {/* Document name — truncated if long. */}
                <span className="truncate text-sm font-semibold text-gray-800">{doc.name}</span>
              </div>

              {/* Tags row — shown beneath name if tags exist. */}
              {doc.tags && doc.tags.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-1">
                  {doc.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-gray-200 px-2 py-0.5 text-xs text-gray-500"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              <span className="text-xs text-gray-400">Saved {formatTimestamp(doc.created_at)}</span>
            </div>

            {/* Action buttons — View, Copy, Export PDF, Unlink */}
            <div className="ml-2 flex shrink-0 items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setExpandedId(expandedId === doc.id ? null : doc.id)}
                className="h-7 px-3 text-xs text-gray-500 hover:text-gray-700"
              >
                {expandedId === doc.id ? 'Hide' : 'View'}
              </Button>

              {/* Only show Copy/Export for AI-generated docs (not uploaded files). */}
              {!doc.file_path && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => void handleCopy(doc)}
                    className="h-7 px-3 text-xs text-gray-500 hover:text-gray-700"
                  >
                    {copiedId === doc.id ? 'Copied!' : 'Copy'}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleExportPdf(doc)}
                    className="h-7 px-3 text-xs text-gray-500 hover:text-gray-700"
                  >
                    {exportedId === doc.id ? 'Exported!' : 'Export PDF'}
                  </Button>
                </>
              )}

              {/* Unlink button — removes the association between this doc and job.
                  Does NOT delete the document from the library. */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => void handleUnlink(doc)}
                disabled={unlinkingId === doc.id}
                className="h-7 px-3 text-xs text-gray-400 hover:text-red-500 disabled:opacity-50"
              >
                {unlinkingId === doc.id ? 'Unlinking...' : 'Unlink'}
              </Button>
            </div>
          </div>

          {/* Inline document preview — shown when user clicks View. */}
          {expandedId === doc.id && (
            <div className="border-t border-gray-100 px-4 py-3">
              {doc.file_path ? (
                // File-backed document — show download link using signed URL.
                // Signed URL is fetched from the backend, never exposed as raw path
                // per S1-003 §8.
                <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                  <FileText size={16} className="shrink-0 text-gray-400" />
                  <span className="text-sm text-gray-600">
                    {doc.original_filename ?? 'Uploaded file'}
                  </span>
                  {downloadUrls[doc.id] ? (
                    <a
                      href={downloadUrls[doc.id]}
                      target="_blank"
                      rel="noopener noreferrer"
                      download={doc.original_filename ?? true}
                      className="ml-auto rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
                    >
                      Open / Download
                    </a>
                  ) : (
                    <span className="ml-auto text-xs text-gray-400">Loading link…</span>
                  )}
                </div>
              ) : (
                // AI-generated document — render parsed content inline.
                <DocumentPreview doc={doc} />
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// DocumentPreview — renders the parsed JSON content of an AI-generated document.
// Kept as a sub-component to keep LinkedDocumentsList readable.
// Handles both cover_letter and resume types.
function DocumentPreview({ doc }: { doc: LinkedDocument }) {
  // Inline interfaces for the two AI document shapes.
  interface CoverLetterContent {
    name?: string;
    location?: string;
    links?: { linkedin?: string | null; github?: string | null; portfolio?: string | null };
    date?: string;
    greeting?: string;
    body?: string;
    signoff?: string;
  }

  interface ResumeContent {
    name?: string;
    headline?: string;
    location?: string;
    links?: { linkedin?: string | null; github?: string | null; portfolio?: string | null };
    summary?: string;
    experiences?: { role: string; company: string; dateRange: string; bullets: string[] }[];
    education?: { institution: string; degree: string; field: string; dateRange: string }[];
    skills?: string[];
  }

  if (doc.type === 'cover_letter') {
    const parsed = parseDocumentContent<CoverLetterContent>(doc.content);
    if (!parsed) {
      return <p className="text-sm whitespace-pre-wrap text-gray-600">{doc.content}</p>;
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

  const parsed = parseDocumentContent<ResumeContent>(doc.content);
  if (!parsed) {
    return <p className="text-sm whitespace-pre-wrap text-gray-600">{doc.content}</p>;
  }

  return (
    <div className="w-full border border-gray-200 bg-white p-8 text-sm text-gray-900">
      <div className="mx-auto flex max-w-3xl flex-col gap-6">
        <div className="border-b-2 border-gray-900 pb-4 text-center">
          <h1 className="font-serif text-2xl font-bold tracking-wide uppercase">{parsed.name}</h1>
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
            {parsed.experiences?.map((exp, i) => (
              <div key={i}>
                <div className="flex items-baseline justify-between">
                  <h3 className="text-sm font-bold">{exp.role}</h3>
                  <span className="text-xs font-semibold">{exp.dateRange}</span>
                </div>
                <div className="mb-1.5 text-sm italic">{exp.company}</div>
                <ul className="flex list-disc flex-col gap-1 pl-5 text-sm">
                  {exp.bullets?.map((bullet, bi) => (
                    <li key={bi}>{bullet}</li>
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
            {parsed.education?.map((edu, i) => (
              <div key={i} className="flex items-baseline justify-between">
                <div>
                  <div className="text-sm font-bold">{edu.institution}</div>
                  <div className="text-sm italic">
                    {edu.degree} in {edu.field}
                  </div>
                </div>
                <div className="text-xs font-semibold">{edu.dateRange}</div>
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
}
