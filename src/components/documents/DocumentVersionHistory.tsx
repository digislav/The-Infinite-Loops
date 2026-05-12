'use client';

// DocumentVersionHistory — S3-003: Document Version History.
// Shows all saved versions of a document in a collapsible panel.
// Each version shows its version number, save date, and a Restore button.
// Restoring a version creates a new version entry with the old content and
// updates the document's main content — history is never deleted.
//
// Per S1-002 §5.7 — empty states must have icon + message.
// Per S1-003 — auth and ownership enforced on the backend.
//   We never send user_id from the client.
// Per S1-001 §6.3 — human-friendly error messages only.

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { formatTimestamp } from '@/lib/utils/dateFormatters';
import { History } from 'lucide-react';

interface DocumentVersion {
  id: string;
  version_number: number;
  created_at: string;
  content: string;
}

interface DocumentVersionHistoryProps {
  documentId: string;
  onRestored?: () => void;
}

export function DocumentVersionHistory({ documentId, onRestored }: DocumentVersionHistoryProps) {
  const [versions, setVersions] = useState<DocumentVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [restoredId, setRestoredId] = useState<string | null>(null);
  const [restoreError, setRestoreError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch(`/api/documents/${documentId}/versions`);
        if (!res.ok) {
          if (!cancelled) setError('Could not load version history.');
          return;
        }
        const json = await res.json();
        if (!cancelled) setVersions(json.data ?? []);
      } catch {
        if (!cancelled) setError('Could not load version history.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [documentId]);

  async function handleRestore(version: DocumentVersion) {
    setRestoringId(version.id);
    setRestoreError(null);

    try {
      const res = await fetch(`/api/documents/${documentId}/versions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: version.content }),
      });

      if (!res.ok) {
        setRestoreError('Failed to restore version. Please try again.');
        return;
      }

      const json = await res.json();

      if (json.data) {
        setVersions((prev) => [json.data, ...prev]);
      }

      setRestoredId(version.id);
      window.setTimeout(() => setRestoredId(null), 2500);
      onRestored?.();
    } catch {
      setRestoreError('Failed to restore version. Please try again.');
    } finally {
      setRestoringId(null);
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-2 pt-1">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-3/4" />
      </div>
    );
  }

  if (error) {
    return <p className="text-sm text-red-500">{error}</p>;
  }

  if (versions.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-gray-200 py-5 text-center">
        <History size={18} className="text-gray-300" />
        <p className="text-sm text-gray-400">No version history yet.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {restoreError && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{restoreError}</p>
      )}

      {versions.map((v, index) => (
        <div
          key={v.id}
          className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-4 py-2.5"
        >
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">
                v{v.version_number}
              </span>
              {index === 0 && (
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                  Current
                </span>
              )}
            </div>
            <span className="text-xs text-gray-400">Saved {formatTimestamp(v.created_at)}</span>
          </div>

          {index !== 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => void handleRestore(v)}
              disabled={restoringId === v.id}
              className="h-7 px-3 text-xs"
            >
              {restoringId === v.id
                ? 'Restoring...'
                : restoredId === v.id
                  ? 'Restored!'
                  : 'Restore'}
            </Button>
          )}
        </div>
      ))}
    </div>
  );
}
