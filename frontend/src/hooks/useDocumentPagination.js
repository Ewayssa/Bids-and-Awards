import { useState, useCallback } from 'react';
import { TABLE_PAGE_SIZE } from '../utils/constants';

/**
 * Custom hook for managing document table pagination
 */
export function useDocumentPagination() {
    const [tablePage, setTablePage] = useState(1);

    // Reset to first page
    const resetPage = useCallback(() => {
        setTablePage(1);
    }, []);

    // Get paginated slice of documents
    const getPaginatedDocuments = useCallback((documents) => {
        const startIndex = (tablePage - 1) * TABLE_PAGE_SIZE;
        const endIndex = startIndex + TABLE_PAGE_SIZE;
        return documents.slice(startIndex, endIndex);
    }, [tablePage]);

    // Get total pages
    const getTotalPages = useCallback((totalDocuments) => {
        return Math.ceil(totalDocuments / TABLE_PAGE_SIZE);
    }, []);

    // Check if current page is valid
    const isValidPage = useCallback((totalDocuments) => {
        const totalPages = getTotalPages(totalDocuments);
        return tablePage >= 1 && tablePage <= totalPages;
    }, [tablePage, getTotalPages]);

    // Go to next page
    const nextPage = useCallback((totalDocuments) => {
        const totalPages = getTotalPages(totalDocuments);
        if (tablePage < totalPages) {
            setTablePage(prev => prev + 1);
        }
    }, [tablePage, getTotalPages]);

    // Go to previous page
    const prevPage = useCallback(() => {
        if (tablePage > 1) {
            setTablePage(prev => prev - 1);
        }
    }, [tablePage]);

    // Go to specific page
    const goToPage = useCallback((page, totalDocuments) => {
        const totalPages = getTotalPages(totalDocuments);
        const validPage = Math.max(1, Math.min(page, totalPages));
        setTablePage(validPage);
    }, [getTotalPages]);

    return {
        tablePage,
        setTablePage,
        resetPage,
        getPaginatedDocuments,
        getTotalPages,
        isValidPage,
        nextPage,
        prevPage,
        goToPage
    };
}