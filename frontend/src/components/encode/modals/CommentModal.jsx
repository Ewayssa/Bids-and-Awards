import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { MdClose, MdComment } from 'react-icons/md';

const CommentModal = ({ doc, comments, text, setText, onAdd, onClose, loading }) => {
    useEffect(() => {
        if (doc) {
            const originalHtmlStyle = window.getComputedStyle(document.documentElement).overflow;
            const originalBodyStyle = window.getComputedStyle(document.body).overflow;
            document.documentElement.style.overflow = 'hidden';
            document.body.style.overflow = 'hidden';
            return () => {
                document.documentElement.style.overflow = originalHtmlStyle;
                document.body.style.overflow = originalBodyStyle;
            };
        }
    }, [doc]);

    if (!doc) return null;

    const modalContent = (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-white/5 backdrop-blur-[4px] animate-in fade-in duration-300"
            aria-modal="true"
            role="dialog"
        >
            <div className="card-elevated max-w-2xl w-full max-h-[80vh] overflow-hidden shadow-2xl rounded-2xl border-0 flex flex-col animate-in zoom-in-95 duration-200">
                <div className="p-6 border-b border-[var(--border-light)] flex items-center justify-between bg-[var(--surface)]">
                    <div>
                        <h2 className="text-lg font-semibold text-[var(--text)]">Comments & Notes</h2>
                        <p className="text-sm text-[var(--text-muted)] mt-1">{doc.title || 'Document'}</p>
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
                <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50/50">
                    {comments[doc.id]?.length > 0 ? (
                        <div className="space-y-4">
                            {comments[doc.id].map((comment, idx) => (
                                <div key={idx} className="bg-white border rounded-xl p-4 shadow-sm">
                                    <div className="flex items-start justify-between mb-2">
                                        <p className="font-bold text-sm text-[var(--text)]">{comment.author}</p>
                                        <p className="text-[10px] uppercase font-bold text-[var(--text-muted)]">
                                            {new Date(comment.date).toLocaleString()}
                                        </p>
                                    </div>
                                    <p className="text-sm text-[var(--text-muted)] whitespace-pre-wrap leading-relaxed">{comment.text}</p>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-12 text-[var(--text-muted)]">
                            <MdComment className="w-12 h-12 mx-auto mb-3 opacity-30" />
                            <p className="font-medium">No comments yet</p>
                            <p className="text-sm opacity-75">Be the first to add a note!</p>
                        </div>
                    )}
                </div>
                <div className="p-6 border-t border-[var(--border-light)] bg-white space-y-3">
                    <textarea
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        placeholder="Add a comment or note..."
                        className="input-field w-full min-h-[100px] resize-y"
                        rows="3"
                    />
                    <div className="flex justify-end gap-3">
                        <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
                        <button
                            type="button"
                            onClick={onAdd}
                            disabled={!text.trim() || loading}
                            className="btn-primary inline-flex items-center gap-2"
                        >
                            <MdComment className="w-4 h-4" />
                            Add Comment
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
};

export default CommentModal;
