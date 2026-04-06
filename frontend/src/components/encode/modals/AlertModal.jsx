import React from 'react';
import { MdCheckCircle } from 'react-icons/md';
import Modal from '../../Modal';

const AlertModal = ({ message, onClose }) => {
    return (
        <Modal
            isOpen={!!message}
            onClose={onClose}
            title="Success"
            size="sm"
            showCloseButton={true}
        >
            <div className="text-center py-2">
                <div className="flex justify-center mb-4">
                    <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center animate-bounce">
                        <MdCheckCircle className="h-10 w-10 text-emerald-600 dark:text-emerald-400" />
                    </div>
                </div>
                <p className="text-[var(--text)] font-bold text-lg leading-relaxed">{message}</p>
                <div className="mt-8">
                    <button
                        type="button"
                        onClick={onClose}
                        className="btn-primary w-full py-3 rounded-xl font-bold shadow-lg shadow-emerald-500/20"
                    >
                        Great, thanks!
                    </button>
                </div>
            </div>
        </Modal>
    );
};

export default AlertModal;
