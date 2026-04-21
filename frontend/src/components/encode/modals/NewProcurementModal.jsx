import React from 'react';
import {
    MdClose, MdDescription, MdChevronRight, MdChevronLeft,
    MdCheckCircle, MdInfo, MdAdd, MdDelete, MdPostAdd,
    MdFolderOpen, MdError, MdGroup, MdDone, MdArrowBack
} from 'react-icons/md';
import { DOC_TYPES } from '../../../constants/docTypes';
import Modal from '../../features/shared/Modal';

const ICON_MAP = {
    initial: MdFolderOpen,
    afq: MdDescription,
    meeting: MdGroup,
    award: MdCheckCircle,
    posting: MdPostAdd,
};

const STEPS = [
    { id: 'docType', label: 'Procurement Type' },
    { id: 'subDoc', label: 'Details' },
    { id: 'form', label: 'Save' }
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
                        {idx < STEPS.length - 1 && (
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

    // Step 1: Procurement Type (Category selection)
    const renderDocTypeStep = () => (
        <div className="space-y-5">
            <div className="text-center mb-6">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Select Procurement Type</h3>
                <p className="text-sm text-slate-500 mt-1">Choose the category of procurement</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {DOC_TYPES.map((docType) => (
                    <button
                        key={docType.id}
                        type="button"
                        onClick={() => {
                            setSelectedDocType(docType);
                            setSelectedSubDocType(null);
                            if (newFormErrors?.docType) setManualErrors(prev => ({ ...prev, docType: null }));
                        }}
                        className={`p-4 rounded-xl border-2 transition-all text-left ${
                            selectedDocType?.id === docType.id
                                ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                                : 'border-slate-200 dark:border-slate-700 hover:border-emerald-300 dark:hover:border-emerald-600'
                        }`}
                    >
                        <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600">
                                <ICON_MAP[docType.id] ? <ICON_MAP[docType.id] className="w-5 h-5" /> : <MdFolderOpen className="w-5 h-5" />}
                            </div>
                            <div>
                                <h4 className="font-bold text-slate-900 dark:text-white">{docType.name}</h4>
                                <p className="text-xs text-slate-500 mt-1">{docType.subDocs?.length || 0} document types</p>
                            </div>
                            {selectedDocType?.id === docType.id && (
                                <MdCheckCircle className="w-5 h-5 text-emerald-500 ml-auto" />
                            )}
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );

    // Step 2: Details (PR No., Title, ABC, Fund Source)
    const renderDetailsStep = () => (
        <div className="space-y-5">
            <div className="text-center mb-6">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Enter Details</h3>
                <p className="text-sm text-slate-500 mt-1">Provide procurement details</p>
            </div>
            
            {newError && (
                <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 p-4 rounded-2xl flex items-center gap-3 text-red-600">
                    <MdError className="w-5 h-5 shrink-0" />
                    <p className="text-xs font-bold uppercase tracking-tight">{newError}</p>
                </div>
            )}

            <div className="space-y-4">

                <div className="field-group">
                    <label className="label">Title / Purpose <span className="text-red-500 font-bold">*</span></label>
                    <textarea
                        value={form.title || ''}
                        onChange={(e) => updateFormField('title', e.target.value)}
                        className={`input-field min-h-[5rem] resize-none py-3 ${newFormErrors?.title ? 'border-red-400' : ''}`}
                        placeholder="Enter title or purpose"
                    />
                    {newFormErrors?.title && <p className="text-xs text-red-500 mt-1 font-bold">{newFormErrors.title}</p>}
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="field-group">
                        <label className="label">ABC (Budget) <span className="text-red-500 font-bold">*</span></label>
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400 font-bold text-sm">₱</div>
                            <input
                                type="text"
                                inputMode="decimal"
                                value={form.total_amount || ''}
                                onChange={(e) => updateFormField('total_amount', toNumbersOnly(e.target.value))}
                                onBlur={() => {
                                    const val = String(form.total_amount || '').trim();
                                    if (val && !isNaN(Number(val))) {
                                        updateFormField('total_amount', Number(val).toFixed(2));
                                    }
                                }}
                                className={`input-field pl-8 text-right font-mono ${newFormErrors?.total_amount ? 'border-red-400' : ''}`}
                                placeholder="0.00"
                            />
                        </div>
                    </div>

                    <div className="field-group">
                        <label className="label">Fund Source <span className="text-red-500 font-bold">*</span></label>
                        <input
                            type="text"
                            value={form.source_of_fund || ''}
                            onChange={(e) => updateFormField('source_of_fund', e.target.value)}
                            className={`input-field ${newFormErrors?.source_of_fund ? 'border-red-400' : ''}`}
                            placeholder="e.g., General Fund"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="field-group">
                        <label className="label">Year <span className="text-red-500 font-bold">*</span></label>
                        <input
                            type="text"
                            value={form.year || new Date().getFullYear()}
                            onChange={(e) => updateFormField('year', e.target.value.replace(/[^0-9]/g, '').slice(0, 4))}
                            className={`input-field ${newFormErrors?.year ? 'border-red-400' : ''}`}
                            placeholder="e.g., 2024"
                        />
                    </div>
                    <div className="field-group">
                        <label className="label">Quarter <span className="text-red-500 font-bold">*</span></label>
                        <select
                            value={form.quarter || 'Q1'}
                            onChange={(e) => updateFormField('quarter', e.target.value)}
                            className={`input-field ${newFormErrors?.quarter ? 'border-red-400' : ''}`}
                        >
                            <option value="Q1">Q1</option>
                            <option value="Q2">Q2</option>
                            <option value="Q3">Q3</option>
                            <option value="Q4">Q4</option>
                        </select>
                    </div>
                </div>
            </div>

            <div className="p-6 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl">
                <div className="text-center">
                    <MdAdd className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Upload File</p>
                    <p className="text-[10px] text-slate-400 mb-4">PDF, Image, DOC, DOCX, XLS, XLSX</p>
                    <input type="file" onChange={(e) => updateFormField('file', e.target.files[0])} className="input-file" accept=".pdf,image/*,.doc,.docx,.xls,.xlsx" />
                </div>
            </div>
        </div>
    );

    // Step 3: Save (submit)
    const renderFormStep = () => (
        <div className="space-y-5">
            <div className="p-4 bg-emerald-50 dark:bg-emerald-500/5 rounded-2xl border border-emerald-100 dark:border-emerald-500/20">
                <h4 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-4">Summary</h4>
                <div className="space-y-3">
                    <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-800">
                        <span className="text-sm text-slate-500">Title / Purpose</span>
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-200 text-right max-w-[200px] truncate">{form.title || '-'}</span>
                    </div>
                    {form.total_amount && (
                        <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-800">
                            <span className="text-sm text-slate-500">ABC</span>
                            <span className="text-sm font-bold text-green-600 font-mono">₱{form.total_amount}</span>
                        </div>
                    )}
                    {form.source_of_fund && (
                        <div className="flex justify-between items-center py-2">
                            <span className="text-sm text-slate-500">Fund Source</span>
                            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{form.source_of_fund}</span>
                        </div>
                    )}
                </div>
            </div>

            <p className="text-sm text-slate-500 dark:text-slate-400 text-center">
                Click "Save" to submit this procurement record.
            </p>
        </div>
    );

    if (!show) return null;

    return (
        <Modal
            isOpen={show}
            onClose={onClose}
            title="New Procurement Record"
            size="lg"
        >
            {renderStepper()}

            {newStep === 'docType' && renderDocTypeStep()}
            {newStep === 'subDoc' && renderDetailsStep()}
            {newStep === 'form' && renderFormStep()}

            <div className="flex justify-between mt-8 pt-4 border-t border-slate-100 dark:border-slate-800">
                {newStep !== 'docType' && (
                    <button
                        type="button"
                        onClick={() => {
                            if (newStep === 'form') setNewStep('subDoc');
                            else if (newStep === 'subDoc') setNewStep('docType');
                        }}
                        className="btn-secondary flex items-center gap-2"
                    >
                        <MdArrowBack className="w-4 h-4" />
                        Back
                    </button>
                )}

                {!selectedDocType && newStep === 'docType' && (
                    <div className="flex-1" />
                )}

                {newStep === 'docType' && (
                    <button
                        type="button"
                        onClick={() => setNewStep('subDoc')}
                        disabled={!selectedDocType}
                        className="btn-primary flex items-center gap-2 ml-auto"
                    >
                        Next
                        <MdChevronRight className="w-4 h-4" />
                    </button>
                )}

                {newStep === 'subDoc' && (
                    <button
                        type="button"
                        onClick={() => setNewStep('form')}
                        disabled={
                            !selectedDocType || 
                            !form.title?.trim() || 
                            !form.total_amount || 
                            !form.source_of_fund
                        }
                        className="btn-primary flex items-center gap-2 ml-auto"
                    >
                        Next
                        <MdChevronRight className="w-4 h-4" />
                    </button>
                )}

                {newStep === 'form' && (
                    <button
                        type="button"
                        onClick={handleNewSubmit}
                        disabled={newSubmitting}
                        className="btn-primary flex items-center gap-2 ml-auto"
                    >
                        {newSubmitting ? 'Saving...' : 'Save'}
                        <MdCheckCircle className="w-4 h-4" />
                    </button>
                )}
            </div>
        </Modal>
    );
};

export default NewProcurementModal;
