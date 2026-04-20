import React from 'react';
import { MdAccountTree } from 'react-icons/md';
import Modal from '../../../components/Modal';
import WorkflowVisualization from '../WorkflowVisualization';

const WorkflowModal = ({ prNo, documents, onClose }) => {
    return (
        <Modal
            isOpen={!!prNo}
            onClose={onClose}
            title="Procurement Workflow"
            size="xl"
            showCloseButton={true}
        >
            <div className="flex flex-col space-y-6">
                <div className="flex items-center justify-between p-4 bg-[var(--primary-muted)] dark:bg-[var(--primary)]/10 rounded-2xl border border-[var(--primary-light)]/20 dark:border-[var(--primary)]/20">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-white dark:bg-slate-800 rounded-xl shadow-sm text-[var(--primary)]">
                            <MdAccountTree className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--primary)]">BAC Folder No.</p>
                            <p className="text-sm font-bold text-[var(--text)]">{prNo}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-[var(--background-subtle)]/30 rounded-2xl border border-[var(--border-light)] p-2 min-h-[400px]">
                    <WorkflowVisualization prNo={prNo} documents={documents} />
                </div>

                <div className="flex justify-end pt-4">
                    <button
                        type="button"
                        onClick={onClose}
                        className="btn-primary px-10 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-[var(--primary)]/20"
                    >
                        Close Workflow
                    </button>
                </div>
            </div>
        </Modal>
    );
};

export default WorkflowModal;
