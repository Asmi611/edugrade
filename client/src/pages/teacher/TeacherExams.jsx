/**
 * TeacherExams
 * ------------
 * Lists all exams created by this teacher with search and pagination.
 * "Create Exam" button opens a modal with a form:
 *   - Title
 *   - Select class (from teacher's classes)
 *   - Scheduled date/time
 *   - Deadline
 *   - Answer key textarea (or toggle "Let AI generate answer key")
 */

import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import api from '../../lib/api.js';
import Badge from '../admin/components/Badge.jsx';
import Modal from '../admin/components/Modal.jsx';
import Pagination from '../admin/components/Pagination.jsx';
import { SkeletonTable } from '../admin/components/Skeleton.jsx';

const PAGE_SIZE = 10;

function formatDate(value) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString();
  } catch (_) {
    return String(value);
  }
}

function toLocalDatetime(value) {
  if (!value) return '';
  try {
    const d = new Date(value);
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch (_) {
    return '';
  }
}

export default function TeacherExams() {
  const navigate = useNavigate();
  const [exams, setExams] = useState(null);
  const [classes, setClasses] = useState([]);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);

  // Create exam form state
  const [form, setForm] = useState({
    title: '',
    class_id: '',
    scheduled_at: '',
    deadline: '',
    answer_key_text: '',
    use_ai_key: false,
    question_paper_text: '',
    question_paper_file: null,
  });

  const loadExams = useCallback(async () => {
    setError('');
    try {
      const { data } = await api.get('/teacher/exams');
      setExams(data?.exams || []);
    } catch (err) {
      setError(err.message || 'Failed to load exams.');
    }
  }, []);

  const loadClasses = useCallback(async () => {
    try {
      const { data } = await api.get('/teacher/classes');
      setClasses(data?.classes || []);
    } catch (_) {
      // Non-critical error
    }
  }, []);

  useEffect(() => {
    loadExams();
    loadClasses();
  }, [loadExams, loadClasses]);

  // Reset create form when modal opens
  useEffect(() => {
    if (showCreate) {
      setForm({
        title: '',
        class_id: classes.length > 0 ? String(classes[0].id) : '',
        scheduled_at: '',
        deadline: '',
        answer_key_text: '',
        use_ai_key: false,
        question_paper_text: '',
        question_paper_file: null,
      });
      setCreating(false);
    }
  }, [showCreate, classes]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleCreate(e) {
    e.preventDefault();
    if (!form.title.trim()) {
      setError('Title is required.');
      return;
    }
    if (!form.class_id) {
      setError('Please select a class.');
      return;
    }

    setCreating(true);
    setError('');
    try {
      // Use FormData for multipart upload (supports file + text fields)
      const formData = new FormData();
      formData.append('title', form.title.trim());
      formData.append('class_id', parseInt(form.class_id, 10));
      formData.append('scheduled_at', form.scheduled_at || '');
      formData.append('deadline', form.deadline || '');
      if (form.use_ai_key) {
        formData.append('answer_key_text', '');
        formData.append('use_ai_key', 'true');
      } else {
        formData.append('answer_key_text', form.answer_key_text.trim() || '');
        formData.append('use_ai_key', 'false');
      }
      formData.append('question_paper_text', form.question_paper_text.trim() || '');
      if (form.question_paper_file) {
        formData.append('question_paper_file', form.question_paper_file);
      }

      // Let axios auto-detect Content-Type (with boundary) for FormData
      await api.post('/teacher/exams', formData);
      setShowCreate(false);
      await loadExams();
    } catch (err) {
      setError(err.message || 'Failed to create exam.');
    } finally {
      setCreating(false);
    }
  }

  // Client-side filtering & pagination
  const filtered = exams
    ? exams.filter((e) => {
        if (!search) return true;
        const q = search.trim().toLowerCase();
        return (
          e.title?.toLowerCase().includes(q) ||
          e.class_name?.toLowerCase().includes(q)
        );
      })
    : [];

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const pageRows = filtered.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE
  );

  useEffect(() => {
    setPage(1);
  }, [search]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white sm:text-3xl">Exams</h1>
          <p className="mt-1 text-sm text-white/60">
            Create and manage your exams.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={loadExams}
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white/80 transition hover:border-emerald-400/40 hover:bg-white/10"
          >
            ↻ Refresh
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="rounded-lg bg-emerald-500/90 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-500"
          >
            + Create Exam
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      {/* Search */}
      <div className="relative max-w-xs">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search exams…"
          className="w-full rounded-lg border border-white/10 bg-white/5 px-9 py-2 text-sm text-white placeholder-white/40 outline-none transition focus:border-emerald-400/60 focus:bg-white/10"
        />
        <svg
          viewBox="0 0 24 24"
          className="absolute left-3 top-2.5 h-4 w-4 text-white/40"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="M21 21l-4.35-4.35" />
        </svg>
      </div>

      {/* Table */}
      {exams === null ? (
        <SkeletonTable rows={6} cols={5} />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-white/5 text-left text-xs uppercase tracking-wider text-white/60">
                <tr>
                  <th className="px-4 py-3 font-medium">Title</th>
                  <th className="px-4 py-3 font-medium">Class</th>
                  <th className="px-4 py-3 font-medium">Submissions</th>
                  <th className="px-4 py-3 font-medium">Graded</th>
                  <th className="px-4 py-3 font-medium">AI Key</th>
                  <th className="px-4 py-3 font-medium">Deadline</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {pageRows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-sm text-white/60">
                      No exams found.{' '}
                      <button
                        onClick={() => setShowCreate(true)}
                        className="font-semibold text-emerald-300 hover:text-emerald-200"
                      >
                        Create one →
                      </button>
                    </td>
                  </tr>
                ) : (
                  pageRows.map((e) => (
                    <tr key={e.id} className="hover:bg-white/[0.03]">
                      <td className="px-4 py-3 font-medium text-white">{e.title}</td>
                      <td className="px-4 py-3 text-white/80">{e.class_name}</td>
                      <td className="px-4 py-3 text-white/80">{e.total_submissions || 0}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-semibold text-emerald-200 ring-1 ring-emerald-400/30">
                          {e.graded_count || 0}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {e.use_ai_key ? (
                          <Badge variant="graded">AI</Badge>
                        ) : (
                          <Badge variant="default">Manual</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-white/70">{formatDate(e.deadline)}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => navigate(`/teacher/results?examId=${e.id}`)}
                          className="rounded-md border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-semibold text-white/80 transition hover:border-emerald-400/40 hover:bg-white/10"
                        >
                          Submissions
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="border-t border-white/10 px-3">
            <Pagination page={safePage} pageCount={pageCount} onChange={setPage} />
          </div>
        </div>
      )}

      {/* ============ Create Exam Modal ============ */}
      <Modal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title="Create Exam"
        footer={
          <div className="flex gap-2">
            <button
              onClick={() => setShowCreate(false)}
              className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white/80 hover:bg-white/10"
            >
              Cancel
            </button>
            <button
              disabled={creating}
              onClick={handleCreate}
              className="rounded-lg bg-emerald-500/90 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-50"
            >
              {creating ? 'Creating…' : 'Create Exam'}
            </button>
          </div>
        }
      >
        <form onSubmit={handleCreate} className="space-y-5">
          {/* Title */}
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-white/60">
              Exam Title *
            </label>
            <input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="e.g. Midterm Exam — Mathematics"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/40 outline-none transition focus:border-emerald-400/60 focus:bg-white/10"
              required
            />
          </div>

          {/* Class */}
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-white/60">
              Class *
            </label>
            <select
              value={form.class_id}
              onChange={(e) => setForm((f) => ({ ...f, class_id: e.target.value }))}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none transition focus:border-emerald-400/60 focus:bg-white/10"
              required
            >
              <option value="" disabled>Select a class</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} — {c.subject}
                </option>
              ))}
            </select>
          </div>

          {/* Schedule & Deadline */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-white/60">
                Scheduled
              </label>
              <input
                type="datetime-local"
                value={form.scheduled_at}
                onChange={(e) => setForm((f) => ({ ...f, scheduled_at: e.target.value }))}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none transition focus:border-emerald-400/60 focus:bg-white/10"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-white/60">
                Deadline
              </label>
              <input
                type="datetime-local"
                value={form.deadline}
                onChange={(e) => setForm((f) => ({ ...f, deadline: e.target.value }))}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none transition focus:border-emerald-400/60 focus:bg-white/10"
              />
            </div>
          </div>

          {/* AI Key Toggle */}
          <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 p-3">
            <input
              type="checkbox"
              id="use_ai_key"
              checked={form.use_ai_key}
              onChange={(e) => setForm((f) => ({ ...f, use_ai_key: e.target.checked }))}
              className="h-4 w-4 rounded border-white/30 bg-white/10 text-emerald-500 focus:ring-emerald-500/40"
            />
            <label htmlFor="use_ai_key" className="text-sm text-white/80">
              Let AI generate answer key from exam title
            </label>
          </div>

          {/* Answer Key (hidden when AI key is enabled) */}
          {!form.use_ai_key && (
            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-white/60">
                Answer Key
              </label>
              <textarea
                value={form.answer_key_text}
                onChange={(e) => setForm((f) => ({ ...f, answer_key_text: e.target.value }))}
                placeholder="Paste or type the answer key / marking scheme…"
                rows={6}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/40 outline-none transition focus:border-emerald-400/60 focus:bg-white/10"
              />
              <p className="mt-1 text-xs text-white/50">
                Optional if using AI grading. If left blank, students will still
                be able to submit but grading will require an answer key.
              </p>
            </div>
          )}

          {/* ---- Question Paper Section ---- */}
          <div className="border-t border-white/10 pt-4">
            <div className="mb-3 flex items-center gap-2">
              <svg className="h-4 w-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                <path d="M14 2v6h6" />
                <path d="M12 18v-4" />
                <path d="M9 15l3-3 3 3" />
              </svg>
              <span className="text-xs font-semibold uppercase tracking-wider text-white/70">
                Question Paper (Optional)
              </span>
            </div>

            {/* Question paper textarea */}
            <div className="mb-3">
              <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-white/60">
                Type or paste questions
              </label>
              <textarea
                value={form.question_paper_text}
                onChange={(e) => setForm((f) => ({ ...f, question_paper_text: e.target.value }))}
                placeholder="Type or paste the exam questions here…"
                rows={4}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/40 outline-none transition focus:border-emerald-400/60 focus:bg-white/10"
              />
            </div>

            {/* Divider OR */}
            <div className="mb-3 flex items-center gap-3">
              <div className="flex-1 border-t border-white/10" />
              <span className="text-xs font-medium uppercase tracking-wider text-white/40">OR</span>
              <div className="flex-1 border-t border-white/10" />
            </div>

            {/* File upload */}
            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-white/60">
                Upload Question Paper (PDF / Image)
              </label>
              <div className="flex items-center gap-3">
                <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-white/20 bg-white/5 px-4 py-3 text-sm text-white/70 transition hover:border-emerald-400/40 hover:bg-white/10 hover:text-white">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                    <path d="M7 10l5 5 5-5" />
                    <path d="M12 15V3" />
                  </svg>
                  <span>{form.question_paper_file ? form.question_paper_file.name : 'Choose file'}</span>
                  <input
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg,.webp,.tiff,.bmp"
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null;
                      setForm((f) => ({ ...f, question_paper_file: file }));
                    }}
                    className="hidden"
                  />
                </label>
                {form.question_paper_file && (
                  <button
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, question_paper_file: null }))}
                    className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-xs text-white/60 transition hover:border-red-400/40 hover:text-red-200"
                  >
                    Remove
                  </button>
                )}
              </div>
              <p className="mt-1.5 text-xs text-white/50">
                <span className="text-emerald-400/80">↑</span> Adding questions helps AI grade each answer more accurately, question by question.
              </p>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}
