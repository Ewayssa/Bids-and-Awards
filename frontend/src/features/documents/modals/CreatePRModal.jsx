import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    MdSave, MdInfo, MdLabel, MdAdd, MdDelete, MdReceipt,
    MdCloudUpload, MdClose, MdDescription, MdAttachFile
} from 'react-icons/md';
import Modal from '../../../components/Modal';
import { documentService, procurementRecordService, purchaseRequestService } from '../../../services/api';
import { createPR_PDFFile, generatePR_Excel } from '../../../utils/prGenerator';

const CreatePRModal = ({
    show,
    isOpen,
    onClose,
    onSuccess
}) => {
    const isModalOpen = show || isOpen;
    const [submitting, setSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [savedPRData, setSavedPRData] = useState(null);
    const [error, setError] = useState('');
    const [errors, setErrors] = useState({});

    const [items, setItems] = useState([
        { id: Date.now(), unit: '', description: '', quantity: 1, unit_cost: 0 }
    ]);

    // Linking fields
    const [availablePPMPs, setAvailablePPMPs] = useState([]);
    const [loadingPPMPs, setLoadingPPMPs] = useState(false);
    const [selectedPPMP, setSelectedPPMP] = useState(null);
    const [form, setForm] = useState({
        ppmp_id: '',
        ppmp_no: '',
        purpose: '',
        title: ''
    });

    const [showAttachmentsPopover, setShowAttachmentsPopover] = useState(false);
    const [optionalFiles, setOptionalFiles] = useState({
        'Activity Design': null,
        'Market Scoping': null,
        'Requisition and Issue Slip': null
    });
    const fileInputRef = useRef(null);
    const [activeUploadType, setActiveUploadType] = useState(null);

    const handleFileSelect = (type) => {
        setActiveUploadType(type);
        if (fileInputRef.current) fileInputRef.current.click();
    };

    const onFileChange = (e) => {
        const file = e.target.files[0];
        if (file && activeUploadType) {
            setOptionalFiles(prev => ({ ...prev, [activeUploadType]: file }));
        }
        e.target.value = null; // reset
        setShowAttachmentsPopover(false);
    };

    const removeFile = (type) => {
        setOptionalFiles(prev => ({ ...prev, [type]: null }));
    };

    useEffect(() => {
        if (isModalOpen) {
            setItems([{ id: Date.now(), unit: '', description: '', quantity: 1, unit_cost: 0 }]);
            setError('');
            setErrors({});
            setForm({ ppmp_id: '', ppmp_no: '', purpose: '', title: '' });
            setOptionalFiles({
                'Activity Design': null,
                'Market Scoping': null,
                'Requisition and Issue Slip': null
            });

            // Fetch PPMPs for dropdown
            setLoadingPPMPs(true);
            procurementRecordService.getAll()
                .then(data => {
                    setAvailablePPMPs(data);
                })
                .catch(err => console.error('Failed to fetch PPMPs:', err))
                .finally(() => setLoadingPPMPs(false));
        }
    }, [isModalOpen]);

    const handleAddItem = () => {
        setItems(prev => [...prev, { id: Date.now(), unit: '', description: '', quantity: 1, unit_cost: 0 }]);
    };

    const handleRemoveItem = (idToRemove) => {
        if (items.length > 1) {
            setItems(prev => prev.filter(item => item.id !== idToRemove));
        }
    };

    const handleItemChange = (id, field, value) => {
        setItems(prev => prev.map(item => {
            if (item.id === id) {
                return { ...item, [field]: value };
            }
            return item;
        }));
    };

    const calculateTotal = () => {
        return items.reduce((acc, item) => acc + ((parseFloat(item.quantity) || 0) * (parseFloat(item.unit_cost) || 0)), 0);
    };

    const validateForm = () => {
        const errs = {};

        if (!form.ppmp_id) errs.ppmp_id = 'Please select an associated PPMP';
        if (!form.purpose.trim()) errs.purpose = 'Please provide a purpose for this request';

        const hasEmptyItems = items.some(item => !item.description.trim() || !item.unit.trim() || item.quantity <= 0 || item.unit_cost <= 0);
        if (hasEmptyItems) {
            errs.items = 'Please ensure all line items have valid descriptions, units, quantities, and costs.';
        }

        setErrors(errs);
        return Object.keys(errs).length === 0;
    };

    const handleSubmit = async () => {
        if (!validateForm()) return;

        setSubmitting(true);
        setError('');

        try {
            const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
            const created_by = currentUser.fullName || currentUser.username || 'Unknown';

            // 1. Create the structured Purchase Request
            const prPayload = {
                ppmp: form.ppmp_id,
                pr_no: '', // Will be assigned later by BAC member
                purpose: form.purpose,
                grand_total: calculateTotal(),
                status: 'ongoing',
                items: items.map(item => ({
                    unit: item.unit,
                    description: item.description,
                    quantity: parseFloat(item.quantity),
                    unit_cost: parseFloat(item.unit_cost),
                    total: (parseFloat(item.quantity) || 0) * (parseFloat(item.unit_cost) || 0)
                }))
            };

            let newPR;
            try {
                newPR = await purchaseRequestService.create(prPayload);
            } catch (prErr) {
                console.error('Purchase Request (Relational) Error:', prErr);
                const backendMsg = prErr.response?.data?.error || prErr.response?.data?.detail || prErr.message;
                throw new Error(`Failed to create database record: ${typeof backendMsg === 'object' ? JSON.stringify(backendMsg) : backendMsg}`);
            }

            // 2. Prepare legacy Document for PDF storage
            const formData = new FormData();
            formData.append('category', 'Initial Documents');
            formData.append('subDoc', 'Purchase Request');
            formData.append('title', form.purpose || form.title || `PR for ${form.ppmp_no}`);
            formData.append('ppmp_no', form.ppmp_no);
            formData.append('prNo', ''); 
            formData.append('user_pr_no', ''); 
            formData.append('total_amount', calculateTotal());
            formData.append('date', new Date().toISOString().slice(0, 10));
            formData.append('pr_items', JSON.stringify(items));
            formData.append('uploadedBy', created_by);

            const prData = {
                items,
                total: calculateTotal(),
                ppmp_no: form.ppmp_no,
                prNo: '', // Not assigned yet
                purpose: form.purpose,
                title: form.purpose || form.title || `PR for ${form.ppmp_no}`,
                office: selectedPPMP?.end_user_office || '',
                date: new Date()
            };

            try {
                const pdfFile = await createPR_PDFFile(prData);
                formData.append('file', pdfFile);
            } catch (pdfErr) {
                console.error('PDF Generation Error:', pdfErr);
                throw new Error('Failed to generate the formal PR document (PDF).');
            }

            try {
                await documentService.create(formData);
            } catch (docErr) {
                console.error('Document Upload (Legacy) Error:', docErr);
                const backendMsg = docErr.response?.data?.error || docErr.response?.data?.detail || docErr.message;
                throw new Error(`Failed to upload PR document to storage: ${typeof backendMsg === 'object' ? JSON.stringify(backendMsg) : backendMsg}`);
            }

            // Upload optional files
            for (const [subDocType, file] of Object.entries(optionalFiles)) {
                if (file) {
                    const optFormData = new FormData();
                    optFormData.append('category', 'Initial Documents');
                    optFormData.append('subDoc', subDocType);
                    optFormData.append('title', `${subDocType} for ${form.ppmp_no}`);
                    optFormData.append('ppmp_no', form.ppmp_no);
                    optFormData.append('prNo', '');
                    optFormData.append('user_pr_no', '');
                    optFormData.append('file', file);
                    optFormData.append('date', new Date().toISOString().slice(0, 10));
                    optFormData.append('uploadedBy', created_by);
                    try {
                        await documentService.create(optFormData);
                    } catch (optErr) {
                        console.error(`Failed to upload ${subDocType}:`, optErr);
                    }
                }
            }

            setSavedPRData(prData);
            setIsSuccess(true);

            if (onSuccess) {
                onSuccess(prData);
            }
        } catch (err) {
            console.error('Submission error:', err);
            const msg = err.response?.data?.error || err.message || 'Failed to create PR and supporting documents.';
            setError(typeof msg === 'object' ? JSON.stringify(msg) : msg);
        } finally {
            setSubmitting(false);
        }
    };

    const formatCurrency = (val) => {
        return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(val);
    };

    const renderFooter = () => {
        if (isSuccess) {
            return (
                <div className="flex items-center justify-end w-full gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-6 py-2.5 rounded-xl font-bold text-slate-500 hover:bg-slate-100 transition-all"
                    >
                        Close
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            try {
                                let items = [];
                                if (typeof savedPRData.items === 'string' && savedPRData.items.trim()) {
                                    items = JSON.parse(savedPRData.items);
                                } else if (Array.isArray(savedPRData.items)) {
                                    items = savedPRData.items;
                                }

                                const prData = {
                                    items: items,
                                    total: savedPRData.total,
                                    ppmp_no: savedPRData.ppmp_no,
                                    prNo: '',
                                    title: savedPRData.title,
                                    office: savedPRData.office || '',
                                    purpose: savedPRData.purpose || ''
                                };
                                generatePR_PDF(prData);
                            } catch (err) {
                                console.error('Download failed:', err);
                                alert('Could not generate PDF. You can try downloading it from the PR list later.');
                            }
                        }}
                        className="btn-primary flex items-center gap-2 shadow-lg shadow-emerald-500/20 px-8 py-2.5 bg-emerald-600 hover:bg-emerald-700"
                    >
                        Download PR Document (PDF)
                        <MdReceipt className="w-4 h-4" />
                    </button>
                </div>
            );
        }

        return (
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
                    {submitting ? 'Saving...' : 'Save Purchase Request'}
                    <MdSave className="w-4 h-4" />
                </button>
            </div>
        );
    };

    if (!isModalOpen) return null;

    return (
        <Modal
            isOpen={isModalOpen}
            onClose={onClose}
            title="Create Purchase Request"
            size="auto"
            containerClassName="w-[min(95vw,900px)] h-[min(90vh,750px)] flex flex-col !rounded-3xl overflow-hidden shadow-2xl bg-white dark:bg-slate-900"
            bodyClassName="flex-1 overflow-y-auto custom-scrollbar p-0"
            footer={renderFooter()}
        >
            <div className="flex flex-col h-full bg-slate-50/50 dark:bg-slate-900/50">
                <div className="p-6 sm:p-8 space-y-6">
                    {isSuccess && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="flex flex-col items-center justify-center py-10 space-y-4 text-center"
                        >
                            <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded-full flex items-center justify-center">
                                <MdReceipt className="w-10 h-10" />
                            </div>
                            <div className="space-y-1">
                                <h3 className="text-xl font-bold text-slate-900 dark:text-white">Purchase Request Saved!</h3>
                                <p className="text-slate-500 dark:text-slate-400">The PR has been successfully recorded in the system. You can now download the formal document.</p>
                            </div>
                        </motion.div>
                    )}

                    <AnimatePresence>
                        {!isSuccess && error && (
                            <motion.div
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ 
                                    opacity: 1, 
                                    x: [0, -5, 5, -5, 5, 0], // Shake effect
                                    scale: 1 
                                }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ duration: 0.4 }}
                                className="p-5 bg-red-50 dark:bg-red-900/30 border-2 border-red-200 dark:border-red-800 rounded-3xl flex items-start gap-4 shadow-lg shadow-red-500/5 group"
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

                    {/* Connection & Attachments Section */}
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-start">
                        <div className="space-y-1 sm:col-span-4">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                                <MdLabel className="w-3.5 h-3.5" />
                                Select PPMP No. <span className="text-red-500">*</span>
                            </label>
                            <select
                                value={form.ppmp_id}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    const found = availablePPMPs.find(p => String(p.id) === val);
                                    setSelectedPPMP(found);
                                    setForm(prev => ({
                                        ...prev,
                                        ppmp_id: val,
                                        ppmp_no: found ? found.ppmp_no : '',
                                        title: found ? found.title : prev.title
                                    }));
                                    if (errors.ppmp_id) setErrors(prev => ({ ...prev, ppmp_id: null }));
                                }}
                                disabled={loadingPPMPs}
                                className={`w-full p-4 bg-white dark:bg-slate-900 border-2 ${errors.ppmp_id ? 'border-red-200 bg-red-50/30' : 'border-slate-100 dark:border-slate-800'} rounded-2xl focus:border-[var(--primary)] outline-none transition-all cursor-pointer font-bold text-sm shadow-sm`}
                            >
                                <option value="" disabled>
                                    {loadingPPMPs ? 'Loading PPMPs...' : 'Select associated PPMP'}
                                </option>
                                {availablePPMPs.map((ppmp, idx) => (
                                    <option key={ppmp.id} value={ppmp.id}>
                                        PPMP No. {ppmp.ppmp_no} — {ppmp.title}
                                    </option>
                                ))}
                            </select>
                            {errors.ppmp_id && <span className="text-[10px] text-red-500 font-bold ml-1">{errors.ppmp_id}</span>}
                        </div>

                        {/* Purpose Field */}
                        <div className="space-y-1 sm:col-span-6">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                                <MdDescription className="w-3.5 h-3.5" />
                                Purpose <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={form.purpose}
                                onChange={(e) => {
                                    setForm(prev => ({ ...prev, purpose: e.target.value }));
                                    if (errors.purpose) setErrors(prev => ({ ...prev, purpose: null }));
                                }}
                                className={`w-full p-4 bg-white dark:bg-slate-900 border-2 ${errors.purpose ? 'border-red-200 bg-red-50/30' : 'border-slate-100 dark:border-slate-800'} rounded-2xl focus:border-[var(--primary)] outline-none transition-all font-bold text-sm shadow-sm`}
                                placeholder="Enter the purpose of this request..."
                            />
                            {errors.purpose && <span className="text-[10px] text-red-500 font-bold ml-1">{errors.purpose}</span>}
                        </div>

                        <div className="sm:col-span-2 space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                                <MdAttachFile className="w-3.5 h-3.5" />
                                Attach
                            </label>
                            <div className="relative">
                                <button
                                    type="button"
                                    onClick={() => setShowAttachmentsPopover(!showAttachmentsPopover)}
                                    className="w-full h-[54px] px-4 bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-800 rounded-2xl font-bold text-sm text-slate-600 dark:text-slate-300 flex items-center justify-center gap-2 hover:border-[var(--primary)] hover:text-[var(--primary)] transition-all shadow-sm"
                                >
                                    <MdCloudUpload className="w-5 h-5 text-slate-400 group-hover:text-[var(--primary)]" />
                                    Upload
                                    {Object.values(optionalFiles).filter(Boolean).length > 0 && (
                                        <span className="ml-1 w-5 h-5 rounded-full bg-[var(--primary)] text-white text-[10px] flex items-center justify-center">
                                            {Object.values(optionalFiles).filter(Boolean).length}
                                        </span>
                                    )}
                                </button>

                            <AnimatePresence>
                                {showAttachmentsPopover && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: 10 }}
                                        className="absolute right-0 top-[calc(100%+8px)] w-64 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-xl rounded-2xl z-50 overflow-hidden"
                                    >
                                        <div className="p-2 space-y-1">
                                            {['Activity Design', 'Market Scoping', 'Requisition and Issue Slip']
                                                .filter(type => !optionalFiles[type])
                                                .map((type) => (
                                                <button
                                                    key={type}
                                                    type="button"
                                                    onClick={() => handleFileSelect(type)}
                                                    className="w-full text-left px-3 py-2 text-sm font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl transition-colors flex justify-between items-center group"
                                                >
                                                    <span className="truncate">{type === 'Requisition and Issue Slip' ? 'RIS' : type}</span>
                                                    <MdCloudUpload className="w-4 h-4 text-slate-400 group-hover:text-[var(--primary)] transition-colors" />
                                                </button>
                                            ))}
                                            {['Activity Design', 'Market Scoping', 'Requisition and Issue Slip'].every(type => optionalFiles[type]) && (
                                                <div className="px-3 py-2 text-xs font-bold text-slate-400 text-center">
                                                    All documents attached
                                                </div>
                                            )}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <input
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
                                onChange={onFileChange}
                            />
                        </div>
                    </div>
                </div>

                {/* Show selected optional files */}
                    {Object.entries(optionalFiles).some(([_, file]) => file) && (
                        <div className="flex flex-wrap gap-2 pt-2">
                            {Object.entries(optionalFiles).map(([type, file]) => {
                                if (!file) return null;
                                return (
                                    <div key={type} className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg max-w-[200px]">
                                        <MdAttachFile className="w-4 h-4 text-slate-400 shrink-0" />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest truncate">{type === 'Requisition and Issue Slip' ? 'RIS' : type}</p>
                                            <p className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate">{file.name}</p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => removeFile(type)}
                                            className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500 rounded-md transition-colors"
                                        >
                                            <MdClose className="w-4 h-4" />
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Table Section */}
                    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden flex flex-col">
                        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
                            <div />
                            <button
                                type="button"
                                onClick={handleAddItem}
                                className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 bg-[var(--primary)]/10 text-[var(--primary)] rounded-lg hover:bg-[var(--primary)]/20 transition-all"
                            >
                                <MdAdd className="w-4 h-4" /> Add Row
                            </button>
                        </div>

                        {errors.items && (
                            <div className="px-6 py-3 bg-red-50 dark:bg-red-900/10 border-b border-red-100 dark:border-red-800">
                                <p className="text-xs font-bold text-red-500">{errors.items}</p>
                            </div>
                        )}

                        <div className="overflow-x-auto">
                            <table className="w-full border-separate border-spacing-0 table-fixed bg-white dark:bg-slate-900">
                                <colgroup>
                                    <col className="w-24" />
                                    <col className="w-auto" />
                                    <col className="w-24" />
                                    <col className="w-32" />
                                    <col className="w-32" />
                                    <col className="w-16" />
                                </colgroup>
                                <thead className="table-header">
                                    <tr>
                                        <th className="table-th !text-center !px-4">Unit</th>
                                        <th className="table-th !text-center !px-4">Description</th>
                                        <th className="table-th !text-center !px-4">Qty</th>
                                        <th className="table-th !text-center !px-4">Unit Cost</th>
                                        <th className="table-th !text-center !px-4">Total</th>
                                        <th className="table-th !px-4"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <AnimatePresence>
                                        {items.map((item, index) => {
                                            const rowTotal = (parseFloat(item.quantity) || 0) * (parseFloat(item.unit_cost) || 0);
                                            return (
                                                <motion.tr
                                                    key={item.id}
                                                    initial={{ opacity: 0, y: -10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0, scale: 0.95 }}
                                                    transition={{ duration: 0.2 }}
                                                    className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors group"
                                                >
                                                    <td className="table-td align-middle !py-3 !px-4 border-b border-slate-100 dark:border-slate-700/50">
                                                        <input
                                                            type="text"
                                                            value={item.unit}
                                                            onChange={(e) => handleItemChange(item.id, 'unit', e.target.value)}
                                                            className="w-full p-2 text-xs text-center bg-transparent border border-transparent rounded-lg hover:border-slate-200 focus:bg-white focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] outline-none transition-all font-bold"
                                                            placeholder="pc"
                                                        />
                                                    </td>
                                                    <td className="table-td align-middle !py-3 !px-4 border-b border-slate-100 dark:border-slate-700/50">
                                                        <textarea
                                                            value={item.description}
                                                            onChange={(e) => handleItemChange(item.id, 'description', e.target.value)}
                                                            rows={1}
                                                            className="w-full p-2 text-xs text-center bg-transparent border border-transparent rounded-lg hover:border-slate-200 focus:bg-white focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] outline-none transition-all resize-none min-h-[38px] overflow-hidden font-bold"
                                                            placeholder="Item details..."
                                                            onInput={(e) => {
                                                                e.target.style.height = 'auto';
                                                                e.target.style.height = (e.target.scrollHeight) + 'px';
                                                            }}
                                                        />
                                                    </td>
                                                    <td className="table-td align-middle !py-3 !px-4 border-b border-slate-100 dark:border-slate-700/50">
                                                        <input
                                                            type="number"
                                                            min="1"
                                                            value={item.quantity}
                                                            onChange={(e) => handleItemChange(item.id, 'quantity', e.target.value)}
                                                            className="w-full p-2 text-xs text-center font-mono bg-transparent border border-transparent rounded-lg hover:border-slate-200 focus:bg-white focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] outline-none transition-all font-bold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                        />
                                                    </td>
                                                    <td className="table-td align-middle !py-3 !px-4 border-b border-slate-100 dark:border-slate-700/50">
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            step="0.01"
                                                            value={item.unit_cost}
                                                            onChange={(e) => handleItemChange(item.id, 'unit_cost', e.target.value)}
                                                            className="w-full p-2 text-xs text-center font-mono bg-transparent border border-transparent rounded-lg hover:border-slate-200 focus:bg-white focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] outline-none transition-all font-bold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                        />
                                                    </td>
                                                    <td className="table-td align-middle !py-3 !px-4 border-b border-slate-100 dark:border-slate-700/50">
                                                        <div className="p-2 text-xs text-center font-black text-slate-700 dark:text-slate-300 truncate">
                                                            {formatCurrency(rowTotal)}
                                                        </div>
                                                    </td>
                                                    <td className="table-td align-middle !text-center !py-3 !px-4 border-b border-slate-100 dark:border-slate-700/50">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRemoveItem(item.id)}
                                                            disabled={items.length === 1}
                                                            className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all disabled:opacity-0"
                                                            title="Remove"
                                                        >
                                                            <MdDelete className="w-4 h-4" />
                                                        </button>
                                                    </td>
                                                </motion.tr>
                                            );
                                        })}
                                    </AnimatePresence>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Bottom Section: Total */}
                    <div className="flex items-center justify-end pt-6 border-t border-slate-200/60 dark:border-slate-800/60 px-2">
                        <div className="flex items-center gap-2 text-right">
                            <span className="text-sm font-bold text-slate-500">Grand Total:</span>
                            <span className="text-xl font-black text-emerald-600 tracking-tight">
                                {formatCurrency(calculateTotal())}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </Modal>
    );
};

export default CreatePRModal;
