'use client';

// JobDocumentLinker — S3-009: Implement Job-to-Library Linking UX.
// Shows all documents in the user's library and allows them to link
// or unlink documents to the current job context.
// Linked documents show with a green background and an Unlink button.
// Unlinked documents show with a Link button.
//
// Per S1-002 §11.1 — each section manages its own data independently.
// Per S1-002 §5.3 — uses controlled inputs throughout.
// Per S1-003 — auth and ownership enforced on the backend.
//   We never send user_id from the client.

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { formatTimestamp } from '@/lib/utils/dateFormatters';

// Minimal document shape needed for the linker.
interface LibraryDocument {
  id: string;
  type: 'cover_letter' | 'resume';
  name: string;
  job_id: string | null;
  created_at: string;
}

interface JobDocumentLinkerProps {
  // The job this linker is scoped to.
  jobId: string;
  // Called when a document is linked or unlinked so parent can refresh.
  onLinkChanged?: () => void;
}

export function JobDocumentLinker({ jobId, onLinkChanged }: JobDocumentLinkerProps) {
  const [documents, setDocuments] = useState<LibraryDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Track which document is currently being linked/unlinked.
  const [pendingId, setPendingId] = useState<string | null>(null);

  // Fetch all documents in the user's library on mount.
  // Auth and ownership enforced server-side per S1-003 §5.4.
  useEffect(() => {
    let cancelled = false;

    const loadDocuments = async () => {
      setLoading(true);
      setError(null);

      try {
        // Fetch ALL documents — not filtered by job — so user can link any of them.
        const res = await fetch('/api/documents');
        if (!res.ok) {
          if (!cancelled) setError('Could not load document library.');
          return;
        }
        const json = await res.json();
        if (!cancelled) setDocuments(json.data ?? []);
      } catch {
        if (!cancelled) setError('Could not load document library.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadDocuments();
    return () => {
      cancelled = true;
    };
  }, [jobId]);

  // handleLink — links a document to this job.
  // Sends only the action — user_id and ownership verified server-side
  // per S1-003 §5.4.
  async function handleLink(doc: LibraryDocument) {
    setPendingId(doc.id);

    try {
      const res = await fetch(`/api/jobs/${jobId}/documents/${doc.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        // Only send action — never user_id per S1-003 §5.4.
        body: JSON.stringify({ action: 'link' }),
      });

      if (!res.ok) {
        setError('Failed to link document. Please try again.');
        return;
      }

      // Update local state to reflect the link.
      setDocuments((prev) => prev.map((d) => (d.id === doc.id ? { ...d, job_id: jobId } : d)));
      if (onLinkChanged) onLinkChanged();
    } catch {
      setError('Failed to link document. Please try again.');
    } finally {
      setPendingId(null);
    }
  }

  // handleUnlink — removes the link between a document and this job.
  async function handleUnlink(doc: LibraryDocument) {
    setPendingId(doc.id);

    try {
      const res = await fetch(`/api/jobs/${jobId}/documents/${doc.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'unlink' }),
      });

      if (!res.ok) {
        setError('Failed to unlink document. Please try again.');
        return;
      }

      // Update local state to reflect the unlink.
      setDocuments((prev) => prev.map((d) => (d.id === doc.id ? { ...d, job_id: null } : d)));
      if (onLinkChanged) onLinkChanged();
    } catch {
      setError('Failed to unlink document. Please try again.');
    } finally {
      setPendingId(null);
    }
  }

  // LOADING STATE — skeletons per S1-002 §9.2.
  if (loading) {
    return (
      <div className="flex flex-col gap-2">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
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
        No documents in your library yet. Generate a cover letter or resume first.
      </p>
    );
  }

  // Split documents into linked and unlinked for clearer display.
  const linkedDocs = documents.filter((d) => d.job_id === jobId);
  const unlinkedDocs = documents.filter((d) => d.job_id !== jobId);

  return (
    <div className="flex flex-col gap-4">
      {/* Linked documents section */}
      {linkedDocs.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold tracking-wider text-gray-500 uppercase">
            Linked to this job
          </p>
          {linkedDocs.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center justify-between rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2"
            >
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
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-gray-800">{doc.name}</span>
                  <span className="text-xs text-gray-400">{formatTimestamp(doc.created_at)}</span>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleUnlink(doc)}
                disabled={pendingId === doc.id}
                className="h-7 px-3 text-xs text-gray-500 hover:text-red-500 disabled:opacity-50"
              >
                {pendingId === doc.id ? 'Unlinking...' : 'Unlink'}
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Unlinked documents section */}
      {unlinkedDocs.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold tracking-wider text-gray-500 uppercase">
            {linkedDocs.length > 0 ? 'Other documents' : 'Your document library'}
          </p>
          {unlinkedDocs.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center justify-between rounded-lg border border-gray-100 bg-white px-3 py-2"
            >
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
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-gray-800">{doc.name}</span>
                  <span className="text-xs text-gray-400">
                    {doc.job_id ? 'Linked to another job' : 'Not linked'}
                  </span>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleLink(doc)}
                disabled={pendingId === doc.id}
                className="h-7 px-3 text-xs text-[#2E75B6] hover:text-[#1F4E79] disabled:opacity-50"
              >
                {pendingId === doc.id ? 'Linking...' : 'Link'}
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
