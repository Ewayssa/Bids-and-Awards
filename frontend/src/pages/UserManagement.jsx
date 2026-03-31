import React, { useState, useEffect, useCallback } from 'react';
import { userService } from '../services/api';
import { MdPersonAdd, MdClose, MdCheckCircle, MdSearch, MdChevronLeft, MdChevronRight, MdVisibility, MdVisibilityOff, MdContentCopy, MdCheck } from 'react-icons/md';
import PageHeader from '../components/PageHeader';
import { ROLES, getRoleDisplayName, getAvailableRoles, hasPermission, PERMISSIONS } from '../utils/auth';

const TABLE_PAGE_SIZE = 10;
const EMPTY_ADD_FORM = { username: '', fullName: '', position: '', office: '', role: '' };
const EMPTY_EDIT_FORM = { fullName: '', position: '', office: '', role: '', is_active: true };

// Helper: returns border class if field is touched and invalid
const fieldCls = (touched, error) =>
    `input-field w-full${touched && error ? ' border-red-400 focus:ring-red-400' : ''}`;

const Personnel = ({ user }) => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);

    // Add modal
    const [showAddModal, setShowAddModal] = useState(false);
    const [addForm, setAddForm] = useState(EMPTY_ADD_FORM);
    const [addTouched, setAddTouched] = useState({});
    const [addError, setAddError] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [createdUser, setCreatedUser] = useState(null); // { username, temporary_password }
    const [showPassword, setShowPassword] = useState(false);
    const [copied, setCopied] = useState(false);

    // Edit modal
    const [editingUser, setEditingUser] = useState(null);
    const [editForm, setEditForm] = useState(EMPTY_EDIT_FORM);
    const [editTouched, setEditTouched] = useState({});
    const [editError, setEditError] = useState('');
    const [showConfirmEdit, setShowConfirmEdit] = useState(false);

    // Confirm add
    const [showConfirmAdd, setShowConfirmAdd] = useState(false);

    const [successMessage, setSuccessMessage] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [tablePage, setTablePage] = useState(1);

    const loadUsers = useCallback(async () => {
        try {
            const data = await userService.getAll();
            setUsers(Array.isArray(data) ? data : []);
        } catch (e) {
            setUsers([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadUsers(); }, [loadUsers]);

    useEffect(() => {
        if (!successMessage) return;
        const t = setTimeout(() => setSuccessMessage(''), 5000);
        return () => clearTimeout(t);
    }, [successMessage]);

    // ---- Add User ----
    const openAddModal = () => {
        setAddForm(EMPTY_ADD_FORM);
        setAddTouched({});
        setAddError('');
        setCreatedUser(null);
        setShowPassword(false);
        setCopied(false);
        setShowConfirmAdd(false);
        setShowAddModal(true);
    };

    const closeAddModal = () => {
        setShowAddModal(false);
        setShowConfirmAdd(false);
        setCreatedUser(null);
        setAddError('');
        setSubmitting(false);
    };

    const validateAdd = (form) => {
        const errs = {};
        if (!form.username.trim()) errs.username = 'Email is required.';
        else if (!form.username.includes('@')) errs.username = 'Must be a valid email address.';
        if (!form.fullName.trim()) errs.fullName = 'Full Name is required.';
        if (!form.position) errs.position = 'Position / Designation is required.';
        if (!form.office.trim()) errs.office = 'Department is required.';
        if (!form.role) errs.role = 'Role is required.';
        return errs;
    };

    const handleAddUserSubmit = (e) => {
        e.preventDefault();
        const all = { username: true, fullName: true, position: true, office: true, role: true };
        setAddTouched(all);
        const errs = validateAdd(addForm);
        if (Object.keys(errs).length) {
            setAddError('Please fill in all required fields.');
            return;
        }
        setAddError('');
        setShowConfirmAdd(true);
    };

    const confirmAddUser = async () => {
        const { username, fullName, position, office, role } = addForm;
        setSubmitting(true);
        setShowConfirmAdd(false);
        try {
            const res = await userService.create({
                username: username.trim(),
                fullName: fullName.trim() || undefined,
                position: position.trim() || undefined,
                office: office.trim() || undefined,
                role,
                created_by: (user?.username || user?.fullName || 'System').trim(),
            });
            setCreatedUser({
                username: res.username || username.trim(),
                temporary_password: res.temporary_password || 'password',
            });
            setSuccessMessage(`User "${fullName.trim() || username.trim()}" added successfully.`);
            setLoading(true);
            await loadUsers();
        } catch (err) {
            const d = err.response?.data;
            let msg = err.message || 'Failed to add user.';
            if (d) {
                if (typeof d.detail === 'string') msg = d.detail;
                else if (d.username?.[0]) msg = d.username[0];
                else if (d.non_field_errors?.[0]) msg = d.non_field_errors[0];
                else if (typeof d === 'object' && Object.keys(d).length)
                    msg = Object.entries(d).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(' ') : v}`).join('; ');
            }
            setAddError(typeof msg === 'string' ? msg : JSON.stringify(msg));
        } finally {
            setSubmitting(false);
        }
    };

    const handleCopyPassword = () => {
        navigator.clipboard.writeText(createdUser?.temporary_password || '');
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
    };

    // ---- Edit User ----
    const openEditModal = (u) => {
        setEditingUser(u);
        setEditForm({ fullName: u.fullName || '', position: u.position || '', office: u.office || '', role: u.role || ROLES.USER, is_active: u.is_active !== false });
        setEditTouched({});
        setEditError('');
        setShowConfirmEdit(false);
    };

    const closeEditModal = () => {
        setEditingUser(null);
        setShowConfirmEdit(false);
        setEditForm(EMPTY_EDIT_FORM);
        setEditError('');
        setSubmitting(false);
    };

    const handleEditSubmit = (e) => {
        e.preventDefault();
        setEditError('');
        if (!editingUser) return;
        setShowConfirmEdit(true);
    };

    const confirmEditUser = async () => {
        if (!editingUser) return;
        setSubmitting(true);
        setShowConfirmEdit(false);
        try {
            await userService.patch(editingUser.id, {
                fullName: editForm.fullName.trim() || undefined,
                position: editForm.position.trim() || undefined,
                office: editForm.office.trim() || undefined,
                role: editForm.role,
                is_active: editForm.is_active,
                updated_by: (user?.username || user?.fullName || 'System').trim(),
            });
            closeEditModal();
            setSuccessMessage('User updated successfully.');
            await loadUsers();
        } catch (err) {
            const d = err.response?.data;
            let msg = err.message || 'Failed to update user.';
            if (d) {
                if (typeof d.detail === 'string') msg = d.detail;
                else if (typeof d === 'object' && Object.keys(d).length)
                    msg = Object.entries(d).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(' ') : v}`).join('; ');
            }
            setEditError(typeof msg === 'string' ? msg : JSON.stringify(msg));
        } finally {
            setSubmitting(false);
        }
    };

    // ---- Table ----
    const filteredUsers = React.useMemo(() => {
        if (!searchQuery.trim()) return users;
        const q = searchQuery.trim().toLowerCase();
        return users.filter((u) => {
            return [u.fullName, u.username, u.position, u.office, getRoleDisplayName(u.role), u.is_active !== false ? 'active' : 'inactive']
                .some(v => String(v || '').toLowerCase().includes(q));
        });
    }, [users, searchQuery]);

    const totalPages = Math.max(1, Math.ceil(filteredUsers.length / TABLE_PAGE_SIZE));
    const paginatedUsers = React.useMemo(() => {
        const start = (tablePage - 1) * TABLE_PAGE_SIZE;
        return filteredUsers.slice(start, start + TABLE_PAGE_SIZE);
    }, [filteredUsers, tablePage]);

    useEffect(() => { setTablePage(1); }, [filteredUsers.length]);

    const addErrs = validateAdd(addForm);

    return (
        <div className="space-y-5">
            <PageHeader title="User Management" subtitle="Create and manage user accounts, assign roles and permissions." />

            <section className="content-section overflow-hidden rounded-xl p-0">
                {successMessage && (
                    <div className="flex items-center gap-3 px-5 py-3 rounded-t-xl bg-green-50 border-b border-green-200 text-green-800 text-sm font-medium" role="alert">
                        <MdCheckCircle className="w-5 h-5 flex-shrink-0 text-green-600" />
                        <span>{successMessage}</span>
                    </div>
                )}
                <div className={`section-header ${successMessage ? 'section-header--nested' : ''}`}>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div className="min-w-0 flex-1 overflow-hidden">
                            <h2 className="text-base sm:text-lg font-bold text-[var(--text)] truncate block">System Users</h2>
                            <p className="text-xs text-[var(--text-muted)] mt-0.5 truncate">All registered users and their roles</p>
                        </div>
                        {hasPermission(user?.role, PERMISSIONS.MANAGE_USERS) && (
                            <button type="button" onClick={openAddModal} className="btn-primary inline-flex items-center gap-1.5 py-2.5 px-4">
                                <MdPersonAdd className="w-5 h-5" /> Add User
                            </button>
                        )}
                    </div>
                    <div className="relative w-full max-w-none mt-3 pt-3 border-t border-[var(--border-light)]">
                        <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)]" aria-hidden />
                        <input
                            type="search"
                            placeholder="Search by name, email, position, department, role, or status..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="input-field w-full pl-10 rounded-lg"
                            aria-label="Search users"
                        />
                    </div>
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-16 text-[var(--text-muted)]">
                        <div className="w-10 h-10 rounded-full border-2 border-[var(--border)] border-t-[var(--primary)] animate-spin mb-4" aria-hidden />
                        <p className="text-sm font-medium">Loading users…</p>
                    </div>
                ) : users.length === 0 ? (
                    <div className="py-16 text-center">
                        <MdPersonAdd className="w-12 h-12 mx-auto text-[var(--text-subtle)] mb-3" />
                        <p className="text-[var(--text-muted)] font-medium">No users found</p>
                        <p className="text-sm text-[var(--text-subtle)] mt-1">Add a user to get started.</p>
                    </div>
                ) : filteredUsers.length === 0 ? (
                    <div className="py-16 text-center">
                        <MdSearch className="w-12 h-12 mx-auto text-[var(--text-subtle)] mb-3" />
                        <p className="text-[var(--text-muted)] font-medium">No users match your search</p>
                        <p className="text-sm text-[var(--text-subtle)] mt-1">Try a different search term.</p>
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-[var(--border)] w-full">
                                <thead className="table-header">
                                    <tr>
                                        <th className="table-th">Full Name</th>
                                        <th className="table-th">Email</th>
                                        <th className="table-th">Position</th>
                                        <th className="table-th">Department</th>
                                        <th className="table-th">Role</th>
                                        <th className="table-th">Status</th>
                                        {hasPermission(user?.role, PERMISSIONS.MANAGE_USERS) && <th className="table-th">Actions</th>}
                                    </tr>
                                </thead>
                                <tbody className="bg-[var(--surface)] divide-y divide-[var(--border-light)]">
                                    {paginatedUsers.map((u) => (
                                        <tr key={u.id} className="hover:bg-[var(--background-subtle)]/50 transition-all duration-300 ease-out group">
                                            <td className="table-td font-medium">{u.fullName || '—'}</td>
                                            <td className="table-td-muted">{u.username}</td>
                                            <td className="table-td-muted">{u.position || '—'}</td>
                                            <td className="table-td-muted">{u.office || '—'}</td>
                                            <td className="table-td">
                                                <span className={`inline-flex px-3 py-1 rounded-lg text-xs font-semibold transition-all duration-300 ${u.role === ROLES.ADMIN ? 'bg-[var(--primary-muted)] text-[var(--primary)]' : 'bg-[var(--background-subtle)] text-[var(--text-muted)]'}`}>
                                                    {getRoleDisplayName(u.role)}
                                                </span>
                                            </td>
                                            <td className="table-td">
                                                <span className={`inline-flex px-3 py-1 rounded-lg text-xs font-semibold transition-all duration-300 ${u.is_active !== false ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                    {u.is_active !== false ? 'Active' : 'Inactive'}
                                                </span>
                                            </td>
                                            {hasPermission(user?.role, PERMISSIONS.MANAGE_USERS) && (
                                                <td className="table-td table-cell-actions">
                                                    <button
                                                        type="button"
                                                        onClick={() => openEditModal(u)}
                                                        className="px-3 py-1 text-[11px] font-medium rounded-full border border-[var(--border)] text-[var(--primary)] hover:bg-[var(--primary-muted)] transition-all"
                                                        title="Edit user"
                                                    >
                                                        Edit
                                                    </button>
                                                </td>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        {filteredUsers.length > TABLE_PAGE_SIZE && (
                            <div className="flex items-center justify-center gap-3 py-3 border-t border-[var(--border)] bg-[var(--background-subtle)]/50">
                                <button type="button" onClick={() => setTablePage((p) => Math.max(1, p - 1))} disabled={tablePage <= 1} className="p-2 border rounded-lg disabled:opacity-50" aria-label="Previous page">
                                    <MdChevronLeft className="w-5 h-5" />
                                </button>
                                <span className="text-sm text-[var(--text-muted)]">Page {tablePage} of {totalPages}</span>
                                <button type="button" onClick={() => setTablePage((p) => Math.min(totalPages, p + 1))} disabled={tablePage >= totalPages} className="p-2 border rounded-lg disabled:opacity-50" aria-label="Next page">
                                    <MdChevronRight className="w-5 h-5" />
                                </button>
                            </div>
                        )}
                    </>
                )}
            </section>

            {/* ─── Add User Modal ─── */}
            {showAddModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" aria-modal="true" role="dialog" aria-labelledby="add-user-title">
                    <div className="card-elevated max-w-md w-full shadow-2xl rounded-2xl border-0 overflow-hidden">
                        <div className="p-6 border-b border-[var(--border-light)] flex items-center justify-between bg-[var(--surface)]">
                            <h2 id="add-user-title" className="text-lg font-semibold text-[var(--text)]">
                                {createdUser ? 'User Created' : showConfirmAdd ? 'Confirm New User' : 'Add New User'}
                            </h2>
                            <button type="button" onClick={closeAddModal} className="p-2 text-[var(--text-muted)] hover:bg-[var(--background-subtle)] rounded-lg transition-colors" aria-label="Close">
                                <MdClose className="w-5 h-5" />
                            </button>
                        </div>

                        {/* ── Step 3: Success + show password ── */}
                        {createdUser ? (
                            <div className="p-6 space-y-5">
                                <div className="flex items-start gap-3 p-4 bg-green-50 border border-green-200 rounded-xl">
                                    <MdCheckCircle className="w-5 h-5 text-green-600 mt-0.5 shrink-0" />
                                    <div>
                                        <p className="text-sm font-semibold text-green-800">Account created successfully!</p>
                                        <p className="text-sm text-green-700 mt-0.5">Share the temporary password with <strong>{createdUser.username}</strong>. They will be required to change it on first login.</p>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-[var(--text)] mb-1">Temporary Password</label>
                                    <div className="flex items-center gap-2">
                                        <div className="flex-1 relative">
                                            <input
                                                type={showPassword ? 'text' : 'password'}
                                                readOnly
                                                value={createdUser.temporary_password}
                                                className="input-field w-full pr-10 font-mono tracking-widest select-all"
                                            />
                                            <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text)]">
                                                {showPassword ? <MdVisibilityOff className="w-4 h-4" /> : <MdVisibility className="w-4 h-4" />}
                                            </button>
                                        </div>
                                        <button type="button" onClick={handleCopyPassword} className={`btn-secondary inline-flex items-center gap-1.5 py-2.5 px-3 shrink-0 ${copied ? 'text-green-600 border-green-400' : ''}`}>
                                            {copied ? <MdCheck className="w-4 h-4" /> : <MdContentCopy className="w-4 h-4" />}
                                            {copied ? 'Copied' : 'Copy'}
                                        </button>
                                    </div>
                                </div>
                                <div className="flex justify-end pt-1">
                                    <button type="button" onClick={closeAddModal} className="btn-primary py-2.5 px-6">Done</button>
                                </div>
                            </div>
                        ) : showConfirmAdd ? (
                            /* ── Step 2: Confirm ── */
                            <div className="p-6 space-y-5">
                                <p className="text-sm text-[var(--text-muted)]">Please confirm the details for the new user:</p>
                                <dl className="space-y-2 text-sm">
                                    {[
                                        ['Email', addForm.username],
                                        ['Full Name', addForm.fullName],
                                        ['Position', addForm.position],
                                        ['Department', addForm.office],
                                        ['Role', addForm.role],
                                    ].map(([label, val]) => (
                                        <div key={label} className="flex gap-3">
                                            <dt className="w-28 shrink-0 font-medium text-[var(--text)]">{label}</dt>
                                            <dd className="text-[var(--text-muted)] break-all">{val}</dd>
                                        </div>
                                    ))}
                                </dl>
                                <p className="text-xs text-[var(--text-muted)] bg-[var(--background-subtle)] rounded-lg p-3">
                                    A temporary password will be generated. The user must change it upon first login.
                                </p>
                                {addError && (
                                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm" role="alert">{addError}</div>
                                )}
                                <div className="flex gap-3 justify-end pt-1">
                                    <button type="button" onClick={() => setShowConfirmAdd(false)} className="btn-secondary" disabled={submitting}>Back</button>
                                    <button type="button" onClick={confirmAddUser} className="btn-primary" disabled={submitting}>
                                        {submitting ? 'Creating…' : 'Create User'}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            /* ── Step 1: Form ── */
                            <form onSubmit={handleAddUserSubmit} className="p-6 space-y-4" noValidate>
                                {addError && (
                                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm" role="alert">{addError}</div>
                                )}

                                {/* Email */}
                                <div>
                                    <label htmlFor="add-email" className="block text-sm font-medium text-[var(--text)] mb-1">Email <span className="text-red-500">*</span></label>
                                    <input
                                        id="add-email"
                                        type="email"
                                        value={addForm.username}
                                        onChange={(e) => setAddForm(f => ({ ...f, username: e.target.value }))}
                                        onBlur={() => setAddTouched(t => ({ ...t, username: true }))}
                                        className={fieldCls(addTouched.username, addErrs.username)}
                                        placeholder="user@dilg.gov.ph"
                                        autoComplete="off"
                                        disabled={submitting}
                                    />
                                    {addTouched.username && addErrs.username && (
                                        <p className="text-xs text-red-600 mt-1">{addErrs.username}</p>
                                    )}
                                    <p className="text-xs text-[var(--text-muted)] mt-0.5">A temporary password will be generated. The user must change it on first login.</p>
                                </div>

                                {/* Full Name */}
                                <div>
                                    <label htmlFor="add-fullName" className="block text-sm font-medium text-[var(--text)] mb-1">Full Name <span className="text-red-500">*</span></label>
                                    <input
                                        id="add-fullName"
                                        type="text"
                                        value={addForm.fullName}
                                        onChange={(e) => setAddForm(f => ({ ...f, fullName: e.target.value }))}
                                        onBlur={() => setAddTouched(t => ({ ...t, fullName: true }))}
                                        className={fieldCls(addTouched.fullName, addErrs.fullName)}
                                        placeholder="e.g. Juan Dela Cruz"
                                        disabled={submitting}
                                    />
                                    {addTouched.fullName && addErrs.fullName && (
                                        <p className="text-xs text-red-600 mt-1">{addErrs.fullName}</p>
                                    )}
                                </div>

                                {/* Position */}
                                <div>
                                    <label htmlFor="add-position" className="block text-sm font-medium text-[var(--text)] mb-1">Position / Designation <span className="text-red-500">*</span></label>
                                    <select
                                        id="add-position"
                                        value={addForm.position}
                                        onChange={(e) => setAddForm(f => ({ ...f, position: e.target.value }))}
                                        onBlur={() => setAddTouched(t => ({ ...t, position: true }))}
                                        className={fieldCls(addTouched.position, addErrs.position)}
                                        disabled={submitting}
                                    >
                                        <option value="">Select Position</option>
                                        <option value="BAC Chairperson">BAC Chairperson</option>
                                        <option value="BAC Secretariat">BAC Secretariat</option>
                                        <option value="BAC Member">BAC Member</option>
                                    </select>
                                    {addTouched.position && addErrs.position && (
                                        <p className="text-xs text-red-600 mt-1">{addErrs.position}</p>
                                    )}
                                </div>

                                {/* Department */}
                                <div>
                                    <label htmlFor="add-office" className="block text-sm font-medium text-[var(--text)] mb-1">Department <span className="text-red-500">*</span></label>
                                    <input
                                        id="add-office"
                                        type="text"
                                        value={addForm.office}
                                        onChange={(e) => setAddForm(f => ({ ...f, office: e.target.value }))}
                                        onBlur={() => setAddTouched(t => ({ ...t, office: true }))}
                                        className={fieldCls(addTouched.office, addErrs.office)}
                                        placeholder="Enter Department"
                                        disabled={submitting}
                                    />
                                    {addTouched.office && addErrs.office && (
                                        <p className="text-xs text-red-600 mt-1">{addErrs.office}</p>
                                    )}
                                </div>

                                {/* Role */}
                                <div>
                                    <label htmlFor="add-role" className="block text-sm font-medium text-[var(--text)] mb-1">Role <span className="text-red-500">*</span></label>
                                    <select
                                        id="add-role"
                                        value={addForm.role}
                                        onChange={(e) => setAddForm(f => ({ ...f, role: e.target.value }))}
                                        onBlur={() => setAddTouched(t => ({ ...t, role: true }))}
                                        className={fieldCls(addTouched.role, addErrs.role)}
                                        disabled={submitting}
                                    >
                                        <option value="">Select Role</option>
                                        {getAvailableRoles(user?.role).map((role) => (
                                            <option key={role.value} value={role.value}>{role.label}</option>
                                        ))}
                                    </select>
                                    {addTouched.role && addErrs.role && (
                                        <p className="text-xs text-red-600 mt-1">{addErrs.role}</p>
                                    )}
                                </div>

                                <div className="flex gap-3 justify-end pt-2">
                                    <button type="button" onClick={closeAddModal} className="btn-secondary" disabled={submitting}>Cancel</button>
                                    <button type="submit" className="btn-primary" disabled={submitting}>Review & Add</button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            )}

            {/* ─── Confirm Edit dialog ─── */}
            {showConfirmEdit && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" aria-modal="true" role="alertdialog" aria-labelledby="confirm-edit-title">
                    <div className="card-elevated max-w-sm w-full p-6 rounded-2xl border-0 shadow-2xl">
                        <h2 id="confirm-edit-title" className="text-lg font-semibold text-[var(--text)] mb-2">Confirm Update User</h2>
                        <p className="text-sm text-[var(--text-muted)] mb-6">
                            Save changes to user <strong className="text-[var(--text)]">{editingUser?.username}</strong>?
                        </p>
                        <div className="flex gap-3 justify-end">
                            <button type="button" onClick={() => setShowConfirmEdit(false)} className="btn-secondary">Cancel</button>
                            <button type="button" onClick={confirmEditUser} className="btn-primary" disabled={submitting}>
                                {submitting ? 'Updating…' : 'Confirm'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ─── Edit User modal ─── */}
            {editingUser && !showConfirmEdit && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" aria-modal="true" role="dialog" aria-labelledby="edit-user-title">
                    <div className="card-elevated max-w-md w-full shadow-2xl rounded-2xl border-0 overflow-hidden">
                        <div className="p-6 border-b border-[var(--border-light)] flex items-center justify-between bg-[var(--surface)]">
                            <h2 id="edit-user-title" className="text-lg font-semibold text-[var(--text)]">Edit User</h2>
                            <button type="button" onClick={closeEditModal} className="p-2 text-[var(--text-muted)] hover:bg-[var(--background-subtle)] rounded-lg transition-colors" aria-label="Close">
                                <MdClose className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
                            {editError && (
                                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm" role="alert">{editError}</div>
                            )}
                            <div>
                                <label htmlFor="edit-email" className="block text-sm font-medium text-[var(--text)] mb-1">Email</label>
                                <input id="edit-email" type="email" value={editingUser.username} className="input-field w-full bg-[var(--background-subtle)] opacity-70" disabled />
                            </div>
                            <div>
                                <label htmlFor="edit-fullName" className="block text-sm font-medium text-[var(--text)] mb-1">Full Name</label>
                                <input id="edit-fullName" type="text" value={editForm.fullName} onChange={(e) => setEditForm(f => ({ ...f, fullName: e.target.value }))} className="input-field w-full" placeholder="Display name" disabled={submitting} />
                            </div>
                            <div>
                                <label htmlFor="edit-position" className="block text-sm font-medium text-[var(--text)] mb-1">Position / Designation</label>
                                <select id="edit-position" value={editForm.position} onChange={(e) => setEditForm(f => ({ ...f, position: e.target.value }))} className="input-field w-full" disabled={submitting}>
                                    <option value="">Select Position</option>
                                    <option value="BAC Chairperson">BAC Chairperson</option>
                                    <option value="BAC Secretariat">BAC Secretariat</option>
                                    <option value="BAC Member">BAC Member</option>
                                </select>
                            </div>
                            <div>
                                <label htmlFor="edit-office" className="block text-sm font-medium text-[var(--text)] mb-1">Department</label>
                                <input id="edit-office" type="text" value={editForm.office} onChange={(e) => setEditForm(f => ({ ...f, office: e.target.value }))} className="input-field w-full" placeholder="Enter Department" disabled={submitting} />
                            </div>
                            <div>
                                <label htmlFor="edit-role" className="block text-sm font-medium text-[var(--text)] mb-1">Role</label>
                                <select id="edit-role" value={editForm.role} onChange={(e) => setEditForm(f => ({ ...f, role: e.target.value }))} className="input-field w-full" disabled={submitting}>
                                    <option value="">Select Role</option>
                                    {getAvailableRoles(user?.role).map((role) => (
                                        <option key={role.value} value={role.value}>{role.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex items-center gap-4 pt-1">
                                <label htmlFor="edit-status" className="text-sm font-medium text-[var(--text)] shrink-0">Status</label>
                                <div className="flex items-center gap-3">
                                    <button
                                        type="button"
                                        role="switch"
                                        aria-checked={editForm.is_active}
                                        id="edit-status"
                                        onClick={() => setEditForm(f => ({ ...f, is_active: !f.is_active }))}
                                        disabled={submitting}
                                        className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${editForm.is_active ? 'bg-green-600' : 'bg-slate-300'}`}
                                    >
                                        <span className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${editForm.is_active ? 'translate-x-5' : 'translate-x-1'}`} />
                                    </button>
                                    <span className="text-sm text-[var(--text-muted)]">{editForm.is_active ? 'Active' : 'Inactive'}</span>
                                </div>
                            </div>
                            <div className="flex gap-3 justify-end pt-2">
                                <button type="button" onClick={closeEditModal} className="btn-secondary" disabled={submitting}>Cancel</button>
                                <button type="submit" className="btn-primary" disabled={submitting}>
                                    {submitting ? 'Updating…' : 'Update User'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Personnel;
