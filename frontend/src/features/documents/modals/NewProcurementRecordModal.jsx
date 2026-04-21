import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    MdClose, MdSave, MdArrowForward, MdArrowBack,
    MdCheckCircle, MdInfo, MdTitle, MdDescription, MdAttachMoney, 
    MdAccountBalanceWallet, MdBusiness, MdFileUpload, MdDescription as MdFileShortcut,
    MdEventNote, MdHistory, MdLabel
} from 'react-icons/md';
import Modal from '../../../components/Modal';
import { procurementRecordService, documentService } from '../../../services/api';
import { formatCurrencyValue, toNumbersOnly, toLettersOnly } from '../../../utils/validation';

const PROCUREMENT_TYPES = [
    { id: 'small_value', name: 'Small Value Procurement', icon: '📋', description: 'Small value items' },
    { id: 'public_bidding', name: 'Public Bidding', icon: '📢', description: 'Competitive bidding' },
    { id: 'negotiated', name: 'Negotiated Procurement', icon: '🤝', description: 'Direct negotiation' },
    { id: 'lease_of_venue', name: 'Lease of Venue', icon: '🏢', description: 'For venue rental contracts' }
];

const STEPS = [
    { id: 'ppmp', label: 'PPMP', description: 'Project management plan' },
    { id: 'app', label: 'APP', description: 'Procurement plan' },
    { id: 'pr', label: 'PR', description: 'Purchase request' },
    { id: 'type', label: 'Type', description: 'Procurement method' },
    { id: 'summary', label: 'Summary', description: 'Review details' }
];

