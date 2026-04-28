import React, { useState } from 'react';
import { MdUpload, MdDescription, MdCheckCircle, MdInfo, MdClose } from 'react-icons/md';
import Modal from '../../../components/Modal';
import { documentService } from '../../../services/api';

const DocUploadModal = ({ 
    isOpen, 
    onClose, 
    onSuccess, 
    docType, 
    targetDoc,
    user,
    initialFile = null
}) => {
    const [file, setFile] = useState(initialFile);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState(null);

    // Sync file if initialFile changes (e.g. fresh pick)
    React.useEffect(() => {
        if (isOpen && initialFile) {
            setFile(initialFile);
        }
    }, [isOpen, initialFile]);

    if (!isOpen) return null;

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile && selectedFile.type !== 'application/pdf') {
            setError('Only PDF files are allowed.');
            setFile(null);
            return;
        }
        setFile(selectedFile);
        setError(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!file) {
            setError('Please select a file to upload.');
            return;
        }

        setUploading(true);
        setError(null);

        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('subDoc', docType);
            formData.append('title', `${docType} for ${targetDoc.user_pr_no || targetDoc.prNo}`);
            formData.append('category', targetDoc.category || 'General');
            formData.append('uploadedBy', user?.fullName || 'User');
            
            // Linking logic
            if (targetDoc.procurement_record) {
                formData.append('procurement_record', targetDoc.procurement_record);
            }
            if (targetDoc.prNo) formData.append('prNo', targetDoc.prNo);
            if (targetDoc.ppmp_no) formData.append('ppmp_no', targetDoc.ppmp_no);
            if (targetDoc.year) formData.append('year', targetDoc.year);
            if (targetDoc.quarter) formData.append('quarter', targetDoc.quarter);

            let result;
            // CRITICAL: If we are uploading a file for the SAME docType we are viewing, 
            // we should UPDATE the existing record instead of creating a duplicate.
            if (targetDoc.id && targetDoc.subDoc === docType) {
                result = await documentService.update(targetDoc.id, formData);
            } else {
                result = await documentService.create(formData);
            }
            
            if (onSuccess) onSuccess(result);
            onClose();
        } catch (err) {
            console.error('Upload error:', err);
            setError(err.response?.data?.message || 'Failed to upload document. Please try again.');
        } finally {
            setUploading(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={`Upload ${docType}`}
            size="md"
            showCloseButton={true}
        >
            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="p-4 bg-amber-50 dark:bg-amber-500/5 rounded-2xl border border-amber-100 dark:border-amber-500/20 flex items-center gap-3">
                    <div className="p-2 bg-white dark:bg-slate-900 rounded-lg shadow-sm text-amber-600">
                        <MdInfo className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Mandatory Requirement</p>
                        <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Uploading this will help complete the Procurement Package.</p>
                    </div>
                </div>

                {error && (
                    <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 flex items-center gap-3 text-red-600">
                        <MdInfo className="w-5 h-5 shrink-0" />
                        <p className="text-xs font-bold uppercase tracking-tight">{error}</p>
                    </div>
                )}

                <div className="space-y-4">
                    <div className="p-8 bg-slate-50 dark:bg-slate-800/20 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-emerald-500 transition-all relative group">
                        <input
                            type="file"
                            onChange={handleFileChange}
                            className="absolute inset-0 opacity-0 cursor-pointer z-10"
                            accept=".pdf,application/pdf"
                        />
                        <div className="flex flex-col items-center justify-center text-center">
                            {file ? (
                                <MdCheckCircle className="w-12 h-12 text-emerald-500 mb-3" />
                            ) : (
                                <MdUpload className="w-12 h-12 text-slate-300 group-hover:text-emerald-500 mb-3 transition-colors" />
                            )}
                            <p className="text-sm font-black text-slate-700 dark:text-slate-300">
                                {file ? file.name : `Select ${docType} (PDF)`}
                            </p>
                            <p className="text-[10px] font-bold text-slate-500 uppercase mt-2">Maximum size: 50MB</p>
                        </div>
                    </div>
                </div>

                <div className="pt-2 flex items-center justify-end gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={uploading || !file}
                        className="px-8 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white rounded-xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-emerald-600/20 transition-all flex items-center gap-2 active:scale-95"
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

export default DocUploadModal;
