'use client';

import { useState, useRef, ChangeEvent, DragEvent } from 'react';
import { Button } from '@/components/ui/button';
import { UploadCloud, FileText, X, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';

export function DocumentUploader({ onUploadComplete }: { onUploadComplete: () => void }) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [docType, setDocType] = useState<'resume' | 'cover_letter'>('resume');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Job linking state
  const [jobs, setJobs] = useState<{ id: string; job_title: string; company_name: string }[]>([]);
  const [jobsLoaded, setJobsLoaded] = useState(false);
  const [jobSearch, setJobSearch] = useState('');
  const [selectedJobId, setSelectedJobId] = useState<string>('');
  const [showJobDropdown, setShowJobDropdown] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch jobs on mount
  useState(() => {
    fetch('/api/jobs')
      .then((res) => res.json())
      .then((json) => {
        if (json.data) setJobs(json.data);
      })
      .catch(() => {})
      .finally(() => setJobsLoaded(true));
  });

  function handleDrag(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  }

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  }

  function handleFile(file: File) {
    setError(null);
    setSuccess(false);

    // Validate size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      setError('File is too large. Maximum size is 5MB.');
      return;
    }

    // Validate type
    const validTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
    ];
    if (!validTypes.includes(file.type)) {
      setError('Invalid file format. Only PDF and Word documents are allowed.');
      return;
    }

    setSelectedFile(file);
  }

  async function handleUpload() {
    if (!selectedFile) return;
    if (!selectedJobId) {
      setError('You must select a job to link this document to.');
      return;
    }

    setUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('type', docType);
    if (selectedJobId) {
      formData.append('job_id', selectedJobId);
    }

    try {
      const response = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to upload document.');
      }

      setSuccess(true);
      setSelectedFile(null);
      if (inputRef.current) inputRef.current.value = '';

      // Give the user a moment to see the success state
      setTimeout(() => {
        setSuccess(false);
        onUploadComplete();
      }, 2000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {!selectedFile && !success && (
        <div
          className={`relative flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 transition-colors ${
            dragActive
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-300 bg-gray-50 hover:border-gray-400 hover:bg-gray-100'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
        >
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            onChange={handleChange}
          />
          <UploadCloud
            className={`mb-3 h-10 w-10 ${dragActive ? 'text-blue-500' : 'text-gray-400'}`}
          />
          <h3 className="mb-1 text-base font-semibold text-gray-800">
            Click to upload or drag and drop
          </h3>
          <p className="text-sm text-gray-500">PDF or Word DOCX (max 5MB)</p>
        </div>
      )}

      {selectedFile && !success && (
        <div className="flex flex-col gap-4 rounded-xl border border-blue-200 bg-blue-50/50 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-blue-100 p-2">
                <FileText className="h-6 w-6 text-blue-600" />
              </div>
              <div className="flex flex-col">
                <span className="max-w-[200px] truncate text-sm font-medium text-gray-900 sm:max-w-xs">
                  {selectedFile.name}
                </span>
                <span className="text-xs text-gray-500">
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </span>
              </div>
            </div>
            <button
              onClick={() => setSelectedFile(null)}
              disabled={uploading}
              className="rounded-md p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex flex-col gap-3 border-t border-blue-100 pt-3">
            <div className="flex flex-col items-center gap-3 sm:flex-row">
              <div className="w-full sm:flex-1">
                <Select
                  value={docType}
                  onValueChange={(val) => setDocType(val as 'resume' | 'cover_letter')}
                  disabled={uploading}
                >
                  <SelectTrigger className="w-full bg-white">
                    <SelectValue>{docType === 'resume' ? 'Resume' : 'Cover Letter'}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="resume">Resume</SelectItem>
                    <SelectItem value="cover_letter">Cover Letter</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="relative w-full sm:flex-1">
                {jobsLoaded && jobs.length === 0 ? (
                  <Button
                    variant="outline"
                    className="w-full cursor-not-allowed justify-start truncate border-red-300 bg-red-50 text-left text-red-700"
                    disabled
                  >
                    You need to create a job to select one
                  </Button>
                ) : showJobDropdown ? (
                  <div className="relative">
                    <Input
                      autoFocus
                      placeholder="Search jobs..."
                      value={jobSearch}
                      onChange={(e) => setJobSearch(e.target.value)}
                      onBlur={() => setTimeout(() => setShowJobDropdown(false), 200)}
                      className="w-full border-blue-500 bg-white ring-1 ring-blue-500"
                    />
                    <div className="absolute top-full left-0 z-50 mt-1 max-h-48 w-full overflow-y-auto rounded-md border border-gray-200 bg-white shadow-lg">
                      {jobs
                        .filter(
                          (j) =>
                            j.job_title.toLowerCase().includes(jobSearch.toLowerCase()) ||
                            j.company_name.toLowerCase().includes(jobSearch.toLowerCase()),
                        )
                        .map((job) => (
                          <button
                            key={job.id}
                            className="w-full px-3 py-2 text-left text-sm text-gray-800 hover:bg-gray-100"
                            onClick={() => {
                              setSelectedJobId(job.id);
                              setShowJobDropdown(false);
                            }}
                          >
                            <div className="truncate font-medium">{job.job_title}</div>
                            <div className="truncate text-xs text-gray-500">{job.company_name}</div>
                          </button>
                        ))}
                    </div>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    className={`w-full justify-start truncate bg-white text-left font-normal ${!selectedJobId ? 'border-dashed border-gray-400 text-gray-500' : 'text-gray-700'}`}
                    onClick={() => setShowJobDropdown(true)}
                    disabled={uploading}
                  >
                    {selectedJobId
                      ? jobs.find((j) => j.id === selectedJobId)?.job_title || 'Select a Job'
                      : 'Select a Job'}
                  </Button>
                )}
              </div>
            </div>
            <div className="flex justify-end border-t border-blue-50/50 pt-2">
              <Button
                onClick={handleUpload}
                disabled={uploading}
                className="w-full min-w-[140px] bg-blue-600 hover:bg-blue-700 sm:w-auto"
              >
                {uploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Uploading
                  </>
                ) : (
                  'Save to Library'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {success && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 p-8">
          <CheckCircle2 className="mb-3 h-10 w-10 text-emerald-500" />
          <h3 className="text-base font-semibold text-emerald-800">Upload Successful!</h3>
          <p className="mt-1 text-sm text-emerald-600">
            Your document has been added to the library.
          </p>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-100 bg-red-50 p-3 text-sm text-red-600">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}
    </div>
  );
}
