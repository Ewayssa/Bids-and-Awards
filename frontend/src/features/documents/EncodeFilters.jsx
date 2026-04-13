import React from 'react';
import { MdSearch, MdClose, MdFilterList } from 'react-icons/md';

const EncodeFilters = ({ 
    searchQuery, 
    setSearchQuery, 
    filterCategory, 
    setFilterCategory, 
    filterStatus, 
    setFilterStatus,
    filterPRNo,
    setFilterPRNo,
    filterDateFrom,
    setFilterDateFrom,
    filterDateTo,
    setFilterDateTo,
    showFilters,
    setShowFilters,
    uniqueCategories,
    uniquePRNos,
    clearFilters,
    hasActiveFilters
}) => {
    return (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                    <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)]" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search by title, folder no, category..."
                        className="input-field pl-10 pr-10 w-full"
                    />
                    {searchQuery && (
                        <button
                            type="button"
                            onClick={() => setSearchQuery('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text)]"
                        >
                            <MdClose className="w-5 h-5" />
                        </button>
                    )}
                </div>
                <button
                    type="button"
                    onClick={() => setShowFilters(!showFilters)}
                    className={`btn-secondary flex items-center gap-2 px-4 ${showFilters ? 'bg-[var(--primary-muted)] text-[var(--primary)] border-[var(--primary)]' : ''}`}
                >
                    <MdFilterList className="w-5 h-5" />
                    <span>Filters</span>
                    {hasActiveFilters && (
                        <span className="flex h-2 w-2 rounded-full bg-[var(--primary)]" />
                    )}
                </button>
            </div>

            {showFilters && (
                <div className="p-4 bg-[var(--background-subtle)]/50 rounded-xl border border-[var(--border-light)] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div>
                        <label className="label">Status</label>
                        <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            className="input-field py-2"
                        >
                            <option value="">All Statuses</option>
                            <option value="pending">Pending</option>
                            <option value="ongoing">Ongoing</option>
                            <option value="complete">Complete</option>
                        </select>
                    </div>
                    <div>
                        <label className="label">Category</label>
                        <select
                            value={filterCategory}
                            onChange={(e) => setFilterCategory(e.target.value)}
                            className="input-field py-2"
                        >
                            <option value="">All Categories</option>
                            {uniqueCategories.map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="label">BAC Folder No.</label>
                        <select
                            value={filterPRNo}
                            onChange={(e) => setFilterPRNo(e.target.value)}
                            className="input-field py-2"
                        >
                            <option value="">All Folder Nos.</option>
                            {uniquePRNos.map(pr => (
                                <option key={pr} value={pr}>{pr}</option>
                            ))}
                        </select>
                    </div>
                    <div className="lg:col-span-1 flex flex-col justify-end gap-2">
                        <button
                            type="button"
                            onClick={clearFilters}
                            className="btn-secondary py-2 text-xs w-full"
                        >
                            Clear All Filters
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EncodeFilters;
