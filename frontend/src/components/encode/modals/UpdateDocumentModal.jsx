import React from 'react';
import { MdClose, MdDownload, MdInfo, MdAdd, MdDescription, MdCheckCircle } from 'react-icons/md';
import { toLettersOnly, toNumbersOnly, formatCurrencyValue } from '../../../utils/validation';
import Modal from '../../Modal';

const UpdateDocumentModal = ({
    isOpen,
    onClose,
    selectedDoc,
    form,
    setForm,
    updateError,
    updateSubmitting,
    onSubmit,
    attendanceMembers,
    setAttendanceMembers,
    abstractBidders,
    setAbstractBidders,
    triggerDownload,
    user,
    isAdmin
}) => {
    if (!isOpen || !selectedDoc) return null;
    
    // Dynamic sizing based on content
    const getModalSize = () => {
        const sub = selectedDoc?.subDoc;
        if (['Notice of BAC Meeting', 'Invitation to COA', 'Attendance Sheet', 'Minutes of the Meeting'].includes(sub)) return 'md';
        if (['Abstract of Quotation'].includes(sub)) return '2xl';
        if (['Purchase Request', 'Activity Design', 'BAC Resolution', 'Contract Services/Purchase Order', 'Notice to Proceed'].includes(sub)) return 'lg';
        return 'xl'; // Default for PPMP, APP, Market Scoping, etc.
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={selectedDoc.subDoc || "Update Procurement"}
            size={getModalSize()}
            showCloseButton={true}
        >
            <div className="space-y-6">
                {/* Header Banner */}
                <div className="p-4 bg-emerald-50 dark:bg-emerald-500/5 rounded-2xl border border-emerald-100 dark:border-emerald-500/20 flex items-center gap-4">
                    <div className="p-3 bg-white dark:bg-slate-900 rounded-xl shadow-sm text-emerald-600 shrink-0">
                        <MdDescription className="w-6 h-6" />
                    </div>
                    <div>
                        <div className="flex items-center gap-1.5 mb-0.5">
                            <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">{selectedDoc.category}</span>
                            <span className="text-slate-300 text-[10px]">/</span>
                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{selectedDoc.subDoc}</span>
                        </div>
                        <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Update Procurement</h3>
                    </div>
                </div>

                <form onSubmit={onSubmit} className="space-y-6">
                    <div className="space-y-6">
                        {selectedDoc?.subDoc === 'Purchase Request' && (
                            <div className="space-y-4">
                                <div className="field-group">
                                    <label className="label">BAC Folder No.</label>
                                    <div className="h-11 px-4 flex items-center bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-800 rounded-xl font-mono text-xs text-slate-400 border-dashed">
                                        {form.prNo}
                                    </div>
                                </div>
                                <div className="field-group">
                                    <label className="label">PR No.</label>
                                    <input type="text" value={form.user_pr_no} onChange={(e) => setForm((f) => ({ ...f, user_pr_no: toNumbersOnly(e.target.value) }))} className="input-field" placeholder="Enter PR number" />
                                </div>
                                <div className="field-group">
                                    <label className="label">Purpose</label>
                                    <textarea value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} className="input-field min-h-[5rem] resize-none py-3" placeholder="Purpose of the purchase request" />
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="field-group">
                                        <label className="label">Total Amount</label>
                                        <div className="relative group">
                                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400 font-bold text-sm">₱</div>
                                            <input type="text" inputMode="decimal" value={form.total_amount} onChange={(e) => setForm((f) => ({ ...f, total_amount: toNumbersOnly(e.target.value) }))} className="input-field pl-8 text-right font-mono" placeholder="0.00" />
                                        </div>
                                    </div>
                                    <div className="field-group">
                                        <label className="label">Date</label>
                                        <input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} className="input-field" />
                                    </div>
                                </div>
                                <div className="field-group">
                                    <label className="label">Upload File</label>
                                    <input type="file" onChange={(e) => setForm((f) => ({ ...f, file: e.target.files[0] }))} className="input-field py-1.5 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:bg-emerald-600 file:text-white file:text-[10px] file:font-bold file:uppercase cursor-pointer" accept=".pdf,image/*,.doc,.docx,.xls,.xlsx" />
                                </div>
                            </div>
                        )}

                        {selectedDoc?.subDoc === 'Activity Design' && (
                            <div className="space-y-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="field-group">
                                        <label className="label">BAC Folder No.</label>
                                        <div className="h-11 px-4 flex items-center bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-800 rounded-xl font-mono text-xs text-slate-400 border-dashed">
                                            {form.prNo}
                                        </div>
                                    </div>
                                    <div className="field-group">
                                        <label className="label">PR No.</label>
                                        <input type="text" value={form.user_pr_no} onChange={(e) => setForm((f) => ({ ...f, user_pr_no: e.target.value }))} className="input-field" placeholder="Enter PR number" />
                                    </div>
                                </div>
                                <div className="field-group">
                                    <label className="label">Title</label>
                                    <textarea value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} className="input-field min-h-[5rem] resize-none py-3" placeholder="Document title" />
                                </div>
                                <div className="field-group">
                                    <label className="label">Source of Fund</label>
                                    <input type="text" value={form.source_of_fund} onChange={(e) => setForm((f) => ({ ...f, source_of_fund: e.target.value }))} className="input-field" placeholder="Source of fund" />
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="field-group">
                                        <label className="label">Total Amount</label>
                                        <div className="relative group">
                                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400 font-bold text-sm">₱</div>
                                            <input type="text" inputMode="decimal" value={form.total_amount} onChange={(e) => setForm((f) => ({ ...f, total_amount: toNumbersOnly(e.target.value) }))} className="input-field pl-8 text-right font-mono" placeholder="0.00" />
                                        </div>
                                    </div>
                                    <div className="field-group">
                                        <label className="label">Date</label>
                                        <input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} className="input-field" />
                                    </div>
                                </div>
                                <div className="field-group">
                                    <label className="label">Upload File</label>
                                    <input type="file" onChange={(e) => setForm((f) => ({ ...f, file: e.target.files[0] }))} className="input-field py-1.5 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:bg-emerald-600 file:text-white file:text-[10px] file:font-bold file:uppercase cursor-pointer" accept=".pdf,image/*,.doc,.docx,.xls,.xlsx" />
                                </div>
                            </div>
                        )}

                        {selectedDoc?.subDoc === 'Project Procurement Management Plan/Supplemental PPMP' && (
                            <div className="space-y-4">
                                <div className="field-group">
                                    <label className="label">Title</label>
                                    <textarea value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} className="input-field min-h-[5rem] resize-none py-3" placeholder="Enter PPMP title..." />
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="field-group">
                                        <label className="label">PPMP No.</label>
                                        <input type="text" value={form.ppmp_no} onChange={(e) => setForm((f) => ({ ...f, ppmp_no: toNumbersOnly(e.target.value) }))} className="input-field" placeholder="PPMP number" />
                                    </div>
                                    <div className="field-group">
                                        <label className="label">Fund Source</label>
                                        <input type="text" value={form.source_of_fund} onChange={(e) => setForm((f) => ({ ...f, source_of_fund: e.target.value }))} className="input-field" placeholder="Source of fund" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="field-group">
                                        <label className="label">Total Budget</label>
                                        <div className="relative group">
                                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400 font-bold text-sm">₱</div>
                                            <input type="text" inputMode="decimal" value={form.total_amount} onChange={(e) => setForm((f) => ({ ...f, total_amount: toNumbersOnly(e.target.value) }))} className="input-field pl-8 text-right font-mono" placeholder="0.00" />
                                        </div>
                                    </div>
                                    <div className="field-group">
                                        <label className="label">Date</label>
                                        <input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} className="input-field" />
                                    </div>
                                </div>
                                <div className="field-group">
                                    <label className="label">Upload File</label>
                                    <input type="file" onChange={(e) => setForm((f) => ({ ...f, file: e.target.files[0] }))} className="input-field py-1.5 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:bg-emerald-600 file:text-white file:text-[10px] file:font-bold file:uppercase cursor-pointer" accept=".pdf,image/*,.doc,.docx,.xls,.xlsx" />
                                </div>
                            </div>
                        )}

                        {selectedDoc?.subDoc === 'Annual Procurement Plan' && (
                            <div className="space-y-4">
                                <div className="field-group">
                                    <label className="label">Title</label>
                                    <textarea value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} className="input-field min-h-[5rem] resize-none py-3" placeholder="Enter APP title..." />
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="field-group">
                                        <label className="label">APP No.</label>
                                        <input type="text" value={form.app_no} onChange={(e) => setForm((f) => ({ ...f, app_no: e.target.value }))} className="input-field" placeholder="APP number" />
                                    </div>
                                    <div className="field-group">
                                        <label className="label">APP Type</label>
                                        <select value={form.app_type} onChange={(e) => setForm((f) => ({ ...f, app_type: e.target.value }))} className="input-field font-bold">
                                            <option value="">Select</option>
                                            <option value="Final">Final</option>
                                            <option value="Updated">Updated</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="field-group">
                                    <label className="label">Certified True Copy?</label>
                                    <div className="flex items-center gap-6 h-11">
                                        {[{ val: true, label: 'Yes' }, { val: false, label: 'No' }].map(({ val, label }) => (
                                            <label key={label} className="flex items-center gap-2 cursor-pointer group">
                                                <input type="radio" name="certified_true_copy_app_update" checked={form.certified_true_copy === val}
                                                    onChange={() => setForm((f) => ({ ...f, certified_true_copy: val, certified_signed_by: val ? f.certified_signed_by : '' }))}
                                                    className="w-5 h-5 text-emerald-600 focus:ring-emerald-500 border-slate-300 transition-all" />
                                                <span className="text-sm font-bold text-slate-700 dark:text-slate-200 group-hover:text-emerald-600">{label}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                                {form.certified_true_copy && (
                                    <div className="field-group animate-in fade-in slide-in-from-top-2 duration-300">
                                        <label className="label">Signed by</label>
                                        <input type="text" value={form.certified_signed_by} onChange={(e) => setForm((f) => ({ ...f, certified_signed_by: e.target.value }))} className="input-field" placeholder="Full name of signatory" />
                                    </div>
                                )}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="field-group">
                                        <label className="label">Date</label>
                                        <input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} className="input-field" />
                                    </div>
                                    <div className="field-group">
                                        <label className="label">Upload File</label>
                                        <input type="file" onChange={(e) => setForm((f) => ({ ...f, file: e.target.files[0] }))} className="input-field py-1.5 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:bg-emerald-600 file:text-white file:text-[10px] file:font-bold file:uppercase cursor-pointer" accept=".pdf,image/*,.doc,.docx,.xls,.xlsx" />
                                    </div>
                                </div>
                            </div>
                        )}

                        {selectedDoc?.subDoc === 'Market Scopping' && (
                            <div className="space-y-4">
                                <div className="field-group">
                                    <label className="label">Title</label>
                                    <textarea value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} className="input-field min-h-[5rem] resize-none py-3" placeholder="Enter market scoping title..." />
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="field-group">
                                        <label className="label">Budget</label>
                                        <div className="relative group">
                                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400 font-bold text-sm">₱</div>
                                            <input type="text" inputMode="decimal" value={form.market_budget} onChange={(e) => setForm((f) => ({ ...f, market_budget: toNumbersOnly(e.target.value) }))} className="input-field pl-8 text-right font-mono" placeholder="0.00" />
                                        </div>
                                    </div>
                                    <div className="field-group">
                                        <label className="label">Expected Delivery</label>
                                        <input type="text" value={form.market_expected_delivery} onChange={(e) => setForm((f) => ({ ...f, market_expected_delivery: e.target.value }))} className="input-field" placeholder="MM/YY" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="field-group">
                                        <label className="label">Period From</label>
                                        <input type="text" value={form.market_period_from} onChange={(e) => setForm((f) => ({ ...f, market_period_from: e.target.value }))} className="input-field" placeholder="MM/YY" />
                                    </div>
                                    <div className="field-group">
                                        <label className="label">Period To</label>
                                        <input type="text" value={form.market_period_to} onChange={(e) => setForm((f) => ({ ...f, market_period_to: e.target.value }))} className="input-field" placeholder="MM/YY" />
                                    </div>
                                </div>
                                <div className="field-group">
                                    <label className="label">Service Providers (all 3 required)</label>
                                    <div className="grid grid-cols-1 gap-2">
                                        {[1, 2, 3].map((i) => (
                                            <input key={i} type="text" value={form[`market_service_provider_${i}`]} onChange={(e) => setForm((f) => ({ ...f, [`market_service_provider_${i}`]: e.target.value }))} className="input-field" placeholder={`Service Provider ${i}`} />
                                        ))}
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                                    <div className="field-group">
                                        <label className="label">Date</label>
                                        <input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} className="input-field" />
                                    </div>
                                    <div className="field-group">
                                        <label className="label">Upload File</label>
                                        <input type="file" onChange={(e) => setForm((f) => ({ ...f, file: e.target.files[0] }))} className="input-field py-1.5 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:bg-emerald-600 file:text-white file:text-[10px] file:font-bold file:uppercase cursor-pointer" accept=".pdf,image/*,.doc,.docx,.xls,.xlsx" />
                                    </div>
                                </div>
                            </div>
                        )}

                        {selectedDoc?.subDoc === 'Requisition and Issue Slip' && (
                            <div className="space-y-4">
                                <div className="field-group">
                                    <label className="label">Purpose</label>
                                    <textarea value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} className="input-field min-h-[5rem] resize-none py-3" placeholder="Purpose of the requisition" />
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="field-group">
                                        <label className="label">Office/Division</label>
                                        <input type="text" value={form.office_division} onChange={(e) => setForm((f) => ({ ...f, office_division: e.target.value }))} className="input-field" placeholder="Office or division" />
                                    </div>
                                    <div className="field-group">
                                        <label className="label">Received By</label>
                                        <input type="text" value={form.received_by} onChange={(e) => setForm((f) => ({ ...f, received_by: e.target.value }))} className="input-field" placeholder="Name of recipient" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="field-group">
                                        <label className="label">Date</label>
                                        <input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} className="input-field" />
                                    </div>
                                    <div className="field-group">
                                        <label className="label">Upload File</label>
                                        <input type="file" onChange={(e) => setForm((f) => ({ ...f, file: e.target.files[0] }))} className="input-field py-1.5 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:bg-emerald-600 file:text-white file:text-[10px] file:font-bold file:uppercase cursor-pointer" accept=".pdf,image/*,.doc,.docx,.xls,.xlsx" />
                                    </div>
                                </div>
                            </div>
                        )}

                        {selectedDoc?.subDoc === 'Notice of BAC Meeting' && (
                            <div className="space-y-4">
                                <div className="field-group">
                                    <label className="label">Agenda</label>
                                    <textarea value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} className="input-field min-h-[5rem] resize-none py-3" placeholder="Agenda of the BAC meeting" />
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="field-group">
                                        <label className="label">Date</label>
                                        <input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} className="input-field" />
                                    </div>
                                    <div className="field-group">
                                        <label className="label">Upload File</label>
                                        <input type="file" onChange={(e) => setForm((f) => ({ ...f, file: e.target.files[0] }))} className="input-field py-1.5 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:bg-emerald-600 file:text-white file:text-[10px] file:font-bold file:uppercase cursor-pointer" accept=".pdf,image/*,.doc,.docx,.xls,.xlsx" />
                                    </div>
                                </div>
                            </div>
                        )}

                        {selectedDoc?.subDoc === 'Invitation to COA' && (
                            <div className="space-y-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="field-group">
                                        <label className="label">Date</label>
                                        <input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} className="input-field" />
                                    </div>
                                    <div className="field-group">
                                        <label className="label">Date Received</label>
                                        <input type="date" value={form.date_received} onChange={(e) => setForm((f) => ({ ...f, date_received: e.target.value }))} className="input-field" />
                                    </div>
                                </div>
                                <div className="field-group">
                                    <label className="label">Upload File</label>
                                    <input type="file" onChange={(e) => setForm((f) => ({ ...f, file: e.target.files[0] }))} className="input-field py-1.5 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:bg-emerald-600 file:text-white file:text-[10px] file:font-bold file:uppercase cursor-pointer" accept=".pdf,image/*,.doc,.docx,.xls,.xlsx" />
                                </div>
                            </div>
                        )}

                        {selectedDoc?.subDoc === 'Attendance Sheet' && (
                            <div className="space-y-6">
                                <div className="field-group">
                                    <label className="label">Agenda</label>
                                    <textarea value={form.title || form.agenda} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} className="input-field min-h-[5rem] resize-none py-3" placeholder="Agenda of the meeting" />
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="field-group">
                                        <label className="label">Date</label>
                                        <input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} className="input-field" />
                                    </div>
                                    <div className="field-group">
                                        <label className="label">Upload File</label>
                                        <input type="file" onChange={(e) => setForm((f) => ({ ...f, file: e.target.files[0] }))} className="input-field py-1.5 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:bg-emerald-600 file:text-white file:text-[10px] file:font-bold file:uppercase cursor-pointer" accept=".pdf,image/*,.doc,.docx,.xls,.xlsx" />
                                    </div>
                                </div>
                                <div className="field-group">
                                    <label className="label">BAC Members Attendance</label>
                                    <div className="grid grid-cols-1 gap-3 max-h-[400px] overflow-y-auto p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800 custom-scrollbar">
                                        {attendanceMembers.map((m) => (
                                            <div key={m.id} className="flex items-center gap-2 p-3 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700/50 group animate-in slide-in-from-left-2 duration-300">
                                                <input type="text" value={m.name} onChange={(e) => setAttendanceMembers((prev) => prev.map((x) => (x.id === m.id ? { ...x, name: e.target.value } : x)))} className="input-field flex-1 !h-10 !text-xs font-bold" placeholder="Member name" />
                                                <div className="flex items-center gap-1.5 shrink-0 px-1">
                                                    <input type="checkbox" checked={m.present} onChange={(e) => setAttendanceMembers((prev) => prev.map((x) => (x.id === m.id ? { ...x, present: e.target.checked } : x)))} className="w-6 h-6 rounded-lg border-slate-200 text-emerald-600 focus:ring-emerald-500 transition-colors cursor-pointer" />
                                                    <button 
                                                        type="button" 
                                                        onClick={() => setAttendanceMembers((prev) => prev.filter((x) => x.id !== m.id))} 
                                                        className="w-10 h-10 flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-all active:scale-90"
                                                    >
                                                        <MdClose className="w-5 h-5" />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                        <button 
                                            type="button" 
                                            onClick={() => setAttendanceMembers((prev) => [...prev, { id: Date.now(), name: '', present: true }])} 
                                            className="w-full h-11 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-[10px] font-bold text-slate-400 hover:border-emerald-500 hover:text-emerald-600 hover:bg-emerald-50/10 transition-all flex items-center justify-center gap-2 group active:scale-[0.99]"
                                        >
                                            <MdAdd className="w-4 h-4 transition-transform group-hover:rotate-90" /> 
                                            ADD ATTENDANCE RECORD
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {selectedDoc?.subDoc === 'Minutes of the Meeting' && (
                            <div className="space-y-4">
                                <div className="field-group">
                                    <label className="label">Agenda/Others</label>
                                    <textarea value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} className="input-field min-h-[5rem] resize-none py-3" placeholder="Agenda or other details" />
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="field-group">
                                        <label className="label">Date</label>
                                        <input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} className="input-field" />
                                    </div>
                                    <div className="field-group">
                                        <label className="label">Upload File</label>
                                        <input type="file" onChange={(e) => setForm((f) => ({ ...f, file: e.target.files[0] }))} className="input-field py-1.5 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:bg-emerald-600 file:text-white file:text-[10px] file:font-bold file:uppercase cursor-pointer" accept=".pdf,image/*,.doc,.docx,.xls,.xlsx" />
                                    </div>
                                </div>
                            </div>
                        )}

                        {selectedDoc?.subDoc === 'BAC Resolution' && (
                            <div className="space-y-4">
                                <div className="field-group">
                                    <label className="label">Title</label>
                                    <textarea value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} className="input-field min-h-[5rem] resize-none py-3" placeholder="Enter resolution title..." />
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="field-group">
                                        <label className="label">Resolution No.</label>
                                        <input type="text" value={form.resolution_no} onChange={(e) => setForm((f) => ({ ...f, resolution_no: toNumbersOnly(e.target.value) }))} className="input-field" placeholder="Resolution number" />
                                    </div>
                                    <div className="field-group">
                                        <label className="label">Winning Bidder</label>
                                        <input type="text" value={form.winning_bidder} onChange={(e) => setForm((f) => ({ ...f, winning_bidder: e.target.value }))} className="input-field" placeholder="Company name" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="field-group">
                                        <label className="label">Total Amount</label>
                                        <div className="relative group">
                                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400 font-bold text-sm">₱</div>
                                            <input type="text" inputMode="decimal" value={form.total_amount} onChange={(e) => setForm((f) => ({ ...f, total_amount: toNumbersOnly(e.target.value) }))} className="input-field pl-8 text-right font-mono" placeholder="0.00" />
                                        </div>
                                    </div>
                                    <div className="field-group">
                                        <label className="label">Resolution Option</label>
                                        <select value={form.resolution_option} onChange={(e) => setForm((f) => ({ ...f, resolution_option: e.target.value }))} className="input-field font-bold">
                                            <option value="">Select</option>
                                            {['LCB', 'LCRB', 'SCB', 'SCRB'].map((o) => <option key={o} value={o}>{o}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="field-group">
                                        <label className="label">Office/Division</label>
                                        <input type="text" value={form.office_division} onChange={(e) => setForm((f) => ({ ...f, office_division: e.target.value }))} className="input-field" placeholder="Office or division" />
                                    </div>
                                    <div className="field-group">
                                        <label className="label">Date of Adoption</label>
                                        <input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} className="input-field" />
                                    </div>
                                </div>
                                <div className="field-group">
                                    <label className="label">Venue</label>
                                    <input type="text" value={form.venue} onChange={(e) => setForm((f) => ({ ...f, venue: e.target.value }))} className="input-field" placeholder="Venue" />
                                </div>
                                <div className="field-group">
                                    <label className="label">Upload File</label>
                                    <input type="file" onChange={(e) => setForm((f) => ({ ...f, file: e.target.files[0] }))} className="input-field py-1.5 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:bg-emerald-600 file:text-white file:text-[10px] file:font-bold file:uppercase cursor-pointer" accept=".pdf,image/*,.doc,.docx,.xls,.xlsx" />
                                </div>
                            </div>
                        )}

                        {selectedDoc?.subDoc === 'Abstract of Quotation' && (
                            <div className="space-y-6">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="field-group">
                                        <label className="label">AOQ No.</label>
                                        <input type="text" value={form.aoq_no} onChange={(e) => setForm((f) => ({ ...f, aoq_no: toNumbersOnly(e.target.value) }))} className="input-field font-mono" placeholder="AOQ number" />
                                    </div>
                                    <div className="field-group">
                                        <label className="label">Date</label>
                                        <input type="date" value={form.aoq_date || ''} onChange={(e) => setForm((f) => ({ ...f, aoq_date: e.target.value }))} className="input-field" />
                                    </div>
                                </div>
                                <div className="field-group">
                                    <label className="label">Purpose</label>
                                    <textarea value={form.aoq_purpose || ''} onChange={(e) => setForm((f) => ({ ...f, aoq_purpose: e.target.value }))} className="input-field min-h-[5rem] resize-none py-3" placeholder="Enter AOQ purpose..." />
                                </div>
                                <div className="field-group">
                                    <label className="label">Upload File</label>
                                    <input type="file" onChange={(e) => setForm((f) => ({ ...f, file: e.target.files[0] }))} className="input-field py-1.5 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:bg-emerald-600 file:text-white file:text-[10px] file:font-bold file:uppercase cursor-pointer" accept=".pdf,image/*,.doc,.docx,.xls,.xlsx" />
                                </div>
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between px-1">
                                        <label className="label">Bidder Quotations (min. 3 required)</label>
                                    </div>
                                    <div className="grid grid-cols-1 gap-4">
                                        {abstractBidders.map((b) => (
                                            <div key={b.id} className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm relative group animate-in zoom-in-95 duration-300">
                                                <button 
                                                    type="button" 
                                                    onClick={() => setAbstractBidders((prev) => prev.filter((x) => x.id !== b.id))} 
                                                    className="absolute top-3 right-3 w-10 h-10 flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-all active:scale-90 md:opacity-0 md:group-hover:opacity-100"
                                                >
                                                    <MdDelete className="w-5 h-5" />
                                                </button>
                                                <div className="space-y-4">
                                                    <div className="field-group">
                                                        <label className="label !text-[9px]">Bidder Name</label>
                                                        <input type="text" value={b.name} onChange={(e) => setAbstractBidders((prev) => prev.map((x) => (x.id === b.id ? { ...x, name: e.target.value } : x)))} className="input-field" placeholder="Enter company name" />
                                                    </div>
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                        <div className="field-group">
                                                            <label className="label !text-[9px]">Bid Amount</label>
                                                            <div className="relative">
                                                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">₱</span>
                                                                <input type="text" inputMode="decimal" value={b.amount} onChange={(e) => setAbstractBidders((prev) => prev.map((x) => (x.id === b.id ? { ...x, amount: toNumbersOnly(e.target.value) } : x)))} className="input-field pl-8 text-right font-mono" placeholder="0.00" />
                                                            </div>
                                                        </div>
                                                        <div className="field-group">
                                                            <label className="label !text-[9px]">Remarks</label>
                                                            <input type="text" value={b.remarks} onChange={(e) => setAbstractBidders((prev) => prev.map((x) => (x.id === b.id ? { ...x, remarks: e.target.value } : x)))} className="input-field" placeholder="e.g. Compliant" />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <button 
                                        type="button" 
                                        onClick={() => setAbstractBidders((prev) => [...prev, { id: Date.now(), name: '', amount: '', remarks: '' }])} 
                                        className="w-full h-11 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-[10px] font-bold text-slate-400 hover:border-emerald-500 hover:text-emerald-600 hover:bg-emerald-50/10 transition-all flex items-center justify-center gap-2 group active:scale-[0.99]"
                                    >
                                        <MdAdd className="w-5 h-5 transition-transform group-hover:rotate-90" /> 
                                        ADD NEW BIDDER RECORD
                                    </button>
                                </div>
                            </div>
                        )}

                        {selectedDoc?.subDoc === 'Notice of Award' && (
                            <div className="space-y-4">
                                <div className="field-group">
                                    <label className="label">Title/Agenda</label>
                                    <textarea value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} className="input-field min-h-[5rem] resize-none py-3" placeholder="Notice of Award title" />
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="field-group">
                                        <label className="label">Winning Bidder</label>
                                        <input type="text" value={form.winning_bidder} onChange={(e) => setForm((f) => ({ ...f, winning_bidder: e.target.value }))} className="input-field" placeholder="Name of winning bidder" />
                                    </div>
                                    <div className="field-group">
                                        <label className="label">Date</label>
                                        <input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} className="input-field" />
                                    </div>
                                </div>
                                <div className="field-group">
                                    <label className="label">Upload File</label>
                                    <input type="file" onChange={(e) => setForm((f) => ({ ...f, file: e.target.files[0] }))} className="input-field py-1.5 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:bg-emerald-600 file:text-white file:text-[10px] file:font-bold file:uppercase cursor-pointer" accept=".pdf,image/*,.doc,.docx,.xls,.xlsx" />
                                </div>
                            </div>
                        )}

                        {selectedDoc?.subDoc === 'Contract Services/Purchase Order' && (
                            <div className="space-y-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="field-group">
                                        <label className="label">Contract Amount</label>
                                        <div className="relative group">
                                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400 font-bold text-sm">₱</div>
                                            <input type="text" inputMode="decimal" value={form.contract_amount} onChange={(e) => setForm((f) => ({ ...f, contract_amount: toNumbersOnly(e.target.value) }))} className="input-field pl-8 text-right font-mono" placeholder="0.00" />
                                        </div>
                                    </div>
                                    <div className="field-group">
                                        <label className="label">Received by COA</label>
                                        <select value={form.contract_received_by_coa === true ? 'yes' : form.contract_received_by_coa === false ? 'no' : ''} onChange={(e) => { const v = e.target.value; setForm((f) => ({ ...f, contract_received_by_coa: v === 'yes' ? true : v === 'no' ? false : null })); }} className="input-field font-bold">
                                            <option value="">Select</option>
                                            <option value="yes">Yes</option>
                                            <option value="no">No</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="field-group">
                                        <label className="label">Notarized (place)</label>
                                        <input type="text" value={form.notarized_place} onChange={(e) => setForm((f) => ({ ...f, notarized_place: e.target.value }))} className="input-field" placeholder="Place of notarization" />
                                    </div>
                                    <div className="field-group">
                                        <label className="label">Notarized (date)</label>
                                        <input type="date" value={form.notarized_date} onChange={(e) => setForm((f) => ({ ...f, notarized_date: e.target.value }))} className="input-field" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="field-group">
                                        <label className="label">Date</label>
                                        <input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} className="input-field" />
                                    </div>
                                    <div className="field-group">
                                        <label className="label">Upload File</label>
                                        <input type="file" onChange={(e) => setForm((f) => ({ ...f, file: e.target.files[0] }))} className="input-field py-1.5 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:bg-emerald-600 file:text-white file:text-[10px] file:font-bold file:uppercase cursor-pointer" accept=".pdf,image/*,.doc,.docx,.xls,.xlsx" />
                                    </div>
                                </div>
                            </div>
                        )}

                        {selectedDoc?.subDoc === 'Notice to Proceed' && (
                            <div className="space-y-4">
                                <div className="field-group">
                                    <label className="label">Service Provider</label>
                                    <input type="text" value={form.ntp_service_provider} onChange={(e) => setForm((f) => ({ ...f, ntp_service_provider: e.target.value }))} className="input-field" placeholder="Service provider name" />
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="field-group">
                                        <label className="label">Authorized Representative/Owner</label>
                                        <input type="text" value={form.ntp_authorized_rep} onChange={(e) => setForm((f) => ({ ...f, ntp_authorized_rep: e.target.value }))} className="input-field" placeholder="Authorized representative or owner" />
                                    </div>
                                    <div className="field-group">
                                        <label className="label">Received By</label>
                                        <input type="text" value={form.ntp_received_by} onChange={(e) => setForm((f) => ({ ...f, ntp_received_by: e.target.value }))} className="input-field" placeholder="Received by" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="field-group">
                                        <label className="label">Date</label>
                                        <input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} className="input-field" />
                                    </div>
                                    <div className="field-group">
                                        <label className="label">Upload File</label>
                                        <input type="file" onChange={(e) => setForm((f) => ({ ...f, file: e.target.files[0] }))} className="input-field py-1.5 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:bg-emerald-600 file:text-white file:text-[10px] file:font-bold file:uppercase cursor-pointer" accept=".pdf,image/*,.doc,.docx,.xls,.xlsx" />
                                    </div>
                                </div>
                            </div>
                        )}

                        {(selectedDoc?.subDoc === 'OSS' || selectedDoc?.subDoc === "Applicable: Secretary's Certificate and Special Power of Attorney") && (
                            <div className="space-y-4">
                                <div className="field-group">
                                    <label className="label">Service Provider</label>
                                    <input 
                                        type="text" 
                                        value={selectedDoc?.subDoc === 'OSS' ? form.oss_service_provider : form.secretary_service_provider} 
                                        onChange={(e) => {
                                            const field = selectedDoc?.subDoc === 'OSS' ? 'oss_service_provider' : 'secretary_service_provider';
                                            setForm((f) => ({ ...f, [field]: e.target.value }));
                                        }} 
                                        className="input-field" 
                                        placeholder="Service provider name" 
                                    />
                                </div>
                                <div className="field-group">
                                    <label className="label">Owner/Authorized Rep</label>
                                    <input 
                                        type="text" 
                                        value={selectedDoc?.subDoc === 'OSS' ? form.oss_authorized_rep : form.secretary_owner_rep} 
                                        onChange={(e) => {
                                            const field = selectedDoc?.subDoc === 'OSS' ? 'oss_authorized_rep' : 'secretary_owner_rep';
                                            setForm((f) => ({ ...f, [field]: e.target.value }));
                                        }} 
                                        className="input-field" 
                                        placeholder="Name" 
                                    />
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="field-group">
                                        <label className="label">Date</label>
                                        <input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} className="input-field" />
                                    </div>
                                    <div className="field-group">
                                        <label className="label">Upload File</label>
                                        <input type="file" onChange={(e) => setForm((f) => ({ ...f, file: e.target.files[0] }))} className="input-field py-1.5 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:bg-emerald-600 file:text-white file:text-[10px] file:font-bold file:uppercase cursor-pointer" accept=".pdf,image/*,.doc,.docx,.xls,.xlsx" />
                                    </div>
                                </div>
                            </div>
                        )}

                        {['PhilGEPS Posting of Award', 'Certificate of DILG R1 Website Posting of Award'].includes(selectedDoc?.subDoc) && (
                            <div className="space-y-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="field-group">
                                        <label className="label">Posting Date</label>
                                        <input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} className="input-field" />
                                    </div>
                                    <div className="field-group">
                                        <label className="label">Upload File</label>
                                        <input type="file" onChange={(e) => setForm((f) => ({ ...f, file: e.target.files[0] }))} className="input-field py-1.5 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:bg-emerald-600 file:text-white file:text-[10px] file:font-bold file:uppercase cursor-pointer" accept=".pdf,image/*,.doc,.docx,.xls,.xlsx" />
                                    </div>
                                </div>
                            </div>
                        )}

                        {(selectedDoc?.subDoc?.includes('(Posted)') || selectedDoc?.subDoc === 'Lease of Venue: Table Rating Factor') && (
                            <div className="space-y-4">
                                {selectedDoc?.subDoc?.includes('(Posted)') && (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="field-group">
                                            <label className="label">Posting Date</label>
                                            <input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} className="input-field" />
                                        </div>
                                        <div className="field-group">
                                            <label className="label">Upload File</label>
                                            <input type="file" onChange={(e) => setForm((f) => ({ ...f, file: e.target.files[0] }))} className="input-field py-1.5 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:bg-emerald-600 file:text-white file:text-[10px] file:font-bold file:uppercase cursor-pointer" accept=".pdf,image/*,.doc,.docx,.xls,.xlsx" />
                                        </div>
                                    </div>
                                )}
                                <div className="p-6 bg-blue-50 dark:bg-blue-500/5 rounded-2xl border border-blue-100 dark:border-blue-500/20 flex items-start gap-4">
                                    <div className="p-3 bg-white dark:bg-slate-900 rounded-xl shadow-sm text-blue-600 shrink-0">
                                        <MdInfo className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-blue-900 dark:text-blue-200 mb-1 uppercase tracking-tight">Status Update</p>
                                        <p className="text-sm text-blue-800 dark:text-blue-300 leading-relaxed">
                                            This document type is primarily for tracking. Click the Update button below to confirm the current status in the system.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>


                    {/* Footer Actions */}
                    <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-100 dark:border-slate-800">
                        <div className="flex items-center gap-3 w-full sm:w-auto order-2 sm:order-1">
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 sm:flex-none h-11 px-8 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-2xl font-bold uppercase tracking-widest text-xs hover:bg-slate-200 dark:hover:bg-slate-700 transition-all active:scale-95"
                            >
                                Cancel
                            </button>
                            {isAdmin && selectedDoc?.file_url && (
                                <button
                                    type="button"
                                    onClick={() => triggerDownload(selectedDoc)}
                                    className="flex-1 sm:flex-none h-11 px-8 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 rounded-2xl border border-emerald-200 dark:border-emerald-500/20 text-xs font-bold uppercase tracking-widest hover:bg-emerald-100 transition-all active:scale-95 flex items-center justify-center gap-2"
                                >
                                    <MdDownload className="w-5 h-5" />
                                    Download
                                </button>
                            )}
                        </div>
                        
                        <button
                            type="submit"
                            disabled={updateSubmitting}
                            className="w-full sm:w-auto order-1 sm:order-2 h-11 px-12 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95"
                        >
                            {updateSubmitting ? (
                                <><div className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" /><span>Saving Changes...</span></>
                            ) : (
                                <><MdCheckCircle className="w-5 h-5" /><span>Update Document</span></>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </Modal>
    );
};

export default UpdateDocumentModal;
