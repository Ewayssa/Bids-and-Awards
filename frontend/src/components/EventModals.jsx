import React, { useState } from 'react';
import { MdAdd, MdClose, MdEdit } from 'react-icons/md';
import { calendarEventService, dashboardService } from '../services/api';

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
            {eventModal && !confirmAddEvent && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="card-elevated max-w-sm w-full rounded-2xl border-0 shadow-2xl overflow-hidden">
                        <div className="p-6 border-b border-[var(--border-light)] flex items-center justify-between bg-[var(--surface)]">
                            <h2 className="text-lg font-semibold text-[var(--text)]">Add upcoming event</h2>
                            <button onClick={() => setEventModal(null)} className="p-2 text-[var(--text-muted)] hover:bg-[var(--background-subtle)] rounded-lg">
                                <MdClose className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={(e) => { 
                            e.preventDefault(); 
                            if (!eventTitle.trim()) {
                                setEventError('Event title is required.');
                                return;
                            }
                            setEventError('');
                            setConfirmAddEvent(true); 
                        }} className="p-6 space-y-4">
                            {eventError && <div className="p-3 rounded-lg bg-red-500/10 text-red-600 text-sm">{eventError}</div>}
                            <div>
                                <label className="block text-sm font-medium text-[var(--text)] mb-1">Date</label>
                                <p className="text-[var(--text-muted)]">{eventModal.date}</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-[var(--text)] mb-1">Event title <span className="text-red-500">*</span></label>
                                <input type="text" value={eventTitle} onChange={(e) => {
                                    setEventTitle(e.target.value);
                                    if (eventError) setEventError('');
                                }} className="input-field w-full" required autoFocus />
                            </div>
                            <div className="flex gap-3 justify-end pt-2">
                                <button type="button" onClick={() => setEventModal(null)} className="btn-secondary">Cancel</button>
                                <button type="submit" disabled={eventSubmitting} className="btn-primary inline-flex items-center justify-center gap-2">
                                    <MdAdd className="w-4 h-4" /> {eventSubmitting ? 'Adding…' : 'Add event'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Event Modal */}
            {editEventModal?.ev && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="card-elevated max-w-sm w-full rounded-2xl border-0 shadow-2xl overflow-hidden">
                        <div className="p-6 border-b border-[var(--border-light)] flex items-center justify-between bg-[var(--surface)]">
                            <h2 className="text-lg font-semibold text-[var(--text)] inline-flex items-center gap-2"><MdEdit /> Edit event</h2>
                            <button onClick={() => setEditEventModal(null)} className="p-2 text-[var(--text-muted)] hover:bg-[var(--background-subtle)] rounded-lg">
                                <MdClose className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            {editEventError && <div className="p-3 rounded-lg bg-red-500/10 text-red-600 text-sm">{editEventError}</div>}
                            <div>
                                <label className="block text-sm font-medium text-[var(--text)] mb-1">Event title <span className="text-red-500">*</span></label>
                                <input type="text" value={editEventTitle} onChange={(e) => {
                                    setEditEventTitle(e.target.value);
                                    if (editEventError) setEditEventError('');
                                }} className="input-field w-full" required />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-[var(--text)] mb-1">Date <span className="text-red-500">*</span></label>
                                <input type="date" value={editEventDate} onChange={(e) => {
                                    setEditEventDate(e.target.value);
                                    if (editEventError) setEditEventError('');
                                }} className="input-field w-full" required />
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button 
                                    type="button" 
                                    onClick={() => setConfirmDeleteEvent({ ev: editEventModal.ev })} 
                                    className="rounded-xl px-4 py-2 bg-red-500/10 text-red-600 hover:bg-red-500/20 font-medium"
                                >
                                    Delete
                                </button>
                                <button onClick={handleUpdateEvent} disabled={editEventSubmitting} className="btn-primary">
                                    {editEventSubmitting ? 'Saving…' : 'Save changes'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Confirm Dialogs (Can be simplified further or use a generic Confirm dialog) */}
            {confirmAddEvent && (
                 <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="card-elevated max-w-sm w-full shadow-2xl rounded-2xl border-0 p-6">
                        <h2 className="text-lg font-semibold mb-2">Confirm</h2>
                        <p className="text-[var(--text-muted)] mb-6">Are you sure you want to add this event?</p>
                        <div className="flex gap-3 justify-end">
                            <button onClick={() => setConfirmAddEvent(null)} className="btn-secondary">Cancel</button>
                            <button onClick={handleAddEvent} className="btn-primary">Yes, add event</button>
                        </div>
                    </div>
                 </div>
            )}

            {confirmDeleteEvent && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="card-elevated max-w-sm w-full shadow-2xl rounded-2xl border-0 p-6">
                        <h2 className="text-lg font-semibold mb-2 text-red-600">Delete Event</h2>
                        <p className="text-[var(--text-muted)] mb-6">Are you sure you want to delete this event?</p>
                        <div className="flex gap-3 justify-end">
                            <button onClick={() => setConfirmDeleteEvent(null)} className="btn-secondary">Cancel</button>
                            <button onClick={handleDeleteEvent} disabled={deleteSubmitting} className="rounded-lg px-4 py-2 bg-red-600 text-white hover:bg-red-700">
                                {deleteSubmitting ? 'Deleting...' : 'Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};
