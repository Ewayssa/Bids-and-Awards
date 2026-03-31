import { useState, useEffect, useCallback } from 'react';
import { STORAGE_KEY_ENCODED_REPORT, REPORT_COLUMNS } from '../constants/reportConstants';

/**
 * Custom hook for managing encoded report rows and persistence.
 */
export const useEncodedReports = (currentEncoderId) => {
    const [encodedRows, setEncodedRows] = useState(() => {
        try {
            const raw = localStorage.getItem(STORAGE_KEY_ENCODED_REPORT);
            if (!raw) return [];
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return [];
        }
    });

    const [isFinalized, setIsFinalized] = useState(false);

    // Persist to localStorage
    useEffect(() => {
        if (encodedRows.length) {
            localStorage.setItem(STORAGE_KEY_ENCODED_REPORT, JSON.stringify(encodedRows));
        } else {
            localStorage.removeItem(STORAGE_KEY_ENCODED_REPORT);
        }
    }, [encodedRows]);

    const addRow = useCallback(() => {
        const emptyRow = REPORT_COLUMNS.reduce((acc, { key }) => ({ ...acc, [key]: '' }), {});
        setEncodedRows((prev) => [
            ...prev,
            { ...emptyRow, __owner: currentEncoderId || 'Unknown' },
        ]);
    }, [currentEncoderId]);

    const updateRow = useCallback((index, key, value) => {
        setEncodedRows((prev) => {
            const next = [...prev];
            if (!next[index]) return next;
            const row = next[index];
            if (row.__owner && row.__owner !== currentEncoderId) return next;
            next[index] = { ...row, [key]: value };
            return next;
        });
    }, [currentEncoderId]);

    const removeRow = useCallback((index) => {
        setEncodedRows((prev) =>
            prev.filter((row, i) => {
                if (i !== index) return true;
                return row.__owner && row.__owner !== currentEncoderId;
            })
        );
    }, [currentEncoderId]);

    return {
        encodedRows,
        isFinalized,
        setIsFinalized,
        addRow,
        updateRow,
        removeRow,
    };
};
