import React from 'react';
import { MdComment, MdSend } from 'react-icons/md';
import Modal from '../../../components/Modal';
import { formatDisplayDateTime } from '../../../utils/helpers.jsx';

const CommentModal = ({ doc, comments, text, setText, onAdd, onClose, loading }) => {
    return (
        <Modal
            isOpen={!!doc}
            onClose={onClose}
            title="Comments & Notes"
            size="lg"
        >
            <div className="flex flex-col max-h-[70vh]">
                {doc && (
                    <div className="mb-6 p-4 rounded-xl border border-[var(--border)] bg-[var(--background-subtle)]/50">
                        <p className="text-xs font-semibold text-[var(--text-muted)] m-0 mb-1">Document</p>
                        <p className="text-sm font-semibold text-[var(--text)] line-clamp-1 m-0">{doc.title || 'Untitled Document'}</p>
                    </div>
                )}

                <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar min-h-[200px]">
                    {doc && comments[doc.id]?.length > 0 ? (
                        <div className="space-y-4">
                            {comments[doc.id].map((comment, idx) => (
                                <div key={idx} className="bg-[var(--surface)] border border-[var(--border-light)] rounded-xl p-4 shadow-sm hover:shadow-[var(--shadow-sm)] transition-shadow group">
                                    <div className="flex items-start justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-full bg-[var(--primary-muted)] flex items-center justify-center text-[var(--primary)] font-semibold text-xs">
                                                {comment.author?.charAt(0).toUpperCase()}
                                            </div>
                                            <p className="font-semibold text-sm text-[var(--text)] m-0">{comment.author}</p>
                                        </div>
                                        <p className="text-[10px] font-medium text-[var(--text-muted)]">
                                            {formatDisplayDateTime(comment.date)}
                                        </p>
                                    </div>
                                    <p className="text-sm text-[var(--text-muted)] whitespace-pre-wrap leading-relaxed pl-10">{comment.text}</p>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-12 text-[var(--text-muted)]">
                            <div className="w-14 h-14 rounded-full bg-[var(--background-subtle)] border border-[var(--border-light)] flex items-center justify-center mb-4 text-[var(--text-subtle)]">
                                <MdComment className="w-7 h-7" aria-hidden />
                            </div>
                            <p className="font-semibold m-0">No comments yet</p>
                            <p className="text-sm mt-1 m-0 opacity-80">Be the first to add a note.</p>
                        </div>
                    )}
                </div>

                <div className="mt-6 pt-6 border-t border-[var(--border-light)] space-y-4">
                    <div className="relative group">
                        <textarea
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            placeholder="Type your comment or note here..."
                            className="input-field w-full min-h-[120px] resize-none"
                            rows="3"
                        />
                    </div>
                    <div className="flex justify-end gap-2 flex-wrap">
                        <button type="button" onClick={onClose} className="btn-ghost">
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={onAdd}
                            disabled={!text.trim() || loading}
                            className="btn-primary inline-flex items-center gap-2 disabled:opacity-50"
                        >
                            {loading ? (
                                <span className="flex items-center gap-2">
                                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                    </svg>
                                    Posting...
                                </span>
                            ) : (
                                <>
                                    <MdSend className="w-4 h-4" />
                                    Post Comment
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </Modal>
    );
};

export default CommentModal;
