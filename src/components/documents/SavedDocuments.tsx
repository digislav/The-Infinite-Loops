'use client';

// SavedDocuments - S2-024 + S3-003 + S3-005 + S3-006 + S3-007 + S3-019.
// Displays all saved document drafts for the authenticated user.
// S3-003: version history panel per document with restore capability.
//         "Rewrite as New Version" embeds generator with existingDocId.
// S3-006: filter by type and sort by date/name via LibraryControls.
// S3-007: duplicate and rename actions for saved documents.
// S3-019: aria-live announcer region for screen reader support.
//
// Per S1-002 section 11.1 - each section manages its own data independently.
// Per S1-003 - auth and ownership enforced on the backend.

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, X, History } from 'lucide-react';
import { buildDuplicateDocumentName } from '@/lib/utils/documentNames';
import { formatTimestamp } from '@/lib/utils/dateFormatters';
import {
  exportDocumentPdf,
  parseDocumentContent,
  getDocumentPlainText,
} from '@/lib/utils/documentExport';
import { LibraryControls, DocumentTypeFilter, DocumentSortOrder } from './LibraryControls';
import { DocumentVersionHistory } from './DocumentVersionHistory';
import { CoverLetterGenerator } from './CoverLetterGenerator';
import { ResumeGenerator } from './ResumeGenerator';

interface SavedDocument {
  id: string;
  job_id: string;
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
  const [showArchived, setShowArchived] = useState(false);
  const [typeFilter, setTypeFilter] = useState<DocumentTypeFilter>('all');
  const [sortOrder, setSortOrder] = useState<DocumentSortOrder>('newest');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [exportedId, setExportedId] = useState<string | null>(null);
  const [renamedId, setRenamedId] = useState<string | null>(null);
  const [duplicatedId, setDuplicatedId] = useState<string | null>(null);
  const [addingTagId, setAddingTagId] = useState<string | null>(null);
  const [newTagText, setNewTagText] = useState<string>('');
  const [downloadUrls, setDownloadUrls] = useState<Record<string, string>>({});
  // S3-019: aria-live announcement for screen reader support.
  const [announcement, setAnnouncement] = useState<string>('');
  // S3-003: tracks which document has its version history panel open.
  const [versionHistoryId, setVersionHistoryId] = useState<string | null>(null);
  // S3-003: tracks which document has its rewrite-as-new-version panel open.
  const [rewriteVersionId, setRewriteVersionId] = useState<string | null>(null);

  const allUniqueTags = Array.from(new Set(documents.flatMap((d) => d.tags || [])));

