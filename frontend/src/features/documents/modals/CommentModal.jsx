import React, { useState, useEffect } from 'react';
import { MdComment, MdSend } from 'react-icons/md';
import Modal from '../../../components/Modal';
import { documentService } from '../../../services/api';

const CommentModal = ({ isOpen, onClose, doc, onCommentAdded }) => {
    const [text, setText] = useState('');
    const [commentsList, setCommentsList] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isFetching, setIsFetching] = useState(false);

    useEffect(() => {
        if (isOpen && doc?.id) {
            loadComments();
        } else {
            setText('');
            setCommentsList([]);
        }
    }, [isOpen, doc?.id]);

    const loadComments = async () => {
        setIsFetching(true);
        try {
            const data = await documentService.getComments(doc.id);
            if (Array.isArray(data)) {
                setCommentsList(data);
            }
        } catch (err) {
            console.error('Failed to load comments:', err);
        } finally {
            setIsFetching(false);
        }
    };

    const handleAdd = async () => {
        if (!text.trim() || isLoading) return;
        setIsLoading(true);
        try {
            await documentService.addComment(doc.id, text.trim());
            setText('');
            await loadComments();
            if (onCommentAdded) onCommentAdded();
        } catch (err) {
            console.error('Failed to add comment:', err);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Comments & Notes"
            size="lg"
        >
            <div className="flex flex-col max-h-[70vh]">
                {doc && (
                    <div className="mb-6 p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-700/50">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400 mb-1">Document Reference</p>
                        <p className="text-sm font-bold text-[var(--text)] line-clamp-1">{doc.title || 'Untitled Document'}</p>
                    </div>
                )}

                <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar min-h-[200px]">
                    {isFetching ? (
                        <div className="flex justify-center py-12">
                            <div className="w-8 h-8 rounded-full border-2 border-[var(--border)] border-t-[var(--primary)] animate-spin" />
                        </div>
                    ) : commentsList.length > 0 ? (
                        <div className="space-y-4">
                            {commentsList.map((comment, idx) => (
                                <div key={idx} className="bg-white dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/50 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow group">
                                    <div className="flex items-start justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center text-emerald-700 dark:text-emerald-400 font-bold text-xs">
                                                {comment.author?.charAt(0).toUpperCase() || '?'}
                                            </div>
                                            <p className="font-bold text-sm text-[var(--text)]">{comment.author || 'Anonymous'}</p>
                                        </div>
                                        <p className="text-[10px] uppercase font-bold text-[var(--text-muted)] group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                                            {comment.date ? new Date(comment.date).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : 'Recent'}
                                        </p>
                                    </div>
                                    <p className="text-sm text-[var(--text-muted)] whitespace-pre-wrap leading-relaxed pl-10">{comment.text}</p>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-12 text-[var(--text-muted)]">
                            <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4 opacity-50">
                                <MdComment className="w-8 h-8" />
                            </div>
                            <p className="font-bold">No comments yet</p>
                            <p className="text-sm opacity-60">Be the first to add a note to this document.</p>
                        </div>
                    )}
                </div>

                <div className="mt-6 pt-6 border-t border-[var(--border-light)] space-y-4">
                    <div className="relative group">
                        <textarea
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            placeholder="Type your comment or note here..."
                            className="input-field w-full min-h-[120px] resize-none pr-4 pt-3 pb-3 rounded-2xl bg-white dark:bg-slate-900 shadow-inner focus:ring-4 focus:ring-emerald-500/10 transition-all border-slate-200 dark:border-slate-700"
                            rows="3"
                        />
                    </div>
                    <div className="flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-6 py-2.5 text-sm font-bold text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={handleAdd}
                            disabled={!text.trim() || isLoading}
                            className="btn-primary px-8 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg shadow-emerald-500/20 disabled:opacity-50 disabled:shadow-none"
                        >
                            {isLoading ? (
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
