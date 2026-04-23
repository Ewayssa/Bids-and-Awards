import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    MdSave, MdInfo, MdLabel, MdAdd, MdDelete, MdReceipt,
    MdCloudUpload, MdClose, MdDescription, MdAttachFile
} from 'react-icons/md';
import Modal from '../../../components/Modal';
import { documentService } from '../../../services/api';
import { generatePR_Excel } from '../../../utils/prGenerator';

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
        ppmp_no: '',
        prNo: '',
        title: ''
    });

    const [supportingFiles, setSupportingFiles] = useState({
        activityDesign: null,
        ris: null,
        marketScoping: null
    });
    const [showAttachmentsPopover, setShowAttachmentsPopover] = useState(false);

    useEffect(() => {
        if (isModalOpen) {
            setItems([{ id: Date.now(), unit: '', description: '', quantity: 1, unit_cost: 0 }]);
            setError('');
            setErrors({});
            setSelectedPPMP(null);
            setForm({ ppmp_no: '', prNo: '', title: '' });

            // Fetch PPMPs for dropdown
            setLoadingPPMPs(true);
            documentService.getAll({
                subDoc: 'Project Procurement Management Plan/Supplemental PPMP'
            })
                .then(data => {
                    const uniquePPMPs = [];
                    const seen = new Set();
                    data.forEach(item => {
                        if (item.ppmp_no && !seen.has(item.ppmp_no)) {
                            seen.add(item.ppmp_no);
                            uniquePPMPs.push({
                                ppmp_no: item.ppmp_no,
                                prNo: item.prNo,
                                title: item.title,
                                end_user_office: item.end_user_office
                            });
                        }
                    });
                    setAvailablePPMPs(uniquePPMPs);
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

        if (!form.ppmp_no) errs.ppmp_no = 'Please select an associated PPMP';

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
            const formData = new FormData();
            formData.append('category', 'Initial Documents');
            formData.append('subDoc', 'Purchase Request');
            formData.append('title', form.title || `PR for ${form.ppmp_no}`);
            formData.append('ppmp_no', form.ppmp_no);
            formData.append('prNo', form.prNo);
            formData.append('total_amount', calculateTotal());

            // Save the line items as a JSON string
            formData.append('pr_items', JSON.stringify(items));

            const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
            formData.append('uploadedBy', currentUser.fullName || currentUser.username || 'Unknown');

            const prResponse = await documentService.create(formData);
            const procurementRecordId = prResponse.procurement_record || null;

            // Handle supporting documents
            const supportDocs = [
                { file: supportingFiles.activityDesign, subDoc: 'Activity Design' },
                { file: supportingFiles.ris, subDoc: 'Requisition and Issue Slip' },
                { file: supportingFiles.marketScoping, subDoc: 'Market Scoping' }
            ];

            for (const doc of supportDocs) {
                if (doc.file) {
                    const supportFormData = new FormData();
                    supportFormData.append('category', 'Initial Documents');
                    supportFormData.append('subDoc', doc.subDoc);
                    supportFormData.append('title', `${doc.subDoc} for ${form.ppmp_no}`);
                    supportFormData.append('ppmp_no', form.ppmp_no);
                    supportFormData.append('prNo', form.prNo);
                    supportFormData.append('file', doc.file);
                    supportFormData.append('uploadedBy', currentUser.fullName || currentUser.username || 'Unknown');
                    
                    await documentService.create(supportFormData, procurementRecordId);
                }
            }

            const prData = {
                items,
                total: calculateTotal(),
                ppmp_no: form.ppmp_no,
                prNo: form.prNo,
                title: form.title || `PR for ${form.ppmp_no}`,
                office: selectedPPMP?.end_user_office || ''
            };
            setSavedPRData(prData);
            setIsSuccess(true);

            if (onSuccess) {
                onSuccess(prData);
            }
        } catch (err) {
            console.error('Submission error:', err);
            setError(err.response?.data?.error || 'Failed to create PR and supporting documents. Please try again.');
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
                                    prNo: savedPRData.prNo || '',
                                    title: savedPRData.title,
                                    office: savedPRData.office || ''
                                };
                                generatePR_Excel(prData);
                            } catch (err) {
                                console.error('Download failed:', err);
                                alert('Could not generate Excel. You can try downloading it from the PR list later.');
                            }
                        }}
                        className="btn-primary flex items-center gap-2 shadow-lg shadow-emerald-500/20 px-8 py-2.5 bg-emerald-600 hover:bg-emerald-700"
                    >
                        Download PR Document (Excel)
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
                    <div className="flex flex-col sm:flex-row items-end gap-4">
                        <div className="space-y-1 flex-1">
                            <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                                <MdLabel className="w-4 h-4" />
                                Select PPMP No. <span className="text-red-500">*</span>
                            </label>
                            <select
                                value={form.ppmp_no}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    const found = availablePPMPs.find(p => p.ppmp_no === val);
                                    setSelectedPPMP(found);
                                    setForm(prev => ({
                                        ...prev,
                                        ppmp_no: val,
                                        prNo: found ? found.prNo : '',
                                        title: found ? found.title : prev.title
                                    }));
                                    if (errors.ppmp_no) setErrors(prev => ({ ...prev, ppmp_no: null }));
                                }}
                                disabled={loadingPPMPs}
                                className={`w-full p-3 bg-white dark:bg-slate-900 border ${errors.ppmp_no ? 'border-red-400' : 'border-slate-200 dark:border-slate-700'} rounded-xl focus:ring-2 focus:ring-[var(--primary)] outline-none transition-all cursor-pointer font-bold text-sm`}
                            >
                                <option value="" disabled>
                                    {loadingPPMPs ? 'Loading PPMPs...' : 'Select associated PPMP'}
                                </option>
                                {availablePPMPs.map((ppmp, idx) => (
                                    <option key={idx} value={ppmp.ppmp_no}>
                                        PPMP No. {ppmp.ppmp_no}
                                    </option>
                                ))}
                            </select>
                            {errors.ppmp_no && <span className="text-xs text-red-500 font-semibold">{errors.ppmp_no}</span>}
                        </div>

                        {/* Attachments Section (Top Placement) */}
                        <div className="relative pb-[2px]">
                            <button
                                type="button"
                                onClick={() => setShowAttachmentsPopover(!showAttachmentsPopover)}
                                className={`
                                    flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold transition-all h-[46px]
                                    ${Object.values(supportingFiles).some(f => f)
                                        ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                                        : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-[var(--primary)]'}
                                `}
                            >
                                <MdAttachFile className="w-4 h-4" />
                                <span className="hidden sm:inline">
                                    {Object.values(supportingFiles).filter(f => f).length > 0 
                                        ? `${Object.values(supportingFiles).filter(f => f).length} Files`
                                        : 'Upload'}
                                </span>
                            </button>

                            <AnimatePresence>
                                {showAttachmentsPopover && (
                                    <>
                                        <div 
                                            className="fixed inset-0 z-[60]" 
                                            onClick={() => setShowAttachmentsPopover(false)} 
                                        />
                                        <motion.div
                                            initial={{ opacity: 0, y: -10, scale: 0.95 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            exit={{ opacity: 0, y: -10, scale: 0.95 }}
                                            className="absolute top-full right-0 mt-3 w-72 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 p-4 z-[70] space-y-3"
                                        >
                                            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-2">
                                                <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Supporting Docs</h4>
                                                <button onClick={() => setShowAttachmentsPopover(false)}>
                                                    <MdClose className="w-4 h-4 text-slate-400" />
                                                </button>
                                            </div>
                                            
                                            <div className="space-y-2">
                                                {[
                                                    { id: 'activityDesign', label: 'Activity Design' },
                                                    { id: 'ris', label: 'RIS Document' },
                                                    { id: 'marketScoping', label: 'Market Scoping' }
                                                ].map((doc) => (
                                                    <div key={doc.id} className="relative">
                                                        <input
                                                            type="file"
                                                            id={`file-${doc.id}`}
                                                            className="hidden"
                                                            onChange={(e) => {
                                                                const file = e.target.files[0];
                                                                if (file) {
                                                                    setSupportingFiles(prev => ({
                                                                        ...prev,
                                                                        [doc.id]: file
                                                                    }));
                                                                }
                                                            }}
                                                        />
                                                        <div 
                                                            onClick={() => !supportingFiles[doc.id] && document.getElementById(`file-${doc.id}`).click()}
                                                            className={`
                                                                flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer
                                                                ${supportingFiles[doc.id] 
                                                                    ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30' 
                                                                    : 'bg-slate-50 dark:bg-slate-900/50 border-transparent hover:border-[var(--primary)]'}
                                                            `}
                                                        >
                                                            <div className="flex items-center gap-3 overflow-hidden">
                                                                <div className={`
                                                                    w-8 h-8 rounded-lg flex items-center justify-center shrink-0
                                                                    ${supportingFiles[doc.id] ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600' : 'bg-white dark:bg-slate-800 text-slate-400'}
                                                                `}>
                                                                    {supportingFiles[doc.id] ? <MdDescription className="w-4 h-4" /> : <MdCloudUpload className="w-4 h-4" />}
                                                                </div>
                                                                <div className="flex flex-col min-w-0">
                                                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-tighter">{doc.label}</span>
                                                                    <span className="text-[10px] text-slate-400 truncate">
                                                                        {supportingFiles[doc.id] ? supportingFiles[doc.id].name : 'Not selected'}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                            {supportingFiles[doc.id] && (
                                                                <button 
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setSupportingFiles(prev => ({ ...prev, [doc.id]: null }));
                                                                        const el = document.getElementById(`file-${doc.id}`);
                                                                        if (el) el.value = '';
                                                                    }}
                                                                    className="p-1 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 rounded-md transition-colors"
                                                                >
                                                                    <MdClose className="w-3.5 h-3.5 text-emerald-600" />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </motion.div>
                                    </>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>

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
