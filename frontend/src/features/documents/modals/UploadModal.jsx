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
                    <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 flex items-center gap-3 text-red-600">
                        <MdInfo className="w-5 h-5 shrink-0" />
                        <p className="text-xs font-bold uppercase tracking-tight">{uploadError}</p>
                    </div>
                )}

                <div className="space-y-4">
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Report Title</label>
                        <input
                            type="text"
                            value={form.title}
                            onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                            placeholder="Enter Report Title"
                            className="input-field w-full h-12 px-4 dark:bg-slate-800 rounded-xl"
                            required
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Submitting Office</label>
                        <input
                            type="text"
                            value={form.submitting_office}
                            onChange={(e) => setForm((prev) => ({ ...prev, submitting_office: e.target.value }))}
                            placeholder="Division / Section / Office"
                            className="input-field w-full h-12 px-4 dark:bg-slate-800 rounded-xl"
                            required
                        />
                    </div>

                    <div className="p-6 bg-slate-50 dark:bg-slate-800/20 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-blue-500 transition-colors relative group">
                        <input
                            type="file"
                            onChange={handleFileChange}
                            className="absolute inset-0 opacity-0 cursor-pointer z-10"
                            accept=".pdf,application/pdf"
                            required
                        />
                        <div className="flex flex-col items-center justify-center text-center">
                            {form.file ? (
                                <MdCheckCircle className="w-10 h-10 text-emerald-500 mb-2" />
                            ) : (
                                <MdDescription className="w-10 h-10 text-slate-400 group-hover:text-blue-500 mb-2 transition-colors" />
                            )}
                            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                                {form.file ? form.file.name : 'Select Report (PDF Only)'}
                            </p>
                            <p className="text-[10px] font-bold text-slate-500 uppercase mt-1">Maximum size: 50MB</p>
                        </div>
                    </div>
                </div>

                <div className="pt-4 flex items-center justify-end gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] hover:text-slate-600 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={uploading}
                        className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-blue-600/20 transition-all flex items-center gap-2"
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
