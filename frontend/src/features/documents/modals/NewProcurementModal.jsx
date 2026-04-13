import React from 'react';
import {
    MdClose, MdDescription, MdChevronRight, MdChevronLeft,
    MdCheckCircle, MdInfo, MdAdd, MdDelete, MdPostAdd,
    MdFolderOpen, MdError, MdGroup, MdDone, MdArrowBack,
    MdCategory, MdListAlt, MdAssignment
} from 'react-icons/md';
import { DOC_TYPES } from '../../../constants/docTypes';
import Modal from '../../../components/Modal';

const ICON_MAP = {
    initial: MdFolderOpen,
    afq: MdDescription,
    meeting: MdGroup,
    award: MdCheckCircle,
    posting: MdPostAdd,
};

const STEPS = [
    { id: 'docType', label: 'Procurement Type', description: 'Choose primary category', icon: MdCategory },
    { id: 'subDoc', label: 'Sub-Category', description: 'Select specific method', icon: MdListAlt },
    { id: 'form', label: 'Payload Details', description: 'Fill required fields', icon: MdAssignment }
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
        <div className="max-w-4xl mx-auto px-10 mb-16 mt-8">
            <div className="flex items-start justify-between relative">
                {/* Connecting Lines Container (Background) */}
                <div className="absolute top-4 left-0 right-0 h-0.5 flex items-center px-24 pointer-events-none">
                    {STEPS.map((_, idx) => idx < STEPS.length - 1 && (
                        <div key={`line-${idx}`} className="flex-1 h-0.5 bg-gray-200 dark:bg-gray-700 mx-3 relative overflow-hidden">
                            <div 
                                className="absolute inset-y-0 left-0 bg-blue-600 transition-all duration-1000 ease-in-out" 
                                style={{ width: idx < stepIndex ? '100%' : '0%' }}
                            />
                        </div>
                    ))}
                </div>

                {/* Steps Content */}
                {STEPS.map((step, idx) => {
                    const isCompleted = idx < stepIndex;
                    const isActive = idx === stepIndex;

                    return (
                        <div key={step.id} className="flex flex-col items-center relative z-10 w-32">
                            {/* Indicator Circle */}
                            <div 
                                className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-700 shadow-sm mb-3 border-2 ${
                                    isCompleted 
                                        ? 'bg-blue-600 text-white border-blue-600 rotate-[360deg]' 
                                        : isActive 
                                            ? 'bg-blue-600 text-white border-blue-600 scale-110 shadow-blue-500/20' 
                                            : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-600'
                                }`}
                            >
                                {isCompleted ? (
                                    <MdDone className="w-4 h-4" />
                                ) : (
                                    <span className="text-[11px] font-bold">{idx + 1}</span>
                                )}
                            </div>

                            {/* Label & Description */}
                            <div className="flex flex-col items-center text-center">
                                <span className={`text-[8px] font-black uppercase tracking-[0.2em] mb-0.5 font-mono ${
                                    isActive ? 'text-blue-600 dark:text-blue-400' : isCompleted ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'
                                }`}>
                                    Step 0{idx + 1}
                                </span>
                                <h4 className={`text-[11px] font-bold uppercase tracking-tight leading-tight mb-1 ${
                                    isActive ? 'text-slate-900 dark:text-white' : 'text-slate-400'
                                }`}>
                                    {step.label}
                                </h4>
                                <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500 leading-tight max-w-[100px]">
                                    {step.description}
                                </p>
                            </div>
                        </div>
                    );
                })}
            </div>
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

        // PHILGEPS - Lease of Venue
        if (selectedSubDocType === 'PHILGEPS - Lease of Venue') {
            return (
                <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="field-group">
                            <label className="label">Date</label>
                            <input type="date" value={form.date} onChange={(e) => updateFormField('date', e.target.value)} className="input-field" />
                        </div>
                        <div className="field-group">
                            <label className="label">Upload File</label>
                            <input type="file" onChange={(e) => updateFormField('file', e.target.files[0])} className="input-field py-1.5 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:bg-emerald-600 file:text-white file:text-[10px] file:font-bold file:uppercase cursor-pointer" accept=".pdf,image/*,.doc,.docx,.xls,.xlsx" />
                        </div>
                    </div>
                </div>
            );
        }

        // PHILGEPS - Public Bidding
        if (selectedSubDocType === 'PHILGEPS - Public Bidding') {
            return (
                <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="field-group">
                            <label className="label">Date</label>
                            <input type="date" value={form.date} onChange={(e) => updateFormField('date', e.target.value)} className="input-field" />
                        </div>
                        <div className="field-group">
                            <label className="label">Upload File</label>
                            <input type="file" onChange={(e) => updateFormField('file', e.target.files[0])} className="input-field py-1.5 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:bg-emerald-600 file:text-white file:text-[10px] file:font-bold file:uppercase cursor-pointer" accept=".pdf,image/*,.doc,.docx,.xls,.xlsx" />
                        </div>
                    </div>
                </div>
            );
        }

        // PHILGEPS - Small Value Procurement
        if (selectedSubDocType === 'PHILGEPS - Small Value Procurement') {
            return (
                <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="field-group">
                            <label className="label">Date</label>
                            <input type="date" value={form.date} onChange={(e) => updateFormField('date', e.target.value)} className="input-field" />
                        </div>
                        <div className="field-group">
                            <label className="label">Upload File</label>
                            <input type="file" onChange={(e) => updateFormField('file', e.target.files[0])} className="input-field py-1.5 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:bg-emerald-600 file:text-white file:text-[10px] file:font-bold file:uppercase cursor-pointer" accept=".pdf,image/*,.doc,.docx,.xls,.xlsx" />
                        </div>
                    </div>
                </div>
            );
        }

        // Certificate of DILG - Lease of Venue
        if (selectedSubDocType === 'Certificate of DILG - Lease of Venue') {
            return (
                <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="field-group">
                            <label className="label">Date</label>
                            <input type="date" value={form.date} onChange={(e) => updateFormField('date', e.target.value)} className="input-field" />
                        </div>
                        <div className="field-group">
                            <label className="label">Upload File</label>
                            <input type="file" onChange={(e) => updateFormField('file', e.target.files[0])} className="input-field py-1.5 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:bg-emerald-600 file:text-white file:text-[10px] file:font-bold file:uppercase cursor-pointer" accept=".pdf,image/*,.doc,.docx,.xls,.xlsx" />
                        </div>
                    </div>
                </div>
            );
        }

        // Certificate of DILG - Public Bidding
        if (selectedSubDocType === 'Certificate of DILG - Public Bidding') {
            return (
                <div className="space-y-4">
                    <div className="field-group">
                        <label className="label">BAC Folder No.</label>
                        <div className="h-11 w-full px-4 flex items-center bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-800 rounded-xl font-mono text-xs text-slate-400 border-dashed">
                            {form.prNo || (nextTransactionNumber ?? 'AUTO-GENERATED')}
                        </div>
                    </div>
                    <div className="field-group">
                        <label className="label">Deadline</label>
                        <input type="datetime-local" value={form.deadline} onChange={(e) => updateFormField('deadline', e.target.value)} className="input-field" />
                    </div>
                    <div className="field-group">
                        <label className="label">Service Providers</label>
                        <div className="grid grid-cols-1 gap-2">
                            {(form.service_providers || ['']).map((provider, index) => (
                                <div key={index} className="flex items-center gap-2">
                                    <input type="text" value={provider} onChange={(e) => {
                                        const newProviders = [...(form.service_providers || [''])];
                                        newProviders[index] = e.target.value;
                                        updateFormField('service_providers', newProviders);
                                    }} className="input-field flex-1" placeholder="Service provider name" />
                                    <div className="flex items-center gap-1.5 shrink-0">
                                        {(form.service_providers || ['']).length > 1 && (
                                            <button 
                                                type="button" 
                                                onClick={() => {
                                                    const newProviders = (form.service_providers || ['']).filter((_, i) => i !== index);
                                                    updateFormField('service_providers', newProviders);
                                                }} 
                                                className="w-10 h-10 flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-all active:scale-90"
                                            >
                                                <MdDelete className="w-5 h-5" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                        <button 
                            type="button" 
                            onClick={() => {
                                const newProviders = [...(form.service_providers || ['']), ''];
                                updateFormField('service_providers', newProviders);
                            }} 
                            className="mt-3 w-full h-11 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-[10px] font-bold text-slate-400 hover:border-emerald-500 hover:text-emerald-600 hover:bg-emerald-50/10 transition-all flex items-center justify-center gap-2 group active:scale-[0.99]"
                        >
                            <MdAdd className="w-4 h-4 transition-transform group-hover:rotate-90" />
                            ADD SERVICE PROVIDER
                        </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="field-group">
                            <label className="label">Date</label>
                            <input type="date" value={form.date} onChange={(e) => updateFormField('date', e.target.value)} className="input-field" />
                        </div>
                        <div className="field-group">
                            <label className="label">Upload File</label>
                            <input type="file" onChange={(e) => updateFormField('file', e.target.files[0])} className="input-field py-1.5 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:bg-emerald-600 file:text-white file:text-[10px] file:font-bold file:uppercase cursor-pointer" accept=".pdf,image/*,.doc,.docx,.xls,.xlsx" />
                        </div>
                    </div>
                </div>
            );
        }

        // Certificate of DILG - Small Value Procurement
        if (selectedSubDocType?.startsWith('Certificate of DILG - Small Value Procurement')) {
            return (
                <div className="space-y-4">
                    <div className="field-group">
                        <label className="label">BAC Folder No.</label>
                        <div className="h-11 w-full px-4 flex items-center bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-800 rounded-xl font-mono text-xs text-slate-400 border-dashed">
                            {form.prNo || (nextTransactionNumber ?? 'AUTO-GENERATED')}
                        </div>
                    </div>
                    <div className="field-group">
                        <label className="label">Deadline</label>
                        <input type="datetime-local" value={form.deadline} onChange={(e) => updateFormField('deadline', e.target.value)} className="input-field" />
                    </div>
                    <div className="field-group">
                        <label className="label">Service Providers</label>
                        <div className="grid grid-cols-1 gap-2">
                            {(form.service_providers || ['']).map((provider, index) => (
                                <div key={index} className="flex items-center gap-2">
                                    <input type="text" value={provider} onChange={(e) => {
                                        const newProviders = [...(form.service_providers || [''])];
                                        newProviders[index] = e.target.value;
                                        updateFormField('service_providers', newProviders);
                                    }} className="input-field flex-1" placeholder="Service provider name" />
                                    <div className="flex items-center gap-1.5 shrink-0">
                                        {(form.service_providers || ['']).length > 1 && (
                                            <button 
                                                type="button" 
                                                onClick={() => {
                                                    const newProviders = (form.service_providers || ['']).filter((_, i) => i !== index);
                                                    updateFormField('service_providers', newProviders);
                                                }} 
                                                className="w-10 h-10 flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-all active:scale-90"
                                            >
                                                <MdDelete className="w-5 h-5" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                        <button 
                            type="button" 
                            onClick={() => {
                                const newProviders = [...(form.service_providers || ['']), ''];
                                updateFormField('service_providers', newProviders);
                            }} 
                            className="mt-3 w-full h-11 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-[10px] font-bold text-slate-400 hover:border-emerald-500 hover:text-emerald-600 hover:bg-emerald-50/10 transition-all flex items-center justify-center gap-2 group active:scale-[0.99]"
                        >
                            <MdAdd className="w-4 h-4 transition-transform group-hover:rotate-90" />
                            ADD SERVICE PROVIDER
                        </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="field-group">
                            <label className="label">Date</label>
                            <input type="date" value={form.date} onChange={(e) => updateFormField('date', e.target.value)} className="input-field" />
                        </div>
                        <div className="field-group">
                            <label className="label">Upload File</label>
                            <input type="file" onChange={(e) => updateFormField('file', e.target.files[0])} className="input-field py-1.5 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:bg-emerald-600 file:text-white file:text-[10px] file:font-bold file:uppercase cursor-pointer" accept=".pdf,image/*,.doc,.docx,.xls,.xlsx" />
                        </div>
                    </div>
                </div>
            );
        }

        // Purchase Request
        if (selectedSubDocType === 'Purchase Request') {
            return (
                <div className="space-y-4">
                    <div className="field-group">
                        <label className="label">Purpose</label>
                        <textarea value={form.title} onChange={(e) => updateFormField('title', e.target.value)} className="input-field min-h-[5rem] resize-none py-3" placeholder="Enter purpose of the purchase request..." />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="field-group">
                            <label className="label">Date</label>
                            <input type="date" value={form.date} onChange={(e) => updateFormField('date', e.target.value)} className="input-field" />
                        </div>
                        <div className="field-group">
                            <label className="label">Total Amount</label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400 font-bold text-sm">₱</div>
                                <input
                                    type="text" inputMode="decimal" value={form.total_amount}
                                    onChange={(e) => updateFormField('total_amount', toNumbersOnly(e.target.value))}
                                    onBlur={() => { const r = String(form.total_amount || '').trim(); if (r && !isNaN(Number(r))) updateFormField('total_amount', Number(r).toFixed(2)); }}
                                    className="input-field pl-8 text-right font-mono" placeholder="0.00"
                                />
                            </div>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="field-group">
                            <label className="label">BAC Folder No.</label>
                            <div className="h-11 w-full px-4 flex items-center bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-800 rounded-xl font-mono text-xs text-slate-400 border-dashed">
                                {form.prNo || (nextTransactionNumber ?? 'AUTO-GENERATED')}
                            </div>
                        </div>
                        <div className="field-group">
                            <label className="label">PR No.</label>
                            <input type="text" value={form.user_pr_no} onChange={(e) => updateFormField('user_pr_no', toNumbersOnly(e.target.value))} className="input-field" placeholder="Enter PR number" />
                        </div>
                    </div>
                    <div className="field-group">
                        <label className="label">Upload File</label>
                        <input type="file" onChange={(e) => updateFormField('file', e.target.files[0])} className="input-field py-1.5 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:bg-emerald-600 file:text-white file:text-[10px] file:font-bold file:uppercase cursor-pointer" accept=".pdf,image/*,.doc,.docx,.xls,.xlsx" />
                    </div>
                </div>
            );
        }

        // Activity Design
        if (selectedSubDocType === 'Activity Design') {
            return (
                <div className="space-y-4">
                    <div className="field-group">
                        <label className="label">Title</label>
                        <textarea value={form.title} onChange={(e) => updateFormField('title', e.target.value)} className="input-field min-h-[5rem] resize-none py-3" placeholder="Enter activity design title..." />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="field-group">
                            <label className="label">BAC Folder No.</label>
                            <div className="h-11 w-full px-4 flex items-center bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-800 rounded-xl font-mono text-xs text-slate-400 border-dashed">
                                {form.prNo || (nextTransactionNumber ?? 'AUTO-GENERATED')}
                            </div>
                        </div>
                        <div className="field-group">
                            <label className="label">PR No.</label>
                            <input type="text" value={form.user_pr_no} onChange={(e) => updateFormField('user_pr_no', e.target.value)} className="input-field" placeholder="Enter PR number" />
                        </div>
                    </div>
                    <div className="field-group">
                        <label className="label">Fund Source</label>
                        <input type="text" value={form.fund_source} onChange={(e) => updateFormField('fund_source', e.target.value)} className="input-field" placeholder="Enter fund source" />
                    </div>
                    <div className="field-group">
                        <label className="label">Total Amount</label>
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400 font-bold text-sm">₱</div>
                            <input
                                type="text" inputMode="decimal" value={form.total_amount}
                                onChange={(e) => updateFormField('total_amount', toNumbersOnly(e.target.value))}
                                onBlur={() => { const r = String(form.total_amount || '').trim(); if (r && !isNaN(Number(r))) updateFormField('total_amount', Number(r).toFixed(2)); }}
                                className="input-field pl-8 text-right font-mono" placeholder="0.00"
                            />
                        </div>
                    </div>
                    <div className="field-group">
                        <label className="label">Upload File</label>
                        <input type="file" onChange={(e) => updateFormField('file', e.target.files[0])} className="input-field py-1.5 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:bg-emerald-600 file:text-white file:text-[10px] file:font-bold file:uppercase cursor-pointer" accept=".pdf,image/*,.doc,.docx,.xls,.xlsx" />
                    </div>
                </div>
            );
        }

        // Project Procurement Management Plan/Supplemental PPMP
        if (selectedSubDocType === 'Project Procurement Management Plan/Supplemental PPMP') {
            return (
                <div className="space-y-4">
                    <div className="field-group">
                        <label className="label">Title</label>
                        <textarea value={form.title} onChange={(e) => updateFormField('title', e.target.value)} className="input-field min-h-[5rem] resize-none py-3" placeholder="Enter project procurement management plan title..." />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="field-group">
                            <label className="label">PPMP No.</label>
                            <input type="text" value={form.ppmp_no} onChange={(e) => updateFormField('ppmp_no', toNumbersOnly(e.target.value))} className="input-field" placeholder="Enter PPMP number" />
                        </div>
                        <div className="field-group">
                            <label className="label">Fund Source</label>
                            <input type="text" value={form.fund_source} onChange={(e) => updateFormField('fund_source', e.target.value)} className="input-field" placeholder="Enter fund source" />
                        </div>
                    </div>
                    <div className="field-group">
                        <label className="label">Total Budget</label>
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400 font-bold text-sm">₱</div>
                            <input type="text" inputMode="decimal" value={form.total_amount}
                                onChange={(e) => updateFormField('total_amount', toNumbersOnly(e.target.value))}
                                onBlur={() => { const r = String(form.total_amount || '').trim(); if (r && !isNaN(Number(r))) updateFormField('total_amount', Number(r).toFixed(2)); }}
                                className="input-field pl-8 text-right font-mono" placeholder="0.00" />
                        </div>
                    </div>
                    <div className="field-group">
                        <label className="label">Upload File</label>
                        <input type="file" onChange={(e) => updateFormField('file', e.target.files[0])} className="input-field py-1.5 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:bg-emerald-600 file:text-white file:text-[10px] file:font-bold file:uppercase cursor-pointer" accept=".pdf,image/*,.doc,.docx,.xls,.xlsx" />
                    </div>
                </div>
            );
        }

        // Annual Procurement Plan
        if (selectedSubDocType === 'Annual Procurement Plan') {
            return (
                <div className="space-y-4">
                    <div className="field-group">
                        <label className="label">Title</label>
                        <textarea value={form.title} onChange={(e) => updateFormField('title', e.target.value)} className="input-field min-h-[5rem] resize-none py-3" placeholder="Enter annual procurement plan title..." />
                    </div>
                    <div className="field-group">
                        <label className="label">APP No. (Type)</label>
                        <select 
                            value={form.app_type} 
                            onChange={(e) => {
                                updateFormField('app_type', e.target.value);
                                if (e.target.value === 'Final') updateFormField('app_no', '');
                            }} 
                            className="input-field font-bold"
                        >
                            <option value="">Select Type</option>
                            <option value="Final">FINAL</option>
                            <option value="Updated">UPDATED</option>
                        </select>
                    </div>
                    {form.app_type === 'Updated' && (
                        <div className="field-group animate-in fade-in slide-in-from-top-2 duration-300">
                            <label className="label">APP No. (Selection)</label>
                            <input type="text" value={form.app_no} onChange={(e) => updateFormField('app_no', e.target.value)} className="input-field" placeholder="Enter APP number" />
                        </div>
                    )}
                    <div className="field-group">
                        <label className="label">Certified True Copy?</label>
                        <div className="flex items-center gap-6 h-11">
                            {[{ val: true, label: 'Yes' }, { val: false, label: 'No' }].map(({ val, label }) => (
                                <label key={label} className="flex items-center gap-2 cursor-pointer group">
                                    <input type="radio" checked={form.certified_true_copy === val}
                                        onChange={() => { updateFormField('certified_true_copy', val); if (!val) updateFormField('certified_signed_by', ''); }}
                                        className="w-5 h-5 text-emerald-600 focus:ring-emerald-500 border-slate-300 transition-all" />
                                    <span className="text-sm font-bold text-slate-700 dark:text-slate-200 group-hover:text-emerald-600">{label}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                    {form.certified_true_copy && (
                        <div className="field-group animate-in fade-in slide-in-from-top-2 duration-300">
                            <label className="label">Signed By</label>
                            <input type="text" value={form.certified_signed_by} onChange={(e) => updateFormField('certified_signed_by', e.target.value)} className="input-field" placeholder="Full name of signatory" />
                        </div>
                    )}
                    <div className="field-group">
                        <label className="label">Upload File</label>
                        <input type="file" onChange={(e) => updateFormField('file', e.target.files[0])} className="input-field py-1.5 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:bg-emerald-600 file:text-white file:text-[10px] file:font-bold file:uppercase cursor-pointer" accept=".pdf,image/*,.doc,.docx,.xls,.xlsx" />
                    </div>
                </div>
            );
        }

        // Market Scopping
        if (selectedSubDocType === 'Market Scopping') {
            return (
                <div className="space-y-4">
                    <div className="field-group">
                        <label className="label">Title</label>
                        <textarea value={form.title} onChange={(e) => updateFormField('title', e.target.value)} className="input-field min-h-[5rem] resize-none py-3" placeholder="Enter market scoping title..." />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="field-group">
                            <label className="label">Budget</label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400 font-bold text-sm">₱</div>
                                <input type="text" inputMode="decimal" value={form.market_budget}
                                    onChange={(e) => updateFormField('market_budget', toNumbersOnly(e.target.value))}
                                    onBlur={() => { const r = String(form.market_budget || '').trim(); if (r && !isNaN(Number(r))) updateFormField('market_budget', Number(r).toFixed(2)); }}
                                    className="input-field pl-8 text-right font-mono" placeholder="0.00" />
                            </div>
                        </div>
                        <div className="field-group">
                            <label className="label">Expected Date of Delivery</label>
                            <input type="text" value={form.market_expected_delivery} onChange={(e) => updateFormField('market_expected_delivery', e.target.value)} className="input-field" placeholder="MM/YY" />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="field-group">
                            <label className="label">Period From</label>
                            <input type="date" value={form.market_period_from} onChange={(e) => updateFormField('market_period_from', e.target.value)} className="input-field" />
                        </div>
                        <div className="field-group">
                            <label className="label">Period To</label>
                            <input type="date" value={form.market_period_to} onChange={(e) => updateFormField('market_period_to', e.target.value)} className="input-field" />
                        </div>
                    </div>
                    <div className="field-group">
                        <label className="label">Service Providers (3 required)</label>
                        <div className="grid grid-cols-1 gap-2">
                            {['market_service_provider_1', 'market_service_provider_2', 'market_service_provider_3'].map((field, i) => (
                                <input key={field} type="text" value={form[field]} onChange={(e) => updateFormField(field, e.target.value)} className="input-field" placeholder={`Service Provider ${i + 1} Name`} />
                            ))}
                        </div>
                    </div>
                    <div className="field-group">
                        <label className="label">Upload File</label>
                        <input type="file" onChange={(e) => updateFormField('file', e.target.files[0])} className="input-field py-1.5 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:bg-emerald-600 file:text-white file:text-[10px] file:font-bold file:uppercase cursor-pointer" accept=".pdf,image/*,.doc,.docx,.xls,.xlsx" />
                    </div>
                </div>
            );
        }

        // Lease of Venue (rating factor)
        if (selectedSubDocType === 'Lease of Venue (rating factor)') {
            return (
                <div className="space-y-4">
                    <div className="field-group">
                        <label className="label">Title</label>
                        <textarea value={form.title} onChange={(e) => updateFormField('title', e.target.value)} className="input-field min-h-[5rem] resize-none py-3" placeholder="Enter lease of venue title..." />
                    </div>
                    <div className="field-group">
                        <label className="label">Service providers (min. 3 required)</label>
                        <div className="grid grid-cols-1 gap-2">
                            {['market_service_provider_1', 'market_service_provider_2', 'market_service_provider_3'].map((field, i) => (
                                <input key={field} type="text" value={form[field]} onChange={(e) => updateFormField(field, e.target.value)} className="input-field" placeholder={`Provider ${i + 1} Name`} />
                            ))}
                        </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="field-group">
                            <label className="label">Date</label>
                            <input type="date" value={form.date || ''} onChange={(e) => updateFormField('date', e.target.value)} className="input-field" />
                        </div>
                        <div className="field-group">
                            <label className="label">Upload File</label>
                            <input type="file" onChange={(e) => updateFormField('file', e.target.files[0])} className="input-field py-1.5 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:bg-emerald-600 file:text-white file:text-[10px] file:font-bold file:uppercase cursor-pointer" accept=".pdf,image/*,.doc,.docx,.xls,.xlsx" />
                        </div>
                    </div>
                </div>
            );
        }

        // Requisition and Issue Slip
        if (selectedSubDocType === 'Requisition and Issue Slip') {
            return (
                <div className="space-y-4">
                    <div className="field-group">
                        <label className="label">Purpose</label>
                        <textarea value={form.title} onChange={(e) => updateFormField('title', e.target.value)} className="input-field min-h-[5rem] resize-none py-3" placeholder="Enter purpose of requisition..." />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="field-group">
                            <label className="label">Office/Division</label>
                            <input type="text" value={form.office_division} onChange={(e) => updateFormField('office_division', e.target.value)} className="input-field" placeholder="Office or division" />
                        </div>
                        <div className="field-group">
                            <label className="label">Received By</label>
                            <input type="text" value={form.received_by} onChange={(e) => updateFormField('received_by', e.target.value)} className="input-field" placeholder="Name of recipient" />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="field-group">
                            <label className="label">Date</label>
                            <input type="date" value={form.date} onChange={(e) => updateFormField('date', e.target.value)} className="input-field" />
                        </div>
                        <div className="field-group">
                            <label className="label">Upload File</label>
                            <input type="file" onChange={(e) => updateFormField('file', e.target.files[0])} className="input-field py-1.5 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:bg-emerald-600 file:text-white file:text-[10px] file:font-bold file:uppercase cursor-pointer" accept=".pdf,image/*,.doc,.docx,.xls,.xlsx" />
                        </div>
                    </div>
                </div>
            );
        }

        // Notice of BAC Meeting
        if (selectedSubDocType === 'Notice of BAC Meeting') {
            return (
                <div className="space-y-4">
                    <div className="field-group">
                        <label className="label">Agenda</label>
                        <textarea value={form.agenda} onChange={(e) => updateFormField('agenda', e.target.value)} className="input-field min-h-[5rem] resize-none py-3" placeholder="Enter meeting agenda..." />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="field-group">
                            <label className="label">Date</label>
                            <input type="date" value={form.date} onChange={(e) => updateFormField('date', e.target.value)} className="input-field" />
                        </div>
                        <div className="field-group">
                            <label className="label">Upload File</label>
                            <input type="file" onChange={(e) => updateFormField('file', e.target.files[0])} className="input-field py-1.5 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:bg-emerald-600 file:text-white file:text-[10px] file:font-bold file:uppercase cursor-pointer" accept=".pdf,image/*,.doc,.docx,.xls,.xlsx" />
                        </div>
                    </div>
                </div>
            );
        }

        // Attendance Sheet
        if (selectedSubDocType === 'Attendance Sheet') {
            return (
                <div className="space-y-4">
                    <div className="field-group">
                        <label className="label">Agenda</label>
                        <textarea value={form.agenda} onChange={(e) => updateFormField('agenda', e.target.value)} className="input-field min-h-[5rem] resize-none py-3" placeholder="Enter meeting agenda..." />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="field-group">
                            <label className="label">Date</label>
                            <input type="date" value={form.date} onChange={(e) => updateFormField('date', e.target.value)} className="input-field" />
                        </div>
                        <div className="field-group">
                            <label className="label">Upload File</label>
                            <input type="file" onChange={(e) => updateFormField('file', e.target.files[0])} className="input-field py-1.5 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:bg-emerald-600 file:text-white file:text-[10px] file:font-bold file:uppercase cursor-pointer" accept=".pdf,image/*,.doc,.docx,.xls,.xlsx" />
                        </div>
                    </div>
                    <div className="field-group">
                        <label className="label">BAC Members Attendance</label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[400px] overflow-y-auto p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800 custom-scrollbar">
                            {attendanceMembers.map((m) => (
                                <label key={m.id} className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700/50 group hover:border-emerald-500 hover:shadow-md transition-all cursor-pointer">
                                    <span className="text-sm font-bold text-slate-700 dark:text-slate-200 truncate pr-4" title={m.name}>{m.name}</span>
                                    <div className="relative flex items-center shrink-0">
                                        <input type="checkbox" checked={m.present}
                                            onChange={(e) => setAttendanceMembers((prev) => prev.map((x) => (x.id === m.id ? { ...x, present: e.target.checked } : x)))}
                                            className="w-6 h-6 rounded-lg border-slate-200 text-emerald-600 focus:ring-emerald-500 focus:ring-offset-0 transition-colors cursor-pointer" />
                                    </div>
                                </label>
                            ))}
                            {attendanceMembers.length === 0 && (
                                <div className="col-span-full py-12 text-center text-slate-400 italic text-sm">No BAC members found.</div>
                            )}
                        </div>
                    </div>
                </div>
            );
        }

        // Minutes of the Meeting
        if (selectedSubDocType === 'Minutes of the Meeting') {
            return (
                <div className="space-y-4">
                    <div className="field-group">
                        <label className="label">Agenda/Others</label>
                        <textarea value={form.agenda} onChange={(e) => updateFormField('agenda', e.target.value)} className="input-field min-h-[5rem] resize-none py-3" placeholder="Enter meeting agenda and other notes..." />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="field-group">
                            <label className="label">Date</label>
                            <input type="date" value={form.date} onChange={(e) => updateFormField('date', e.target.value)} className="input-field" />
                        </div>
                        <div className="field-group">
                            <label className="label">Upload File</label>
                            <input type="file" onChange={(e) => updateFormField('file', e.target.files[0])} className="input-field py-1.5 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:bg-emerald-600 file:text-white file:text-[10px] file:font-bold file:uppercase cursor-pointer" accept=".pdf,image/*,.doc,.docx,.xls,.xlsx" />
                        </div>
                    </div>
                </div>
            );
        }

        // BAC Resolution
        if (selectedSubDocType === 'BAC Resolution') {
            return (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pb-2">
                    <div className="field-group sm:col-span-2 lg:col-span-3">
                        <label className="label">Title</label>
                        <textarea value={form.title} onChange={(e) => updateFormField('title', e.target.value)} className="input-field min-h-[5rem] resize-none py-3" placeholder="Enter resolution title..." />
                    </div>
                    <div className="field-group">
                        <label className="label">Resolution No.</label>
                        <input type="text" value={form.resolution_no} onChange={(e) => updateFormField('resolution_no', toNumbersOnly(e.target.value))} className="input-field" placeholder="Resolution number" />
                    </div>
                    <div className="field-group">
                        <label className="label">Winning Bidder</label>
                        <input type="text" value={form.winning_bidder} onChange={(e) => updateFormField('winning_bidder', toLettersOnly(e.target.value))} className="input-field" placeholder="Company name" />
                    </div>
                    <div className="field-group">
                        <label className="label">Award Amount</label>
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400 font-bold text-sm">₱</div>
                            <input type="text" inputMode="decimal" value={form.total_amount} onChange={(e) => updateFormField('total_amount', toNumbersOnly(e.target.value))} className="input-field pl-8 text-right font-mono" placeholder="0.00" />
                        </div>
                    </div>
                    <div className="field-group">
                        <label className="label">Resolution Option</label>
                        <select value={form.resolution_option} onChange={(e) => updateFormField('resolution_option', e.target.value)} className="input-field font-bold">
                            <option value="">Select</option>
                            {['LCB', 'LCRB', 'SCB', 'SCRB'].map((o) => <option key={o} value={o}>{o}</option>)}
                        </select>
                    </div>
                    <div className="field-group">
                        <label className="label">Office/Division</label>
                        <input type="text" value={form.office_division} onChange={(e) => updateFormField('office_division', toLettersOnly(e.target.value))} className="input-field" placeholder="Office or division" />
                    </div>
                    <div className="field-group">
                        <label className="label">Date of Adoption</label>
                        <input type="date" value={form.date_of_adoption || ''} onChange={(e) => updateFormField('date_of_adoption', e.target.value)} className="input-field" />
                    </div>
                    <div className="field-group sm:col-span-2 lg:col-span-3">
                        <input type="text" value={form.resolution_no} onChange={(e) => updateFormField('resolution_no', e.target.value)} className="input-field" placeholder="Enter resolution number" />
                    </div>
                    <div className="field-group">
                        <label className="label">Recommendation</label>
                        <textarea value={form.recommendation} onChange={(e) => updateFormField('recommendation', e.target.value)} className="input-field min-h-[5rem] resize-none py-3" placeholder="Enter recommendation details..." />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="field-group">
                            <label className="label">Date</label>
                            <input type="date" value={form.date} onChange={(e) => updateFormField('date', e.target.value)} className="input-field" />
                        </div>
                        <div className="field-group">
                            <label className="label">Upload File</label>
                            <input type="file" onChange={(e) => updateFormField('file', e.target.files[0])} className="input-field py-1.5 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:bg-emerald-600 file:text-white file:text-[10px] file:font-bold file:uppercase cursor-pointer" accept=".pdf,image/*,.doc,.docx,.xls,.xlsx" />
                        </div>
                    </div>
                </div>
            );
        }

        // Abstract of Quotation
        if (selectedSubDocType === 'Abstract of Quotation') {
            return (
                <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="field-group">
                            <label className="label">Date</label>
                            <input type="date" value={form.date} onChange={(e) => updateFormField('date', e.target.value)} className="input-field" />
                        </div>
                        <div className="field-group">
                            <label className="label">Upload File</label>
                            <input type="file" onChange={(e) => updateFormField('file', e.target.files[0])} className="input-field py-1.5 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:bg-emerald-600 file:text-white file:text-[10px] file:font-bold file:uppercase cursor-pointer" accept=".pdf,image/*,.doc,.docx,.xls,.xlsx" />
                        </div>
                    </div>
                    <div className="field-group">
                        <label className="label">Bidders/Quotations</label>
                        <div className="space-y-3">
                            {form.bidders.map((bidder, index) => (
                                <div key={index} className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
                                    <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-200 dark:border-slate-800">
                                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Bidder #{index + 1}</span>
                                        {form.bidders.length > 1 && (
                                            <button 
                                                type="button" 
                                                onClick={() => updateFormField('bidders', form.bidders.filter((_, i) => i !== index))} 
                                                className="w-10 h-10 flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-all active:scale-90"
                                            >
                                                <MdDelete className="w-5 h-5" />
                                            </button>
                                        )}
                                    </div>
                                    <div className="space-y-4">
                                        <div className="field-group">
                                            <label className="label">Bidder Name</label>
                                            <input type="text" value={bidder.name} onChange={(e) => {
                                                const nb = [...form.bidders];
                                                nb[index].name = e.target.value;
                                                updateFormField('bidders', nb);
                                            }} className="input-field" placeholder="Company Name" />
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div className="field-group">
                                                <label className="label text-[var(--primary)]">Amount Bid</label>
                                                <div className="relative group">
                                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-emerald-500 font-bold text-sm underline decoration-emerald-200 underline-offset-4 decoration-2">₱</div>
                                                    <input type="text" value={bidder.amount} onChange={(e) => {
                                                        const nb = [...form.bidders];
                                                        nb[index].amount = toNumbersOnly(e.target.value);
                                                        updateFormField('bidders', nb);
                                                    }} onBlur={() => {
                                                        const nb = [...form.bidders];
                                                        const val = String(nb[index].amount || '').trim();
                                                        if (val && !isNaN(Number(val))) nb[index].amount = Number(val).toFixed(2);
                                                        updateFormField('bidders', nb);
                                                    }} className="input-field pl-8 text-right font-mono !border-emerald-100 !bg-emerald-50/10 focus:!border-emerald-500" placeholder="0.00" />
                                                </div>
                                            </div>
                                            <div className="field-group">
                                                <label className="label">Compliance</label>
                                                <select value={bidder.compliance} onChange={(e) => {
                                                    const nb = [...form.bidders];
                                                    nb[index].compliance = e.target.value;
                                                    updateFormField('bidders', nb);
                                                }} className="input-field font-bold">
                                                    <option value="Complying">Complying</option>
                                                    <option value="Non-Complying">Non-Complying</option>
                                                </select>
                                            </div>
                                        </div>
                                        <div className="field-group">
                                            <label className="label">Remarks</label>
                                            <input type="text" value={bidder.remarks} onChange={(e) => {
                                                const nb = [...form.bidders];
                                                nb[index].remarks = e.target.value;
                                                updateFormField('bidders', nb);
                                            }} className="input-field" placeholder="Optional notes" />
                                        </div>
                                    </div>
                                </div>
                            ))}
                            <button 
                                type="button" 
                                onClick={() => updateFormField('bidders', [...form.bidders, { name: '', amount: '', compliance: 'Complying', remarks: '' }])} 
                                className="w-full h-11 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-[10px] font-bold text-slate-400 hover:border-emerald-500 hover:text-emerald-600 hover:bg-emerald-50/10 transition-all flex items-center justify-center gap-2 group active:scale-[0.99]"
                            >
                                <MdAdd className="w-5 h-5 transition-transform group-hover:rotate-90" />
                                ADD NEW BIDDER RECORD
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        // Contract Services/Purchase Order
        if (selectedSubDocType === 'Contract Services/Purchase Order') {
            return (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pb-2">
                    <div className="field-group">
                        <label className="label">Date</label>
                        <input type="date" value={form.contract_date || ''} onChange={(e) => updateFormField('contract_date', e.target.value)} className="input-field" />
                    </div>
                    <div className="field-group">
                        <label className="label">Received by COA?</label>
                        <select value={form.contract_received_by_coa === true ? 'yes' : form.contract_received_by_coa === false ? 'no' : ''} onChange={(e) => { const v = e.target.value; updateFormField('contract_received_by_coa', v === 'yes' ? true : v === 'no' ? false : null); }} className="input-field font-bold">
                            <option value="">Select</option>
                            <option value="yes">Yes</option>
                            <option value="no">No</option>
                        </select>
                    </div>
                    <div className="field-group">
                        <label className="label">Contract Amount</label>
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400 font-bold text-sm">₱</div>
                            <input type="text" inputMode="decimal" value={form.contract_amount}
                                onChange={(e) => updateFormField('contract_amount', toNumbersOnly(e.target.value))}
                                onBlur={() => { const r = String(form.contract_amount || '').trim(); if (r && !isNaN(Number(r))) updateFormField('contract_amount', Number(r).toFixed(2)); }}
                                className="input-field pl-8 text-right font-mono" placeholder="0.00" />
                        </div>
                    </div>
                    <div className="field-group sm:col-span-1">
                        <label className="label">Notarization Place</label>
                        <input type="text" value={form.notarized_place} onChange={(e) => updateFormField('notarized_place', e.target.value)} className="input-field" placeholder="e.g. Manila" />
                    </div>
                    <div className="field-group sm:col-span-1">
                        <label className="label">Notarization Date</label>
                        <input type="date" value={form.notarized_date} onChange={(e) => updateFormField('notarized_date', e.target.value)} className="input-field" />
                    </div>
                    <div className="field-group">
                        <label className="label">Upload File</label>
                        <input type="file" onChange={(e) => updateFormField('file', e.target.files[0])} className="input-field py-1.5 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:bg-emerald-600 file:text-white file:text-[10px] file:font-bold file:uppercase cursor-pointer" accept=".pdf,image/*,.doc,.docx,.xls,.xlsx" />
                    </div>
                </div>
            );
        }

        // Notice to Proceed / OSS / Secretary's Cert
        if (selectedSubDocType === "Notice to Proceed / OSS / Secretary's Cert") {
            return (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pb-2">
                    <div className="field-group">
                        <label className="label">NTP Date</label>
                        <input type="date" value={form.ntp_date || ''} onChange={(e) => updateFormField('ntp_date', e.target.value)} className="input-field" />
                    </div>
                    <div className="field-group">
                        <label className="label">Upload File</label>
                        <input type="file" onChange={(e) => updateFormField('file', e.target.files[0])} className="input-field py-1.5 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:bg-emerald-600 file:text-white file:text-[10px] file:font-bold file:uppercase cursor-pointer" accept=".pdf,image/*,.doc,.docx,.xls,.xlsx" />
                    </div>
                </div>
            );
        }

        // Invitation to COA: Date, Upload, Date Received
        if (selectedSubDocType === 'Invitation to COA') {
            return (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pb-2">
                    <div className="field-group">
                        <label className="label">Date</label>
                        <input type="date" value={form.date} onChange={(e) => updateFormField('date', e.target.value)} className="input-field" />
                    </div>
                    <div className="field-group">
                        <label className="label">Date Received</label>
                        <input type="date" value={form.date_received} onChange={(e) => updateFormField('date_received', e.target.value)} className="input-field" />
                    </div>
                    <div className="field-group">
                        <label className="label">Upload File</label>
                        <div className="relative group">
                            <input
                                type="file"
                                onChange={(e) => { updateFormField('file', e.target.files[0]); if (newFormErrors.file) setManualErrors((p) => ({ ...p, file: '' })); }}
                                className="input-field py-1.5 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:bg-emerald-600 file:text-white file:text-[10px] file:font-bold file:uppercase transition-all cursor-pointer"
                                accept=".pdf,image/*,.doc,.docx,.xls,.xlsx"
                            />
                        </div>
                    </div>
                </div>
            );
        }

        // Lease of Venue
        if (selectedSubDocType === 'Lease of Venue' || selectedSubDocType === 'Supplies - Lease of Venue') {
            return null; // No additional fields
        }

        // Public Bidding
        if (selectedSubDocType === 'Public Bidding' || selectedSubDocType === 'Supplies - Public Bidding') {
            return null; // No additional fields
        }

        // Small Value Procurement
        if (selectedSubDocType === 'Small Value Procurement' || selectedSubDocType === 'Supplies - Small Value Procurement') {
            return (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-2">
                    <div className="field-group">
                        <label className="label">Agency Procurement</label>
                        <input type="text" value={form.agency_procurement} onChange={(e) => updateFormField('agency_procurement', e.target.value)} className="input-field" placeholder="Agency name" />
                    </div>
                    <div className="field-group">
                        <label className="label">Certificate</label>
                        <input type="text" value={form.certificate} onChange={(e) => updateFormField('certificate', e.target.value)} className="input-field" placeholder="Certificate details" />
                    </div>
                </div>
            );
        }

        // Lease of Venue: Table Rating Factor
        if (selectedSubDocType === 'Lease of Venue: Table Rating Factor') {
            return (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pb-2">
                    <div className="field-group sm:col-span-2 lg:col-span-3">
                        <label className="label">Name of Service Provider</label>
                        <input type="text" value={form.service_provider_name} onChange={(e) => updateFormField('service_provider_name', toLettersOnly(e.target.value))} className="input-field" placeholder="Enter service provider name" />
                    </div>
                    <div className="field-group sm:col-span-2">
                        <label className="label">Address</label>
                        <textarea value={form.service_provider_address} onChange={(e) => updateFormField('service_provider_address', e.target.value)} className="input-field min-h-[4rem] px-3 py-3 resize-none" placeholder="Enter provider address..." />
                    </div>
                    <div className="field-group">
                        <label className="label">Factor Value</label>
                        <input type="text" inputMode="decimal" value={form.factor_value} onChange={(e) => updateFormField('factor_value', toNumbersOnly(e.target.value))} className="input-field font-mono text-right" placeholder="0.00" />
                    </div>
                </div>
            );
        }

        // Notice of Award
        if (selectedSubDocType === 'Notice of Award') {
            return (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pb-2">
                    <div className="field-group sm:col-span-2">
                        <label className="label">Service Provider</label>
                        <input type="text" value={form.notice_award_service_provider} onChange={(e) => updateFormField('notice_award_service_provider', toLettersOnly(e.target.value))} className="input-field" placeholder="Provider name" />
                    </div>
                    <div className="field-group">
                        <label className="label">Date</label>
                        <input type="date" value={form.notice_award_date || ''} onChange={(e) => updateFormField('notice_award_date', e.target.value)} className="input-field" />
                    </div>
                    <div className="field-group">
                        <label className="label">Authorized Rep/Owner</label>
                        <input type="text" value={form.notice_award_authorized_rep} onChange={(e) => updateFormField('notice_award_authorized_rep', toLettersOnly(e.target.value))} className="input-field" placeholder="Name" />
                    </div>
                    <div className="field-group sm:col-span-2">
                        <label className="label">Conforme</label>
                        <input type="text" value={form.notice_award_conforme} onChange={(e) => updateFormField('notice_award_conforme', toLettersOnly(e.target.value))} className="input-field" placeholder="Conforme details" />
                    </div>
                    <div className="field-group">
                        <label className="label">Upload File</label>
                        <input type="file" onChange={(e) => updateFormField('file', e.target.files[0])} className="input-field py-1.5 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:bg-emerald-600 file:text-white file:text-[10px] file:font-bold file:uppercase cursor-pointer" accept=".pdf,image/*,.doc,.docx,.xls,.xlsx" />
                    </div>
                </div>
            );
        }

        // Secretary's Certificate
        if (selectedSubDocType === "Applicable: Secretary's Certificate and Special Power of Attorney") {
            return (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pb-2">
                    <div className="field-group sm:col-span-2">
                        <label className="label">Service Provider</label>
                        <input type="text" value={form.secretary_service_provider} onChange={(e) => updateFormField('secretary_service_provider', toLettersOnly(e.target.value))} className="input-field" placeholder="Provider name" />
                    </div>
                    <div className="field-group">
                        <label className="label">Owner/Authorized Rep</label>
                        <input type="text" value={form.secretary_owner_rep} onChange={(e) => updateFormField('secretary_owner_rep', toLettersOnly(e.target.value))} className="input-field" placeholder="Name" />
                    </div>
                    <div className="field-group">
                        <label className="label">Date</label>
                        <input type="date" value={form.secretary_date || ''} onChange={(e) => updateFormField('secretary_date', e.target.value)} className="input-field" />
                    </div>
                    <div className="field-group">
                        <label className="label">Upload File</label>
                        <input type="file" onChange={(e) => updateFormField('file', e.target.files[0])} className="input-field py-1.5 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:bg-emerald-600 file:text-white file:text-[10px] file:font-bold file:uppercase cursor-pointer" accept=".pdf,image/*,.doc,.docx,.xls,.xlsx" />
                    </div>
                </div>
            );
        }

        // Award Posting Documents
        if (selectedSubDocType === 'PhilGEPS Posting of Award') {
            return (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-2">
                    <div className="field-group">
                        <label className="label">Posting Date</label>
                        <input type="date" value={form.philgeps_posting_date || ''} onChange={(e) => updateFormField('philgeps_posting_date', e.target.value)} className="input-field" />
                    </div>
                    <div className="field-group">
                        <label className="label">Upload File</label>
                        <input
                            type="file"
                            onChange={(e) => { updateFormField('file', e.target.files[0]); if (newFormErrors.file) setManualErrors((p) => ({ ...p, file: '' })); }}
                            className="input-field py-1.5 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:bg-emerald-600 file:text-white file:text-[10px] file:font-bold file:uppercase transition-all cursor-pointer"
                            accept=".pdf,image/*,.doc,.docx,.xls,.xlsx"
                        />
                    </div>
                </div>
            );
        }

        if (selectedSubDocType === 'Certificate of DILG R1 Website Posting of Award') {
            return (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-2">
                    <div className="field-group">
                        <label className="label">Posting Date</label>
                        <input type="date" value={form.dilg_posting_date || ''} onChange={(e) => updateFormField('dilg_posting_date', e.target.value)} className="input-field" />
                    </div>
                    <div className="field-group">
                        <label className="label">Upload File</label>
                        <input
                            type="file"
                            onChange={(e) => { updateFormField('file', e.target.files[0]); if (newFormErrors.file) setManualErrors((p) => ({ ...p, file: '' })); }}
                            className="input-field py-1.5 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:bg-emerald-600 file:text-white file:text-[10px] file:font-bold file:uppercase transition-all cursor-pointer"
                            accept=".pdf,image/*,.doc,.docx,.xls,.xlsx"
                        />
                    </div>
                </div>
            );
        }

        if (selectedSubDocType?.includes('(Posted)')) {
            const dateField = selectedSubDocType === 'Notice of Award (Posted)' ? 'notice_award_posted_date' :
                              selectedSubDocType === 'Abstract of Quotation (Posted)' ? 'aoq_posted_date' :
                              'bac_resolution_posted_date';
            return (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-2">
                    <div className="field-group">
                        <label className="label">Posting Date</label>
                        <input type="date" value={form[dateField] || ''} onChange={(e) => updateFormField(dateField, e.target.value)} className="input-field" />
                    </div>
                    <div className="field-group">
                        <label className="label">Upload Proof of Posting</label>
                        <input
                            type="file"
                            onChange={(e) => { updateFormField('file', e.target.files[0]); if (newFormErrors.file) setManualErrors((p) => ({ ...p, file: '' })); }}
                            className="input-field py-1.5 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:bg-emerald-600 file:text-white file:text-[10px] file:font-bold file:uppercase transition-all cursor-pointer"
                            accept=".pdf,image/*,.doc,.docx,.xls,.xlsx"
                        />
                    </div>
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
            title="Start New Procurement"
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
                            <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Procurement Type</h3>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            {DOC_TYPES.map((type) => {
                                const Icon = ICON_MAP[type.id] || MdDescription;
                                return (
                                    <button
                                        key={type.id}
                                        type="button"
                                        onClick={() => { setSelectedDocType(type); updateFormField('category', type.name); setNewStep('subDoc'); }}
                                        className="group p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-emerald-500 hover:shadow-xl hover:-translate-y-1 transition-all active:scale-[0.98] text-center flex flex-col items-center"
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
                            {selectedSubDocType === 'Supplies' ? (
                                // Show Supplies selection options
                                <div className="space-y-3">
                                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-4">
                                        <span>Select Supplies Type</span>
                                        <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800" />
                                    </h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {['Lease of Venue', 'Public Bidding', 'Small Value Procurement'].map((option) => {
                                            const uploaded = alreadyUploaded(`Supplies - ${option}`);
                                            return (
                                                <button
                                                    key={option}
                                                    type="button"
                                                    disabled={uploaded}
                                                    onClick={() => { 
                                                        if (uploaded) return; 
                                                        setSelectedSubDocType(`Supplies - ${option}`); 
                                                        updateFormField('subDoc', `Supplies - ${option}`); 
                                                        setNewStep('form'); 
                                                    }}
                                                    className={`group w-full text-left p-4 rounded-xl border border-slate-200 dark:border-slate-800 transition-all duration-300 flex items-center justify-between gap-3 ${uploaded ? 'bg-slate-50 dark:bg-slate-900 opacity-50 grayscale cursor-not-allowed' : 'bg-white dark:bg-slate-900 hover:border-blue-500 hover:shadow-lg active:scale-[0.98]'}`}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800 group-hover:bg-blue-100 dark:group-hover:bg-blue-500/20 transition-colors">
                                                            <MdDescription className="w-4 h-4 text-slate-400 group-hover:text-blue-500" />
                                                        </div>
                                                        <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{option}</span>
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
                                    <div className="flex justify-start">
                                        <button 
                                            type="button"
                                            onClick={() => { setSelectedSubDocType(null); }}
                                            className="text-[10px] font-bold text-blue-600 hover:text-blue-700 underline decoration-dotted flex items-center gap-1"
                                        >
                                            <MdChevronLeft className="w-4 h-4" /> Back to Sub-Documents
                                        </button>
                                    </div>
                                </div>
                            ) : selectedSubDocType === 'PHILGEPS' ? (
                                // Show PHILGEPS procurement method options
                                <div className="space-y-3">
                                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-4">
                                        <span>Select Procurement Method</span>
                                        <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800" />
                                    </h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {[
                                            { value: 'Lease of Venue', label: 'Lease of Venue' },
                                            { value: 'Public Bidding', label: 'Public Bidding' },
                                            { value: 'Small Value Procurement', label: 'Small Value Procurement' }
                                        ].map((method) => {
                                            const fullSubDoc = `PHILGEPS - ${method.value}`;
                                            const uploaded = alreadyUploaded(fullSubDoc);
                                            return (
                                                <button
                                                    key={method.value}
                                                    type="button"
                                                    disabled={uploaded}
                                                    onClick={() => { 
                                                        if (uploaded) return; 
                                                        setSelectedSubDocType(fullSubDoc); 
                                                        updateFormField('subDoc', fullSubDoc); 
                                                        setNewStep('form'); 
                                                    }}
                                                    className={`group w-full text-left p-4 rounded-xl border border-slate-200 dark:border-slate-800 transition-all duration-300 flex items-center justify-between gap-3 ${uploaded ? 'bg-slate-50 dark:bg-slate-900 opacity-50 grayscale cursor-not-allowed' : 'bg-white dark:bg-slate-900 hover:border-blue-500 hover:shadow-lg active:scale-[0.98]'}`}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800 group-hover:bg-blue-100 dark:group-hover:bg-blue-500/20 transition-colors">
                                                            <MdDescription className="w-4 h-4 text-slate-400 group-hover:text-blue-500" />
                                                        </div>
                                                        <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{method.label}</span>
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
                                    <div className="flex justify-start">
                                        <button 
                                            type="button"
                                            onClick={() => { setSelectedSubDocType(null); }}
                                            className="text-[10px] font-bold text-blue-600 hover:text-blue-700 underline decoration-dotted flex items-center gap-1"
                                        >
                                            <MdChevronLeft className="w-4 h-4" /> Back to Sub-Documents
                                        </button>
                                    </div>
                                </div>
                            ) : selectedSubDocType === 'Certificate of DILG' ? (
                                // Show Certificate of DILG procurement method options
                                <div className="space-y-3">
                                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-4">
                                        <span>Select Procurement Method</span>
                                        <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800" />
                                    </h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {[
                                            { value: 'Lease of Venue', label: 'Lease of Venue' },
                                            { value: 'Public Bidding', label: 'Public Bidding' },
                                            { value: 'Small Value Procurement', label: 'Small Value Procurement' }
                                        ].map((method) => {
                                            const fullSubDoc = `Certificate of DILG - ${method.value}`;
                                            const uploaded = alreadyUploaded(fullSubDoc);
                                            return (
                                                <button
                                                    key={method.value}
                                                    type="button"
                                                    disabled={uploaded}
                                                    onClick={() => { 
                                                        if (uploaded) return; 
                                                        setSelectedSubDocType(fullSubDoc); 
                                                        updateFormField('subDoc', fullSubDoc); 
                                                        setNewStep('form'); 
                                                    }}
                                                    className={`group w-full text-left p-4 rounded-xl border border-slate-200 dark:border-slate-800 transition-all duration-300 flex items-center justify-between gap-3 ${uploaded ? 'bg-slate-50 dark:bg-slate-900 opacity-50 grayscale cursor-not-allowed' : 'bg-white dark:bg-slate-900 hover:border-blue-500 hover:shadow-lg active:scale-[0.98]'}`}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800 group-hover:bg-blue-100 dark:group-hover:bg-blue-500/20 transition-colors">
                                                            <MdDescription className="w-4 h-4 text-slate-400 group-hover:text-blue-500" />
                                                        </div>
                                                        <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{method.label}</span>
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
                                    <div className="flex justify-start">
                                        <button 
                                            type="button"
                                            onClick={() => { setSelectedSubDocType(null); }}
                                            className="text-[10px] font-bold text-blue-600 hover:text-blue-700 underline decoration-dotted flex items-center gap-1"
                                        >
                                            <MdChevronLeft className="w-4 h-4" /> Back to Sub-Documents
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                // Show regular sub-docs
                                (() => {
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
                                                            onClick={() => { 
                                                                if (uploaded) return; 
                                                                setSelectedSubDocType(sd); 
                                                                updateFormField('subDoc', sd); 
                                                                if (sd === 'Supplies' || sd === 'PHILGEPS' || sd === 'Certificate of DILG') {
                                                                    // For hierarchical selections, stay on subDoc step
                                                                    return;
                                                                }
                                                                setNewStep('form'); 
                                                            }}
                                                            className={`group w-full text-left p-4 rounded-xl border border-slate-200 dark:border-slate-800 transition-all duration-300 flex items-center justify-between gap-3 ${uploaded ? 'bg-slate-50 dark:bg-slate-900 opacity-50 grayscale cursor-not-allowed' : 'bg-white dark:bg-slate-900 hover:border-blue-500 hover:shadow-xl hover:-translate-y-0.5 active:scale-[0.99]'}`}
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
                                })()
                            )}
                        </div>
                    </div>
                )}

                {newStep === 'form' && selectedDocType && (
                    <form id="new-procurement-form" onSubmit={handleNewSubmit} className="p-5 space-y-6 animate-in slide-in-from-right-2 duration-300">
                        {/* Document identity banner */}
                        <div className="p-4 bg-emerald-50 dark:bg-emerald-500/5 rounded-2xl border border-emerald-100 dark:border-emerald-500/20 flex items-center gap-4">
                             <div className="w-12 h-12 bg-white dark:bg-slate-900 rounded-xl shadow-sm flex items-center justify-center text-emerald-600 shrink-0">
                                <DocIcon className="w-6 h-6" />
                             </div>
                             <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5 mb-0.5">
                                    <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">{selectedDocType.name}</span>
                                    <MdChevronRight className="w-3.5 h-3.5 text-slate-300" />
                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest truncate">{selectedSubDocType}</span>
                                </div>
                                <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">Requirement Details</h3>
                             </div>
                             <button type="button" onClick={() => { setSelectedSubDocType(null); setNewStep('subDoc'); }} className="px-3 py-1.5 bg-white dark:bg-slate-800 text-[10px] font-bold text-emerald-600 uppercase border border-emerald-100 dark:border-emerald-500/20 rounded-lg shadow-sm hover:bg-emerald-50 transition-colors">Change</button>
                        </div>

                        {newError && (
                            <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 p-4 rounded-2xl flex items-center gap-3 text-red-600">
                                <MdError className="w-5 h-5 shrink-0" />
                                <p className="text-xs font-bold uppercase tracking-tight">{newError}</p>
                            </div>
                        )}

                        <div className="space-y-6">
                            {renderSpecificFields()}
                        </div>

                        {newFormErrors.file && (
                             <div className="py-2.5 px-4 bg-red-50 dark:bg-red-500/5 border border-red-100 dark:border-red-500/20 rounded-xl">
                                 <p className="text-[10px] font-bold text-red-500 uppercase text-center tracking-wider">{newFormErrors.file}</p>
                             </div>
                        )}

                        <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-slate-100 dark:border-slate-800">
                            <button 
                                type="button" 
                                onClick={() => setNewStep('subDoc')} 
                                className="flex-1 h-11 px-8 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-2xl font-bold uppercase tracking-widest text-[10px] hover:bg-slate-200 dark:hover:bg-slate-700 transition-all active:scale-[0.98] inline-flex items-center justify-center gap-2 order-2 sm:order-1"
                            >
                                <MdChevronLeft className="w-5 h-5" /> Go Back
                            </button>
                            <button 
                                type="submit"
                                disabled={newSubmitting}
                                className="flex-1 h-11 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black uppercase tracking-widest text-[11px] shadow-xl shadow-emerald-500/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2.5 disabled:opacity-50 disabled:grayscale disabled:scale-100 order-1 sm:order-2"
                            >
                                {newSubmitting ? <div className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" /> : <MdCheckCircle className="w-6 h-6" />}
                                <span>Submit Procurement</span>
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </Modal>
    );
};

export default NewProcurementModal;
