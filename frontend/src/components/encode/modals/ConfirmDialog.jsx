import React from 'react';
import { MdCheckCircle } from 'react-icons/md';

const ConfirmDialog = ({ message, onConfirm, onCancel }) => {
    if (!message) return null;
    return (
        <div
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            aria-modal="true"
            role="alertdialog"
        >
            <div className="card-elevated max-w-sm w-full shadow-2xl rounded-2xl border-0 overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="p-6">
                    <h2 className="text-lg font-semibold text-[var(--text)] mb-2">Confirm</h2>
                    <p className="text-[var(--text-muted)] mb-6 text-sm leading-relaxed">{message}</p>
                    <div className="flex gap-3 justify-end">
                        <button
                            type="button"
                            onClick={onCancel}
                            className="btn-secondary flex items-center gap-2"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={onConfirm}
                            className="btn-primary flex items-center gap-2"
                        >
                            <MdCheckCircle className="w-4 h-4" />
                            Yes
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ConfirmDialog;
