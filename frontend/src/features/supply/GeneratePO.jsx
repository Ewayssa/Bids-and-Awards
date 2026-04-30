import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { useReactToPrint } from 'react-to-print';
import Modal from '../../components/Modal';
import POPrintLayout from './POPrintLayout';
import { purchaseRequestService, purchaseOrderService, openPreviewTab } from '../../services/api';
import { numberToWords } from '../../utils/numberToWords';

const GeneratePO = ({ user, onLogout }) => {
    const navigate = useNavigate();
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

    useEffect(() => {
        fetchPOs();
        fetchReadyPrs();
    }, []);

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
            setReadyPrs(prList);
        } catch (error) {
            console.error('Error fetching PRs:', error);
        }
    };

    const fetchPrDetails = async (id) => {
        try {
            const doc = await purchaseRequestService.getById(id);
            setPrDetails(doc);
            setItems(doc.items || []);

            if (doc.mode_of_procurement) {
                setPoData(prev => ({ ...prev, mode_of_procurement: doc.mode_of_procurement }));
            }
        } catch (error) {
            console.error('Error fetching PR details:', error);
        }
    };

    const handleCostChange = (index, value) => {
        const newItems = [...items];
        newItems[index].unit_cost = parseFloat(value) || 0;
        setItems(newItems);
    };

    const handlePrint = useReactToPrint({
        contentRef: printRef,
        documentTitle: `PO_${poData.po_no}`,
    });

    const triggerPrint = (po) => {
        setSelectedPo(po);
        try {
            const poItems = po.purchase_request_details?.items || [];
            setSelectedPoItems(poItems);
            setTimeout(() => handlePrint(), 100);
        } catch (e) {
            console.error(e);
        }
    };

    const viewPo = (po) => {
        const url = `/po/preview/${po.id}`;
        openPreviewTab(url, `Purchase Order ${po.po_no}`);
    };

    const handlePreviewNew = () => {
        // Save current form data to localStorage for the preview page
        const previewData = {
            ...poData,
            total_amount: totalAmount,
            purchase_request_details: {
                ...prDetails,
                items: items
            }
        };
        localStorage.setItem('pending_po_preview', JSON.stringify(previewData));
        openPreviewTab('/po/preview/new', `Preview: ${poData.po_no || 'New PO'}`);
    };

    const totalAmount = items.reduce((sum, item) => sum + ((item.quantity || 0) * (item.unit_cost || 0)), 0);

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
                
                // Fetch next sequence for the year from backend
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

    const isFormValid = () => {
        return selectedPrId &&
            poData.po_no &&
            poData.supplier_name &&
            poData.supplier_address &&
            poData.po_date &&
            poData.mode_of_procurement;
    };

    const handleSave = async () => {
        if (!isFormValid()) {
            alert('Please fill in all required fields.');
            return;
        }

        try {
            setSaving(true);
            const payload = {
                ...poData,
                purchase_request: selectedPrId,
                total_amount: totalAmount
            };
            await purchaseOrderService.create(payload);

            setSuccessMessage('Purchase Order generated successfully!');
            setTimeout(() => {
                setSuccessMessage('');
                setShowForm(false);
                fetchPOs(); // Refresh table
                fetchReadyPrs(); // Refresh dropdown
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
            const errorData = error.response?.data;
            let errorMessage = 'Failed to generate Purchase Order.';
            
            if (errorData) {
                if (typeof errorData === 'object') {
                    errorMessage += ' ' + Object.entries(errorData)
                        .map(([field, msg]) => `${field}: ${msg}`)
                        .join(', ');
                } else {
                    errorMessage += ' ' + errorData;
                }
            }
            
            alert(errorMessage);
            console.error('Error details:', errorData);
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
                    <button
                        onClick={() => setShowForm(true)}
                        className="flex items-center gap-3 px-8 py-3.5 bg-[#16a34a] text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-emerald-100 hover:bg-[#15803d] hover:-translate-y-0.5 transition-all active:scale-95 whitespace-nowrap"
                    >
                        <MdAdd size={22} /> Generate PO
                    </button>
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
            <div className="bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/30 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50/50">
                                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-left">PO No.</th>
                                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-left">PR No.</th>
                                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-left">Supplier</th>
                                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-left">Date</th>
                                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Amount</th>
                                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Status</th>
                                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
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
                                <tr key={po.id} className="hover:bg-slate-50 transition-all group">
                                    <td className="px-8 py-6">
                                        <p className="text-sm font-black text-slate-900 group-hover:text-emerald-600 transition-colors">{po.po_no}</p>
                                    </td>
                                    <td className="px-8 py-6">
                                        <p className="text-[10px] font-black text-emerald-600 uppercase tracking-wider bg-emerald-50 px-2.5 py-1 rounded-lg inline-block border border-emerald-100">
                                            {po.purchase_request_details?.pr_no}
                                        </p>
                                    </td>
                                    <td className="px-8 py-6">
                                        <p className="text-sm font-bold text-slate-700 truncate max-w-[200px]">{po.supplier_name}</p>
                                    </td>
                                    <td className="px-8 py-6 text-sm text-slate-500 font-medium whitespace-nowrap">
                                        {new Date(po.po_date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                                    </td>
                                    <td className="px-8 py-6 text-right whitespace-nowrap">
                                        <p className="text-sm font-black text-slate-900">₱{Number(po.total_amount).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</p>
                                    </td>
                                    <td className="px-8 py-6 text-center">
                                        <span className="px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-black uppercase tracking-widest border border-emerald-100">
                                            Generated
                                        </span>
                                    </td>
                                    <td className="px-8 py-6 text-right whitespace-nowrap">
                                        <div className="flex items-center justify-end gap-2">
                                            <button
                                                onClick={() => viewPo(po)}
                                                className="p-2.5 rounded-xl bg-slate-50 text-slate-400 hover:bg-emerald-50 hover:text-emerald-600 transition-all active:scale-95 shadow-sm"
                                                title="View in New Tab"
                                            >
                                                <MdRemoveRedEye size={20} />
                                            </button>
                                            <button
                                                onClick={() => triggerPrint(po)}
                                                className="p-2.5 rounded-xl bg-slate-50 text-slate-400 hover:bg-blue-50 hover:text-blue-600 transition-all active:scale-95 shadow-sm"
                                                title="Print PDF"
                                            >
                                                <MdPrint size={20} />
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
                        <div className="flex flex-col items-center justify-center p-20 space-y-6 text-center">
                            <MdCheckCircle className="text-emerald-500 text-8xl animate-bounce" />
                            <div>
                                <h2 className="text-2xl font-black text-slate-900 tracking-tight">{successMessage}</h2>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">Refreshing records...</p>
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
                                    <div className="bg-slate-50/50 rounded-3xl border border-slate-100 overflow-hidden">
                                        <div className="p-6 border-b border-slate-100 bg-white flex items-center gap-3">
                                            <MdInventory className="text-emerald-600" size={20} />
                                            <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-widest">PR Items</h3>
                                        </div>
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left">
                                                <thead className="bg-slate-50/50">
                                                    <tr>
                                                        <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Unit</th>
                                                        <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Description</th>
                                                        <th className="px-6 py-4 text-center text-[9px] font-black text-slate-400 uppercase tracking-widest">Qty</th>
                                                        <th className="px-6 py-4 text-right text-[9px] font-black text-slate-400 uppercase tracking-widest">Cost</th>
                                                        <th className="px-6 py-4 text-right text-[9px] font-black text-slate-400 uppercase tracking-widest">Total</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100">
                                                    {items.map((item, idx) => (
                                                        <tr key={idx} className="text-xs">
                                                            <td className="px-6 py-4 font-bold text-slate-500 uppercase">{item.unit}</td>
                                                            <td className="px-6 py-4">
                                                                <div className="font-bold text-slate-700">{item.description}</div>
                                                                {item.pr_no && (
                                                                    <div className="text-[10px] font-black text-emerald-600/60 uppercase tracking-tighter mt-0.5">
                                                                        PR #{item.pr_no}
                                                                    </div>
                                                                )}
                                                            </td>
                                                            <td className="px-6 py-4 text-center font-black text-slate-900">{Number(item.quantity).toLocaleString('en-PH', { maximumFractionDigits: 0 })}</td>
                                                            <td className="px-6 py-4 text-right">
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
                                                            <td className="px-6 py-4 text-right font-black text-slate-900">₱{Number(item.quantity * item.unit_cost).toLocaleString('en-PH', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</td>
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
                                    <div className="space-y-6">
                                        <div className="flex items-center gap-3 ml-1">
                                            <MdAssignment className="text-emerald-600" size={20} />
                                            <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Step 2: PO Specifications</h3>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">PO Number</label>
                                                <input
                                                    type="text"
                                                    value={poData.po_no}
                                                    onChange={(e) => setPoData({ ...poData, po_no: e.target.value })}
                                                    className="w-full px-5 py-4 rounded-xl bg-slate-50 border-2 border-transparent focus:border-emerald-500 focus:bg-white focus:ring-0 font-bold text-slate-800 transition-all shadow-inner"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">PO Date</label>
                                                <input
                                                    type="date"
                                                    value={poData.po_date}
                                                    onChange={(e) => setPoData({ ...poData, po_date: e.target.value })}
                                                    className="w-full px-5 py-4 rounded-xl bg-slate-50 border-2 border-transparent focus:border-emerald-500 focus:bg-white focus:ring-0 font-bold text-slate-800 transition-all shadow-inner"
                                                />
                                            </div>
                                            <div className="space-y-2 col-span-full">
                                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Supplier Name</label>
                                                <input
                                                    type="text"
                                                    value={poData.supplier_name}
                                                    onChange={(e) => setPoData({ ...poData, supplier_name: e.target.value })}
                                                    className="w-full px-5 py-4 rounded-xl bg-slate-50 border-2 border-transparent focus:border-emerald-500 focus:bg-white focus:ring-0 font-bold text-slate-800 transition-all shadow-inner text-lg"
                                                    placeholder="Enter Official Supplier Name"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Supplier TIN</label>
                                                <input
                                                    type="text"
                                                    value={poData.tin}
                                                    onChange={(e) => setPoData({ ...poData, tin: e.target.value })}
                                                    className="w-full px-5 py-4 rounded-xl bg-slate-50 border-2 border-transparent focus:border-emerald-500 focus:bg-white focus:ring-0 font-bold text-slate-800 transition-all shadow-inner"
                                                    placeholder="000-000-000-000"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Mode of Procurement</label>
                                                <select
                                                    value={poData.mode_of_procurement}
                                                    onChange={(e) => setPoData({ ...poData, mode_of_procurement: e.target.value })}
                                                    className="w-full px-5 py-4 rounded-xl bg-slate-50 border-2 border-transparent focus:border-emerald-500 focus:bg-white focus:ring-0 font-bold text-slate-800 transition-all shadow-inner"
                                                >
                                                    <option value="">Select Mode</option>
                                                    <option value="Public Bidding">Public Bidding</option>
                                                    <option value="Small Value Procurement">Small Value Procurement</option>
                                                    <option value="Lease of Venue">Lease of Venue</option>
                                                    <option value="Negotiated Procurement">Negotiated Procurement</option>
                                                </select>
                                            </div>
                                            <div className="space-y-2 col-span-full">
                                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Supplier Address</label>
                                                <textarea
                                                    value={poData.supplier_address}
                                                    onChange={(e) => setPoData({ ...poData, supplier_address: e.target.value })}
                                                    className="w-full px-5 py-4 rounded-xl bg-slate-50 border-2 border-transparent focus:border-emerald-500 focus:bg-white focus:ring-0 font-medium text-slate-600 h-20 transition-all shadow-inner resize-none"
                                                    placeholder="Enter Full Business Address"
                                                />
                                            </div>

                                            {/* DELIVERY & PAYMENT SECTION */}
                                            <div className="col-span-full pt-4 flex items-center gap-3">
                                                <div className="h-px flex-1 bg-slate-100"></div>
                                                <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Delivery & Payment</span>
                                                <div className="h-px flex-1 bg-slate-100"></div>
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Place of Delivery</label>
                                                <input
                                                    type="text"
                                                    value={poData.place_of_delivery}
                                                    onChange={(e) => setPoData({ ...poData, place_of_delivery: e.target.value })}
                                                    className="w-full px-5 py-4 rounded-xl bg-slate-50 border-2 border-transparent focus:border-emerald-500 focus:bg-white focus:ring-0 font-bold text-slate-800 transition-all shadow-inner"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Date of Delivery</label>
                                                <input
                                                    type="date"
                                                    value={poData.date_of_delivery}
                                                    onChange={(e) => setPoData({ ...poData, date_of_delivery: e.target.value })}
                                                    className="w-full px-5 py-4 rounded-xl bg-slate-50 border-2 border-transparent focus:border-emerald-500 focus:bg-white focus:ring-0 font-bold text-slate-800 transition-all shadow-inner"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Payment Term</label>
                                                <select
                                                    value={poData.payment_term}
                                                    onChange={(e) => setPoData({ ...poData, payment_term: e.target.value })}
                                                    className="w-full px-5 py-4 rounded-xl bg-slate-50 border-2 border-transparent focus:border-emerald-500 focus:bg-white focus:ring-0 font-bold text-slate-800 transition-all shadow-inner"
                                                >
                                                    <option value="">Select Payment Term</option>
                                                    <option value="Full Payment after delivery">Full Payment after delivery</option>
                                                    <option value="Progress Billing">Progress Billing</option>
                                                    <option value="Partial Payment">Partial Payment</option>
                                                </select>
                                            </div>

                                            {/* AMOUNT IN WORDS */}
                                            <div className="space-y-2 col-span-full">
                                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Total Amount in Words</label>
                                                <textarea
                                                    value={poData.amount_in_words}
                                                    readOnly
                                                    className="w-full px-5 py-4 rounded-xl bg-slate-100/50 border-2 border-transparent font-medium text-slate-500 h-20 transition-all cursor-not-allowed resize-none italic"
                                                    placeholder="Automatic calculation..."
                                                />
                                            </div>

                                            {/* ACCOUNTING SECTION */}
                                            <div className="col-span-full pt-4 flex items-center gap-3">
                                                <div className="h-px flex-1 bg-slate-100"></div>
                                                <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Accounting Details</span>
                                                <div className="h-px flex-1 bg-slate-100"></div>
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Fund Cluster</label>
                                                <select
                                                    value={poData.fund_cluster}
                                                    onChange={(e) => setPoData({ ...poData, fund_cluster: e.target.value })}
                                                    className="w-full px-5 py-4 rounded-xl bg-slate-50 border-2 border-transparent focus:border-emerald-500 focus:bg-white focus:ring-0 font-bold text-slate-800 transition-all shadow-inner"
                                                >
                                                    <option value="">Select Cluster</option>
                                                    <option value="01">01</option>
                                                    <option value="02">02</option>
                                                    <option value="03">03</option>
                                                    <option value="04">04</option>
                                                </select>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Funds Available</label>
                                                <input
                                                    type="text"
                                                    value={poData.funds_available}
                                                    onChange={(e) => setPoData({ ...poData, funds_available: e.target.value })}
                                                    className="w-full px-5 py-4 rounded-xl bg-slate-50 border-2 border-transparent focus:border-emerald-500 focus:bg-white focus:ring-0 font-bold text-slate-800 transition-all shadow-inner"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Account Code</label>
                                                <input
                                                    type="text"
                                                    value={poData.ors_burs_no}
                                                    onChange={(e) => setPoData({ ...poData, ors_burs_no: e.target.value })}
                                                    className="w-full px-5 py-4 rounded-xl bg-slate-50 border-2 border-transparent focus:border-emerald-500 focus:bg-white focus:ring-0 font-bold text-slate-800 transition-all shadow-inner"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">ORS/BURS Date</label>
                                                <input
                                                    type="date"
                                                    value={poData.date_of_ors_burs}
                                                    onChange={(e) => setPoData({ ...poData, date_of_ors_burs: e.target.value })}
                                                    className="w-full px-5 py-4 rounded-xl bg-slate-50 border-2 border-transparent focus:border-emerald-500 focus:bg-white focus:ring-0 font-bold text-slate-800 transition-all shadow-inner"
                                                />
                                            </div>
                                            <div className="space-y-2 col-span-full">
                                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">ORS/BURS No.</label>
                                                <input
                                                    type="text"
                                                    value={poData.ors_burs_amount}
                                                    onChange={(e) => setPoData({ ...poData, ors_burs_amount: e.target.value })}
                                                    className="w-full px-5 py-4 rounded-xl bg-slate-50 border-2 border-transparent focus:border-emerald-500 focus:bg-white focus:ring-0 font-bold text-slate-800 transition-all shadow-inner font-bold"
                                                    placeholder="Enter ORS/BURS number"
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


            {/* Hidden Print Content */}
            <div className="hidden">
                <POPrintLayout ref={printRef} data={selectedPo} prItems={selectedPoItems} />
            </div>
        </div>
    );
};

export default GeneratePO;
