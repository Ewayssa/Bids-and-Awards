import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import {
    MdSave,
    MdCheckCircle,
    MdInventory,
    MdAssignment,
    MdSearch,
    MdClose,
    MdHistory,
    MdDescription,
    MdArrowForward,
    MdAdd,
    MdRemoveRedEye,
    MdFileDownload,
    MdPrint,
    MdKeyboardArrowDown
} from 'react-icons/md';
import Modal from '../../components/Modal';
import { purchaseRequestService, purchaseOrderService } from '../../services/api';
import { numberToWords } from '../../utils/numberToWords';
import { generatePO_PDFBlob } from '../../utils/poGenerator';

const GeneratePO = ({ user, onLogout }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const [pos, setPos] = useState([]);
    const [readyPrs, setReadyPrs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [showPreview, setShowPreview] = useState(false);
    const [selectedPo, setSelectedPo] = useState(null);
    const [selectedPoItems, setSelectedPoItems] = useState([]);

    // Form State
    const [selectedPrId, setSelectedPrId] = useState('');
    const [prDetails, setPrDetails] = useState(null);
    const [items, setItems] = useState([]);
    const [saving, setSaving] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');

    const [poData, setPoData] = useState({
        po_no: '',
        supplier_name: '',
        supplier_address: '',
        po_date: new Date().toISOString().split('T')[0],
        mode_of_procurement: '',
        tin: '',
        place_of_delivery: 'DILG Regional Office 1',
        date_of_delivery: '',
        payment_term: '',
        amount_in_words: '',
        fund_cluster: '',
        funds_available: '',
        ors_burs_no: '',
        date_of_ors_burs: '',
        ors_burs_amount: ''
    });

    const printRef = useRef();
    const previewPrintRef = useRef();
    const viewPrintRef = useRef();

    useEffect(() => {
        fetchPOs();
        fetchReadyPrs();
    }, []);

    // Handle pr_id from query parameter (for "Generate PO" button from Dashboard)
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const prId = params.get('pr_id');
        if (prId) {
            setSelectedPrId(prId);
            setShowForm(true);
            // Clean up URL without refreshing
            window.history.replaceState({}, '', location.pathname);
        }
    }, [location.search]);

    useEffect(() => {
        if (selectedPrId) {
            fetchPrDetails(selectedPrId);
        } else {
            setPrDetails(null);
            setItems([]);
        }
    }, [selectedPrId]);

    const fetchPOs = async () => {
        try {
            setLoading(true);
            const data = await purchaseOrderService.getAll();
            const poList = Array.isArray(data) ? data : (data?.results || []);
            setPos(poList);
        } catch (error) {
            console.error('Error fetching POs:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchReadyPrs = async () => {
        try {
            const data = await purchaseRequestService.getAll({ status: 'completed' });
            const prList = Array.isArray(data) ? data : (data?.results || []);
            // Only show PRs that have a PR number assigned by BAC Member
            setReadyPrs(prList.filter(pr => pr.pr_no && pr.pr_no.trim() !== ''));
        } catch (error) {
            console.error('Error fetching PRs:', error);
        }
    };

    const fetchPrDetails = async (id) => {
        try {
            const doc = await purchaseRequestService.getById(id);
            setPrDetails(doc);
            // Normalize items: ensure quantity and unit_cost are always numbers
            const normalizedItems = (doc.items || []).map(item => ({
                ...item,
                quantity: parseFloat(item.quantity) || 0,
                unit_cost: item.unit_cost || '',
                total: parseFloat(item.total) || 0,
            }));
            setItems(normalizedItems);

            if (doc.mode_of_procurement) {
                setPoData(prev => ({ ...prev, mode_of_procurement: doc.mode_of_procurement }));
            }
        } catch (error) {
            console.error('Error fetching PR details:', error);
        }
    };

    const handleCostChange = (index, value) => {
        const newItems = [...items];
        // Allow empty string or numbers
        newItems[index].unit_cost = value;
        setItems(newItems);
    };

    const triggerPrint = async (po) => {
        try {
            const dataForPdf = {
                ...po,
                items: po.purchase_request_details?.items || []
            };
            const blob = await generatePO_PDFBlob(dataForPdf);
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `PO_${po.po_no || 'Document'}.pdf`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(() => URL.revokeObjectURL(url), 1000);
        } catch (e) {
            console.error('Failed to generate PO PDF:', e);
            alert('Failed to generate PDF download. Please try again.');
        }
    };

    const viewPo = async (po) => {
        try {
            const dataForPdf = {
                ...po,
                items: po.purchase_request_details?.items || []
            };
            const blob = await generatePO_PDFBlob(dataForPdf);
            const url = URL.createObjectURL(blob);
            window.open(url, '_blank');
        } catch (e) {
            console.error('Failed to generate PO PDF:', e);
            alert('Failed to preview PDF. Please try again.');
        }
    };
    const handlePreviewNew = async () => {
        const previewData = {
            ...poData,
            total_amount: totalAmount,
            items: items,
            purchase_request_details: {
                ...prDetails,
                items: items
            }
        };
        try {
            const blob = await generatePO_PDFBlob(previewData);
            const url = URL.createObjectURL(blob);
            window.open(url, '_blank');
        } catch (e) {
            console.error('Failed to generate PO PDF preview:', e);
            alert('Failed to generate preview. Please check the form data.');
        }
    };


    // Correctly parse quantity and unit_cost as floats (DRF returns DecimalField as strings)
    const totalAmount = items.reduce((sum, item) => {
        const qty = parseFloat(item.quantity) || 0;
        const cost = parseFloat(item.unit_cost) || 0;
        return sum + (qty * cost);
    }, 0);

    // Auto-calculate amount in words
    useEffect(() => {
        if (totalAmount > 0) {
            setPoData(prev => ({
                ...prev,
                amount_in_words: numberToWords(totalAmount)
            }));
        } else {
            setPoData(prev => ({
                ...prev,
                amount_in_words: ''
            }));
        }
    }, [totalAmount]);

    // Auto-generate PO number based on date and yearly sequence
    useEffect(() => {
        const fetchNextPoNumber = async () => {
            if (!poData.po_date || !showForm) return;
            
            try {
                const date = new Date(poData.po_date);
                const year = date.getFullYear();
                const month = (date.getMonth() + 1).toString().padStart(2, '0');
                
                const nextSeq = await purchaseOrderService.getNextSequence(year);
                const sequence = nextSeq.toString().padStart(3, '0');
                
                setPoData(prev => ({
                    ...prev,
                    po_no: `${year}-${month}-${sequence}`
                }));
            } catch (error) {
                console.error('Error fetching next PO sequence:', error);
            }
        };

        fetchNextPoNumber();
    }, [poData.po_date, showForm]);

    // ORS/BURS Number is manually encoded

    const isFormValid = () => {
        const required = [
            selectedPrId,
            poData.po_no,
            poData.supplier_name,
            poData.supplier_address,
            poData.po_date,
            poData.mode_of_procurement
        ];
        return required.every(val => val && val.toString().trim() !== '');
    };

    const handleSave = async () => {
        if (!isFormValid()) {
            const missing = [];
            if (!selectedPrId) missing.push("Purchase Request");
            if (!poData.po_no) missing.push("PO Number");
            if (!poData.supplier_name) missing.push("Supplier Name");
            if (!poData.supplier_address) missing.push("Supplier Address");
            if (!poData.po_date) missing.push("PO Date");
            if (!poData.mode_of_procurement) missing.push("Mode of Procurement");
            
            alert(`Please fill in the following required fields: \n- ${missing.join('\n- ')}`);
            return;
        }

        try {
            setSaving(true);
            
            // Sanitize payload: remove empty strings for optional date fields
            const sanitizedPoData = { ...poData };
            if (sanitizedPoData.date_of_ors_burs === '') {
                sanitizedPoData.date_of_ors_burs = null;
            }
            if (sanitizedPoData.date_of_delivery === '') {
                sanitizedPoData.date_of_delivery = null;
            }

            const payload = {
                ...sanitizedPoData,
                purchase_request: readyPrs.find(p => String(p.id) === String(selectedPrId))?.pr_no || selectedPrId,
                total_amount: isNaN(totalAmount) ? 0 : totalAmount
            };

            const response = await purchaseOrderService.create(payload);
            const poId = response?.id;

            setSuccessMessage('Purchase Order generated successfully!');
            setTimeout(() => {
                setSuccessMessage('');
                setShowForm(false);
                fetchPOs(); // Refresh table
                fetchReadyPrs(); // Refresh dropdown
                
                if (poId) {
                    viewPo({ id: poId, po_no: poData.po_no });
                }

                // Reset form
                setSelectedPrId('');
                setPoData({
                    po_no: '',
                    supplier_name: '',
                    supplier_address: '',
                    po_date: new Date().toISOString().split('T')[0],
                    mode_of_procurement: '',
                    tin: '',
                    place_of_delivery: 'DILG Regional Office 1',
                    date_of_delivery: '',
                    payment_term: '',
                    amount_in_words: '',
                    fund_cluster: '',
                    funds_available: '',
                    ors_burs_no: '',
                    date_of_ors_burs: '',
                    ors_burs_amount: ''
                });
            }, 2000);
        } catch (error) {
            console.error('Error details:', error.response?.data);
            let errorMessage = 'Failed to generate Purchase Order.';
            
            if (error.response?.status === 500) {
                errorMessage += ' Server Error (500). Please contact administrator.';
            } else if (error.response?.data) {
                const errorData = error.response.data;
                if (typeof errorData === 'object') {
                    errorMessage += ' ' + Object.entries(errorData)
                        .map(([field, msg]) => `${field}: ${msg}`)
                        .join(', ');
                } else {
                    errorMessage += ' ' + errorData;
                }
            } else {
                errorMessage += ' ' + (error.message || 'Unknown error.');
            }
            
            alert(errorMessage);
        } finally {
            setSaving(false);
        }
    };

    const filteredPOs = pos.filter(po =>
        (po.po_no || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (po.supplier_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (po.purchase_request_details?.pr_no || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-8 pb-12 animate-in fade-in duration-500 pt-6">
            {/* PAGE HEADER */}
            <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/30 flex flex-col md:flex-row md:items-center justify-between gap-6 transition-all">
                <div className="space-y-1">
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight">Purchase Order Management</h1>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Generate and track Purchase Orders for approved requests.</p>
                </div>
                <div className="flex flex-col md:flex-row items-center gap-4">
                    {/* Action removed - handled from Supply Dashboard queue */}
                </div>
            </div>

            {/* Search Bar Row */}
            <div className="flex items-center justify-between gap-4 px-1">
                <div className="flex-1 max-w-md">
                    <div className="relative">
                        <MdSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                        <input
                            type="text"
                            placeholder="Search PO No, Supplier, or PR..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 rounded-2xl border-2 border-slate-100 focus:border-emerald-500 focus:bg-white focus:ring-0 text-sm font-bold text-slate-700 transition-all shadow-inner"
                        />
                    </div>
                </div>
            </div>

            {/* PO RECORDS TABLE */}
            <div className="table-container">
                <div className="overflow-x-auto">
                    <table className="app-table table-zebra">
                        <thead>
                            <tr className="table-header-row">
                                <th className="table-th">PO No.</th>
                                <th className="table-th">PR No.</th>
                                <th className="table-th">Supplier</th>
                                <th className="table-th text-right">Amount</th>
                                <th className="table-th">Date</th>
                                <th className="table-th text-center">Status</th>
                                <th className="table-th text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {loading ? (
                                <tr>
                                    <td colSpan="7" className="px-8 py-16 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Loading Records...</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredPOs.length > 0 ? filteredPOs.map((po) => (
                                <tr key={po.id} className="table-tr group">
                                    <td className="table-td">
                                        <p className="text-sm font-black text-slate-900 group-hover:text-emerald-600 transition-colors">{po.po_no}</p>
                                    </td>
                                    <td className="table-td">
                                        <p className="text-[10px] font-black text-emerald-600 uppercase tracking-wider bg-emerald-50 px-2.5 py-1 rounded-lg inline-block border border-emerald-100">
                                            {po.purchase_request_details?.pr_no}
                                        </p>
                                    </td>
                                    <td className="table-td">
                                        <p className="text-sm font-bold text-slate-700 truncate max-w-[200px]">{po.supplier_name}</p>
                                    </td>
                                    <td className="table-td text-right whitespace-nowrap">
                                        <p className="text-sm font-black text-slate-900">₱{Number(po.total_amount).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</p>
                                    </td>
                                    <td className="table-td text-sm text-slate-500 font-medium whitespace-nowrap">
                                        {new Date(po.po_date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                                    </td>
                                    <td className="table-td text-center">
                                        <span className="status-badge status-badge--complete">
                                            Generated
                                        </span>
                                    </td>
                                    <td className="table-td !text-center !px-3 !py-3">
                                        <div className="flex flex-wrap justify-center items-center gap-2">
                                            <button
                                                onClick={() => viewPo(po)}
                                                className="btn-action justify-center bg-slate-900 dark:bg-emerald-600 text-white hover:bg-slate-800 dark:hover:bg-emerald-700 !text-[10px] !font-black !uppercase !tracking-wide shadow-sm"
                                                title="View Details"
                                            >
                                                View
                                            </button>
                                            <button
                                                onClick={() => triggerPrint(po)}
                                                className="btn-action-secondary justify-center !text-slate-800 dark:!text-white !text-[10px] !font-black !uppercase !tracking-wide"
                                                title="Download PDF"
                                            >
                                                Download
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan="7" className="px-8 py-24 text-center">
                                        <p className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">
                                            {pos.length === 0 ? "No purchase order made" : "No matching records found"}
                                        </p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* GENERATE PO MODAL */}
            <Modal
                isOpen={showForm}
                onClose={() => setShowForm(false)}
                title="Generate Purchase Order"
                size="2xl"
                containerClassName="!rounded-[2.5rem] overflow-hidden"
                bodyClassName="!p-0"
            >
                <div className="max-h-[85vh] overflow-y-auto custom-scrollbar">
                    {successMessage ? (
                        <div className="flex flex-col items-center justify-center p-12 space-y-4 text-center">
                            <MdCheckCircle className="text-emerald-500 text-6xl animate-bounce" />
                            <div>
                                <h2 className="text-lg font-black text-slate-900 tracking-tight">{successMessage}</h2>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Refreshing records...</p>
                            </div>
                        </div>
                    ) : (
                        <div className="p-10 space-y-10">
                            {/* STEP 1: SELECT PR */}
                            <div className="space-y-4">
                                <label className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em] ml-1">Step 1: Select Approved Purchase Request</label>
                                <div className="relative group">
                                    <select
                                        value={selectedPrId}
                                        onChange={(e) => setSelectedPrId(e.target.value)}
                                        className="w-full px-6 py-5 rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-emerald-500 focus:bg-white focus:ring-0 font-bold text-slate-800 transition-all appearance-none cursor-pointer"
                                    >
                                        <option value="">Select PR No. + Purpose</option>
                                        {readyPrs.map(pr => (
                                            <option key={pr.id} value={pr.id}>
                                                {pr.pr_no} — {pr.purpose.substring(0, 50)}...
                                            </option>
                                        ))}
                                    </select>
                                    <MdKeyboardArrowDown className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-400 group-hover:text-emerald-500 transition-colors pointer-events-none" size={24} />
                                </div>
                            </div>

                            {selectedPrId && (
                                <div className="space-y-10 animate-in slide-in-from-top-4 duration-500">
                                        <div className="table-container shadow-none border-slate-100">
                                            <div className="overflow-x-auto">
                                                <table className="app-table">
                                                    <thead>
                                                        <tr className="table-header-row">
                                                            <th className="table-th">Unit</th>
                                                            <th className="table-th">Description</th>
                                                            <th className="table-th text-center">Qty</th>
                                                            <th className="table-th text-right">Cost</th>
                                                            <th className="table-th text-right">Total</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-100">
                                                        {items.map((item, idx) => (
                                                            <tr key={idx} className="table-tr group text-xs">
                                                                <td className="table-td font-bold text-slate-500 uppercase">{item.unit}</td>
                                                                <td className="table-td">
                                                                    <div className="font-bold text-slate-700">{item.description}</div>
                                                                    {item.pr_no && (
                                                                        <div className="text-[10px] font-black text-emerald-600/60 uppercase tracking-tighter mt-0.5">
                                                                            PR #{item.pr_no}
                                                                        </div>
                                                                    )}
                                                                </td>
                                                                <td className="table-td text-center font-black text-slate-900">{Number(item.quantity).toLocaleString('en-PH', { maximumFractionDigits: 0 })}</td>
                                                                <td className="table-td text-right">
                                                                    <div className="flex items-center justify-end gap-1">
                                                                        <span className="text-slate-400">₱</span>
                                                                        <input
                                                                            type="number"
                                                                            value={item.unit_cost}
                                                                            onChange={(e) => handleCostChange(idx, e.target.value)}
                                                                            className="input-currency w-24 px-2 py-1 bg-white border border-slate-200 rounded-lg text-right font-black text-slate-900 focus:border-emerald-500 focus:ring-0 outline-none transition-all shadow-sm"
                                                                            step="0.01"
                                                                            min="0"
                                                                        />
                                                                    </div>
                                                                </td>
                                                                <td className="table-td text-right font-black text-slate-900">₱{((parseFloat(item.quantity) || 0) * (parseFloat(item.unit_cost) || 0)).toLocaleString('en-PH', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                    <tfoot className="bg-slate-900 text-white">
                                                        <tr>
                                                            <td colSpan="4" className="px-6 py-5 text-right text-[10px] font-black uppercase tracking-widest opacity-70">Grand Total</td>
                                                            <td className="px-6 py-5 text-right text-lg font-black tracking-tight">₱{totalAmount.toLocaleString('en-PH', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</td>
                                                        </tr>
                                                    </tfoot>
                                                </table>
                                            </div>
                                        </div>

                                    {/* PO INPUT FIELDS */}
                                    <div className="space-y-8 bg-white rounded-3xl border border-slate-100 p-8 shadow-sm">
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                                                <MdAssignment size={18} />
                                            </div>
                                            <h3 className="text-xs font-black text-slate-900 uppercase tracking-[0.1em]">PO Specifications</h3>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                                            {/* PO NO & DATE */}
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">PO Number <span className="text-rose-500">*</span></label>
                                                <input
                                                    type="text"
                                                    value={poData.po_no}
                                                    onChange={(e) => {
                                                        const val = e.target.value.replace(/[^0-9-]/g, '');
                                                        setPoData({ ...poData, po_no: val });
                                                    }}
                                                    className="w-full px-5 py-4 rounded-xl bg-slate-50 border-2 border-slate-100 focus:border-emerald-500 focus:bg-white focus:ring-0 font-bold text-slate-800 transition-all"
                                                    placeholder="YYYY-MM-XXX"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">PO Date <span className="text-rose-500">*</span></label>
                                                <input
                                                    type="date"
                                                    value={poData.po_date}
                                                    onChange={(e) => setPoData({ ...poData, po_date: e.target.value })}
                                                    className="w-full px-5 py-4 rounded-xl bg-slate-50 border-2 border-slate-100 focus:border-emerald-500 focus:bg-white focus:ring-0 font-bold text-slate-800 transition-all"
                                                />
                                            </div>

                                            {/* SUPPLIER NAME */}
                                            <div className="space-y-2 col-span-full">
                                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Supplier Name <span className="text-rose-500">*</span></label>
                                                <input
                                                    type="text"
                                                    value={poData.supplier_name}
                                                    onChange={(e) => {
                                                        const val = e.target.value.replace(/[^a-zA-Z0-9\s.,&()-]/g, '');
                                                        setPoData({ ...poData, supplier_name: val });
                                                    }}
                                                    className="w-full px-5 py-4 rounded-xl bg-slate-50 border-2 border-slate-100 focus:border-emerald-500 focus:bg-white focus:ring-0 font-black text-slate-900 text-lg transition-all"
                                                    placeholder="Full Business Name"
                                                />
                                            </div>

                                            {/* TIN & MODE */}
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Supplier TIN</label>
                                                <input
                                                    type="text"
                                                    value={poData.tin}
                                                    onChange={(e) => {
                                                        const raw = e.target.value.replace(/\D/g, '');
                                                        const formatted = (raw.match(/.{1,3}/g) || []).slice(0, 4).join('-');
                                                        setPoData({ ...poData, tin: formatted });
                                                    }}
                                                    className="w-full px-5 py-4 rounded-xl bg-slate-50 border-2 border-slate-100 focus:border-emerald-500 focus:bg-white focus:ring-0 font-bold text-slate-800 transition-all"
                                                    placeholder="000-000-000-000"
                                                    maxLength={15}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Mode of Procurement <span className="text-rose-500">*</span></label>
                                                <select
                                                    value={poData.mode_of_procurement}
                                                    onChange={(e) => setPoData({ ...poData, mode_of_procurement: e.target.value })}
                                                    className="w-full px-5 py-4 rounded-xl bg-slate-50 border-2 border-slate-100 focus:border-emerald-500 focus:bg-white focus:ring-0 font-bold text-slate-800 transition-all appearance-none"
                                                >
                                                    <option value="">Select Mode</option>
                                                    <option value="Public Bidding">Public Bidding</option>
                                                    <option value="Small Value Procurement">Small Value Procurement</option>
                                                    <option value="Lease of Venue">Lease of Venue</option>
                                                    <option value="Negotiated Procurement">Negotiated Procurement</option>
                                                </select>
                                            </div>

                                            {/* ADDRESS */}
                                            <div className="space-y-2 col-span-full">
                                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Supplier Address <span className="text-rose-500">*</span></label>
                                                <textarea
                                                    value={poData.supplier_address}
                                                    onChange={(e) => setPoData({ ...poData, supplier_address: e.target.value })}
                                                    className="w-full px-5 py-4 rounded-xl bg-slate-50 border-2 border-slate-100 focus:border-emerald-500 focus:bg-white focus:ring-0 font-medium text-slate-600 h-24 transition-all resize-none"
                                                    placeholder="Enter Business Address"
                                                />
                                            </div>

                                            {/* DELIVERY & PAYMENT DIVIDER */}
                                            <div className="col-span-full py-4">
                                                <div className="flex items-center gap-4">
                                                    <div className="h-px flex-1 bg-slate-100"></div>
                                                    <span className="text-[9px] font-black text-slate-300 uppercase tracking-[0.2em]">Delivery & Payment</span>
                                                    <div className="h-px flex-1 bg-slate-100"></div>
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Place of Delivery <span className="text-rose-500">*</span></label>
                                                <input
                                                    type="text"
                                                    value={poData.place_of_delivery}
                                                    onChange={(e) => setPoData({ ...poData, place_of_delivery: e.target.value })}
                                                    className="w-full px-5 py-4 rounded-xl bg-slate-50 border-2 border-slate-100 focus:border-emerald-500 focus:bg-white focus:ring-0 font-bold text-slate-800 transition-all"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Date of Delivery</label>
                                                <input
                                                    type="date"
                                                    value={poData.date_of_delivery}
                                                    onChange={(e) => setPoData({ ...poData, date_of_delivery: e.target.value })}
                                                    className="w-full px-5 py-4 rounded-xl bg-slate-50 border-2 border-slate-100 focus:border-emerald-500 focus:bg-white focus:ring-0 font-bold text-slate-800 transition-all"
                                                />
                                            </div>
                                            <div className="space-y-2 col-span-full">
                                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Payment Term</label>
                                                <select
                                                    value={poData.payment_term}
                                                    onChange={(e) => setPoData({ ...poData, payment_term: e.target.value })}
                                                    className="w-full px-5 py-4 rounded-xl bg-slate-50 border-2 border-slate-100 focus:border-emerald-500 focus:bg-white focus:ring-0 font-bold text-slate-800 transition-all"
                                                >
                                                    <option value="">Select Payment Term</option>
                                                    <option value="Full Payment after delivery">Full Payment after delivery</option>
                                                    <option value="Progress Billing">Progress Billing</option>
                                                    <option value="Partial Payment">Partial Payment</option>
                                                </select>
                                            </div>

                                            {/* ACCOUNTING DIVIDER */}
                                            <div className="col-span-full py-4">
                                                <div className="flex items-center gap-4">
                                                    <div className="h-px flex-1 bg-slate-100"></div>
                                                    <span className="text-[9px] font-black text-slate-300 uppercase tracking-[0.2em]">Accounting Details</span>
                                                    <div className="h-px flex-1 bg-slate-100"></div>
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Fund Cluster</label>
                                                <select
                                                    value={poData.fund_cluster}
                                                    onChange={(e) => setPoData({ ...poData, fund_cluster: e.target.value })}
                                                    className="w-full px-5 py-4 rounded-xl bg-slate-50 border-2 border-slate-100 focus:border-emerald-500 focus:bg-white focus:ring-0 font-bold text-slate-800 transition-all"
                                                >
                                                    <option value="">Select Cluster</option>
                                                    <option value="01">01</option>
                                                    <option value="02">02</option>
                                                    <option value="03">03</option>
                                                    <option value="04">04</option>
                                                </select>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Funds Available</label>
                                                <div className="relative group">
                                                    <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₱</span>
                                                    <input
                                                        type="text"
                                                        value={poData.funds_available}
                                                        onChange={(e) => {
                                                            let val = e.target.value.replace(/[^0-9.]/g, '');
                                                            
                                                            const parts = val.split('.');
                                                            if (parts.length > 2) val = parts[0] + '.' + parts.slice(1).join('');
                                                            
                                                            // Format integer part with commas
                                                            if (val.includes('.')) {
                                                                const [intPart, decimalPart] = val.split('.');
                                                                const formattedInt = intPart ? parseInt(intPart).toLocaleString('en-PH') : '';
                                                                setPoData({ ...poData, funds_available: `${formattedInt}.${decimalPart.substring(0, 2)}` });
                                                            } else {
                                                                const formattedInt = val ? parseInt(val).toLocaleString('en-PH') : '';
                                                                setPoData({ ...poData, funds_available: formattedInt });
                                                            }
                                                        }}
                                                        onBlur={() => {
                                                            if (poData.funds_available) {
                                                                const num = parseFloat(poData.funds_available.replace(/,/g, ''));
                                                                if (!isNaN(num)) {
                                                                    const formatted = num.toLocaleString('en-PH', { 
                                                                        minimumFractionDigits: 2, 
                                                                        maximumFractionDigits: 2 
                                                                    });
                                                                    setPoData({ ...poData, funds_available: formatted });
                                                                }
                                                            }
                                                        }}
                                                        onFocus={(e) => {
                                                            // Optional: keep commas but maybe not? 
                                                            // User wants "auto format when typing", so focus shouldn't necessarily strip them.
                                                        }}
                                                        className="w-full pl-10 pr-5 py-4 rounded-xl bg-slate-50 border-2 border-slate-100 focus:border-emerald-500 focus:bg-white focus:ring-0 font-bold text-slate-800 transition-all"
                                                        placeholder="0.00"
                                                    />
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">ORS/BURS Date</label>
                                                <input
                                                    type="date"
                                                    value={poData.date_of_ors_burs}
                                                    onChange={(e) => setPoData({ ...poData, date_of_ors_burs: e.target.value })}
                                                    className="w-full px-5 py-4 rounded-xl bg-slate-50 border-2 border-slate-100 focus:border-emerald-500 focus:bg-white focus:ring-0 font-bold text-slate-800 transition-all"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">ORS/BURS No.</label>
                                                <input
                                                    type="text"
                                                    value={poData.ors_burs_no}
                                                    onChange={(e) => {
                                                        const raw = e.target.value.replace(/\D/g, '');
                                                        let formatted = '';
                                                        if (raw.length > 0) {
                                                            formatted += raw.substring(0, 4);
                                                            if (raw.length > 4) {
                                                                formatted += '-' + raw.substring(4, 6);
                                                                if (raw.length > 6) {
                                                                    formatted += '-' + raw.substring(6, 10);
                                                                }
                                                            }
                                                        }
                                                        setPoData({ ...poData, ors_burs_no: formatted });
                                                    }}
                                                    className="w-full px-5 py-4 rounded-xl bg-slate-50 border-2 border-slate-100 focus:border-emerald-500 focus:bg-white focus:ring-0 font-bold text-slate-800 transition-all"
                                                    placeholder="0000-00-0000"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* FOOTER ACTIONS */}
                                    <div className="pt-6 border-t border-slate-100 flex items-center justify-end gap-4">
                                        <button
                                            onClick={handlePreviewNew}
                                            className="px-6 py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 border-2 border-slate-100 text-slate-600 hover:bg-slate-50 active:scale-95"
                                        >
                                            <MdRemoveRedEye size={18} />
                                            Preview Purchase Order
                                        </button>
                                        <button
                                            onClick={handleSave}
                                            disabled={saving || !isFormValid()}
                                            className={`px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-3 shadow-lg ${saving || !isFormValid() ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none' : 'bg-emerald-600 text-white shadow-emerald-100 hover:bg-emerald-700 hover:-translate-y-0.5 active:scale-95'}`}
                                        >
                                            <MdSave size={20} />
                                            {saving ? 'Saving...' : 'Confirm & Save'}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </Modal>


        </div>
    );
};

export default GeneratePO;
