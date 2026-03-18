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

        // Required fields validation
        const requiredValidation = validateRequiredFields(form, REQUIRED_NEW_FIELDS);
        if (!requiredValidation.valid) {
            Object.assign(errors, requiredValidation.errors);
        }

        // Date format validation
        if (form.date && !isValidDateFormat(form.date)) {
            errors.date = 'Invalid date format';
        }

        // Sub-document specific validations
        if (selectedSubDocType) {
            switch (selectedSubDocType) {
                case 'Purchase Request':
                    if (!form.user_pr_no?.trim()) {
                        errors.user_pr_no = 'PR No. is required for Purchase Request';
                    }
                    if (!form.total_amount) {
                        errors.total_amount = 'Total amount is required for Purchase Request';
                    }
                    break;

                case 'Market Scopping':
                    if (!form.market_budget) {
                        errors.market_budget = 'Market budget is required';
                    }
                    if (!form.market_period_from) {
                        errors.market_period_from = 'Period from is required';
                    }
                    if (!form.market_period_to) {
                        errors.market_period_to = 'Period to is required';
                    }
                    break;

                case 'Attendance Sheet':
                    // Validation for attendance members is handled separately
                    break;

                case 'Abstract of Quotation':
                    if (!form.aoq_no?.trim()) {
                        errors.aoq_no = 'AOQ No. is required';
                    }
                    // Validation for abstract bidders is handled separately
                    break;

                case 'BAC Resolution':
                    if (!form.resolution_no?.trim()) {
                        errors.resolution_no = 'Resolution No. is required';
                    }
                    break;

                case 'Contract Services/Purchase Order':
                    if (!form.contract_amount) {
                        errors.contract_amount = 'Contract amount is required';
                    }
                    break;

                case 'Notice to Proceed':
                    if (!form.ntp_service_provider?.trim()) {
                        errors.ntp_service_provider = 'Service provider is required';
                    }
                    break;

                case 'OSS':
                    if (!form.oss_service_provider?.trim()) {
                        errors.oss_service_provider = 'Service provider is required';
                    }
                    break;

                case "Applicable: Secretary's Certificate and Special Power of Attorney":
                    if (!form.secretary_service_provider?.trim()) {
                        errors.secretary_service_provider = 'Service provider is required';
                    }
                    break;
            }
        }

        return errors;
    }, [form, selectedSubDocType]);

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