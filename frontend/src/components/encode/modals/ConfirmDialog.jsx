import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { MdCheckCircle } from 'react-icons/md';

const ConfirmDialog = ({ message, onConfirm, onCancel }) => {
    useEffect(() => {
        if (message) {
            const originalHtmlStyle = window.getComputedStyle(document.documentElement).overflow;
            const originalBodyStyle = window.getComputedStyle(document.body).overflow;
            document.documentElement.style.overflow = 'hidden';
            document.body.style.overflow = 'hidden';
            return () => {
                document.documentElement.style.overflow = originalHtmlStyle;
                document.body.style.overflow = originalBodyStyle;
            };
        }
    }, [message]);

    if (!message) return null;

    const modalContent = (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-white/5 backdrop-blur-[4px] animate-in fade-in duration-300"
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

    return createPortal(modalContent, document.body);
};

export default ConfirmDialog;
