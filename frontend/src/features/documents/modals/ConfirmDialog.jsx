import React from 'react';
import { MdCheckCircle, MdHelpOutline } from 'react-icons/md';
import Modal from '../../../components/Modal';

const ConfirmDialog = ({ message, onConfirm, onCancel, title = 'Confirmation Required' }) => {
    return (
        <Modal
            isOpen={!!message}
            onClose={onCancel}
            title={title}
            size="sm"
        >
            <div className="space-y-6 py-2">
                <div className="flex flex-col items-center text-center space-y-3">
                    <div className="w-14 h-14 rounded-full bg-[var(--primary-muted)] border border-[color-mix(in_srgb,var(--primary)_25%,var(--border))] flex items-center justify-center text-[var(--primary)]">
                        <MdHelpOutline className="w-8 h-8" aria-hidden />
                    </div>
                    <p className="text-[var(--text)] font-semibold text-base leading-relaxed m-0">
                        {message}
                    </p>
                </div>

                <div className="flex gap-3 justify-center pt-2 flex-wrap">
                    <button type="button" onClick={onCancel} className="btn-secondary min-w-[6rem] justify-center">
                        Cancel
                    </button>
                    <button type="button" onClick={onConfirm} className="btn-primary min-w-[8rem] justify-center inline-flex items-center gap-2">
                        <MdCheckCircle className="w-5 h-5" aria-hidden />
                        Yes, proceed
                    </button>
                </div>
            </div>
        </Modal>
    );
};

export default ConfirmDialog;
