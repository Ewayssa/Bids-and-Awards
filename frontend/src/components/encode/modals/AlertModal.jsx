import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { MdCheckCircle } from 'react-icons/md';

const AlertModal = ({ message, onClose }) => {
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

    return createPortal(modalContent, document.body);
};

export default AlertModal;
