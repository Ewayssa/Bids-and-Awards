import { useState, useCallback } from 'react';
import { documentService } from '../services/api';
import { parseApiError } from '../utils/api-errors';

/**
 * Custom hook for managing document form state and operations
 */
export function useDocumentForm() {
    // Form state
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

    // Submission states
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    // Update form field
    const updateFormField = useCallback((field, value) => {
        setForm(prev => {
            if (typeof value === 'function') {
                return { ...prev, [field]: value(prev[field]) };
            }
            return { ...prev, [field]: value };
        });
    }, []);

    // Reset form to initial state
    const resetForm = useCallback(() => {
        setForm({
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
        setError('');
    }, []);

    // Submit new document
    const submitNewDocument = useCallback(async (user, selectedSubDocType, attendanceMembers, abstractBidders, onSuccess) => {
        setSubmitting(true);
        setError('');

        try {
            const formData = new FormData();
            formData.append('title', form.title);
            formData.append('category', form.category || 'General');
            formData.append('subDoc', form.subDoc || 'N/A');
            if (form.date) formData.append('date', form.date);
            formData.append('uploadedBy', user?.fullName || user?.username || '');
            formData.append('status', form.status || 'pending');

            // Optional fields
            if (form.user_pr_no) formData.append('user_pr_no', form.user_pr_no);
            if (form.total_amount) formData.append('total_amount', form.total_amount);
            if (form.source_of_fund) formData.append('source_of_fund', form.source_of_fund);
            if (form.ppmp_no) formData.append('ppmp_no', form.ppmp_no);
            if (form.app_no) formData.append('app_no', form.app_no);
            if (form.app_type) formData.append('app_type', form.app_type);
            formData.append('certified_true_copy', form.certified_true_copy ? 'true' : 'false');
            if (form.certified_signed_by) formData.append('certified_signed_by', form.certified_signed_by);

            // Market scoping fields
            if (form.market_budget) formData.append('market_budget', form.market_budget);
            if (form.market_period_from) formData.append('market_period_from', form.market_period_from);
            if (form.market_period_to) formData.append('market_period_to', form.market_period_to);
            if (form.market_expected_delivery) {
                let value = form.market_expected_delivery;
                if (!value && form.deadline_date) {
                    value = `${form.deadline_date}${form.deadline_time ? ' ' + form.deadline_time : ''}`;
                }
                if (value) formData.append('market_expected_delivery', value);
            }
            if (form.market_service_provider_1) formData.append('market_service_provider_1', form.market_service_provider_1);
            if (form.market_service_provider_2) formData.append('market_service_provider_2', form.market_service_provider_2);
            if (form.market_service_provider_3) formData.append('market_service_provider_3', form.market_service_provider_3);

            // Other fields
            if (form.office_division) formData.append('office_division', form.office_division);
            if (form.received_by) formData.append('received_by', form.received_by);
            if (form.date_received) formData.append('date_received', form.date_received);

            // Attendance members
            if (selectedSubDocType === 'Attendance Sheet' && attendanceMembers.length > 0) {
                const members = attendanceMembers
                    .filter(m => (m.name || '').trim())
                    .map(m => ({ name: (m.name || '').trim(), present: !!m.present }));
                if (members.length > 0) {
                    formData.append('attendance_members', JSON.stringify(members));
                }
            }

            // Resolution fields
            if (form.resolution_no) formData.append('resolution_no', form.resolution_no);
            if (form.winning_bidder) formData.append('winning_bidder', form.winning_bidder);
            if (form.resolution_option) formData.append('resolution_option', form.resolution_option);
            if (form.venue) formData.append('venue', form.venue);

            // Abstract bidders
            if (selectedSubDocType === 'Abstract of Quotation' && abstractBidders.length >= 3) {
                const bidders = abstractBidders
                    .filter(b => (b.name || '').trim() && (b.amount !== undefined && b.amount !== '') && (b.remarks || '').trim())
                    .map(b => ({
                        name: (b.name || '').trim(),
                        amount: b.amount === undefined || b.amount === null ? '' : String(b.amount).trim(),
                        remarks: (b.remarks || '').trim()
                    }));
                if (bidders.length >= 3) {
                    formData.append('abstract_bidders', JSON.stringify(bidders));
                }
            }

            if (form.aoq_no) formData.append('aoq_no', form.aoq_no);

            // Contract fields
            if (selectedSubDocType === 'Contract Services/Purchase Order') {
                formData.append('contract_received_by_coa', form.contract_received_by_coa ? 'true' : 'false');
                if (form.contract_amount) formData.append('contract_amount', form.contract_amount);
                if (form.notarized_place) formData.append('notarized_place', form.notarized_place);
                if (form.notarized_date) formData.append('notarized_date', form.notarized_date);
            }

            // NTP fields
            if (selectedSubDocType === 'Notice to Proceed') {
                if (form.ntp_service_provider) formData.append('ntp_service_provider', form.ntp_service_provider);
                if (form.ntp_authorized_rep) formData.append('ntp_authorized_rep', form.ntp_authorized_rep);
                if (form.ntp_received_by) formData.append('ntp_received_by', form.ntp_received_by);
            }

            // OSS fields
            if (selectedSubDocType === 'OSS') {
                if (form.oss_service_provider) formData.append('oss_service_provider', form.oss_service_provider);
                if (form.oss_authorized_rep) formData.append('oss_authorized_rep', form.oss_authorized_rep);
            }

            // Secretary fields
            if (selectedSubDocType === "Applicable: Secretary's Certificate and Special Power of Attorney") {
                if (form.secretary_service_provider) formData.append('secretary_service_provider', form.secretary_service_provider);
                if (form.secretary_owner_rep) formData.append('secretary_owner_rep', form.secretary_owner_rep);
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

    return {
        form,
        submitting,
        error,
        updateFormField,
        resetForm,

