import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
    MdClose, MdDescription, MdChevronRight, MdChevronLeft,
    MdCheckCircle, MdInfo, MdAdd, MdDelete, MdPostAdd,
    MdFolderOpen, MdError, MdGroup
} from 'react-icons/md';
import { DOC_TYPES } from '../../../constants/docTypes';

const ICON_MAP = {
    initial: MdFolderOpen,
    afq: MdDescription,
    meeting: MdGroup,
    award: MdCheckCircle,
    posting: MdPostAdd,
};

const NewProcurementModal = ({
    show,
    onClose,
    newStep,
    setNewStep,
    selectedDocType,
    setSelectedDocType,
    selectedSubDocType,
    setSelectedSubDocType,
    form,
    setForm,
    updateFormField,
    newFormErrors,
    setManualErrors,
    newSubmitting,
    newError,
    nextTransactionNumber,
    handleNewSubmit,
    alreadyUploaded,
    attendanceMembers,
    setAttendanceMembers,
    abstractBidders,
    setAbstractBidders,
    certificateServiceProviders,
    setCertificateServiceProviders,
    toLettersOnly,
    toNumbersOnly,
    computeRFQNoFromDate,
}) => {
    useEffect(() => {
        if (show) {
            const originalHtmlStyle = window.getComputedStyle(document.documentElement).overflow;
            const originalBodyStyle = window.getComputedStyle(document.body).overflow;
            document.documentElement.style.overflow = 'hidden';
            document.body.style.overflow = 'hidden';
            return () => {
                document.documentElement.style.overflow = originalHtmlStyle;
                document.body.style.overflow = originalBodyStyle;
            };
        }
    }, [show]);

    if (!show) return null;

    const stepLabels = ['Document type', 'Sub-document', 'Details'];
    const stepIndex = newStep === 'docType' ? 0 : newStep === 'subDoc' ? 1 : 2;

    // Group sub-docs by prefix (e.g. "PHILGEPS" or "Certificate of DILG")
    const getGroupedSubDocs = (docType) => {
        if (!docType) return {};
        const grouped = {};
        docType.subDocs.forEach((sd) => {
            const parts = sd.split(' - ');
            const group = parts.length > 1 ? parts[0] : 'Others';
            if (!grouped[group]) grouped[group] = [];
            grouped[group].push(sd);
        });
        return grouped;
    };

    // Render specialized form fields per sub-doc type
    const renderSpecificFields = () => {
        // RFQ Concerns - PHILGEPS - Lease of Venue: no data needed
        if (selectedSubDocType === 'PHILGEPS - Lease of Venue') {
            return (
                <div className="text-sm text-[var(--text-muted)] p-5 border-2 border-dashed border-green-200 bg-green-50 rounded-2xl flex items-start gap-3">
                    <MdInfo className="w-6 h-6 text-green-600 shrink-0" />
                    <span>No extra data required. The document will be marked complete upon submission.</span>
                </div>
            );
        }

        // Certificate of DILG - Small Value Procurement: RFQ No + providers + deadline
        if (selectedSubDocType?.startsWith('Certificate of DILG - Small Value Procurement')) {
            return (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-[var(--text-muted)] uppercase">RFQ No. (auto)</label>
                        <input
                            type="text"
                            value={form.user_pr_no || (form.date ? computeRFQNoFromDate(form.date) : '')}
                            readOnly
                            className="input-field w-full h-[56px] px-5 bg-gray-50/50 cursor-default font-mono"
                        />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                        <label className="text-xs font-bold text-[var(--text-muted)] uppercase">Service Providers (all 3 required)</label>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            {certificateServiceProviders.map((sp, idx) => (
                                <input
                                    key={idx}
                                    type="text"
                                    value={sp}
                                    onChange={(e) => {
                                        const next = [...certificateServiceProviders];
                                        next[idx] = e.target.value;
                                        setCertificateServiceProviders(next);
                                    }}
                                    className="input-field h-[50px] px-4 text-sm"
                                    placeholder={`Provider ${idx + 1}`}
                                />
                            ))}
                        </div>
                        <button
                            type="button"
                            onClick={() => setCertificateServiceProviders((prev) => [...prev, ''])}
                            className="text-[10px] font-bold text-[var(--primary)] uppercase tracking-wider hover:opacity-80 flex items-center gap-1 mt-2"
                        >
                            <MdAdd /> Add another provider
                        </button>
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-[var(--text-muted)] uppercase">Deadline Date</label>
                        <input type="date" value={form.deadline_date} onChange={(e) => updateFormField('deadline_date', e.target.value)} className="input-field w-full h-[50px] px-4" />
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-[var(--text-muted)] uppercase">Deadline Time</label>
                        <input type="time" value={form.deadline_time} onChange={(e) => updateFormField('deadline_time', e.target.value)} className="input-field w-full h-[50px] px-4" />
                    </div>
                </div>
            );
        }

        // Purchase Request / Activity Design / PPMP
        if (['Purchase Request', 'Activity Design', 'Project Procurement Management Plan/Supplemental PPMP'].includes(selectedSubDocType)) {
            return (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-[var(--text-muted)] uppercase">PR No.</label>
                        <input type="text" value={form.user_pr_no} onChange={(e) => updateFormField('user_pr_no', toNumbersOnly(e.target.value))} className="input-field w-full h-[56px] px-5" placeholder="Enter PR number" />
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-[var(--text-muted)] uppercase">Total Amount</label>
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-gray-400 font-bold">₱</div>
                            <input
                                type="text" inputMode="decimal" value={form.total_amount}
                                onChange={(e) => updateFormField('total_amount', toNumbersOnly(e.target.value))}
                                onBlur={() => { const r = String(form.total_amount || '').trim(); if (r && !isNaN(Number(r))) updateFormField('total_amount', Number(r).toFixed(2)); }}
                                className="input-field w-full h-[56px] pl-10 px-5 text-right font-mono" placeholder="0.00"
                            />
                        </div>
                    </div>
                </div>
            );
        }

        // Annual Procurement Plan
        if (selectedSubDocType === 'Annual Procurement Plan') {
            return (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-[var(--text-muted)] uppercase">APP Type</label>
                        <select value={form.app_type} onChange={(e) => updateFormField('app_type', e.target.value)} className="input-field w-full h-[56px] px-5 font-bold">
                            <option value="">Select Category</option>
                            <option value="Final">Final</option>
                            <option value="Updated">Updated</option>
                        </select>
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-[var(--text-muted)] uppercase">Certified True Copy?</label>
                        <div className="flex items-center gap-6 h-[56px]">
                            {[{ val: true, label: 'Yes' }, { val: false, label: 'No' }].map(({ val, label }) => (
                                <label key={label} className="flex items-center gap-2 cursor-pointer group">
                                    <input type="radio" checked={form.certified_true_copy === val}
                                        onChange={() => { updateFormField('certified_true_copy', val); if (!val) updateFormField('certified_signed_by', ''); }}
                                        className="w-5 h-5 text-[var(--primary)] focus:ring-[var(--primary)]" />
                                    <span className="text-sm font-bold text-[var(--text)] group-hover:text-[var(--primary)]">{label}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                    {form.certified_true_copy && (
                        <div className="space-y-2 md:col-span-2">
                            <label className="text-xs font-bold text-[var(--text-muted)] uppercase">Signed By</label>
                            <input type="text" value={form.certified_signed_by} onChange={(e) => updateFormField('certified_signed_by', e.target.value)} className="input-field w-full h-[56px] px-5" placeholder="Name of signatory" />
                        </div>
                    )}
                </div>
            );
        }

        // Market Scopping
        if (selectedSubDocType === 'Market Scopping') {
            return (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-[var(--text-muted)] uppercase">Budget</label>
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-gray-400 font-bold">₱</div>
                            <input type="text" inputMode="decimal" value={form.market_budget}
                                onChange={(e) => updateFormField('market_budget', toNumbersOnly(e.target.value))}
                                onBlur={() => { const r = String(form.market_budget || '').trim(); if (r && !isNaN(Number(r))) updateFormField('market_budget', Number(r).toFixed(2)); }}
                                className="input-field w-full h-[56px] pl-10 px-5 text-right font-mono" placeholder="0.00" />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-[var(--text-muted)] uppercase">Expected Delivery</label>
                        <input type="month" value={form.market_expected_delivery} onChange={(e) => updateFormField('market_expected_delivery', e.target.value)} className="input-field w-full h-[56px] px-5" />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                        <label className="text-xs font-bold text-[var(--text-muted)] uppercase">Period of Market Scoping</label>
                        <div className="grid grid-cols-2 gap-4">
                            <input type="month" value={form.market_period_from} onChange={(e) => updateFormField('market_period_from', e.target.value)} className="input-field w-full h-[56px] px-5" />
                            <input type="month" value={form.market_period_to} onChange={(e) => updateFormField('market_period_to', e.target.value)} className="input-field w-full h-[56px] px-5" />
                        </div>
                    </div>
                    <div className="space-y-2 md:col-span-2">
                        <label className="text-xs font-bold text-[var(--text-muted)] uppercase">Service Providers (all 3 required)</label>
                        <div className="space-y-3">
                            {['market_service_provider_1', 'market_service_provider_2', 'market_service_provider_3'].map((field, i) => (
                                <input key={field} type="text" value={form[field]} onChange={(e) => updateFormField(field, toLettersOnly(e.target.value))} className="input-field w-full h-[50px] px-4" placeholder={`Provider ${i + 1}`} />
                            ))}
                        </div>
                    </div>
                </div>
            );
        }

        // Requisition and Issue Slip
        if (selectedSubDocType === 'Requisition and Issue Slip') {
            return (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-[var(--text-muted)] uppercase">Office/Division</label>
                        <input type="text" value={form.office_division} onChange={(e) => updateFormField('office_division', toLettersOnly(e.target.value))} className="input-field w-full h-[56px] px-5" placeholder="Office or division" />
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-[var(--text-muted)] uppercase">Received By</label>
                        <input type="text" value={form.received_by} onChange={(e) => updateFormField('received_by', toLettersOnly(e.target.value))} className="input-field w-full h-[56px] px-5" placeholder="Name of recipient" />
                    </div>
                </div>
            );
        }

        // Attendance Sheet
        if (selectedSubDocType === 'Attendance Sheet') {
            return (
                <div className="space-y-4">
                    <label className="text-xs font-bold text-[var(--text-muted)] uppercase block">BAC Members (check those present)</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[300px] overflow-y-auto p-4 bg-gray-50 rounded-2xl border border-gray-100">
                        {attendanceMembers.map((m) => (
                            <div key={m.id} className="flex items-center justify-between p-3 bg-white rounded-xl shadow-sm border border-gray-100 group hover:border-[var(--primary-muted)] transition-all">
                                <span className="text-sm font-bold text-[var(--text)] truncate mr-2" title={m.name}>{m.name}</span>
                                <label className="flex items-center gap-2 cursor-pointer shrink-0">
                                    <input type="checkbox" checked={m.present}
                                        onChange={(e) => setAttendanceMembers((prev) => prev.map((x) => (x.id === m.id ? { ...x, present: e.target.checked } : x)))}
                                        className="w-5 h-5 rounded border-gray-300 text-[var(--primary)] focus:ring-[var(--primary)]" />
                                    <span className="text-[10px] font-black uppercase tracking-tighter text-gray-400 group-hover:text-[var(--primary)]">Present</span>
                                </label>
                            </div>
                        ))}
                        {attendanceMembers.length === 0 && (
                            <div className="col-span-full py-8 text-center text-gray-400 italic text-sm">No BAC members found in system.</div>
                        )}
                    </div>
                </div>
            );
        }

        // BAC Resolution
        if (selectedSubDocType === 'BAC Resolution') {
            return (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-[var(--text-muted)] uppercase">Resolution No.</label>
                        <input type="text" value={form.resolution_no} onChange={(e) => updateFormField('resolution_no', toNumbersOnly(e.target.value))} className="input-field w-full h-[56px] px-5" placeholder="Resolution number" />
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-[var(--text-muted)] uppercase">Winning Bidder</label>
                        <input type="text" value={form.winning_bidder} onChange={(e) => updateFormField('winning_bidder', toLettersOnly(e.target.value))} className="input-field w-full h-[56px] px-5" placeholder="Company name" />
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-[var(--text-muted)] uppercase">Award Amount</label>
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-gray-400 font-bold">₱</div>
                            <input type="text" inputMode="decimal" value={form.total_amount} onChange={(e) => updateFormField('total_amount', toNumbersOnly(e.target.value))} className="input-field w-full h-[56px] pl-10 px-5 text-right font-mono" placeholder="0.00" />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-[var(--text-muted)] uppercase">Resolution Option</label>
                        <select value={form.resolution_option} onChange={(e) => updateFormField('resolution_option', e.target.value)} className="input-field w-full h-[56px] px-5 font-bold">
                            <option value="">Select Option</option>
                            {['LCB', 'LCRB', 'SCB', 'SCRB'].map((o) => <option key={o} value={o}>{o}</option>)}
                        </select>
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-[var(--text-muted)] uppercase">Office/Division</label>
                        <input type="text" value={form.office_division} onChange={(e) => updateFormField('office_division', toLettersOnly(e.target.value))} className="input-field w-full h-[56px] px-5" placeholder="Office or division" />
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-[var(--text-muted)] uppercase">Venue of Adoption</label>
                        <input type="text" value={form.venue} onChange={(e) => updateFormField('venue', toLettersOnly(e.target.value))} className="input-field w-full h-[56px] px-5" placeholder="Venue" />
                    </div>
                </div>
            );
        }

        // Abstract of Quotation
        if (selectedSubDocType === 'Abstract of Quotation') {
            return (
                <div className="space-y-8">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-[var(--text-muted)] uppercase">AOQ No.</label>
                        <input type="text" value={form.aoq_no} onChange={(e) => updateFormField('aoq_no', toNumbersOnly(e.target.value))} className="input-field w-full h-[56px] px-5 font-mono" placeholder="AOQ number" />
                    </div>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <label className="text-xs font-bold text-[var(--text-muted)] uppercase">Bidders (min. 3 required)</label>
                            <span className="text-[10px] font-black text-[var(--primary)] bg-[var(--primary-muted)]/10 px-2 py-1 rounded">{abstractBidders.length} ADDED</span>
                        </div>
                        {abstractBidders.map((b) => (
                            <div key={b.id} className="p-5 bg-gray-50 rounded-2xl border border-gray-100 relative">
                                <button type="button" onClick={() => setAbstractBidders((prev) => prev.filter((x) => x.id !== b.id))} className="absolute top-3 right-3 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"><MdDelete className="w-5 h-5" /></button>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase">Bidder Name</label>
                                        <input type="text" value={b.name} onChange={(e) => setAbstractBidders((prev) => prev.map((x) => (x.id === b.id ? { ...x, name: toLettersOnly(e.target.value) } : x)))} className="input-field w-full h-[46px] px-4 text-sm" placeholder="Name" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase">Bid Amount</label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₱</span>
                                            <input type="text" inputMode="decimal" value={b.amount} onChange={(e) => setAbstractBidders((prev) => prev.map((x) => (x.id === b.id ? { ...x, amount: toNumbersOnly(e.target.value) } : x)))} className="input-field w-full h-[46px] pl-7 pr-4 text-sm text-right" placeholder="0.00" />
                                        </div>
                                    </div>
                                    <div className="space-y-1 sm:col-span-2">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase">Remarks</label>
                                        <input type="text" value={b.remarks} onChange={(e) => setAbstractBidders((prev) => prev.map((x) => (x.id === b.id ? { ...x, remarks: e.target.value } : x)))} className="input-field w-full h-[46px] px-4 text-sm" placeholder="e.g. Compliant" />
                                    </div>
                                </div>
                            </div>
                        ))}
                        <button type="button" onClick={() => setAbstractBidders((prev) => [...prev, { id: Date.now(), name: '', amount: '', remarks: '' }])} className="w-full py-4 border-2 border-dashed border-gray-200 rounded-2xl text-sm font-bold text-gray-400 hover:border-[var(--primary)] hover:text-[var(--primary)] transition-all flex items-center justify-center gap-2">
                            <MdAdd /> Add Bidder
                        </button>
                    </div>
                </div>
            );
        }

        // Contract Services/Purchase Order
        if (selectedSubDocType === 'Contract Services/Purchase Order') {
            return (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-[var(--text-muted)] uppercase">Received by COA?</label>
                        <select value={form.contract_received_by_coa === true ? 'yes' : form.contract_received_by_coa === false ? 'no' : ''} onChange={(e) => { const v = e.target.value; updateFormField('contract_received_by_coa', v === 'yes' ? true : v === 'no' ? false : null); }} className="input-field w-full h-[56px] px-5 font-bold">
                            <option value="">Select</option>
                            <option value="yes">Yes</option>
                            <option value="no">No</option>
                        </select>
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-[var(--text-muted)] uppercase">Contract Amount</label>
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-gray-400 font-bold">₱</div>
                            <input type="text" inputMode="decimal" value={form.contract_amount}
                                onChange={(e) => updateFormField('contract_amount', toNumbersOnly(e.target.value))}
                                onBlur={() => { const r = String(form.contract_amount || '').trim(); if (r && !isNaN(Number(r))) updateFormField('contract_amount', Number(r).toFixed(2)); }}
                                className="input-field w-full h-[56px] pl-10 px-5 text-right font-mono" placeholder="0.00" />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-[var(--text-muted)] uppercase">Notarization Place</label>
                        <input type="text" value={form.notarized_place} onChange={(e) => updateFormField('notarized_place', e.target.value)} className="input-field w-full h-[56px] px-5" placeholder="Venue" />
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-[var(--text-muted)] uppercase">Notarization Date</label>
                        <input type="date" value={form.notarized_date} onChange={(e) => updateFormField('notarized_date', e.target.value)} className="input-field w-full h-[56px] px-5" />
                    </div>
                </div>
            );
        }

        // Notice to Proceed / OSS / Secretary's Cert
        if (['Notice to Proceed', 'OSS', "Applicable: Secretary's Certificate and Special Power of Attorney"].includes(selectedSubDocType)) {
            const prefix = selectedSubDocType === 'Notice to Proceed' ? 'ntp' : selectedSubDocType === 'OSS' ? 'oss' : 'secretary';
            const repField = prefix === 'secretary' ? 'secretary_owner_rep' : `${prefix}_authorized_rep`;
            return (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-[var(--text-muted)] uppercase">Service Provider</label>
                        <input type="text" value={form[`${prefix}_service_provider`]} onChange={(e) => updateFormField(`${prefix}_service_provider`, toLettersOnly(e.target.value))} className="input-field w-full h-[56px] px-5" placeholder="Provider name" />
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-[var(--text-muted)] uppercase">{selectedSubDocType === 'Notice to Proceed' ? 'Auth. Rep / Owner' : 'Authorized Representative'}</label>
                        <input type="text" value={form[repField] || ''} onChange={(e) => updateFormField(repField, toLettersOnly(e.target.value))} className="input-field w-full h-[56px] px-5" placeholder="Name" />
                    </div>
                    {selectedSubDocType === 'Notice to Proceed' && (
                        <div className="space-y-2 md:col-span-2">
                            <label className="text-xs font-bold text-[var(--text-muted)] uppercase">Received By</label>
                            <input type="text" value={form.ntp_received_by} onChange={(e) => updateFormField('ntp_received_by', toLettersOnly(e.target.value))} className="input-field w-full h-[56px] px-5" placeholder="Recipient name" />
                        </div>
                    )}
                </div>
            );
        }

        // Invitation to COA
        if (selectedSubDocType === 'Invitation to COA') {
            return (
                <div className="space-y-2">
                    <label className="text-xs font-bold text-[var(--text-muted)] uppercase">Date Received</label>
                    <input type="date" value={form.date_received} onChange={(e) => updateFormField('date_received', e.target.value)} className="input-field w-full h-[56px] px-5" />
                </div>
            );
        }

        return null; // Default: no extra fields
    };

    const DocIcon = selectedDocType ? (ICON_MAP[selectedDocType.id] || MdDescription) : MdDescription;

    const modalContent = (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-white/5 backdrop-blur-[4px] animate-in fade-in duration-300 overflow-y-auto" aria-modal="true" role="dialog">
            <div className="card-elevated max-w-4xl w-full my-auto shadow-2xl rounded-3xl border-0 flex flex-col animate-in zoom-in-95 duration-200" style={{ maxHeight: '90vh' }}>

                {/* Header */}
                <div className="p-6 sm:p-8 border-b border-[var(--border-light)] flex items-center justify-between bg-[var(--surface)] shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-[var(--primary-muted)]/20 rounded-2xl">
                            <MdDescription className="w-8 h-8 text-[var(--primary)]" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-[var(--text)] tracking-tight">New Procurement</h2>
                            <p className="text-sm text-[var(--text-muted)] font-medium mt-0.5">Initialize a new procurement document flow</p>
                        </div>
                    </div>
                    <button type="button" onClick={onClose} className="p-3 text-[var(--text-muted)] hover:bg-[var(--background-subtle)] hover:text-[var(--text)] rounded-xl transition-all duration-200 active:scale-90" aria-label="Close">
                        <MdClose className="w-6 h-6" />
                    </button>
                </div>

                {/* Stepper */}
                <div className="px-8 py-5 bg-[var(--background-subtle)]/30 border-b border-[var(--border-light)] shrink-0">
                    <div className="flex items-center justify-between max-w-2xl mx-auto relative">
                        <div className="absolute top-5 left-0 w-full h-[2px] bg-gray-200 z-0" />
                        <div className="absolute top-5 left-0 h-[2px] bg-[var(--primary)] z-0 transition-all duration-500 ease-out" style={{ width: `${(stepIndex / (stepLabels.length - 1)) * 100}%` }} />
                        {stepLabels.map((label, idx) => (
                            <div key={label} className="relative z-10 flex flex-col items-center gap-2">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-500 ring-4 ${idx <= stepIndex ? 'bg-[var(--primary)] text-white ring-[var(--primary-muted)]/30 shadow-lg' : 'bg-white text-gray-400 ring-gray-50 border-2 border-gray-200 shadow-sm'}`}>
                                    {idx < stepIndex ? <MdCheckCircle className="w-6 h-6" /> : idx + 1}
                                </div>
                                <span className={`text-[11px] font-bold uppercase tracking-widest transition-colors duration-300 ${idx <= stepIndex ? 'text-[var(--primary)]' : 'text-gray-400'}`}>{label}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Scrollable content */}
                <div className="flex-1 overflow-y-auto overflow-x-hidden bg-[var(--surface)]">

                    {/* ── STEP 1: Choose Document Type ── */}
                    {newStep === 'docType' && (
                        <div className="p-8">
                            <div className="text-center mb-10">
                                <h3 className="text-xl font-bold text-[var(--text)] mb-2">What kind of document are you encoding?</h3>
                                <p className="text-sm text-[var(--text-muted)]">Select a primary category to see available sub-documents</p>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 max-w-4xl mx-auto">
                                {DOC_TYPES.map((type) => {
                                    const Icon = ICON_MAP[type.id] || MdDescription;
                                    return (
                                        <button
                                            key={type.id}
                                            type="button"
                                            onClick={() => { setSelectedDocType(type); updateFormField('category', type.name); setNewStep('subDoc'); }}
                                            className="group relative flex flex-col items-center p-8 rounded-3xl border-2 border-[var(--border)] bg-white hover:border-[var(--primary)] hover:bg-[var(--primary-muted)]/5 hover:shadow-xl transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-[var(--primary-muted)]/20 active:scale-[0.98]"
                                        >
                                            <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <MdChevronRight className="w-5 h-5 text-[var(--primary)]" />
                                            </div>
                                            <div className="p-5 rounded-2xl bg-[var(--background-subtle)] group-hover:bg-[var(--primary-muted)]/20 group-hover:scale-110 transition-all duration-500 mb-5 shadow-sm">
                                                <Icon className="w-10 h-10 text-[var(--text-muted)] group-hover:text-[var(--primary)] transition-colors duration-300" />
                                            </div>
                                            <h4 className="text-base font-bold text-[var(--text)] group-hover:text-[var(--primary)] transition-colors mb-1 text-center">{type.name}</h4>
                                            <p className="text-xs text-[var(--text-muted)] text-center font-medium">{type.subDocs.length} types</p>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* ── STEP 2: Choose Sub-Document ── */}
                    {newStep === 'subDoc' && selectedDocType && (
                        <div className="p-8">
                            <div className="flex items-center gap-4 mb-8 max-w-4xl mx-auto">
                                <div className="p-3 bg-[var(--primary-muted)]/20 rounded-xl shrink-0">
                                    <DocIcon className="w-7 h-7 text-[var(--primary)]" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-[var(--text)]">{selectedDocType.name}</h3>
                                    <p className="text-sm text-[var(--text-muted)] font-medium">Choose the specific document to upload</p>
                                </div>
                            </div>

                            <div className="max-w-4xl mx-auto space-y-8">
                                {(() => {
                                    const grouped = getGroupedSubDocs(selectedDocType);
                                    return Object.entries(grouped).map(([group, sds]) => (
                                        <div key={group} className="space-y-3">
                                            {group !== 'Others' && (
                                                <h4 className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-[0.2em] flex items-center gap-3">
                                                    <span className="shrink-0">{group}</span>
                                                    <hr className="w-full border-[var(--border-light)]" />
                                                </h4>
                                            )}
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                {sds.map((sd) => {
                                                    const uploaded = alreadyUploaded(sd);
                                                    return (
                                                        <button
                                                            key={sd}
                                                            type="button"
                                                            disabled={uploaded}
                                                            onClick={() => { if (uploaded) return; setSelectedSubDocType(sd); updateFormField('subDoc', sd); setNewStep('form'); }}
                                                            className={`group w-full text-left p-4 rounded-2xl border-2 transition-all duration-300 flex items-center justify-between gap-3 ${uploaded ? 'border-[var(--border-light)] bg-gray-50 text-gray-400 cursor-not-allowed' : 'border-[var(--border)] bg-white hover:border-[var(--primary)] hover:bg-[var(--primary-muted)]/5 hover:shadow-md active:scale-[0.98]'}`}
                                                        >
                                                            <div className="flex items-center gap-3">
                                                                <div className={`p-2 rounded-lg ${uploaded ? 'bg-gray-100' : 'bg-gray-50 group-hover:bg-[var(--primary-muted)]/20'}`}>
                                                                    <MdDescription className={`w-4 h-4 ${uploaded ? 'text-gray-300' : 'text-[var(--text-muted)] group-hover:text-[var(--primary)]'}`} />
                                                                </div>
                                                                <span className="text-sm font-bold tracking-tight">{sd}</span>
                                                            </div>
                                                            {uploaded ? (
                                                                <span className="flex items-center gap-1 text-[10px] font-bold text-teal-600 bg-teal-50 px-2 py-1 rounded-md shrink-0 border border-teal-100">
                                                                    <MdCheckCircle className="w-3.5 h-3.5" /> SUBMITTED
                                                                </span>
                                                            ) : (
                                                                <MdChevronRight className="w-5 h-5 text-gray-300 group-hover:text-[var(--primary)] group-hover:translate-x-1 transition-all shrink-0" />
                                                            )}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ));
                                })()}

                                <div className="pt-4">
                                    <button type="button" onClick={() => { setSelectedSubDocType(null); setNewStep('docType'); }} className="btn-secondary inline-flex items-center gap-2 group">
                                        <MdChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                                        Back to Categories
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── STEP 3: Fill Out Details ── */}
                    {newStep === 'form' && selectedDocType && (
                        <form id="new-procurement-form" onSubmit={handleNewSubmit}>
                            <div className="p-8 space-y-8">

                                {/* Banner */}
                                <div className="bg-gradient-to-br from-[var(--primary-muted)]/10 to-[var(--surface)] p-6 rounded-3xl border border-[var(--primary-muted)]/20 shadow-sm flex flex-col sm:flex-row items-center gap-6">
                                    <div className="p-4 bg-white rounded-2xl shadow-lg shadow-[var(--primary-muted)]/10 shrink-0">
                                        <DocIcon className="w-10 h-10 text-[var(--primary)]" />
                                    </div>
                                    <div className="text-center sm:text-left">
                                        <div className="flex flex-wrap justify-center sm:justify-start items-center gap-2 mb-1">
                                            <span className="text-[10px] font-black text-[var(--primary)] uppercase tracking-[0.2em]">{selectedDocType.name}</span>
                                            <MdChevronRight className="text-gray-300 w-4 h-4" />
                                            <span className="text-[10px] font-black text-[var(--text)] uppercase tracking-[0.2em]">{selectedSubDocType}</span>
                                        </div>
                                        <h3 className="text-xl font-black text-[var(--text)] leading-tight">Fill Out Details</h3>
                                    </div>
                                </div>

                                {/* Error banner */}
                                {newError && (
                                    <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-xl flex items-center gap-3" role="alert">
                                        <MdError className="w-5 h-5 text-red-600 shrink-0" />
                                        <p className="text-sm font-bold text-red-800">{newError}</p>
                                    </div>
                                )}

                                {/* Required fields */}
                                <div className="space-y-5 bg-white p-6 rounded-3xl border border-[var(--border-light)] shadow-sm">
                                    <h4 className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-[0.2em]">Required Identification</h4>

                                    {/* Title — hidden for PHILGEPS docs */}
                                    {!selectedSubDocType?.startsWith('PHILGEPS - ') && (
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-[var(--text-muted)] uppercase flex justify-between px-0.5">
                                                <span>Title / Purpose</span>
                                                <span className="text-[9px] font-black text-red-500">REQUIRED</span>
                                            </label>
                                            <textarea
                                                required
                                                value={form.title}
                                                onChange={(e) => { updateFormField('title', toLettersOnly(e.target.value)); if (newFormErrors.title) setManualErrors((p) => ({ ...p, title: '' })); }}
                                                className={`input-field w-full min-h-[90px] resize-none py-3 px-4 ${newFormErrors.title ? 'border-red-500 ring-2 ring-red-500/10' : ''}`}
                                                placeholder="Enter the document title or purpose..."
                                            />
                                            {newFormErrors.title && <p className="text-xs font-bold text-red-500 px-0.5">{newFormErrors.title}</p>}
                                        </div>
                                    )}

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-[var(--text-muted)] uppercase flex justify-between px-0.5">
                                                <span>Date on Document</span>
                                                <span className="text-[9px] font-black text-red-500">REQUIRED</span>
                                            </label>
                                            <input
                                                type="date" required value={form.date}
                                                onChange={(e) => { const d = e.target.value; setForm((f) => ({ ...f, date: d, user_pr_no: computeRFQNoFromDate(d) })); if (newFormErrors.date) setManualErrors((p) => ({ ...p, date: '' })); }}
                                                className={`input-field w-full h-[52px] px-4 ${newFormErrors.date ? 'border-red-500 ring-2 ring-red-500/10' : ''}`}
                                            />
                                            {newFormErrors.date && <p className="text-xs font-bold text-red-500 px-0.5">{newFormErrors.date}</p>}
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-[var(--text-muted)] uppercase px-0.5">BAC Folder No.</label>
                                            <div className="relative">
                                                <MdFolderOpen className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                                <input type="text" value={form.prNo || (nextTransactionNumber === null ? 'Generating...' : nextTransactionNumber ?? '—')} readOnly className="input-field w-full h-[52px] pl-10 bg-gray-50/50 cursor-default font-mono text-sm border-dashed opacity-70" />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Specific fields */}
                                {renderSpecificFields() && (
                                    <div className="space-y-5 bg-white p-6 rounded-3xl border border-[var(--border-light)] shadow-sm">
                                        <h4 className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-[0.2em]">Document-Specific Data</h4>
                                        {renderSpecificFields()}
                                    </div>
                                )}

                                {/* File upload */}
                                <div className="space-y-4 bg-white p-6 rounded-3xl border border-[var(--border-light)] shadow-sm">
                                    <h4 className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-[0.2em]">Attachment</h4>
                                    <div className="flex flex-col sm:flex-row items-center justify-between gap-5">
                                        <p className="text-xs text-[var(--text-muted)] max-w-xs leading-relaxed">
                                            Upload a clear scan of the document (PDF, DOC, XLS or image). Required for audit tracking unless the document type is exempt.
                                        </p>
                                        <div className="relative group overflow-hidden shrink-0">
                                            <input
                                                type="file"
                                                onChange={(e) => { updateFormField('file', e.target.files[0]); if (newFormErrors.file) setManualErrors((p) => ({ ...p, file: '' })); }}
                                                className="absolute inset-0 opacity-0 cursor-pointer z-10"
                                                accept=".pdf,image/*,.doc,.docx,.xls,.xlsx"
                                            />
                                            <div className={`flex items-center gap-3 px-6 py-3 rounded-2xl border-2 font-bold uppercase tracking-widest text-xs transition-all duration-300 ${form.file ? 'bg-green-50 border-green-200 text-green-700' : 'bg-[var(--primary-muted)]/10 border-[var(--primary-muted)]/30 text-[var(--primary)] group-hover:bg-[var(--primary-muted)]/20'}`}>
                                                {form.file ? <MdCheckCircle className="w-5 h-5" /> : <MdAdd className="w-5 h-5" />}
                                                <span>{form.file ? form.file.name.substring(0, 18) + (form.file.name.length > 18 ? '…' : '') : 'Upload File'}</span>
                                            </div>
                                        </div>
                                    </div>
                                    {newFormErrors.file && <p className="text-xs font-bold text-red-500">{newFormErrors.file}</p>}
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="p-6 sm:p-8 border-t border-[var(--border-light)] bg-white/80 backdrop-blur-md flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0">
                                <button type="button" onClick={() => { setSelectedSubDocType(null); setNewStep('subDoc'); }} className="btn-secondary w-full sm:w-auto h-[52px] px-8 rounded-2xl flex items-center justify-center gap-2 group">
                                    <MdChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                                    Change Type
                                </button>
                                <div className="flex items-center gap-4 w-full sm:w-auto">
                                    <button type="button" onClick={onClose} className="text-xs font-black text-[var(--text-muted)] uppercase tracking-[0.15em] hover:text-[var(--text)] transition-colors px-4 h-[52px]">Cancel</button>
                                    <button
                                        type="submit"
                                        disabled={newSubmitting}
                                        className="btn-primary flex-1 sm:flex-none h-[52px] px-10 rounded-2xl flex items-center justify-center gap-3 shadow-lg disabled:opacity-50"
                                    >
                                        {newSubmitting ? (
                                            <><div className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" /><span className="uppercase tracking-widest font-black text-xs">Saving…</span></>
                                        ) : (
                                            <><MdCheckCircle className="w-5 h-5" /><span className="uppercase tracking-widest font-black text-xs">Submit</span></>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
};

export default NewProcurementModal;
