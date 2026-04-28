import React, { useEffect } from 'react';
import { MdCheckCircle } from 'react-icons/md';
import Modal from '../../../components/Modal';

const AlertModal = ({ message, onClose, autoCloseMs = 2500 }) => {
    useEffect(() => {
        if (!message || !autoCloseMs) return undefined;

        const timer = setTimeout(onClose, autoCloseMs);
        return () => clearTimeout(timer);
    }, [message, onClose, autoCloseMs]);

    return (
        <Modal
            isOpen={!!message}
            onClose={onClose}
            title=""
            size="sm"
            header={<></>}
        >
            <div className="text-center py-1">
                <div className="flex justify-center mb-3">
                    <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center">
                        <MdCheckCircle className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
                    </div>
                </div>
                <p className="text-[var(--text)] font-bold text-sm leading-relaxed">{message}</p>
            </div>
        </Modal>
    );
};

export default AlertModal;
