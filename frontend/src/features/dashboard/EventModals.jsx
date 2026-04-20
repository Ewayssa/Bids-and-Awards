import React, { useState } from 'react';
import { MdAdd, MdClose, MdEdit, MdEvent, MdDelete, MdInfo, MdCheckCircle, MdUpdate } from 'react-icons/md';
import { calendarEventService } from '../../services/api';
import { formatDisplayDate, formatDisplayTime, DatePicker } from '../../utils/helpers.jsx';
import Modal from '../../components/Modal';

export const EventModals = ({ 
    eventModal, 
    setEventModal, 
    editEventModal, 
    setEditEventModal, 
    onRefresh 
}) => {
    const [eventTitle, setEventTitle] = useState('');
    const [eventStartTime, setEventStartTime] = useState('');
    const [eventEndTime, setEventEndTime] = useState('');
    const [eventSubmitting, setEventSubmitting] = useState(false);
    const [eventError, setEventError] = useState('');
    const [confirmAddEvent, setConfirmAddEvent] = useState(null);

    const [editEventTitle, setEditEventTitle] = useState('');
    const [editEventDate, setEditEventDate] = useState('');
    const [editEventStartTime, setEditEventStartTime] = useState('');
    const [editEventEndTime, setEditEventEndTime] = useState('');
    const [editEventSubmitting, setEditEventSubmitting] = useState(false);
    const [editEventError, setEditEventError] = useState('');
    const [confirmDeleteEvent, setConfirmDeleteEvent] = useState(null);
    const [deleteSubmitting, setDeleteSubmitting] = useState(false);

    // Initial value syncing when modal opens
    React.useEffect(() => {
        if (editEventModal?.ev) {
            setEditEventTitle(editEventModal.ev.title || '');
            setEditEventDate(editEventModal.ev.date || '');
            setEditEventStartTime(editEventModal.ev.start_time || '');
            setEditEventEndTime(editEventModal.ev.end_time || '');
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
                start_time: eventStartTime || null,
                end_time: eventEndTime || null,
            });
            await onRefresh();
            // Notify other open dashboard instances to refresh immediately.
            window.dispatchEvent(new Event('calendarChanged'));
            setEventModal(null);
            setEventTitle('');
            setEventStartTime('');
            setEventEndTime('');
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
            setEditEventError('Agenda/Activity Title and Meeting Date are required.');
            return;
        }
        setEditEventSubmitting(true);
        setEditEventError('');
        try {
            await calendarEventService.update(ev.id, {
                title: editEventTitle.trim(),
                date: editEventDate.trim(),
                start_time: editEventStartTime || null,
                end_time: editEventEndTime || null,
            });
            await onRefresh();
            window.dispatchEvent(new Event('calendarChanged'));
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
            await onRefresh();
            window.dispatchEvent(new Event('calendarChanged'));
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
                        setEventError('Agenda/Activity Title is required.');
                        return;
                    }
                    setEventError('');
                    setConfirmAddEvent(true); 
                }} className="space-y-6">
                    <div className="alert-info">
                        <div className="p-2 rounded-lg bg-[var(--surface)] border border-[var(--border-light)] text-[var(--primary)] shrink-0">
                            <MdEvent className="w-6 h-6" aria-hidden />
                        </div>
                        <div>
                            <p className="text-xs font-semibold text-[var(--text)] m-0 mb-0.5">Meeting Date</p>
                            <p className="text-sm font-medium m-0">
                                {formatDisplayDate(eventModal?.date)}
                                {eventStartTime && (
                                    <span className="text-[var(--primary)] ml-2">
                                        • {formatDisplayTime(eventStartTime)}
                                        {eventEndTime && ` - ${formatDisplayTime(eventEndTime)}`}
                                    </span>
                                )}
                            </p>
                        </div>
                    </div>

                    <div className="field-group">
                        <label className="label !normal-case !tracking-normal !text-xs !font-semibold !opacity-100" htmlFor="event-title-input">Agenda/Activity Title</label>
                        <input
                            id="event-title-input"
                            type="text"
                            value={eventTitle}
                            onChange={(e) => {
                                setEventTitle(e.target.value);
                                if (eventError) setEventError('');
                            }}
                            placeholder="e.g. BAC Meeting"
                            className="input-field w-full"
                            required
                            autoFocus
                        />
                        {eventError && <p className="text-xs font-medium text-red-600 mt-1">{eventError}</p>}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="field-group">
                            <label className="label !normal-case !tracking-normal !text-xs !font-semibold !opacity-100" htmlFor="event-start-time">Start time</label>
                            <input
                                id="event-start-time"
                                type="time"
                                value={eventStartTime}
                                onChange={(e) => setEventStartTime(e.target.value)}
                                className="input-field w-full"
                            />
                        </div>
                        <div className="field-group">
                            <label className="label !normal-case !tracking-normal !text-xs !font-semibold !opacity-100" htmlFor="event-end-time">End time</label>
                            <input
                                id="event-end-time"
                                type="time"
                                value={eventEndTime}
                                onChange={(e) => setEventEndTime(e.target.value)}
                                className="input-field w-full"
                            />
                        </div>
                    </div>

                    <div className="flex gap-3 pt-2 flex-wrap">
                        <button type="button" onClick={() => setEventModal(null)} className="btn-secondary flex-1 min-w-[6rem] justify-center">
                            Cancel
                        </button>
                        <button type="submit" className="btn-primary flex-1 min-w-[6rem] justify-center inline-flex items-center gap-2">
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
                        <div className="field-group">
                            <label className="label !normal-case !tracking-normal !text-xs !font-semibold !opacity-100" htmlFor="edit-event-title">Agenda/Activity Title</label>
                            <input
                                id="edit-event-title"
                                type="text"
                                value={editEventTitle}
                                onChange={(e) => {
                                    setEditEventTitle(e.target.value);
                                    if (editEventError) setEditEventError('');
                                }}
                                className="input-field w-full"
                                required
                            />
                        </div>
                        <div className="field-group">
                            <label className="label !normal-case !tracking-normal !text-xs !font-semibold !opacity-100" htmlFor="edit-event-date">Meeting Date</label>
                            <DatePicker
                                value={editEventDate}
                                onChange={(val) => {
                                    setEditEventDate(val);
                                    if (editEventError) setEditEventError('');
                                }}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="field-group">
                                <label className="label !normal-case !tracking-normal !text-xs !font-semibold !opacity-100" htmlFor="edit-event-start-time">Start time</label>
                                <input
                                    id="edit-event-start-time"
                                    type="time"
                                    value={editEventStartTime}
                                    onChange={(e) => setEditEventStartTime(e.target.value)}
                                    className="input-field w-full"
                                />
                            </div>
                            <div className="field-group">
                                <label className="label !normal-case !tracking-normal !text-xs !font-semibold !opacity-100" htmlFor="edit-event-end-time">End time</label>
                                <input
                                    id="edit-event-end-time"
                                    type="time"
                                    value={editEventEndTime}
                                    onChange={(e) => setEditEventEndTime(e.target.value)}
                                    className="input-field w-full"
                                />
                            </div>
                        </div>
                    </div>

                    {editEventError && (
                        <div className="alert-error" role="alert">
                            <MdInfo className="w-5 h-5 shrink-0" aria-hidden />
                            <p className="text-sm font-medium m-0">{editEventError}</p>
                        </div>
                    )}

                    <div className="flex gap-3 pt-2 flex-wrap">
                        <button
                            type="button"
                            onClick={() => setConfirmDeleteEvent({ ev: editEventModal.ev })}
                            className="btn-danger px-4"
                        >
                            Delete
                        </button>
                        <button
                            type="button"
                            onClick={handleUpdateEvent}
                            disabled={editEventSubmitting}
                            className="btn-primary flex-1 min-w-[8rem] justify-center inline-flex items-center gap-2"
                        >
                            {editEventSubmitting ? <div className="w-3 h-3 rounded-full border-2 border-white/30 border-t-white animate-spin" aria-hidden /> : <MdUpdate className="w-4 h-4" />}
                            Save changes
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
                <div className="space-y-6">
                    <div className="alert-success">
                        <MdCheckCircle className="w-8 h-8 shrink-0 text-emerald-600" aria-hidden />
                        <div>
                            <p className="text-xs font-semibold text-[var(--text)] m-0 mb-1">Confirm Action</p>
                            <p className="text-sm font-medium m-0 mb-3 text-[var(--text-muted)]">Are you sure you want to add this event?</p>
                            <div className="p-3 rounded-xl bg-emerald-50/50 border border-emerald-100/50 space-y-1">
                                <p className="text-xs font-bold text-emerald-900 line-clamp-1">{eventTitle || 'Untitled Event'}</p>
                                <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">
                                    {formatDisplayDate(eventModal?.date)}
                                    {eventStartTime && ` • ${formatDisplayTime(eventStartTime)}${eventEndTime ? ` - ${formatDisplayTime(eventEndTime)}` : ''}`}
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className="modal-footer !p-0 !border-0 flex gap-3">
                        <button type="button" onClick={() => setConfirmAddEvent(null)} className="btn-secondary flex-1 justify-center">Cancel</button>
                        <button type="button" onClick={handleAddEvent} className="btn-primary flex-1 justify-center">Confirm</button>
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
                <div className="space-y-6">
                    <div className="alert-error">
                        <MdDelete className="w-8 h-8 shrink-0" aria-hidden />
                        <div>
                            <p className="text-sm font-semibold m-0 mb-1">Warning</p>
                            <p className="text-sm font-medium m-0">This cannot be undone.</p>
                        </div>
                    </div>
                    <div className="modal-footer !p-0 !border-0 flex gap-3">
                        <button type="button" onClick={() => setConfirmDeleteEvent(null)} className="btn-secondary flex-1 justify-center">Cancel</button>
                        <button type="button" onClick={handleDeleteEvent} disabled={deleteSubmitting} className="btn-danger flex-1 justify-center inline-flex items-center gap-2">
                            {deleteSubmitting ? <div className="w-3 h-3 rounded-full border-2 border-white/30 border-t-white animate-spin" aria-hidden /> : <MdDelete className="w-4 h-4" />}
                            Delete
                        </button>
                    </div>
                </div>
            </Modal>
        </>
    );
};
