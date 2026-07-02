/**
 * AdminUsers
 * ----------
 * Tabbed user management:
 *   tabs:    All | Students | Teachers | Pending
 *   filters: role (student/teacher/admin) and status (pending/approved/rejected)
 *   actions: Approve, Reject, Delete, Change role
 *   pagination: 10 rows per page (client-side)
 */

import { useEffect, useMemo, useState } from 'react';

import api from '../../lib/api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import Badge from './components/Badge.jsx';
import Modal from './components/Modal.jsx';
import Pagination from './components/Pagination.jsx';
import { SkeletonTable } from './components/Skeleton.jsx';

const PAGE_SIZE = 10;

const TABS = [
  { id: 'all', label: 'All' },
  { id: 'students', label: 'Students' },
  { id: 'teachers', label: 'Teachers' },
  { id: 'pending', label: 'Pending' },
];

function formatDate(value) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleDateString();
  } catch (_) {
    return String(value);
  }
}

export default function AdminUsers() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState(null);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('all');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [actionId, setActionId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [roleTarget, setRoleTarget] = useState(null);
  const [roleDraft, setRoleDraft] = useState('student');

  async function loadUsers() {
    setError('');
    try {
      const { data } = await api.get('/admin/users');
      setUsers(data?.users || []);
    } catch (err) {
      setError(err.message || 'Failed to load users.');
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  // Derived list applying tab + filters + search.
  const filtered = useMemo(() => {
    if (!users) return [];
    return users.filter((u) => {
      if (tab === 'students' && u.role !== 'student') return false;
      if (tab === 'teachers' && u.role !== 'teacher') return false;
      if (tab === 'pending' && u.status !== 'pending') return false;
      if (roleFilter && u.role !== roleFilter) return false;
      if (statusFilter && u.status !== statusFilter) return false;
      if (search) {
        const q = search.trim().toLowerCase();
        if (
          !u.name.toLowerCase().includes(q) &&
          !u.email.toLowerCase().includes(q)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [users, tab, roleFilter, statusFilter, search]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const pageRows = filtered.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE
  );

  // Reset to page 1 whenever the filter set changes.
  useEffect(() => {
    setPage(1);
  }, [tab, roleFilter, statusFilter, search]);

  async function setStatus(id, status) {
    setActionId(id);
    try {
      const { data } = await api.patch(`/admin/users/${id}/status`, { status });
      setUsers((prev) =>
        prev.map((u) => (u.id === id ? { ...u, ...data.user } : u))
      );
    } catch (err) {
      setError(err.message || 'Action failed.');
    } finally {
      setActionId(null);
    }
  }

  async function deleteUser(id) {
    setActionId(id);
    try {
      await api.delete(`/admin/users/${id}`);
      setUsers((prev) => prev.filter((u) => u.id !== id));
      setDeleteTarget(null);
    } catch (err) {
      setError(err.message || 'Delete failed.');
    } finally {
      setActionId(null);
    }
  }

  async function changeRole() {
    if (!roleTarget) return;
    setActionId(roleTarget.id);
    try {
      const { data } = await api.patch(`/admin/users/${roleTarget.id}/role`, {
        role: roleDraft,
      });
      setUsers((prev) =>
        prev.map((u) => (u.id === roleTarget.id ? { ...u, ...data.user } : u))
      );
      setRoleTarget(null);
    } catch (err) {
      setError(err.message || 'Role change failed.');
    } finally {
      setActionId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white sm:text-3xl">Users</h1>
          <p className="mt-1 text-sm text-white/60">
            Approve, reject, or remove platform accounts.
          </p>
        </div>
        <button
          onClick={loadUsers}
          className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white/80 transition hover:border-indigo-400/40 hover:bg-white/10"
        >
          ↻ Refresh
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      {/* ============ Tabs ============ */}
      <div className="flex flex-wrap items-center gap-2 border-b border-white/10">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`-mb-px border-b-2 px-3 py-2 text-sm font-semibold transition ${
              tab === t.id
                ? 'border-indigo-400 text-white'
                : 'border-transparent text-white/60 hover:border-white/20 hover:text-white/90'
            }`}
          >
            {t.label}
            {t.id === 'pending' && users && (
              <span className="ml-2 rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] text-amber-200">
                {users.filter((u) => u.status === 'pending').length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ============ Filters ============ */}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="relative">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name or email…"
            className="w-full rounded-lg border border-white/10 bg-white/5 px-9 py-2 text-sm text-white placeholder-white/40 outline-none transition focus:border-indigo-400/60 focus:bg-white/10"
          />
          <svg viewBox="0 0 24 24" className="absolute left-3 top-2.5 h-4 w-4 text-white/40" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none transition focus:border-indigo-400/60"
        >
          <option value="" className="bg-navy-900">All roles</option>
          <option value="student" className="bg-navy-900">Students</option>
          <option value="teacher" className="bg-navy-900">Teachers</option>
          <option value="admin" className="bg-navy-900">Admins</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none transition focus:border-indigo-400/60"
        >
          <option value="" className="bg-navy-900">All statuses</option>
          <option value="pending" className="bg-navy-900">Pending</option>
          <option value="approved" className="bg-navy-900">Approved</option>
          <option value="rejected" className="bg-navy-900">Rejected</option>
        </select>
      </div>

      {/* ============ Table ============ */}
      {users === null ? (
        <SkeletonTable rows={6} cols={5} />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-white/5 text-left text-xs uppercase tracking-wider text-white/60">
                <tr>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Role</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Joined</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {pageRows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-sm text-white/60">
                      No users match your filters.
                    </td>
                  </tr>
                ) : (
                  pageRows.map((u) => (
                    <tr key={u.id} className="hover:bg-white/[0.03]">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <span className="grid h-8 w-8 place-items-center rounded-full bg-indigo-500/20 text-xs font-bold text-indigo-200 ring-1 ring-indigo-400/30">
                            {u.name.slice(0, 1).toUpperCase()}
                          </span>
                          <span className="font-medium text-white">{u.name}</span>
                          {u.id === me?.id && (
                            <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] uppercase tracking-wider text-white/70">
                              you
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-white/80">{u.email}</td>
                      <td className="px-4 py-3">
                        <Badge variant={u.role}>{u.role}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={u.status}>{u.status}</Badge>
                      </td>
                      <td className="px-4 py-3 text-white/70">
                        {formatDate(u.created_at)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center justify-end gap-1.5">
                          {u.status !== 'approved' && (
                            <button
                              disabled={actionId === u.id}
                              onClick={() => setStatus(u.id, 'approved')}
                              className="rounded-md bg-emerald-500/90 px-2.5 py-1 text-xs font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-50"
                            >
                              Approve
                            </button>
                          )}
                          {u.status !== 'rejected' && (
                            <button
                              disabled={actionId === u.id}
                              onClick={() => setStatus(u.id, 'rejected')}
                              className="rounded-md border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-semibold text-white/80 transition hover:border-rose-400/40 hover:bg-rose-500/10 hover:text-rose-200 disabled:opacity-50"
                            >
                              Reject
                            </button>
                          )}
                          <button
                            disabled={actionId === u.id || u.id === me?.id}
                            onClick={() => {
                              setRoleTarget(u);
                              setRoleDraft(u.role);
                            }}
                            className="rounded-md border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-semibold text-white/80 transition hover:border-indigo-400/40 hover:bg-white/10 disabled:opacity-50"
                          >
                            Role
                          </button>
                          <button
                            disabled={actionId === u.id || u.id === me?.id}
                            onClick={() => setDeleteTarget(u)}
                            className="rounded-md border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-semibold text-white/80 transition hover:border-rose-400/40 hover:bg-rose-500/10 hover:text-rose-200 disabled:opacity-50"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="border-t border-white/10 px-3">
            <Pagination
              page={safePage}
              pageCount={pageCount}
              onChange={setPage}
            />
          </div>
        </div>
      )}

      {/* ============ Delete confirm modal ============ */}
      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Delete user?"
        footer={
          <>
            <button
              onClick={() => setDeleteTarget(null)}
              className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white/80 hover:bg-white/10"
            >
              Cancel
            </button>
            <button
              onClick={() => deleteUser(deleteTarget.id)}
              disabled={actionId === deleteTarget?.id}
              className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-500 disabled:opacity-50"
            >
              Delete permanently
            </button>
          </>
        }
      >
        {deleteTarget && (
          <p>
            This will permanently delete{' '}
            <span className="font-semibold text-white">{deleteTarget.name}</span>{' '}
            (<span className="text-white/70">{deleteTarget.email}</span>) and
            cascade-remove their related data. This action cannot be undone.
          </p>
        )}
      </Modal>

      {/* ============ Role change modal ============ */}
      <Modal
        open={Boolean(roleTarget)}
        onClose={() => setRoleTarget(null)}
        title="Change user role"
        footer={
          <>
            <button
              onClick={() => setRoleTarget(null)}
              className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white/80 hover:bg-white/10"
            >
              Cancel
            </button>
            <button
              onClick={changeRole}
              disabled={actionId === roleTarget?.id || roleDraft === roleTarget?.role}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-50"
            >
              Save role
            </button>
          </>
        }
      >
        {roleTarget && (
          <div className="space-y-4">
            <p>
              Updating role for{' '}
              <span className="font-semibold text-white">{roleTarget.name}</span>{' '}
              (<span className="text-white/70">{roleTarget.email}</span>).
            </p>
            <div className="grid grid-cols-3 gap-2">
              {['student', 'teacher', 'admin'].map((r) => (
                <button
                  key={r}
                  onClick={() => setRoleDraft(r)}
                  className={`rounded-lg border px-3 py-2 text-sm font-semibold capitalize transition ${
                    roleDraft === r
                      ? 'border-indigo-400/60 bg-indigo-500/15 text-white'
                      : 'border-white/10 bg-white/5 text-white/70 hover:bg-white/10'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
