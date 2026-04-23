import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    MdClose, MdSave, MdInfo, MdLabel, MdEvent, MdDateRange, MdFileUpload, MdDescription as MdFileShortcut
} from 'react-icons/md';
import Modal from '../../../components/Modal';
import { documentService } from '../../../services/api';

const UploadPPMPModal = ({
    show,
    isOpen,
    onClose,
    onSuccess
}) => {
    const isModalOpen = show || isOpen;
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [errors, setErrors] = useState({});

    const [form, setForm] = useState({
        ppmp_no: '',
        year: new Date().getFullYear().toString(),
        quarter: 'Q1'
    });

    const [file, setFile] = useState(null);

    useEffect(() => {
        if (isModalOpen) {
            setForm({
                ppmp_no: '',
                year: new Date().getFullYear().toString(),
                quarter: 'Q1'
            });
            setFile(null);
            setError('');
            setErrors({});
        }
    }, [isModalOpen]);

    const validateForm = () => {
        const errs = {};
        if (!form.ppmp_no.trim()) errs.ppmp_no = 'PPMP No. is required';
        if (!form.year.trim()) errs.year = 'Year is required';
        if (!form.quarter.trim()) errs.quarter = 'Quarter is required';
        if (!file) errs.file = 'PPMP file upload is required';
        
        setErrors(errs);
        return Object.keys(errs).length === 0;
    };

    const updateField = (field, value) => {
        setForm(prev => ({ ...prev, [field]: value }));
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: null }));
        }
    };

    const handleFileChange = (selectedFile) => {
        setFile(selectedFile);
        if (errors.file) {
            setErrors(prev => ({ ...prev, file: null }));
        }
    };

    const handleSubmit = async () => {
        if (!validateForm()) return;

        setSubmitting(true);
        setError('');

        try {
            // 1. Prepare the form data for the document upload
            const formData = new FormData();
            formData.append('file', file);
            formData.append('category', 'Initial Documents');
            formData.append('subDoc', 'Project Procurement Management Plan/Supplemental PPMP');
            formData.append('title', `PPMP ${form.ppmp_no} (${form.year})`);
            formData.append('ppmp_no', form.ppmp_no);
            formData.append('year', form.year);
            formData.append('quarter', form.quarter);
            // prNo is now automatically handled by backend based on ppmp_no grouping
            
            const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
            formData.append('uploadedBy', currentUser.fullName || currentUser.username || 'Unknown');

            // 2. Save to backend
            const response = await documentService.create(formData);
            
            if (onSuccess) {
                onSuccess({ ...form, ...response });
            }
            onClose();
        } catch (err) {
            console.error('Submission error:', err);
            setError(err.response?.data?.error || 'Failed to upload PPMP. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    const renderFooter = () => (
        <div className="flex items-center justify-end w-full gap-3">
            <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="px-6 py-2.5 rounded-xl font-bold text-slate-500 hover:bg-slate-100 transition-all"
            >
                Cancel
            </button>
            <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="btn-primary flex items-center gap-2 shadow-lg shadow-[var(--primary)]/20 px-8 py-2.5"
            >
                {submitting ? 'Uploading...' : 'Save PPMP'}
                <MdSave className="w-4 h-4" />
            </button>
        </div>
    );

    if (!isModalOpen) return null;

    return (
        <Modal
            isOpen={isModalOpen}
            onClose={onClose}
            title="Upload New PPMP"
            size="auto"
            containerClassName="w-[min(90vw,550px)] aspect-square flex flex-col !rounded-3xl overflow-hidden shadow-2xl bg-white dark:bg-slate-900"
            bodyClassName="flex-1 overflow-y-auto custom-scrollbar p-6 sm:p-8 space-y-6"
            footer={renderFooter()}
        >
            <div className="flex flex-col h-full">
                <AnimatePresence>
                    {error && (
                        <motion.div 
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ 
                                opacity: 1, 
                                x: [0, -5, 5, -5, 5, 0], // Shake effect
                                scale: 1 
                            }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ duration: 0.4 }}
                            className="mb-6 p-4 bg-red-50 dark:bg-red-900/30 border-2 border-red-200 dark:border-red-800 rounded-3xl flex items-start gap-4 shadow-lg shadow-red-500/5 group"
                        >
                            <div className="w-10 h-10 rounded-2xl bg-red-100 dark:bg-red-800/50 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                                <MdInfo className="w-6 h-6 text-red-600" />
                            </div>
                            <div className="flex-1 pt-1">
                                <p className="text-sm font-bold text-red-600 dark:text-red-400 leading-relaxed">
                                    {error.split('"').map((part, i) => i % 2 === 1 ? <span key={i} className="px-1.5 py-0.5 bg-red-100 dark:bg-red-900/50 rounded-lg text-red-800 dark:text-red-200 font-black">"{part}"</span> : part)}
                                </p>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                    <div className="space-y-5">
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                                <MdLabel className="w-4 h-4" />
                                PPMP No. <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={form.ppmp_no}
                                onChange={(e) => updateField('ppmp_no', e.target.value)}
                                className={`w-full p-3 bg-white dark:bg-slate-900 border ${errors.ppmp_no ? 'border-red-400' : 'border-slate-200 dark:border-slate-700'} rounded-xl focus:ring-2 focus:ring-[var(--primary)] outline-none transition-all`}
                                placeholder="Enter PPMP Reference #"
                            />
                            {errors.ppmp_no && <span className="text-xs text-red-500 font-semibold">{errors.ppmp_no}</span>}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                                    <MdEvent className="w-4 h-4" />
                                    Year <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={form.year}
                                    onChange={(e) => updateField('year', e.target.value.replace(/[^0-9]/g, '').slice(0, 4))}
                                    className={`w-full p-3 bg-white dark:bg-slate-900 border ${errors.year ? 'border-red-400' : 'border-slate-200 dark:border-slate-700'} rounded-xl focus:ring-2 focus:ring-[var(--primary)] outline-none transition-all text-center`}
                                    placeholder="YYYY"
                                />
                                {errors.year && <span className="text-xs text-red-500 font-semibold">{errors.year}</span>}
                            </div>
                            
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                                    <MdDateRange className="w-4 h-4" />
                                    Quarter <span className="text-red-500">*</span>
                                </label>
                                <select
                                    value={form.quarter}
                                    onChange={(e) => updateField('quarter', e.target.value)}
                                    className={`w-full p-3 bg-white dark:bg-slate-900 border ${errors.quarter ? 'border-red-400' : 'border-slate-200 dark:border-slate-700'} rounded-xl focus:ring-2 focus:ring-[var(--primary)] outline-none transition-all cursor-pointer`}
                                >
                                    <option value="Q1">1st Quarter</option>
                                    <option value="Q2">2nd Quarter</option>
                                    <option value="Q3">3rd Quarter</option>
                                    <option value="Q4">4th Quarter</option>
                                </select>
                                {errors.quarter && <span className="text-xs text-red-500 font-semibold">{errors.quarter}</span>}
                            </div>
                        </div>

                        <div className="space-y-1 pt-2">
                            <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                                <MdFileUpload className="w-4 h-4" />
                                Upload File <span className="text-red-500">*</span>
                            </label>
                            <label className={`flex flex-col items-center justify-center p-6 border-2 border-dashed ${errors.file ? 'border-red-400 bg-red-50' : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50'} rounded-2xl cursor-pointer transition-all`}>
                                <input type="file" className="hidden" onChange={(e) => handleFileChange(e.target.files[0])} />
                                <MdFileShortcut className={`w-10 h-10 mb-2 ${file ? 'text-green-500' : 'text-slate-400'}`} />
                                <span className="text-sm font-bold text-slate-600 dark:text-slate-300 text-center truncate max-w-full px-4">
                                    {file ? file.name : 'Select or drop your file here'}
                                </span>
                                <span className="text-xs text-slate-400 mt-1">Maximum size: 10MB</span>
                            </label>
                            {errors.file && <span className="text-xs text-red-500 font-semibold block text-center mt-1">{errors.file}</span>}
                        </div>
                </div>
            </div>
        </Modal>
    );
};

export default UploadPPMPModal;
