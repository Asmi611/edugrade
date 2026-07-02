/**
 * StudentSubmit
 * -------------
 * Submit answers to exams.
 *
 * - Select an exam (pre-filled from query param ?examId=)
 * - Drag-and-drop + browse file upload (image/PDF, max 10MB)
 * - Preview thumbnail
 * - Submit button → shows "Processing..." → redirects to results when graded
 * - Polls for grading completion
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import api from '../../lib/api.js';
import Badge from '../admin/components/Badge.jsx';

const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/tiff', 'image/bmp', 'application/pdf'];

function formatDate(value) {
  if (!value) return '—';
  try { return new Date(value).toLocaleString(); } catch (_) { return String(value); }
}

export default function StudentSubmit() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const examIdFromUrl = searchParams.get('examId');

  const [exams, setExams] = useState([]);
  const [selectedExamId, setSelectedExamId] = useState(examIdFromUrl || '');
  const [selectedExam, setSelectedExam] = useState(null);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submittedId, setSubmittedId] = useState(null);
  const [gradingStatus, setGradingStatus] = useState('');
  const fileInputRef = useRef(null);

  // Load available exams
  const loadExams = useCallback(async () => {
    try {
      const { data } = await api.get('/student/exams');
      const available = (data?.exams || []).filter((e) => !e.submitted && e.status === 'open');
      setExams(available);
    } catch (err) {
      setError(err.message || 'Failed to load exams.');
    }
  }, []);

  useEffect(() => {
    loadExams();
  }, [loadExams]);

  // Update selected exam details
  useEffect(() => {
    if (selectedExamId) {
      const exam = exams.find((e) => String(e.id) === String(selectedExamId));
      setSelectedExam(exam || null);
    } else {
      setSelectedExam(null);
    }
  }, [selectedExamId, exams]);

  // Clean up preview and redirect timers on unmount
  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  // Redirect to results after successful submission
  useEffect(() => {
    if (submittedId) {
      const timer = setTimeout(() => navigate('/student/results'), 3000);
      return () => clearTimeout(timer);
    }
  }, [submittedId, navigate]);

  function handleFileDrop(e) {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer?.files?.[0] || e.target?.files?.[0];
    validateAndSetFile(f);
  }

  function handleFileSelect(e) {
    const f = e.target?.files?.[0];
    validateAndSetFile(f);
  }

  function validateAndSetFile(f) {
    setError('');
    if (!f) return;

    if (!ALLOWED_TYPES.includes(f.type)) {
      setError('Only PNG, JPG, TIFF, BMP images and PDF files are allowed.');
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      setError('File size must be under 10 MB.');
      return;
    }

    setFile(f);

    // Generate preview for images
    if (preview) URL.revokeObjectURL(preview);
    if (f.type.startsWith('image/')) {
      setPreview(URL.createObjectURL(f));
    } else {
      // PDF — show icon instead
      setPreview(null);
    }
  }

  function removeFile() {
    if (preview) URL.revokeObjectURL(preview);
    setFile(null);
    setPreview(null);
    setError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function handleSubmit() {
    if (!selectedExamId || !file) {
      setError('Please select an exam and upload your answer file.');
      return;
    }

    setSubmitting(true);
    setError('');
    setGradingStatus('Uploading…');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const { data } = await api.post(`/student/exams/${selectedExamId}/submit`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const submissionId = data?.submission?.id;
      setSubmittedId(submissionId);

      if (submissionId) {
        setGradingStatus('Submission received! Check My Results for your grade.');
      } else {
        setGradingStatus('Submitted!');
      }
    } catch (err) {
      setError(err.message || 'Failed to submit.');
      setSubmitting(false);
      setGradingStatus('');
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white sm:text-3xl">Submit Answer</h1>
        <p className="mt-1 text-sm text-white/60">
          Select an exam and upload your answer file.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      {/* Grading status */}
      {gradingStatus && (
        <div className="rounded-lg border border-indigo-400/40 bg-indigo-500/10 px-4 py-3 text-sm text-indigo-200">
          <span className="inline-flex items-center gap-2">
            {!gradingStatus.includes('Complete') && (
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
            )}
            {gradingStatus}
          </span>
        </div>
      )}

      {!submittedId && (
        <>
          {/* Exam selector */}
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-white/60">
              Select Exam *
            </label>
            <select
              value={selectedExamId}
              onChange={(e) => setSelectedExamId(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none transition focus:border-indigo-400/60 focus:bg-white/10"
              disabled={submitting}
            >
              <option value="">Choose an available exam…</option>
              {exams.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.title} — {e.class_name}
                </option>
              ))}
            </select>
          </div>

          {/* Exam details */}
          {selectedExam && (
            <div className="rounded-2xl border border-indigo-400/20 bg-indigo-500/5 p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-semibold text-white">{selectedExam.title}</h3>
                  <p className="text-xs text-white/60">{selectedExam.class_name} — {selectedExam.subject}</p>
                </div>
                <Badge variant="graded">Open</Badge>
              </div>
              {selectedExam.deadline && (
                <p className="text-xs text-amber-300">
                  ⏱ Deadline: {formatDate(selectedExam.deadline)}
                </p>
              )}
            </div>
          )}

          {/* File upload */}
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-white/60">
              Upload Answer File *
            </label>

            {!file ? (
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleFileDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`cursor-pointer rounded-2xl border-2 border-dashed p-10 text-center transition ${
                  dragOver
                    ? 'border-indigo-400/60 bg-indigo-500/10'
                    : 'border-white/20 bg-white/5 hover:border-indigo-400/40 hover:bg-white/[0.07]'
                }`}
              >
                <svg viewBox="0 0 24 24" className="mx-auto h-10 w-10 text-white/30" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                  <path d="M7 10l5 5 5-5M12 15V3" />
                </svg>
                <p className="mt-3 text-sm font-medium text-white/70">
                  Drag & drop your file here, or click to browse
                </p>
                <p className="mt-1 text-xs text-white/50">
                  PNG, JPG, TIFF, BMP, PDF — Max 10 MB
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".png,.jpg,.jpeg,.tiff,.tif,.bmp,.pdf"
                  onChange={handleFileSelect}
                  className="hidden"
                  disabled={submitting}
                />
              </div>
            ) : (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-start gap-4">
                  {preview ? (
                    <img
                      src={preview}
                      alt="Preview"
                      className="h-24 w-24 rounded-lg border border-white/10 object-cover"
                    />
                  ) : (
                    <div className="grid h-24 w-24 place-items-center rounded-lg border border-white/10 bg-indigo-500/10">
                      <svg viewBox="0 0 24 24" className="h-8 w-8 text-indigo-300" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                        <path d="M14 2v6h6" />
                      </svg>
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-white truncate">{file.name}</p>
                    <p className="text-xs text-white/50">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                    <button
                      onClick={removeFile}
                      className="mt-2 rounded-md border border-red-400/30 bg-red-500/10 px-2 py-0.5 text-xs font-semibold text-red-200 hover:bg-red-500/20"
                      disabled={submitting}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Submit button */}
          <button
            disabled={!selectedExamId || !file || submitting}
            onClick={handleSubmit}
            className="w-full rounded-xl bg-indigo-500/90 py-3 text-sm font-bold text-white transition hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <span className="inline-flex items-center gap-2">
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
                Submitting…
              </span>
            ) : (
              'Submit Answer'
            )}
          </button>
        </>
      )}
    </div>
  );
}
