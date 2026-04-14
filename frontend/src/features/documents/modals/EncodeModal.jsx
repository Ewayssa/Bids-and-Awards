import React from 'react';
import { MdAdd, MdDownload, MdClose, MdDelete, MdTableChart, MdSave, MdEdit, MdAutoGraph } from 'react-icons/md';
import { REPORT_COLUMNS, HEADER_GROUPS, DATE_MIN, DATE_MAX } from '../../../constants/reportConstants';
import { toDDMMYYYY, formatNumberAsYouType, sanitizeNumberInput, validateDateRange } from '../../../utils/reportHelpers';
import Modal from '../../../components/Modal';

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
    return (
        <Modal
            isOpen={true}
            onClose={onClose}
            size="full"
            showCloseButton={true}
            bodyClassName="!p-3 !pt-2"
        >
            <div className="flex flex-col h-full space-y-3">
                {/* Information Banner */}
                <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--primary-muted)]/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4 min-w-0">
                        <div className="p-3 rounded-xl bg-[var(--surface)] border border-[var(--border-light)] text-[var(--primary)] shrink-0 shadow-sm">
                            <MdTableChart className="w-7 h-7" />
                        </div>
                        <div className="min-w-0">
                            <h3 className="text-base font-semibold text-[var(--text)] m-0">Procurement monitoring</h3>
                            <p className="text-xs text-[var(--text-muted)] m-0 mt-0.5">Encode rows, export to Excel, then save when complete.</p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                        <button
                            type="button"
                            onClick={exportExcel}
                            disabled={encodedRows.length === 0}
                            className="btn-secondary inline-flex items-center justify-center gap-2 text-sm py-2 px-4 flex-1 md:flex-none min-w-[8rem]"
                        >
                            <MdDownload className="w-4 h-4" /> Export Excel
                        </button>
                        <button
                            type="button"
                            onClick={addRow}
                            disabled={isFinalized}
                            className="btn-primary inline-flex items-center justify-center gap-2 text-sm py-2 px-4 flex-1 md:flex-none min-w-[8rem]"
                        >
                            <MdAdd className="w-4 h-4" /> Add row
                        </button>
                        <button
                            type="button"
                            onClick={() => setIsFinalized(!isFinalized)}
                            disabled={encodedRows.length === 0}
                            className={`inline-flex items-center justify-center gap-2 text-sm py-2 px-5 flex-1 md:flex-none min-w-[8rem] disabled:opacity-50 ${isFinalized ? 'btn-secondary' : 'btn-primary'}`}
                        >
                            {isFinalized ? <><MdEdit className="w-4 h-4" /> Edit</> : <><MdSave className="w-4 h-4" /> Save</>}
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 min-h-0 overflow-auto px-2 pb-2 pt-0 bg-[var(--background)]">
                    <div className="bg-[var(--surface)] rounded-lg border border-[var(--border)] shadow-sm" style={{ width: 'max-content', minWidth: '100%' }}>
                        {/* Static Report Header */}
                        <div className="border-b border-[var(--border-light)] px-3 py-2 flex items-center justify-between bg-[var(--surface)]">
                            <span className="text-sm font-semibold text-[var(--text)] flex-1">DEPARTMENT OF THE INTERIOR AND LOCAL GOVERNMENT - REGION 1</span>
                            <span className="text-base font-bold text-[var(--text)] shrink-0 px-4">Procurement Monitoring Report</span>
                            <span className="flex-1" />
                        </div>
                        <div className="border-b border-[var(--border-light)] px-3 py-1.5 bg-[var(--background-subtle)]">
                            <span className="text-sm font-bold text-[var(--text)]">
                                Monitoring Report as of {(() => {
                                    const d = new Date();
                                    return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}/${d.getFullYear()}`;
                                })()}
                            </span>
                        </div>
                        <div className="bg-[var(--primary)] border-b border-[var(--primary-dark)] px-3 py-1.5">
                            <span className="text-sm font-semibold text-white">COMPLETED PROCUREMENT ACTIVITIES</span>
                        </div>
                        <div className="bg-[var(--background-subtle)] border-b border-[var(--border-light)] h-3" />

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
                                <p className="mt-1">Click "Add Row" above to start encoding.</p>
                            </div>
                        )}
                </div>
            </div>
        </div>
    </Modal>
);
};

export default EncodeModal;
