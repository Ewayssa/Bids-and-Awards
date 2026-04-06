import React, { useState } from 'react';
import { MdAdd, MdClose, MdEdit, MdEvent, MdDelete, MdInfo, MdCheckCircle, MdUpdate } from 'react-icons/md';
import { calendarEventService } from '../services/api';
import Modal from './Modal';

export const EventModals = ({ 
    eventModal, 
    setEventModal, 
    editEventModal, 
    setEditEventModal, 
    onRefresh 
}) => {
    const [eventTitle, setEventTitle] = useState('');
    const [eventSubmitting, setEventSubmitting] = useState(false);
    const [eventError, setEventError] = useState('');
    const [confirmAddEvent, setConfirmAddEvent] = useState(null);

    const [editEventTitle, setEditEventTitle] = useState('');
    const [editEventDate, setEditEventDate] = useState('');
    const [editEventSubmitting, setEditEventSubmitting] = useState(false);
    const [editEventError, setEditEventError] = useState('');
    const [confirmDeleteEvent, setConfirmDeleteEvent] = useState(null);
    const [deleteSubmitting, setDeleteSubmitting] = useState(false);

    // Initial value syncing when modal opens
    React.useEffect(() => {
        if (editEventModal?.ev) {
            setEditEventTitle(editEventModal.ev.title || '');
            setEditEventDate(editEventModal.ev.date || '');
            setEditEventError('');
        }
    }, [editEventModal]);

    const handleAddEvent = async () => {
        if (!eventModal?.date || !eventTitle.trim()) return;
        setEventSubmitting(true);
        setEventError('');
        try {
            await calendarEventService.create({
                title: eventTitle.trim(),
                date: eventModal.date,
            });
            onRefresh();
            setEventModal(null);
            setEventTitle('');
        } catch (err) {
            const data = err.response?.data;
            setEventError(data?.detail || 'Failed to add event.');
        } finally {
            setEventSubmitting(false);
            setConfirmAddEvent(null);
        }
    };

    const handleUpdateEvent = async () => {
        const ev = editEventModal?.ev;
        if (!ev?.id) return;
        if (!editEventTitle.trim() || !editEventDate.trim()) {
            setEditEventError('Event title and date are required.');
            return;
        }
        setEditEventSubmitting(true);
        setEditEventError('');
        try {
            await calendarEventService.update(ev.id, {
                title: editEventTitle.trim(),
                date: editEventDate.trim(),
            });
            onRefresh();
            setEditEventModal(null);
        } catch (err) {
            setEditEventError('Failed to update event.');
        } finally {
            setEditEventSubmitting(false);
        }
    };

    const handleDeleteEvent = async () => {
        const id = editEventModal?.ev?.id || confirmDeleteEvent?.ev?.id;
        if (!id) return;
        setDeleteSubmitting(true);
        try {
            await calendarEventService.delete(id);
            onRefresh();
            setConfirmDeleteEvent(null);
            setEditEventModal(null);
        } catch {
            // Error handling
        } finally {
            setDeleteSubmitting(false);
        }
    };

    return (
        <>
            {/* Add Event Modal */}
            <Modal
                isOpen={!!eventModal && !confirmAddEvent}
                onClose={() => setEventModal(null)}
                title="Add New Event"
                size="md"
            >
                <form onSubmit={(e) => { 
                    e.preventDefault(); 
                    if (!eventTitle.trim()) {
                        setEventError('Event title is required.');
                        return;
                    }
                    setEventError('');
                    setConfirmAddEvent(true); 
                }} className="space-y-6">
                    <div className="p-5 bg-blue-50 dark:bg-blue-500/5 rounded-3xl border border-blue-100 dark:border-blue-500/20 flex items-center gap-4">
                        <div className="p-3 bg-white dark:bg-slate-900 rounded-xl shadow-sm text-blue-600">
                            <MdEvent className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-0.5">Selected Date</p>
                            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">{eventModal?.date}</p>
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Event Title</label>
                        <input 
                            type="text" 
                            value={eventTitle} 
                            onChange={(e) => {
                                setEventTitle(e.target.value);
                                if (eventError) setEventError('');
                            }} 
                            placeholder="e.g. BAC Meeting"
                            className="input-field w-full h-12 px-4 dark:bg-slate-800 rounded-xl" 
                            required 
                            autoFocus 
                        />
                        {eventError && <p className="text-[10px] font-bold text-red-500 uppercase px-1">{eventError}</p>}
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={() => setEventModal(null)} className="flex-1 py-3.5 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-xl font-bold uppercase tracking-widest text-[10px] hover:bg-slate-200 transition-colors">
                            Cancel
                        </button>
                        <button type="submit" className="flex-1 py-3.5 bg-emerald-600/90 hover:bg-emerald-700 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-emerald-500/20 backdrop-blur-md transition-all active:scale-95 flex items-center justify-center gap-2">
                            <MdAdd className="w-4 h-4" /> Add
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Edit Event Modal */}
            <Modal
                isOpen={!!editEventModal?.ev && !confirmDeleteEvent}
                onClose={() => setEditEventModal(null)}
                title="Edit Event"
                size="md"
            >
                <div className="space-y-6">
                    <div className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Event Title</label>
                            <input 
                                type="text" 
                                value={editEventTitle} 
                                onChange={(e) => {
                                    setEditEventTitle(e.target.value);
                                    if (editEventError) setEditEventError('');
                                }} 
                                className="input-field w-full h-12 px-4 dark:bg-slate-800 rounded-xl" 
                                required 
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Event Date</label>
                            <input 
                                type="date" 
                                value={editEventDate} 
                                onChange={(e) => {
                                    setEditEventDate(e.target.value);
                                    if (editEventError) setEditEventError('');
                                }} 
                                className="input-field w-full h-12 px-4 dark:bg-slate-800 rounded-xl" 
                                required 
                            />
                        </div>
                    </div>

                    {editEventError && (
                        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 flex items-center gap-3 text-red-600">
                            <MdInfo className="w-5 h-5 shrink-0" />
                            <p className="text-[10px] font-black uppercase tracking-tight">{editEventError}</p>
                        </div>
                    )}

                    <div className="flex gap-3 pt-2">
                        <button 
                            type="button" 
                            onClick={() => setConfirmDeleteEvent({ ev: editEventModal.ev })} 
                            className="px-6 py-3.5 bg-red-50 dark:bg-red-500/10 text-red-600 rounded-xl font-bold uppercase tracking-widest text-[10px] hover:bg-red-100 transition-colors"
                        >
                            Delete
                        </button>
                        <button 
                            onClick={handleUpdateEvent} 
                            disabled={editEventSubmitting} 
                            className="flex-1 py-3.5 bg-emerald-600/90 hover:bg-emerald-700 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-emerald-500/20 backdrop-blur-md transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {editEventSubmitting ? <div className="w-3 h-3 rounded-full border-2 border-white/30 border-t-white animate-spin" /> : <MdUpdate className="w-4 h-4" />}
                            Save Changes
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Confirm Add Modal */}
            <Modal
                isOpen={!!confirmAddEvent}
                onClose={() => setConfirmAddEvent(null)}
                title="Confirm Action"
                size="md"
            >
                <div className="p-2 space-y-6">
                    <div className="flex items-center gap-4 p-5 bg-emerald-50 dark:bg-emerald-500/5 rounded-3xl border border-emerald-100 dark:border-emerald-500/20 text-emerald-600">
                        <MdCheckCircle className="w-10 h-10 shrink-0" />
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest mb-1">Entry Confirmation</p>
                            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Are you sure you want to add this event to the calendar?</p>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={() => setConfirmAddEvent(null)} className="flex-1 py-3.5 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-xl font-bold uppercase tracking-widest text-[10px]">Cancel</button>
                        <button onClick={handleAddEvent} className="flex-1 py-3.5 bg-emerald-600/90 hover:bg-emerald-700 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-emerald-500/20 backdrop-blur-md transition-all active:scale-95">Confirm</button>
                    </div>
                </div>
            </Modal>

            {/* Confirm Delete Modal */}
            <Modal
                isOpen={!!confirmDeleteEvent}
                onClose={() => setConfirmDeleteEvent(null)}
                title="Confirm Deletion"
                size="md"
            >
                <div className="p-2 space-y-6">
                    <div className="flex items-center gap-4 p-5 bg-red-50 dark:bg-red-500/5 rounded-3xl border border-red-100 dark:border-red-500/20 text-red-600">
                        <MdDelete className="w-10 h-10 shrink-0" />
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest mb-1">Warning</p>
                            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">This action cannot be undone. Permanent deletion will follow.</p>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={() => setConfirmDeleteEvent(null)} className="flex-1 py-3.5 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-xl font-bold uppercase tracking-widest text-[10px]">Cancel</button>
                        <button onClick={handleDeleteEvent} disabled={deleteSubmitting} className="flex-1 py-3.5 bg-red-600 text-white rounded-xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-red-600/20 flex items-center justify-center gap-2">
                            {deleteSubmitting ? <div className="w-3 h-3 rounded-full border-2 border-white/30 border-t-white animate-spin" /> : <MdDelete className="w-4 h-4" />}
                            Confirm Delete
                        </button>
                    </div>
                </div>
            </Modal>
        </>
    );
};
