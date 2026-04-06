import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { MdClose } from 'react-icons/md';

/**
 * Standard Modal Component
 * @param {boolean} isOpen - Whether the modal is visible
 * @param {function} onClose - Function to close the modal
 * @param {string} title - Header title
 * @param {string} size - size class: 'sm', 'md', 'lg', 'xl', '2xl', 'full'
 * @param {React.ReactNode} footer - Optional footer buttons/content
 * @param {boolean} glass - Whether to use glassmorphism effect (default: true)
 * @param {string} containerClassName - Custom class for the modal container
 * @param {string} bodyClassName - Custom class for the modal body
 */
const Modal = ({
    isOpen,
    onClose,
    title,
    children,
    footer,
    size = 'md',
    glass = true,
    containerClassName = '',
    bodyClassName = '',
}) => {
    // Body scroll lock
    useEffect(() => {
        if (isOpen) {
            const originalStyle = window.getComputedStyle(document.body).overflow;
            document.body.style.overflow = 'hidden';
            return () => {
                document.body.style.overflow = originalStyle;
            };
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const sizeClasses = {
        sm: 'max-w-sm',
        md: 'max-w-md',
        lg: 'max-w-xl',
        xl: 'max-w-3xl',
        '2xl': 'max-w-5xl',
        full: 'max-w-[95vw] h-[90vh]',
        auto: 'max-w-fit min-w-[min(90vw,320px)]'
    };
    const sizeCls = sizeClasses[size] || sizeClasses.md;
    const glassClass = glass ? 'glass-modal' : 'bg-[var(--surface)]';

    return createPortal(
        <div 
            className="modal-overlay animate-in fade-in duration-300"
            role="dialog"
            aria-modal="true"
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <div 
                className={`modal-container ${sizeCls} ${glassClass} ${containerClassName} animate-in zoom-in-95 duration-200`}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="modal-header">
                    <h2 className="modal-title">{title}</h2>
                    <button 
                        type="button" 
                        onClick={onClose}
                        className="p-2 text-[var(--text-muted)] hover:bg-[var(--background-subtle)] hover:text-[var(--text)] rounded-xl transition-all duration-200 active:scale-90"
                        aria-label="Close"
                    >
                        <MdClose className="w-6 h-6" />
                    </button>
                </div>

                {/* Body */}
                <div className={`modal-body ${bodyClassName}`}>
                    {children}
                </div>

                {/* Footer */}
                {footer && (
                    <div className="modal-footer">
                        {footer}
                    </div>
                )}
            </div>
        </div>,
        document.body
    );
};

export default Modal;
