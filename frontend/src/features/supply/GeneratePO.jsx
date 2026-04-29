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
import NotificationBell from '../notifications/NotificationBell';
import UserAccountDropdown from '../../layouts/UserAccountDropdown';

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
        po_no: `2026-${new Date().getMonth() + 1}-`,
        supplier_name: '',
        supplier_address: '',
        date: new Date().toISOString().split('T')[0],
        mode_of_procurement: '',
        delivery_terms: '7 Working Days upon receipt of PO',
        tin: '',
        place_of_delivery: 'DILG Regional Office 1',
        date_of_delivery: '',
        payment_term: 'Check',
        amount_in_words: '',
        fund_cluster: '01',
        funds_available: 'Yes',
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
            const response = await axios.get('/api/purchase-orders/');
            setPos(response.data);
        } catch (error) {
            console.error('Error fetching POs:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchReadyPrs = async () => {
        try {
            const response = await axios.get('/api/upload/?subDoc=Purchase Request&po_status=ready_for_po');
            setReadyPrs(response.data);
        } catch (error) {
            console.error('Error fetching PRs:', error);
        }
    };

    const fetchPrDetails = async (id) => {
        try {
            const response = await axios.get(`/api/upload/${id}/`);
            const doc = response.data;
            setPrDetails(doc);
            
            let prItems = [];
            try {
                prItems = typeof doc.pr_items === 'string' ? JSON.parse(doc.pr_items || '[]') : (doc.pr_items || []);
            } catch (e) { prItems = []; }
            setItems(prItems);

            if (doc.mode_of_procurement) {
                setPoData(prev => ({ ...prev, mode_of_procurement: doc.mode_of_procurement }));
            }
        } catch (error) {
            console.error('Error fetching PR details:', error);
        }
    };

    const handlePrint = useReactToPrint({
        contentRef: printRef,
        documentTitle: `PO_${poData.po_no}`,
    });

    const triggerPrint = (po) => {
        setSelectedPo(po);
        try {
            const poItems = typeof po.po_items === 'string' ? JSON.parse(po.po_items || '[]') : (po.po_items || []);
            setSelectedPoItems(poItems);
            setTimeout(() => handlePrint(), 100);
        } catch (e) {
            console.error(e);
        }
    };

    const viewPo = (po) => {
        setSelectedPo(po);
        try {
            const poItems = typeof po.po_items === 'string' ? JSON.parse(po.po_items || '[]') : (po.po_items || []);
            setSelectedPoItems(poItems);
            setShowPreview(true);
        } catch (e) {
            console.error(e);
        }
    };

    const totalAmount = items.reduce((sum, item) => sum + ((item.quantity || 0) * (item.unit_cost || 0)), 0);

    const isFormValid = () => {
        return selectedPrId && 
               poData.po_no && 
               poData.supplier_name && 
               poData.supplier_address && 
               poData.date && 
               poData.mode_of_procurement && 
               poData.delivery_terms;
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
                pr_document: selectedPrId, 
                po_items: JSON.stringify(items.map(item => ({
                    ...item,
                    final_unit_cost: item.unit_cost,
                    amount: item.quantity * item.unit_cost
                }))), 
                final_total_amount: totalAmount 
            };
            const response = await axios.post('/api/purchase-orders/', payload);
            
            setSuccessMessage('Purchase Order generated successfully!');
            setTimeout(() => {
                setSuccessMessage('');
                setShowForm(false);
                fetchPOs(); // Refresh table
                fetchReadyPrs(); // Refresh dropdown
                // Reset form
                setSelectedPrId('');
                setPoData({
                    po_no: `2026-${new Date().getMonth() + 1}-`,
                    supplier_name: '',
                    supplier_address: '',
                    date: new Date().toISOString().split('T')[0],
                    mode_of_procurement: '',
                    delivery_terms: '7 Working Days upon receipt of PO',
                    tin: '',
                    place_of_delivery: 'DILG Regional Office 1',
                    date_of_delivery: '',
                    payment_term: 'Check',
                    amount_in_words: '',
                    fund_cluster: '01',
                    funds_available: 'Yes',
                    ors_burs_no: '',
                    date_of_ors_burs: '',
                    ors_burs_amount: ''
                });
            }, 2000);
        } catch (error) {
            alert('Failed to generate Purchase Order. Please check if the PO Number already exists.');
        } finally {
            setSaving(false);
        }
    };

    const filteredPOs = pos.filter(po => 
        (po.po_no || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (po.supplier_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (po.pr_document_details?.user_pr_no || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-8 pb-12 animate-in fade-in duration-500 pt-6">
            {/* PAGE HEADER */}
            <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/30 flex flex-col md:flex-row md:items-center justify-between gap-6 transition-all">
                <div className="space-y-1">
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight">Purchase Order Management</h1>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Generate and track Purchase Orders for approved requests.</p>
                </div>
                <button 
                    onClick={() => setShowForm(true)}
                    className="flex items-center gap-3 px-8 py-3.5 bg-[#16a34a] text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-emerald-100 hover:bg-[#15803d] hover:-translate-y-0.5 transition-all active:scale-95"
                >
                    <MdAdd size={22} /> Generate PO
                </button>
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
                                            {po.pr_document_details?.user_pr_no || po.pr_document_details?.prNo}
                                        </p>
                                    </td>
                                    <td className="px-8 py-6">
                                        <p className="text-sm font-bold text-slate-700 truncate max-w-[200px]">{po.supplier_name}</p>
                                    </td>
                                    <td className="px-8 py-6 text-sm text-slate-500 font-medium whitespace-nowrap">
                                        {new Date(po.date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                                    </td>
                                    <td className="px-8 py-6 text-right whitespace-nowrap">
                                        <p className="text-sm font-black text-slate-900">₱{Number(po.final_total_amount).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</p>
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
                                                title="View"
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
                                    <td colSpan="7" className="px-8 py-20 text-center">
                                        <div className="flex flex-col items-center gap-4">
                                            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center text-slate-300">
                                                <MdSearch size={40} />
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">No matching records found</p>
                                            </div>
                                        </div>
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
                                                {pr.user_pr_no || pr.prNo} — {pr.title}
                                            </option>
                                        ))}
                                    </select>
                                    <MdKeyboardArrowDown className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-400 group-hover:text-emerald-500 transition-colors pointer-events-none" size={24} />
                                </div>
                            </div>

                            {selectedPrId && (
                                <div className="space-y-10 animate-in slide-in-from-top-4 duration-500">
                                    {/* PR DETAILS (READ-ONLY) */}
                                    <div className="bg-slate-50/50 rounded-3xl border border-slate-100 overflow-hidden">
                                        <div className="p-6 border-b border-slate-100 bg-white flex items-center gap-3">
                                            <MdInventory className="text-emerald-600" size={20} />
                                            <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-widest">PR Items (Read-Only)</h3>
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
                                                            <td className="px-6 py-4 font-bold text-slate-700">{item.description}</td>
                                                            <td className="px-6 py-4 text-center font-black text-slate-900">{item.quantity}</td>
                                                            <td className="px-6 py-4 text-right text-slate-500 font-medium">₱{Number(item.unit_cost).toLocaleString()}</td>
                                                            <td className="px-6 py-4 text-right font-black text-slate-900">₱{Number(item.quantity * item.unit_cost).toLocaleString()}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                                <tfoot className="bg-slate-900 text-white">
                                                    <tr>
                                                        <td colSpan="4" className="px-6 py-5 text-right text-[10px] font-black uppercase tracking-widest opacity-70">Grand Total</td>
                                                        <td className="px-6 py-5 text-right text-lg font-black tracking-tight">₱{totalAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</td>
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
                                                    onChange={(e) => setPoData({...poData, po_no: e.target.value})} 
                                                    className="w-full px-5 py-4 rounded-xl bg-slate-50 border-2 border-transparent focus:border-emerald-500 focus:bg-white focus:ring-0 font-bold text-slate-800 transition-all shadow-inner" 
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Date</label>
                                                <input 
                                                    type="date" 
                                                    value={poData.date} 
                                                    onChange={(e) => setPoData({...poData, date: e.target.value})} 
                                                    className="w-full px-5 py-4 rounded-xl bg-slate-50 border-2 border-transparent focus:border-emerald-500 focus:bg-white focus:ring-0 font-bold text-slate-800 transition-all shadow-inner" 
                                                />
                                            </div>
                                            <div className="space-y-2 col-span-full">
                                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Supplier Name</label>
                                                <input 
                                                    type="text" 
                                                    value={poData.supplier_name} 
                                                    onChange={(e) => setPoData({...poData, supplier_name: e.target.value})} 
                                                    className="w-full px-5 py-4 rounded-xl bg-slate-50 border-2 border-transparent focus:border-emerald-500 focus:bg-white focus:ring-0 font-bold text-slate-800 transition-all shadow-inner text-lg" 
                                                    placeholder="Enter Official Supplier Name"
                                                />
                                            </div>
                                            <div className="space-y-2 col-span-full">
                                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Supplier Address</label>
                                                <textarea 
                                                    value={poData.supplier_address} 
                                                    onChange={(e) => setPoData({...poData, supplier_address: e.target.value})} 
                                                    className="w-full px-5 py-4 rounded-xl bg-slate-50 border-2 border-transparent focus:border-emerald-500 focus:bg-white focus:ring-0 font-medium text-slate-600 h-24 transition-all shadow-inner resize-none" 
                                                    placeholder="Enter Full Business Address"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Mode of Procurement</label>
                                                <input 
                                                    type="text" 
                                                    value={poData.mode_of_procurement} 
                                                    onChange={(e) => setPoData({...poData, mode_of_procurement: e.target.value})} 
                                                    className="w-full px-5 py-4 rounded-xl bg-slate-50 border-2 border-transparent focus:border-emerald-500 focus:bg-white focus:ring-0 font-bold text-slate-800 transition-all shadow-inner" 
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Delivery Terms</label>
                                                <input 
                                                    type="text" 
                                                    value={poData.delivery_terms} 
                                                    onChange={(e) => setPoData({...poData, delivery_terms: e.target.value})} 
                                                    className="w-full px-5 py-4 rounded-xl bg-slate-50 border-2 border-transparent focus:border-emerald-500 focus:bg-white focus:ring-0 font-bold text-slate-800 transition-all shadow-inner" 
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* FOOTER ACTIONS */}
                                    <div className="pt-6 border-t border-slate-100 flex items-center justify-end gap-4">
                                        <button 
                                            onClick={() => setShowPreview(true)}
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

            {/* PREVIEW MODAL */}
            <Modal
                isOpen={showPreview}
                onClose={() => {
                    setShowPreview(false);
                    setSelectedPo(null);
                }}
                title={selectedPo ? `Purchase Order: ${selectedPo.po_no}` : "Purchase Order Preview"}
                size="2xl"
                containerClassName="!rounded-[2.5rem] overflow-hidden !max-w-4xl"
                bodyClassName="!p-0 bg-slate-800"
                footer={
                    <div className="flex justify-end gap-4">
                        <button 
                            onClick={() => {
                                setShowPreview(false);
                                setSelectedPo(null);
                            }}
                            className="px-6 py-2 bg-white text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest border border-slate-200 hover:bg-slate-50"
                        >
                            Close Preview
                        </button>
                    </div>
                }
            >
                <div className="max-h-[75vh] overflow-y-auto p-12 flex justify-center bg-slate-500/10">
                    <div className="shadow-2xl scale-90 origin-top transform transition-transform">
                        {selectedPo ? (
                            <POPrintLayout ref={previewPrintRef} data={selectedPo} prItems={selectedPoItems} />
                        ) : (
                            <POPrintLayout ref={previewPrintRef} data={{...poData, final_total_amount: totalAmount}} prItems={items} />
                        )}
                    </div>
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
