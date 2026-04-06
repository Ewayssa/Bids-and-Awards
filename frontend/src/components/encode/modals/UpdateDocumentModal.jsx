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
            <div className="space-y-4">
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

                <form onSubmit={onSubmit} className="space-y-4">

                    {selectedDoc?.subDoc === 'Purchase Request' ? (
                        <>
                            <div>
                                <label className="label">BAC Folder No.</label>
                                <input
                                    type="text"
                                    readOnly
                                    value={form.prNo}
                                    className="input-field bg-[var(--background-subtle)] cursor-default"
                                    aria-readonly="true"
                                />
                            </div>
                            <div>
                                <label className="label">Purpose</label>
                                <input
                                    type="text"
                                    value={form.title}
                                    onChange={(e) => setForm((f) => ({ ...f, title: toLettersOnly(e.target.value) }))}
                                    className="input-field"
                                    placeholder="Purpose of the purchase request"
                                />
                            </div>
                            <div>
                                <label className="label">PR No.</label>
                                <input
                                    type="text"
                                    value={form.user_pr_no}
                                    onChange={(e) => setForm((f) => ({ ...f, user_pr_no: e.target.value }))}
                                    className="input-field"
                                    placeholder="Enter PR number"
                                />
                            </div>
                            <div>
                                <label className="label">Date</label>
                                <input
                                    type="date"
                                    value={form.date}
                                    onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                                    className="input-field"
                                />
                            </div>
                            <div>
                                <label className="label">Total amount</label>
                                <div className="flex items-center border border-[var(--border)] rounded-[var(--radius-sm)] bg-[var(--surface)] overflow-hidden focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
                                    <span className="pl-4 text-[var(--text)] font-medium" aria-hidden="true">₱</span>
                                    <input
                                        type="text"
                                        inputMode="decimal"
                                        value={form.total_amount}
                                        onChange={(e) => setForm((f) => ({ ...f, total_amount: toNumbersOnly(e.target.value) }))}
                                        className="input-field input-currency border-0 rounded-none focus:ring-0 focus:shadow-none w-full min-w-0"
                                        placeholder="0.00"
                                    />
                                </div>
                            </div>
                        </>
                    ) : selectedDoc?.subDoc === 'Activity Design' ? (
                        <>
                            <div>
                                <label className="label">BAC Folder No.</label>
                                <input
                                    type="text"
                                    readOnly
                                    value={form.prNo}
                                    className="input-field bg-[var(--background-subtle)] cursor-default"
                                    aria-readonly="true"
                                />
                            </div>
                            <div>
                                <label className="label">Title</label>
                                <input
                                    type="text"
                                    value={form.title}
                                    onChange={(e) => setForm((f) => ({ ...f, title: toLettersOnly(e.target.value) }))}
                                    className="input-field"
                                    placeholder="Document title"
                                />
                            </div>
                            <div>
                                <label className="label">PR No.</label>
                                <input
                                    type="text"
                                    value={form.user_pr_no}
                                    onChange={(e) => setForm((f) => ({ ...f, user_pr_no: e.target.value }))}
                                    className="input-field"
                                    placeholder="Enter PR number"
                                />
                            </div>
                            <div>
                                <label className="label">Source of Fund</label>
                                <input
                                    type="text"
                                    value={form.source_of_fund}
                                    onChange={(e) => setForm((f) => ({ ...f, source_of_fund: toLettersOnly(e.target.value) }))}
                                    className="input-field"
                                    placeholder="Source of fund"
                                />
                            </div>
                            <div>
                                <label className="label">Total Amount</label>
                                <div className="flex items-center border border-[var(--border)] rounded-[var(--radius-sm)] bg-[var(--surface)] overflow-hidden focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
                                    <span className="pl-4 text-[var(--text)] font-medium" aria-hidden="true">₱</span>
                                    <input
                                        type="text"
                                        inputMode="decimal"
                                        value={form.total_amount}
                                        onChange={(e) => setForm((f) => ({ ...f, total_amount: toNumbersOnly(e.target.value) }))}
                                        className="input-field input-currency border-0 rounded-none focus:ring-0 focus:shadow-none w-full min-w-0"
                                        placeholder="0.00"
                                    />
                                </div>
                            </div>
                        </>
                    ) : selectedDoc?.subDoc === 'Project Procurement Management Plan/Supplemental PPMP' ? (
                        <>
                            <div>
                                <label className="label">BAC Folder No.</label>
                                <input
                                    type="text"
                                    readOnly
                                    value={form.prNo}
                                    className="input-field bg-[var(--background-subtle)] cursor-default"
                                    aria-readonly="true"
                                />
                            </div>
                            <div>
                                <label className="label">Title</label>
                                <input
                                    type="text"
                                    value={form.title}
                                    onChange={(e) => setForm((f) => ({ ...f, title: toLettersOnly(e.target.value) }))}
                                    className="input-field"
                                    placeholder="Document title"
                                />
                            </div>
                            <div>
                                <label className="label">PPMP No.</label>
                                <input
                                    type="text"
                                    value={form.ppmp_no}
                                    onChange={(e) => setForm((f) => ({ ...f, ppmp_no: toNumbersOnly(e.target.value) }))}
                                    className="input-field"
                                    placeholder="Enter PPMP number"
                                />
                            </div>
                            <div>
                                <label className="label">Source of Fund</label>
                                <input
                                    type="text"
                                    value={form.source_of_fund}
                                    onChange={(e) => setForm((f) => ({ ...f, source_of_fund: toLettersOnly(e.target.value) }))}
                                    className="input-field"
                                    placeholder="Source of fund"
                                />
                            </div>
                            <div>
                                <label className="label">Total Budget</label>
                                <div className="flex items-center border border-[var(--border)] rounded-[var(--radius-sm)] bg-[var(--surface)] overflow-hidden focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
                                    <span className="pl-4 text-[var(--text)] font-medium" aria-hidden="true">₱</span>
                                    <input
                                        type="text"
                                        inputMode="decimal"
                                        value={form.total_amount}
                                        onChange={(e) => setForm((f) => ({ ...f, total_amount: toNumbersOnly(e.target.value) }))}
                                        className="input-field input-currency border-0 rounded-none focus:ring-0 focus:shadow-none w-full min-w-0"
                                        placeholder="0.00"
                                    />
                                </div>
                            </div>
                        </>
                    ) : selectedDoc?.subDoc === 'Annual Procurement Plan' ? (
                        <>
                            <div>
                                <label className="label">Title</label>
                                <input
                                    type="text"
                                    value={form.title}
                                    onChange={(e) => setForm((f) => ({ ...f, title: toLettersOnly(e.target.value) }))}
                                    className="input-field"
                                    placeholder="Document title"
                                />
                            </div>
                            <div>
                                <label className="label">APP Type</label>
                                <select
                                    value={form.app_type}
                                    onChange={(e) => setForm((f) => ({ ...f, app_type: e.target.value }))}
                                    className="input-field"
                                >
                                    <option value="">Select</option>
                                    <option value="Final">Final</option>
                                    <option value="Updated">Updated</option>
                                </select>
                            </div>
                            <div>
                                <label className="label">Certified True Copy?</label>
                                <div className="flex items-center gap-3">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="certified_true_copy_app_update"
                                            checked={form.certified_true_copy === true}
                                            onChange={() => setForm((f) => ({ ...f, certified_true_copy: true }))}
                                            className="rounded border-[var(--border)] text-[var(--primary)] focus:ring-[var(--primary)]"
                                        />
                                        <span className="text-sm text-[var(--text)]">Yes</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="certified_true_copy_app_update"
                                            checked={form.certified_true_copy === false}
                                            onChange={() => setForm((f) => ({ ...f, certified_true_copy: false, certified_signed_by: '' }))}
                                            className="rounded border-[var(--border)] text-[var(--primary)] focus:ring-[var(--primary)]"
                                        />
                                        <span className="text-sm text-[var(--text)]">No</span>
                                    </label>
                                </div>
                                {form.certified_true_copy && (
                                    <div className="mt-2">
                                        <label className="label">Signed by</label>
                                        <input
                                            type="text"
                                            value={form.certified_signed_by}
                                            onChange={(e) => setForm((f) => ({ ...f, certified_signed_by: e.target.value }))}
                                            className="input-field"
                                            placeholder="Name of signatory"
                                        />
                                    </div>
                                )}
                            </div>
                        </>
                    ) : selectedDoc?.subDoc === 'Market Scopping' ? (
                        <>
                            <div>
                                <label className="label">Title</label>
                                <input
                                    type="text"
                                    value={form.title}
                                    onChange={(e) => setForm((f) => ({ ...f, title: toLettersOnly(e.target.value) }))}
                                    className="input-field"
                                    placeholder="Document title"
                                />
                            </div>
                            <div>
                                <label className="label">Budget</label>
                                <div className="flex items-center border border-[var(--border)] rounded-[var(--radius-sm)] bg-[var(--surface)] overflow-hidden focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
                                    <span className="pl-4 text-[var(--text)] font-medium" aria-hidden="true">₱</span>
                                    <input
                                        type="text"
                                        inputMode="decimal"
                                        value={form.market_budget}
                                        onChange={(e) => setForm((f) => ({ ...f, market_budget: toNumbersOnly(e.target.value) }))}
                                        className="input-field input-currency border-0 rounded-none focus:ring-0 focus:shadow-none w-full min-w-0"
                                        placeholder="0.00"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="label">Period of market scoping</label>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="label text-xs">From</label>
                                        <input
                                            type="month"
                                            value={form.market_period_from}
                                            onChange={(e) => setForm((f) => ({ ...f, market_period_from: e.target.value }))}
                                            className="input-field"
                                        />
                                    </div>
                                    <div>
                                        <label className="label text-xs">To</label>
                                        <input
                                            type="month"
                                            value={form.market_period_to}
                                            onChange={(e) => setForm((f) => ({ ...f, market_period_to: e.target.value }))}
                                            className="input-field"
                                        />
                                    </div>
                                </div>
                            </div>
                            <div>
                                <label className="label">Expected Delivery</label>
                                <input
                                    type="month"
                                    value={form.market_expected_delivery}
                                    onChange={(e) => setForm((f) => ({ ...f, market_expected_delivery: e.target.value }))}
                                    className="input-field"
                                />
                            </div>
                            <div>
                                <label className="label">Service Providers (all 3 required)</label>
                                <input
                                    type="text"
                                    value={form.market_service_provider_1}
                                    onChange={(e) => setForm((f) => ({ ...f, market_service_provider_1: toLettersOnly(e.target.value) }))}
                                    className="input-field"
                                    placeholder="Service Provider 1"
                                />
                                <input
                                    type="text"
                                    value={form.market_service_provider_2}
                                    onChange={(e) => setForm((f) => ({ ...f, market_service_provider_2: toLettersOnly(e.target.value) }))}
                                    className="input-field mt-2"
                                    placeholder="Service Provider 2"
                                />
                                <input
                                    type="text"
                                    value={form.market_service_provider_3}
                                    onChange={(e) => setForm((f) => ({ ...f, market_service_provider_3: toLettersOnly(e.target.value) }))}
                                    className="input-field mt-2"
                                    placeholder="Service Provider 3"
                                />
                            </div>
                        </>
                    ) : selectedDoc?.subDoc === 'Requisition and Issue Slip' ? (
                        <>
                            <div>
                                <label className="label">BAC Folder No.</label>
                                <input
                                    type="text"
                                    readOnly
                                    value={form.prNo}
                                    className="input-field bg-[var(--background-subtle)] cursor-default"
                                    aria-readonly="true"
                                />
                            </div>
                            <div>
                                <label className="label">Purpose</label>
                                <input
                                    type="text"
                                    value={form.title}
                                    onChange={(e) => setForm((f) => ({ ...f, title: toLettersOnly(e.target.value) }))}
                                    className="input-field"
                                    placeholder="Purpose of the requisition"
                                />
                            </div>
                            <div>
                                <label className="label">Office/Division</label>
                                <input
                                    type="text"
                                    value={form.office_division}
                                    onChange={(e) => setForm((f) => ({ ...f, office_division: toLettersOnly(e.target.value) }))}
                                    className="input-field"
                                    placeholder="Office or division"
                                />
                            </div>
                            <div>
                                <label className="label">Received By</label>
                                <input
                                    type="text"
                                    value={form.received_by}
                                    onChange={(e) => setForm((f) => ({ ...f, received_by: toLettersOnly(e.target.value) }))}
                                    className="input-field"
                                    placeholder="Name of recipient"
                                />
                            </div>
                            <div>
                                <label className="label">Date</label>
                                <input
                                    type="date"
                                    value={form.date}
                                    onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                                    className="input-field"
                                />
                            </div>
                        </>
                    ) : selectedDoc?.subDoc === 'Notice of BAC Meeting' ? (
                        <>
                            <div>
                                <label className="label">Agenda</label>
                                <input
                                    type="text"
                                    value={form.title}
                                    onChange={(e) => setForm((f) => ({ ...f, title: toLettersOnly(e.target.value) }))}
                                    className="input-field"
                                    placeholder="Agenda of the BAC meeting"
                                />
                            </div>
                            <div>
                                <label className="label">Date</label>
                                <input
                                    type="date"
                                    value={form.date}
                                    onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                                    className="input-field"
                                />
                            </div>
                        </>
                    ) : selectedDoc?.subDoc === 'Invitation to COA' ? (
                        <>
                            <div>
                                <label className="label">Date</label>
                                <input
                                    type="date"
                                    value={form.date}
                                    onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                                    className="input-field"
                                />
                            </div>
                            <div>
                                <label className="label">Date received</label>
                                <input
                                    type="date"
                                    value={form.date_received}
                                    onChange={(e) => setForm((f) => ({ ...f, date_received: e.target.value }))}
                                    className="input-field"
                                />
                            </div>
                        </>
                    ) : selectedDoc?.subDoc === 'Attendance Sheet' ? (
                        <>
                            <div>
                                <label className="label">Agenda</label>
                                <input
                                    type="text"
                                    value={form.title}
                                    onChange={(e) => setForm((f) => ({ ...f, title: toLettersOnly(e.target.value) }))}
                                    className="input-field"
                                    placeholder="Agenda"
                                />
                            </div>
                            <div>
                                <label className="label">Date</label>
                                <input
                                    type="date"
                                    value={form.date}
                                    onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                                    className="input-field"
                                />
                            </div>
                            <div>
                                <label className="label">List of BAC Members</label>
                                <p className="text-xs text-[var(--text-muted)] mb-2">Present = checked, Absent = unchecked.</p>
                                {attendanceMembers.map((m) => (
                                    <div key={m.id} className="flex items-center gap-3 mb-2">
                                        <input
                                            type="text"
                                            value={m.name}
                                            onChange={(e) => setAttendanceMembers((prev) => prev.map((x) => (x.id === m.id ? { ...x, name: e.target.value } : x)))}
                                            className="input-field flex-1 min-w-0"
                                            placeholder="Member name"
                                        />
                                        <label className="flex items-center gap-2 shrink-0 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={m.present}
                                                onChange={(e) => setAttendanceMembers((prev) => prev.map((x) => (x.id === m.id ? { ...x, present: e.target.checked } : x)))}
                                                className="rounded border-[var(--border)] text-[var(--primary)] focus:ring-[var(--primary)]"
                                            />
                                            <span className="text-sm text-[var(--text)]">Present</span>
                                        </label>
                                        <button
                                            type="button"
                                            onClick={() => setAttendanceMembers((prev) => prev.filter((x) => x.id !== m.id))}
                                            className="p-2 text-[var(--text-muted)] hover:text-red-600 hover:bg-red-50 rounded"
                                            aria-label="Remove member"
                                        >
                                            <MdClose className="w-5 h-5" />
                                        </button>
                                    </div>
                                ))}
                                <button
                                    type="button"
                                    onClick={() => setAttendanceMembers((prev) => [...prev, { id: Date.now(), name: '', present: true }])}
                                    className="text-sm text-[var(--primary)] hover:underline font-medium"
                                >
                                    + Add BAC member
                                </button>
                            </div>
                        </>
                    ) : selectedDoc?.subDoc === 'Minutes of the Meeting' ? (
                        <>
                            <div>
                                <label className="label">Agenda/Others</label>
                                <input
                                    type="text"
                                    value={form.title}
                                    onChange={(e) => setForm((f) => ({ ...f, title: toLettersOnly(e.target.value) }))}
                                    className="input-field"
                                    placeholder="Agenda or other details"
                                />
                            </div>
                            <div>
                                <label className="label">Date</label>
                                <input
                                    type="date"
                                    value={form.date}
                                    onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                                    className="input-field"
                                />
                            </div>
                        </>
                    ) : selectedDoc?.subDoc === 'BAC Resolution' ? (
                        <>
                            <div>
                                <label className="label">BAC Folder No.</label>
                                <input type="text" readOnly value={form.prNo} className="input-field bg-[var(--background-subtle)] cursor-default" aria-readonly="true" />
                            </div>
                            <div>
                                <label className="label">Resolution No.</label>
                                <input type="text" value={form.resolution_no} onChange={(e) => setForm((f) => ({ ...f, resolution_no: toNumbersOnly(e.target.value) }))} className="input-field" placeholder="Resolution number" />
                            </div>
                            <div>
                                <label className="label">Title</label>
                                <input type="text" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} className="input-field" placeholder="Title" />
                            </div>
                            <div>
                                <label className="label">Winning Bidder</label>
                                <input type="text" value={form.winning_bidder} onChange={(e) => setForm((f) => ({ ...f, winning_bidder: toLettersOnly(e.target.value) }))} className="input-field" placeholder="Winning bidder name" />
                            </div>
                            <div>
                                <label className="label">Amount</label>
                                <div className="flex items-center border border-[var(--border)] rounded-[var(--radius-sm)] bg-[var(--surface)] overflow-hidden focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
                                    <span className="pl-4 text-[var(--text)] font-medium" aria-hidden="true">₱</span>
                                    <input
                                        type="text"
                                        inputMode="decimal"
                                        value={formatCurrencyValue(form.total_amount)}
                                        onChange={(e) => setForm((f) => ({ ...f, total_amount: toNumbersOnly(e.target.value) }))}
                                        className="input-field input-currency border-0 rounded-none focus:ring-0 focus:shadow-none w-full min-w-0"
                                        placeholder="0.00"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="label">Options</label>
                                <select value={form.resolution_option} onChange={(e) => setForm((f) => ({ ...f, resolution_option: e.target.value }))} className="input-field">
                                    <option value="">Select option</option>
                                    <option value="LCB">LCB</option>
                                    <option value="LCRB">LCRB</option>
                                    <option value="SCB">SCB</option>
                                    <option value="SCRB">SCRB</option>
                                </select>
                            </div>
                            <div>
                                <label className="label">Office/Division</label>
                                <input type="text" value={form.office_division} onChange={(e) => setForm((f) => ({ ...f, office_division: toLettersOnly(e.target.value) }))} className="input-field" placeholder="Office or division" />
                            </div>
                            <div>
                                <label className="label">Date of Adoption</label>
                                <input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} className="input-field" />
                            </div>
                            <div>
                                <label className="label">Venue</label>
                                <input type="text" value={form.venue} onChange={(e) => setForm((f) => ({ ...f, venue: toLettersOnly(e.target.value) }))} className="input-field" placeholder="Venue" />
                            </div>
                        </>
                    ) : selectedDoc?.subDoc === 'Abstract of Quotation' ? (
                        <>
                            <div>
                                <label className="label">BAC Folder No.</label>
                                <input type="text" readOnly value={form.prNo} className="input-field bg-[var(--background-subtle)] cursor-default" aria-readonly="true" />
                            </div>
                            <div>
                                <label className="label">AOQ No.</label>
                                <input
                                    type="text"
                                    value={form.aoq_no}
                                    onChange={(e) => setForm((f) => ({ ...f, aoq_no: toNumbersOnly(e.target.value) }))}
                                    className="input-field"
                                    placeholder="AOQ number"
                                />
                            </div>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-wider">Bidder Details</span>
                                    <button
                                        type="button"
                                        onClick={() => setAbstractBidders((prev) => [...prev, { id: Date.now(), name: '', amount: '', remarks: '' }])}
                                        className="text-xs font-semibold text-[var(--primary)] hover:text-[var(--primary-dark)] flex items-center gap-1 transition-colors"
                                    >
                                        <MdAdd className="w-4 h-4" /> Add Bidder
                                    </button>
                                </div>
                                {abstractBidders.map((b) => (
                                    <div key={b.id} className="p-4 rounded-xl border border-[var(--border-light)] bg-[var(--background-subtle)]/30 space-y-4 relative group">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-semibold text-[var(--text-muted)] uppercase">Bidder information</span>
                                            <button
                                                type="button"
                                                onClick={() => setAbstractBidders((prev) => prev.filter((x) => x.id !== b.id))}
                                                className="p-1.5 text-[var(--text-muted)] hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                                aria-label="Remove bidder"
                                            >
                                                <MdClose className="w-4 h-4" />
                                            </button>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-[11px] font-medium text-[var(--text-muted)] mb-1.5 block uppercase tracking-wider">Name</label>
                                                <input
                                                    type="text"
                                                    value={b.name}
                                                    onChange={(e) => setAbstractBidders((prev) => prev.map((x) => (x.id === b.id ? { ...x, name: toLettersOnly(e.target.value) } : x)))}
                                                    className="input-field py-2 px-3 text-sm focus:ring-2 focus:ring-[var(--primary)]/20 shadow-sm"
                                                    placeholder="Full bidder name"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[11px] font-medium text-[var(--text-muted)] mb-1.5 block uppercase tracking-wider">Amount</label>
                                                <div className="flex items-center border border-[var(--border)] rounded-lg bg-white overflow-hidden py-2 px-3 focus-within:ring-2 focus-within:ring-[var(--primary)]/20 shadow-sm">
                                                    <span className="text-sm text-[var(--text-muted)] font-medium mr-1.5">₱</span>
                                                    <input
                                                        type="text"
                                                        inputMode="decimal"
                                                        value={b.amount}
                                                        onChange={(e) => setAbstractBidders((prev) => prev.map((x) => (x.id === b.id ? { ...x, amount: toNumbersOnly(e.target.value) } : x)))}
                                                        className="border-0 p-0 text-sm focus:ring-0 w-full font-medium"
                                                        placeholder="0.00"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-[11px] font-medium text-[var(--text-muted)] mb-1.5 block uppercase tracking-wider">Remarks</label>
                                            <input
                                                type="text"
                                                value={b.remarks}
                                                onChange={(e) => setAbstractBidders((prev) => prev.map((x) => (x.id === b.id ? { ...x, remarks: e.target.value } : x)))}
                                                className="input-field py-2 px-3 text-sm focus:ring-2 focus:ring-[var(--primary)]/20 shadow-sm"
                                                placeholder="Any specific notes or remarks..."
                                            />
                                        </div>
                                    </div>
                                ))}
                                {abstractBidders.length === 0 && (
                                    <div className="text-center py-8 border-2 border-dashed border-[var(--border-light)] rounded-xl opacity-60">
                                        <p className="text-sm text-[var(--text-muted)]">No bidders added yet. Click "+ Add Bidder" to start.</p>
                                    </div>
                                )}
                            </div>
                        </>
                    ) : selectedDoc?.subDoc === 'Notice of Award' ? (
                        <>
                            <div>
                                <label className="label">BAC Folder No.</label>
                                <input type="text" readOnly value={form.prNo} className="input-field bg-[var(--background-subtle)] cursor-default" aria-readonly="true" />
                            </div>
                            <div>
                                <label className="label">Title/Agenda</label>
                                <input
                                    type="text"
                                    value={form.title}
                                    onChange={(e) => setForm((f) => ({ ...f, title: toLettersOnly(e.target.value) }))}
                                    className="input-field"
                                    placeholder="Notice of Award title"
                                />
                            </div>
                            <div>
                                <label className="label">Winning Bidder</label>
                                <input
                                    type="text"
                                    value={form.winning_bidder}
                                    onChange={(e) => setForm((f) => ({ ...f, winning_bidder: toLettersOnly(e.target.value) }))}
                                    className="input-field"
                                    placeholder="Name of winning bidder"
                                />
                            </div>
                            <div>
                                <label className="label">Date</label>
                                <input
                                    type="date"
                                    value={form.date}
                                    onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                                    className="input-field"
                                />
                            </div>
                        </>
                    ) : selectedDoc?.subDoc === 'Contract Services/Purchase Order' ? (
                        <>
                            <div>
                                <label className="label">BAC Folder No.</label>
                                <input type="text" readOnly value={form.prNo} className="input-field bg-[var(--background-subtle)] cursor-default" aria-readonly="true" />
                            </div>
                            <div>
                                <label className="label">Date</label>
                                <input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} className="input-field" />
                            </div>
                            <div>
                                <label className="label">Received by COA</label>
                                <select value={form.contract_received_by_coa === true ? 'yes' : form.contract_received_by_coa === false ? 'no' : ''} onChange={(e) => { const v = e.target.value; setForm((f) => ({ ...f, contract_received_by_coa: v === 'yes' ? true : v === 'no' ? false : null })); }} className="input-field">
                                    <option value="">Select</option>
                                    <option value="yes">Yes</option>
                                    <option value="no">No</option>
                                </select>
                            </div>
                            <div>
                                <label className="label">Contract Amount</label>
                                <div className="flex items-center border border-[var(--border)] rounded-[var(--radius-sm)] bg-[var(--surface)] overflow-hidden focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
                                    <span className="pl-4 text-[var(--text)] font-medium" aria-hidden="true">₱</span>
                                    <input
                                        type="text"
                                        inputMode="decimal"
                                        value={form.contract_amount}
                                        onChange={(e) => setForm((f) => ({ ...f, contract_amount: toNumbersOnly(e.target.value) }))}
                                        onBlur={() => {
                                            setForm((f) => {
                                                const raw = String(f.contract_amount || '').trim();
                                                if (!raw) return f;
                                                const num = Number(raw);
                                                if (Number.isNaN(num)) return f;
                                                return { ...f, contract_amount: num.toFixed(2) };
                                            });
                                        }}
                                        className="input-field input-currency border-0 rounded-none focus:ring-0 focus:shadow-none w-full min-w-0"
                                        placeholder="0.00"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="label">Notarized (place)</label>
                                <input type="text" value={form.notarized_place} onChange={(e) => setForm((f) => ({ ...f, notarized_place: e.target.value }))} className="input-field" placeholder="Place of notarization" />
                            </div>
                            <div>
                                <label className="label">Notarized (date)</label>
                                <input type="date" value={form.notarized_date} onChange={(e) => setForm((f) => ({ ...f, notarized_date: e.target.value }))} className="input-field" />
                            </div>
                        </>
                    ) : selectedDoc?.subDoc === 'Notice to Proceed' ? (
                        <>
                            <div>
                                <label className="label">BAC Folder No.</label>
                                <input type="text" readOnly value={form.prNo} className="input-field bg-[var(--background-subtle)] cursor-default" aria-readonly="true" />
                            </div>
                            <div>
                                <label className="label">Date</label>
                                <input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} className="input-field" />
                            </div>
                            <div>
                                <label className="label">Service Provider</label>
                                <input type="text" value={form.ntp_service_provider} onChange={(e) => setForm((f) => ({ ...f, ntp_service_provider: toLettersOnly(e.target.value) }))} className="input-field" placeholder="Service provider name" />
                            </div>
                            <div>
                                <label className="label">Authorized Representative/Owner</label>
                                <input type="text" value={form.ntp_authorized_rep} onChange={(e) => setForm((f) => ({ ...f, ntp_authorized_rep: toLettersOnly(e.target.value) }))} className="input-field" placeholder="Authorized representative or owner" />
                            </div>
                            <div>
                                <label className="label">Received By</label>
                                <input type="text" value={form.ntp_received_by} onChange={(e) => setForm((f) => ({ ...f, ntp_received_by: toLettersOnly(e.target.value) }))} className="input-field" placeholder="Received by" />
                            </div>
                        </>
                    ) : selectedDoc?.subDoc === 'OSS' ? (
                        <>
                            <div>
                                <label className="label">BAC Folder No.</label>
                                <input type="text" readOnly value={form.prNo} className="input-field bg-[var(--background-subtle)] cursor-default" aria-readonly="true" />
                            </div>
                            <div>
                                <label className="label">Service Provider</label>
                                <input type="text" value={form.oss_service_provider} onChange={(e) => setForm((f) => ({ ...f, oss_service_provider: toLettersOnly(e.target.value) }))} className="input-field" placeholder="Service provider name" />
                            </div>
                            <div>
                                <label className="label">Authorized Representative/Owner</label>
                                <input type="text" value={form.oss_authorized_rep} onChange={(e) => setForm((f) => ({ ...f, oss_authorized_rep: toLettersOnly(e.target.value) }))} className="input-field" placeholder="Authorized representative or owner" />
                            </div>
                            <div>
                                <label className="label">Date</label>
                                <input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} className="input-field" />
                            </div>
                        </>
                    ) : selectedDoc?.subDoc === "Applicable: Secretary's Certificate and Special Power of Attorney" ? (
                        <>
                            <div>
                                <label className="label">BAC Folder No.</label>
                                <input type="text" readOnly value={form.prNo} className="input-field bg-[var(--background-subtle)] cursor-default" aria-readonly="true" />
                            </div>
                            <div>
                                <label className="label">Service Provider</label>
                                <input type="text" value={form.secretary_service_provider} onChange={(e) => setForm((f) => ({ ...f, secretary_service_provider: toLettersOnly(e.target.value) }))} className="input-field" placeholder="Service provider name" />
                            </div>
                            <div>
                                <label className="label">Owner/Authorized Representative</label>
                                <input type="text" value={form.secretary_owner_rep} onChange={(e) => setForm((f) => ({ ...f, secretary_owner_rep: toLettersOnly(e.target.value) }))} className="input-field" placeholder="Owner or authorized representative" />
                            </div>
                            <div>
                                <label className="label">Date</label>
                                <input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} className="input-field" />
                            </div>
                        </>
                    ) : selectedDoc?.subDoc === 'PhilGEPS Posting of Award' ? (
                        <>
                            <div>
                                <label className="label">BAC Folder No.</label>
                                <input type="text" readOnly value={form.prNo} className="input-field bg-[var(--background-subtle)] cursor-default" aria-readonly="true" />
                            </div>
                            <div>
                                <label className="label">Date</label>
                                <input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} className="input-field" />
                            </div>
                            <div>
                                <label className="label">Upload</label>
                                <input type="file" onChange={(e) => setForm((f) => ({ ...f, file: e.target.files?.[0] ?? null }))} className="input-field py-1.5 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-[#16a34a] file:hover:bg-[#15803d] file:active:bg-[#166534] file:text-white file:font-semibold file:cursor-pointer file:transition-colors file:duration-200 w-full" accept=".pdf,.doc,.docx,.xls,.xlsx" />
                            </div>
                        </>
                    ) : selectedDoc?.subDoc === 'Certificate of DILG R1 Website Posting of Award' ? (
                        <>
                            <div>
                                <label className="label">BAC Folder No.</label>
                                <input type="text" readOnly value={form.prNo} className="input-field bg-[var(--background-subtle)] cursor-default" aria-readonly="true" />
                            </div>
                            <div>
                                <label className="label">Date</label>
                                <input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} className="input-field" />
                            </div>
                            <div>
                                <label className="label">Upload</label>
                                <input type="file" onChange={(e) => setForm((f) => ({ ...f, file: e.target.files?.[0] ?? null }))} className="input-field py-1.5 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-[#16a34a] file:hover:bg-[#15803d] file:active:bg-[#166534] file:text-white file:font-semibold file:cursor-pointer file:transition-colors file:duration-200 w-full" accept=".pdf,.doc,.docx,.xls,.xlsx" />
                            </div>
                        </>
                    ) : selectedDoc?.subDoc === 'Notice of Award (Posted)' || selectedDoc?.subDoc === 'Abstract of Quotation (Posted)' || selectedDoc?.subDoc === 'BAC Resolution (Posted)' ? (
                        <>
                            <div>
                                <label className="label">Date</label>
                                <input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} className="input-field" />
                            </div>
                        </>
                    ) : selectedDoc?.subDoc === 'Lease of Venue: Table Rating Factor' ? (
                        <>
                            <div className="text-sm text-[var(--text-muted)] p-4 bg-green-50 rounded-xl border border-green-100 flex items-start gap-3">
                                <MdInfo className="w-5 h-5 text-green-600 mt-0.5" aria-hidden />
                                <span>
                                    No file is required for Lease of Venue rating factor. Click <span className="font-semibold text-green-700">Update</span> below to save your progress; the document will be marked as complete.
                                </span>
                            </div>
                        </>
                    ) : (
                        <>
                            <div>
                                <label className="label">BAC Folder No.</label>
                                <input
                                    type="text"
                                    readOnly
                                    value={form.prNo}
                                    className="input-field bg-[var(--background-subtle)] cursor-default"
                                    aria-readonly="true"
                                />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="label">Title</label>
                                    <input
                                        type="text"
                                        value={form.title}
                                        onChange={(e) =>
                                            setForm((f) => ({ ...f, title: e.target.value }))
                                        }
                                        className="input-field"
                                        placeholder="Updated document title"
                                    />
                                </div>
                                <div>
                                    <label className="label">Category</label>
                                    <input
                                        type="text"
                                        value={form.category}
                                        onChange={(e) =>
                                            setForm((f) => ({ ...f, category: e.target.value }))
                                        }
                                        className="input-field"
                                        placeholder="Category"
                                    />
                                </div>
                            </div>
                        </>
                    )}

                    {/* Common fields (File and Status) for sub-document types that actually require them */}
                    {selectedDoc?.subDoc !== 'Lease of Venue: Table Rating Factor' &&
                        !selectedDoc?.subDoc.includes('(Posted)') &&
                        selectedDoc?.subDoc !== 'PhilGEPS Posting of Award' &&
                        selectedDoc?.subDoc !== 'Certificate of DILG R1 Website Posting of Award' && (
                        <div>
                            <label className="label">Upload Updated File (optional)</label>
                            <input
                                type="file"
                                onChange={(e) => setForm((f) => ({ ...f, file: e.target.files?.[0] ?? null }))}
                                className="input-field py-1.5 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-[var(--primary)] file:hover:bg-[var(--primary-hover)] file:active:bg-[var(--primary-active)] file:text-white file:font-semibold file:cursor-pointer file:transition-colors file:duration-200 w-full"
                                accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                            />
                        </div>
                    )}

                    {/* Footer Actions */}
                    <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-100 dark:border-slate-800">
                        <div className="flex items-center gap-3 w-full sm:w-auto order-2 sm:order-1">
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 sm:flex-none px-6 py-3 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-2xl font-bold uppercase tracking-widest text-xs hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                            >
                                Cancel
                            </button>
                            {isAdmin && selectedDoc?.file_url && (
                                <button
                                    type="button"
                                    onClick={() => triggerDownload(selectedDoc)}
                                    className="flex-1 sm:flex-none px-8 py-3 bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 rounded-2xl border border-blue-200 dark:border-blue-500/20 text-[10px] font-black uppercase tracking-widest hover:bg-blue-100 transition-all active:scale-95 shadow-sm shadow-blue-500/5"
                                >
                                    Download
                                </button>
                            )}
                        </div>
                        
                        <button
                            type="submit"
                            disabled={updateSubmitting}
                            className="w-full sm:w-auto order-1 sm:order-2 px-10 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {updateSubmitting ? (
                                <><div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" /><span>Saving...</span></>
                            ) : (
                                <><MdCheckCircle className="w-5 h-5" /><span>Update Procurement</span></>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </Modal>
    );
};

export default UpdateDocumentModal;
