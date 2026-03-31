import React from 'react';
import { MdClose, MdUpload } from 'react-icons/md';

const UploadModal = ({ 
    onClose, 
    onSubmit, 
    form, 
    setForm, 
    uploading, 
    uploadError, 
    handleFileChange 
}) => {
    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm"
            aria-modal="true"
            role="dialog"
        >
            <div className="card-elevated max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl rounded-2xl border-0">
                <div className="p-6 border-b border-[var(--border-light)] flex items-center justify-between sticky top-0 bg-[var(--surface)] rounded-t-2xl z-10">
                    <h2 className="text-lg font-semibold text-[var(--text)]">Upload Report</h2>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-2 text-[var(--text-muted)] hover:bg-[var(--background-subtle)] rounded-lg transition-colors"
                        aria-label="Close"
                    >
                        <MdClose className="w-5 h-5" />
                    </button>
                </div>
                <form onSubmit={onSubmit} className="p-6 space-y-4">
                    {uploadError && (
                        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm shadow-sm transition-all duration-300 ease-out">
                            {uploadError}
                        </div>
                    )}
                    <div>
                        <label className="block text-sm font-medium text-[var(--text)] mb-1">
                            Report Title <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={form.title}
                            onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                            placeholder="Enter Report Title"
                            className="input-field w-full"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-[var(--text)] mb-1">
                            Submitting Office <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={form.submitting_office}
                            onChange={(e) => setForm((prev) => ({ ...prev, submitting_office: e.target.value }))}
                            placeholder="Enter Submitting Office"
                            className="input-field w-full"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-[var(--text)] mb-1">
                            File <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="file"
                            onChange={handleFileChange}
                            className="block w-full text-sm text-[var(--text)] file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-[#16a34a] file:hover:bg-[#15803d] file:active:bg-[#166534] file:text-white file:font-medium file:cursor-pointer file:transition-colors file:duration-200"
                            accept=".pdf,application/pdf"
                        />
                        {form.file && (
                            <p className="mt-1 text-sm text-[var(--text-muted)]">{form.file.name}</p>
                        )}
                    </div>
                    <div className="flex justify-end gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="btn-secondary"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={uploading}
                            className="btn-primary inline-flex items-center gap-2"
                        >
                            <MdUpload className="w-5 h-5" />
                            {uploading ? 'Uploading...' : 'Upload'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default UploadModal;
