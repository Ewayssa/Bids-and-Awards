import React, { useState, useEffect, useCallback } from 'react';
import { userService } from '../../services/api';
import { MdPersonAdd, MdClose, MdCheckCircle, MdSearch, MdChevronLeft, MdChevronRight, MdVisibility, MdVisibilityOff, MdContentCopy, MdCheck } from 'react-icons/md';
import PageHeader from '../../components/PageHeader';
import Modal from '../../components/Modal';
import { ROLES, getRoleDisplayName, getAvailableRoles, hasPermission, PERMISSIONS } from '../../utils/auth';

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
            // Backend returns { count, results, ... } due to pagination
            const userList = Array.isArray(data) ? data : (data?.results || []);
            setUsers(userList);
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
        <div className="space-y-5 pb-8">
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
                            <button type="button" onClick={openAddModal} className="px-6 py-2.5 bg-emerald-600/90 hover:bg-emerald-700 text-white rounded-xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-emerald-500/20 backdrop-blur-md transition-all active:scale-95 flex items-center gap-2">
                                <MdPersonAdd className="w-5 h-5" /> Add user
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
                            <table className="min-w-full divide-y divide-slate-100 dark:divide-slate-800 w-full">
                                <thead className="bg-[#F8FAFC] dark:bg-slate-800/50 border-y border-slate-100 dark:border-slate-800">
                                    <tr>
                                        <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] whitespace-nowrap">Full Name / Identity</th>
                                        <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] whitespace-nowrap">Email Address</th>
                                        <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] whitespace-nowrap">Official Position</th>
                                        <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] whitespace-nowrap">Department / Office</th>
                                        <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-center whitespace-nowrap">Security Role</th>
                                        <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-center whitespace-nowrap">Status</th>
                                        {hasPermission(user?.role, PERMISSIONS.MANAGE_USERS) && <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right whitespace-nowrap pr-8">Actions</th>}
                                    </tr>
                                </thead>
                                <tbody className="bg-white dark:bg-slate-900 divide-y divide-slate-50 dark:divide-slate-800/50">
                                    {paginatedUsers.map((u) => (
                                        <tr key={u.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-all duration-300 ease-out group">
                                            <td className="px-6 py-5 align-middle">
                                                <div className="flex flex-col">
                                                    <span className="font-black text-slate-800 dark:text-slate-200 group-hover:text-[var(--primary)] transition-colors">{u.fullName || '—'}</span>
                                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Personnel Folder</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5 align-middle text-sm font-medium text-slate-500 dark:text-slate-400 tracking-tight">{u.username}</td>
                                            <td className="px-6 py-5 align-middle text-sm font-medium text-slate-500 dark:text-slate-400 tracking-tight">{u.position || '—'}</td>
                                            <td className="px-6 py-5 align-middle text-sm font-medium text-slate-500 dark:text-slate-400 tracking-tight">{u.office || '—'}</td>
                                            <td className="px-6 py-5 align-middle text-center">
                                                <span className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border shadow-sm ${
                                                    u.role === ROLES.ADMIN 
                                                        ? 'bg-emerald-100 text-emerald-600 border-emerald-200' 
                                                        : 'bg-blue-100 text-blue-600 border-blue-200'
                                                }`}>
                                                    {getRoleDisplayName(u.role)}
                                                </span>
                                            </td>
                                            <td className="px-6 py-5 align-middle text-center">
                                                <span className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border shadow-sm ${
                                                    u.is_active !== false 
                                                        ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                                                        : 'bg-slate-100 text-slate-500 border-slate-200'
                                                }`}>
                                                    {u.is_active !== false ? 'Active' : 'Inactive'}
                                                </span>
                                            </td>
                                            {hasPermission(user?.role, PERMISSIONS.MANAGE_USERS) && (
                                                <td className="px-6 py-5 align-middle text-right pr-8">
                                                    <button
                                                        type="button"
                                                        onClick={() => openEditModal(u)}
                                                        className="px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-[var(--primary)] hover:border-[var(--primary)] hover:text-white transition-all duration-300 shadow-sm opacity-60 group-hover:opacity-100 inline-flex items-center gap-2"
                                                        title="Modify User Credentials"
                                                    >
                                                        <MdEdit className="w-3.5 h-3.5" />
                                                        Manage
                                                    </button>
                                                </td>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        {filteredUsers.length > TABLE_PAGE_SIZE && (
                            <div className="pagination-nav">
                                <button type="button" onClick={() => setTablePage((p) => Math.max(1, p - 1))} disabled={tablePage <= 1} className="pagination-btn" aria-label="Previous page">
                                    <MdChevronLeft className="w-5 h-5" />
                                </button>
                                <span className="pagination-info">Page {tablePage} of {totalPages}</span>
                                <button type="button" onClick={() => setTablePage((p) => Math.min(totalPages, p + 1))} disabled={tablePage >= totalPages} className="pagination-btn" aria-label="Next page">
                                    <MdChevronRight className="w-5 h-5" />
                                </button>
                            </div>
                        )}
                    </>
                )}
            </section>

            {/* Add User Modal */}
            <Modal
                isOpen={showAddModal}
                onClose={closeAddModal}
                title={createdUser ? 'User Created' : showConfirmAdd ? 'Confirm New User' : 'Add New User'}
                size="md"
            >
                {createdUser ? (
                    <div className="space-y-5">
                        <div className="flex items-start gap-2.5 p-3 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-xl">
                            <MdCheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
                            <div>
                                <p className="text-xs font-bold text-emerald-800 dark:text-emerald-200 uppercase">Account Created!</p>
                                <p className="text-[11px] text-emerald-700 dark:text-emerald-300/80 mt-0.5">Share the temporary password with <strong>{createdUser.username}</strong>.</p>
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Temporary Password</label>
                            <div className="flex items-center gap-2">
                                <div className="flex-1 relative">
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        readOnly
                                        value={createdUser.temporary_password}
                                        className="input-field w-full pr-10 font-mono tracking-widest select-all h-10 text-sm rounded-xl"
                                    />
                                    <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                                        {showPassword ? <MdVisibilityOff className="w-3.5 h-3.5" /> : <MdVisibility className="w-3.5 h-3.5" />}
                                    </button>
                                </div>
                                <button type="button" onClick={handleCopyPassword} className={`h-10 px-4 inline-flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 text-slate-600 rounded-xl font-bold text-xs transition-colors shrink-0 ${copied ? 'text-emerald-600 bg-emerald-50 border-emerald-200' : ''}`}>
                                    {copied ? <MdCheck className="w-4 h-4" /> : <MdContentCopy className="w-4 h-4" />}
                                    {copied ? 'Copied' : 'Copy'}
                                </button>
                            </div>
                        </div>
                        <div className="flex justify-end pt-2">
                            <button type="button" onClick={closeAddModal} className="btn-primary py-2.5 px-8 rounded-xl font-bold">Done</button>
                        </div>
                    </div>
                ) : showConfirmAdd ? (
                    <div className="space-y-4">
                        <div className="bg-slate-50 dark:bg-slate-800/40 rounded-xl p-4 border border-slate-200 dark:border-slate-800/50 space-y-2.5">
                            {[
                                ['Email', addForm.username],
                                ['Name', addForm.fullName],
                                ['Position', addForm.position],
                                ['Dept', addForm.office],
                                ['Role', getRoleDisplayName(addForm.role)],
                            ].map(([label, val]) => (
                                <div key={label} className="flex gap-4 text-xs font-bold">
                                    <dt className="w-20 shrink-0 text-slate-400 uppercase text-[9px] tracking-widest pt-0.5">{label}</dt>
                                    <dd className="text-slate-700 dark:text-slate-300 break-all">{val}</dd>
                                </div>
                            ))}
                        </div>
                        <div className="flex gap-2 justify-end pt-2">
                            <button type="button" onClick={() => setShowConfirmAdd(false)} className="px-5 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-600 rounded-xl font-bold text-xs" disabled={submitting}>Back</button>
                            <button type="button" onClick={confirmAddUser} className="px-7 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-lg shadow-emerald-500/20" disabled={submitting}>
                                {submitting ? 'Creating…' : 'Add user'}
                            </button>
                        </div>
                    </div>
                ) : (
                    <form onSubmit={handleAddUserSubmit} className="space-y-5" noValidate>
                        {addError && (
                            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm font-medium" role="alert">{addError}</div>
                        )}

                        <div className="space-y-4">
                            <div>
                                <label htmlFor="add-email" className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1.5 ml-1">Email / Username <span className="text-red-500">*</span></label>
                                <input
                                    id="add-email"
                                    type="email"
                                    value={addForm.username}
                                    onChange={(e) => setAddForm(f => ({ ...f, username: e.target.value }))}
                                    onBlur={() => setAddTouched(t => ({ ...t, username: true }))}
                                    className={fieldCls(addTouched.username, addErrs.username)}
                                    placeholder="user@example.com"
                                    autoComplete="off"
                                    disabled={submitting}
                                />
                                {addTouched.username && addErrs.username && (
                                    <p className="text-[10px] font-bold text-red-600 mt-1 ml-1">{addErrs.username}</p>
                                )}
                            </div>

                            <div>
                                <label htmlFor="add-fullName" className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1.5 ml-1">Full Name <span className="text-red-500">*</span></label>
                                <input
                                    id="add-fullName"
                                    type="text"
                                    value={addForm.fullName}
                                    onChange={(e) => setAddForm(f => ({ ...f, fullName: e.target.value }))}
                                    onBlur={() => setAddTouched(t => ({ ...t, fullName: true }))}
                                    className={fieldCls(addTouched.fullName, addErrs.fullName)}
                                    placeholder="Enter full name"
                                    disabled={submitting}
                                />
                                {addTouched.fullName && addErrs.fullName && (
                                    <p className="text-[10px] font-bold text-red-600 mt-1 ml-1">{addErrs.fullName}</p>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="add-position" className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1.5 ml-1">Position <span className="text-red-500">*</span></label>
                                    <select
                                        id="add-position"
                                        value={addForm.position}
                                        onChange={(e) => setAddForm(f => ({ ...f, position: e.target.value }))}
                                        onBlur={() => setAddTouched(t => ({ ...t, position: true }))}
                                        className={fieldCls(addTouched.position, addErrs.position)}
                                        disabled={submitting}
                                    >
                                        <option value="">Select</option>
                                        <option value="BAC Chairperson">BAC Chairperson</option>
                                        <option value="BAC Secretariat">BAC Secretariat</option>
                                        <option value="BAC Member">BAC Member</option>
                                    </select>
                                    {addTouched.position && addErrs.position && (
                                        <p className="text-[10px] font-bold text-red-600 mt-1 ml-1">{addErrs.position}</p>
                                    )}
                                </div>
                                <div>
                                    <label htmlFor="add-role" className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1.5 ml-1">System Role <span className="text-red-500">*</span></label>
                                    <select
                                        id="add-role"
                                        value={addForm.role}
                                        onChange={(e) => setAddForm(f => ({ ...f, role: e.target.value }))}
                                        onBlur={() => setAddTouched(t => ({ ...t, role: true }))}
                                        className={fieldCls(addTouched.role, addErrs.role)}
                                        disabled={submitting}
                                    >
                                        <option value="">Select</option>
                                        {getAvailableRoles(user?.role).map((role) => (
                                            <option key={role.value} value={role.value}>{role.label}</option>
                                        ))}
                                    </select>
                                    {addTouched.role && addErrs.role && (
                                        <p className="text-[10px] font-bold text-red-600 mt-1 ml-1">{addErrs.role}</p>
                                    )}
                                </div>
                            </div>

                            <div>
                                <label htmlFor="add-office" className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1.5 ml-1">Department / Office <span className="text-red-500">*</span></label>
                                <input
                                    id="add-office"
                                    type="text"
                                    value={addForm.office}
                                    onChange={(e) => setAddForm(f => ({ ...f, office: e.target.value }))}
                                    onBlur={() => setAddTouched(t => ({ ...t, office: true }))}
                                    className={fieldCls(addTouched.office, addErrs.office)}
                                    placeholder="Enter department"
                                    disabled={submitting}
                                />
                                {addTouched.office && addErrs.office && (
                                    <p className="text-[10px] font-bold text-red-600 mt-1 ml-1">{addErrs.office}</p>
                                )}
                            </div>
                        </div>

                        <div className="flex gap-3 justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
                            <button type="button" onClick={closeAddModal} className="px-6 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-600 rounded-xl font-bold text-xs" disabled={submitting}>Cancel</button>
                            <button type="submit" className="px-10 py-3 bg-emerald-600/90 hover:bg-emerald-700 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl shadow-emerald-500/20 backdrop-blur-md transition-all active:scale-95 disabled:opacity-50" disabled={submitting}>Submit</button>
                        </div>
                    </form>
                )}
            </Modal>

            {/* Edit User Modal */}
            <Modal
                isOpen={editingUser !== null}
                onClose={closeEditModal}
                title={showConfirmEdit ? "Confirm Changes" : "Edit User Details"}
                size="md"
            >
                {showConfirmEdit ? (
                    <div className="space-y-5">
                        <div className="flex flex-col items-center text-center space-y-2 py-1">
                            <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                                <MdCheckCircle className="w-8 h-8" />
                            </div>
                            <div>
                                <h3 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight">Confirm Updates</h3>
                                <p className="text-[11px] font-bold text-slate-400 mt-0.5">
                                    Updating record for <strong>{editingUser?.username}</strong>
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-2 justify-center">
                            <button type="button" onClick={() => setShowConfirmEdit(false)} className="px-6 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-600 rounded-xl font-bold text-xs" disabled={submitting}>Back</button>
                            <button type="button" onClick={confirmEditUser} className="px-10 py-3 bg-emerald-600/90 hover:bg-emerald-700 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl shadow-emerald-500/20 backdrop-blur-md transition-all active:scale-95 disabled:opacity-50" disabled={submitting}>
                                {submitting ? 'Saving…' : 'Save Changes'}
                            </button>
                        </div>
                    </div>
                ) : (
                    <form onSubmit={handleEditSubmit} className="space-y-5">
                        {editError && (
                            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm font-medium" role="alert">{editError}</div>
                        )}
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1.5 ml-1">Email</label>
                                <input type="email" value={editingUser?.username || ''} className="input-field w-full bg-[var(--background-subtle)]/50 opacity-70 cursor-not-allowed" disabled />
                            </div>
                            <div>
                                <label htmlFor="edit-fullName" className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1.5 ml-1">Full Name</label>
                                <input id="edit-fullName" type="text" value={editForm.fullName} onChange={(e) => setEditForm(f => ({ ...f, fullName: e.target.value }))} className="input-field w-full" placeholder="Display name" disabled={submitting} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="edit-position" className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1.5 ml-1">Position</label>
                                    <select id="edit-position" value={editForm.position} onChange={(e) => setEditForm(f => ({ ...f, position: e.target.value }))} className="input-field w-full" disabled={submitting}>
                                        <option value="">Select</option>
                                        <option value="BAC Chairperson">BAC Chairperson</option>
                                        <option value="BAC Secretariat">BAC Secretariat</option>
                                        <option value="BAC Member">BAC Member</option>
                                    </select>
                                </div>
                                <div>
                                    <label htmlFor="edit-role" className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1.5 ml-1">Role</label>
                                    <select id="edit-role" value={editForm.role} onChange={(e) => setEditForm(f => ({ ...f, role: e.target.value }))} className="input-field w-full" disabled={submitting}>
                                        <option value="">Select Role</option>
                                        {getAvailableRoles(user?.role).map((role) => (
                                            <option key={role.value} value={role.value}>{role.label}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label htmlFor="edit-office" className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1.5 ml-1">Department</label>
                                <input id="edit-office" type="text" value={editForm.office} onChange={(e) => setEditForm(f => ({ ...f, office: e.target.value }))} className="input-field w-full" placeholder="Enter Department" disabled={submitting} />
                            </div>
                            <div className="flex items-center justify-between p-4 bg-[var(--background-subtle)]/30 rounded-2xl border border-[var(--border-light)]">
                                <div className="space-y-0.5">
                                    <label className="text-sm font-bold text-[var(--text)]">Account Status</label>
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">{editForm.is_active ? 'Currently Active' : 'Currently Inactive'}</p>
                                </div>
                                <button
                                    type="button"
                                    role="switch"
                                    aria-checked={editForm.is_active}
                                    onClick={() => setEditForm(f => ({ ...f, is_active: !f.is_active }))}
                                    disabled={submitting}
                                    className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${editForm.is_active ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'}`}
                                >
                                    <span className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${editForm.is_active ? 'translate-x-5' : 'translate-x-1'}`} />
                                </button>
                            </div>
                        </div>
                        <div className="flex gap-3 justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
                            <button type="button" onClick={closeEditModal} className="px-6 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-600 rounded-xl font-bold text-xs" disabled={submitting}>Cancel</button>
                            <button type="submit" className="px-10 py-3 bg-emerald-600/90 hover:bg-emerald-700 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl shadow-emerald-500/20 backdrop-blur-md transition-all active:scale-95 disabled:opacity-50" disabled={submitting}>
                                Update Account
                            </button>
                        </div>
                    </form>
                )}
            </Modal>
        </div>
    );
};

export default Personnel;
