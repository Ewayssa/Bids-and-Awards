import React from 'react';
import { MdCheckCircle } from 'react-icons/md';

const AlertModal = ({ message, onClose }) => {
    if (!message) return null;
    return (
        <div
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            aria-modal="true"
            role="alertdialog"
        >
            <div className="card-elevated max-w-sm w-full shadow-2xl rounded-2xl border-0 overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="p-6 text-center">
                    <MdCheckCircle className="h-12 w-12 text-[var(--primary)] mx-auto mb-4" />
                    <p className="text-[var(--text)] font-medium">{message}</p>
                    <button
                        type="button"
                        onClick={onClose}
                        className="mt-6 btn-primary w-full sm:w-auto min-w-[120px]"
                    >
                        OK
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AlertModal;
