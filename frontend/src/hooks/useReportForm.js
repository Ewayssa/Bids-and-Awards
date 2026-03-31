import { useState, useCallback } from 'react';
import { reportService } from '../services/api';
import { parseApiError } from '../utils/errors';
import { toNumbersOnly } from '../utils/validation';
import { formatCurrencyValue } from '../utils/validation';

/**
 * Custom hook for managing report form state and row operations
 */
export function useReportForm() {
    const [reportForm, setReportForm] = useState({
        title: '',
        submitting_office: '',
    });
    const [reportRows, setReportRows] = useState([]);
    const [isEditing, setIsEditing] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [currentReportId, setCurrentReportId] = useState(null); // for update mode

    // Update report form field
    const updateReportField = useCallback((field, value) => {
        setReportForm(prev => ({ ...prev, [field]: value }));
        if (error && field === 'title' && value.trim()) setError(''); // clear title error
    }, [error]);

    // Add new row
    const addRow = useCallback(() => {
        const newRow = {
            id: Date.now().toString(), // simple unique ID
            name: '',
            description: '',
            unitCost: '',
            quantity: 1,
            totalAmount: '0.00',
            remarks: ''
        };
        setReportRows(prev => [...prev, newRow]);
    }, []);

    // Update row field with total recalc
    const updateRow = useCallback((rowId, field, value) => {
        setReportRows(prev => prev.map(row => {
            if (row.id !== rowId) return row;
            const updated = { ...row, [field]: value };
            if (field === 'unitCost' || field === 'quantity') {
                const unit = parseFloat(value || '0');
                const other = parseFloat(row[field === 'unitCost' ? 'quantity' : 'unitCost'] || '0');
                updated.totalAmount = (unit * other).toFixed(2);
            }
            return updated;
        }));
    }, []);

    // Delete row
    const deleteRow = useCallback((rowId) => {
        setReportRows(prev => prev.filter(row => row.id !== rowId));
    }, []);

    // Toggle edit/view mode
    const toggleEditMode = useCallback(() => {
        setIsEditing(prev => !prev);
        if (!isEditing) setError(''); // clear errors on edit
    }, [isEditing]);

    // Compute grand total
    const grandTotal = reportRows.reduce((sum, row) => sum + parseFloat(row.totalAmount || '0'), 0).toFixed(2);

    // Validation
    const validateReport = useCallback(() => {
        const errors = [];
        if (!reportForm.title.trim()) errors.push('Title is required');
        if (!reportForm.submitting_office.trim()) errors.push('Submitting office is required');
        if (reportRows.length === 0) errors.push('At least one row is required');
        reportRows.forEach((row, idx) => {
            if (!row.name.trim()) errors.push(`Row ${idx+1}: Item/Service Name is required`);
            const unit = parseFloat(row.unitCost || '0');
            const qty = parseFloat(row.quantity || '0');
            if (isNaN(unit) || unit <= 0) errors.push(`Row ${idx+1}: Unit Cost must be > 0`);
            if (isNaN(qty) || qty <= 0) errors.push(`Row ${idx+1}: Quantity must be > 0`);
        });
        if (errors.length > 0) {
            setError(errors.join('; '));
            return false;
        }
        return true;
    }, [reportForm, reportRows]);

    // Submit/Create report
    const submitReport = useCallback(async (user, onSuccess) => {
        if (!validateReport()) return { success: false };

        setSubmitting(true);
        setError('');

        try {
            const formData = new FormData();
            formData.append('title', reportForm.title.trim());
            formData.append('submitting_office', reportForm.submitting_office.trim());
            formData.append('uploadedBy', user?.fullName || user?.username || '');
            formData.append('rows', JSON.stringify(reportRows)); // JSON rows for backend

            const result = await reportService.create(formData);
            setCurrentReportId(result.id); // enable edit mode
            setIsEditing(false); // switch to view
            if (onSuccess) onSuccess(result);
            return { success: true, data: result };
        } catch (err) {
            const errMsg = parseApiError(err);
            setError(errMsg);
            return { success: false, error: errMsg };
        } finally {
            setSubmitting(false);
        }
    }, [reportForm, reportRows, validateReport]);

    // Reset form
    const resetReport = useCallback(() => {
        setReportForm({ title: '', submitting_office: '' });
        setReportRows([]);
        setIsEditing(true);
        setError('');
        setCurrentReportId(null);
    }, []);

    return {
        reportForm,
        reportRows,
        isEditing,
        submitting,
        error,
        grandTotal,
        currentReportId,
        updateReportField,
        addRow,
        updateRow,
        deleteRow,
        toggleEditMode,
        submitReport,
        resetReport,
        validateReport,
    };
}

