import React from 'react';
import { MdCheckCircle, MdHelpOutline } from 'react-icons/md';
import Modal from '../../../components/Modal';

const ConfirmDialog = ({ message, onConfirm, onCancel, title = "Confirmation Required" }) => {
    return (
        <Modal
            isOpen={!!message}
            onClose={onCancel}
            title={title}
            size="sm"
        >
            <div className="space-y-6 py-2">
                <div className="flex flex-col items-center text-center space-y-3">
                    <div className="w-16 h-16 rounded-full bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400 mb-2">
                        <MdHelpOutline className="w-10 h-10" />
                    </div>
                    <p className="text-[var(--text)] font-semibold text-lg leading-relaxed">
                        {message}
                    </p>
                </div>
                
                <div className="flex gap-3 justify-center pt-2">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="btn-secondary px-8 py-2.5 rounded-xl text-sm font-bold"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        className="btn-primary px-10 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg shadow-emerald-500/20"
                    >
                        <MdCheckCircle className="w-5 h-5" />
                        Yes, proceed
                    </button>
                </div>
            </div>
        </Modal>
    );
};

export default ConfirmDialog;
