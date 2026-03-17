import { useState, useCallback } from 'react';

/**
 * Custom hook for managing document filter state
 */
export function useDocumentFilters() {
    const [searchQuery, setSearchQuery] = useState('');
    const [filterCategory, setFilterCategory] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [filterPRNo, setFilterPRNo] = useState('');
    const [filterDateFrom, setFilterDateFrom] = useState('');
    const [filterDateTo, setFilterDateTo] = useState('');
    const [sortKey, setSortKey] = useState(''); // '' | 'uploaded_at' | 'updated_at' | 'status' | 'category'
    const [sortDir, setSortDir] = useState('asc'); // 'asc' | 'desc'
    const [showFilters, setShowFilters] = useState(false);

    // Reset all filters
    const resetFilters = useCallback(() => {
        setSearchQuery('');
        setFilterCategory('');
        setFilterStatus('');
        setFilterPRNo('');
        setFilterDateFrom('');
        setFilterDateTo('');
        setSortKey('');
        setSortDir('asc');
    }, []);

    // Check if any filters are active
    const hasActiveFilters = useCallback(() => {
        return !!(searchQuery || filterCategory || filterStatus || filterPRNo || filterDateFrom || filterDateTo);
    }, [searchQuery, filterCategory, filterStatus, filterPRNo, filterDateFrom, filterDateTo]);

    // Toggle sort direction or set new sort key
    const toggleSort = useCallback((key) => {
        if (sortKey === key) {
            setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortKey(key);
            setSortDir('asc');
        }
    }, [sortKey]);

    return {
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
        sortKey,
        setSortKey,
        sortDir,
        setSortDir,
        showFilters,
        setShowFilters,
        resetFilters,
        hasActiveFilters,
        toggleSort
    };
}