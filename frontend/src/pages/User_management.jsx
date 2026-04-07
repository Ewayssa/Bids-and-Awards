import React, { useState, useEffect } from 'react';
import { userService } from '../services/api';
import { MdPersonAdd, MdClose, MdCheckCircle, MdPeople, MdSearch, MdChevronLeft, MdChevronRight } from 'react-icons/md';
import { IoCreateOutline } from 'react-icons/io5';
import PageHeader from '../components/PageHeader';
import { ROLES, getRoleDisplayName, getAvailableRoles, hasPermission, PERMISSIONS } from '../utils/roles';

const TABLE_PAGE_SIZE = 10;

const Personnel = ({ user }) => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [addForm, setAddForm] = useState({ username: '', fullName: '', position: '', office: '', role: '' });
    const [addError, setAddError] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [showConfirmAdd, setShowConfirmAdd] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [editingUser, setEditingUser] = useState(null);
    const [editForm, setEditForm] = useState({ fullName: '', position: '', office: '', role: '', is_active: true });
    const [searchQuery, setSearchQuery] = useState('');
    const [tablePage, setTablePage] = useState(1);

    const loadUsers = async () => {
        try {
            const data = await userService.getAll();
            setUsers(Array.isArray(data) ? data : []);
        } catch (e) {
            setUsers([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadUsers();
    }, []);

    const openAddModal = () => {
        setAddForm({ username: '', fullName: '', position: '', office: '', role: '' });
        setAddError('');
        setShowAddModal(true);
    };

    const openEditModal = (u) => {
        setEditingUser(u);
        setEditForm({ fullName: u.fullName || '', position: u.position || '', office: u.office || '', role: u.role || ROLES.EMPLOYEE, is_active: u.is_active !== false });
        setAddError('');
    };

    const closeEditModal = () => {
        setEditingUser(null);
        setEditForm({ fullName: '', position: '', office: '', role: '', is_active: true });
        setAddError('');
        setSubmitting(false);
    };

    const closeAddModal = () => {
        setShowAddModal(false);
        setShowConfirmAdd(false);
        setAddError('');
        setSubmitting(false);
    };

    const handleAddUserSubmit = async (e) => {
        e.preventDefault();
        setAddError('');
        const { username, fullName, position, office, role } = addForm;
        if (!username.trim()) {
            setAddError('Email is required.');
            return;
        }
        if (!username.includes('@')) {
            setAddError('Email must contain @.');
            return;
        }
        if (!fullName.trim()) {
            setAddError('Full Name is required.');
            return;
        }
        if (!position.trim()) {
            setAddError('Position / Designation is required.');
            return;
        }
        if (!office.trim()) {
            setAddError('Department is required.');
            return;
        }
        if (!role || !String(role).trim()) {
            setAddError('Role is required.');
            return;
        }
        setShowConfirmAdd(true);
    };

    const confirmAddUser = async () => {
        const { username, fullName, position, office, role } = addForm;
        setSubmitting(true);
        setShowConfirmAdd(false);
        try {
            await userService.create({
                username: username.trim(),
                fullName: fullName.trim() || undefined,
                position: position.trim() || undefined,
                office: office.trim() || undefined,
                role,
                created_by: (user?.username || user?.fullName || 'System').trim(),
            });
            closeAddModal();
            setSuccessMessage('User added successfully.');
            setLoading(true);
            await loadUsers();
        } catch (err) {
            setShowAddModal(true);
            const d = err.response?.data;
            let msg = err.message || 'Failed to add user.';
            if (d) {
                if (typeof d.detail === 'string') msg = d.detail;
                else if (d.username?.[0]) msg = d.username[0];
                else if (d.password?.[0]) msg = d.password[0];
                else if (d.non_field_errors?.[0]) msg = d.non_field_errors[0];
                else if (typeof d === 'object' && Object.keys(d).length) msg = Object.entries(d).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(' ') : v}`).join('; ');
            }
            setAddError(typeof msg === 'string' ? msg : JSON.stringify(msg));
        } finally {
            setSubmitting(false);
        }
    };

    useEffect(() => {
        if (!successMessage) return;
        const t = setTimeout(() => setSuccessMessage(''), 4000);
        return () => clearTimeout(t);
    }, [successMessage]);

    const filteredUsers = React.useMemo(() => {
        if (!searchQuery.trim()) return users;
        const q = searchQuery.trim().toLowerCase();
        return users.filter((u) => {
            const fullName = (u.fullName || '').toLowerCase();
            const username = (u.username || '').toLowerCase();
            const position = (u.position || '').toLowerCase();
            const office = (u.office || '').toLowerCase();
            const roleDisplay = getRoleDisplayName(u.role).toLowerCase();
            const status = (u.is_active !== false ? 'active' : 'inactive');
            return fullName.includes(q) || username.includes(q) || position.includes(q) || office.includes(q) || roleDisplay.includes(q) || status.includes(q);
        });
    }, [users, searchQuery]);

    const totalPages = Math.max(1, Math.ceil(filteredUsers.length / TABLE_PAGE_SIZE));
    const paginatedUsers = React.useMemo(() => {
        const start = (tablePage - 1) * TABLE_PAGE_SIZE;
        return filteredUsers.slice(start, start + TABLE_PAGE_SIZE);
    }, [filteredUsers, tablePage]);

    useEffect(() => {
        setTablePage(1);
    }, [filteredUsers.length]);

    const handleEditSubmit = async (e) => {
        e.preventDefault();
        setAddError('');
        if (!editingUser) return;
        
        setSubmitting(true);
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
                else if (typeof d === 'object' && Object.keys(d).length) {
                    msg = Object.entries(d).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(' ') : v}`).join('; ');
                }
            }
            setAddError(typeof msg === 'string' ? msg : JSON.stringify(msg));
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="space-y-5">
            <PageHeader
                title="User Management"
                subtitle="Create and manage user accounts, assign roles and permissions."
            />

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
                        <button type="button" onClick={openAddModal} className="inline-flex items-center gap-2 w-fit rounded-xl shrink-0 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white font-semibold py-2.5 px-5 shadow-sm hover:shadow-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:ring-offset-2">
                            <MdPersonAdd className="w-5 h-5" /> Add User
                        </button>
                        )}
                    </div>
                    <div className="relative w-full max-w-none mt-3 pt-3 border-t border-[var(--border-light)]">
                        <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)]" aria-hidden />
                        <input
                            type="search"
                            placeholder="Search users..."
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
                                                    className="inline-flex items-center justify-center p-2 rounded-lg transition-all duration-300 ease-out text-[var(--text-muted)] hover:bg-[var(--background-subtle)] hover:text-[var(--text)]"
                                                    title="Edit user"
                                                >
                                                    <IoCreateOutline className="w-5 h-5" />
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
                            <button
                                type="button"
                                onClick={() => setTablePage((p) => Math.max(1, p - 1))}
                                disabled={tablePage <= 1}
                                className="p-2 rounded-lg border border-[var(--border)] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[var(--background-subtle)]"
                                aria-label="Previous page"
                            >
                                <MdChevronLeft className="w-5 h-5" />
                            </button>
                            <span className="text-sm text-[var(--text-muted)]">
                                Page {tablePage} of {totalPages}
                            </span>
                            <button
                                type="button"
                                onClick={() => setTablePage((p) => Math.min(totalPages, p + 1))}
                                disabled={tablePage >= totalPages}
                                className="p-2 rounded-lg border border-[var(--border)] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[var(--background-subtle)]"
                                aria-label="Next page"
                            >
                                <MdChevronRight className="w-5 h-5" />
                            </button>
                        </div>
                    )}
                    </>
                )}
            </section>

            {/* Add User modal (admin only) */}
            {showAddModal && !showConfirmAdd && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
                    aria-modal="true"
                    role="dialog"
                    aria-labelledby="add-user-title"
                >
                    <div className="card-elevated max-w-lg w-full shadow-2xl rounded-2xl border-0 overflow-hidden">
                        <div className="p-5 border-b border-[var(--border-light)] flex items-center justify-between bg-[var(--surface)]">
                            <h2 id="add-user-title" className="text-lg font-semibold text-[var(--text)]">Add New User</h2>
                            <button
                                type="button"
                                onClick={closeAddModal}
                                className="p-2 text-[var(--text-muted)] hover:bg-[var(--background-subtle)] rounded-lg transition-all duration-300 ease-out hover:scale-110 active:scale-95"
                                aria-label="Close"
                            >
                                <MdClose className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleAddUserSubmit} className="p-5 space-y-3">
                            {addError && (
                                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm shadow-sm transition-all duration-300 ease-out" role="alert">
                                    {addError}
                                </div>
                            )}
                            <div>
                                <label htmlFor="add-email" className="block text-sm font-medium text-[var(--text)] mb-1">Email *</label>
                                <input
                                    id="add-email"
                                    type="email"
                                    value={addForm.username}
                                    onChange={(e) => setAddForm((f) => ({ ...f, username: e.target.value }))}
                                    className="input-field w-full"
                                    placeholder="user@example.com"
                                    autoComplete="email"
                                    disabled={submitting}
                                />
                                <p className="text-xs text-[var(--text-muted)] mt-0.5">Default password is <strong>password</strong>. The new user must change it on first login.</p>
                            </div>
                            <div>
                                <label htmlFor="add-fullName" className="block text-sm font-medium text-[var(--text)] mb-1">Full Name *</label>
                                <input
                                    id="add-fullName"
                                    type="text"
                                    value={addForm.fullName}
                                    onChange={(e) => setAddForm((f) => ({ ...f, fullName: e.target.value }))}
                                    className="input-field w-full"
                                    placeholder="Display name"
                                    disabled={submitting}
                                    required
                                />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div>
                                    <label htmlFor="add-position" className="block text-sm font-medium text-[var(--text)] mb-1">Position / Designation *</label>
                                    <input
                                        id="add-position"
                                        type="text"
                                        value={addForm.position}
                                        onChange={(e) => setAddForm((f) => ({ ...f, position: e.target.value }))}
                                        className="input-field w-full"
                                        placeholder="e.g. BAC Member"
                                        disabled={submitting}
                                        required
                                    />
                                </div>
                                <div>
                                    <label htmlFor="add-office" className="block text-sm font-medium text-[var(--text)] mb-1">Department *</label>
                                    <input
                                        id="add-office"
                                        type="text"
                                        value={addForm.office}
                                        onChange={(e) => setAddForm((f) => ({ ...f, office: e.target.value }))}
                                        className="input-field w-full"
                                        placeholder="e.g. Procurement"
                                        disabled={submitting}
                                        required
                                    />
                                </div>
                            </div>
                            <div>
                                <label htmlFor="add-role" className="block text-sm font-medium text-[var(--text)] mb-1">Role *</label>
                                <select
                                    id="add-role"
                                    value={addForm.role}
                                    onChange={(e) => setAddForm((f) => ({ ...f, role: e.target.value }))}
                                    className="input-field w-full"
                                    disabled={submitting}
                                >
                                    <option value="">Select</option>
                                    {getAvailableRoles(user?.role).map((role) => (
                                        <option key={role.value} value={role.value}>
                                            {role.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={closeAddModal} className="btn-secondary flex-1 rounded-xl" disabled={submitting}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn-primary flex-1 rounded-xl" disabled={submitting}>
                                    {submitting ? 'Adding…' : 'Add User'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Confirm Add User dialog */}
            {showConfirmAdd && (
                <div
                    className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
                    aria-modal="true"
                    role="alertdialog"
                    aria-labelledby="confirm-add-title"
                >
                    <div className="card-elevated max-w-sm w-full p-6 rounded-2xl border-0 shadow-2xl">
                        <h2 id="confirm-add-title" className="text-lg font-semibold text-[var(--text)] mb-2">Confirm Add User</h2>
                        <p className="text-sm text-[var(--text-muted)] mb-6">
                            Are you sure you want to add user? <strong className="text-[var(--text)]">{addForm.username}</strong>?
                        </p>
                        <div className="flex gap-3">
                            <button type="button" onClick={() => setShowConfirmAdd(false)} className="btn-secondary flex-1 rounded-xl">
                                Cancel
                            </button>
                            <button type="button" onClick={confirmAddUser} className="btn-primary flex-1 rounded-xl" disabled={submitting}>
                                {submitting ? 'Adding…' : 'Confirm'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit User modal */}
            {editingUser && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
                    aria-modal="true"
                    role="dialog"
                    aria-labelledby="edit-user-title"
                >
                    <div className="card-elevated max-w-lg w-full shadow-2xl rounded-2xl border-0 overflow-hidden">
                        <div className="p-6 border-b border-[var(--border-light)] flex items-center justify-between bg-[var(--surface)]">
                            <h2 id="edit-user-title" className="text-lg font-semibold text-[var(--text)]">Edit User</h2>
                            <button
                                type="button"
                                onClick={closeEditModal}
                                className="p-2 text-[var(--text-muted)] hover:bg-[var(--background-subtle)] rounded-lg transition-colors"
                                aria-label="Close"
                            >
                                <MdClose className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleEditSubmit} className="p-5 space-y-4">
                            {addError && (
                                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm shadow-sm transition-all duration-300 ease-out" role="alert">
                                    {addError}
                                </div>
                            )}
                            <div>
                                <label htmlFor="edit-email" className="block text-sm font-medium text-[var(--text)] mb-1">Email</label>
                                <input
                                    id="edit-email"
                                    type="email"
                                    value={editingUser.username}
                                    className="input-field w-full bg-[var(--background-subtle)]"
                                    disabled
                                />
                            </div>
                            <div>
                                <label htmlFor="edit-fullName" className="block text-sm font-medium text-[var(--text)] mb-1">Full Name</label>
                                <input
                                    id="edit-fullName"
                                    type="text"
                                    value={editForm.fullName}
                                    onChange={(e) => setEditForm((f) => ({ ...f, fullName: e.target.value }))}
                                    className="input-field w-full"
                                    placeholder="Display name (optional)"
                                    disabled={submitting}
                                />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div>
                                    <label htmlFor="edit-position" className="block text-sm font-medium text-[var(--text)] mb-1">Position / Designation</label>
                                    <input
                                        id="edit-position"
                                        type="text"
                                        value={editForm.position}
                                        onChange={(e) => setEditForm((f) => ({ ...f, position: e.target.value }))}
                                        className="input-field w-full"
                                        placeholder="e.g. BAC Member"
                                        disabled={submitting}
                                    />
                                </div>
                                <div>
                                    <label htmlFor="edit-office" className="block text-sm font-medium text-[var(--text)] mb-1">Department</label>
                                    <input
                                        id="edit-office"
                                        type="text"
                                        value={editForm.office}
                                        onChange={(e) => setEditForm((f) => ({ ...f, office: e.target.value }))}
                                        className="input-field w-full"
                                        placeholder="e.g. Procurement"
                                        disabled={submitting}
                                    />
                                </div>
                            </div>
                            <div>
                                <label htmlFor="edit-role" className="block text-sm font-medium text-[var(--text)] mb-1">Role</label>
                                <select
                                    id="edit-role"
                                    value={editForm.role}
                                    onChange={(e) => setEditForm((f) => ({ ...f, role: e.target.value }))}
                                    className="input-field w-full"
                                    disabled={submitting}
                                >
                                    <option value="">Select</option>
                                    {getAvailableRoles(user?.role).map((role) => (
                                        <option key={role.value} value={role.value}>
                                            {role.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex items-center justify-between pt-1">
                                <label htmlFor="edit-status" className="text-sm font-medium text-[var(--text)]">Status</label>
                                <div className="flex items-center gap-3">
                                    <span className="text-sm text-[var(--text-muted)]">{editForm.is_active ? 'Active' : 'Inactive'}</span>
                                    <button
                                        type="button"
                                        role="switch"
                                        aria-checked={editForm.is_active}
                                        id="edit-status"
                                        onClick={() => setEditForm((f) => ({ ...f, is_active: !f.is_active }))}
                                        disabled={submitting}
                                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${editForm.is_active ? 'bg-green-600' : 'bg-slate-300'}`}
                                    >
                                        <span
                                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${editForm.is_active ? 'translate-x-5' : 'translate-x-0.5'}`}
                                        />
                                    </button>
                                </div>
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={closeEditModal} className="btn-secondary flex-1 rounded-xl" disabled={submitting}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn-primary flex-1 rounded-xl" disabled={submitting}>
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
