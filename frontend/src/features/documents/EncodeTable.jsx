import React from 'react';
import { 
    MdDescription, 
    MdExpandMore, 
    MdExpandLess, 
    MdTimeline, 
    MdVisibility, 
    MdChevronLeft, 
    MdChevronRight 
} from 'react-icons/md';

const EncodeTable = ({ 
    loading, 
    viewMode, 
    paginatedDocuments, 
    paginatedGroupedEntries, 
    tablePage, 
    setTablePage, 
    totalPagesList, 
    totalPagesGrouped, 
    toggleGroup, 
    expandedGroups, 
    openWorkflow, 
    handleView, 
    isAdmin, 
    getStatusColor, 
    getProcurementType, 
    formatDate,
    sortKey,
    handleSort,
    sortDir,
    canUploadDocuments,
    pageHasActiveFilters,
    filterStatus
}) => {
    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-[var(--text-muted)]">
                <div className="w-10 h-10 rounded-full border-2 border-[var(--border)] border-t-[var(--primary)] animate-spin mb-3" aria-hidden />
                <p className="text-sm">Loading documents…</p>
            </div>
        );
    }

    if (paginatedDocuments.length === 0 && paginatedGroupedEntries.length === 0) {
        return (
            <div className="py-12 px-6 text-center">
                <MdDescription className="w-12 h-12 mx-auto text-[var(--text-subtle)] mb-3" />
                <p className="text-[var(--text-muted)] font-medium">No documents match your filters</p>
                <p className="text-sm text-[var(--text-subtle)] mt-1">
                    {pageHasActiveFilters ? 'Try adjusting your search or filters.' : 'Start by creating a new procurement.'}
                </p>
            </div>
        );
    }

    return (
        <div className="min-w-0">
            {viewMode === 'grouped' ? (
                <div className="divide-y divide-[var(--border-light)]">
                    {paginatedGroupedEntries.map(([prNo, docs]) => {
                        const isExpanded = expandedGroups.has(prNo);
                        const statusCounts = docs.reduce((acc, doc) => {
                            acc[doc.status] = (acc[doc.status] || 0) + 1;
                            return acc;
                        }, {});
                        
                        return (
                            <div key={prNo} className="bg-[var(--surface)]">
                                <button
                                    type="button"
                                    onClick={() => toggleGroup(prNo)}
                                    className="w-full px-4 sm:px-6 py-4 flex items-center justify-between hover:bg-[var(--background-subtle)] transition-all text-left"
                                >
                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                        {isExpanded ? <MdExpandLess className="w-5 h-5 flex-shrink-0" /> : <MdExpandMore className="w-5 h-5 flex-shrink-0" />}
                                        <div className="min-w-0 flex-1">
                                            <p className="font-semibold text-[var(--text)]">BAC Folder No.: {prNo}</p>
                                            <p className="text-xs text-[var(--text-muted)] mt-1 flex gap-2">
                                                <span>{docs.length} documents •</span>
                                                {statusCounts.complete > 0 && <span className="status-badge status-badge--complete !scale-90 !py-0">{statusCounts.complete} complete</span>}
                                                {statusCounts.ongoing > 0 && <span className="status-badge status-badge--ongoing !scale-90 !py-0">{statusCounts.ongoing} ongoing</span>}
                                                {statusCounts.pending > 0 && <span className="status-badge status-badge--pending !scale-90 !py-0">{statusCounts.pending} pending</span>}
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); openWorkflow(prNo); }}
                                        className="p-2 text-[var(--primary)] hover:bg-[var(--primary-muted)] rounded-lg transition-colors flex-shrink-0"
                                        title="View workflow"
                                    >
                                        <MdTimeline className="w-5 h-5" />
                                    </button>
                                </button>
                                {isExpanded && (
                                    <div className="px-4 sm:px-6 pb-4 overflow-x-auto">
                                        <table className="min-w-full divide-y divide-[var(--border)]">
                                            <thead className="bg-[var(--background-subtle)]/50">
                                                <tr>
                                                    <th className="table-th text-left">Title</th>
                                                    <th className="table-th text-left">Procurement Type</th>
                                                    <th className="table-th text-center">Date</th>
                                                    <th className="table-th text-center">Status</th>
                                                    {isAdmin && <th className="table-th text-center">Action</th>}
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-[var(--border-light)]">
                                                {docs.map(doc => (
                                                    <tr key={doc.id} className="hover:bg-[var(--background-subtle)]/30 transition-colors">
                                                        <td className="table-td text-left font-medium">{doc.title || '—'}</td>
                                                        <td className="table-td text-left text-xs opacity-75">{getProcurementType(doc)}</td>
                                                        <td className="table-td-muted text-center">{formatDate(doc.date)}</td>
                                                        <td className="table-td text-center">
                                                            <span className={`status-badge ${getStatusColor(doc.status)}`}>
                                                                {doc.status || 'pending'}
                                                            </span>
                                                        </td>
                                                        {isAdmin && (
                                                            <td className="table-td text-center">
                                                                <button 
                                                                    onClick={() => handleView(doc)} 
                                                                    className="btn-action-ghost !text-[10px] !py-1"
                                                                >
                                                                    View
                                                                </button>
                                                            </td>
                                                        )}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-[var(--border)]">
                        <thead className="table-header">
                            <tr>
                                <th className="table-th text-left">Title</th>
                                <th className="table-th text-center">BAC Folder No.</th>
                                <th className="table-th">
                                    <button onClick={() => handleSort('category')} className="uppercase hover:text-[var(--primary)] transition-colors">
                                        Procurement Type {sortKey === 'category' && (sortDir === 'asc' ? ' ↑' : ' ↓')}
                                    </button>
                                </th>
                                <th className="table-th">Uploaded By</th>
                                <th className="table-th text-center">
                                    <button onClick={() => handleSort('uploaded_at')} className="uppercase hover:text-[var(--primary)] transition-colors">
                                        Date Submitted {sortKey === 'uploaded_at' && (sortDir === 'asc' ? ' ↑' : ' ↓')}
                                    </button>
                                </th>
                                <th className="table-th text-center">Status</th>
                                {isAdmin && <th className="table-th text-center">Action</th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border-light)]">
                            {paginatedDocuments.map(doc => (
                                <tr key={doc.id} className="hover:bg-[var(--background-subtle)]/30 transition-colors">
                                    <td className="table-td text-left font-medium">{doc.title || '—'}</td>
                                    <td className="table-td-muted text-center">{doc.prNo || '—'}</td>
                                    <td className="table-td-muted text-xs opacity-75">{getProcurementType(doc)}</td>
                                    <td className="table-td-muted">{doc.uploadedBy || '—'}</td>
                                    <td className="table-td-muted text-center">{formatDate(doc.uploaded_at)}</td>
                                    <td className="table-td text-center">
                                        <span className={`status-badge ${getStatusColor(doc.status)}`}>
                                            {doc.status || 'pending'}
                                        </span>
                                    </td>
                                    {isAdmin && (
                                        <td className="table-td text-center">
                                            <button 
                                                onClick={() => handleView(doc)} 
                                                className="btn-action-ghost !text-[10px] !py-1"
                                            >
                                                View
                                            </button>
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Pagination */}
            {(viewMode === 'grouped' ? totalPagesGrouped : totalPagesList) > 1 && (
                <div className="pagination-nav">
                    <button
                        type="button"
                        onClick={() => setTablePage(p => Math.max(1, p - 1))}
                        disabled={tablePage <= 1}
                        className="pagination-btn"
                        aria-label="Previous page"
                    >
                        <MdChevronLeft className="w-5 h-5" />
                    </button>
                    <span className="pagination-info">
                        Page {tablePage} of {viewMode === 'grouped' ? totalPagesGrouped : totalPagesList}
                    </span>
                    <button
                        type="button"
                        onClick={() => setTablePage(p => Math.min(viewMode === 'grouped' ? totalPagesGrouped : totalPagesList, p + 1))}
                        disabled={tablePage >= (viewMode === 'grouped' ? totalPagesGrouped : totalPagesList)}
                        className="pagination-btn"
                        aria-label="Next page"
                    >
                        <MdChevronRight className="w-5 h-5" />
                    </button>
                </div>
            )}
        </div>
    );
};

export default EncodeTable;