const NewProcurementRecordModal = ({
    show,
    isOpen,
    onClose,
    onSuccess
}) => {
    const isModalOpen = show || isOpen;
    const [step, setStep] = useState('ppmp');
    const [submitting, setSubmitting] = useState(false);
    const [uploadProgress, setUploadProgress] = useState('');
    const [error, setError] = useState('');
    const [selectedType, setSelectedType] = useState(null);
    const [loadingFolderNo, setLoadingFolderNo] = useState(false);
    
    const [form, setForm] = useState({
        pr_no: '', // BAC Folder No.
        year: new Date().getFullYear().toString(),
        quarter: 'Q1',
        end_user_office: '', 
        title: '',
        source_of_fund: '',
        total_amount: '',
        ppmp_no: '',
        app_type: 'Final',
        app_no: '',
        app_remarks: '',
        user_pr_no: '',
        status: 'draft'
    });

    const [files, setFiles] = useState({
        ppmp: null,
        app: null,
        pr: null
    });
    
    const [errors, setErrors] = useState({});

    useEffect(() => {
        if (isModalOpen) {
            setForm({
                pr_no: '',
                year: new Date().getFullYear().toString(),
                quarter: 'Q1',
                end_user_office: '',
                title: '',
                source_of_fund: '',
                total_amount: '',
                ppmp_no: '',
                app_type: 'Final',
                app_no: '',
                app_remarks: '',
                user_pr_no: '',
                status: 'draft'
            });
            setFiles({ ppmp: null, app: null, pr: null });
            setStep('ppmp');
            setSelectedType(null);
            setError('');
            setErrors({});
            setUploadProgress('');
            fetchNextFolderNo();
        }
    }, [isModalOpen]);

    const fetchNextFolderNo = async () => {
        setLoadingFolderNo(true);
        try {
            const folderNo = await documentService.getNextTransactionNumber();
            setForm(prev => ({ ...prev, pr_no: folderNo }));
        } catch (err) {
            console.error('Failed to fetch next folder number:', err);
        } finally {
            setLoadingFolderNo(false);
        }
    };

    const validatePPMP = () => {
        const errs = {};
        if (!form.ppmp_no.trim()) errs.ppmp_no = 'PPMP No. is required';
        if (!form.year.trim()) errs.year = 'Year is required';
        if (!form.quarter.trim()) errs.quarter = 'Quarter is required';
        if (!form.title.trim()) errs.title = 'Project Title is required';
        if (!form.end_user_office.trim()) errs.end_user_office = 'Office / End-user is required';
        if (!form.total_amount || parseFloat(form.total_amount) <= 0) errs.total_amount = 'Budget is required';
        if (!files.ppmp) errs.ppmp_file = 'PPMP file upload is required';
        setErrors(errs);
        return Object.keys(errs).length === 0;
    };

    const validateAPP = () => {
        const errs = {};
        if (form.app_type === 'Updated') {
            if (!form.app_no.trim()) errs.app_no = 'APP No. is required for updated APP';
        }
        if (!files.app) errs.app_file = 'APP file upload is required';
        setErrors(errs);
        return Object.keys(errs).length === 0;
    };

    const validatePR = () => {
        const errs = {};
        if (!form.user_pr_no.trim()) errs.user_pr_no = 'PR No. is required';
        if (!form.title.trim()) errs.title = 'Purpose / Title is required';
        if (!form.total_amount || parseFloat(form.total_amount) <= 0) errs.total_amount = 'Amount is required';
        if (!form.source_of_fund.trim()) errs.source_of_fund = 'Fund Source is required';
        if (!files.pr) errs.pr_file = 'PR file upload is required';
        setErrors(errs);
        return Object.keys(errs).length === 0;
    };

    const formatError = (err) => {
        if (!err.response?.data) return err.message || 'An unexpected error occurred';
        const data = err.response.data;
        if (typeof data === 'string') return data;
        if (data.detail) return data.detail;
        
        // Handle field-level validation errors
        return Object.entries(data).map(([field, msgs]) => {
            const fieldName = field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            const msg = Array.isArray(msgs) ? msgs[0] : msgs;
            return `${fieldName}: ${msg}`;
        }).join('\n');
    };

    const handleSubmit = async () => {
        setSubmitting(true);
        setError('');
        setUploadProgress('Initializing folder...');
        
        let createdRecordId = null;
        const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
        const uploadedBy = currentUser.fullName || currentUser.username || 'Unknown';

        // Clean amount: remove commas
        const cleanAmount = form.total_amount ? form.total_amount.toString().replace(/,/g, '') : null;

        try {
            // 1. Create Procurement Record (BAC Folder)
            const recordData = {
                pr_no: form.pr_no,
                year: form.year,
                quarter: form.quarter,
                title: form.title,
                end_user_office: form.end_user_office,
                source_of_fund: form.source_of_fund,
                total_amount: cleanAmount,
                user_pr_no: form.user_pr_no,
                procurement_type: selectedType?.id || '',
                mode_of_procurement: selectedType?.name || '',
                remarks: form.app_remarks,
                status: 'draft',
                current_stage: 1
            };
            
            const record = await procurementRecordService.create(recordData);
            createdRecordId = record.id;
            
            // 2. Upload Documents
            const uploadDoc = async (file, subDoc, extraFields = {}) => {
                if (!file) return;
                const formData = new FormData();
                formData.append('file', file);
                formData.append('category', 'Initial Documents');
                formData.append('subDoc', subDoc);
                formData.append('title', `${subDoc} for ${record.pr_no}`);
                formData.append('prNo', record.pr_no);
                formData.append('year', record.year || '');
                formData.append('quarter', record.quarter || '');
                formData.append('uploadedBy', uploadedBy);
                
                Object.entries(extraFields).forEach(([key, value]) => {
                    formData.append(key, value);
                });
                
                return await documentService.create(formData, record.id);
            };

            // Detect official PR name based on type
            const isLeaseOrSVP = ['lease_of_venue', 'small_value'].includes(selectedType?.id);
            const prName = isLeaseOrSVP 
                ? 'Purchase Request (with # and received by FAD Records Section)' 
                : 'Purchase Request';

            setUploadProgress('Uploading PPMP...');
            await uploadDoc(files.ppmp, 'Project Procurement Management Plan/Supplemental PPMP', {
                ppmp_no: form.ppmp_no,
                title: form.title,
                total_amount: cleanAmount,
                source_of_fund: form.source_of_fund
            });

            setUploadProgress('Uploading APP...');
            await uploadDoc(files.app, 'Annual Procurement Plan', {
                app_type: form.app_type,
                app_no: form.app_no,
                title: `APP (${form.app_type}) for ${record.pr_no}`
            });

            setUploadProgress('Uploading PR...');
            await uploadDoc(files.pr, prName, {
                user_pr_no: form.user_pr_no,
                total_amount: cleanAmount,
                title: form.title,
                source_of_fund: form.source_of_fund
            });

            if (onSuccess) {
                onSuccess(record);
            }
            handleClose();
        } catch (err) {
            console.error('Submission error:', err);
            
            // Rollback: Delete the partially created folder if uploads failed
            if (createdRecordId) {
                try {
                    setUploadProgress('Cleaning up failed session...');
                    await procurementRecordService.delete(createdRecordId);
                } catch (cleanupErr) {
                    console.error('Rollback failed:', cleanupErr);
                }
            }

            setError(formatError(err));
        } finally {
            setSubmitting(false);
            setUploadProgress('');
        }
    };

    const handleClose = () => {
        onClose();
    };

    const updateField = (field, value) => {
        setForm(prev => ({ ...prev, [field]: value }));
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: null }));
        }
    };

    const handleFileChange = (field, file) => {
        setFiles(prev => ({ ...prev, [field]: file }));
        if (errors[`${field}_file`]) {
            setErrors(prev => ({ ...prev, [`${field}_file`]: null }));
        }
    };

    const stepIndex = STEPS.findIndex(s => s.id === step);

    const renderPPMPStep = () => (
        <div className="space-y-6">
            <div className="text-center mb-6">
                <span className="px-3 py-1 bg-[var(--primary)]/10 text-[var(--primary)] text-[10px] font-black uppercase tracking-widest rounded-full mb-2 inline-block">Step 1 of 5</span>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">PPMP Documentation</h3>
            </div>

            <div className="grid grid-cols-1 gap-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                            placeholder="PPMP Reference #"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                            <MdBusiness className="w-4 h-4" />
                            Office / End-user <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={form.end_user_office}
                            onChange={(e) => updateField('end_user_office', e.target.value)}
                            className={`w-full p-3 bg-white dark:bg-slate-900 border ${errors.end_user_office ? 'border-red-400' : 'border-slate-200 dark:border-slate-700'} rounded-xl focus:ring-2 focus:ring-[var(--primary)] outline-none transition-all`}
                            placeholder="e.g. Finance Section"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                            <MdEventNote className="w-4 h-4" />
                            Year <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={form.year}
                            onChange={(e) => updateField('year', e.target.value.replace(/[^0-9]/g, '').slice(0, 4))}
                            className={`w-full p-3 bg-white dark:bg-slate-900 border ${errors.year ? 'border-red-400' : 'border-slate-200 dark:border-slate-700'} rounded-xl focus:ring-2 focus:ring-[var(--primary)] outline-none transition-all text-center font-bold`}
                            placeholder="YYYY"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                            <MdHistory className="w-4 h-4" />
                            Quarter <span className="text-red-500">*</span>
                        </label>
                        <select
                            value={form.quarter}
                            onChange={(e) => updateField('quarter', e.target.value)}
                            className={`w-full p-3 bg-white dark:bg-slate-900 border ${errors.quarter ? 'border-red-400' : 'border-slate-200 dark:border-slate-700'} rounded-xl focus:ring-2 focus:ring-[var(--primary)] outline-none transition-all cursor-pointer font-bold`}
                        >
                            <option value="Q1">1st Quarter (Q1)</option>
                            <option value="Q2">2nd Quarter (Q2)</option>
                            <option value="Q3">3rd Quarter (Q3)</option>
                            <option value="Q4">4th Quarter (Q4)</option>
                        </select>
                    </div>
                </div>

                <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                        <MdTitle className="w-4 h-4" />
                        Project Title <span className="text-red-500">*</span>
                    </label>
                    <textarea
                        value={form.title}
                        onChange={(e) => updateField('title', e.target.value)}
                        className={`w-full p-3 bg-white dark:bg-slate-900 border ${errors.title ? 'border-red-400' : 'border-slate-200 dark:border-slate-700'} rounded-xl focus:ring-2 focus:ring-[var(--primary)] outline-none transition-all min-h-[80px]`}
                        placeholder="Enter the official project title from PPMP"
                    />
                </div>

                <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                        <MdAttachMoney className="w-4 h-4" />
                        Budget <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₱</span>
                        <input
                            type="text"
                            value={form.total_amount}
                            onChange={(e) => updateField('total_amount', toNumbersOnly(e.target.value))}
                            className={`w-full p-3 pl-7 bg-white dark:bg-slate-900 border ${errors.total_amount ? 'border-red-400' : 'border-slate-200 dark:border-slate-700'} rounded-xl focus:ring-2 focus:ring-[var(--primary)] outline-none transition-all font-mono`}
                            placeholder="0.00"
                        />
                    </div>
                </div>

                <div className="space-y-1 pt-2">
                    <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                        <MdFileUpload className="w-4 h-4" />
                        Upload PPMP File <span className="text-red-500">*</span>
                    </label>
                    <label className={`flex flex-col items-center justify-center p-6 border-2 border-dashed ${errors.ppmp_file ? 'border-red-400 bg-red-50' : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50'} rounded-2xl cursor-pointer transition-all`}>
                        <input type="file" className="hidden" onChange={(e) => handleFileChange('ppmp', e.target.files[0])} />
                        <MdFileShortcut className={`w-10 h-10 mb-2 ${files.ppmp ? 'text-green-500' : 'text-slate-400'}`} />
                        <span className="text-sm font-bold text-slate-600 dark:text-slate-300">
                            {files.ppmp ? files.ppmp.name : 'Select PDF or Scanned Document'}
                        </span>
                        <span className="text-xs text-slate-400 mt-1">Maximum size: 10MB</span>
                    </label>
                </div>
            </div>
        </div>
    );

    const renderAPPStep = () => (
        <div className="space-y-6">
            <div className="text-center mb-6">
                <span className="px-3 py-1 bg-[var(--primary)]/10 text-[var(--primary)] text-[10px] font-black uppercase tracking-widest rounded-full mb-2 inline-block">Step 2 of 5</span>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Annual Procurement Plan</h3>
                <p className="text-sm text-slate-500 mt-1">Ensure project is listed in the APP</p>
            </div>

            <div className="grid grid-cols-1 gap-5">
                <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                        <MdEventNote className="w-4 h-4" />
                        APP Type <span className="text-red-500">*</span>
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                        {['Final', 'Updated'].map((type) => (
                            <button
                                key={type}
                                type="button"
                                onClick={() => updateField('app_type', type)}
                                className={`p-3 rounded-xl border-2 font-bold text-sm transition-all ${
                                    form.app_type === type
                                        ? 'border-[var(--primary)] bg-[var(--primary)]/5 text-[var(--primary)]'
                                        : 'border-slate-100 dark:border-slate-800 text-slate-500 hover:border-slate-200'
                                }`}
                            >
                                {type} APP
                            </button>
                        ))}
                    </div>
                </div>

                <AnimatePresence mode="wait">
                    {form.app_type === 'Updated' && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="space-y-4 overflow-hidden"
                        >
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                                    <MdLabel className="w-4 h-4" />
                                    Updated APP No. <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={form.app_no}
                                    onChange={(e) => updateField('app_no', e.target.value)}
                                    className={`w-full p-3 bg-white dark:bg-slate-900 border ${errors.app_no ? 'border-red-400' : 'border-slate-200 dark:border-slate-700'} rounded-xl focus:ring-2 focus:ring-[var(--primary)] outline-none transition-all`}
                                    placeholder="e.g. 2024-001-Updated"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                                    <MdHistory className="w-4 h-4" />
                                    Remarks / Justification
                                </label>
                                <textarea
                                    value={form.app_remarks}
                                    onChange={(e) => updateField('app_remarks', e.target.value)}
                                    className="w-full p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-[var(--primary)] outline-none transition-all h-20"
                                    placeholder="Reasons for update or specific notes"
                                />
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                        <MdFileUpload className="w-4 h-4" />
                        Upload {form.app_type} APP File <span className="text-red-500">*</span>
                    </label>
                    <label className={`flex items-center gap-4 p-4 border-2 border-dashed ${errors.app_file ? 'border-red-400' : 'border-slate-200 dark:border-slate-700'} rounded-2xl cursor-pointer transition-all`}>
                        <input type="file" className="hidden" onChange={(e) => handleFileChange('app', e.target.files[0])} />
                        <div className="p-3 bg-[var(--primary)]/10 rounded-xl">
                            <MdFileShortcut className={`w-6 h-6 ${files.app ? 'text-green-500' : 'text-[var(--primary)]'}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <span className="block text-sm font-bold text-slate-700 dark:text-slate-200 truncate">
                                {files.app ? files.app.name : 'Select APP Document'}
                            </span>
                            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-black">Supported: PDF, PNG, JPG</span>
                        </div>
                    </label>
                </div>
            </div>
        </div>
    );

    const renderPRStep = () => (
        <div className="space-y-6">
            <div className="text-center mb-6">
                <span className="px-3 py-1 bg-[var(--primary)]/10 text-[var(--primary)] text-[10px] font-black uppercase tracking-widest rounded-full mb-2 inline-block">Step 3 of 5</span>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Purchase Request</h3>
                <p className="text-sm text-slate-500 mt-1">Final requisition details</p>
            </div>

            <div className="grid grid-cols-1 gap-4">
                <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                        <MdLabel className="w-4 h-4" />
                        PR No. <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="text"
                        value={form.user_pr_no}
                        onChange={(e) => updateField('user_pr_no', toNumbersOnly(e.target.value))}
                        className={`w-full p-3 bg-white dark:bg-slate-900 border ${errors.user_pr_no ? 'border-red-400' : 'border-slate-200 dark:border-slate-700'} rounded-xl focus:ring-2 focus:ring-[var(--primary)] outline-none transition-all`}
                        placeholder="Enter official PR number"
                    />
                </div>

                <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                        <MdTitle className="w-4 h-4" />
                        Purpose / Title <span className="text-red-500">*</span>
                    </label>
                    <textarea
                        value={form.title}
                        onChange={(e) => updateField('title', e.target.value)}
                        className={`w-full p-3 bg-white dark:bg-slate-900 border ${errors.title ? 'border-red-400' : 'border-slate-200 dark:border-slate-700'} rounded-xl focus:ring-2 focus:ring-[var(--primary)] outline-none transition-all min-h-[80px]`}
                        placeholder="Refine title or purpose as per PR document"
                    />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                            <MdAccountBalanceWallet className="w-4 h-4" />
                            Fund Source <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={form.source_of_fund}
                            onChange={(e) => updateField('source_of_fund', e.target.value)}
                            className={`w-full p-3 bg-white dark:bg-slate-900 border ${errors.source_of_fund ? 'border-red-400' : 'border-slate-200 dark:border-slate-700'} rounded-xl focus:ring-2 focus:ring-[var(--primary)] outline-none transition-all`}
                            placeholder="e.g. MOOE"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                            <MdAttachMoney className="w-4 h-4" />
                            Amount <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₱</span>
                            <input
                                type="text"
                                value={form.total_amount}
                                onChange={(e) => updateField('total_amount', toNumbersOnly(e.target.value))}
                                className={`w-full p-3 pl-7 bg-white dark:bg-slate-900 border ${errors.total_amount ? 'border-red-400' : 'border-slate-200 dark:border-slate-700'} rounded-xl focus:ring-2 focus:ring-[var(--primary)] outline-none transition-all font-mono`}
                                placeholder="0.00"
                            />
                        </div>
                    </div>
                </div>

                <div className="space-y-1 pt-2">
                    <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                        <MdFileUpload className="w-4 h-4" />
                        Upload PR File <span className="text-red-500">*</span>
                    </label>
                    <label className={`flex flex-col items-center justify-center p-6 border-2 border-dashed ${errors.pr_file ? 'border-red-400 bg-red-50' : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50'} rounded-2xl cursor-pointer transition-all`}>
                        <input type="file" className="hidden" onChange={(e) => handleFileChange('pr', e.target.files[0])} />
                        <MdFileShortcut className={`w-10 h-10 mb-2 ${files.pr ? 'text-green-500' : 'text-slate-400'}`} />
                        <span className="text-sm font-bold text-slate-600 dark:text-slate-300">
                            {files.pr ? files.pr.name : 'Select Requisition Document'}
                        </span>
                    </label>
                </div>
            </div>
        </div>
    );

    const renderTypeStep = () => (
        <div className="space-y-6">
            <div className="text-center mb-6">
                <span className="px-3 py-1 bg-[var(--primary)]/10 text-[var(--primary)] text-[10px] font-black uppercase tracking-widest rounded-full mb-2 inline-block">Step 4 of 5</span>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Procurement Type</h3>
                <p className="text-sm text-slate-500 mt-1">Select the procurement method to be used</p>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {PROCUREMENT_TYPES.map((type) => (
                    <button
                        key={type.id}
                        type="button"
                        onClick={() => {
                            setSelectedType(type);
                            if (errors.type) setErrors(prev => ({ ...prev, type: '' }));
                        }}
                        className={`p-4 rounded-xl border-2 transition-all text-left group relative ${
                            selectedType?.id === type.id
                                ? 'border-[var(--primary)] bg-[var(--primary)]/5'
                                : 'border-slate-200 dark:border-slate-700 hover:border-[var(--primary)]/50 hover:bg-slate-50/50'
                        }`}
                    >
                        <div className="flex items-start gap-4">
                            <span className="text-3xl filter grayscale group-hover:grayscale-0 transition-all">{type.icon}</span>
                            <div>
                                <h4 className="font-bold text-slate-900 dark:text-white group-hover:text-[var(--primary)] transition-colors">{type.name}</h4>
                                <p className="text-xs text-slate-500 mt-1 leading-relaxed">{type.description}</p>
                            </div>
                            {selectedType?.id === type.id && (
                                <MdCheckCircle className="w-5 h-5 text-[var(--primary)] ml-auto" />
                            )}
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );

    const renderSummaryStep = () => (
        <div className="space-y-6">
            <div className="text-center mb-6">
                <span className="px-3 py-1 bg-[var(--primary)]/10 text-[var(--primary)] text-[10px] font-black uppercase tracking-widest rounded-full mb-2 inline-block">Step 5 of 5</span>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Review Summary</h3>
                <p className="text-sm text-slate-500 mt-1">Verify all documentation details</p>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl overflow-hidden border border-slate-100 dark:border-slate-800">
                <div className="p-4 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Project Overview</span>
                    </div>
                    <span className="px-3 py-1 bg-[var(--primary)]/10 text-[var(--primary)] text-[10px] font-black uppercase rounded-lg">
                        {selectedType?.name || 'Method Unselected'}
                    </span>
                </div>

                <div className="p-6 space-y-6">
                    <div className="grid grid-cols-2 gap-x-8 gap-y-6">
                        <div>
                            <span className="block text-[10px] uppercase font-black text-slate-400 tracking-wider mb-1">Office / End-User</span>
                            <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{form.end_user_office}</span>
                        </div>
                        <div>
                            <span className="block text-[10px] uppercase font-black text-slate-400 tracking-wider mb-1">ABC (Budget)</span>
                            <span className="text-sm font-black text-emerald-600 font-mono">₱{formatCurrencyValue(form.total_amount)}</span>
                        </div>
                        <div className="col-span-2">
                            <span className="block text-[10px] uppercase font-black text-slate-400 tracking-wider mb-1">Title / Purpose</span>
                            <p className="text-sm font-bold text-slate-700 dark:text-slate-200 leading-relaxed italic border-l-2 border-[var(--primary)]/30 pl-3">
                                "{form.title}"
                            </p>
                        </div>
                    </div>

                    <div className="pt-6 border-t border-slate-200 dark:border-slate-700">
                        <span className="block text-[10px] uppercase font-black text-slate-400 tracking-wider mb-3">Planning Documentation</span>
                        <div className="grid grid-cols-3 gap-3 text-center">
                            <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
                                <span className="block text-[8px] uppercase font-black text-slate-400 mb-1">PPMP #</span>
                                <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{form.ppmp_no}</span>
                            </div>
                            <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
                                <span className="block text-[8px] uppercase font-black text-slate-400 mb-1">APP TYPE</span>
                                <span className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase">{form.app_type}</span>
                            </div>
                            <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
                                <span className="block text-[8px] uppercase font-black text-slate-400 mb-1">PR #</span>
                                <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{form.user_pr_no}</span>
                            </div>
                        </div>
                    </div>

                    <div className="p-4 bg-emerald-50 dark:bg-emerald-900/10 rounded-xl border border-emerald-100 dark:border-emerald-800 flex items-center gap-3">
                        <MdCheckCircle className="w-5 h-5 text-emerald-500" />
                        <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">All 3 required planning documents are ready for upload.</span>
                    </div>
                </div>
            </div>
            
            {uploadProgress && (
                <div className="flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-2xl animate-pulse">
                    <div className="w-5 h-5 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin shrink-0" />
                    <p className="text-sm font-bold text-blue-600 dark:text-blue-400">{uploadProgress}</p>
                </div>
            )}
        </div>
    );

    const renderFooter = () => (
        <div className="flex items-center justify-between w-full">
            <div className="flex-1">
                {step !== 'ppmp' && !submitting && (
                    <button
                        type="button"
                        onClick={() => {
                            const steps_order = ['ppmp', 'app', 'pr', 'type', 'summary'];
                            const currentIdx = steps_order.indexOf(step);
                            setStep(steps_order[currentIdx - 1]);
                        }}
                        className="btn-secondary flex items-center gap-2 group"
                    >
                        <MdArrowBack className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
                        Back
                    </button>
                )}
            </div>

            <div className="flex-1 flex justify-end">
                {step === 'ppmp' && (
                    <button
                        type="button"
                        onClick={() => {
                            if (validatePPMP()) setStep('app');
                        }}
                        className="btn-primary flex items-center gap-2 group shadow-lg shadow-[var(--primary)]/20"
                    >
                        Proceed to APP
                        <MdArrowForward className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                    </button>
                )}

                {step === 'app' && (
                    <button
                        type="button"
                        onClick={() => {
                            if (validateAPP()) setStep('pr');
                        }}
                        className="btn-primary flex items-center gap-2 group shadow-lg shadow-[var(--primary)]/20"
                    >
                        Proceed to PR
                        <MdArrowForward className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                    </button>
                )}

                {step === 'pr' && (
                    <button
                        type="button"
                        onClick={() => {
                            if (validatePR()) setStep('type');
                        }}
                        className="btn-primary flex items-center gap-2 group shadow-lg shadow-[var(--primary)]/20"
                    >
                        Select Method
                        <MdArrowForward className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                    </button>
                )}

                {step === 'type' && (
                    <button
                        type="button"
                        onClick={() => {
                            if (selectedType) setStep('summary');
                            else setError('Please select a procurement method');
                        }}
                        className="btn-primary flex items-center gap-2 group shadow-lg shadow-[var(--primary)]/20"
                    >
                        Review Summary
                        <MdArrowForward className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                    </button>
                )}

                {step === 'summary' && (
                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={submitting}
                        className="btn-primary flex items-center gap-2 group shadow-xl shadow-[var(--primary)]/30"
                    >
                        {submitting ? 'Initializing...' : 'Complete & Save'}
                        <MdSave className="w-4 h-4 transition-all group-hover:scale-110" />
                    </button>
                )}
            </div>
        </div>
    );

    if (!isModalOpen) return null;

    return (
        <Modal
            isOpen={isModalOpen}
            onClose={handleClose}
            title="New Procurement Folder"
            size="lg"
            className="p-0 overflow-hidden bg-white dark:bg-slate-900"
            footer={renderFooter()}
        >
            <div className="flex flex-col h-full max-h-[85vh]">
                <div className="flex-1 overflow-y-auto custom-scrollbar p-6 sm:p-10">
                    {error && (
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="mb-8 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl flex items-center gap-3"
                        >
                            <MdInfo className="w-5 h-5 text-red-500 shrink-0" />
                            <p className="text-sm font-semibold text-red-600 dark:text-red-400">{error}</p>
                        </motion.div>
                    )}

                    <AnimatePresence mode="wait">
                        <motion.div
                            key={step}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.3, ease: 'easeOut' }}
                            className="max-w-xl mx-auto"
                        >
                            {step === 'ppmp' ? renderPPMPStep() : 
                             step === 'app' ? renderAPPStep() : 
                             step === 'pr' ? renderPRStep() : 
                             step === 'type' ? renderTypeStep() : 
                             step === 'summary' ? renderSummaryStep() : null}
                        </motion.div>
                    </AnimatePresence>
                </div>
            </div>
        </Modal>
    );
};

export default NewProcurementRecordModal;
