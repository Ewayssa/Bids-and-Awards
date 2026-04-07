import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { documentService, reportService, dashboardService } from '../services/api';
import { ROLES } from '../utils/auth';
import {
    MdUpload,
    MdEdit,
    MdClose,
    MdCheckCircle,
    MdVisibility,
    MdSearch,
    MdComment,
    MdExpandMore,
    MdExpandLess,
    MdTimeline,
    MdDescription,
    MdPostAdd,
    MdError,
    MdSchedule,
    MdWarning,
    MdFolder,
    MdDownload,
    MdChevronLeft,
    MdChevronRight,
} from 'react-icons/md';
import PageHeader from '../components/PageHeader';
import { DOC_TYPES, RFQ_PROCUREMENT_METHODS } from '../constants/docTypes';
import {
    REQUIRED_NEW_FIELDS,
    CHECKLIST_ITEMS,
    TABLE_PAGE_SIZE,
    MODAL_TYPES,
    VIEW_MODES,
    SORT_DIRECTIONS
} from '../utils/constants';
import { toLettersOnly, toNumbersOnly, formatCurrencyValue } from '../utils/validation';
import { 
    computeRFQNoFromDate, 
    formatInputDate as formatDate,
    filterDocumentsByQuery,
    filterDocumentsByCategory,
    filterDocumentsByStatus,
    sortDocuments,
    groupDocumentsByCategory,
    getStatusColor
} from '../utils/helpers';
import { parseApiError } from '../utils/errors';
import { useDocumentForm } from '../hooks/useDocumentForm';
import { useDocumentTable } from '../hooks/useDocumentTable';
import { useReportForm } from '../hooks/useReportForm';

// Modular Components
import { DocDetailsView } from '../components/encode/DocDetailsView';
import WorkflowVisualization from '../components/encode/WorkflowVisualization';
import DocViewModal from '../components/encode/modals/DocViewModal';
import WorkflowModal from '../components/encode/modals/WorkflowModal';
import CommentModal from '../components/encode/modals/CommentModal';
import AlertModal from '../components/encode/modals/AlertModal';
import ConfirmDialog from '../components/encode/modals/ConfirmDialog';
import PreviewModal from '../components/encode/modals/PreviewModal';
import NewProcurementModal from '../components/encode/modals/NewProcurementModal';
import ManageDocumentsModal from '../components/encode/modals/ManageDocumentsModal';
import UpdateChecklistModal from '../components/encode/modals/UpdateChecklistModal';
import UpdateDocumentModal from '../components/encode/modals/UpdateDocumentModal';

