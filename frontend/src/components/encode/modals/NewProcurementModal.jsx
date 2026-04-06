import React from 'react';
import {
    MdClose, MdDescription, MdChevronRight, MdChevronLeft,
    MdCheckCircle, MdInfo, MdAdd, MdDelete, MdPostAdd,
    MdFolderOpen, MdError, MdGroup, MdDone
} from 'react-icons/md';
import { DOC_TYPES } from '../../../constants/docTypes';
import Modal from '../../Modal';

const ICON_MAP = {
    initial: MdFolderOpen,
    afq: MdDescription,
    meeting: MdGroup,
    award: MdCheckCircle,
    posting: MdPostAdd,
};

const STEPS = [
    { id: 'docType', label: 'Category' },
    { id: 'subDoc', label: 'Sub-Type' },
    { id: 'form', label: 'Payload' }
];

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
    const stepIndex = STEPS.findIndex(s => s.id === newStep);

    const renderStepper = () => (
        <div className="flex items-center justify-between max-w-xl mx-auto px-4 mb-8">
            {STEPS.map((step, idx) => {
                const label = step.label;
                const isCompleted = idx < stepIndex;
                const isActive = idx === stepIndex;
                return (
                    <React.Fragment key={label}>
                        <div className="flex flex-col items-center gap-2">
                            <div 
                                className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 shadow-lg ${
                                    isCompleted 
                                        ? 'bg-emerald-500 text-white rotate-[360deg]' 
                                        : isActive 
                                            ? 'bg-blue-600 text-white shadow-blue-500/30' 
                                            : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                                }`}
                            >
                                {isCompleted ? <MdDone className="w-6 h-6" /> : <span className="font-bold">{idx + 1}</span>}
                            </div>
                            <span className={`text-[10px] font-bold uppercase tracking-widest ${isActive ? 'text-blue-600' : 'text-slate-400'}`}>
                                {label}
                            </span>
                        </div>
                        {idx < stepLabels.length - 1 && (
                            <div className="flex-1 h-0.5 mx-4 bg-slate-100 dark:bg-slate-800 relative overflow-hidden">
                                <div 
                                    className="absolute inset-y-0 left-0 bg-emerald-500 transition-all duration-700" 
                                    style={{ width: isCompleted ? '100%' : '0%' }}
                                />
                            </div>
                        )}
                    </React.Fragment>
                );
            })}
        </div>
    );

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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase">RFQ No. (auto)</label>
                        <input
                            type="text"
                            value={form.user_pr_no || (form.date ? computeRFQNoFromDate(form.date) : '')}
                            readOnly
                            className="input-field w-full h-11 px-4 bg-gray-50/50 cursor-default font-mono"
                        />
                    </div>
                    <div className="space-y-1.5 md:col-span-2">
                        <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase">Service Providers (all 3 required)</label>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
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
                                    className="input-field h-10 px-4 text-sm"
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
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase">Deadline Date</label>
                        <input type="date" value={form.deadline_date} onChange={(e) => updateFormField('deadline_date', e.target.value)} className="input-field w-full h-10 px-4" />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase">Deadline Time</label>
                        <input type="time" value={form.deadline_time} onChange={(e) => updateFormField('deadline_time', e.target.value)} className="input-field w-full h-10 px-4" />
                    </div>
                </div>
            );
        }

        // Purchase Request / Activity Design / PPMP
        if (['Purchase Request', 'Activity Design', 'Project Procurement Management Plan/Supplemental PPMP'].includes(selectedSubDocType)) {
            return (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase">PR No.</label>
                        <input type="text" value={form.user_pr_no} onChange={(e) => updateFormField('user_pr_no', toNumbersOnly(e.target.value))} className="input-field w-full h-11 px-4" placeholder="Enter PR number" />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase">Total Amount</label>
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400 font-bold">₱</div>
                            <input
                                type="text" inputMode="decimal" value={form.total_amount}
                                onChange={(e) => updateFormField('total_amount', toNumbersOnly(e.target.value))}
                                onBlur={() => { const r = String(form.total_amount || '').trim(); if (r && !isNaN(Number(r))) updateFormField('total_amount', Number(r).toFixed(2)); }}
                                className="input-field w-full h-11 pl-8 px-4 text-right font-mono" placeholder="0.00"
                            />
                        </div>
                    </div>
                </div>
            );
        }

        // Annual Procurement Plan
        if (selectedSubDocType === 'Annual Procurement Plan') {
            return (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase">APP Type</label>
                        <select value={form.app_type} onChange={(e) => updateFormField('app_type', e.target.value)} className="input-field w-full h-11 px-4 font-bold">
                            <option value="">Select Category</option>
                            <option value="Final">Final</option>
                            <option value="Updated">Updated</option>
                        </select>
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase">Certified True Copy?</label>
                        <div className="flex items-center gap-6 h-11">
                            {[{ val: true, label: 'Yes' }, { val: false, label: 'No' }].map(({ val, label }) => (
                                <label key={label} className="flex items-center gap-2 cursor-pointer group">
                                    <input type="radio" checked={form.certified_true_copy === val}
                                        onChange={() => { updateFormField('certified_true_copy', val); if (!val) updateFormField('certified_signed_by', ''); }}
                                        className="w-4 h-4 text-[var(--primary)] focus:ring-[var(--primary)]" />
                                    <span className="text-sm font-bold text-[var(--text)] group-hover:text-[var(--primary)]">{label}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                    {form.certified_true_copy && (
                        <div className="space-y-1.5 md:col-span-2">
                            <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase">Signed By</label>
                            <input type="text" value={form.certified_signed_by} onChange={(e) => updateFormField('certified_signed_by', e.target.value)} className="input-field w-full h-11 px-4" placeholder="Name of signatory" />
                        </div>
                    )}
                </div>
            );
        }

        // Market Scopping
        if (selectedSubDocType === 'Market Scopping') {
            return (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase">Budget</label>
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400 font-bold">₱</div>
                            <input type="text" inputMode="decimal" value={form.market_budget}
                                onChange={(e) => updateFormField('market_budget', toNumbersOnly(e.target.value))}
                                onBlur={() => { const r = String(form.market_budget || '').trim(); if (r && !isNaN(Number(r))) updateFormField('market_budget', Number(r).toFixed(2)); }}
                                className="input-field w-full h-11 pl-8 px-4 text-right font-mono" placeholder="0.00" />
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase">Expected Delivery</label>
                        <input type="month" value={form.market_expected_delivery} onChange={(e) => updateFormField('market_expected_delivery', e.target.value)} className="input-field w-full h-11 px-4" />
                    </div>
                    <div className="space-y-1.5 md:col-span-2">
                        <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase">Period of Market Scoping</label>
                        <div className="grid grid-cols-2 gap-4">
                            <input type="month" value={form.market_period_from} onChange={(e) => updateFormField('market_period_from', e.target.value)} className="input-field w-full h-11 px-4" />
                            <input type="month" value={form.market_period_to} onChange={(e) => updateFormField('market_period_to', e.target.value)} className="input-field w-full h-11 px-4" />
                        </div>
                    </div>
                    <div className="space-y-1.5 md:col-span-2">
                        <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase">Service Providers (all 3 required)</label>
                        <div className="space-y-2">
                            {['market_service_provider_1', 'market_service_provider_2', 'market_service_provider_3'].map((field, i) => (
                                <input key={field} type="text" value={form[field]} onChange={(e) => updateFormField(field, toLettersOnly(e.target.value))} className="input-field w-full h-10 px-4" placeholder={`Provider ${i + 1}`} />
                            ))}
                        </div>
                    </div>
                </div>
            );
        }

        // Requisition and Issue Slip
        if (selectedSubDocType === 'Requisition and Issue Slip') {
            return (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase">Office/Division</label>
                        <input type="text" value={form.office_division} onChange={(e) => updateFormField('office_division', toLettersOnly(e.target.value))} className="input-field w-full h-11 px-4" placeholder="Office or division" />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase">Received By</label>
                        <input type="text" value={form.received_by} onChange={(e) => updateFormField('received_by', toLettersOnly(e.target.value))} className="input-field w-full h-11 px-4" placeholder="Name of recipient" />
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase">Resolution No.</label>
                        <input type="text" value={form.resolution_no} onChange={(e) => updateFormField('resolution_no', toNumbersOnly(e.target.value))} className="input-field w-full h-11 px-4" placeholder="Resolution number" />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase">Winning Bidder</label>
                        <input type="text" value={form.winning_bidder} onChange={(e) => updateFormField('winning_bidder', toLettersOnly(e.target.value))} className="input-field w-full h-11 px-4" placeholder="Company name" />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase">Award Amount</label>
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400 font-bold">₱</div>
                            <input type="text" inputMode="decimal" value={form.total_amount} onChange={(e) => updateFormField('total_amount', toNumbersOnly(e.target.value))} className="input-field w-full h-11 pl-8 px-4 text-right font-mono" placeholder="0.00" />
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase">Resolution Option</label>
                        <select value={form.resolution_option} onChange={(e) => updateFormField('resolution_option', e.target.value)} className="input-field w-full h-11 px-4 font-bold">
                            <option value="">Select Option</option>
                            {['LCB', 'LCRB', 'SCB', 'SCRB'].map((o) => <option key={o} value={o}>{o}</option>)}
                        </select>
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase">Office/Division</label>
                        <input type="text" value={form.office_division} onChange={(e) => updateFormField('office_division', toLettersOnly(e.target.value))} className="input-field w-full h-11 px-4" placeholder="Office or division" />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase">Venue of Adoption</label>
                        <input type="text" value={form.venue} onChange={(e) => updateFormField('venue', toLettersOnly(e.target.value))} className="input-field w-full h-11 px-4" placeholder="Venue" />
                    </div>
                </div>
            );
        }

        // Abstract of Quotation
        if (selectedSubDocType === 'Abstract of Quotation') {
            return (
                <div className="space-y-6">
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase">AOQ No.</label>
                        <input type="text" value={form.aoq_no} onChange={(e) => updateFormField('aoq_no', toNumbersOnly(e.target.value))} className="input-field w-full h-11 px-4 font-mono" placeholder="AOQ number" />
                    </div>
                    <div className="space-y-3">
                        <div className="flex items-center justify-between px-1">
                            <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase">Bidders (min. 3 required)</label>
                            <span className="text-[9px] font-black text-[var(--primary)] bg-[var(--primary-muted)]/10 px-2 py-0.5 rounded">{abstractBidders.length} ADDED</span>
                        </div>
                        {abstractBidders.map((b) => (
                            <div key={b.id} className="p-4 bg-gray-50 rounded-2xl border border-gray-100 relative group/bidder">
                                <button type="button" onClick={() => setAbstractBidders((prev) => prev.filter((x) => x.id !== b.id))} className="absolute top-2 right-2 p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover/bidder:opacity-100"><MdDelete className="w-4 h-4" /></button>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <label className="text-[9px] font-bold text-gray-400 uppercase">Bidder Name</label>
                                        <input type="text" value={b.name} onChange={(e) => setAbstractBidders((prev) => prev.map((x) => (x.id === b.id ? { ...x, name: toLettersOnly(e.target.value) } : x)))} className="input-field w-full h-9 px-3 text-sm" placeholder="Name" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[9px] font-bold text-gray-400 uppercase">Bid Amount</label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs text-sm">₱</span>
                                            <input type="text" inputMode="decimal" value={b.amount} onChange={(e) => setAbstractBidders((prev) => prev.map((x) => (x.id === b.id ? { ...x, amount: toNumbersOnly(e.target.value) } : x)))} className="input-field w-full h-9 pl-7 pr-3 text-sm text-right" placeholder="0.00" />
                                        </div>
                                    </div>
                                    <div className="space-y-1 sm:col-span-2">
                                        <label className="text-[9px] font-bold text-gray-400 uppercase">Remarks</label>
                                        <input type="text" value={b.remarks} onChange={(e) => setAbstractBidders((prev) => prev.map((x) => (x.id === b.id ? { ...x, remarks: e.target.value } : x)))} className="input-field w-full h-9 px-3 text-sm" placeholder="e.g. Compliant" />
                                    </div>
                                </div>
                            </div>
                        ))}
                        <button type="button" onClick={() => setAbstractBidders((prev) => [...prev, { id: Date.now(), name: '', amount: '', remarks: '' }])} className="w-full py-3 border-2 border-dashed border-gray-200 rounded-xl text-xs font-bold text-gray-400 hover:border-[var(--primary)] hover:text-[var(--primary)] transition-all flex items-center justify-center gap-2">
                            <MdAdd className="w-4 h-4" /> Add Bidder
                        </button>
                    </div>
                </div>
            );
        }

        // Contract Services/Purchase Order
        if (selectedSubDocType === 'Contract Services/Purchase Order') {
            return (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase">Received by COA?</label>
                        <select value={form.contract_received_by_coa === true ? 'yes' : form.contract_received_by_coa === false ? 'no' : ''} onChange={(e) => { const v = e.target.value; updateFormField('contract_received_by_coa', v === 'yes' ? true : v === 'no' ? false : null); }} className="input-field w-full h-11 px-4 font-bold">
                            <option value="">Select</option>
                            <option value="yes">Yes</option>
                            <option value="no">No</option>
                        </select>
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase">Contract Amount</label>
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400 font-bold">₱</div>
                            <input type="text" inputMode="decimal" value={form.contract_amount}
                                onChange={(e) => updateFormField('contract_amount', toNumbersOnly(e.target.value))}
                                onBlur={() => { const r = String(form.contract_amount || '').trim(); if (r && !isNaN(Number(r))) updateFormField('contract_amount', Number(r).toFixed(2)); }}
                                className="input-field w-full h-11 pl-8 px-4 text-right font-mono" placeholder="0.00" />
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase">Notarization Place</label>
                        <input type="text" value={form.notarized_place} onChange={(e) => updateFormField('notarized_place', e.target.value)} className="input-field w-full h-11 px-4" placeholder="Venue" />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase">Notarization Date</label>
                        <input type="date" value={form.notarized_date} onChange={(e) => updateFormField('notarized_date', e.target.value)} className="input-field w-full h-11 px-4" />
                    </div>
                </div>
            );
        }

        // Notice to Proceed / OSS / Secretary's Cert
        if (['Notice to Proceed', 'OSS', "Applicable: Secretary's Certificate and Special Power of Attorney"].includes(selectedSubDocType)) {
            const prefix = selectedSubDocType === 'Notice to Proceed' ? 'ntp' : selectedSubDocType === 'OSS' ? 'oss' : 'secretary';
            const repField = prefix === 'secretary' ? 'secretary_owner_rep' : `${prefix}_authorized_rep`;
            return (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase">Service Provider</label>
                        <input type="text" value={form[`${prefix}_service_provider`]} onChange={(e) => updateFormField(`${prefix}_service_provider`, toLettersOnly(e.target.value))} className="input-field w-full h-11 px-4" placeholder="Provider name" />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase">{selectedSubDocType === 'Notice to Proceed' ? 'Auth. Rep / Owner' : 'Authorized Representative'}</label>
                        <input type="text" value={form[repField] || ''} onChange={(e) => updateFormField(repField, toLettersOnly(e.target.value))} className="input-field w-full h-11 px-4" placeholder="Name" />
                    </div>
                    {selectedSubDocType === 'Notice to Proceed' && (
                        <div className="space-y-1.5 md:col-span-2">
                            <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase">Received By</label>
                            <input type="text" value={form.ntp_received_by} onChange={(e) => updateFormField('ntp_received_by', toLettersOnly(e.target.value))} className="input-field w-full h-11 px-4" placeholder="Recipient name" />
                        </div>
                    )}
                </div>
            );
        }

        // Invitation to COA
        if (selectedSubDocType === 'Invitation to COA') {
            return (
                <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase">Date Received</label>
                    <input type="date" value={form.date_received} onChange={(e) => updateFormField('date_received', e.target.value)} className="input-field w-full h-11 px-4" />
                </div>
            );
        }

        return null; // Default: no extra fields
    };

    const DocIcon = selectedDocType ? (ICON_MAP[selectedDocType.id] || MdDescription) : MdDescription;

    // Dynamic sizing based on step
    const getStepModalSize = () => {
        return 'xl';
    };

    return (
        <Modal
            isOpen={show}
            onClose={onClose}
            title="New Procurement Flow"
            size={getStepModalSize()}
            showCloseButton={true}
        >
            <div className="flex flex-col">
                <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--border-light)] overflow-x-auto scrollbar-none bg-slate-50/50 dark:bg-slate-900/50">
                    {STEPS.map((step, idx) => {
                        const isPast = STEPS.findIndex(s => s.id === step.id) < STEPS.findIndex(s => s.id === newStep);
                        const isCurrent = step.id === newStep;
                        return (
                            <React.Fragment key={step.id}>
                                <div className={`flex items-center gap-1.5 shrink-0 ${isCurrent ? 'bg-white dark:bg-slate-800 px-2 py-1 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700' : ''}`}>
                                    <div className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-black ${isPast || isCurrent ? 'bg-emerald-600 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-400'}`}>
                                        {isPast ? <MdCheckCircle className="w-3.5 h-3.5" /> : idx + 1}
                                    </div>
                                    <span className={`text-[10px] font-bold uppercase tracking-tight ${isCurrent ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-400'}`}>
                                        {step.label}
                                    </span>
                                </div>
                                {idx < STEPS.length - 1 && <MdChevronRight className="w-3 h-3 text-slate-300 shrink-0" />}
                            </React.Fragment>
                        );
                    })}
                </div>

                {/* ── STEP 1: Choose Document Type ── */}
                {newStep === 'docType' && (
                    <div className="p-5 space-y-5 animate-in slide-in-from-bottom-2 duration-300">
                        <div className="text-center">
                            <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Primary Category</h3>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            {DOC_TYPES.map((type) => {
                                const Icon = ICON_MAP[type.id] || MdDescription;
                                return (
                                    <button
                                        key={type.id}
                                        type="button"
                                        onClick={() => { setSelectedDocType(type); updateFormField('category', type.name); setNewStep('subDoc'); }}
                                        className="group p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-emerald-500 hover:shadow-lg transition-all text-center flex flex-col items-center"
                                    >
                                        <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400 group-hover:bg-emerald-100 dark:group-hover:bg-emerald-500/20 group-hover:text-emerald-600 transition-all mb-2">
                                            <Icon className="w-6 h-6" />
                                        </div>
                                        <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-tight">{type.name}</h4>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* ── STEP 2: Choose Sub-Document ── */}
                {newStep === 'subDoc' && selectedDocType && (
                    <div className="p-5 space-y-4 animate-in slide-in-from-right-2 duration-300">
                        <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700/50">
                            <div className="flex items-center gap-3">
                                <button 
                                    onClick={() => { setSelectedDocType(null); setNewStep('docType'); }}
                                    className="p-2 bg-white dark:bg-slate-800 rounded-xl shadow-sm hover:text-blue-600 transition-colors"
                                >
                                    <MdChevronLeft className="w-5 h-5" />
                                </button>
                                <div>
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Selected Phase 1</p>
                                    <p className="text-sm font-bold text-slate-900 dark:text-white uppercase">{selectedDocType.name}</p>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-8 pb-8">
                            {(() => {
                                const grouped = getGroupedSubDocs(selectedDocType);
                                return Object.entries(grouped).map(([group, sds]) => (
                                    <div key={group} className="space-y-3">
                                        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-4">
                                            <span>{group}</span>
                                            <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800" />
                                        </h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            {sds.map((sd) => {
                                                const uploaded = alreadyUploaded(sd);
                                                return (
                                                    <button
                                                        key={sd}
                                                        type="button"
                                                        disabled={uploaded}
                                                        onClick={() => { if (uploaded) return; setSelectedSubDocType(sd); updateFormField('subDoc', sd); setNewStep('form'); }}
                                                        className={`group w-full text-left p-4 rounded-xl border border-slate-200 dark:border-slate-800 transition-all duration-300 flex items-center justify-between gap-3 ${uploaded ? 'bg-slate-50 dark:bg-slate-900 opacity-50 grayscale cursor-not-allowed' : 'bg-white dark:bg-slate-900 hover:border-blue-500 hover:shadow-lg active:scale-[0.98]'}`}
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800 group-hover:bg-blue-100 dark:group-hover:bg-blue-500/20 transition-colors">
                                                                <MdDescription className="w-4 h-4 text-slate-400 group-hover:text-blue-500" />
                                                            </div>
                                                            <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{sd}</span>
                                                        </div>
                                                        {uploaded ? (
                                                            <span className="text-[9px] font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded">DONE</span>
                                                        ) : (
                                                            <MdChevronRight className="w-5 h-5 text-slate-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
                                                        )}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ));
                            })()}
                        </div>
                    </div>
                )}

                {/* ── STEP 3: Fill Out Details ── */}
                {newStep === 'form' && selectedDocType && (
                    <form id="new-procurement-form" onSubmit={handleNewSubmit} className="p-5 space-y-4 animate-in slide-in-from-right-2 duration-300">
                        <div className="p-3 bg-emerald-50 dark:bg-emerald-500/5 rounded-xl border border-emerald-100 dark:border-emerald-500/20 flex items-center gap-3">
                             <div className="p-2 bg-white dark:bg-slate-900 rounded-lg shadow-sm text-emerald-600">
                                <DocIcon className="w-5 h-5" />
                             </div>
                             <div className="flex-1">
                                <div className="flex items-center gap-1.5">
                                    <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest">{selectedDocType.name}</span>
                                    <MdChevronRight className="w-3 h-3 text-slate-300" />
                                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest truncate max-w-[150px]">{selectedSubDocType}</span>
                                </div>
                                <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">Enter Details</h3>
                             </div>
                             <button type="button" onClick={() => { setSelectedSubDocType(null); setNewStep('subDoc'); }} className="text-[9px] font-bold text-emerald-600 uppercase underline decoration-dotted">Change</button>
                        </div>

                        {newError && (
                            <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 p-4 rounded-2xl flex items-center gap-3 text-red-600">
                                <MdError className="w-5 h-5 shrink-0" />
                                <p className="text-sm font-bold uppercase tracking-tight">{newError}</p>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-all duration-300">
                            {!selectedSubDocType?.startsWith('PHILGEPS - ') && (
                                <div className="space-y-1 md:col-span-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Project Title / Purpose</label>
                                    <textarea
                                        required
                                        value={form.title}
                                        onChange={(e) => { updateFormField('title', toLettersOnly(e.target.value)); if (newFormErrors.title) setManualErrors((p) => ({ ...p, title: '' })); }}
                                        className={`input-field w-full min-h-[70px] resize-none p-3 text-sm rounded-xl dark:bg-slate-800 ${newFormErrors.title ? 'border-red-500' : ''}`}
                                        placeholder="Enter description..."
                                    />
                                    {newFormErrors.title && <p className="text-[9px] font-bold text-red-500 uppercase px-1">{newFormErrors.title}</p>}
                                </div>
                            )}

                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Date</label>
                                <input
                                    type="date" required value={form.date}
                                    onChange={(e) => { const d = e.target.value; setForm((f) => ({ ...f, date: d, user_pr_no: computeRFQNoFromDate(d) })); if (newFormErrors.date) setManualErrors((p) => ({ ...p, date: '' })); }}
                                    className={`input-field h-11 w-full px-4 text-sm dark:bg-slate-800 rounded-xl ${newFormErrors.date ? 'border-red-500' : ''}`}
                                />
                                {newFormErrors.date && <p className="text-[9px] font-bold text-red-500 uppercase px-1">{newFormErrors.date}</p>}
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">BAC Folder No.</label>
                                <div className="h-11 w-full px-4 flex items-center bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-800 rounded-xl font-mono text-[11px] text-slate-400 border-dashed">
                                    {form.prNo || (nextTransactionNumber ?? 'AUTO-GENERATED')}
                                </div>
                            </div>
                        </div>

                        {renderSpecificFields() && (
                            <div className="bg-slate-50 dark:bg-slate-800/20 p-4 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 space-y-4">
                                <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Additional Data</h4>
                                {renderSpecificFields()}
                            </div>
                        )}

                        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">File upload</h4>
                            
                            <div className="relative group min-h-[85px] flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-emerald-500 hover:bg-emerald-50/10 transition-all cursor-pointer">
                                <input
                                    type="file"
                                    onChange={(e) => { updateFormField('file', e.target.files[0]); if (newFormErrors.file) setManualErrors((p) => ({ ...p, file: '' })); }}
                                    className="absolute inset-0 opacity-0 cursor-pointer z-10"
                                    accept=".pdf,image/*,.doc,.docx,.xls,.xlsx"
                                />
                                <div className={`flex flex-col items-center transition-all ${form.file ? 'text-emerald-500' : 'text-slate-400 group-hover:text-emerald-500'}`}>
                                    {form.file ? <MdCheckCircle className="w-7 h-7 mb-1" /> : <MdPostAdd className="w-7 h-7 mb-1" />}
                                    <p className="text-[11px] font-bold uppercase tracking-tight">{form.file ? form.file.name : 'Select or Drop File'}</p>
                                    <p className="text-[9px] opacity-60 font-medium">MAX: 25MB (PDF/DOC/IMG)</p>
                                </div>
                            </div>
                            {newFormErrors.file && <p className="text-[9px] font-bold text-red-500 uppercase text-center">{newFormErrors.file}</p>}
                        </div>

                        <div className="flex flex-col sm:flex-row gap-3 pt-2 pb-2">
                            <button 
                                type="submit"
                                disabled={newSubmitting}
                                className="order-2 sm:order-1 flex-1 py-4 bg-emerald-600/90 hover:bg-emerald-700 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl shadow-emerald-500/20 backdrop-blur-md transition-all active:scale-95 flex items-center justify-center gap-2.5 disabled:opacity-50 disabled:grayscale disabled:scale-100"
                            >
                                {newSubmitting ? <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" /> : <MdCheckCircle className="w-5 h-5" />}
                                <span className="uppercase tracking-widest font-black text-xs">Submit Procurement</span>
                            </button>
                            <button 
                                type="button" 
                                onClick={onClose} 
                                className="order-1 sm:order-2 px-6 py-3 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-xl font-bold uppercase tracking-widest text-[10px] hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </Modal>
    );
};

export default NewProcurementModal;
