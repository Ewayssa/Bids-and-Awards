import React from 'react';
import { MdUpload, MdDescription, MdCheckCircle, MdInfo } from 'react-icons/md';
import Modal from '../../../components/Modal';

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
        <Modal
            isOpen={true}
            onClose={onClose}
            title="Upload Report"
            size="md"
            showCloseButton={true}
        >
            <form onSubmit={onSubmit} className="space-y-6">
                {uploadError && (
                    <div className="alert-error" role="alert">
                        <MdInfo className="w-5 h-5 shrink-0" aria-hidden />
                        <p className="text-sm font-medium m-0">{uploadError}</p>
                    </div>
                )}

                <div className="space-y-4">
                    <div className="field-group">
                        <label className="label !normal-case !tracking-normal !text-xs !font-semibold !opacity-100" htmlFor="upload-report-title">Report title</label>
                        <input
                            id="upload-report-title"
                            type="text"
                            value={form.title}
                            onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                            placeholder="Enter report title"
                            className="input-field w-full"
                            required
                        />
                    </div>

                    <div className="field-group">
                        <label className="label !normal-case !tracking-normal !text-xs !font-semibold !opacity-100" htmlFor="upload-submitting-office">Submitting office</label>
                        <input
                            id="upload-submitting-office"
                            type="text"
                            value={form.submitting_office}
                            onChange={(e) => setForm((prev) => ({ ...prev, submitting_office: e.target.value }))}
                            placeholder="Division / section / office"
                            className="input-field w-full"
                            required
                        />
                    </div>

                    <div className="p-6 rounded-xl border-2 border-dashed border-[var(--border)] bg-[var(--background-subtle)]/60 hover:border-[color-mix(in_srgb,var(--primary)_45%,var(--border))] transition-colors relative group">
                        <input
                            type="file"
                            onChange={handleFileChange}
                            className="absolute inset-0 opacity-0 cursor-pointer z-10"
                            accept=".pdf,application/pdf"
                            required
                        />
                        <div className="flex flex-col items-center justify-center text-center">
                            {form.file ? (
                                <MdCheckCircle className="w-10 h-10 text-[var(--primary)] mb-2" aria-hidden />
                            ) : (
                                <MdDescription className="w-10 h-10 text-[var(--text-subtle)] group-hover:text-[var(--primary)] mb-2 transition-colors" aria-hidden />
                            )}
                            <p className="text-sm font-medium text-[var(--text)]">
                                {form.file ? form.file.name : 'Select report (PDF only)'}
                            </p>
                            <p className="text-xs text-[var(--text-muted)] mt-1">Maximum size: 50MB</p>
                        </div>
                    </div>
                </div>

                <div className="pt-4 flex items-center justify-end gap-2 flex-wrap">
                    <button type="button" onClick={onClose} className="btn-ghost">
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={uploading}
                        className="btn-primary inline-flex items-center gap-2"
                    >
                        {uploading ? (
                            <><div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" /><span>Uploading...</span></>
                        ) : (
                            <><MdUpload className="w-4 h-4" /><span>Upload</span></>
                        )}
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export default UploadModal;