const Encode = ({ user }) => {
    const [searchParams] = useSearchParams();
    const [documents, setDocuments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [pendingBreakdown, setPendingBreakdown] = useState([]);
    const [updateSubmitting, setUpdateSubmitting] = useState(false);
    const [updateError, setUpdateError] = useState('');
    const [activeModal, setActiveModal] = useState(null); // 'new' | 'update' | 'updateList' | 'manage' | null
    const [newStep, setNewStep] = useState('docType'); // 'docType' | 'subDoc' | 'form'
    const [selectedDocType, setSelectedDocType] = useState(null);
    const [selectedSubDocType, setSelectedSubDocType] = useState(null);
    const [selectedDoc, setSelectedDoc] = useState(null);
    const [alertMessage, setAlertMessage] = useState(null);
    const [manualErrors, setManualErrors] = useState({});
    const [confirmDialog, setConfirmDialog] = useState(null); // { message, onConfirm }
    const [selectedPendingFolder, setSelectedPendingFolder] = useState(null);

    // Custom hooks

    const {
        form,
        error: newError,
        setForm,
        updateFormField,
        resetForm,
        submitNewDocument,
        setError: setNewError,
        submitting: newSubmitting,
        newFormErrors: internalErrors,
        isFormValid: isInternalValid,
        checklistData: formChecklistData,
        validateAttendanceMembers,
        validateAbstractBidders
    } = useDocumentForm();

    const {
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
        toggleSort,
        tablePage,
        setTablePage,
        resetPage,
        getPaginatedDocuments,
        getTotalPages,
        isValidPage,
        nextPage,
        prevPage,
        goToPage
    } = useDocumentTable();
    const isAdmin = user?.role === ROLES.ADMIN;
    const canUploadDocuments = [ROLES.ADMIN, ROLES.ENCODER, ROLES.USER].includes(user?.role);
    const canViewAllDocuments = [ROLES.ADMIN, ROLES.VIEWER, ROLES.ENCODER, ROLES.USER].includes(user?.role);

    // Combine validation errors from hook and manual checks
    const newFormErrors = useMemo(() => {
        return { ...internalErrors, ...manualErrors };
    }, [internalErrors, manualErrors]);

    const isFormValid = useMemo(() => {
        return Object.keys(newFormErrors).length === 0;
    }, [newFormErrors]);

    const [viewMode, setViewMode] = useState('list'); // 'list' | 'grouped'
    const [expandedGroups, setExpandedGroups] = useState(new Set());
    const [selectedDocForComment, setSelectedDocForComment] = useState(null);
    const [commentText, setCommentText] = useState('');
    const [comments, setComments] = useState({}); // { docId: [{ text, author, date }] }
    const [previewDoc, setPreviewDoc] = useState(null); // { id, title, file_url, previewBlobUrl, previewBlobType }
    const [previewSequence, setPreviewSequence] = useState(null); // { docs, currentIndex } when navigating within a folder
    const updateFileInputRef = useRef(null);
    const [workflowPRNo, setWorkflowPRNo] = useState(null);
    const [nextTransactionNumber, setNextTransactionNumber] = useState(null);
    const [activeChecklistCategoryId, setActiveChecklistCategoryId] = useState(null); // which folder is selected in Manage Documents
    const [lastAutoPreviewFolderId, setLastAutoPreviewFolderId] = useState(null); // to auto-open first doc preview once per folder
    const [certificateServiceProviders, setCertificateServiceProviders] = useState(['', '', '']); // For Certificate of DILG - SVP
    const [bacMembers, setBacMembers] = useState([]);
    const [attendanceMembers, setAttendanceMembers] = useState([]); // For Attendance Sheet: [{ id, name, present }]
    const [abstractBidders, setAbstractBidders] = useState([]); // For Abstract of Quotation: [{ id, name, amount, remarks }]
    const [manageSelectedTypeId, setManageSelectedTypeId] = useState(null); // Manage modal: selected document type (DOC_TYPES id)
    const [manageSelectedPrNo, setManageSelectedPrNo] = useState(null); // Manage modal: selected BAC Folder No.
    const [manageFolderPopup, setManageFolderPopup] = useState(null); // { typeId, prNo } when set, show popup with all docs in that BAC folder
    const [manageFolderPopupPreview, setManageFolderPopupPreview] = useState(null); // { doc, previewBlobUrl, previewBlobType } for inline file display
    const [manageFolderPopupIndex, setManageFolderPopupIndex] = useState(0); // which doc (with file) is shown when multiple
    const [manageRefreshing, setManageRefreshing] = useState(false);

    const load = async () => {
        try {
            const [dashboardData, docsResponse] = await Promise.all([
                dashboardService.getData(true, ''),
                documentService.getAll(),
            ]);
            const list = Array.isArray(docsResponse) ? docsResponse : (docsResponse?.results ?? []);
            const sorted = [...list].sort((a, b) => {
                const aTime = a.uploaded_at ? new Date(a.uploaded_at).getTime() : 0;
                const bTime = b.uploaded_at ? new Date(b.uploaded_at).getTime() : 0;
                return bTime - aTime;
            });
            setDocuments(sorted);
            setPendingBreakdown(dashboardData?.pendingBreakdown ?? []);
        } catch (e) {
            setDocuments([]);
            setPendingBreakdown([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const statusFromUrl = searchParams.get('status');
    useEffect(() => {
        if (statusFromUrl && ['pending', 'ongoing', 'complete'].includes(statusFromUrl)) {
            setFilterStatus(statusFromUrl);
            setShowFilters(true);
        }
    }, [statusFromUrl]);

    useEffect(() => {
        if (activeModal === 'new' && newStep === 'form') {
            const dateForBac = form.date && form.date.trim() ? form.date.trim() : null;
            setNextTransactionNumber(null);
            documentService.getNextTransactionNumber(dateForBac).then(setNextTransactionNumber).catch(() => setNextTransactionNumber('—'));
        }
    }, [activeModal, newStep, form.date]);

    const performNewSubmit = async () => {
        const result = await submitNewDocument(
            user,
            selectedSubDocType,
            attendanceMembers,
            abstractBidders,
            () => {
                setSelectedDoc(null);
                // Small delay to ensure backend has processed status calculation
                setTimeout(() => {
                    load();
                }, 300);
                setActiveModal(null);
                setAlertMessage('New procurement document saved.');
                setAttendanceMembers([]);
                setAbstractBidders([]);
                // Notify dashboard to refresh stats
                window.dispatchEvent(new CustomEvent('documentChanged'));
            }
        );
        return result;
    };

    const validateNewForm = () => {
        const err = {};

        if (!(form.title && form.title.trim())) {
            err.title = 'Title/Purpose is required';
        }
        if (!form.date) {
            err.date = 'Date is required';
        }

        setManualErrors(err);
        return Object.keys(err).length === 0;
    };

    const handleNewSubmit = async (e) => {
        e.preventDefault();

        if (!validateNewForm()) {
            return;
        }

        // Special handling for some forms before submission
        if (
            selectedDocType?.name === 'RFQ Concerns' &&
            selectedSubDocType?.startsWith('Certificate of DILG - Small Value Procurement')
        ) {
            const autoRFQ = form.user_pr_no && form.user_pr_no.trim()
                ? form.user_pr_no.trim()
                : computeRFQNoFromDate(form.date);
            const trimmedProviders = certificateServiceProviders.map((p) => (p || '').trim());
            // Sync first three providers into the form fields so they are saved
            setForm((f) => ({
                ...f,
                user_pr_no: autoRFQ,
                market_service_provider_1: trimmedProviders[0] || '',
                market_service_provider_2: trimmedProviders[1] || '',
                market_service_provider_3: trimmedProviders.slice(2).join('; ') || '',
            }));
        }

        setConfirmDialog({
            message: 'Are you sure you want to submit this document?',
            onConfirm: async () => {
                setConfirmDialog(null);
                await performNewSubmit();
            },
        });
    };

    const performUpdateSubmit = async () => {
        if (!selectedDoc?.id) {
            setUpdateError('Select a document to update from the list below.');
            return;
        }
        setUpdateError('');
        setUpdateSubmitting(true);
        try {
            const fd = new FormData();
            fd.append('currentUsername', user?.username || '');
            fd.append('title', form.title);
            fd.append('prNo', form.prNo);
            fd.append('category', form.category || 'General');
            fd.append('subDoc', form.subDoc || 'N/A');
            if (form.date) fd.append('date', form.date);
            if (form.user_pr_no !== undefined) fd.append('user_pr_no', form.user_pr_no || '');
            if (form.total_amount !== undefined && form.total_amount !== '') fd.append('total_amount', form.total_amount);
            if (form.source_of_fund !== undefined) fd.append('source_of_fund', form.source_of_fund || '');
            if (form.ppmp_no !== undefined) fd.append('ppmp_no', form.ppmp_no || '');
            if (form.app_no !== undefined) fd.append('app_no', form.app_no || '');
            if (form.app_type !== undefined) fd.append('app_type', form.app_type || '');
            fd.append('certified_true_copy', form.certified_true_copy ? 'true' : 'false');
            if (form.certified_signed_by !== undefined) fd.append('certified_signed_by', form.certified_signed_by || '');
            if (form.market_budget !== undefined && form.market_budget !== '') fd.append('market_budget', form.market_budget);
            if (form.market_period_from !== undefined) fd.append('market_period_from', form.market_period_from || '');
            if (form.market_period_to !== undefined) fd.append('market_period_to', form.market_period_to || '');
            if (form.market_expected_delivery !== undefined) fd.append('market_expected_delivery', form.market_expected_delivery || '');
            if (form.market_service_provider_1 !== undefined) fd.append('market_service_provider_1', form.market_service_provider_1 || '');
            if (form.market_service_provider_2 !== undefined) fd.append('market_service_provider_2', form.market_service_provider_2 || '');
            if (form.market_service_provider_3 !== undefined) fd.append('market_service_provider_3', form.market_service_provider_3 || '');
            if (form.office_division !== undefined) fd.append('office_division', form.office_division || '');
            if (form.received_by !== undefined) fd.append('received_by', form.received_by || '');
            if (form.date_received) fd.append('date_received', form.date_received);
            if (selectedDoc?.subDoc === 'Attendance Sheet' && attendanceMembers.length > 0) {
                const members = attendanceMembers
                    .filter((m) => (m.name || '').trim())
                    .map((m) => ({ name: (m.name || '').trim(), present: !!m.present }));
                if (members.length > 0) fd.append('attendance_members', JSON.stringify(members));
            } else if (form.attendance_members !== undefined && form.attendance_members !== '') {
                fd.append('attendance_members', form.attendance_members);
            }
            if (form.resolution_no !== undefined) fd.append('resolution_no', form.resolution_no || '');
            if (form.winning_bidder !== undefined) fd.append('winning_bidder', form.winning_bidder || '');
            if (form.resolution_option !== undefined) fd.append('resolution_option', form.resolution_option || '');
            if (form.venue !== undefined) fd.append('venue', form.venue || '');
            if (selectedDoc?.subDoc === 'Abstract of Quotation' && abstractBidders.length >= 3) {
                const bidders = abstractBidders
                    .filter((b) => (b.name || '').trim() && (b.amount !== undefined && b.amount !== '') && (b.remarks || '').trim())
                    .map((b) => ({ name: (b.name || '').trim(), amount: b.amount === undefined || b.amount === null ? '' : String(b.amount).trim(), remarks: (b.remarks || '').trim() }));
                if (bidders.length >= 3) fd.append('abstract_bidders', JSON.stringify(bidders));
            } else if (form.abstract_bidders !== undefined && form.abstract_bidders !== '') {
                fd.append('abstract_bidders', form.abstract_bidders);
            }
            if (form.aoq_no !== undefined) fd.append('aoq_no', form.aoq_no || '');
            if (selectedDoc?.subDoc === 'Contract Services/Purchase Order') {
                fd.append('contract_received_by_coa', form.contract_received_by_coa ? 'true' : 'false');
                if (form.contract_amount !== undefined && form.contract_amount !== '') fd.append('contract_amount', form.contract_amount);
                if (form.notarized_place !== undefined) fd.append('notarized_place', form.notarized_place || '');
                if (form.notarized_date) fd.append('notarized_date', form.notarized_date);
            }
            if (selectedDoc?.subDoc === 'Notice to Proceed') {
                if (form.ntp_service_provider !== undefined) fd.append('ntp_service_provider', form.ntp_service_provider || '');
                if (form.ntp_authorized_rep !== undefined) fd.append('ntp_authorized_rep', form.ntp_authorized_rep || '');
                if (form.ntp_received_by !== undefined) fd.append('ntp_received_by', form.ntp_received_by || '');
            }
            if (selectedDoc?.subDoc === 'OSS') {
                if (form.oss_service_provider !== undefined) fd.append('oss_service_provider', form.oss_service_provider || '');
                if (form.oss_authorized_rep !== undefined) fd.append('oss_authorized_rep', form.oss_authorized_rep || '');
            }
            if (selectedDoc?.subDoc === "Applicable: Secretary's Certificate and Special Power of Attorney") {
                if (form.secretary_service_provider !== undefined) fd.append('secretary_service_provider', form.secretary_service_provider || '');
                if (form.secretary_owner_rep !== undefined) fd.append('secretary_owner_rep', form.secretary_owner_rep || '');
            }
            // Do NOT change uploadedBy on update. The original uploader
            // (who started the procurement) remains the owner with
            // the right to update the document.
            if (form.status) fd.append('status', form.status);
            if (form.file) fd.append('file', form.file);

            await documentService.update(selectedDoc.id, fd);

            setSelectedDoc(null);
            setForm({ title: '', prNo: '', user_pr_no: '', total_amount: '', source_of_fund: '', ppmp_no: '', app_no: '', app_type: '', certified_true_copy: false, certified_signed_by: '', market_budget: '', market_period_from: '', market_period_to: '', market_expected_delivery: '', deadline_date: '', deadline_time: '', market_service_provider_1: '', market_service_provider_2: '', market_service_provider_3: '', office_division: '', received_by: '', date_received: '', attendance_members: '', resolution_no: '', winning_bidder: '', resolution_option: '', venue: '', aoq_no: '', abstract_bidders: '', contract_received_by_coa: false, contract_amount: '', notarized_place: '', notarized_date: '', ntp_service_provider: '', ntp_authorized_rep: '', ntp_received_by: '', oss_service_provider: '', oss_authorized_rep: '', secretary_service_provider: '', secretary_owner_rep: '', category: '', subDoc: '', date: '', file: null, status: form.status });
            // Small delay to ensure backend has processed status calculation
            setTimeout(() => {
                load();
            }, 300);
            setActiveModal(null);
            setAlertMessage('Document updated successfully.');
            // Notify dashboard to refresh stats
            window.dispatchEvent(new CustomEvent('documentChanged'));
        } catch (err) {
            setUpdateError(err.response?.data?.detail || err.message || 'Failed to update.');
        } finally {
            setUpdateSubmitting(false);
        }
    };

    const handleUpdateSubmit = (e) => {
        e.preventDefault();
        if (!selectedDoc?.id) {
            setUpdateError('Select a document to update from the list below.');
            return;
        }
        setConfirmDialog({
            message: 'Are you sure you want to save updates to this document?',
            onConfirm: () => {
                setConfirmDialog(null);
                performUpdateSubmit();
            },
        });
    };

    const performDelete = async (id) => {
        try {
            await documentService.delete(id);
            load();
            // Notify dashboard to refresh stats
            window.dispatchEvent(new CustomEvent('documentChanged'));
        } catch (err) {
            setAlertMessage('Failed to delete.');
        }
    };

    const handleDelete = (id) => {
        setConfirmDialog({
            message: 'Delete this document?',
            onConfirm: () => {
                setConfirmDialog(null);
                performDelete(id);
            },
        });
    };

    const formatDate = (d) => (!d ? '—' : typeof d === 'string' ? d.split('T')[0] : d);

    // Sub-doc types that have no Title field in fill-out details (same as backend) — completion = date + file + other required fields
    const docRequiresTitle = (doc) => true; // All documents now require a Title/Purpose

    const docRequiresDate = (doc) => true; // All documents now require a Date

    const isIncomplete = (doc) => {
        if (!doc) return true;
        const missing = getMissingFields(doc);
        return missing.length > 0;
    };

    // Returns true if a sub-document type has already been uploaded for the current BAC folder
    const alreadyUploaded = useCallback((sd) => {
        if (!(form.prNo || '')) return false;
        return documents.some(
            (d) =>
                (d.prNo || '') === (form.prNo || '') &&
                (d.category || '').trim() === (selectedDocType?.name || '').trim() &&
                (d.subDoc || '').trim() === (sd || '').trim()
        );
    }, [documents, form.prNo, selectedDocType]);

    const handleView = (doc) => {
        setSelectedDoc(doc);
        setActiveModal('view');
    };

    const updateListDocs = documents; // Everyone sees all documents

    // Filtering and sorting (base: updateListDocs - everyone sees all docs)
    const filteredDocuments = useMemo(() => {
        let filtered = [...updateListDocs];
        
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(doc => 
                (doc.title || '').toLowerCase().includes(query) ||
                (doc.prNo || '').toLowerCase().includes(query) ||
                (doc.category || '').toLowerCase().includes(query) ||
                (doc.subDoc || '').toLowerCase().includes(query) ||
                (doc.uploadedBy || '').toLowerCase().includes(query)
            );
        }
        
        if (filterCategory) {
            filtered = filtered.filter(doc => doc.category === filterCategory);
        }
        
        if (filterStatus) {
            filtered = filtered.filter(doc => doc.status === filterStatus);
        }
        
        if (filterPRNo) {
            filtered = filtered.filter(doc => (doc.prNo || '').toLowerCase().includes(filterPRNo.toLowerCase()));
        }
        
        if (filterDateFrom) {
            filtered = filtered.filter(doc => {
                const d = doc.uploaded_at ? String(doc.uploaded_at).slice(0, 10) : '';
                return d && d >= filterDateFrom;
            });
        }
        if (filterDateTo) {
            filtered = filtered.filter(doc => {
                const d = doc.uploaded_at ? String(doc.uploaded_at).slice(0, 10) : '';
                return d && d <= filterDateTo;
            });
        }
        
        if (sortKey) {
            filtered = [...filtered].sort((a, b) => {
                let va = a[sortKey] ?? '';
                let vb = b[sortKey] ?? '';
                if (sortKey === 'uploaded_at' || sortKey === 'updated_at') {
                    va = new Date(va || 0).getTime();
                    vb = new Date(vb || 0).getTime();
                }
                if (typeof va === 'string') va = (va || '').toLowerCase();
                if (typeof vb === 'string') vb = (vb || '').toLowerCase();
                const cmp = va < vb ? -1 : va > vb ? 1 : 0;
                return sortDir === 'asc' ? cmp : -cmp;
            });
        }
        
        return filtered;
    }, [updateListDocs, searchQuery, filterCategory, filterStatus, filterPRNo, filterDateFrom, filterDateTo, sortKey, sortDir]);

    // Group documents by transaction number
    const groupedDocuments = useMemo(() => {
        const groups = {};
        filteredDocuments.forEach(doc => {
            const prNo = doc.prNo || 'Unassigned';
            if (!groups[prNo]) {
                groups[prNo] = [];
            }
            groups[prNo].push(doc);
        });
        return groups;
    }, [filteredDocuments]);

    const groupedEntries = useMemo(() => Object.entries(groupedDocuments), [groupedDocuments]);
    const totalPagesList = Math.max(1, Math.ceil(filteredDocuments.length / TABLE_PAGE_SIZE));
    const totalPagesGrouped = Math.max(1, Math.ceil(groupedEntries.length / TABLE_PAGE_SIZE));
    const paginatedDocuments = useMemo(() => {
        const start = (tablePage - 1) * TABLE_PAGE_SIZE;
        return filteredDocuments.slice(start, start + TABLE_PAGE_SIZE);
    }, [filteredDocuments, tablePage]);
    const paginatedGroupedEntries = useMemo(() => {
        const start = (tablePage - 1) * TABLE_PAGE_SIZE;
        return groupedEntries.slice(start, start + TABLE_PAGE_SIZE);
    }, [groupedEntries, tablePage]);

    useEffect(() => {
        setTablePage(1);
    }, [filteredDocuments.length, groupedEntries.length, viewMode]);

    // Get unique categories and transaction numbers for filters (from visible docs)
    const uniqueCategories = useMemo(() => {
        return [...new Set(updateListDocs.map(d => d.category).filter(Boolean))].sort();
    }, [updateListDocs]);

    const uniquePRNos = useMemo(() => {
        return [...new Set(updateListDocs.map(d => d.prNo).filter(Boolean))].sort();
    }, [updateListDocs]);

    // Get list of missing fields for a document (matches backend completeness logic)
    const getMissingFields = (doc) => {
        if (!doc) return [];
        const missing = [];
        const sub = (doc.subDoc || '').trim();
        const titleRequired = !sub.startsWith('PHILGEPS - ');
        const dateRequired = sub !== 'PHILGEPS - Lease of Venue';
        
        // Basic identification fields
        if (titleRequired && !(doc.title && String(doc.title).trim())) missing.push('Title/Purpose');
        if (dateRequired && !doc.date) missing.push('Date');
        
        if (!(doc.prNo && String(doc.prNo).trim())) missing.push('BAC Folder No.');
        if (!(doc.category && String(doc.category).trim())) missing.push('Category');
        if (!(doc.subDoc && String(doc.subDoc).trim())) missing.push('Sub-document');

        // Sub-doc specific detail checks
        if (sub === 'Annual Procurement Plan') {
            if (!doc.app_type) missing.push('APP Type');
            if (doc.certified_true_copy && !doc.certified_signed_by) missing.push('Signatory');
        } else if (sub === 'Market Scopping') {
            if (!doc.market_budget) missing.push('Budget');
            if (!doc.market_service_provider_1) missing.push('Service Provider 1');
            if (!doc.market_service_provider_2) missing.push('Service Provider 2');
            if (!doc.market_service_provider_3) missing.push('Service Provider 3');
        } else if (sub === 'Requisition and Issue Slip') {
            if (!doc.office_division) missing.push('Office/Division');
            if (!doc.received_by) missing.push('Received By');
        } else if (sub === 'Notice of BAC Meeting') {
            if (!doc.agenda) missing.push('Agenda');
            if (!doc.date) missing.push('Date');
        } else if (sub === 'Invitation to COA') {
            if (!doc.date) missing.push('Date');
            if (!doc.date_received) missing.push('Date Received');
        } else if (sub === 'Attendance Sheet') {
            if (!doc.agenda) missing.push('Agenda');
            if (!doc.date) missing.push('Date');
            const members = Array.isArray(doc.attendance_members) ? doc.attendance_members : [];
            if (members.length === 0) missing.push('BAC Members List');
            else if (!members.some(m => m.present)) missing.push('At least one member Present');
        } else if (sub === 'Minutes of the Meeting') {
            if (!doc.agenda) missing.push('Agenda/Others');
            if (!doc.date) missing.push('Date');
        } else if (sub === 'BAC Resolution') {
            if (!doc.resolution_no) missing.push('Resolution No.');
            if (!doc.winning_bidder) missing.push('Winning Bidder');
            if (!doc.resolution_option) missing.push('Option (LCB/LCRB etc)');
            if (!doc.office_division) missing.push('Office/Division');
            if (!doc.venue) missing.push('Venue');
        } else if (sub === 'Abstract of Quotation') {
            if (!doc.aoq_no) missing.push('AOQ No.');
            const bidders = Array.isArray(doc.abstract_bidders) ? doc.abstract_bidders : [];
            if (bidders.filter(b => b.name && b.amount).length < 3) missing.push('At least 3 Bidders');
        } else if (sub === 'Lease of Venue: Table Rating Factor') {
            if (!doc.table_rating_service_provider) missing.push('Service Provider');
            if (!doc.table_rating_address) missing.push('Address');
            if (!doc.table_rating_factor_value) missing.push('Factor Value');
        } else if (sub === 'Notice of Award') {
            if (!doc.notice_award_service_provider) missing.push('Service Provider');
            if (!doc.notice_award_authorized_rep) missing.push('Authorized Rep');
            if (!doc.notice_award_conforme) missing.push('Conforme');
        } else if (sub === 'Contract Services/Purchase Order') {
            if (!doc.contract_amount) missing.push('Contract Amount');
            if (!doc.notarized_place) missing.push('Notarized Place');
            if (!doc.notarized_date) missing.push('Notarized Date');
        } else if (sub === 'Notice to Proceed') {
            if (!doc.ntp_service_provider) missing.push('Service Provider');
            if (!doc.ntp_authorized_rep) missing.push('Authorized Rep');
            if (!doc.ntp_received_by) missing.push('Received By');
        } else if (sub === 'OSS') {
            if (!doc.oss_service_provider) missing.push('Service Provider');
            if (!doc.oss_authorized_rep) missing.push('Authorized Rep');
        } else if (sub === "Applicable: Secretary's Certificate and Special Power of Attorney") {
            if (!doc.secretary_service_provider) missing.push('Service Provider');
            if (!doc.secretary_owner_rep) missing.push('Owner/Rep');
        }

        // File requirement check (includes expanded exemptions for Lease of Venue, Small Value Procurement, Public Bidding)
        const noFileRequired = (() => {
            if (sub === 'PHILGEPS - Small Value Procurement' || sub === 'PHILGEPS - Public Bidding') return false;
            const kw = ['Lease of Venue', 'Small Value Procurement', 'Public Bidding', 'Minutes of the Meeting'];
            const exact = ['Notice of Award (Posted)', 'Abstract of Quotation (Posted)', 'BAC Resolution (Posted)'];
            return kw.some(k => sub.includes(k)) || exact.includes(sub);
        })();
        
        const hasFile = doc.file || (doc.file_url && String(doc.file_url).trim());
        if (!noFileRequired && !hasFile) missing.push('File');

        if (!(doc.uploadedBy && String(doc.uploadedBy).trim())) missing.push('Uploaded By');
        
        return missing;
    };

    const isUserUploader = (doc) => {
        if (!user) return false;
        if (isAdmin) return true; // Admins can update anything
        if (!doc?.uploadedBy) return false;
        const uploadedBy = (doc.uploadedBy || '').trim().toLowerCase();
        const meFull = (user.fullName || '').trim().toLowerCase();
        const meUser = (user.username || '').trim().toLowerCase();
        return (meFull && uploadedBy === meFull) || (meUser && uploadedBy === meUser);
    };

    // Checklist data for Update modal: which sub-docs are completed (any document matching category+subDoc)
    const updateChecklistData = useMemo(() => {
        return DOC_TYPES.map((docType) => {
            const categoryName = (docType.name || '').trim().toLowerCase();
            const isRfq = docType.id === 'afq';
            const isInitial = docType.id === 'initial';
            let subDocSlots;
            if (isRfq) {
                subDocSlots = docType.subDocs.flatMap((header) =>
                    RFQ_PROCUREMENT_METHODS.map(({ value }) => `${header} - ${value}`)
                );
            } else if (isInitial) {
                // For Initial Documents, expand Supplies into its options
                subDocSlots = docType.subDocs.flatMap((subDoc) => {
                    if (subDoc === 'Supplies') {
                        return ['Supplies - Lease of Venue', 'Supplies - Public Bidding', 'Supplies - Small Value Procurement'];
                    }
                    return [subDoc];
                });
            } else {
                subDocSlots = docType.subDocs;
            }
            const subDocsWithStatus = subDocSlots.map((subDocName) => {
                const doc = updateListDocs.find(
                    (d) =>
                        (d.category || '').trim().toLowerCase() === categoryName &&
                        (d.subDoc || '').trim() === (subDocName || '').trim()
                );
                return {
                    name: subDocName,
                    done: doc && doc.status === 'complete',
                    doc,
                    canUpdate: doc ? isUserUploader(doc) : false,
                };
            });
            return {
                ...docType,
                subDocsWithStatus,
            };
        });
    }, [updateListDocs, user]);

    // Auto-open the first file's preview when a folder is selected (only when not in Manage Documents checklist)
    useEffect(() => {
        if (activeModal === 'updateList') return;
        if (!activeChecklistCategoryId) {
            setLastAutoPreviewFolderId(null);
            return;
        }
        if (lastAutoPreviewFolderId === activeChecklistCategoryId) return;
        const activeType = updateChecklistData.find((dt) => dt.id === activeChecklistCategoryId);
        if (!activeType) return;
        const folderName = (activeType.name || '').toLowerCase().trim();
        const typeSubDocs = new Set((activeType.subDocs || []).map((s) => (s || '').trim().toLowerCase()));
        const folderDocs = documents.filter((d) => {
            const catRaw = (d.category || '').trim();
            const cat = catRaw.toLowerCase();
            const sub = (d.subDoc || '').trim().toLowerCase();
            const matchesCategoryName =
                folderName &&
                cat &&
                (cat === folderName || cat.includes(folderName) || folderName.includes(cat));
            const matchesCategoryId =
                activeType.id && cat && cat.includes(String(activeType.id).toLowerCase());
            const matchesSubDoc = sub && typeSubDocs.has(sub);
            return matchesCategoryName || matchesCategoryId || matchesSubDoc;
        });
        if (!folderDocs.length) return;
        const docsWithFiles = folderDocs.filter((d) => d.file_url);
        if (!docsWithFiles.length) return;
        const firstWithFile = docsWithFiles[0];
        // Store full sequence for this folder so user can navigate all its files
        setPreviewSequence({ docs: docsWithFiles, currentIndex: 0 });
        // Reuse existing viewer behavior; only admins can preview files
        openPreview(firstWithFile);
        setLastAutoPreviewFolderId(activeChecklistCategoryId);
    }, [activeModal, activeChecklistCategoryId, updateChecklistData, documents, lastAutoPreviewFolderId]);

    // Export to CSV
    const exportToCSV = () => {
        const headers = ['Title', 'BAC Folder No.', 'Category', 'Sub-document', 'Procurement Type', 'Uploaded By', 'Date', 'Status', 'Uploaded At'];
        const rows = filteredDocuments.map(doc => [
            doc.title || '',
            doc.prNo || '',
            doc.category || '',
            doc.subDoc || '',
            getProcurementType(doc),
            doc.uploadedBy || '',
            formatDate(doc.date),
            doc.status || '',
            formatDate(doc.uploaded_at)
        ]);
        
        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        ].join('\n');
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `bac-documents-${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
    };

    const toggleGroup = (prNo) => {
        const newExpanded = new Set(expandedGroups);
        if (newExpanded.has(prNo)) {
            newExpanded.delete(prNo);
        } else {
            newExpanded.add(prNo);
        }
        setExpandedGroups(newExpanded);
    };

    const getProcurementType = (doc) => {
        const sub = (doc?.subDoc || '').trim();
        if (!sub) return '—';

        if (sub === 'Small Value Procurement' || sub.endsWith(' - Small Value Procurement')) {
            return 'Small Value Procurement';
        }
        if (sub === 'Public Bidding' || sub.endsWith(' - Public Bidding')) {
            return 'Public Bidding';
        }
        if (sub === 'Lease of Venue: Table Rating Factor' || sub.includes('Lease of Venue') || sub === 'Lease of Venue' || sub.endsWith(' - Lease of Venue')) {
            return 'Lease of Venue';
        }

        return '—';
    };

    const clearFilters = () => {
        setSearchQuery('');
        setFilterCategory('');
        setFilterStatus('');
        setFilterPRNo('');
        setFilterDateFrom('');
        setFilterDateTo('');
    };

    const handleSort = (key) => {
        if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
        else { setSortKey(key); setSortDir('asc'); }
    };

    const pageHasActiveFilters = searchQuery || filterCategory || filterStatus || filterPRNo || filterDateFrom || filterDateTo;

    // Comment functions
    const handleAddComment = async (docId) => {
        if (!commentText.trim()) return;
        const newComment = {
            text: commentText.trim(),
            author: user?.fullName || user?.username || 'Unknown',
            date: new Date().toISOString(),
        };
        setComments(prev => ({
            ...prev,
            [docId]: [...(prev[docId] || []), newComment]
        }));
        setCommentText('');
        try {
            await documentService.addComment(docId, commentText.trim());
        } catch (err) {
            // If backend doesn't support comments, we still keep them in state
        }
    };

    const loadComments = async (docId) => {
        try {
            const data = await documentService.getComments(docId);
            if (data && Array.isArray(data)) {
                setComments(prev => ({ ...prev, [docId]: data }));
            }
        } catch (err) {
            // If backend doesn't support comments, use local state
            if (!comments[docId]) {
                setComments(prev => ({ ...prev, [docId]: [] }));
            }
        }
    };

    const openCommentModal = (doc) => {
        setSelectedDocForComment(doc);
        loadComments(doc.id);
    };

    const openPreview = async (doc) => {
        if (!isAdmin || !doc?.file_url) return;
        setPreviewDoc({ id: doc.id, title: doc.title || 'Document', file_url: doc.file_url, previewBlobUrl: null, previewBlobType: null });
        const tryFetch = async (url) => {
            const res = await fetch(url, { credentials: 'include' });
            if (!res.ok) throw new Error(`Failed to load: ${res.status}`);
            return res;
        };
        try {
            const fetchUrl = getFetchUrl(doc.file_url);
            let res;
            try {
                res = await tryFetch(fetchUrl);
            } catch {
                res = await tryFetch(doc.file_url);
            }
            const contentType = res.headers.get('content-type') || '';
            const blob = await res.blob();
            const blobType = blob.type || (contentType.split(';')[0].trim()) || 'application/octet-stream';
            const blobForView = blob.type ? blob : new Blob([blob], { type: blobType });
            const blobUrl = URL.createObjectURL(blobForView);
            setPreviewDoc((prev) => prev ? { ...prev, previewBlobUrl: blobUrl, previewBlobType: blobType } : null);
        } catch (err) {
            setPreviewDoc((prev) => prev ? { ...prev, previewBlobUrl: 'failed' } : null);
        }
    };

    const closePreview = () => {
        if (previewDoc?.previewBlobUrl && previewDoc.previewBlobUrl !== 'failed') {
            URL.revokeObjectURL(previewDoc.previewBlobUrl);
        }
        setPreviewDoc(null);
    };

    // Fetch a doc's file for the Manage BAC folder popup (inline preview, no View/Update)
    const fetchDocForManagePopup = useCallback(async (doc) => {
        if (!doc?.file_url) {
            setManageFolderPopupPreview({ doc, previewBlobUrl: 'no-file', previewBlobType: null });
            return;
        }
        setManageFolderPopupPreview({ doc, previewBlobUrl: null, previewBlobType: null });
        const tryFetch = async (url) => {
            const res = await fetch(url, { credentials: 'include' });
            if (!res.ok) throw new Error(`Failed to load: ${res.status}`);
            return res;
        };
        try {
            const fetchUrl = getFetchUrl(doc.file_url);
            let res;
            try {
                res = await tryFetch(fetchUrl);
            } catch {
                res = await tryFetch(doc.file_url);
            }
            const contentType = res.headers.get('content-type') || '';
            const blob = await res.blob();
            const blobType = blob.type || (contentType.split(';')[0].trim()) || 'application/octet-stream';
            const blobForView = blob.type ? blob : new Blob([blob], { type: blobType });
            const blobUrl = URL.createObjectURL(blobForView);
            setManageFolderPopupPreview((prev) => {
                if (prev?.previewBlobUrl && prev.previewBlobUrl !== 'failed') URL.revokeObjectURL(prev.previewBlobUrl);
                return { doc, previewBlobUrl: blobUrl, previewBlobType: blobType };
            });
        } catch (err) {
            setManageFolderPopupPreview((prev) => {
                if (prev?.previewBlobUrl && prev.previewBlobUrl !== 'failed' && prev.previewBlobUrl !== 'no-file') URL.revokeObjectURL(prev.previewBlobUrl);
                return { doc, previewBlobUrl: 'failed', previewBlobType: null };
            });
        }
    }, []);

    // When BAC folder popup opens: load current doc (by index); when it closes: revoke and clear
    useEffect(() => {
        if (!manageFolderPopup) {
            setManageFolderPopupPreview((prev) => {
                if (prev?.previewBlobUrl && prev.previewBlobUrl !== 'failed' && prev.previewBlobUrl !== 'no-file') URL.revokeObjectURL(prev.previewBlobUrl);
                return null;
            });
            setManageFolderPopupIndex(0);
            return;
        }
        const docType = DOC_TYPES.find((d) => d.id === manageFolderPopup.typeId);
        const categoryName = (docType?.name || '').trim();
        const docs = documents.filter(
            (d) => (d.category || '').trim().toLowerCase() === categoryName.toLowerCase() && (d.prNo || '').trim() === manageFolderPopup.prNo
        );
        if (docs.length === 0) {
            setManageFolderPopupPreview(null);
            return;
        }
        const index = Math.min(manageFolderPopupIndex, docs.length - 1);
        fetchDocForManagePopup(docs[index]);
    }, [manageFolderPopup, documents, manageFolderPopupIndex, fetchDocForManagePopup]);

    const getFetchUrl = (url) => {
        if (!url) return url;
        // If it's already a relative path (e.g. /media/...), use as-is so Vite proxy can route to Django.
        if (url.startsWith('/')) return url;
        // If it's a full URL (http/https), strip host/port and keep only path + query
        try {
            const parsed = new URL(url);
            return parsed.pathname + parsed.search;
        } catch {
            return url;
        }
    };

    const getSuggestedExt = (url) => {
        if (!url || typeof url !== 'string') return '.pdf';
        const m = url.match(/\.([a-z0-9]+)(?:\?|$)/i);
        return m ? `.${m[1].toLowerCase()}` : '.pdf';
    };

    const triggerDownload = async (doc, { blob: existingBlob, blobUrl } = {}) => {
        if (!isAdmin) return;
        const r = { file_url: doc?.file_url, title: doc?.title };
        if (!r?.file_url && !blobUrl) return;
        const ext = getSuggestedExt(r?.file_url || blobUrl);
        const base = r?.title ? `${r.title.replace(/[/\\?%*:|"<>]/g, '_')}` : 'document';
        const suggestedName = base.endsWith(ext) ? base : `${base}${ext}`;

        const showPicker = typeof window.showSaveFilePicker === 'function';
        let handle = null;
        if (showPicker) {
            try {
                handle = await window.showSaveFilePicker({ suggestedName });
            } catch (err) {
                if (err?.name === 'AbortError') return;
            }
        }

        try {
            let blob;
            let contentDisposition = null;
            if (existingBlob instanceof Blob) {
                blob = existingBlob;
            } else if (blobUrl && typeof blobUrl === 'string' && blobUrl.startsWith('blob:')) {
                const res = await fetch(blobUrl);
                blob = await res.blob();
            } else {
                const fetchUrl = getFetchUrl(r.file_url);
                let res;
                try {
                    res = await fetch(fetchUrl, { credentials: 'include' });
                } catch {
                    res = await fetch(r.file_url, { credentials: 'include' });
                }
                if (!res.ok) throw new Error(`Failed to load: ${res.status}`);
                contentDisposition = res.headers.get('content-disposition');
                blob = await res.blob();
            }
            let filename = r?.title ? `${r.title.replace(/[/\\?%*:|"<>]/g, '_')}` : 'document';
            if (contentDisposition) {
                const match = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
                if (match) filename = match[1].replace(/['"]/g, '').trim() || filename;
            }
            const ext2 = blob.type?.includes('pdf') ? '.pdf' : blob.type?.includes('spreadsheet') || blob.type?.includes('excel') ? '.xlsx' : blob.type?.includes('msword') ? '.docx' : '.pdf';
            const finalName = filename.endsWith(ext2) ? filename : `${filename}${ext2}`;

            if (handle) {
                const writable = await handle.createWritable();
                await writable.write(blob);
                await writable.close();
            } else {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = finalName;
                a.click();
                URL.revokeObjectURL(url);
            }
        } catch (err) {
            if (r?.file_url) {
                const url = getFetchUrl(r.file_url);
                window.open(url, '_blank', 'noopener');
            }
        }
    };

    const openWorkflow = (prNo) => {
        setWorkflowPRNo(prNo);
    };

    const stepLabels = ['Document type', 'Sub-document', 'Details'];
    const stepIndex = newStep === 'docType' ? 0 : newStep === 'subDoc' ? 1 : 2;

    const openNew = () => {
        resetForm();
        setManualErrors({});
        setNewError('');
        setSelectedDocType(null);
        setSelectedSubDocType(null);
        setNewStep('docType');
        setAttendanceMembers([]);
        setAbstractBidders([]);
        setCertificateServiceProviders(['', '', '']);
        setActiveModal('new');
    };

    // Auto-fetch BAC members for Attendance Sheet
    useEffect(() => {
        if (!user) return;
        import('../services/api.js').then(({ userService }) => {
            userService.getBacMembers()
                .then((members) => {
                    setBacMembers(members || []);
                })
                .catch(() => setBacMembers([]));
        }).catch(() => setBacMembers([]));
    }, [user]);

    // Auto-populate attendanceMembers when Attendance Sheet is selected
    useEffect(() => {
        if (selectedSubDocType !== 'Attendance Sheet') return;

        const populateAttendance = async () => {
            if (bacMembers.length === 0) return;

            let initialPresent = {};
            if (selectedDoc?.attendance_members) {
                try {
                    const parsed = JSON.parse(selectedDoc.attendance_members);
                    if (Array.isArray(parsed)) {
                        parsed.forEach(m => {
                            initialPresent[m.name.toLowerCase().trim()] = m.present;
                        });
                    }
                } catch {}
            }

            const populated = bacMembers.map((u, index) => {
                const name = u.fullName || u.username || '';
                const present = initialPresent[name.toLowerCase().trim()] !== undefined ? initialPresent[name.toLowerCase().trim()] : false;
                return {
                    id: u.id || `temp-${index}`,
                    name,
                    present
                };
            });

            setAttendanceMembers(populated);
        };

        populateAttendance();
    }, [selectedSubDocType, bacMembers, selectedDoc?.attendance_members]);
    const openUpdate = () => {
        setActiveModal('updateList');
        setUpdateError('');
    };

    const openManage = async () => {
        setActiveModal('manage');
        setManageSelectedTypeId(null);
        setManageSelectedPrNo(null);
        setManageFolderPopup(null);
        setManageRefreshing(true);
        try {
            await load();
        } finally {
            setManageRefreshing(false);
        }
    };

    const handleChecklistSubDocClick = (subDocWithStatus) => {
        if (!subDocWithStatus.doc) return;
        setSelectedDoc(subDocWithStatus.doc);
        const rawDeadline = subDocWithStatus.doc.market_expected_delivery || '';
        const deadlineDate = rawDeadline ? rawDeadline.slice(0, 10) : '';
        const deadlineTime = rawDeadline && rawDeadline.length > 11 ? rawDeadline.slice(11, 16) : '';
        setForm({
            title: subDocWithStatus.doc.title || '',
            prNo: subDocWithStatus.doc.prNo || '',
            user_pr_no: subDocWithStatus.doc.user_pr_no ?? '',
            total_amount: subDocWithStatus.doc.total_amount != null ? String(subDocWithStatus.doc.total_amount) : '',
            source_of_fund: subDocWithStatus.doc.source_of_fund ?? '',
            ppmp_no: subDocWithStatus.doc.ppmp_no ?? '',
            app_no: subDocWithStatus.doc.app_no ?? '',
            app_type: subDocWithStatus.doc.app_type ?? '',
            certified_true_copy: !!subDocWithStatus.doc.certified_true_copy,
            certified_signed_by: subDocWithStatus.doc.certified_signed_by ?? '',
            market_budget: subDocWithStatus.doc.market_budget != null ? String(subDocWithStatus.doc.market_budget) : '',
            market_period_from: subDocWithStatus.doc.market_period_from ?? '',
            market_period_to: subDocWithStatus.doc.market_period_to ?? '',
            market_expected_delivery: subDocWithStatus.doc.market_expected_delivery ?? '',
            deadline_date: deadlineDate,
            deadline_time: deadlineTime,
            market_service_provider_1: subDocWithStatus.doc.market_service_provider_1 ?? '',
            market_service_provider_2: subDocWithStatus.doc.market_service_provider_2 ?? '',
            market_service_provider_3: subDocWithStatus.doc.market_service_provider_3 ?? '',
            office_division: subDocWithStatus.doc.office_division ?? '',
            received_by: subDocWithStatus.doc.received_by ?? '',
            date_received: formatDate(subDocWithStatus.doc.date_received) || '',
            attendance_members: subDocWithStatus.doc.attendance_members ?? '',
            resolution_no: subDocWithStatus.doc.resolution_no ?? '',
            winning_bidder: subDocWithStatus.doc.winning_bidder ?? '',
            resolution_option: subDocWithStatus.doc.resolution_option ?? '',
            venue: subDocWithStatus.doc.venue ?? '',
            aoq_no: subDocWithStatus.doc.aoq_no ?? '',
            contract_received_by_coa: !!subDocWithStatus.doc.contract_received_by_coa,
            contract_amount: subDocWithStatus.doc.contract_amount != null ? String(subDocWithStatus.doc.contract_amount) : '',
            notarized_place: subDocWithStatus.doc.notarized_place ?? '',
            notarized_date: formatDate(subDocWithStatus.doc.notarized_date) || '',
            ntp_service_provider: subDocWithStatus.doc.ntp_service_provider ?? '',
            ntp_authorized_rep: subDocWithStatus.doc.ntp_authorized_rep ?? '',
            ntp_received_by: subDocWithStatus.doc.ntp_received_by ?? '',
            oss_service_provider: subDocWithStatus.doc.oss_service_provider ?? '',
            oss_authorized_rep: subDocWithStatus.doc.oss_authorized_rep ?? '',
            secretary_service_provider: subDocWithStatus.doc.secretary_service_provider ?? '',
            secretary_owner_rep: subDocWithStatus.doc.secretary_owner_rep ?? '',
            category: subDocWithStatus.doc.category || '',
            subDoc: subDocWithStatus.doc.subDoc || '',
            date: formatDate(subDocWithStatus.doc.date) || '',
            file: null,
            status: subDocWithStatus.doc.status || 'pending',
        });
        if ((subDocWithStatus.doc.subDoc || '').trim() === 'Attendance Sheet' && subDocWithStatus.doc.attendance_members) {
            try {
                const parsed = JSON.parse(subDocWithStatus.doc.attendance_members);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    setAttendanceMembers(parsed.map((m, i) => ({ id: m.id ?? Date.now() + i, name: m.name || '', present: !!m.present })));
                } else {
                    setAttendanceMembers([]);
                }
            } catch {
                setAttendanceMembers([]);
            }
        } else {
            setAttendanceMembers([]);
        }
        if ((subDocWithStatus.doc.subDoc || '').trim() === 'Abstract of Quotation' && subDocWithStatus.doc.abstract_bidders) {
            try {
                const parsed = typeof subDocWithStatus.doc.abstract_bidders === 'string' 
                    ? JSON.parse(subDocWithStatus.doc.abstract_bidders) 
                    : subDocWithStatus.doc.abstract_bidders;
                if (Array.isArray(parsed) && parsed.length > 0) {
                    setAbstractBidders(parsed.map((b, i) => ({ 
                        id: b.id ?? Date.now() + i, 
                        name: b.name || '', 
                        amount: b.amount || '', 
                        remarks: b.remarks || '' 
                    })));
                } else {
                    setAbstractBidders([]);
                }
            } catch {
                setAbstractBidders([]);
            }
        } else {
            setAbstractBidders([]);
        }
        setUpdateError('');
        setActiveModal('update');
    };

    return (
        <div className="min-h-full pb-12">
            <PageHeader
                title="Document Encoding"
                subtitle={canViewAllDocuments
                    ? isAdmin
                        ? 'View all submitted documents. Status is updated automatically based on completeness. You may view or download files.'
                        : 'View documents for your procurements. Status is updated automatically based on completeness.'
                    : 'Create new procurement records and keep document details complete and updated.'}
            />

            <div className="content-section overflow-hidden rounded-xl w-full max-w-[96rem] mx-auto min-w-0 p-0">
                {canUploadDocuments && (
                    <div className="p-6 sm:p-8 bg-[var(--page-bg)]/50 border-b border-[var(--border-light)]">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div className="card relative flex flex-col sm:flex-row items-center gap-6 p-6 sm:p-8 hover:shadow-[var(--shadow-lg)] transition-all duration-300 group bg-white">
                                <div className="absolute top-0 left-0 w-1 h-full bg-[var(--primary)] rounded-l-xl opacity-80 group-hover:opacity-100 transition-opacity" />
                                <div className="min-w-0 flex-1">
                                    <h3 className="text-lg sm:text-xl font-bold text-[var(--text)] tracking-tight">Start New Procurement</h3>
                                    <p className="mt-2 text-[var(--text-muted)] text-sm leading-relaxed">
                                        Initiate a new procurement process by submitting the first set of documents.
                                    </p>
                                </div>
                                <button type="button" onClick={openNew} className="px-8 py-4 bg-emerald-600/90 hover:bg-emerald-700 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-emerald-500/20 backdrop-blur-md transition-all active:scale-95 flex items-center justify-center gap-2.5 w-full sm:w-auto">
                                    <MdUpload className="w-5 h-5" />
                                    <span>Start New Entry</span>
                                </button>
                            </div>
                            <div className="card relative flex flex-col sm:flex-row items-center gap-6 p-6 sm:p-8 hover:shadow-[var(--shadow-lg)] transition-all duration-300 group bg-white">
                                <div className="absolute top-0 left-0 w-1 h-full bg-orange-500 rounded-l-xl opacity-80 group-hover:opacity-100 transition-opacity" />
                                <div className="min-w-0 flex-1">
                                    <h3 className="text-lg sm:text-xl font-bold text-[var(--text)] tracking-tight">Update Procurement</h3>
                                    <p className="mt-2 text-[var(--text-muted)] text-sm leading-relaxed">
                                        Keep procurement folders complete by adding missing documents or updating details.
                                    </p>
                                </div>
                                <button type="button" onClick={openUpdate} className="px-8 py-4 bg-emerald-600/90 hover:bg-emerald-700 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-emerald-500/20 backdrop-blur-md transition-all active:scale-95 flex items-center justify-center gap-2.5 w-full sm:w-auto">
                                    <MdEdit className="w-5 h-5" />
                                    <span>Update</span>
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Table of all submitted documents */}
                <section className="min-w-0">
                    <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-[var(--border-light)] bg-[var(--background-subtle)]/50">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <h2 className="text-base sm:text-lg font-semibold text-[var(--text)] truncate">
                                {canViewAllDocuments ? 'All Uploaded Documents' : 'Submitted Documents'}
                            </h2>
                            {isAdmin && (
                                <button
                                    type="button"
                                    onClick={openManage}
                                    className="btn-secondary whitespace-nowrap"
                                >
                                    Manage Documents
                                </button>
                            )}
                        </div>
                            
                            {/* Search bar */}
                            <div className="mt-3">
                                <div className="relative">
                                    <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)]" />
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder="Search by title, transaction number, category, sub-document, or uploaded by..."
                                        className="input-field pl-10 pr-4 w-full"
                                    />
                                    {searchQuery && (
                                        <button
                                            type="button"
                                            onClick={() => setSearchQuery('')}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text)] transition-all duration-300 ease-out hover:scale-110 active:scale-95"
                                        >
                                            <MdClose className="w-5 h-5" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="overflow-x-auto table-scroll-wrap">
                            {loading ? (
                                <div className="flex flex-col items-center justify-center py-12 text-[var(--text-muted)]">
                                    <div className="w-10 h-10 rounded-full border-2 border-[var(--border)] border-t-[var(--primary)] animate-spin mb-3" aria-hidden />
                                    <p className="text-sm">Loading documents…</p>
                                </div>
                            ) : updateListDocs.length === 0 ? (
                                <div className="py-12 px-6 text-center">
                                    <MdDescription className="w-12 h-12 mx-auto text-[var(--text-subtle)] mb-3" />
                                    <p className="text-[var(--text-muted)] font-medium">No documents yet</p>
                                    <p className="text-sm text-[var(--text-subtle)] mt-1">
                                        {canUploadDocuments ? 'Start by creating a new procurement.' : 'No documents have been submitted yet.'}
                                    </p>
                                </div>
                            ) : filteredDocuments.length === 0 && filterStatus === 'pending' && pendingBreakdown.length > 0 ? (
                                <div className="space-y-4 p-4 sm:p-6">
                                    <div className="mb-2">
                                        <h2 className="text-lg font-bold text-[var(--text)]">Pending Documents</h2>
                                        <p className="text-sm text-[var(--text-muted)] mt-1">
                                            {pendingBreakdown.reduce((sum, f) => sum + f.missingCount, 0)} items pending across {pendingBreakdown.length} folder{pendingBreakdown.length !== 1 ? 's' : ''}
                                        </p>
                                    </div>
                                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                        {pendingBreakdown.map((folder) => (
                                            <button
                                                key={folder.prNo}
                                                type="button"
                                                onClick={() => setSelectedPendingFolder(folder)}
                                                className="group relative rounded-2xl border border-[var(--border-light)] bg-white p-5 shadow-sm hover:shadow-md hover:border-[var(--primary)] transition-all duration-300 ease-out text-left active:scale-95"
                                            >
                                                <div className="absolute top-0 left-0 w-1 h-full bg-[var(--primary)] rounded-l-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
                                                <div className="flex items-start justify-between mb-3">
                                                    <div className="flex-1">
                                                        <p className="font-bold text-[var(--text)] text-lg group-hover:text-[var(--primary)] transition-colors">{folder.prNo}</p>
                                                        <p className="text-xs text-[var(--text-muted)] mt-1 font-medium">{folder.procurementMethod}</p>
                                                    </div>
                                                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[var(--primary-muted)] flex items-center justify-center group-hover:bg-[var(--primary)] group-hover:text-white transition-all">
                                                        <MdWarning className="w-5 h-5 text-[var(--primary)]" />
                                                    </div>
                                                </div>
                                                <div className="inline-flex items-center rounded-full bg-[var(--primary-muted)] px-3 py-1.5 text-xs font-bold text-[var(--primary)] gap-1">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--primary)]" />
                                                    {folder.missingCount} pending
                                                </div>
                                                <p className="text-xs text-[var(--text-subtle)] mt-3 group-hover:text-[var(--text-muted)] transition-colors">View missing documents</p>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ) : filteredDocuments.length === 0 ? (
                                <div className="p-8 text-center text-[var(--text-muted)]">
                                    {filterStatus === 'complete' && 'No completed documents.'}
                                    {filterStatus === 'ongoing' && 'No ongoing documents.'}
                                    {filterStatus === 'pending' && 'No pending documents.'}
                                    {!filterStatus && pageHasActiveFilters && 'No documents match your filters.'}
                                </div>
                            ) : viewMode === 'grouped' ? (
                                // Grouped view by transaction number
                                <div className="divide-y divide-[var(--border-light)]">
                                    {paginatedGroupedEntries.map(([prNo, docs]) => {
                                        const isExpanded = expandedGroups.has(prNo);
                                        const statusCounts = docs.reduce((acc, doc) => {
                                            acc[doc.status] = (acc[doc.status] || 0) + 1;
                                            return acc;
                                        }, {});
                                        
                                        return (
                                            <div key={prNo} className="bg-[var(--surface)]">
                                                <button
                                                    type="button"
                                                    onClick={() => toggleGroup(prNo)}
                                                    className="w-full px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between hover:bg-[var(--background-subtle)] transition-all duration-300 ease-out text-left active:scale-[0.99]"
                                                >
                                                    <div className="flex items-center justify-between w-full min-w-0">
                                                        <div className="flex items-center gap-3 min-w-0 flex-1">
                                                            {isExpanded ? (
                                                                <MdExpandLess className="w-5 h-5 text-[var(--text-muted)] flex-shrink-0" />
                                                            ) : (
                                                                <MdExpandMore className="w-5 h-5 text-[var(--text-muted)] flex-shrink-0" />
                                                            )}
                                                            <div className="min-w-0 flex-1">
                                                                <p className="font-semibold text-[var(--text)]">
                                                                    BAC Folder No.: {prNo}
                                                                </p>
                                                                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                                                                    {docs.length} document{docs.length !== 1 ? 's' : ''} • 
                                                                    {statusCounts.complete && <span className="ml-1 text-green-600">{statusCounts.complete} complete</span>}
                                                                    {statusCounts.ongoing && <span className="ml-1 text-amber-600">{statusCounts.ongoing} ongoing</span>}
                                                                    {statusCounts.pending && <span className="ml-1 text-red-600">{statusCounts.pending} pending</span>}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                openWorkflow(prNo);
                                                            }}
                                                            className="ml-4 p-2 rounded-lg text-[var(--primary)] hover:bg-[var(--primary-muted)] transition-colors flex-shrink-0"
                                                            title="View workflow"
                                                        >
                                                            <MdTimeline className="w-5 h-5" />
                                                        </button>
                                                    </div>
                                                </button>
                                                {isExpanded && (
                                                    <div className="px-4 sm:px-6 pb-4 border-t border-[var(--border-light)]">
                                                        <table className="min-w-full divide-y divide-[var(--border)] w-full">
                                                            <thead className="table-header">
                                                                <tr>
                                                                    <th className="table-th">Title</th>
                                                                    <th className="table-th uppercase">Procurement Type</th>
                                                                    <th className="table-th uppercase">Date</th>
                                                                    <th className="table-th uppercase">Status</th>
                                                                    {isAdmin && <th className="table-th uppercase text-center">Action</th>}
                                                                </tr>
                                                            </thead>
                                                            <tbody className="bg-[var(--surface)] divide-y divide-[var(--border-light)]">
                                                                {docs.map((doc) => {
                                                                    const statusColor = getStatusColor(doc.status);
                                                                    const procurementType = getProcurementType(doc);

                                                                    return (
                                                                        <tr key={doc.id} className="hover:bg-[var(--background-subtle)]/50 transition-all duration-300 ease-out group">
                                                                            <td className="table-td font-medium">{doc.title || '—'}</td>
                                                                            <td className="table-td-muted">
                                                                                <div className="max-w-[200px] truncate" title={procurementType}>
                                                                                    {procurementType}
                                                                                </div>
                                                                            </td>
                                                                            <td className="table-td-muted">{formatDate(doc.date)}</td>
                                                                            <td className="table-td">
                                                                                <span className={`inline-flex items-center justify-center rounded-full px-3 py-1.5 text-xs font-medium border w-fit ${statusColor} capitalize`}>
                                                                                    {doc.status || 'pending'}
                                                                                </span>
                                                                            </td>
                                                                            {isAdmin && (
                                                                                <td className="table-td text-center">
                                                                                    <button
                                                                                        type="button"
                                                                                        onClick={() => handleView(doc)}
                                                                                        className="p-1.5 text-[var(--primary)] hover:bg-[var(--primary-muted)] rounded-lg transition-all"
                                                                                        title="View details"
                                                                                    >
                                                                                        <MdVisibility className="w-5 h-5" />
                                                                                    </button>
                                                                                </td>
                                                                            )}
                                                                        </tr>
                                                                    );
                                                                })}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                // List view
                                <table className="min-w-full divide-y divide-[var(--border)] w-full">
                                    <thead className="table-header">
                                        <tr>
                                            <th className="table-th">Title</th>
                                            <th className="table-th">BAC Folder No.</th>
                                            <th className="table-th">
                                                <button type="button" onClick={() => handleSort('category')} className="inline-flex items-center justify-center gap-1 font-semibold hover:text-[var(--primary)] uppercase w-full">
                                                    Procurement Type {sortKey === 'category' && (sortDir === 'asc' ? ' ↑' : ' ↓')}
                                                </button>
                                            </th>
                                            <th className="table-th">Uploaded By</th>
                                            <th className="table-th">
                                                <button type="button" onClick={() => handleSort('uploaded_at')} className="inline-flex items-center justify-center gap-1 font-semibold hover:text-[var(--primary)] uppercase w-full">
                                                    Date Submitted {sortKey === 'uploaded_at' && (sortDir === 'asc' ? ' ↑' : ' ↓')}
                                                </button>
                                            </th>
                                            <th className="table-th">
                                                <button type="button" onClick={() => handleSort('updated_at')} className="inline-flex items-center justify-center gap-1 font-semibold hover:text-[var(--primary)] uppercase w-full">
                                                    Last Updated {sortKey === 'updated_at' && (sortDir === 'asc' ? ' ↑' : ' ↓')}
                                                </button>
                                            </th>
                                            <th className="table-th">
                                                <button type="button" onClick={() => handleSort('status')} className="inline-flex items-center justify-center gap-1 font-semibold hover:text-[var(--primary)] uppercase w-full">
                                                    Status {sortKey === 'status' && (sortDir === 'asc' ? ' ↑' : ' ↓')}
                                                </button>
                                            </th>
                                            {isAdmin && <th className="table-th uppercase text-center">Action</th>}
                                        </tr>
                                    </thead>
                                    <tbody className="bg-[var(--surface)] divide-y divide-[var(--border-light)]">
                                        {paginatedDocuments.map((doc) => {
                                            const statusColor = getStatusColor(doc.status);
                                            
                                            return (
                                                <tr key={doc.id} className="hover:bg-[var(--background-subtle)]/50 transition-all duration-300 ease-out group">
                                                    <td className="table-td font-medium">{doc.title || '—'}</td>
                                                    <td className="table-td-muted">{doc.prNo || '—'}</td>
                                                    <td className="table-td-muted">
                                                        <div className="max-w-[200px] truncate" title={getProcurementType(doc)}>
                                                            {getProcurementType(doc)}
                                                        </div>
                                                    </td>
                                                    <td className="table-td-muted">{doc.uploadedBy || '—'}</td>
                                                    <td className="table-td-muted">{formatDate(doc.uploaded_at)}</td>
                                                    <td className="table-td-muted">{formatDate(doc.updated_at)}</td>
                                                    <td className="table-td">
                                                        <span className={`inline-flex items-center justify-center rounded-full px-3 py-1.5 text-xs font-medium border w-fit ${statusColor} capitalize`}>
                                                            {doc.status === 'complete' ? 'Completed' : doc.status === 'ongoing' ? 'Ongoing' : (doc.status || 'Pending')}
                                                        </span>
                                                    </td>
                                                    {isAdmin && (
                                                        <td className="table-td text-center">
                                                            <button
                                                                type="button"
                                                                onClick={() => handleView(doc)}
                                                                className="btn-action-primary bg-[var(--primary-muted)]/50"
                                                                title="View details"
                                                            >
                                                                <MdVisibility className="w-5 h-5" />
                                                                <span>View</span>
                                                            </button>
                                                        </td>
                                                    )}
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            )}
                            {(filteredDocuments.length > TABLE_PAGE_SIZE || groupedEntries.length > TABLE_PAGE_SIZE) && (
                                <div className="pagination-nav">
                                    <button
                                        type="button"
                                        onClick={() => setTablePage((p) => Math.max(1, p - 1))}
                                        disabled={tablePage <= 1}
                                        className="pagination-btn"
                                        aria-label="Previous page"
                                    >
                                        <MdChevronLeft className="w-5 h-5" />
                                    </button>
                                    <span className="pagination-info">
                                        Page {tablePage} of {viewMode === 'grouped' ? totalPagesGrouped : totalPagesList}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => setTablePage((p) => Math.min(viewMode === 'grouped' ? totalPagesGrouped : totalPagesList, p + 1))}
                                        disabled={tablePage >= (viewMode === 'grouped' ? totalPagesGrouped : totalPagesList)}
                                        className="pagination-btn"
                                        aria-label="Next page"
                                    >
                                        <MdChevronRight className="w-5 h-5" />
                                    </button>
                                </div>
                            )}
                        </div>
                    </section>
            </div>

            {/* New procurement multi-step modal — modularized */}
            <NewProcurementModal
                show={activeModal === 'new'}
                onClose={() => {
                    setActiveModal(null);
                    setNewStep('docType');
                    setSelectedDocType(null);
                    setSelectedSubDocType(null);
                    setManualErrors({});
                    resetForm();
                }}
                newStep={newStep}
                setNewStep={setNewStep}
                selectedDocType={selectedDocType}
                setSelectedDocType={setSelectedDocType}
                selectedSubDocType={selectedSubDocType}
                setSelectedSubDocType={setSelectedSubDocType}
                form={form}
                setForm={setForm}
                updateFormField={updateFormField}
                newFormErrors={newFormErrors}
                setManualErrors={setManualErrors}
                newSubmitting={newSubmitting}
                newError={newError}
                nextTransactionNumber={nextTransactionNumber}
                handleNewSubmit={handleNewSubmit}
                alreadyUploaded={alreadyUploaded}
                attendanceMembers={attendanceMembers}
                setAttendanceMembers={setAttendanceMembers}
                abstractBidders={abstractBidders}
                setAbstractBidders={setAbstractBidders}
                certificateServiceProviders={certificateServiceProviders}
                setCertificateServiceProviders={setCertificateServiceProviders}
                toLettersOnly={toLettersOnly}
                toNumbersOnly={toNumbersOnly}
                computeRFQNoFromDate={computeRFQNoFromDate}
            />


            {/* Manage Documents modal – document type folders → BAC Folder No. → documents */}
            <ManageDocumentsModal
                isOpen={activeModal === 'manage'}
                onClose={() => {
                    setActiveModal(null);
                    setManageSelectedTypeId(null);
                    setManageFolderPopup(null);
                }}
                manageSelectedTypeId={manageSelectedTypeId}
                setManageSelectedTypeId={setManageSelectedTypeId}
                manageSelectedPrNo={manageSelectedPrNo}
                setManageSelectedPrNo={setManageSelectedPrNo}
                manageFolderPopup={manageFolderPopup}
                setManageFolderPopup={setManageFolderPopup}
                manageFolderPopupPreview={manageFolderPopupPreview}
                manageFolderPopupIndex={manageFolderPopupIndex}
                setManageFolderPopupIndex={setManageFolderPopupIndex}
                manageRefreshing={manageRefreshing}
                documents={documents}
                DOC_TYPES={DOC_TYPES}
                isAdmin={isAdmin}
                triggerDownload={triggerDownload}
            />

            {/* Update documents selection modal – checklist by document type and sub-document */}
            <UpdateChecklistModal
                isOpen={activeModal === 'updateList'}
                onClose={() => {
                    setActiveModal(null);
                    setSelectedDoc(null);
                    setUpdateError('');
                }}
                loading={loading}
                documents={documents}
                updateChecklistData={updateChecklistData}
                onSubDocClick={handleChecklistSubDocClick}
            />

            {/* Update documents modal */}
            <UpdateDocumentModal
                isOpen={activeModal === 'update'}
                onClose={() => {
                    setActiveModal(null);
                    setSelectedDoc(null);
                    setUpdateError('');
                }}
                selectedDoc={selectedDoc}
                form={form}
                setForm={setForm}
                updateError={updateError}
                updateSubmitting={updateSubmitting}
                onSubmit={handleUpdateSubmit}
                attendanceMembers={attendanceMembers}
                setAttendanceMembers={setAttendanceMembers}
                abstractBidders={abstractBidders}
                setAbstractBidders={setAbstractBidders}
                triggerDownload={triggerDownload}
                user={user}
                isAdmin={isAdmin}
            />


            {/* View Details Modal */}
            {activeModal === 'view' && (
                <DocViewModal 
                    doc={selectedDoc} 
                    onClose={() => {
                        setActiveModal(null);
                        setSelectedDoc(null);
                    }} 
                />
            )}

            {/* Alert message pop-up */}
            <AlertModal 
                message={alertMessage} 
                onClose={() => setAlertMessage(null)} 
            />

            {/* Confirm dialog pop-up */}
            <ConfirmDialog 
                message={confirmDialog?.message} 
                onConfirm={() => {
                    confirmDialog?.onConfirm();
                    setConfirmDialog(null);
                }} 
                onCancel={() => setConfirmDialog(null)} 
            />

            {/* Document Preview Modal */}
            {previewDoc && (
                <PreviewModal 
                    doc={previewDoc} 
                    onClose={() => {
                        setPreviewSequence(null);
                        closePreview();
                    }} 
                />
            )}

            {/* Comments Modal */}
            <CommentModal 
                doc={selectedDocForComment} 
                comments={comments} 
                text={commentText} 
                setText={setCommentText} 
                onAdd={() => handleAddComment(selectedDocForComment.id)} 
                onClose={() => {
                    setSelectedDocForComment(null);
                    setCommentText('');
                }} 
            />

            {/* Workflow Visualization Modal */}
            <WorkflowModal 
                prNo={workflowPRNo} 
                documents={documents} 
                onClose={() => setWorkflowPRNo(null)} 
            />

            {/* Pending Folder Details Modal */}
            {selectedPendingFolder && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setSelectedPendingFolder(null)}>
                    <div className="rounded-3xl bg-white max-w-md w-full shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
                        {/* Header */}
                        <div className="relative bg-gradient-to-r from-[var(--primary)] to-[var(--primary-hover)] px-6 py-5 text-white">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-12 -mt-12" />
                            <button
                                type="button"
                                onClick={() => setSelectedPendingFolder(null)}
                                className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors"
                                aria-label="Close"
                            >
                                <MdClose className="w-6 h-6" />
                            </button>
                            <div className="relative z-10">
                                <h3 className="text-2xl font-bold">{selectedPendingFolder.prNo}</h3>
                                <p className="text-white/90 text-sm mt-1">{selectedPendingFolder.procurementMethod}</p>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="px-6 py-5">
                            <div className="flex items-center gap-2 mb-4 pb-4 border-b border-[var(--border-light)]">
                                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[var(--primary-muted)] flex items-center justify-center">
                                    <MdWarning className="w-4 h-4 text-[var(--primary)]" />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-[var(--text)]">Missing Documents</p>
                                    <p className="text-xs text-[var(--text-muted)]">{selectedPendingFolder.missingCount} item{selectedPendingFolder.missingCount !== 1 ? 's' : ''} to complete</p>
                                </div>
                            </div>
                            <div className="space-y-2.5 max-h-64 overflow-y-auto pr-2">
                                {selectedPendingFolder.missingSubDocs.map((subDoc, idx) => (
                                    <div key={idx} className="flex items-start gap-3 rounded-xl bg-[var(--background-subtle)] p-3.5 border border-[var(--border-light)] hover:border-[var(--primary-muted)] transition-colors">
                                        <div className="w-2 h-2 rounded-full bg-[var(--primary)] mt-1.5 flex-shrink-0" />
                                        <p className="text-sm text-[var(--text)] font-medium">{subDoc}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="border-t border-[var(--border-light)] px-6 py-4 bg-[var(--background-subtle)]/30 flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => setSelectedPendingFolder(null)}
                                className="btn-primary rounded-xl"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Encode;
