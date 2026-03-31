import React from 'react';
import { createPortal } from 'react-dom';
import { MdAdd, MdDownload, MdClose, MdDelete } from 'react-icons/md';
import { REPORT_COLUMNS, HEADER_GROUPS, DATE_MIN, DATE_MAX } from '../reportConstants';
import { toDDMMYYYY, formatNumberAsYouType, sanitizeNumberInput, validateDateRange } from '../reportHelpers';

const EncodeModal = ({
    onClose,
    addRow,
    exportExcel,
    encodedRows,
    updateRow,
    removeRow,
    isFinalized,
    setIsFinalized,
    currentEncoderId
}) => {
    return createPortal(
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm"
            aria-modal="true"
            role="dialog"
            aria-labelledby="encode-report-title"
            onClick={onClose}
        >
            <div
                className="bg-white w-full max-w-[96vw] h-[85vh] max-h-[85vh] flex flex-col rounded-xl shadow-2xl border-2 border-gray-300 overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-4 border-b-2 border-gray-200 shrink-0 bg-gray-50">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <h2 id="encode-report-title" className="text-xl font-bold text-gray-800">Encode Report</h2>
                        <div className="flex items-center justify-between gap-3">
                            <div className="flex flex-wrap items-center gap-2">
                                <button
                                    type="button"
                                    onClick={addRow}
                                    disabled={isFinalized}
                                    className="btn-primary inline-flex items-center gap-1.5 py-2.5 px-4"
                                >
                                    <MdAdd className="w-5 h-5" /> Add row
                                </button>
                                <button
                                    type="button"
                                    onClick={exportExcel}
                                    disabled={encodedRows.length === 0}
                                    className="btn-secondary inline-flex items-center gap-1.5 py-2.5 px-4"
                                >
                                    <MdDownload className="w-5 h-5" /> Export
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setIsFinalized(!isFinalized)}
                                    disabled={encodedRows.length === 0}
                                    className="btn-primary inline-flex items-center justify-center gap-1.5 py-2.5 px-4 w-24"
                                >
                                    {isFinalized ? 'Edit' : 'Save'}
                                </button>
                            </div>
                            <button
                                type="button"
                                onClick={onClose}
                                className="inline-flex h-10 w-10 items-center justify-center text-gray-600 hover:bg-gray-200 rounded-lg border border-gray-300"
                            >
                                <MdClose className="w-6 h-6" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 min-h-0 overflow-auto p-4 bg-[var(--background)]">
                    <div className="bg-[var(--surface)] rounded-lg border border-[var(--border)] shadow-sm" style={{ width: 'max-content', minWidth: '100%' }}>
                        {/* Static Report Header */}
                        <div className="border-b border-[var(--border-light)] px-3 py-2.5 flex items-center justify-between bg-[var(--surface)]">
                            <span className="text-sm font-semibold text-[var(--text)] flex-1">DEPARTMENT OF THE INTERIOR AND LOCAL GOVERNMENT - REGION 1</span>
                            <span className="text-base font-bold text-[var(--text)] shrink-0 px-4">Procurement Monitoring Report</span>
                            <span className="flex-1" />
                        </div>
                        <div className="border-b border-[var(--border-light)] px-3 py-2 bg-[var(--background-subtle)]">
                            <span className="text-sm font-bold text-[var(--text)]">
                                Monitoring Report as of {new Date().toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' }).toUpperCase()}
                            </span>
                        </div>
                        <div className="bg-[var(--primary)] border-b border-[var(--primary-dark)] px-3 py-2">
                            <span className="text-sm font-semibold text-white">COMPLETED PROCUREMENT ACTIVITIES</span>
                        </div>
                        <div className="bg-[var(--background-subtle)] border-b border-[var(--border-light)] h-4" />

                        {/* Excel-like Table */}
                        <table className="border-collapse text-[var(--text)] bg-[var(--surface)]" style={{ minWidth: '2600px', width: '100%' }}>
                            <thead>
                                <tr className="bg-[var(--primary)] border-b border-black/10">
                                    <th rowSpan={2} className="border-r border-white/20 px-2 py-2 text-left text-xs font-bold w-10 text-white align-middle">#</th>
                                    {HEADER_GROUPS.map((grp) =>
                                        grp.colKeys.length === 1 ? (
                                            <th key={grp.colKeys[0]} rowSpan={2} className="border-r border-white/20 px-2 py-2 text-left text-xs font-bold text-white align-middle min-w-[120px]">
                                                {grp.groupLabel}
                                            </th>
                                        ) : (
                                            <th key={grp.colKeys.join('-')} colSpan={grp.colKeys.length} className="border-r border-white/20 px-2 py-2 text-center text-xs font-bold text-white align-middle min-w-[100px]">
                                                {grp.groupLabel}
                                            </th>
                                        )
                                    )}
                                    <th rowSpan={2} className="px-2 py-2 text-center text-xs font-bold w-16 text-white align-middle">Action</th>
                                </tr>
                                <tr className="bg-[var(--primary)] border-b-2 border-black/20">
                                    {HEADER_GROUPS.map((grp) =>
                                        grp.colKeys.length > 1
                                            ? grp.colKeys.map((key) => {
                                                  const col = REPORT_COLUMNS.find((c) => c.key === key);
                                                  return (
                                                      <th key={key} className="border-r border-white/20 px-2 py-1.5 text-left text-xs font-bold text-white min-w-[90px]">
                                                          {col?.shortLabel ?? key}
                                                      </th>
                                                  );
                                              })
                                            : null
                                    )}
                                </tr>
                            </thead>
                            <tbody>
                                {encodedRows.map((row, index) => {
                                    const isOwner = !row.__owner || row.__owner === currentEncoderId;
                                    return (
                                        <tr key={index} className="border-b border-[var(--border-light)] hover:bg-[var(--background-subtle)] transition-colors">
                                            <td className="bg-[var(--surface)] border-r border-[var(--border-light)] px-2 py-1 text-sm font-medium text-[var(--text)] align-top">{index + 1}</td>
                                            {REPORT_COLUMNS.map((col) => {
                                                const val = row[col.key] ?? '';
                                                if (isFinalized) {
                                                    let displayVal = val;
                                                    if (col.type === 'date') displayVal = val ? (toDDMMYYYY(val) || val) : 'N/A';
                                                    if (col.type === 'number') {
                                                        const n = parseFloat(String(val).replace(/[^0-9.]/g, ''));
                                                        displayVal = isNaN(n) ? '' : '₱' + n.toLocaleString('en-PH', { minimumFractionDigits: 2 });
                                                    }
                                                    return (
                                                        <td key={col.key} className="bg-[var(--surface)] border-r border-[var(--border-light)] p-0 align-top">
                                                            <input 
                                                                type="text" 
                                                                disabled 
                                                                value={displayVal || '—'} 
                                                                className={`w-full min-h-[32px] py-1.5 px-2 text-sm bg-transparent border-0 text-[var(--text)] ${col.type === 'number' ? 'text-right' : ''}`}
                                                            />
                                                        </td>
                                                    );
                                                }

                                                return (
                                                    <td key={col.key} className="bg-[var(--surface)] border-r border-[var(--border-light)] p-0 align-top">
                                                        {col.type === 'select' ? (
                                                            <select
                                                                value={String(val)}
                                                                onChange={(e) => updateRow(index, col.key, e.target.value)}
                                                                disabled={!isOwner}
                                                                className="w-full h-full min-h-[32px] py-1.5 px-2 text-sm bg-transparent border-0 focus:ring-2 focus:ring-green-500 disabled:opacity-50"
                                                            >
                                                                <option value="">—</option>
                                                                {col.options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                                            </select>
                                                        ) : (
                                                            <input
                                                                type={col.type === 'date' ? 'date' : 'text'}
                                                                value={col.type === 'number' ? formatNumberAsYouType(val) : String(val)}
                                                                onChange={(e) => {
                                                                    let v = e.target.value;
                                                                    if (col.type === 'number') v = sanitizeNumberInput(v.replace(/[₱,\s]/g, ''));
                                                                    updateRow(index, col.key, v);
                                                                }}
                                                                onBlur={col.type === 'number' ? () => {
                                                                    const n = parseFloat(String(row[col.key]).replace(/[^0-9.]/g, ''));
                                                                    if (!isNaN(n)) updateRow(index, col.key, n.toFixed(2));
                                                                } : undefined}
                                                                min={col.type === 'date' ? DATE_MIN : undefined}
                                                                max={col.type === 'date' ? DATE_MAX : undefined}
                                                                disabled={!isOwner}
                                                                className={`w-full min-h-[32px] py-1.5 px-2 text-sm bg-transparent border-0 focus:ring-2 focus:ring-[var(--primary)] disabled:opacity-50 ${col.type === 'number' ? 'text-right' : ''} ${col.type === 'date' && val && !validateDateRange(val) ? 'bg-red-200' : ''}`}
                                                                placeholder={col.type === 'number' ? '₱0.00' : ''}
                                                            />
                                                        )}
                                                    </td>
                                                );
                                            })}
                                            <td className="bg-[var(--surface)] border-[var(--border-light)] p-0 align-top text-center">
                                                <button
                                                    type="button"
                                                    onClick={() => removeRow(index)}
                                                    disabled={!isOwner || isFinalized}
                                                    className={`p-2 text-red-600 rounded hover:bg-red-100 disabled:opacity-50`}
                                                    title={isOwner ? 'Remove row' : 'Calculated/Other ownership'}
                                                >
                                                    <MdDelete className="w-5 h-5" />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                        {encodedRows.length === 0 && (
                            <div className="py-12 text-center text-[var(--text-muted)] text-base bg-[var(--surface)]">
                                <p className="font-medium">No entries yet.</p>
                                <p className="mt-1">Click "Add row" above to start encoding.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default EncodeModal;
