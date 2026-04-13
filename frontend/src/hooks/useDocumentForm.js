import { useState, useCallback, useMemo } from 'react';
import { documentService } from '../services/api';
import { parseApiError } from '../utils/errors';
import { CHECKLIST_ITEMS } from '../utils/constants';
import { isValidDateFormat } from '../utils/validation';
import { toBackendDateFormat } from '../utils/helpers';

/**
 * Custom hook for managing document form state, operations, and validation.
 */
export function useDocumentForm() {
    // --- Form State ---
    const [form, setForm] = useState({
        title: '',
        prNo: '',
        user_pr_no: '',
        total_amount: '',
        source_of_fund: '',
        ppmp_no: '',
        app_no: '',
        app_type: '',
        certified_true_copy: false,
        certified_signed_by: '',
        market_budget: '',
        market_period_from: '',
        market_period_to: '',
        market_expected_delivery: '',
        deadline_date: '',
        deadline_time: '',
        market_service_provider_1: '',
        market_service_provider_2: '',
        market_service_provider_3: '',
        office_division: '',
        received_by: '',
        date_received: '',
        attendance_members: '',
        resolution_no: '',
        winning_bidder: '',
        resolution_option: '',
        venue: '',
        aoq_no: '',
        abstract_bidders: '',
        contract_received_by_coa: false,
        contract_amount: '',
        notarized_place: '',
        notarized_date: '',
        ntp_service_provider: '',
        ntp_authorized_rep: '',
        ntp_received_by: '',
        oss_service_provider: '',
        oss_authorized_rep: '',
        secretary_service_provider: '',
        secretary_owner_rep: '',
        category: '',
        subDoc: '',
        date: '',
        file: null,
        status: 'pending',
    });

    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    // --- Validation Logic ---

    const newFormErrors = useMemo(() => {
        const errors = {};
        if (!form.title?.trim()) errors.title = 'Title/Purpose is required';
        if (form.date && !isValidDateFormat(form.date)) errors.date = 'Invalid format (use MM-DD-YY)';
        if (form.date_received && !isValidDateFormat(form.date_received)) errors.date_received = 'Invalid format (use MM-DD-YY)';
        if (form.notarized_date && !isValidDateFormat(form.notarized_date)) errors.notarized_date = 'Invalid format (use MM-DD-YY)';
        return errors;
    }, [form]);

    const isFormValid = useMemo(() => Object.keys(newFormErrors).length === 0, [newFormErrors]);

    const checklistData = useMemo(() => {
        return CHECKLIST_ITEMS.map(item => ({
            ...item,
            completed: !!(form[item.key] && form[item.key] !== ''),
            error: newFormErrors[item.key]
        }));
    }, [form, newFormErrors]);

    // --- Handlers ---

    const updateFormField = useCallback((field, value) => {
        setForm(prev => {
            if (typeof value === 'function') {
                return { ...prev, [field]: value(prev[field]) };
            }
            return { ...prev, [field]: value };
        });
    }, []);

    const resetForm = useCallback(() => {
        setForm({
            title: '', prNo: '', user_pr_no: '', total_amount: '',
            source_of_fund: '', ppmp_no: '', app_no: '', app_type: '',
            certified_true_copy: false, certified_signed_by: '',
            market_budget: '', market_period_from: '', market_period_to: '',
            market_expected_delivery: '', deadline_date: '', deadline_time: '',
            market_service_provider_1: '', market_service_provider_2: '',
            market_service_provider_3: '', office_division: '',
            received_by: '', date_received: '', attendance_members: '',
            resolution_no: '', winning_bidder: '', resolution_option: '',
            venue: '', aoq_no: '', abstract_bidders: '',
            contract_received_by_coa: false, contract_amount: '',
            notarized_place: '', notarized_date: '',
            ntp_service_provider: '', ntp_authorized_rep: '', ntp_received_by: '',
            oss_service_provider: '', oss_authorized_rep: '',
            secretary_service_provider: '', secretary_owner_rep: '',
            category: '', subDoc: '', date: '', file: null, status: 'pending',
        });
        setError('');
    }, []);

    const submitNewDocument = useCallback(async (user, selectedSubDocType, attendanceMembers, abstractBidders, onSuccess) => {
        setSubmitting(true);
        setError('');
        try {
            const formData = new FormData();
            formData.append('title', form.title);
            formData.append('category', form.category || 'General');
            formData.append('subDoc', form.subDoc || 'N/A');
            if (form.date) formData.append('date', toBackendDateFormat(form.date));
            formData.append('uploadedBy', user?.fullName || user?.username || '');
            formData.append('status', form.status || 'pending');

            // append all optional fields if they have value
            const optionalFields = [
                'user_pr_no', 'total_amount', 'source_of_fund', 'ppmp_no', 'app_no', 'app_type',
                'certified_signed_by', 'market_budget', 'market_period_from', 'market_period_to',
                'office_division', 'received_by', 'date_received', 'resolution_no', 'winning_bidder',
                'resolution_option', 'venue', 'aoq_no', 'ntp_service_provider', 'ntp_authorized_rep',
                'ntp_received_by', 'oss_service_provider', 'oss_authorized_rep', 'secretary_service_provider',
                'secretary_owner_rep'
            ];
            optionalFields.forEach(f => {
                if (form[f] !== undefined && form[f] !== null && form[f] !== '') {
                    if (f === 'date_received' || f === 'notarized_date' || f === 'market_period_from' || f === 'market_period_to' || f === 'market_expected_delivery') {
                        formData.append(f, toBackendDateFormat(form[f]));
                    } else {
                        formData.append(f, form[f]);
                    }
                }
            });

            formData.append('certified_true_copy', form.certified_true_copy ? 'true' : 'false');
            
            // Sub-doc specific logic
            if (selectedSubDocType === 'Attendance Sheet' && attendanceMembers.length > 0) {
                const members = attendanceMembers.filter(m => (m.name || '').trim()).map(m => ({ name: m.name.trim(), present: !!m.present }));
                if (members.length > 0) formData.append('attendance_members', JSON.stringify(members));
            }

            if (selectedSubDocType === 'Abstract of Quotation' && abstractBidders.length >= 3) {
                const bidders = abstractBidders.filter(b => (b.name || '').trim() && (b.amount !== undefined && b.amount !== '') && (b.remarks || '').trim())
                    .map(b => ({ name: b.name.trim(), amount: String(b.amount).trim(), remarks: b.remarks.trim() }));
                if (bidders.length >= 3) formData.append('abstract_bidders', JSON.stringify(bidders));
            }

            if (selectedSubDocType === 'Contract Services/Purchase Order') {
                formData.append('contract_received_by_coa', form.contract_received_by_coa ? 'true' : 'false');
                if (form.contract_amount) formData.append('contract_amount', form.contract_amount);
                if (form.notarized_place) formData.append('notarized_place', form.notarized_place);
                if (form.notarized_date) formData.append('notarized_date', form.notarized_date);
            }

            if (form.file) formData.append('file', form.file);

            await documentService.create(formData);
            resetForm();
            if (onSuccess) onSuccess();
            return { success: true };
        } catch (err) {
            const errorMessage = parseApiError(err);
            setError(errorMessage);
            return { success: false, error: errorMessage };
        } finally {
            setSubmitting(false);
        }
    }, [form, resetForm]);

    // Validation helpers
    const validateAttendanceMembers = useCallback((members) => {
        if (!members || members.length === 0) return { valid: false, error: 'At least one attendance member is required' };
        if (!members.some(m => (m.name || '').trim())) return { valid: false, error: 'At least one member with a name is required' };
        return { valid: true };
    }, []);

    const validateAbstractBidders = useCallback((bidders) => {
        if (!bidders || bidders.length < 3) return { valid: false, error: 'At least 3 bidders are required' };
        const validCount = bidders.filter(b => (b.name || '').trim() && (b.amount !== undefined && b.amount !== '') && (b.remarks || '').trim()).length;
        if (validCount < 3) return { valid: false, error: 'All 3+ bidders must have name, amount, and remarks' };
        return { valid: true };
    }, []);

    return {
        form, setForm, submitting, error, setError,
        updateFormField, resetForm, submitNewDocument,
        newFormErrors, isFormValid, checklistData,
        validateAttendanceMembers, validateAbstractBidders
    };
}
