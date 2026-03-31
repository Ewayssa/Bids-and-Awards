import { useState, useCallback } from 'react';
import { TABLE_PAGE_SIZE } from '../utils/constants';

/**
 * Custom hook for managing document table state: filters, sorting, and pagination.
 */
export function useDocumentTable() {
    // --- Filter & Sort State ---
    const [searchQuery, setSearchQuery] = useState('');
    const [filterCategory, setFilterCategory] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [filterPRNo, setFilterPRNo] = useState('');
    const [filterDateFrom, setFilterDateFrom] = useState('');
    const [filterDateTo, setFilterDateTo] = useState('');
    const [sortKey, setSortKey] = useState('');
    const [sortDir, setSortDir] = useState('asc');
    const [showFilters, setShowFilters] = useState(false);

    // --- Pagination State ---
    const [tablePage, setTablePage] = useState(1);

    // --- Filter Handlers ---

    const resetFilters = useCallback(() => {
        setSearchQuery('');
        setFilterCategory('');
        setFilterStatus('');
        setFilterPRNo('');
        setFilterDateFrom('');
        setFilterDateTo('');
        setSortKey('');
        setSortDir('asc');
        setTablePage(1);
    }, []);

    const hasActiveFilters = useCallback(() => {
        return !!(searchQuery || filterCategory || filterStatus || filterPRNo || filterDateFrom || filterDateTo);
    }, [searchQuery, filterCategory, filterStatus, filterPRNo, filterDateFrom, filterDateTo]);

    const toggleSort = useCallback((key) => {
        if (sortKey === key) {
            setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortKey(key);
            setSortDir('asc');
        }
    }, [sortKey]);

    // --- Pagination Handlers ---

    const resetPage = useCallback(() => {
        setTablePage(1);
    }, []);

    const getPaginatedDocuments = useCallback((documents) => {
        const startIndex = (tablePage - 1) * TABLE_PAGE_SIZE;
        const endIndex = startIndex + TABLE_PAGE_SIZE;
        return documents.slice(startIndex, endIndex);
    }, [tablePage]);

    const getTotalPages = useCallback((totalDocuments) => {
        return Math.max(1, Math.ceil(totalDocuments / TABLE_PAGE_SIZE));
    }, []);

    const nextPage = useCallback((totalDocuments) => {
        const totalPages = getTotalPages(totalDocuments);
        if (tablePage < totalPages) setTablePage(prev => prev + 1);
    }, [tablePage, getTotalPages]);

    const prevPage = useCallback(() => {
        if (tablePage > 1) setTablePage(prev => prev - 1);
    }, [tablePage]);

    const isValidPage = useCallback((totalDocuments) => {
        const totalPages = getTotalPages(totalDocuments);
        return tablePage >= 1 && tablePage <= totalPages;
    }, [tablePage, getTotalPages]);

    const goToPage = useCallback((page, totalDocuments) => {
        const totalPages = getTotalPages(totalDocuments);
        const validPage = Math.max(1, Math.min(page, totalPages));
        setTablePage(validPage);
    }, [getTotalPages]);

    return {
        // State
        searchQuery, setSearchQuery,
        filterCategory, setFilterCategory,
        filterStatus, setFilterStatus,
        filterPRNo, setFilterPRNo,
        filterDateFrom, setFilterDateFrom,
        filterDateTo, setFilterDateTo,
        sortKey, setSortKey,
        sortDir, setSortDir,
        showFilters, setShowFilters,
        tablePage, setTablePage,

        // Handlers
        resetFilters,
        hasActiveFilters,
        toggleSort,
        resetPage,
        getPaginatedDocuments,
        getTotalPages,
        nextPage,
        prevPage,
        isValidPage,
        goToPage
    };
}
