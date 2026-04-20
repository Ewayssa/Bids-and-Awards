import React from 'react';
import Modal from '../../../components/Modal';
import ProcurementWorkflowView from '../ProcurementWorkflowView';

/**
 * High-end Modal container for the 12-stage Detailed Procurement Workflow.
 * This provides a focused, full-screen experience for managing a specific procurement record's lifecycle.
 */
const ProcurementDocumentModal = ({ 
    isOpen, 
    onClose, 
    record, 
    user, 
    onRefresh,
    onOpenUpload,
    onOpenDoc 
}) => {
    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={record ? record.title : 'Requirements Checklist'}
            size="auto"
            showCloseButton={true}
            containerClassName="w-[min(90vw,600px)] h-[min(90vh,600px)] flex flex-col !rounded-[2rem] overflow-hidden shadow-2xl"
            bodyClassName="flex-1 overflow-hidden p-0"
        >
            {record ? (
                <ProcurementWorkflowView 
                    record={record}
                    user={user}
                    onRefresh={onRefresh}
                    onOpenUpload={onOpenUpload}
                    onOpenDoc={onOpenDoc}
                />
            ) : (
                <div className="flex flex-col items-center justify-center h-full min-h-[400px] gap-4 bg-slate-50 dark:bg-slate-900/50">
                    <div className="w-12 h-12 rounded-full border-4 border-slate-200 border-t-blue-600 animate-spin" />
                    <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Initializing Workflow Console...</p>
                </div>
            )}
        </Modal>
    );
};

export default ProcurementDocumentModal;