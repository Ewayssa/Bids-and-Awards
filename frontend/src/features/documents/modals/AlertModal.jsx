import React from 'react';
import { MdCheckCircle } from 'react-icons/md';
import Modal from '../../../components/Modal';

const AlertModal = ({ message, onClose }) => {
    return (
        <Modal
            isOpen={!!message}
            onClose={onClose}
            title="Success"
            size="sm"
            showCloseButton={true}
        >
            <div className="text-center py-2 space-y-5">
                <div className="flex justify-center">
                    <div className="w-14 h-14 rounded-full bg-[var(--primary-muted)] border border-[color-mix(in_srgb,var(--primary)_20%,var(--border))] flex items-center justify-center text-[var(--primary)]">
                        <MdCheckCircle className="h-8 w-8" aria-hidden />
                    </div>
                </div>
                <p className="text-[var(--text)] font-medium text-base leading-relaxed m-0">{message}</p>
                <button type="button" onClick={onClose} className="btn-primary w-full justify-center">
                    Great, thanks!
                </button>
            </div>
        </Modal>
    );
};

export default AlertModal;
