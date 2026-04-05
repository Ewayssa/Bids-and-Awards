import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { MdClose } from 'react-icons/md';
import WorkflowVisualization from '../WorkflowVisualization';

const WorkflowModal = ({ prNo, documents, onClose }) => {
    useEffect(() => {
        if (prNo) {
            const originalHtmlStyle = window.getComputedStyle(document.documentElement).overflow;
            const originalBodyStyle = window.getComputedStyle(document.body).overflow;
            document.documentElement.style.overflow = 'hidden';
            document.body.style.overflow = 'hidden';
            return () => {
                document.documentElement.style.overflow = originalHtmlStyle;
                document.body.style.overflow = originalBodyStyle;
            };
        }
    }, [prNo]);

    if (!prNo) return null;

    const modalContent = (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-white/5 backdrop-blur-[4px] animate-in fade-in duration-300"
            aria-modal="true"
            role="dialog"
        >
            <div className="card-elevated max-w-5xl w-full max-h-[90vh] overflow-hidden shadow-2xl rounded-2xl border-0 flex flex-col animate-in zoom-in-95 duration-200">
                <div className="p-6 border-b border-[var(--border-light)] flex items-center justify-between bg-[var(--surface)]">
                    <div>
                        <h2 className="text-lg font-semibold text-[var(--text)]">Procurement Workflow</h2>
                        <p className="text-xs text-[var(--text-muted)] font-bold uppercase tracking-widest mt-1">BAC Folder No.: {prNo}</p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-2 text-[var(--text-muted)] hover:bg-[var(--background-subtle)] rounded-lg transition-colors"
                        aria-label="Close"
                    >
                        <MdClose className="w-5 h-5" />
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50">
                    <WorkflowVisualization prNo={prNo} documents={documents} />
                </div>
                <div className="p-4 border-t border-[var(--border-light)] bg-white flex justify-end">
                    <button type="button" onClick={onClose} className="btn-primary px-8">Close</button>
                </div>
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
};

export default WorkflowModal;
