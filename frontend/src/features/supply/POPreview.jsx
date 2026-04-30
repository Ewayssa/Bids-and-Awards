import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { purchaseOrderService } from '../../services/api';
import POPrintLayout from './POPrintLayout';
import { MdPrint, MdClose } from 'react-icons/md';
import { useReactToPrint } from 'react-to-print';

const POPreview = () => {
    const { id } = useParams();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const printRef = useRef();

    useEffect(() => {
        const fetchData = async () => {
            if (id === 'new') {
                try {
                    const savedData = localStorage.getItem('pending_po_preview');
                    if (savedData) {
                        const parsed = JSON.parse(savedData);
                        setData(parsed);
                        document.title = `Preview: ${parsed.po_no || 'New Purchase Order'}`;
                    }
                } catch (e) {
                    console.error('Failed to parse preview data:', e);
                } finally {
                    setLoading(false);
                }
                return;
            }

            try {
                const po = await purchaseOrderService.getById(id);
                setData(po);
                document.title = `PO: ${po.po_no}`;
            } catch (err) {
                console.error('Failed to fetch PO:', err);
            } finally {
                setLoading(false);
            }
        };
        if (id) fetchData();
    }, [id]);

    const handlePrint = useReactToPrint({
        contentRef: printRef,
        documentTitle: `PO_${data?.po_no || 'Document'}`,
    });

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-slate-50 text-slate-900 gap-4">
                <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-[10px] font-black uppercase tracking-[0.3em]">Loading Purchase Order...</p>
            </div>
        );
    }

    if (!data) {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-slate-50 text-slate-900 gap-4">
                <div className="text-red-500 text-5xl font-black">!</div>
                <p className="text-[10px] font-black uppercase tracking-[0.3em]">Purchase Order not found.</p>
                <button onClick={() => window.close()} className="mt-4 px-6 py-2 bg-white rounded-xl text-[10px] font-black uppercase tracking-widest border border-slate-200 hover:bg-slate-50 transition-all">Close Tab</button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-100 flex flex-col items-center py-8 px-4 overflow-y-auto">
            {/* Minimalist Floating Action Button */}
            <div className="fixed bottom-8 right-8 z-50 flex gap-3">
                <button 
                    onClick={handlePrint}
                    className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-full font-black uppercase tracking-widest text-[10px] shadow-2xl hover:scale-105 transition-all active:scale-95"
                >
                    <MdPrint size={18} /> Print PDF
                </button>
            </div>

            {/* The Document */}
            <div className="bg-white shadow-[0_0_50px_rgba(0,0,0,0.1)] rounded-sm overflow-hidden ring-1 ring-slate-200">
                <POPrintLayout 
                    ref={printRef} 
                    data={data} 
                    prItems={data.purchase_request_details?.items || []} 
                />
            </div>

            <div className="h-12" /> {/* Spacer */}
        </div>
    );
};

export default POPreview;
