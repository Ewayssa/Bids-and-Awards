import React, { useState, useEffect, useCallback } from 'react';
import { userService } from '../../services/api';
import { MdPersonAdd, MdCheckCircle, MdSearch, MdChevronLeft, MdChevronRight, MdVisibility, MdVisibilityOff, MdContentCopy, MdCheck, MdEdit } from 'react-icons/md';
import PageHeader from '../../components/PageHeader';
import Modal from '../../components/Modal';
import { ROLES, getRoleDisplayName, getAvailableRoles, hasPermission, PERMISSIONS } from '../../utils/auth';

const TABLE_PAGE_SIZE = 10;
const EMPTY_ADD_FORM = { username: '', fullName: '', office: '', role: '' };
const EMPTY_EDIT_FORM = { fullName: '', office: '', role: '', is_active: true };

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
        if (!form.office.trim()) errs.office = 'Department is required.';
        if (!form.role) errs.role = 'Role is required.';
        return errs;
    };

    const handleAddUserSubmit = (e) => {
        e.preventDefault();
        const all = { username: true, fullName: true, office: true, role: true };
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
        const { username, fullName, office, role } = addForm;
        
        let autoPosition = '';
        if (role === ROLES.SECRETARIAT) autoPosition = 'BAC Secretariat';
        else if (role === ROLES.MEMBER) autoPosition = 'BAC Member';
        else if (role === ROLES.SUPPLY) autoPosition = 'Supply Officer';
        
        setSubmitting(true);
        setShowConfirmAdd(false);
        try {
            const res = await userService.create({
                username: username.trim(),
                fullName: fullName.trim() || undefined,
                position: autoPosition,
                office: office.trim() || undefined,
                role: role,
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
            let msg = 'Failed to add user.';
            if (d) {
                if (typeof d.detail === 'string') msg = d.detail;
                else if (d.username?.[0]) msg = d.username[0];
                else if (d.non_field_errors?.[0]) msg = d.non_field_errors[0];
            }
            setAddError(msg);
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
        setEditForm({ 
            fullName: u.fullName || '', 
            office: u.office || '', 
            role: u.role || ROLES.USER, 
            is_active: u.is_active !== false 
        });
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

        let autoPosition = '';
        if (editForm.role === ROLES.SECRETARIAT) autoPosition = 'BAC Secretariat';
        else if (editForm.role === ROLES.MEMBER) autoPosition = 'BAC Member';
        else if (editForm.role === ROLES.SUPPLY) autoPosition = 'Supply Officer';

        setSubmitting(true);
        setShowConfirmEdit(false);
        try {
            await userService.patch(editingUser.id, {
                fullName: editForm.fullName.trim() || undefined,
                position: autoPosition,
                office: editForm.office.trim() || undefined,
                role: editForm.role,
                is_active: editForm.is_active,
                updated_by: (user?.username || user?.fullName || 'System').trim(),
            });
            closeEditModal();
            setSuccessMessage('User updated successfully.');
            await loadUsers();
        } catch (err) {
            setEditError('Failed to update user.');
        } finally {
            setSubmitting(false);
        }
    };

    // ---- Table ----
    const filteredUsers = React.useMemo(() => {
        if (!searchQuery.trim()) return users;
        const q = searchQuery.trim().toLowerCase();
        return users.filter((u) => {
            return [u.fullName, u.username, u.office, getRoleDisplayName(u.role)]
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
                    <div className="flex items-center gap-3 px-5 py-3 rounded-t-xl bg-green-50 border-b border-green-200 text-green-800 text-sm font-medium">
                        <MdCheckCircle className="w-5 h-5 flex-shrink-0 text-green-600" />
                        <span>{successMessage}</span>
                    </div>
                )}
                <div className="section-header">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div className="min-w-0 flex-1">
                            <h2 className="text-base sm:text-lg font-bold text-[var(--text)]">System Users</h2>
                            <p className="text-xs text-[var(--text-muted)]">All registered users and their roles</p>
                        </div>
                        {hasPermission(user?.role, PERMISSIONS.MANAGE_USERS) && (
                            <button type="button" onClick={openAddModal} className="px-6 py-2.5 bg-emerald-600/90 hover:bg-emerald-700 text-white rounded-xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-emerald-500/20 backdrop-blur-md flex items-center gap-2">
                                <MdPersonAdd className="w-5 h-5" /> Add user
                            </button>
                        )}
                    </div>
                    <div className="relative w-full mt-3 pt-3 border-t border-[var(--border-light)]">
                        <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)]" />
                        <input
                            type="search"
                            placeholder="Search users..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="input-field w-full pl-10 rounded-lg"
                        />
                    </div>
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-16 text-[var(--text-muted)]">
                        <div className="w-10 h-10 rounded-full border-2 border-[var(--border)] border-t-[var(--primary)] animate-spin mb-4" />
                        <p className="text-sm font-medium">Loading users…</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-100 dark:divide-slate-800">
                            <thead className="bg-[#F8FAFC] dark:bg-slate-800/50">
                                <tr>
                                    <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-left">Name</th>
                                    <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-left">Email</th>
                                    <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-left">Dept</th>
                                    <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Role</th>
                                    <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Status</th>
                                    {hasPermission(user?.role, PERMISSIONS.MANAGE_USERS) && <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>}
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-slate-900 divide-y divide-slate-50 dark:divide-slate-800/50">
                                {paginatedUsers.map((u) => (
                                    <tr key={u.id} className="hover:bg-slate-50/80 group transition-all">
                                        <td className="px-6 py-5 font-black text-slate-800 dark:text-slate-200">{u.fullName || '—'}</td>
                                        <td className="px-6 py-5 text-sm text-slate-500">{u.username}</td>
                                        <td className="px-6 py-5 text-sm text-slate-500">{u.office || '—'}</td>
                                        <td className="px-6 py-5 text-center">
                                            <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${u.role === ROLES.ADMIN ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'}`}>
                                                {getRoleDisplayName(u.role)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-5 text-center">
                                            <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${u.is_active !== false ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                                                {u.is_active !== false ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        {hasPermission(user?.role, PERMISSIONS.MANAGE_USERS) && (
                                            <td className="px-6 py-5 text-right">
                                                <button onClick={() => openEditModal(u)} className="p-2 text-slate-400 hover:text-[var(--primary)] transition-colors">
                                                    <MdEdit className="w-5 h-5" />
                                                </button>
                                            </td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>

            {/* Add User Modal */}
            <Modal isOpen={showAddModal} onClose={closeAddModal} title={createdUser ? 'User Created' : 'Add New User'} size="md">
                {createdUser ? (
                    <div className="space-y-4">
                        <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200">
                            <p className="text-xs font-bold text-emerald-800">Account Created!</p>
                            <p className="text-[11px] text-emerald-700 mt-1">Share the password with <strong>{createdUser.username}</strong>.</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <input type={showPassword ? 'text' : 'password'} readOnly value={createdUser.temporary_password} className="input-field flex-1 h-10 text-sm font-mono" />
                            <button onClick={() => setShowPassword(!showPassword)} className="p-2 text-slate-400 hover:text-slate-600">
                                {showPassword ? <MdVisibilityOff /> : <MdVisibility />}
                            </button>
                            <button onClick={handleCopyPassword} className={`px-4 py-2 rounded-xl text-xs font-bold ${copied ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-600'}`}>
                                {copied ? 'Copied' : 'Copy'}
                            </button>
                        </div>
                        <button onClick={closeAddModal} className="btn-primary w-full py-2.5">Done</button>
                    </div>
                ) : showConfirmAdd ? (
                    <div className="space-y-4">
                        <div className="bg-slate-50 p-4 rounded-xl space-y-2">
                            <p className="text-xs"><strong>Email:</strong> {addForm.username}</p>
                            <p className="text-xs"><strong>Name:</strong> {addForm.fullName}</p>
                            <p className="text-xs"><strong>Role:</strong> {getRoleDisplayName(addForm.role)}</p>
                        </div>
                        <div className="flex gap-2 justify-end">
                            <button onClick={() => setShowConfirmAdd(false)} className="px-6 py-2 bg-slate-100 rounded-xl text-xs font-bold">Back</button>
                            <button onClick={confirmAddUser} className="px-6 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold" disabled={submitting}>Confirm</button>
                        </div>
                    </div>
                ) : (
                    <form onSubmit={handleAddUserSubmit} className="space-y-4">
                        <div>
                            <label className="label-text">Email Address</label>
                            <input type="email" value={addForm.username} onChange={(e) => setAddForm({...addForm, username: e.target.value})} className={fieldCls(addTouched.username, addErrs.username)} />
                        </div>
                        <div>
                            <label className="label-text">Full Name</label>
                            <input type="text" value={addForm.fullName} onChange={(e) => setAddForm({...addForm, fullName: e.target.value})} className={fieldCls(addTouched.fullName, addErrs.fullName)} />
                        </div>
                        <div>
                            <label className="label-text">System Role</label>
                            <select value={addForm.role} onChange={(e) => setAddForm({...addForm, role: e.target.value})} className={fieldCls(addTouched.role, addErrs.role)}>
                                <option value="">Select Role</option>
                                {getAvailableRoles(user?.role).map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="label-text">Department / Office</label>
                            <input type="text" value={addForm.office} onChange={(e) => setAddForm({...addForm, office: e.target.value})} className={fieldCls(addTouched.office, addErrs.office)} />
                        </div>
                        <div className="flex gap-2 justify-end pt-4">
                            <button type="button" onClick={closeAddModal} className="px-6 py-2 bg-slate-100 rounded-xl text-xs font-bold">Cancel</button>
                            <button type="submit" className="px-6 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold" disabled={submitting}>Submit</button>
                        </div>
                    </form>
                )}
            </Modal>

            {/* Edit User Modal */}
            <Modal isOpen={editingUser !== null} onClose={closeEditModal} title={showConfirmEdit ? "Confirm Changes" : "Edit User"} size="md">
                {showConfirmEdit ? (
                    <div className="space-y-4 text-center">
                        <MdCheckCircle className="w-12 h-12 mx-auto text-emerald-500" />
                        <p className="text-sm">Save changes for <strong>{editingUser.username}</strong>?</p>
                        <div className="flex gap-2 justify-center">
                            <button onClick={() => setShowConfirmEdit(false)} className="px-6 py-2 bg-slate-100 rounded-xl text-xs font-bold">Back</button>
                            <button onClick={confirmEditUser} className="px-6 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold" disabled={submitting}>Save</button>
                        </div>
                    </div>
                ) : (
                    <form onSubmit={handleEditSubmit} className="space-y-4">
                        <div>
                            <label className="label-text">Email (Read-only)</label>
                            <input type="text" value={editingUser?.username || ''} className="input-field bg-slate-50 cursor-not-allowed" disabled />
                        </div>
                        <div>
                            <label className="label-text">Full Name</label>
                            <input type="text" value={editForm.fullName} onChange={(e) => setEditForm({...editForm, fullName: e.target.value})} className="input-field" />
                        </div>
                        <div>
                            <label className="label-text">System Role</label>
                            <select value={editForm.role} onChange={(e) => setEditForm({...editForm, role: e.target.value})} className="input-field">
                                {getAvailableRoles(user?.role).map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="label-text">Department</label>
                            <input type="text" value={editForm.office} onChange={(e) => setEditForm({...editForm, office: e.target.value})} className="input-field" />
                        </div>
                        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                            <span className="text-sm font-bold">Account Active</span>
                            <button type="button" onClick={() => setEditForm({...editForm, is_active: !editForm.is_active})} className={`relative w-12 h-6 rounded-full transition-colors ${editForm.is_active ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                                <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${editForm.is_active ? 'left-7' : 'left-1'}`} />
                            </button>
                        </div>
                        <div className="flex gap-2 justify-end pt-4">
                            <button type="button" onClick={closeEditModal} className="px-6 py-2 bg-slate-100 rounded-xl text-xs font-bold">Cancel</button>
                            <button type="submit" className="px-6 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold" disabled={submitting}>Update</button>
                        </div>
                    </form>
                )}
            </Modal>
        </div>
    );
};

export default Personnel;
