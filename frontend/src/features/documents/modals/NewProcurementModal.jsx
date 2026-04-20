import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    MdClose, MdCheckCircle, MdInfo, MdTitle, MdDescription, MdAttachMoney, 
    MdAccountBalanceWallet, MdArrowForward, MdArrowBack, MdSave, MdDone,
    MdGavel, MdHotel, MdShoppingCart, MdHandshake
} from 'react-icons/md';
import Modal from '../../../components/Modal';

const PROCUREMENT_TYPES = [
    { id: 'lease_of_venue', name: 'Lease of Venue', icon: '🏢', description: 'For venue rental contracts' },
    { id: 'small_value', name: 'Small Value Procurement', icon: '📋', description: 'Below ₱100,000' },
    { id: 'public_bidding', name: 'Public Bidding', icon: '📢', description: 'Open competitive bidding' },
    { id: 'negotiated', name: 'Negotiated Procurement', icon: '🤝', description: 'Direct negotiation' }
];

const STEPS = [
    { id: 'procurementType', label: 'Select Type', description: 'Select method' },
    { id: 'details', label: 'Fill Details', description: 'Enter information' },
    { id: 'summary', label: 'Save', description: 'Review and confirm' }
];

const NewProcurementModal = ({
    show,
    onClose,
    newStep,
    setNewStep,
    selectedSubDocType,
    setSelectedSubDocType,
    form,
    setForm,
    updateFormField,
    newFormErrors,
    setManualErrors,
    newSubmitting,
    newError,
    handleNewSubmit,
    toNumbersOnly,
    toLettersOnly,
    nextTransactionNumber
}) => {
    const stepIndex = STEPS.findIndex(s => s.id === newStep);

    useEffect(() => {
        if (show && nextTransactionNumber) {
            updateFormField('prNo', nextTransactionNumber);
        }
    }, [show, nextTransactionNumber]);

    const renderStepper = () => (
        <div className="px-8 py-8 bg-[var(--background-subtle)]/50 border-b border-[var(--border-light)] dark:border-[var(--border)] relative overflow-hidden">
            <div className="relative max-w-2xl mx-auto">
                {/* Background Progress Line */}
                <div className="absolute top-4 left-0 right-0 h-[1px] bg-[var(--border)] dark:bg-[var(--border)]/30 z-0" />
                <div 
                    className="absolute top-4 left-0 h-[1px] bg-[var(--primary)] transition-all duration-700 z-0"
                    style={{ width: `${(stepIndex / (STEPS.length - 1)) * 100}%` }}
                />

                <div className="relative z-10 flex items-center justify-between">
                    {STEPS.map((s, idx) => {
                        const isCompleted = idx < stepIndex;
                        const isActive = idx === stepIndex;
                        const isFuture = idx > stepIndex;
                        
                        return (
                            <div key={s.id} className="flex flex-col items-center gap-2 relative flex-1 first:flex-none last:flex-none">
                                <button
                                    type="button"
                                    disabled={isFuture && !isCompleted}
                                    onClick={() => setNewStep(s.id)}
                                    className={`w-8 h-8 rounded-xl border-2 flex items-center justify-center transition-all duration-300 relative z-20 hover:scale-110 active:scale-95 ${
                                        isActive || isCompleted 
                                            ? 'border-[var(--primary)] bg-[var(--primary)] text-white shadow-lg shadow-[var(--primary)]/20' 
                                            : 'border-[var(--border)] dark:border-[var(--border-light)] text-[var(--text-subtle)] bg-white dark:bg-slate-900'
                                    }`}
                                >
                                    {isCompleted ? <MdDone className="w-5 h-5" /> : <span className="text-xs font-bold">{idx + 1}</span>}
                                </button>
                                
                                <span className={`text-[10px] font-black uppercase tracking-widest transition-colors duration-300 ${
                                    isActive ? 'text-[var(--primary)]' : 'text-[var(--text-subtle)]'
                                }`}>
                                    {s.label}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );

    const renderTypeStep = () => (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
            {PROCUREMENT_TYPES.map((type) => (
                <button
                    key={type.id}
                    type="button"
                    onClick={() => {
                        setSelectedSubDocType(type.id);
                        setNewStep('details');
                    }}
                    className={`p-6 rounded-2xl border-2 transition-all text-left group ${
                        selectedSubDocType === type.id
                            ? 'border-[var(--primary)] bg-[var(--primary-muted)] dark:bg-[var(--primary)]/10'
                            : 'border-[var(--border-light)] dark:border-[var(--border)] hover:border-[var(--primary-light)]'
                    }`}
                >
                    <div className="flex items-start gap-4">
                        <span className="text-3xl filter grayscale group-hover:grayscale-0 transition-all">{type.icon}</span>
                        <div>
                            <h4 className="font-bold text-[var(--text)] uppercase tracking-tight text-sm">{type.name}</h4>
                            <p className="text-[10px] text-[var(--text-muted)] mt-1 font-medium">{type.description}</p>
                        </div>
                        {selectedSubDocType === type.id && (
                            <MdCheckCircle className="w-5 h-5 text-[var(--primary)] ml-auto" />
                        )}
                    </div>
                </button>
            ))}
        </div>
    );

    const renderDetailsStep = () => (
        <div className="max-w-xl mx-auto space-y-6">
            <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <MdInfo className="w-4 h-4" />
                    BAC Folder No.
                </label>
                <input
                    type="text"
                    value={form.prNo || nextTransactionNumber || ''}
                    readOnly
                    className="w-full p-4 bg-slate-100 dark:bg-slate-800 border-none rounded-2xl text-slate-500 font-mono text-sm cursor-not-allowed"
                />
            </div>

            <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <MdDescription className="w-4 h-4" />
                    PR No.
                </label>
                <input
                    type="text"
                    value={form.user_pr_no}
                    onChange={(e) => updateFormField('user_pr_no', toNumbersOnly(e.target.value))}
                    className="w-full p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-bold"
                    placeholder="Enter PR Number"
                />
            </div>

            <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <MdTitle className="w-4 h-4" />
                    Title / Purpose <span className="text-red-500">*</span>
                </label>
                <textarea
                    value={form.title}
                    onChange={(e) => updateFormField('title', e.target.value)}
                    className={`w-full p-4 bg-white dark:bg-slate-900 border ${newFormErrors.title ? 'border-red-500' : 'border-slate-200 dark:border-slate-800'} rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none min-h-[100px] font-medium`}
                    placeholder="What is this procurement for?"
                />
                {newFormErrors.title && <p className="text-[10px] text-red-500 font-bold">{newFormErrors.title}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <MdAttachMoney className="w-4 h-4" />
                        ABC (Budget)
                    </label>
                    <input
                        type="text"
                        value={form.total_amount}
                        onChange={(e) => updateFormField('total_amount', toNumbersOnly(e.target.value))}
                        className="w-full p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-mono font-bold"
                        placeholder="0.00"
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <MdAccountBalanceWallet className="w-4 h-4" />
                        Fund Source
                    </label>
                    <input
                        type="text"
                        value={form.source_of_fund}
                        onChange={(e) => updateFormField('source_of_fund', e.target.value)}
                        className="w-full p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-bold"
                        placeholder="e.g. MOOE"
                    />
                </div>
            </div>
        </div>
    );

    const renderSummaryStep = () => (
        <div className="max-w-xl mx-auto space-y-4">
            <div className="bg-[var(--primary-muted)] dark:bg-[var(--primary)]/5 p-6 rounded-3xl border border-[var(--primary-light)]/20 dark:border-[var(--primary)]/20 space-y-4">
                <div className="flex justify-between items-center pb-4 border-b border-[var(--border-light)] dark:border-[var(--border)]/20">
                    <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest">Method</span>
                    <span className="text-sm font-black text-[var(--primary)]">
                        {PROCUREMENT_TYPES.find(t => t.id === selectedSubDocType)?.name || selectedSubDocType}
                    </span>
                </div>
                <div className="flex justify-between items-center pb-4 border-b border-[var(--border-light)] dark:border-[var(--border)]/20">
                    <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest">Folder No.</span>
                    <span className="text-sm font-mono font-bold text-[var(--text)]">{form.prNo || nextTransactionNumber}</span>
                </div>
                <div className="space-y-1">
                    <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest">Title</span>
                    <p className="text-sm font-bold text-[var(--text)] leading-relaxed">{form.title}</p>
                </div>
                <div className="grid grid-cols-2 gap-3 pt-4 border-t border-[var(--border-light)] dark:border-[var(--border)]/20">
                    <div className="p-3 bg-white/50 dark:bg-black/20 rounded-2xl">
                        <span className="block text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                            <MdAttachMoney className="w-3 h-3" />
                            ABC
                        </span>
                        <span className="text-sm font-black text-[var(--primary)] font-mono">₱{form.total_amount || '0.00'}</span>
                    </div>
                    <div className="p-3 bg-white/50 dark:bg-black/20 rounded-2xl">
                        <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                            <MdAccountBalanceWallet className="w-3 h-3" />
                            Source
                        </span>
                        <span className="text-sm font-bold text-slate-700 dark:text-slate-300 truncate block">{form.source_of_fund || "—"}</span>
                    </div>
                </div>
            </div>
            
            <div className="p-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 rounded-2xl flex items-center gap-3">
                <MdInfo className="w-5 h-5 text-amber-500 shrink-0" />
                <p className="text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-tight">
                    Confirm all details are correct. This will initialize the procurement record.
                </p>
            </div>
        </div>
    );

    if (!show) return null;

    return (
        <Modal 
            isOpen={show} 
            onClose={onClose} 
            title="Add New Procurement"
            size="xl"
            containerClassName="relative"
        >
            <div className="flex flex-col min-h-[600px] relative">
                {/* Top accent progress border */}
                <div 
                    className="absolute top-0 left-0 h-1 bg-gradient-to-r from-[var(--primary-dark)] via-[var(--primary)] to-[var(--primary-light)] transition-all duration-700 z-[60]"
                    style={{ width: `${((stepIndex + 1) / STEPS.length) * 100}%` }}
                />

                {renderStepper()}

                <div className={`flex-1 overflow-y-auto px-8 py-10 custom-scrollbar flex flex-col ${newStep === 'procurementType' ? 'justify-center items-center h-full min-h-[400px]' : ''}`}>
                    <div className="w-full">
                        {newError && (
                            <div className="max-w-xl mx-auto mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-600">
                                <MdInfo className="w-5 h-5" />
                                <p className="text-xs font-bold uppercase">{newError}</p>
                            </div>
                        )}
                        {newStep === 'procurementType' ? renderTypeStep() : 
                        newStep === 'details' ? renderDetailsStep() : 
                        renderSummaryStep()}
                    </div>
                </div>

                <div className="px-8 py-6 border-t border-[var(--border-light)] dark:border-[var(--border)]/20 flex justify-between bg-[var(--muted)]/30 dark:bg-[var(--surface)]/30">
                    <div className="flex-1">
                            <button
                                type="button"
                                onClick={() => {
                                    if (newStep === 'procurementType') onClose();
                                    else if (newStep === 'details') setNewStep('procurementType');
                                    else setNewStep('details');
                                }}
                                className="px-6 py-2 text-sm font-bold text-[var(--text-muted)] hover:text-[var(--text)] transition-colors uppercase tracking-widest"
                            >
                                {newStep === 'procurementType' ? 'Cancel' : 'Back'}
                            </button>
                    </div>

                    <div className="flex gap-3">
                        {newStep === 'procurementType' ? (
                            <button
                                type="button"
                                disabled={!selectedSubDocType}
                                onClick={() => setNewStep('details')}
                                className="bg-[var(--primary)] text-white px-8 py-2 rounded-xl font-black text-[11px] uppercase tracking-widest shadow-lg shadow-[var(--primary)]/20 disabled:opacity-50 flex items-center gap-2 hover:bg-[var(--primary-hover)] transition-colors active:scale-95"
                            >
                                Continue
                                <MdArrowForward className="w-4 h-4" />
                            </button>
                        ) : newStep === 'details' ? (
                            <button
                                type="button"
                                disabled={!form.title}
                                onClick={() => setNewStep('summary')}
                                className="bg-[var(--primary)] text-white px-8 py-2 rounded-xl font-black text-[11px] uppercase tracking-widest shadow-lg shadow-[var(--primary)]/20 disabled:opacity-50 flex items-center gap-2 hover:bg-[var(--primary-hover)] transition-colors active:scale-95"
                            >
                                Continue
                                <MdArrowForward className="w-4 h-4" />
                            </button>
                        ) : newStep === 'summary' ? (
                            <button
                                type="button"
                                disabled={newSubmitting}
                                onClick={handleNewSubmit}
                                className="bg-[var(--primary)] text-white px-10 py-2.5 rounded-xl font-black text-[11px] uppercase tracking-widest shadow-lg shadow-[var(--primary)]/20 disabled:opacity-50 flex items-center gap-2 relative overflow-hidden group active:scale-95 transition-all hover:bg-[var(--primary-hover)]"
                            >
                                <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] pointer-events-none" />
                                {newSubmitting ? 'Saving...' : 'Save Record'}
                                <MdSave className="w-4 h-4" />
                            </button>
                        ) : null}
                    </div>
                </div>
            </div>
        </Modal>
    );
};

export default NewProcurementModal;
