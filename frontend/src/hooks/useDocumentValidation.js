import { useMemo, useCallback } from 'react';
import { REQUIRED_NEW_FIELDS, CHECKLIST_ITEMS } from '../utils/constants';
import { validateRequiredFields, isValidDateFormat } from '../utils/validation';

/**
 * Custom hook for document validation logic
 */
export function useDocumentValidation(form, selectedSubDocType) {
    // Validate new document form
const newFormErrors = useMemo(() => {
        const errors = {};

        // Only require title for "Start New"
        if (!form.title?.trim()) {
            errors.title = 'Title/Purpose is required';
        }

        // Informational date validation (not blocking)
        if (form.date && !isValidDateFormat(form.date)) {
            errors.date = 'Invalid date format (use YYYY-MM-DD)';
        }

        return errors;
    }, [form]);

    // Check if form is valid
    const isFormValid = useMemo(() => {
        return Object.keys(newFormErrors).length === 0;
    }, [newFormErrors]);

    // Get checklist data for UI
    const checklistData = useMemo(() => {
        return CHECKLIST_ITEMS.map(item => ({
            ...item,
            completed: !!(form[item.key] && form[item.key] !== ''),
            error: newFormErrors[item.key]
        }));
    }, [form, newFormErrors]);

    // Validate attendance members
    const validateAttendanceMembers = useCallback((members) => {
        if (!members || members.length === 0) {
            return { valid: false, error: 'At least one attendance member is required' };
        }

        const validMembers = members.filter(m => (m.name || '').trim());
        if (validMembers.length === 0) {
            return { valid: false, error: 'At least one member with a name is required' };
        }

        return { valid: true };
    }, []);

    // Validate abstract bidders
    const validateAbstractBidders = useCallback((bidders) => {
        if (!bidders || bidders.length < 3) {
            return { valid: false, error: 'At least 3 bidders are required' };
        }

        const validBidders = bidders.filter(b =>
            (b.name || '').trim() &&
            (b.amount !== undefined && b.amount !== '') &&
            (b.remarks || '').trim()
        );

        if (validBidders.length < 3) {
            return { valid: false, error: 'All bidders must have name, amount, and remarks' };
        }

        return { valid: true };
    }, []);

    return {
        newFormErrors,
        isFormValid,
        checklistData,
        validateAttendanceMembers,
        validateAbstractBidders
    };
}