  const filteredAndSorted = useMemo(() => {
    let result = [...documents];

    if (typeFilter !== 'all') {
      result = result.filter((doc) => doc.type === typeFilter);
    }

    result.sort((a, b) => {
      if (sortOrder === 'newest') {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      if (sortOrder === 'oldest') {
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      }
      return a.name.localeCompare(b.name);
    });

    return result;
  }, [documents, typeFilter, sortOrder]);

  // fetchDocuments extracted so version restore and rewrite callbacks
  // can trigger a refresh per S3-003.
  async function fetchDocuments() {
    setLoading(true);
    setError(null);
    try {
      const base = jobId ? `/api/documents?jobId=${encodeURIComponent(jobId)}` : '/api/documents';
      const url = showArchived ? `${base}${jobId ? '&' : '?'}showArchived=true` : base;
      const res = await fetch(url);
      if (!res.ok) {
        setError('Could not load saved documents.');
        return;
      }
      const json = await res.json();
      setDocuments(json.data ?? []);
    } catch {
      setError('Could not load saved documents.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;

    const loadDocuments = async () => {
      setLoading(true);
      setError(null);

      try {
        const base = jobId ? `/api/documents?jobId=${encodeURIComponent(jobId)}` : '/api/documents';
        const url = showArchived ? `${base}${jobId ? '&' : '?'}showArchived=true` : base;
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
  }, [jobId, refreshKey, showArchived]);

  useEffect(() => {
    if (!expandedId) return;
    const doc = documents.find((d) => d.id === expandedId);
    if (!doc?.file_path || downloadUrls[expandedId]) return;

    let cancelled = false;
    fetch(`/api/documents/${expandedId}/download`)
      .then((res) => res.json())
      .then(({ url }: { url?: string }) => {
        if (url && !cancelled) setDownloadUrls((prev) => ({ ...prev, [expandedId]: url }));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [expandedId, documents, downloadUrls]);

  async function handleCopy(doc: SavedDocument) {
    try {
      await navigator.clipboard.writeText(getDocumentPlainText(doc));
      setCopiedId(doc.id);
      setAnnouncement('Document copied to clipboard.');
      window.setTimeout(() => setCopiedId(null), 2000);
    } catch {
      await navigator.clipboard.writeText(doc.content);
      setCopiedId(doc.id);
      setAnnouncement('Document copied to clipboard.');
      window.setTimeout(() => setCopiedId(null), 2000);
    }
  }

  function handleExportPdf(doc: SavedDocument) {
    try {
      setActionError(null);
      exportDocumentPdf(doc);
      setExportedId(doc.id);
      window.setTimeout(() => setExportedId(null), 2000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not export this document as PDF.';
      setActionError(msg);
      window.setTimeout(() => setActionError(null), 4000);
    }
  }

  async function handleRename(doc: SavedDocument) {
    const nextName = window.prompt('Rename this document:', doc.name)?.trim();
    if (!nextName || nextName === doc.name) return;

    try {
      setActionError(null);
      const res = await fetch(`/api/documents/${doc.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: nextName }),
      });

      if (!res.ok) {
        setActionError('Could not rename this document.');
        return;
      }

      const updatedDoc = await res.json();
      setDocuments((prev) =>
        prev.map((item) => (item.id === doc.id ? { ...item, ...updatedDoc } : item)),
      );
      setRenamedId(doc.id);
      window.setTimeout(() => setRenamedId(null), 2000);
    } catch {
      setActionError('Could not rename this document.');
    }
  }

  async function handleDuplicate(doc: SavedDocument) {
    try {
      setActionError(null);
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
        setActionError('Could not duplicate this document.');
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
      setAnnouncement(`"${doc.name}" deleted.`);
      if (expandedId === doc.id) setExpandedId(null);
      if (versionHistoryId === doc.id) setVersionHistoryId(null);
      if (rewriteVersionId === doc.id) setRewriteVersionId(null);
    } catch {
      // Silently fail.
    }
  }

  async function handleStatusToggle(doc: SavedDocument) {
    const newStatus = doc.status === 'final' ? 'draft' : 'final';
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

  async function handleArchive(doc: SavedDocument, archive: boolean) {
    try {
      const res = await fetch(`/api/documents/${doc.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ archive }),
      });
      if (!res.ok) return;
      setDocuments((prev) => prev.filter((item) => item.id !== doc.id));
      if (expandedId === doc.id) setExpandedId(null);
      if (versionHistoryId === doc.id) setVersionHistoryId(null);
      if (rewriteVersionId === doc.id) setRewriteVersionId(null);
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
    return (
      <div className="flex flex-col gap-3">
        <div className="flex justify-end">
          <button
            onClick={() => setShowArchived((prev) => !prev)}
            className="text-xs text-gray-400 underline-offset-2 hover:text-gray-600 hover:underline"
          >
            {showArchived ? '← Back to documents' : 'View archived'}
          </button>
        </div>
        <p className="text-sm text-gray-400">
          {showArchived ? 'No archived documents.' : emptyMessage}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {actionError && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{actionError}</p>
      )}
      <div className="flex items-center justify-between">
        <LibraryControls
          typeFilter={typeFilter}
          sortOrder={sortOrder}
          onTypeFilterChange={setTypeFilter}
          onSortOrderChange={setSortOrder}
        />
        <button
          onClick={() => setShowArchived((prev) => !prev)}
          className="text-xs text-gray-400 underline-offset-2 hover:text-gray-600 hover:underline"
        >
          {showArchived ? '← Back to documents' : 'View archived'}
        </button>
      </div>

      {filteredAndSorted.length === 0 ? (
        <p className="text-sm text-gray-400">No documents match the selected filter.</p>
      ) : (
        filteredAndSorted.map((doc) => (
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
                  {!showArchived && (
                    <button
                      onClick={() => void handleStatusToggle(doc)}
                      className={`cursor-pointer rounded-full px-2 py-0.5 text-xs font-medium transition-colors hover:opacity-80 ${
                        doc.status === 'final'
                          ? 'bg-purple-100 text-purple-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}
                      title="Click to toggle Draft / Final"
                    >
                      {doc.status === 'final' ? 'Final' : 'Draft'}
                    </button>
                  )}
                  {showArchived && (
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">
                      Archived
                    </span>
                  )}
                  <span className="text-sm font-semibold text-gray-800">{doc.name}</span>
                </div>
                <span className="text-xs text-gray-400">
                  Saved {formatTimestamp(doc.created_at)}
                </span>
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
                {!showArchived && (
                  <>
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
                  </>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => void handleExportPdf(doc)}
                  className="h-7 px-3 text-xs text-gray-500 hover:text-gray-700"
                >
                  {exportedId === doc.id ? 'Exported!' : 'Export PDF'}
                </Button>
                {showArchived ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => void handleArchive(doc, false)}
                    className="h-7 px-3 text-xs text-gray-500 hover:text-gray-700"
                  >
                    Restore
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => void handleArchive(doc, true)}
                    className="h-7 px-3 text-xs text-gray-400 hover:text-amber-600"
                  >
                    Archive
                  </Button>
                )}
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

            {/* S3-003: Version History and Rewrite as New Version toggles.
                Only shown on non-archived AI-generated documents.
                Auth and ownership enforced on the backend per S1-003 §4.3. */}
            {!showArchived && (
              <div className="flex flex-col gap-1 border-t border-gray-50 px-4 pt-1 pb-2">
                {/* Version History toggle */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setVersionHistoryId((prev) => (prev === doc.id ? null : doc.id))}
                  className="h-7 w-full justify-start px-1 text-xs text-gray-400 hover:text-gray-600"
                >
                  <History size={13} className="mr-1.5" />
                  {versionHistoryId === doc.id ? 'Hide Version History' : 'Version History'}
                </Button>

                {versionHistoryId === doc.id && (
                  <div className="mt-1 mb-1 rounded-lg border border-gray-100 bg-gray-50 p-3">
                    <p className="mb-2 text-xs font-semibold tracking-wider text-gray-500 uppercase">
                      Version History
                    </p>
                    <DocumentVersionHistory
                      documentId={doc.id}
                      onRestored={() => {
                        void fetchDocuments();
                      }}
                    />
                  </div>
                )}

                {/* Rewrite as New Version — only for AI-generated docs */}
                {!doc.file_path && (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setRewriteVersionId((prev) => (prev === doc.id ? null : doc.id))
                      }
                      className="h-7 w-full justify-start px-1 text-xs text-gray-400 hover:text-gray-600"
                    >
                      <Plus size={13} className="mr-1.5" />
                      {rewriteVersionId === doc.id
                        ? 'Hide Rewrite Panel'
                        : 'Rewrite as New Version'}
                    </Button>

                    {rewriteVersionId === doc.id && (
                      <div className="mt-1 mb-1 rounded-lg border border-blue-100 bg-blue-50/40 p-4">
                        <p className="mb-1 text-xs font-semibold tracking-wider text-blue-700 uppercase">
                          Rewrite as New Version
                        </p>
                        <p className="mb-3 text-xs text-gray-500">
                          Generate new content and save it as a new version of this document instead
                          of creating a new document in your library.
                        </p>
                        {doc.type === 'cover_letter' ? (
                          <CoverLetterGenerator
                            existingDocId={doc.id}
                            presetJob={
                              doc.job_id
                                ? {
                                    id: doc.job_id,
                                    job_title: '',
                                    company_name: '',
                                    current_stage: '',
                                  }
                                : undefined
                            }
                            hideJobSelector={true}
                            onSaved={() => {
                              void fetchDocuments();
                              setVersionHistoryId(doc.id);
                              setRewriteVersionId(null);
                            }}
                          />
                        ) : (
                          <ResumeGenerator
                            existingDocId={doc.id}
                            presetJob={
                              doc.job_id
                                ? {
                                    id: doc.job_id,
                                    job_title: '',
                                    company_name: '',
                                    current_stage: '',
                                  }
                                : undefined
                            }
                            hideJobSelector={true}
                            onSaved={() => {
                              void fetchDocuments();
                              setVersionHistoryId(doc.id);
                              setRewriteVersionId(null);
                            }}
                          />
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {expandedId === doc.id && (
              <div className="border-t border-gray-100 px-4 py-3">
                <div className="mb-4 flex flex-wrap items-center gap-3">
                  <div className="flex flex-wrap gap-2">
                    {(doc.tags || []).map((tag) => (
                      <Badge
                        key={tag}
                        variant="outline"
                        className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs"
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => void handleRemoveTag(doc, tag)}
                          className="rounded-full text-gray-400 transition-colors hover:text-red-500"
                          aria-label={`Remove tag ${tag}`}
                        >
                          <X size={12} />
                        </button>
                      </Badge>
                    ))}
                  </div>

                  {addingTagId === doc.id ? (
                    <div className="flex items-center gap-2">
                      <Input
                        value={newTagText}
                        onChange={(e) => setNewTagText(e.target.value)}
                        placeholder="Add tag..."
                        className="h-8 w-32 text-xs"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            void handleAddTag(doc);
                          }
                          if (e.key === 'Escape') {
                            setAddingTagId(null);
                            setNewTagText('');
                          }
                        }}
                        autoFocus
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => void handleAddTag(doc)}
                        className="h-7 px-2 text-xs text-gray-500 hover:text-gray-700"
                      >
                        Save
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setAddingTagId(doc.id)}
                      className="h-7 px-2 text-xs text-gray-500 hover:text-gray-700"
                    >
                      <Plus size={12} className="mr-1" /> Add Tag
                    </Button>
                  )}
                </div>

                {allUniqueTags.length > 0 && (
                  <div className="mb-4 flex flex-wrap gap-2">
                    {allUniqueTags
                      .filter((tag) => !(doc.tags || []).includes(tag))
                      .map((tag) => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => void handleAddTag(doc, tag)}
                          className="rounded-full border border-gray-200 px-2 py-0.5 text-xs text-gray-500 transition-colors hover:border-gray-300 hover:text-gray-700"
                        >
                          {tag}
                        </button>
                      ))}
                  </div>
                )}

                {(() => {
                  if (doc.file_path) {
                    const signedUrl = downloadUrls[doc.id];
                    return (
                      <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                        <span className="text-sm text-gray-600">
                          {doc.original_filename ?? 'Uploaded file'}
                        </span>
                        {signedUrl ? (
                          <a
                            href={signedUrl}
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
                    );
                  }

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
                    return (
                      <p className="text-sm whitespace-pre-wrap text-gray-600">{doc.content}</p>
                    );
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
        ))
      )}

      {/* S3-019: aria-live region for screen reader announcements.
          Invisible to sighted users — only read by assistive technologies.
          Per S1-002 §10.1 accessibility standards. */}
      <div role="status" aria-live="polite" className="sr-only">
        {announcement}
      </div>
    </div>
  );
}
