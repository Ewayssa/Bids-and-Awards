import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    MdSave, MdInfo, MdLabel, MdAdd, MdDelete, MdReceipt
} from 'react-icons/md';
import Modal from '../../../components/Modal';
import { documentService } from '../../../services/api';

const CreatePRModal = ({
    show,
    isOpen,
    onClose,
    onSuccess
}) => {
    const isModalOpen = show || isOpen;
    const [submitting, setSubmitting] = useState(false);
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

            await documentService.create(formData);

            if (onSuccess) {
                onSuccess({ items, total: calculateTotal() });
            }
            onClose();
        } catch (err) {
            console.error('Submission error:', err);
            setError('Failed to create PR. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    const formatCurrency = (val) => {
        return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(val);
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
                {submitting ? 'Saving...' : 'Save Purchase Request'}
                <MdSave className="w-4 h-4" />
            </button>
        </div>
    );

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
                    {error && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl flex items-center gap-3"
                        >
                            <MdInfo className="w-5 h-5 text-red-500 shrink-0" />
                            <p className="text-sm font-semibold text-red-600 dark:text-red-400">{error}</p>
                        </motion.div>
                    )}

                    {/* Connection Section */}
                    <div className="grid grid-cols-1 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                                <MdLabel className="w-4 h-4" />
                                Select PPMP No. <span className="text-red-500">*</span>
                            </label>
                            <select
                                value={form.ppmp_no}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    const found = availablePPMPs.find(p => p.ppmp_no === val);
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

                    {/* Total Section Below Table */}
                    <div className="flex justify-end pt-4 px-2">
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-slate-500">Grand Total:</span>
                            <span className="text-xl font-black text-emerald-600">
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
