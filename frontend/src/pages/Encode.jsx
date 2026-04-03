import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { documentService, reportService } from '../services/api';
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

const Encode = ({ user }) => {
    const [searchParams] = useSearchParams();
    const [documents, setDocuments] = useState([]);
    const [loading, setLoading] = useState(true);
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
            const data = await documentService.getAll();
            const list = Array.isArray(data) ? data : (data?.results ?? []);
            // First-in-last-out ordering (newest uploads first)
            const sorted = [...list].sort((a, b) => {
                const aTime = a.uploaded_at ? new Date(a.uploaded_at).getTime() : 0;
                const bTime = b.uploaded_at ? new Date(b.uploaded_at).getTime() : 0;
                return bTime - aTime;
            });
            setDocuments(sorted);
        } catch (e) {
            setDocuments([]);
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

    const handleView = (doc) => {
        setSelectedDoc(doc);
        setActiveModal('view');
    };

    const isAdmin = user?.role === ROLES.ADMIN;
    const canViewAllDocuments = isAdmin; // Only admin can view/download documents; regular users cannot view files
    const canUploadDocuments = true; // Both admin and regular users see New Procurement and Update buttons
    
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
        } else if (sub === 'Invitation to COA') {
            if (!doc.date_received) missing.push('Date Received');
        } else if (sub === 'Attendance Sheet') {
            const members = Array.isArray(doc.attendance_members) ? doc.attendance_members : [];
            if (members.length === 0) missing.push('BAC Members List');
            else if (!members.some(m => m.present)) missing.push('At least one member Present');
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
            const subDocSlots = isRfq
                ? docType.subDocs.flatMap((header) =>
                    RFQ_PROCUREMENT_METHODS.map(({ value }) => `${header} - ${value}`)
                )
                : docType.subDocs;
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
                                <button type="button" onClick={openNew} className="btn-primary flex items-center justify-center gap-2.5 px-6 py-3.5 w-full sm:w-auto shadow-md">
                                    <MdUpload className="w-5 h-5" />
                                    <span>Start New Entry</span>
                                </button>
                            </div>
                            <div className="card relative flex flex-col sm:flex-row items-center gap-6 p-6 sm:p-8 hover:shadow-[var(--shadow-lg)] transition-all duration-300 group bg-white">
                                <div className="absolute top-0 left-0 w-1 h-full bg-orange-500 rounded-l-xl opacity-80 group-hover:opacity-100 transition-opacity" />
                                <div className="min-w-0 flex-1">
                                    <h3 className="text-lg sm:text-xl font-bold text-[var(--text)] tracking-tight">Update Records</h3>
                                    <p className="mt-2 text-[var(--text-muted)] text-sm leading-relaxed">
                                        Keep procurement folders complete by adding missing documents or updating details.
                                    </p>
                                </div>
                                <button type="button" onClick={openUpdate} className="btn-secondary flex items-center justify-center gap-2.5 px-6 py-3.5 w-full sm:w-auto border-[var(--border)] font-semibold shadow-sm">
                                    <MdEdit className="w-5 h-5 text-orange-500" />
                                    <span>Edit Existing</span>
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
                            <button
                                type="button"
                                onClick={openManage}
                                className="btn-secondary whitespace-nowrap"
                            >
                                Manage Documents
                            </button>
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
                                                                <MdVisibility className="w-4.5 h-4.5" />
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
                                <div className="flex items-center justify-center gap-3 py-3 border-t border-[var(--border-light)] bg-[var(--background-subtle)]/50">
                                    <button
                                        type="button"
                                        onClick={() => setTablePage((p) => Math.max(1, p - 1))}
                                        disabled={tablePage <= 1}
                                        className="p-2 border rounded-lg disabled:opacity-50"
                                        aria-label="Previous page"
                                    >
                                        <MdChevronLeft className="w-5 h-5" />
                                    </button>
                                    <span className="text-sm text-[var(--text-muted)]">
                                        Page {tablePage} of {viewMode === 'grouped' ? totalPagesGrouped : totalPagesList}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => setTablePage((p) => Math.min(viewMode === 'grouped' ? totalPagesGrouped : totalPagesList, p + 1))}
                                        disabled={tablePage >= (viewMode === 'grouped' ? totalPagesGrouped : totalPagesList)}
                                        className="p-2 border rounded-lg disabled:opacity-50"
                                        aria-label="Next page"
                                    >
                                        <MdChevronRight className="w-5 h-5" />
                                    </button>
                                </div>
                            )}
                        </div>
                    </section>
            </div>

            {/* New procurement multi-step modal */}
            {activeModal === 'new' && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
                    aria-modal="true"
                    role="dialog"
                >
                    <div className="card-elevated max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl rounded-2xl border-0">
                        <div className="p-6 border-b border-[var(--border-light)] flex flex-col gap-4 sticky top-0 bg-[var(--surface)] rounded-t-2xl z-10">
                            <div className="flex items-center justify-between">
                                <h2 className="text-lg font-semibold text-[var(--text)]">
                                    {newStep === 'docType' && 'Choose Document Type'}
                                    {newStep === 'subDoc' && 'Choose Sub-document'}
                                    {newStep === 'form' && (selectedSubDocType === 'Purchase Request' ? 'Fill Out Purchase Request Details' : selectedSubDocType === 'Activity Design' ? 'Fill Out Activity Design Details' : selectedSubDocType === 'Project Procurement Management Plan/Supplemental PPMP' ? 'Fill Out PPMP Details' : selectedSubDocType === 'Annual Procurement Plan' ? 'Fill Out Annual Procurement Plan Details' : selectedSubDocType === 'Market Scopping' ? 'Fill Out Market Scoping Details' : selectedSubDocType === 'Requisition and Issue Slip' ? 'Fill Out Requisition and Issue Slip Details' : selectedSubDocType === 'Notice of BAC Meeting' ? 'Fill Out Notice of BAC Meeting Details' : selectedSubDocType === 'Invitation to COA' ? 'Fill Out Invitation to COA Details' : selectedSubDocType === 'Attendance Sheet' ? 'Fill Out Attendance Sheet Details' : selectedSubDocType === 'Minutes of the Meeting' ? 'Fill Out Minutes of the Meeting Details' : selectedSubDocType === 'BAC Resolution' ? 'Fill Out BAC Resolution Details' : selectedSubDocType === 'Contract Services/Purchase Order' ? 'Fill Out Contract Services Details' : selectedSubDocType === 'Notice to Proceed' ? 'Fill Out Notice to Proceed Details' : selectedSubDocType === 'OSS' ? 'Fill Out OSS Details' : selectedSubDocType === "Applicable: Secretary's Certificate and Special Power of Attorney" ? "Fill Out Secretary's Certificate Details" : selectedSubDocType === 'PhilGEPS Posting of Award' ? 'Fill Out PhilGEPS Posting Details' : selectedSubDocType === 'Certificate of DILG R1 Website Posting of Award' ? 'Fill Out Certificate of DILG R1 Posting Details' : selectedSubDocType === 'Notice of Award (Posted)' ? 'Fill Out Notice of Award (Posted) Details' : selectedSubDocType === 'Abstract of Quotation (Posted)' ? 'Fill Out Abstract of Quotation (Posted) Details' : selectedSubDocType === 'BAC Resolution (Posted)' ? 'Fill Out BAC Resolution (Posted) Details' : 'Fill Out Procurement Details')}
                                </h2>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setActiveModal(null);
                                        setSelectedDocType(null);
                                        setSelectedSubDocType(null);
                                        setNewError('');
                                        setAttendanceMembers([]);
                                        setAbstractBidders([]);
                                    }}
                                    className="p-2 text-[var(--text-muted)] hover:bg-[var(--background-subtle)] hover:text-[var(--text)] rounded-lg transition-all duration-300 ease-out hover:scale-110 active:scale-95 focus:outline-none focus:ring-2 focus:ring-[var(--border)] focus:ring-offset-1"
                                    aria-label="Close"
                                >
                                    <MdClose className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="flex items-center gap-2" aria-label={`Step ${stepIndex + 1} of 3`}>
                                {[0, 1, 2].map((i) => (
                                    <span
                                        key={i}
                                        className={`h-1.5 flex-1 rounded-full transition-colors ${
                                            i <= stepIndex ? 'bg-[var(--primary)]' : 'bg-[var(--border)]'
                                        }`}
                                    />
                                ))}
                            </div>
                            <p className="text-xs text-[var(--text-muted)] font-medium">
                                Step {stepIndex + 1} of 3: {stepLabels[stepIndex]}
                            </p>
                        </div>

                        {/* Step 1: choose document type */}
                        {newStep === 'docType' && (
                            <div className="p-6 space-y-5">
                                <p className="text-sm text-[var(--text-muted)]">
                                    Select the main document type you want to upload for this new procurement.
                                </p>
                                <div className="grid gap-2">
                                    {DOC_TYPES.map((dt) => (
                                        <button
                                            key={dt.id}
                                            type="button"
                                            onClick={() => {
                                                setSelectedDocType(dt);
                                                setSelectedSubDocType(null);
                                                setForm((f) => ({ ...f, category: dt.name }));
                                                setNewStep('subDoc');
                                            }}
                                            className="w-full text-left px-4 py-3.5 rounded-xl border-2 border-[var(--border)] hover:border-[var(--primary)] hover:bg-[var(--primary-muted)]/50 transition-all duration-300 ease-out text-sm font-medium text-[var(--text)] hover:shadow-sm active:scale-[0.98]"
                                        >
                                            {dt.name}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Step 2: choose sub-document */}
                        {newStep === 'subDoc' && selectedDocType && (
                            <div className="p-6 space-y-5">
                                <div className="rounded-xl bg-[var(--background-subtle)] border border-[var(--border)] px-4 py-3">
                                    <p className="text-xs text-[var(--text-muted)] uppercase tracking-wide">Document type</p>
                                    <p className="font-semibold text-[var(--text)]">{selectedDocType.name}</p>
                                </div>
                                {form.prNo && (
                                    <div className="rounded-xl bg-teal-50 border border-teal-200 px-4 py-3 flex items-center gap-2">
                                        <MdCheckCircle className="w-5 h-5 flex-shrink-0 text-teal-600" aria-hidden />
                                        <p className="text-sm text-teal-800">Sub-documents already uploaded for transaction number {form.prNo} are marked below.</p>
                                    </div>
                                )}
                                <p className="text-sm text-[var(--text-muted)]">
                                    Choose the specific sub-document you are uploading.
                                </p>
                                <div className="grid gap-2">
                                    {selectedDocType.name === 'RFQ Concerns'
                                        ? (
                                            selectedDocType.subDocs.map((header) => (
                                                <div key={header} className="space-y-2">
                                                    <p className="text-sm font-semibold text-[var(--text)]">{header}</p>
                                                    <div className="grid gap-2">
                                                        {RFQ_PROCUREMENT_METHODS.map(({ value, label }) => {
                                                            const sd = `${header} - ${value}`;
                                                            const alreadyUploaded =
                                                                (form.prNo || '') &&
                                                                documents.some(
                                                                    (d) =>
                                                                        (d.prNo || '') === (form.prNo || '') &&
                                                                        (d.category || '').trim() === (selectedDocType.name || '').trim() &&
                                                                        (d.subDoc || '').trim() === (sd || '').trim()
                                                                );
                                                            return (
                                                                <button
                                                                    key={sd}
                                                                    type="button"
                                                                    disabled={alreadyUploaded}
                                                                    onClick={() => {
                                                                        if (alreadyUploaded) return;
                                                                        setSelectedSubDocType(sd);
                                                                        // Title/purpose is encoded by the user; leave input empty
                                                                        setForm((f) => ({ ...f, subDoc: sd }));
                                                                        setNewStep('form');
                                                                    }}
                                                                    aria-disabled={alreadyUploaded}
                                                                    aria-describedby={alreadyUploaded ? `subdoc-${sd.replace(/\s/g, '-')}-hint` : undefined}
                                                                    className={`w-full text-left px-4 py-3.5 rounded-xl border-2 transition-all duration-300 ease-out text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-1 flex items-center justify-between gap-3 ${
                                                                        alreadyUploaded
                                                                            ? 'border-[var(--border)] bg-[var(--background-subtle)] text-[var(--text-muted)] opacity-75 cursor-not-allowed'
                                                                            : 'border-[var(--border)] hover:border-[var(--primary)] hover:bg-[var(--primary-muted)]/50 active:bg-[var(--primary-muted)] text-[var(--text)] hover:shadow-sm focus:ring-[var(--primary)] active:scale-[0.98]'
                                                                    }`}
                                                                >
                                                                    <span>{label}</span>
                                                                    {alreadyUploaded && (
                                                                        <span id={`subdoc-${sd.replace(/\s/g, '-')}-hint`} className="flex items-center gap-1.5 text-xs font-semibold text-teal-700 bg-teal-100 px-2.5 py-1 rounded-md shrink-0">
                                                                            <MdCheckCircle className="w-4 h-4" aria-hidden />
                                                                            Already submitted
                                                                        </span>
                                                                    )}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            ))
                                        )
                                        : (
                                            selectedDocType.subDocs.map((sd) => {
                                                const alreadyUploaded =
                                                    (form.prNo || '') &&
                                                    documents.some(
                                                        (d) =>
                                                            (d.prNo || '') === (form.prNo || '') &&
                                                            (d.category || '').trim() === (selectedDocType.name || '').trim() &&
                                                            (d.subDoc || '').trim() === (sd || '').trim()
                                                    );
                                                return (
                                                    <button
                                                        key={sd}
                                                        type="button"
                                                        disabled={alreadyUploaded}
                                                        onClick={() => {
                                                            if (alreadyUploaded) return;
                                                            setSelectedSubDocType(sd);
                                                            updateFormField('subDoc', sd);
                                                            setNewStep('form');
                                                        }}
                                                        aria-disabled={alreadyUploaded}
                                                        aria-describedby={alreadyUploaded ? `subdoc-${sd.replace(/\s/g, '-')}-hint` : undefined}
                                                        className={`w-full text-left px-4 py-3.5 rounded-xl border-2 transition-all duration-300 ease-out text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-1 flex items-center justify-between gap-3 ${
                                                            alreadyUploaded
                                                                ? 'border-[var(--border)] bg-[var(--background-subtle)] text-[var(--text-muted)] opacity-75 cursor-not-allowed'
                                                                : 'border-[var(--border)] hover:border-[var(--primary)] hover:bg-[var(--primary-muted)]/50 active:bg-[var(--primary-muted)] text-[var(--text)] hover:shadow-sm focus:ring-[var(--primary)] active:scale-[0.98]'
                                                        }`}
                                                    >
                                                        <span>{sd}</span>
                                                        {alreadyUploaded && (
                                                            <span id={`subdoc-${sd.replace(/\s/g, '-')}-hint`} className="flex items-center gap-1.5 text-xs font-semibold text-teal-700 bg-teal-100 px-2.5 py-1 rounded-md shrink-0">
                                                                <MdCheckCircle className="w-4 h-4" aria-hidden />
                                                                Already submitted
                                                            </span>
                                                        )}
                                                    </button>
                                                );
                                            })
                                        )}
                                </div>
                                <div className="flex justify-between pt-2">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSelectedSubDocType(null);
                                            setNewStep('docType');
                                        }}
                                        className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--primary)] hover:text-[var(--primary-hover)] px-3 py-1.5 rounded-lg border border-transparent hover:border-[var(--primary-muted)] hover:bg-[var(--primary-muted)]/20 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-1"
                                    >
                                        <MdChevronLeft className="w-4 h-4" aria-hidden="true" />
                                        Back
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Step 3: fill out details */}
                        {newStep === 'form' && (
                            <form onSubmit={handleNewSubmit} className="p-6 space-y-5">
                                {newError && (
                                    <div className="flex items-start gap-3 rounded-xl border-2 border-red-300 bg-red-50 px-4 py-3.5" role="alert">
                                        <MdError className="w-5 h-5 flex-shrink-0 text-red-600 mt-0.5" aria-hidden />
                                        <p className="text-sm font-semibold text-red-800">{newError}</p>
                                    </div>
                                )}

                                <div className="text-sm text-[var(--text-muted)] bg-[var(--background-subtle)] border border-[var(--border)] rounded-xl px-4 py-3.5 space-y-1.5">
                                    <p>
                                        Document type:{' '}
                                        <span className="font-semibold text-[var(--text)]">
                                            {selectedDocType?.name || '—'}
                                        </span>
                                    </p>
                                    <p>
                                        Sub-document:{' '}
                                        <span className="font-semibold text-[var(--text)]">
                                            {selectedSubDocType || '—'}
                                        </span>
                                    </p>
                                </div>

                                {/* PHILGEPS & Certificate of DILG RFQ Concerns special handling */}
                                {selectedDocType?.name === 'RFQ Concerns' && selectedSubDocType?.startsWith('PHILGEPS - Lease of Venue') ? (
                                    <>
                                        <div>
                                            <label className="label">Purpose <span className="text-red-600 font-semibold" aria-label="required">*</span></label>
                                            <input
                                                type="text"
                                                value={form.title}
                                                onChange={(e) => {
                                                    const value = toLettersOnly(e.target.value);
                                                    setForm((f) => ({ ...f, title: value }));
                                                    if (newFormErrors.title) setManualErrors((e2) => ({ ...e2, title: '' }));
                                                }}
                                                className={`input-field ${newFormErrors.title ? 'border-2 border-red-500 bg-red-50/50 ring-2 ring-red-200' : ''}`}
                                                placeholder="Purpose of the PHILGEPS posting"
                                                aria-invalid={!!newFormErrors.title}
                                            />
                                            {newFormErrors.title && (
                                                <p className="mt-1.5 flex items-center gap-2 text-sm font-medium text-red-700" role="alert">
                                                    <MdError className="w-4 h-4 flex-shrink-0" aria-hidden />
                                                    {newFormErrors.title}
                                                </p>
                                            )}
                                        </div>
                                        <div>
                                            <label className="label">Date <span className="text-red-600 font-semibold" aria-label="required">*</span></label>
                                            <input
                                                type="date"
                                                value={form.date}
                                                onChange={(e) => {
                                                    const newDate = e.target.value;
                                                    setForm((f) => ({
                                                        ...f,
                                                        date: newDate,
                                                        user_pr_no: computeRFQNoFromDate(newDate),
                                                    }));
                                                    if (newFormErrors.date) setManualErrors((e2) => ({ ...e2, date: '' }));
                                                }}
                                                className={`input-field ${newFormErrors.date ? 'border-2 border-red-500 bg-red-50/50 ring-2 ring-red-200' : ''}`}
                                                aria-invalid={!!newFormErrors.date}
                                            />
                                            {newFormErrors.date && (
                                                <p className="mt-1.5 flex items-center gap-2 text-sm font-medium text-red-700" role="alert">
                                                    <MdError className="w-4 h-4 flex-shrink-0" aria-hidden />
                                                    {newFormErrors.date}
                                                </p>
                                            )}
                                        </div>
                                    </>
                                ) : selectedDocType?.name === 'RFQ Concerns' && selectedSubDocType === 'PHILGEPS - Lease of Venue' ? (
                                    <>
                                        <div className="text-sm text-[var(--text-muted)] mt-2 p-4 bg-green-50 rounded-xl border border-green-100 flex items-start gap-3">
                                            <MdInfo className="w-5 h-5 text-green-600 mt-0.5" aria-hidden />
                                            <span>
                                                No file or data is required for <strong>{selectedSubDocType}</strong>. Click <span className="font-semibold text-green-700">Submit</span> below to save; the document will automatically be marked complete.
                                            </span>
                                        </div>
                                    </>
                                ) : selectedDocType?.name === 'RFQ Concerns' && selectedSubDocType?.startsWith('PHILGEPS - ') ? (
                                    <>
                                        <div>
                                            <label className="label">Date <span className="text-red-600 font-semibold" aria-label="required">*</span></label>
                                            <input
                                                type="date"
                                                value={form.date}
                                                onChange={(e) => {
                                                    const newDate = e.target.value;
                                                    setForm((f) => ({
                                                        ...f,
                                                        date: newDate,
                                                        user_pr_no: computeRFQNoFromDate(newDate),
                                                    }));
                                                    if (newFormErrors.date) setManualErrors((e2) => ({ ...e2, date: '' }));
                                                }}
                                                className={`input-field ${newFormErrors.date ? 'border-2 border-red-500 bg-red-50/50 ring-2 ring-red-200' : ''}`}
                                                aria-invalid={!!newFormErrors.date}
                                                aria-describedby={newFormErrors.date ? 'err-date' : undefined}
                                            />
                                            {newFormErrors.date && (
                                                <p id="err-date" className="mt-1.5 flex items-center gap-2 text-sm font-medium text-red-700" role="alert">
                                                    <MdError className="w-4 h-4 flex-shrink-0" aria-hidden />
                                                    {newFormErrors.date}
                                                </p>
                                            )}
                                        </div>
                                        <div>
                                            <label className="label">Upload <span className="text-red-600 font-semibold" aria-label="required">*</span></label>
                                            <div className="flex flex-wrap items-center gap-2">
                                                <input
                                                    type="file"
                                                    onChange={(e) => {
                                                        setForm((f) => ({ ...f, file: e.target.files?.[0] ?? null }));
                                                        if (newFormErrors.file) setManualErrors((e2) => ({ ...e2, file: '' }));
                                                    }}
                                                    className={`input-field py-1.5 file:mr-3 file:py-1.5 file:px-4 file:rounded-lg file:border-0 file:bg-[#16a34a] file:hover:bg-[#15803d] file:active:bg-[#166534] file:text-white file:font-semibold file:cursor-pointer file:transition-colors file:duration-200 flex-1 min-w-0 ${newFormErrors.file ? 'border-2 border-red-500 bg-red-50/50 ring-2 ring-red-200' : ''}`}
                                                    accept=".pdf,.doc,.docx,.xls,.xlsx"
                                                    aria-invalid={!!newFormErrors.file}
                                                    aria-describedby={newFormErrors.file ? 'err-file' : undefined}
                                                />
                                            </div>
                                            {newFormErrors.file && (
                                                <p id="err-file" className="mt-1.5 flex items-center gap-2 text-sm font-medium text-red-700" role="alert">
                                                    <MdError className="w-4 h-4 flex-shrink-0" aria-hidden />
                                                    {newFormErrors.file}
                                                </p>
                                            )}
                                        </div>
                                    </>
                                ) : selectedDocType?.name === 'RFQ Concerns' && selectedSubDocType?.startsWith('Certificate of DILG - Lease of Venue') ? (
                                    <>
                                        <div>
                                            <label className="label">Title/Purpose <span className="text-red-600 font-semibold" aria-label="required">*</span></label>
                                            <input
                                                type="text"
                                                value={form.title}
                                                onChange={(e) => {
                                                    const value = toLettersOnly(e.target.value);
                                                    setForm((f) => ({ ...f, title: value }));
                                                    if (newFormErrors.title) setManualErrors((e2) => ({ ...e2, title: '' }));
                                                }}
                                                className={`input-field ${newFormErrors.title ? 'border-2 border-red-500 bg-red-50/50 ring-2 ring-red-200' : ''}`}
                                                placeholder="Purpose of the DILG Certificate"
                                                aria-invalid={!!newFormErrors.title}
                                            />
                                            {newFormErrors.title && (
                                                <p className="mt-1.5 flex items-center gap-2 text-sm font-medium text-red-700" role="alert">
                                                    <MdError className="w-4 h-4 flex-shrink-0" aria-hidden />
                                                    {newFormErrors.title}
                                                </p>
                                            )}
                                        </div>
                                        <div>
                                            <label className="label">Date <span className="text-red-600 font-semibold" aria-label="required">*</span></label>
                                            <input
                                                type="date"
                                                value={form.date}
                                                onChange={(e) => {
                                                    setForm((f) => ({ ...f, date: e.target.value }));
                                                    if (newFormErrors.date) setManualErrors((e2) => ({ ...e2, date: '' }));
                                                }}
                                                className={`input-field ${newFormErrors.date ? 'border-2 border-red-500 bg-red-50/50 ring-2 ring-red-200' : ''}`}
                                                aria-invalid={!!newFormErrors.date}
                                            />
                                            {newFormErrors.date && (
                                                <p className="mt-1.5 flex items-center gap-2 text-sm font-medium text-red-700" role="alert">
                                                    <MdError className="w-4 h-4 flex-shrink-0" aria-hidden />
                                                    {newFormErrors.date}
                                                </p>
                                            )}
                                        </div>
                                    </>
                                ) : selectedDocType?.name === 'RFQ Concerns' &&
                                  selectedSubDocType?.startsWith('Certificate of DILG - Small Value Procurement') ? (
                                    <>
                                        <div>
                                            <label className="label">Title/Purpose <span className="text-red-600 font-semibold" aria-label="required">*</span></label>
                                            <input
                                                type="text"
                                                value={form.title}
                                                onChange={(e) => {
                                                    const value = toLettersOnly(e.target.value);
                                                    setForm((f) => ({ ...f, title: value }));
                                                    if (newFormErrors.title) setManualErrors((e2) => ({ ...e2, title: '' }));
                                                }}
                                                className={`input-field ${newFormErrors.title ? 'border-2 border-red-500 bg-red-50/50 ring-2 ring-red-200' : ''}`}
                                                placeholder="Purpose of the DILG Certificate"
                                                aria-invalid={!!newFormErrors.title}
                                            />
                                            {newFormErrors.title && (
                                                <p className="mt-1.5 flex items-center gap-2 text-sm font-medium text-red-700" role="alert">
                                                    <MdError className="w-4 h-4 flex-shrink-0" aria-hidden />
                                                    {newFormErrors.title}
                                                </p>
                                            )}
                                        </div>
                                        <div>
                                            <label className="label">Date <span className="text-red-600 font-semibold" aria-label="required">*</span></label>
                                            <input
                                                type="date"
                                                value={form.date}
                                                onChange={(e) => {
                                                    setForm((f) => ({ ...f, date: e.target.value }));
                                                    if (newFormErrors.date) setManualErrors((e2) => ({ ...e2, date: '' }));
                                                }}
                                                className={`input-field ${newFormErrors.date ? 'border-2 border-red-500 bg-red-50/50 ring-2 ring-red-200' : ''}`}
                                                aria-invalid={!!newFormErrors.date}
                                                aria-describedby={newFormErrors.date ? 'err-date' : undefined}
                                            />
                                            {newFormErrors.date && (
                                                <p id="err-date" className="mt-1.5 flex items-center gap-2 text-sm font-medium text-red-700" role="alert">
                                                    <MdError className="w-4 h-4 flex-shrink-0" aria-hidden />
                                                    {newFormErrors.date}
                                                </p>
                                            )}
                                        </div>
                                        <div>
                                            <label className="label">RFQ No.</label>
                                            <input
                                                type="text"
                                                value={form.user_pr_no}
                                                readOnly
                                                className="input-field bg-[var(--background-subtle)] cursor-default"
                                                placeholder={form.date ? computeRFQNoFromDate(form.date) : 'Auto-generated from date'}
                                                aria-readonly="true"
                                            />
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            <div>
                                                <label className="label">Deadline Date <span className="text-red-600 font-semibold" aria-label="required">*</span></label>
                                                <input
                                                    type="date"
                                                    value={form.deadline_date}
                                                    onChange={(e) => setForm((f) => ({ ...f, deadline_date: e.target.value }))}
                                                    className="input-field"
                                                />
                                            </div>
                                            <div>
                                                <label className="label">Deadline Time <span className="text-red-600 font-semibold" aria-label="required">*</span></label>
                                                <input
                                                    type="time"
                                                    value={form.deadline_time}
                                                    onChange={(e) => setForm((f) => ({ ...f, deadline_time: e.target.value }))}
                                                    className="input-field"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="label">Service Providers <span className="text-red-600 font-semibold">*</span> (all 3 required)</label>
                                            <div className="space-y-2">
                                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                                    {certificateServiceProviders.map((sp, idx) => (
                                                        <input
                                                            key={idx}
                                                            type="text"
                                                            value={sp}
                                                            onChange={(e) => {
                                                                const next = [...certificateServiceProviders];
                                                                next[idx] = e.target.value;
                                                                setCertificateServiceProviders(next);
                                                            }}
                                                            className="input-field"
                                                            placeholder={`Provider ${idx + 1}`}
                                                        />
                                                    ))}
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => setCertificateServiceProviders((prev) => [...prev, ''])}
                                                    className="text-xs font-medium text-[var(--primary)] hover:text-[var(--primary-hover)] hover:underline"
                                                >
                                                    + Add another provider
                                                </button>
                                            </div>
                                        </div>
                                        <div className="text-sm text-[var(--text-muted)] mt-2 p-4 bg-green-50 rounded-xl border border-green-100 flex items-start gap-3">
                                            <MdInfo className="w-5 h-5 text-green-600 mt-0.5" aria-hidden />
                                            <span>
                                                No file is required for <strong>{selectedSubDocType}</strong>. Click <span className="font-semibold text-green-700">Submit</span> below to save; the document will be marked complete as long as the deadline details and providers are complete.
                                            </span>
                                        </div>
                                    </>
                                ) : selectedSubDocType === 'Purchase Request' || selectedSubDocType === 'Activity Design' || selectedSubDocType === 'Project Procurement Management Plan/Supplemental PPMP' ? (
                                    <>
                                        <div>
                                            <label className="label">BAC Folder No.</label>
                                            <input
                                                type="text"
                                                readOnly
                                                value={nextTransactionNumber ?? '…'}
                                                className="input-field bg-[var(--background-subtle)] cursor-default"
                                                aria-readonly="true"
                                            />
                                        </div>
                                        <div>
                                            <label className="label">Title/Purpose <span className="text-red-600 font-semibold" aria-label="required">*</span></label>

                                            <input
                                                type="text"
                                                value={form.title}
                                                onChange={(e) => {
                                                    const value = toLettersOnly(e.target.value);
                                                    setForm((f) => ({ ...f, title: value }));
                                                    if (newFormErrors.title) setManualErrors((e2) => ({ ...e2, title: '' }));
                                                }}
                                                className={`input-field ${newFormErrors.title ? 'border-2 border-red-500 bg-red-50/50 ring-2 ring-red-200' : ''}`}
                                                placeholder="Document title/purpose"
                                                aria-invalid={!!newFormErrors.title}
                                                aria-describedby={newFormErrors.title ? 'err-title' : undefined}
                                            />
                                            {newFormErrors.title && (
                                                <p id="err-title" className="mt-1.5 flex items-center gap-2 text-sm font-medium text-red-700" role="alert">
                                                    <MdError className="w-4 h-4 flex-shrink-0" aria-hidden />
                                                    {newFormErrors.title}
                                                </p>
                                            )}
                                        </div>
                                        <div>
                                            <label className="label">PR No.</label>
                                            <input
                                                type="text"
                                                value={form.user_pr_no}
                                                onChange={(e) => setForm((f) => ({ ...f, user_pr_no: toNumbersOnly(e.target.value) }))}
                                                className="input-field"
                                                placeholder="Enter PR number"
                                            />
                                        </div>
                                        <div>
                                            <label className="label">Date <span className="text-red-600 font-semibold" aria-label="required">*</span></label>
                                            <input
                                                type="date"
                                                value={form.date}
                                                onChange={(e) => {
                                                    setForm((f) => ({ ...f, date: e.target.value }));
                                                    if (newFormErrors.date) setManualErrors((e2) => ({ ...e2, date: '' }));
                                                }}
                                                className={`input-field ${newFormErrors.date ? 'border-2 border-red-500 bg-red-50/50 ring-2 ring-red-200' : ''}`}
                                                aria-invalid={!!newFormErrors.date}
                                                aria-describedby={newFormErrors.date ? 'err-date' : undefined}
                                            />
                                            {newFormErrors.date && (
                                                <p id="err-date" className="mt-1.5 flex items-center gap-2 text-sm font-medium text-red-700" role="alert">
                                                    <MdError className="w-4 h-4 flex-shrink-0" aria-hidden />
                                                    {newFormErrors.date}
                                                </p>
                                            )}
                                        </div>
                                        <div>
                                            <label className="label">Total Amount</label>
                                            <div className="flex items-center border border-[var(--border)] rounded-[var(--radius-sm)] bg-[var(--surface)] overflow-hidden focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
                                                <span className="pl-4 text-[var(--text)] font-medium" aria-hidden="true">₱</span>
                                                <input
                                                    type="text"
                                                    inputMode="decimal"
                                                    value={form.total_amount}
                                                    onChange={(e) => setForm((f) => ({ ...f, total_amount: toNumbersOnly(e.target.value) }))}
                                                    onBlur={() => {
                                                        setForm((f) => {
                                                            const raw = String(f.total_amount || '').trim();
                                                            if (!raw) return f;
                                                            const num = Number(raw);
                                                            if (Number.isNaN(num)) return f;
                                                            return { ...f, total_amount: num.toFixed(2) };
                                                        });
                                                    }}
                                                    className="input-field input-currency border-0 rounded-none focus:ring-0 focus:shadow-none w-full min-w-0"
                                                    placeholder="0.00"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="label">Upload <span className="text-red-600 font-semibold" aria-label="required">*</span></label>
                                            <div className="flex flex-wrap items-center gap-2">
                                                <input
                                                    type="file"
                                                    onChange={(e) => {
                                                        setForm((f) => ({ ...f, file: e.target.files?.[0] ?? null }));
                                                        if (newFormErrors.file) setManualErrors((e2) => ({ ...e2, file: '' }));
                                                    }}
                                                    className={`input-field py-1.5 file:mr-3 file:py-1.5 file:px-4 file:rounded-lg file:border-0 file:bg-[#16a34a] file:hover:bg-[#15803d] file:active:bg-[#166534] file:text-white file:font-semibold file:cursor-pointer file:transition-colors file:duration-200 flex-1 min-w-0 ${newFormErrors.file ? 'border-2 border-red-500 bg-red-50/50 ring-2 ring-red-200' : ''}`}
                                                    accept=".pdf,.doc,.docx,.xls,.xlsx"
                                                    aria-invalid={!!newFormErrors.file}
                                                    aria-describedby={newFormErrors.file ? 'err-file' : undefined}
                                                />
                                            </div>
                                            {newFormErrors.file && (
                                                <p id="err-file" className="mt-1.5 flex items-center gap-2 text-sm font-medium text-red-700" role="alert">
                                                    <MdError className="w-4 h-4 flex-shrink-0" aria-hidden />
                                                    {newFormErrors.file}
                                                </p>
                                            )}
                                        </div>
                                    </>
                                ) : selectedSubDocType === 'Annual Procurement Plan' ? (
                                    <>
                                        <div>
                                            <label className="label">BAC Folder No.</label>
                                            <input
                                                type="text"
                                                readOnly
                                                value={nextTransactionNumber ?? '…'}
                                                className="input-field bg-[var(--background-subtle)] cursor-default"
                                                aria-readonly="true"
                                            />
                                        </div>
                                        <div>
                                            <label className="label">Title <span className="text-red-600 font-semibold" aria-label="required">*</span></label>
                                            <input
                                                type="text"
                                                value={form.title}
                                                onChange={(e) => {
                                                    const value = toLettersOnly(e.target.value);
                                                    setForm((f) => ({ ...f, title: value }));
                                                    if (newFormErrors.title) setManualErrors((e2) => ({ ...e2, title: '' }));
                                                }}
                                                className={`input-field ${newFormErrors.title ? 'border-2 border-red-500 bg-red-50/50 ring-2 ring-red-200' : ''}`}
                                                placeholder="Document title"
                                                aria-invalid={!!newFormErrors.title}
                                                aria-describedby={newFormErrors.title ? 'err-title' : undefined}
                                            />
                                            {newFormErrors.title && (
                                                <p id="err-title" className="mt-1.5 flex items-center gap-2 text-sm font-medium text-red-700" role="alert">
                                                    <MdError className="w-4 h-4 flex-shrink-0" aria-hidden />
                                                    {newFormErrors.title}
                                                </p>
                                            )}
                                        </div>
                                        <div>
                                            <label className="label">Date <span className="text-red-600 font-semibold" aria-label="required">*</span></label>
                                            <input
                                                type="date"
                                                value={form.date}
                                                onChange={(e) => {
                                                    setForm((f) => ({ ...f, date: e.target.value }));
                                                    if (newFormErrors.date) setManualErrors((e2) => ({ ...e2, date: '' }));
                                                }}
                                                className={`input-field ${newFormErrors.date ? 'border-2 border-red-500 bg-red-50/50 ring-2 ring-red-200' : ''}`}
                                                aria-invalid={!!newFormErrors.date}
                                            />
                                            {newFormErrors.date && (
                                                <p id="err-date" className="mt-1.5 flex items-center gap-2 text-sm font-medium text-red-700" role="alert">
                                                    <MdError className="w-4 h-4 flex-shrink-0" aria-hidden />
                                                    {newFormErrors.date}
                                                </p>
                                            )}
                                        </div>
                                        <div>
                                            <label className="label">APP No.</label>
                                            <select
                                                value={form.app_type}
                                                onChange={(e) => setForm((f) => ({ ...f, app_type: e.target.value }))}
                                                className="input-field"
                                            >
                                                <option value="">Select</option>
                                                <option value="Final">Final</option>
                                                <option value="Updated">Updated</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="label">Certified True Copy?</label>
                                            <div className="flex items-center gap-3">
                                                <label className="flex items-center gap-2 cursor-pointer">
                                                    <input
                                                        type="radio"
                                                        name="certified_true_copy_app"
                                                        checked={form.certified_true_copy === true}
                                                        onChange={() => setForm((f) => ({ ...f, certified_true_copy: true }))}
                                                        className="rounded border-[var(--border)] text-[var(--primary)] focus:ring-[var(--primary)]"
                                                    />
                                                    <span className="text-sm text-[var(--text)]">Yes</span>
                                                </label>
                                                <label className="flex items-center gap-2 cursor-pointer">
                                                    <input
                                                        type="radio"
                                                        name="certified_true_copy_app"
                                                        checked={form.certified_true_copy === false}
                                                        onChange={() => setForm((f) => ({ ...f, certified_true_copy: false, certified_signed_by: '' }))}
                                                        className="rounded border-[var(--border)] text-[var(--primary)] focus:ring-[var(--primary)]"
                                                    />
                                                    <span className="text-sm text-[var(--text)]">No</span>
                                                </label>
                                            </div>
                                            {form.certified_true_copy && (
                                                <div className="mt-2">
                                                    <label className="label">Signed by</label>
                                                    <input
                                                        type="text"
                                                        value={form.certified_signed_by}
                                                        onChange={(e) => setForm((f) => ({ ...f, certified_signed_by: e.target.value }))}
                                                        className="input-field"
                                                        placeholder="Name of signatory"
                                                    />
                                                </div>
                                            )}
                                        </div>
                                        <div>
                                            <label className="label">Upload <span className="text-red-600 font-semibold" aria-label="required">*</span></label>
                                            <div className="flex flex-wrap items-center gap-2">
                                                <input
                                                    type="file"
                                                    onChange={(e) => {
                                                        setForm((f) => ({ ...f, file: e.target.files?.[0] ?? null }));
                                                        if (newFormErrors.file) setManualErrors((e2) => ({ ...e2, file: '' }));
                                                    }}
                                                    className={`input-field py-1.5 file:mr-3 file:py-1.5 file:px-4 file:rounded-lg file:border-0 file:bg-[#16a34a] file:hover:bg-[#15803d] file:active:bg-[#166534] file:text-white file:font-semibold file:cursor-pointer file:transition-colors file:duration-200 flex-1 min-w-0 ${newFormErrors.file ? 'border-2 border-red-500 bg-red-50/50 ring-2 ring-red-200' : ''}`}
                                                    accept=".pdf,.doc,.docx,.xls,.xlsx"
                                                    aria-invalid={!!newFormErrors.file}
                                                    aria-describedby={newFormErrors.file ? 'err-file' : undefined}
                                                />
                                            </div>
                                            {newFormErrors.file && (
                                                <p id="err-file" className="mt-1.5 flex items-center gap-2 text-sm font-medium text-red-700" role="alert">
                                                    <MdError className="w-4 h-4 flex-shrink-0" aria-hidden />
                                                    {newFormErrors.file}
                                                </p>
                                            )}
                                        </div>
                                    </>
                                ) : selectedSubDocType === 'Market Scopping' ? (
                                    <>
                                        <div>
                                            <label className="label">BAC Folder No.</label>
                                            <input
                                                type="text"
                                                readOnly
                                                value={nextTransactionNumber ?? '…'}
                                                className="input-field bg-[var(--background-subtle)] cursor-default"
                                                aria-readonly="true"
                                            />
                                        </div>
                                        <div>
                                            <label className="label">Title <span className="text-red-600 font-semibold" aria-label="required">*</span></label>
                                            <input
                                                type="text"
                                                value={form.title}
                                                onChange={(e) => {
                                                    const value = toLettersOnly(e.target.value);
                                                    setForm((f) => ({ ...f, title: value }));
                                                    if (newFormErrors.title) setManualErrors((e2) => ({ ...e2, title: '' }));
                                                }}
                                                className={`input-field ${newFormErrors.title ? 'border-2 border-red-500 bg-red-50/50 ring-2 ring-red-200' : ''}`}
                                                placeholder="Document title"
                                                aria-invalid={!!newFormErrors.title}
                                            />
                                            {newFormErrors.title && (
                                                <p id="err-title" className="mt-1.5 flex items-center gap-2 text-sm font-medium text-red-700" role="alert">
                                                    <MdError className="w-4 h-4 flex-shrink-0" aria-hidden />
                                                    {newFormErrors.title}
                                                </p>
                                            )}
                                        </div>
                                        <div>
                                            <label className="label">Date <span className="text-red-600 font-semibold" aria-label="required">*</span></label>
                                            <input
                                                type="date"
                                                value={form.date}
                                                onChange={(e) => {
                                                    setForm((f) => ({ ...f, date: e.target.value }));
                                                    if (newFormErrors.date) setManualErrors((e2) => ({ ...e2, date: '' }));
                                                }}
                                                className={`input-field ${newFormErrors.date ? 'border-2 border-red-500 bg-red-50/50 ring-2 ring-red-200' : ''}`}
                                                aria-invalid={!!newFormErrors.date}
                                            />
                                            {newFormErrors.date && (
                                                <p className="mt-1.5 flex items-center gap-2 text-sm font-medium text-red-700" role="alert">
                                                    <MdError className="w-4 h-4 flex-shrink-0" aria-hidden />
                                                    {newFormErrors.date}
                                                </p>
                                            )}
                                        </div>
                                        <div>
                                            <label className="label">Budget</label>
                                            <div className="flex items-center border border-[var(--border)] rounded-[var(--radius-sm)] bg-[var(--surface)] overflow-hidden focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
                                                <span className="pl-4 text-[var(--text)] font-medium" aria-hidden="true">₱</span>
                                                <input
                                                    type="text"
                                                    inputMode="decimal"
                                                    value={form.market_budget}
                                                    onChange={(e) => setForm((f) => ({ ...f, market_budget: toNumbersOnly(e.target.value) }))}
                                                    onBlur={() => {
                                                        setForm((f) => {
                                                            const raw = String(f.market_budget || '').trim();
                                                            if (!raw) return f;
                                                            const num = Number(raw);
                                                            if (Number.isNaN(num)) return f;
                                                            return { ...f, market_budget: num.toFixed(2) };
                                                        });
                                                    }}
                                                    className="input-field input-currency border-0 rounded-none focus:ring-0 focus:shadow-none w-full min-w-0"
                                                    placeholder="0.00"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="label">Period of market scoping</label>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                    <label className="label text-xs">From</label>
                                                    <input
                                                        type="month"
                                                        value={form.market_period_from}
                                                        onChange={(e) => setForm((f) => ({ ...f, market_period_from: e.target.value }))}
                                                        className="input-field"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="label text-xs">To</label>
                                                    <input
                                                        type="month"
                                                        value={form.market_period_to}
                                                        onChange={(e) => setForm((f) => ({ ...f, market_period_to: e.target.value }))}
                                                        className="input-field"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="label">Expected Delivery</label>
                                            <input
                                                type="month"
                                                value={form.market_expected_delivery}
                                                onChange={(e) => setForm((f) => ({ ...f, market_expected_delivery: e.target.value }))}
                                                className="input-field"
                                            />
                                        </div>
                                        <div>
                                            <label className="label">Service Providers <span className="text-red-600 font-semibold">*</span> (all 3 required)</label>
                                            <input
                                                type="text"
                                                value={form.market_service_provider_1}
                                                onChange={(e) => setForm((f) => ({ ...f, market_service_provider_1: toLettersOnly(e.target.value) }))}
                                                className="input-field"
                                                placeholder="Service Provider 1"
                                            />
                                            <input
                                                type="text"
                                                value={form.market_service_provider_2}
                                                onChange={(e) => setForm((f) => ({ ...f, market_service_provider_2: toLettersOnly(e.target.value) }))}
                                                className="input-field mt-2"
                                                placeholder="Service Provider 2"
                                            />
                                            <input
                                                type="text"
                                                value={form.market_service_provider_3}
                                                onChange={(e) => setForm((f) => ({ ...f, market_service_provider_3: toLettersOnly(e.target.value) }))}
                                                className="input-field mt-2"
                                                placeholder="Service Provider 3"
                                            />
                                            <p className="mt-1.5 text-xs text-[var(--text-muted)]">All 3 must be filled to upload.</p>
                                        </div>
                                        <div>
                                            <label className="label">Upload <span className="text-red-600 font-semibold" aria-label="required">*</span></label>
                                            <div className="flex flex-wrap items-center gap-2">
                                                <input
                                                    type="file"
                                                    onChange={(e) => {
                                                        setForm((f) => ({ ...f, file: e.target.files?.[0] ?? null }));
                                                        if (newFormErrors.file) setManualErrors((e2) => ({ ...e2, file: '' }));
                                                    }}
                                                    className={`input-field py-1.5 file:mr-3 file:py-1.5 file:px-4 file:rounded-lg file:border-0 file:bg-[#16a34a] file:hover:bg-[#15803d] file:active:bg-[#166534] file:text-white file:font-semibold file:cursor-pointer file:transition-colors file:duration-200 flex-1 min-w-0 ${newFormErrors.file ? 'border-2 border-red-500 bg-red-50/50 ring-2 ring-red-200' : ''}`}
                                                    accept=".pdf,.doc,.docx,.xls,.xlsx"
                                                    aria-invalid={!!newFormErrors.file}
                                                />
                                            </div>
                                            {newFormErrors.file && (
                                                <p id="err-file" className="mt-1.5 flex items-center gap-2 text-sm font-medium text-red-700" role="alert">
                                                    <MdError className="w-4 h-4 flex-shrink-0" aria-hidden />
                                                    {newFormErrors.file}
                                                </p>
                                            )}
                                        </div>
                                    </>
                                ) : selectedSubDocType === 'Requisition and Issue Slip' ? (
                                    <>
                                        <div>
                                            <label className="label">BAC Folder No.</label>
                                            <input
                                                type="text"
                                                readOnly
                                                value={nextTransactionNumber ?? '…'}
                                                className="input-field bg-[var(--background-subtle)] cursor-default"
                                                aria-readonly="true"
                                            />
                                        </div>
                                        <div>
                                            <label className="label">Purpose <span className="text-red-600 font-semibold" aria-label="required">*</span></label>
                                            <input
                                                type="text"
                                                value={form.title}
                                                onChange={(e) => {
                                                    const value = toLettersOnly(e.target.value);
                                                    setForm((f) => ({ ...f, title: value }));
                                                    if (newFormErrors.title) setManualErrors((e2) => ({ ...e2, title: '' }));
                                                }}
                                                className={`input-field ${newFormErrors.title ? 'border-2 border-red-500 bg-red-50/50 ring-2 ring-red-200' : ''}`}
                                                placeholder="Purpose of the requisition"
                                                aria-invalid={!!newFormErrors.title}
                                                aria-describedby={newFormErrors.title ? 'err-title' : undefined}
                                            />
                                            {newFormErrors.title && (
                                                <p id="err-title" className="mt-1.5 flex items-center gap-2 text-sm font-medium text-red-700" role="alert">
                                                    <MdError className="w-4 h-4 flex-shrink-0" aria-hidden />
                                                    {newFormErrors.title}
                                                </p>
                                            )}
                                        </div>
                                        <div>
                                            <label className="label">Office/Division <span className="text-red-600 font-semibold" aria-label="required">*</span></label>
                                            <input
                                                type="text"
                                                value={form.office_division}
                                                onChange={(e) => setForm((f) => ({ ...f, office_division: toLettersOnly(e.target.value) }))}
                                                className="input-field"
                                                placeholder="Office or division"
                                            />
                                        </div>
                                        <div>
                                            <label className="label">Received By <span className="text-red-600 font-semibold" aria-label="required">*</span></label>
                                            <input
                                                type="text"
                                                value={form.received_by}
                                                onChange={(e) => setForm((f) => ({ ...f, received_by: toLettersOnly(e.target.value) }))}
                                                className="input-field"
                                                placeholder="Name of recipient"
                                            />
                                        </div>
                                        <div>
                                            <label className="label">Date <span className="text-red-600 font-semibold" aria-label="required">*</span></label>
                                            <input
                                                type="date"
                                                value={form.date}
                                                onChange={(e) => {
                                                    setForm((f) => ({ ...f, date: e.target.value }));
                                                    if (newFormErrors.date) setManualErrors((e2) => ({ ...e2, date: '' }));
                                                }}
                                                className={`input-field ${newFormErrors.date ? 'border-2 border-red-500 bg-red-50/50 ring-2 ring-red-200' : ''}`}
                                                aria-invalid={!!newFormErrors.date}
                                                aria-describedby={newFormErrors.date ? 'err-date' : undefined}
                                            />
                                            {newFormErrors.date && (
                                                <p id="err-date" className="mt-1.5 flex items-center gap-2 text-sm font-medium text-red-700" role="alert">
                                                    <MdError className="w-4 h-4 flex-shrink-0" aria-hidden />
                                                    {newFormErrors.date}
                                                </p>
                                            )}
                                        </div>
                                        <div>
                                            <label className="label">Upload <span className="text-red-600 font-semibold" aria-label="required">*</span></label>
                                            <div className="flex flex-wrap items-center gap-2">
                                                <input
                                                    type="file"
                                                    onChange={(e) => {
                                                        setForm((f) => ({ ...f, file: e.target.files?.[0] ?? null }));
                                                        if (newFormErrors.file) setManualErrors((e2) => ({ ...e2, file: '' }));
                                                    }}
                                                    className={`input-field py-1.5 file:mr-3 file:py-1.5 file:px-4 file:rounded-lg file:border-0 file:bg-[#16a34a] file:hover:bg-[#15803d] file:active:bg-[#166534] file:text-white file:font-semibold file:cursor-pointer file:transition-colors file:duration-200 flex-1 min-w-0 ${newFormErrors.file ? 'border-2 border-red-500 bg-red-50/50 ring-2 ring-red-200' : ''}`}
                                                    accept=".pdf,.doc,.docx,.xls,.xlsx"
                                                    aria-invalid={!!newFormErrors.file}
                                                    aria-describedby={newFormErrors.file ? 'err-file' : undefined}
                                                />
                                            </div>
                                            {newFormErrors.file && (
                                                <p id="err-file" className="mt-1.5 flex items-center gap-2 text-sm font-medium text-red-700" role="alert">
                                                    <MdError className="w-4 h-4 flex-shrink-0" aria-hidden />
                                                    {newFormErrors.file}
                                                </p>
                                            )}
                                        </div>
                                    </>
                                ) : selectedSubDocType === 'Notice of BAC Meeting' ? (
                                    <>
                                        <div>
                                            <label className="label">BAC Folder No.</label>
                                            <input type="text" readOnly value={nextTransactionNumber ?? '…'} className="input-field bg-[var(--background-subtle)] cursor-default" aria-readonly="true" />
                                        </div>
                                        <div>
                                            <label className="label">Agenda <span className="text-red-600 font-semibold" aria-label="required">*</span></label>
                                            <input
                                                type="text"
                                                value={form.title}
                                                onChange={(e) => {
                                                    const value = toLettersOnly(e.target.value);
                                                    setForm((f) => ({ ...f, title: value }));
                                                    if (newFormErrors.title) setManualErrors((e2) => ({ ...e2, title: '' }));
                                                }}
                                                className={`input-field ${newFormErrors.title ? 'border-2 border-red-500 bg-red-50/50 ring-2 ring-red-200' : ''}`}
                                                placeholder="Agenda of the BAC meeting"
                                                aria-invalid={!!newFormErrors.title}
                                                aria-describedby={newFormErrors.title ? 'err-title' : undefined}
                                            />
                                            {newFormErrors.title && (
                                                <p id="err-title" className="mt-1.5 flex items-center gap-2 text-sm font-medium text-red-700" role="alert">
                                                    <MdError className="w-4 h-4 flex-shrink-0" aria-hidden />
                                                    {newFormErrors.title}
                                                </p>
                                            )}
                                        </div>
                                        <div>
                                            <label className="label">Date <span className="text-red-600 font-semibold" aria-label="required">*</span></label>
                                            <input
                                                type="date"
                                                value={form.date}
                                                onChange={(e) => {
                                                    setForm((f) => ({ ...f, date: e.target.value }));
                                                    if (newFormErrors.date) setManualErrors((e2) => ({ ...e2, date: '' }));
                                                }}
                                                className={`input-field ${newFormErrors.date ? 'border-2 border-red-500 bg-red-50/50 ring-2 ring-red-200' : ''}`}
                                                aria-invalid={!!newFormErrors.date}
                                                aria-describedby={newFormErrors.date ? 'err-date' : undefined}
                                            />
                                            {newFormErrors.date && (
                                                <p id="err-date" className="mt-1.5 flex items-center gap-2 text-sm font-medium text-red-700" role="alert">
                                                    <MdError className="w-4 h-4 flex-shrink-0" aria-hidden />
                                                    {newFormErrors.date}
                                                </p>
                                            )}
                                        </div>
                                        <div>
                                            <label className="label">Upload <span className="text-red-600 font-semibold" aria-label="required">*</span></label>
                                            <div className="flex flex-wrap items-center gap-2">
                                                <input
                                                    type="file"
                                                    onChange={(e) => {
                                                        setForm((f) => ({ ...f, file: e.target.files?.[0] ?? null }));
                                                        if (newFormErrors.file) setManualErrors((e2) => ({ ...e2, file: '' }));
                                                    }}
                                                    className={`input-field py-1.5 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-[#16a34a] file:hover:bg-[#15803d] file:active:bg-[#166534] file:text-white file:font-semibold file:cursor-pointer file:transition-colors file:duration-200 flex-1 min-w-0 ${newFormErrors.file ? 'border-2 border-red-500 bg-red-50/50 ring-2 ring-red-200' : ''}`}
                                                    accept=".pdf,.doc,.docx,.xls,.xlsx"
                                                    aria-invalid={!!newFormErrors.file}
                                                    aria-describedby={newFormErrors.file ? 'err-file' : undefined}
                                                />
                                            </div>
                                            {newFormErrors.file && (
                                                <p id="err-file" className="mt-1.5 flex items-center gap-2 text-sm font-medium text-red-700" role="alert">
                                                    <MdError className="w-4 h-4 flex-shrink-0" aria-hidden />
                                                    {newFormErrors.file}
                                                </p>
                                            )}
                                        </div>
                                    </>
                                ) : selectedSubDocType === 'Invitation to COA' ? (
                                    <>
                                        <div>
                                            <label className="label">Purpose <span className="text-red-600 font-semibold" aria-label="required">*</span></label>
                                            <input
                                                type="text"
                                                value={form.title}
                                                onChange={(e) => {
                                                    const value = toLettersOnly(e.target.value);
                                                    setForm((f) => ({ ...f, title: value }));
                                                    if (newFormErrors.title) setManualErrors((e2) => ({ ...e2, title: '' }));
                                                }}
                                                className={`input-field ${newFormErrors.title ? 'border-2 border-red-500 bg-red-50/50 ring-2 ring-red-200' : ''}`}
                                                placeholder="Purpose of the invitation"
                                                aria-invalid={!!newFormErrors.title}
                                            />
                                            {newFormErrors.title && (
                                                <p className="mt-1.5 flex items-center gap-2 text-sm font-medium text-red-700" role="alert">
                                                    <MdError className="w-4 h-4 flex-shrink-0" aria-hidden />
                                                    {newFormErrors.title}
                                                </p>
                                            )}
                                        </div>
                                        <div>
                                            <label className="label">BAC Folder No.</label>
                                            <input type="text" readOnly value={nextTransactionNumber ?? '…'} className="input-field bg-[var(--background-subtle)] cursor-default" aria-readonly="true" />
                                        </div>
                                        <div>
                                            <label className="label">Date <span className="text-red-600 font-semibold" aria-label="required">*</span></label>
                                            <input
                                                type="date"
                                                value={form.date}
                                                onChange={(e) => {
                                                    setForm((f) => ({ ...f, date: e.target.value }));
                                                    if (newFormErrors.date) setManualErrors((e2) => ({ ...e2, date: '' }));
                                                }}
                                                className={`input-field ${newFormErrors.date ? 'border-2 border-red-500 bg-red-50/50 ring-2 ring-red-200' : ''}`}
                                                aria-invalid={!!newFormErrors.date}
                                            />
                                            {newFormErrors.date && (
                                                <p className="mt-1.5 flex items-center gap-2 text-sm font-medium text-red-700" role="alert">
                                                    <MdError className="w-4 h-4 flex-shrink-0" aria-hidden />
                                                    {newFormErrors.date}
                                                </p>
                                            )}
                                        </div>
                                        <div>
                                            <label className="label">Upload <span className="text-red-600 font-semibold" aria-label="required">*</span></label>
                                            <div className="flex flex-wrap items-center gap-2">
                                                <input
                                                    type="file"
                                                    onChange={(e) => {
                                                        setForm((f) => ({ ...f, file: e.target.files?.[0] ?? null }));
                                                        if (newFormErrors.file) setManualErrors((e2) => ({ ...e2, file: '' }));
                                                    }}
                                                    className={`input-field py-1.5 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-[#16a34a] file:hover:bg-[#15803d] file:active:bg-[#166534] file:text-white file:font-semibold file:cursor-pointer file:transition-colors file:duration-200 flex-1 min-w-0 ${newFormErrors.file ? 'border-2 border-red-500 bg-red-50/50 ring-2 ring-red-200' : ''}`}
                                                    accept=".pdf,.doc,.docx,.xls,.xlsx"
                                                    aria-invalid={!!newFormErrors.file}
                                                />
                                            </div>
                                            {newFormErrors.file && (
                                                <p className="mt-1.5 flex items-center gap-2 text-sm font-medium text-red-700" role="alert">
                                                    <MdError className="w-4 h-4 flex-shrink-0" aria-hidden />
                                                    {newFormErrors.file}
                                                </p>
                                            )}
                                        </div>
                                        <div>
                                            <label className="label">Date received <span className="text-red-600 font-semibold" aria-label="required">*</span></label>
                                            <input
                                                type="date"
                                                value={form.date_received}
                                                onChange={(e) => setForm((f) => ({ ...f, date_received: e.target.value }))}
                                                className="input-field"
                                            />
                                        </div>
                                    </>
                                ) : selectedSubDocType === 'Attendance Sheet' ? (
                                    <>
                                        <div>
                                            <label className="label">BAC Folder No.</label>
                                            <input type="text" readOnly value={nextTransactionNumber ?? '…'} className="input-field bg-[var(--background-subtle)] cursor-default" aria-readonly="true" />
                                        </div>
                                        <div>
                                            <label className="label">Agenda <span className="text-red-600 font-semibold" aria-label="required">*</span></label>
                                            <input
                                                type="text"
                                                value={form.title}
                                                onChange={(e) => {
                                                    const value = toLettersOnly(e.target.value);
                                                    setForm((f) => ({ ...f, title: value }));
                                                    if (newFormErrors.title) setManualErrors((e2) => ({ ...e2, title: '' }));
                                                }}
                                                className={`input-field ${newFormErrors.title ? 'border-2 border-red-500 bg-red-50/50 ring-2 ring-red-200' : ''}`}
                                                placeholder="Agenda"
                                                aria-invalid={!!newFormErrors.title}
                                            />
                                            {newFormErrors.title && (
                                                <p className="mt-1.5 flex items-center gap-2 text-sm font-medium text-red-700" role="alert">
                                                    <MdError className="w-4 h-4 flex-shrink-0" aria-hidden />
                                                    {newFormErrors.title}
                                                </p>
                                            )}
                                        </div>
                                        <div>
                                            <label className="label">Date <span className="text-red-600 font-semibold" aria-label="required">*</span></label>
                                            <input
                                                type="date"
                                                value={form.date}
                                                onChange={(e) => {
                                                    setForm((f) => ({ ...f, date: e.target.value }));
                                                    if (newFormErrors.date) setManualErrors((e2) => ({ ...e2, date: '' }));
                                                }}
                                                className={`input-field ${newFormErrors.date ? 'border-2 border-red-500 bg-red-50/50 ring-2 ring-red-200' : ''}`}
                                                aria-invalid={!!newFormErrors.date}
                                            />
                                            {newFormErrors.date && (
                                                <p className="mt-1.5 flex items-center gap-2 text-sm font-medium text-red-700" role="alert">
                                                    <MdError className="w-4 h-4 flex-shrink-0" aria-hidden />
                                                    {newFormErrors.date}
                                                </p>
                                            )}
                                        </div>
                                        <div>
                                            <label className="label">List of BAC Members <span className="text-red-600 font-semibold" aria-label="required">*</span></label>
                                            <p className="text-xs text-[var(--text-muted)] mb-2">{bacMembers.length > 0 ? 'All BAC members loaded automatically. Check Present if attended.' : 'Loading BAC members...'}</p>
                                            {attendanceMembers.map((m) => (
                                                <div key={m.id} className="flex items-center gap-3 mb-2 p-2 bg-[var(--background-subtle)]/50 rounded-lg">
                                                    <span className="font-medium text-sm min-w-0 flex-1 truncate" title={m.name}>{m.name}</span>
                                                    <label className="flex items-center gap-2 shrink-0 cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            checked={m.present}
                                                            onChange={(e) => setAttendanceMembers((prev) => prev.map((x) => (x.id === m.id ? { ...x, present: e.target.checked } : x)))}
                                                            className="w-5 h-5 rounded border-[var(--border)] text-[var(--primary)] focus:ring-[var(--primary)]"
                                                        />
                                                        <span className="text-sm text-[var(--text)]">Present</span>
                                                    </label>
                                                </div>
                                            ))}
                                            {attendanceMembers.length === 0 && <p className="text-sm text-[var(--text-muted)] italic">No BAC members found. Assign users 'BAC Member' position in User Management.</p>}
                                        </div>
                                        <div>
                                            <label className="label">Upload <span className="text-red-600 font-semibold" aria-label="required">*</span></label>
                                            <div className="flex flex-wrap items-center gap-2">
                                                <input
                                                    type="file"
                                                    onChange={(e) => {
                                                        setForm((f) => ({ ...f, file: e.target.files?.[0] ?? null }));
                                                        if (newFormErrors.file) setManualErrors((e2) => ({ ...e2, file: '' }));
                                                    }}
                                                    className={`input-field py-1.5 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-[#16a34a] file:hover:bg-[#15803d] file:active:bg-[#166534] file:text-white file:font-semibold file:cursor-pointer file:transition-colors file:duration-200 flex-1 min-w-0 ${newFormErrors.file ? 'border-2 border-red-500 bg-red-50/50 ring-2 ring-red-200' : ''}`}
                                                    accept=".pdf,.doc,.docx,.xls,.xlsx"
                                                    aria-invalid={!!newFormErrors.file}
                                                />
                                            </div>
                                            {newFormErrors.file && (
                                                <p className="mt-1.5 flex items-center gap-2 text-sm font-medium text-red-700" role="alert">
                                                    <MdError className="w-4 h-4 flex-shrink-0" aria-hidden />
                                                    {newFormErrors.file}
                                                </p>
                                            )}
                                        </div>
                                    </>
                                ) : selectedSubDocType === 'Minutes of the Meeting' ? (
                                    <>
                                        <div>
                                            <label className="label">BAC Folder No.</label>
                                            <input type="text" readOnly value={nextTransactionNumber ?? '…'} className="input-field bg-[var(--background-subtle)] cursor-default" aria-readonly="true" />
                                        </div>
                                        <div>
                                            <label className="label">Agenda/Others <span className="text-red-600 font-semibold" aria-label="required">*</span></label>
                                            <input
                                                type="text"
                                                value={form.title}
                                                onChange={(e) => {
                                                    const value = toLettersOnly(e.target.value);
                                                    setForm((f) => ({ ...f, title: value }));
                                                    if (newFormErrors.title) setManualErrors((e2) => ({ ...e2, title: '' }));
                                                }}
                                                className={`input-field ${newFormErrors.title ? 'border-2 border-red-500 bg-red-50/50 ring-2 ring-red-200' : ''}`}
                                                placeholder="Agenda or other details"
                                                aria-invalid={!!newFormErrors.title}
                                                aria-describedby={newFormErrors.title ? 'err-title' : undefined}
                                            />
                                            {newFormErrors.title && (
                                                <p id="err-title" className="mt-1.5 flex items-center gap-2 text-sm font-medium text-red-700" role="alert">
                                                    <MdError className="w-4 h-4 flex-shrink-0" aria-hidden />
                                                    {newFormErrors.title}
                                                </p>
                                            )}
                                        </div>
                                        <div>
                                            <label className="label">Date <span className="text-red-600 font-semibold" aria-label="required">*</span></label>
                                            <input
                                                type="date"
                                                value={form.date}
                                                onChange={(e) => {
                                                    setForm((f) => ({ ...f, date: e.target.value }));
                                                    if (newFormErrors.date) setManualErrors((e2) => ({ ...e2, date: '' }));
                                                }}
                                                className={`input-field ${newFormErrors.date ? 'border-2 border-red-500 bg-red-50/50 ring-2 ring-red-200' : ''}`}
                                                aria-invalid={!!newFormErrors.date}
                                                aria-describedby={newFormErrors.date ? 'err-date' : undefined}
                                            />
                                            {newFormErrors.date && (
                                                <p id="err-date" className="mt-1.5 flex items-center gap-2 text-sm font-medium text-red-700" role="alert">
                                                    <MdError className="w-4 h-4 flex-shrink-0" aria-hidden />
                                                    {newFormErrors.date}
                                                </p>
                                            )}
                                        </div>
                                    </>
                                ) : selectedSubDocType === 'BAC Resolution' ? (
                                    <>
                                        <div>
                                            <label className="label">BAC Folder No.</label>
                                            <input type="text" readOnly value={nextTransactionNumber ?? '…'} className="input-field bg-[var(--background-subtle)] cursor-default" aria-readonly="true" />
                                        </div>
                                        <div>
                                            <label className="label">Resolution No. <span className="text-red-600 font-semibold" aria-label="required">*</span></label>
                                            <input type="text" value={form.resolution_no} onChange={(e) => { const value = toNumbersOnly(e.target.value); setForm((f) => ({ ...f, resolution_no: value })); if (newFormErrors.resolution_no) setManualErrors((e2) => ({ ...e2, resolution_no: '' })); }} className={`input-field ${newFormErrors.resolution_no ? 'border-2 border-red-500 bg-red-50/50 ring-2 ring-red-200' : ''}`} placeholder="Resolution number" aria-invalid={!!newFormErrors.resolution_no} />
                                            {newFormErrors.resolution_no && <p className="mt-1.5 flex items-center gap-2 text-sm font-medium text-red-700" role="alert"><MdError className="w-4 h-4 flex-shrink-0" aria-hidden />{newFormErrors.resolution_no}</p>}
                                        </div>
                                        <div>
                                            <label className="label">Title <span className="text-red-600 font-semibold" aria-label="required">*</span></label>
                                            <input type="text" value={form.title} onChange={(e) => { const value = toLettersOnly(e.target.value); setForm((f) => ({ ...f, title: value })); if (newFormErrors.title) setManualErrors((e2) => ({ ...e2, title: '' })); }} className={`input-field ${newFormErrors.title ? 'border-2 border-red-500 bg-red-50/50 ring-2 ring-red-200' : ''}`} placeholder="Title" aria-invalid={!!newFormErrors.title} />
                                            {newFormErrors.title && <p className="mt-1.5 flex items-center gap-2 text-sm font-medium text-red-700" role="alert"><MdError className="w-4 h-4 flex-shrink-0" aria-hidden />{newFormErrors.title}</p>}
                                        </div>
                                        <div>
                                            <label className="label">Winning Bidder <span className="text-red-600 font-semibold" aria-label="required">*</span></label>
                                            <input type="text" value={form.winning_bidder} onChange={(e) => { const value = toLettersOnly(e.target.value); setForm((f) => ({ ...f, winning_bidder: value })); if (newFormErrors.winning_bidder) setManualErrors((e2) => ({ ...e2, winning_bidder: '' })); }} className={`input-field ${newFormErrors.winning_bidder ? 'border-2 border-red-500 bg-red-50/50 ring-2 ring-red-200' : ''}`} placeholder="Winning bidder name" aria-invalid={!!newFormErrors.winning_bidder} />
                                            {newFormErrors.winning_bidder && <p className="mt-1.5 flex items-center gap-2 text-sm font-medium text-red-700" role="alert"><MdError className="w-4 h-4 flex-shrink-0" aria-hidden />{newFormErrors.winning_bidder}</p>}
                                        </div>
                                        <div>
                                            <label className="label">Amount <span className="text-red-600 font-semibold" aria-label="required">*</span></label>
                                            <div className="flex items-center border border-[var(--border)] rounded-[var(--radius-sm)] bg-[var(--surface)] overflow-hidden focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
                                                <span className="pl-4 text-[var(--text)] font-medium" aria-hidden="true">₱</span>
                                                <input
                                                    type="text"
                                                    inputMode="decimal"
                                                    value={form.total_amount}
                                                    onChange={(e) => {
                                                        const value = toNumbersOnly(e.target.value);
                                                        setForm((f) => ({ ...f, total_amount: value }));
                                                        if (newFormErrors.total_amount) setManualErrors((e2) => ({ ...e2, total_amount: '' }));
                                                    }}
                                                    className="input-field input-currency border-0 rounded-none focus:ring-0 focus:shadow-none w-full min-w-0"
                                                    placeholder="0.00"
                                                />
                                            </div>
                                            {newFormErrors.total_amount && <p className="mt-1.5 flex items-center gap-2 text-sm font-medium text-red-700" role="alert"><MdError className="w-4 h-4 flex-shrink-0" aria-hidden />{newFormErrors.total_amount}</p>}
                                        </div>
                                        <div>
                                            <label className="label">Options <span className="text-red-600 font-semibold" aria-label="required">*</span></label>
                                            <select value={form.resolution_option} onChange={(e) => { setForm((f) => ({ ...f, resolution_option: e.target.value })); if (newFormErrors.resolution_option) setManualErrors((e2) => ({ ...e2, resolution_option: '' })); }} className={`input-field ${newFormErrors.resolution_option ? 'border-2 border-red-500 bg-red-50/50 ring-2 ring-red-200' : ''}`} aria-invalid={!!newFormErrors.resolution_option}>
                                                <option value="">Select option</option>
                                                <option value="LCB">LCB</option>
                                                <option value="LCRB">LCRB</option>
                                                <option value="SCB">SCB</option>
                                                <option value="SCRB">SCRB</option>
                                            </select>
                                            {newFormErrors.resolution_option && <p className="mt-1.5 flex items-center gap-2 text-sm font-medium text-red-700" role="alert"><MdError className="w-4 h-4 flex-shrink-0" aria-hidden />{newFormErrors.resolution_option}</p>}
                                        </div>
                                        <div>
                                            <label className="label">Office/Division <span className="text-red-600 font-semibold" aria-label="required">*</span></label>
                                            <input type="text" value={form.office_division} onChange={(e) => { const value = toLettersOnly(e.target.value); setForm((f) => ({ ...f, office_division: value })); if (newFormErrors.office_division) setManualErrors((e2) => ({ ...e2, office_division: '' })); }} className={`input-field ${newFormErrors.office_division ? 'border-2 border-red-500 bg-red-50/50 ring-2 ring-red-200' : ''}`} placeholder="Office or division" aria-invalid={!!newFormErrors.office_division} />
                                            {newFormErrors.office_division && <p className="mt-1.5 flex items-center gap-2 text-sm font-medium text-red-700" role="alert"><MdError className="w-4 h-4 flex-shrink-0" aria-hidden />{newFormErrors.office_division}</p>}
                                        </div>
                                        <div>
                                            <label className="label">Date of Adoption <span className="text-red-600 font-semibold" aria-label="required">*</span></label>
                                            <input type="date" value={form.date} onChange={(e) => { setForm((f) => ({ ...f, date: e.target.value })); if (newFormErrors.date) setManualErrors((e2) => ({ ...e2, date: '' })); }} className={`input-field ${newFormErrors.date ? 'border-2 border-red-500 bg-red-50/50 ring-2 ring-red-200' : ''}`} aria-invalid={!!newFormErrors.date} />
                                            {newFormErrors.date && <p className="mt-1.5 flex items-center gap-2 text-sm font-medium text-red-700" role="alert"><MdError className="w-4 h-4 flex-shrink-0" aria-hidden />{newFormErrors.date}</p>}
                                        </div>
                                        <div>
                                            <label className="label">Venue <span className="text-red-600 font-semibold" aria-label="required">*</span></label>
                                            <input type="text" value={form.venue} onChange={(e) => { const value = toLettersOnly(e.target.value); setForm((f) => ({ ...f, venue: value })); if (newFormErrors.venue) setManualErrors((e2) => ({ ...e2, venue: '' })); }} className={`input-field ${newFormErrors.venue ? 'border-2 border-red-500 bg-red-50/50 ring-2 ring-red-200' : ''}`} placeholder="Venue" aria-invalid={!!newFormErrors.venue} />
                                            {newFormErrors.venue && <p className="mt-1.5 flex items-center gap-2 text-sm font-medium text-red-700" role="alert"><MdError className="w-4 h-4 flex-shrink-0" aria-hidden />{newFormErrors.venue}</p>}
                                        </div>
                                        <div>
                                            <label className="label">Upload <span className="text-red-600 font-semibold" aria-label="required">*</span></label>
                                            <div className="flex flex-wrap items-center gap-2">
                                                <input type="file" onChange={(e) => { setForm((f) => ({ ...f, file: e.target.files?.[0] ?? null })); if (newFormErrors.file) setManualErrors((e2) => ({ ...e2, file: '' })); }} className={`input-field py-1.5 file:mr-3 file:py-1.5 file:px-4 file:rounded-lg file:border-0 file:bg-[#16a34a] file:hover:bg-[#15803d] file:active:bg-[#166534] file:text-white file:font-semibold file:cursor-pointer file:transition-colors file:duration-200 flex-1 min-w-0 ${newFormErrors.file ? 'border-2 border-red-500 bg-red-50/50 ring-2 ring-red-200' : ''}`} accept=".pdf,.doc,.docx,.xls,.xlsx" aria-invalid={!!newFormErrors.file} />
                                            </div>
                                            {newFormErrors.file && <p className="mt-1.5 flex items-center gap-2 text-sm font-medium text-red-700" role="alert"><MdError className="w-4 h-4 flex-shrink-0" aria-hidden />{newFormErrors.file}</p>}
                                        </div>
                                    </>
                                ) : selectedSubDocType === 'Abstract of Quotation' ? (
                                    <>
                                        <div>
                                            <label className="label">BAC Folder No.</label>
                                            <input type="text" readOnly value={nextTransactionNumber ?? '…'} className="input-field bg-[var(--background-subtle)] cursor-default" aria-readonly="true" />
                                        </div>
                                        <div>
                                            <label className="label">AOQ No. <span className="text-red-600 font-semibold" aria-label="required">*</span></label>
                                            <input
                                                type="text"
                                                value={form.aoq_no}
                                                onChange={(e) => {
                                                    const value = toNumbersOnly(e.target.value);
                                                    setForm((f) => ({ ...f, aoq_no: value }));
                                                    if (newFormErrors.aoq_no) setManualErrors((e2) => ({ ...e2, aoq_no: '' }));
                                                }}
                                                className={`input-field ${newFormErrors.aoq_no ? 'border-2 border-red-500 bg-red-50/50 ring-2 ring-red-200' : ''}`}
                                                placeholder="AOQ number"
                                                aria-invalid={!!newFormErrors.aoq_no}
                                            />
                                            {newFormErrors.aoq_no && (
                                                <p className="mt-1.5 flex items-center gap-2 text-sm font-medium text-red-700" role="alert">
                                                    <MdError className="w-4 h-4 flex-shrink-0" aria-hidden />
                                                    {newFormErrors.aoq_no}
                                                </p>
                                            )}
                                        </div>
                                        <div>
                                            <label className="label">Date <span className="text-red-600 font-semibold" aria-label="required">*</span></label>
                                            <input
                                                type="date"
                                                value={form.date}
                                                onChange={(e) => {
                                                    setForm((f) => ({ ...f, date: e.target.value }));
                                                    if (newFormErrors.date) setManualErrors((e2) => ({ ...e2, date: '' }));
                                                }}
                                                className={`input-field ${newFormErrors.date ? 'border-2 border-red-500 bg-red-50/50 ring-2 ring-red-200' : ''}`}
                                                aria-invalid={!!newFormErrors.date}
                                            />
                                            {newFormErrors.date && (
                                                <p className="mt-1.5 flex items-center gap-2 text-sm font-medium text-red-700" role="alert">
                                                    <MdError className="w-4 h-4 flex-shrink-0" aria-hidden />
                                                    {newFormErrors.date}
                                                </p>
                                            )}
                                        </div>
                                        <div>
                                            <label className="label">List of Bidders <span className="text-red-600 font-semibold" aria-label="required">*</span></label>
                                            <p className="text-xs text-[var(--text-muted)] mb-2">At least 3 bidders with name, amount, and remarks are required.</p>
                                            {abstractBidders.map((b) => (
                                                <div key={b.id} className="p-3 mb-3 border border-[var(--border)] rounded-lg bg-[var(--background-subtle)]/30 space-y-2">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-xs font-semibold text-[var(--text-muted)] uppercase">Bidder Details</span>
                                                        <button
                                                            type="button"
                                                            onClick={() => setAbstractBidders((prev) => prev.filter((x) => x.id !== b.id))}
                                                            className="p-1.5 text-[var(--text-muted)] hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                                            aria-label="Remove bidder"
                                                        >
                                                            <MdClose className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                        <div>
                                                            <label className="text-[11px] font-medium text-[var(--text-muted)] mb-1 block">NAME</label>
                                                            <input
                                                                type="text"
                                                                value={b.name}
                                                                onChange={(e) => setAbstractBidders((prev) => prev.map((x) => (x.id === b.id ? { ...x, name: toLettersOnly(e.target.value) } : x)))}
                                                                className="input-field py-1 px-2 text-sm"
                                                                placeholder="Bidder name"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="text-[11px] font-medium text-[var(--text-muted)] mb-1 block">AMOUNT</label>
                                                            <div className="flex items-center border border-[var(--border)] rounded bg-white overflow-hidden py-1 px-2">
                                                                <span className="text-sm text-[var(--text-muted)] mr-1">₱</span>
                                                                <input
                                                                    type="text"
                                                                    inputMode="decimal"
                                                                    value={b.amount}
                                                                    onChange={(e) => setAbstractBidders((prev) => prev.map((x) => (x.id === b.id ? { ...x, amount: toNumbersOnly(e.target.value) } : x)))}
                                                                    className="border-0 p-0 text-sm focus:ring-0 w-full"
                                                                    placeholder="0.00"
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <label className="text-[11px] font-medium text-[var(--text-muted)] mb-1 block">REMARKS</label>
                                                        <input
                                                            type="text"
                                                            value={b.remarks}
                                                            onChange={(e) => setAbstractBidders((prev) => prev.map((x) => (x.id === b.id ? { ...x, remarks: e.target.value } : x)))}
                                                            className="input-field py-1 px-2 text-sm"
                                                            placeholder="Remarks"
                                                        />
                                                    </div>
                                                </div>
                                            ))}
                                            <button
                                                type="button"
                                                onClick={() => setAbstractBidders((prev) => [...prev, { id: Date.now(), name: '', amount: '', remarks: '' }])}
                                                className="text-sm text-[var(--primary)] hover:underline font-medium"
                                            >
                                                + Add bidder
                                            </button>
                                            {newFormErrors.bidders && (
                                                <p className="mt-1.5 flex items-center gap-2 text-sm font-medium text-red-700" role="alert">
                                                    <MdError className="w-4 h-4 flex-shrink-0" aria-hidden />
                                                    {newFormErrors.bidders}
                                                </p>
                                            )}
                                        </div>
                                        <div>
                                            <label className="label">Upload <span className="text-red-600 font-semibold" aria-label="required">*</span></label>
                                            <input
                                                type="file"
                                                onChange={(e) => {
                                                    setForm((f) => ({ ...f, file: e.target.files?.[0] ?? null }));
                                                    if (newFormErrors.file) setManualErrors((e2) => ({ ...e2, file: '' }));
                                                }}
                                                className={`input-field file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-[#16a34a] file:hover:bg-[#15803d] file:text-white file:font-semibold file:cursor-pointer ${newFormErrors.file ? 'border-2 border-red-500' : ''}`}
                                                accept=".pdf,.doc,.docx,.xls,.xlsx"
                                            />
                                            {newFormErrors.file && <p className="mt-1.5 text-sm text-red-700">{newFormErrors.file}</p>}
                                        </div>
                                    </>
                                ) : selectedSubDocType === 'Notice of Award' ? (
                                    <>
                                        <div>
                                            <label className="label">BAC Folder No.</label>
                                            <input type="text" readOnly value={nextTransactionNumber ?? '…'} className="input-field bg-[var(--background-subtle)] cursor-default" aria-readonly="true" />
                                        </div>
                                        <div>
                                            <label className="label">Title/Agenda <span className="text-red-600 font-semibold" aria-label="required">*</span></label>
                                            <input
                                                type="text"
                                                value={form.title}
                                                onChange={(e) => {
                                                    const value = toLettersOnly(e.target.value);
                                                    setForm((f) => ({ ...f, title: value }));
                                                    if (newFormErrors.title) setManualErrors((e2) => ({ ...e2, title: '' }));
                                                }}
                                                className={`input-field ${newFormErrors.title ? 'border-2 border-red-500 bg-red-50/50 ring-2 ring-red-200' : ''}`}
                                                placeholder="Notice of Award title"
                                                aria-invalid={!!newFormErrors.title}
                                            />
                                            {newFormErrors.title && (
                                                <p className="mt-1.5 flex items-center gap-2 text-sm font-medium text-red-700" role="alert">
                                                    <MdError className="w-4 h-4 flex-shrink-0" aria-hidden />
                                                    {newFormErrors.title}
                                                </p>
                                            )}
                                        </div>
                                        <div>
                                            <label className="label">Date <span className="text-red-600 font-semibold" aria-label="required">*</span></label>
                                            <input
                                                type="date"
                                                value={form.date}
                                                onChange={(e) => {
                                                    setForm((f) => ({ ...f, date: e.target.value }));
                                                    if (newFormErrors.date) setManualErrors((e2) => ({ ...e2, date: '' }));
                                                }}
                                                className={`input-field ${newFormErrors.date ? 'border-2 border-red-500 bg-red-50/50 ring-2 ring-red-200' : ''}`}
                                                aria-invalid={!!newFormErrors.date}
                                            />
                                            {newFormErrors.date && (
                                                <p className="mt-1.5 flex items-center gap-2 text-sm font-medium text-red-700" role="alert">
                                                    <MdError className="w-4 h-4 flex-shrink-0" aria-hidden />
                                                    {newFormErrors.date}
                                                </p>
                                            )}
                                        </div>
                                        <div>
                                            <label className="label">Upload <span className="text-red-600 font-semibold" aria-label="required">*</span></label>
                                            <input
                                                type="file"
                                                onChange={(e) => {
                                                    setForm((f) => ({ ...f, file: e.target.files?.[0] ?? null }));
                                                    if (newFormErrors.file) setManualErrors((e2) => ({ ...e2, file: '' }));
                                                }}
                                                className={`input-field file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-[#16a34a] file:hover:bg-[#15803d] file:text-white file:font-semibold file:cursor-pointer ${newFormErrors.file ? 'border-2 border-red-500' : ''}`}
                                                accept=".pdf,.doc,.docx,.xls,.xlsx"
                                            />
                                            {newFormErrors.file && <p className="mt-1.5 text-sm text-red-700">{newFormErrors.file}</p>}
                                        </div>
                                    </>
                                ) : selectedSubDocType === 'Contract Services/Purchase Order' ? (
                                    <>
                                        <div>
                                            <label className="label">Title <span className="text-red-600 font-semibold" aria-label="required">*</span></label>
                                            <input
                                                type="text"
                                                value={form.title}
                                                onChange={(e) => {
                                                    const value = toLettersOnly(e.target.value);
                                                    setForm((f) => ({ ...f, title: value }));
                                                    if (newFormErrors.title) setManualErrors((e2) => ({ ...e2, title: '' }));
                                                }}
                                                className={`input-field ${newFormErrors.title ? 'border-2 border-red-500 bg-red-50/50 ring-2 ring-red-200' : ''}`}
                                                placeholder="Contract title"
                                                aria-invalid={!!newFormErrors.title}
                                            />
                                            {newFormErrors.title && (
                                                <p className="mt-1.5 flex items-center gap-2 text-sm font-medium text-red-700" role="alert">
                                                    <MdError className="w-4 h-4 flex-shrink-0" aria-hidden />
                                                    {newFormErrors.title}
                                                </p>
                                            )}
                                        </div>
                                        <div>
                                            <label className="label">BAC Folder No.</label>
                                            <input type="text" readOnly value={nextTransactionNumber ?? '…'} className="input-field bg-[var(--background-subtle)] cursor-default" aria-readonly="true" />
                                        </div>
                                        <div>
                                            <label className="label">Date <span className="text-red-600 font-semibold" aria-label="required">*</span></label>
                                            <input type="date" value={form.date} onChange={(e) => { setForm((f) => ({ ...f, date: e.target.value })); if (newFormErrors.date) setManualErrors((e2) => ({ ...e2, date: '' })); }} className={`input-field ${newFormErrors.date ? 'border-2 border-red-500 bg-red-50/50 ring-2 ring-red-200' : ''}`} aria-invalid={!!newFormErrors.date} />
                                            {newFormErrors.date && <p className="mt-1.5 flex items-center gap-2 text-sm font-medium text-red-700" role="alert"><MdError className="w-4 h-4 flex-shrink-0" aria-hidden />{newFormErrors.date}</p>}
                                        </div>
                                        <div>
                                            <label className="label">Received by COA <span className="text-red-600 font-semibold" aria-label="required">*</span></label>
                                            <select value={form.contract_received_by_coa === true ? 'yes' : form.contract_received_by_coa === false ? 'no' : ''} onChange={(e) => { const v = e.target.value; setForm((f) => ({ ...f, contract_received_by_coa: v === 'yes' ? true : v === 'no' ? false : null })); if (newFormErrors.contract_received_by_coa) setManualErrors((e2) => ({ ...e2, contract_received_by_coa: '' })); }} className={`input-field ${newFormErrors.contract_received_by_coa ? 'border-2 border-red-500 bg-red-50/50 ring-2 ring-red-200' : ''}`} aria-invalid={!!newFormErrors.contract_received_by_coa}>
                                                <option value="">Select</option>
                                                <option value="yes">Yes</option>
                                                <option value="no">No</option>
                                            </select>
                                            {newFormErrors.contract_received_by_coa && <p className="mt-1.5 flex items-center gap-2 text-sm font-medium text-red-700" role="alert"><MdError className="w-4 h-4 flex-shrink-0" aria-hidden />{newFormErrors.contract_received_by_coa}</p>}
                                        </div>
                                        <div>
                                            <label className="label">Contract Amount <span className="text-red-600 font-semibold" aria-label="required">*</span></label>
                                            <div className="flex items-center border border-[var(--border)] rounded-[var(--radius-sm)] bg-[var(--surface)] overflow-hidden focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
                                                <span className="pl-4 text-[var(--text)] font-medium" aria-hidden="true">₱</span>
                                                <input
                                                    type="text"
                                                    inputMode="decimal"
                                                    value={form.contract_amount}
                                                    onChange={(e) => {
                                                        const value = toNumbersOnly(e.target.value);
                                                        setForm((f) => ({ ...f, contract_amount: value }));
                                                        if (newFormErrors.contract_amount) setManualErrors((e2) => ({ ...e2, contract_amount: '' }));
                                                    }}
                                                    onBlur={() => {
                                                        setForm((f) => {
                                                            const raw = String(f.contract_amount || '').trim();
                                                            if (!raw) return f;
                                                            const num = Number(raw);
                                                            if (Number.isNaN(num)) return f;
                                                            return { ...f, contract_amount: num.toFixed(2) };
                                                        });
                                                    }}
                                                    className="input-field input-currency border-0 rounded-none focus:ring-0 focus:shadow-none w-full min-w-0"
                                                    placeholder="0.00"
                                                />
                                            </div>
                                            {newFormErrors.contract_amount && <p className="mt-1.5 flex items-center gap-2 text-sm font-medium text-red-700" role="alert"><MdError className="w-4 h-4 flex-shrink-0" aria-hidden />{newFormErrors.contract_amount}</p>}
                                        </div>
                                        <div>
                                            <label className="label">Notarized (place) <span className="text-red-600 font-semibold" aria-label="required">*</span></label>
                                            <input type="text" value={form.notarized_place} onChange={(e) => { setForm((f) => ({ ...f, notarized_place: e.target.value })); if (newFormErrors.notarized_place) setManualErrors((e2) => ({ ...e2, notarized_place: '' })); }} className={`input-field ${newFormErrors.notarized_place ? 'border-2 border-red-500 bg-red-50/50 ring-2 ring-red-200' : ''}`} placeholder="Place of notarization" aria-invalid={!!newFormErrors.notarized_place} />
                                            {newFormErrors.notarized_place && <p className="mt-1.5 flex items-center gap-2 text-sm font-medium text-red-700" role="alert"><MdError className="w-4 h-4 flex-shrink-0" aria-hidden />{newFormErrors.notarized_place}</p>}
                                        </div>
                                        <div>
                                            <label className="label">Notarized (date) <span className="text-red-600 font-semibold" aria-label="required">*</span></label>
                                            <input type="date" value={form.notarized_date} onChange={(e) => { setForm((f) => ({ ...f, notarized_date: e.target.value })); if (newFormErrors.notarized_date) setManualErrors((e2) => ({ ...e2, notarized_date: '' })); }} className={`input-field ${newFormErrors.notarized_date ? 'border-2 border-red-500 bg-red-50/50 ring-2 ring-red-200' : ''}`} aria-invalid={!!newFormErrors.notarized_date} />
                                            {newFormErrors.notarized_date && <p className="mt-1.5 flex items-center gap-2 text-sm font-medium text-red-700" role="alert"><MdError className="w-4 h-4 flex-shrink-0" aria-hidden />{newFormErrors.notarized_date}</p>}
                                        </div>
                                        <div>
                                            <label className="label">Upload <span className="text-red-600 font-semibold" aria-label="required">*</span></label>
                                            <div className="flex flex-wrap items-center gap-2">
                                                <input type="file" onChange={(e) => { setForm((f) => ({ ...f, file: e.target.files?.[0] ?? null })); if (newFormErrors.file) setManualErrors((e2) => ({ ...e2, file: '' })); }} className={`input-field py-1.5 file:mr-3 file:py-1.5 file:px-4 file:rounded-lg file:border-0 file:bg-[#16a34a] file:hover:bg-[#15803d] file:active:bg-[#166534] file:text-white file:font-semibold file:cursor-pointer file:transition-colors file:duration-200 flex-1 min-w-0 ${newFormErrors.file ? 'border-2 border-red-500 bg-red-50/50 ring-2 ring-red-200' : ''}`} accept=".pdf,.doc,.docx,.xls,.xlsx" aria-invalid={!!newFormErrors.file} />
                                            </div>
                                            {newFormErrors.file && <p className="mt-1.5 flex items-center gap-2 text-sm font-medium text-red-700" role="alert"><MdError className="w-4 h-4 flex-shrink-0" aria-hidden />{newFormErrors.file}</p>}
                                        </div>
                                    </>
                                ) : selectedSubDocType === 'Notice to Proceed' ? (
                                    <>
                                        <div>
                                            <label className="label">BAC Folder No.</label>
                                            <input type="text" readOnly value={nextTransactionNumber ?? '…'} className="input-field bg-[var(--background-subtle)] cursor-default" aria-readonly="true" />
                                        </div>
                                        <div>
                                            <label className="label">Date <span className="text-red-600 font-semibold" aria-label="required">*</span></label>
                                            <input type="date" value={form.date} onChange={(e) => { setForm((f) => ({ ...f, date: e.target.value })); if (newFormErrors.date) setManualErrors((e2) => ({ ...e2, date: '' })); }} className={`input-field ${newFormErrors.date ? 'border-2 border-red-500 bg-red-50/50 ring-2 ring-red-200' : ''}`} aria-invalid={!!newFormErrors.date} />
                                            {newFormErrors.date && <p className="mt-1.5 flex items-center gap-2 text-sm font-medium text-red-700" role="alert"><MdError className="w-4 h-4 flex-shrink-0" aria-hidden />{newFormErrors.date}</p>}
                                        </div>
                                        <div>
                                            <label className="label">Service Provider <span className="text-red-600 font-semibold" aria-label="required">*</span></label>
                                            <input type="text" value={form.ntp_service_provider} onChange={(e) => { const value = toLettersOnly(e.target.value); setForm((f) => ({ ...f, ntp_service_provider: value })); if (newFormErrors.ntp_service_provider) setManualErrors((e2) => ({ ...e2, ntp_service_provider: '' })); }} className={`input-field ${newFormErrors.ntp_service_provider ? 'border-2 border-red-500 bg-red-50/50 ring-2 ring-red-200' : ''}`} placeholder="Service provider name" aria-invalid={!!newFormErrors.ntp_service_provider} />
                                            {newFormErrors.ntp_service_provider && <p className="mt-1.5 flex items-center gap-2 text-sm font-medium text-red-700" role="alert"><MdError className="w-4 h-4 flex-shrink-0" aria-hidden />{newFormErrors.ntp_service_provider}</p>}
                                        </div>
                                        <div>
                                            <label className="label">Authorized Representative/Owner <span className="text-red-600 font-semibold" aria-label="required">*</span></label>
                                            <input type="text" value={form.ntp_authorized_rep} onChange={(e) => { const value = toLettersOnly(e.target.value); setForm((f) => ({ ...f, ntp_authorized_rep: value })); if (newFormErrors.ntp_authorized_rep) setManualErrors((e2) => ({ ...e2, ntp_authorized_rep: '' })); }} className={`input-field ${newFormErrors.ntp_authorized_rep ? 'border-2 border-red-500 bg-red-50/50 ring-2 ring-red-200' : ''}`} placeholder="Authorized representative or owner" aria-invalid={!!newFormErrors.ntp_authorized_rep} />
                                            {newFormErrors.ntp_authorized_rep && <p className="mt-1.5 flex items-center gap-2 text-sm font-medium text-red-700" role="alert"><MdError className="w-4 h-4 flex-shrink-0" aria-hidden />{newFormErrors.ntp_authorized_rep}</p>}
                                        </div>
                                        <div>
                                            <label className="label">Received By <span className="text-red-600 font-semibold" aria-label="required">*</span></label>
                                            <input type="text" value={form.ntp_received_by} onChange={(e) => { const value = toLettersOnly(e.target.value); setForm((f) => ({ ...f, ntp_received_by: value })); if (newFormErrors.ntp_received_by) setManualErrors((e2) => ({ ...e2, ntp_received_by: '' })); }} className={`input-field ${newFormErrors.ntp_received_by ? 'border-2 border-red-500 bg-red-50/50 ring-2 ring-red-200' : ''}`} placeholder="Received by" aria-invalid={!!newFormErrors.ntp_received_by} />
                                            {newFormErrors.ntp_received_by && <p className="mt-1.5 flex items-center gap-2 text-sm font-medium text-red-700" role="alert"><MdError className="w-4 h-4 flex-shrink-0" aria-hidden />{newFormErrors.ntp_received_by}</p>}
                                        </div>
                                        <div>
                                            <label className="label">Upload <span className="text-red-600 font-semibold" aria-label="required">*</span></label>
                                            <div className="flex flex-wrap items-center gap-2">
                                                <input type="file" onChange={(e) => { setForm((f) => ({ ...f, file: e.target.files?.[0] ?? null })); if (newFormErrors.file) setManualErrors((e2) => ({ ...e2, file: '' })); }} className={`input-field py-1.5 file:mr-3 file:py-1.5 file:px-4 file:rounded-lg file:border-0 file:bg-[#16a34a] file:hover:bg-[#15803d] file:active:bg-[#166534] file:text-white file:font-semibold file:cursor-pointer file:transition-colors file:duration-200 flex-1 min-w-0 ${newFormErrors.file ? 'border-2 border-red-500 bg-red-50/50 ring-2 ring-red-200' : ''}`} accept=".pdf,.doc,.docx,.xls,.xlsx" aria-invalid={!!newFormErrors.file} />
                                            </div>
                                            {newFormErrors.file && <p className="mt-1.5 flex items-center gap-2 text-sm font-medium text-red-700" role="alert"><MdError className="w-4 h-4 flex-shrink-0" aria-hidden />{newFormErrors.file}</p>}
                                        </div>
                                    </>
                                ) : selectedSubDocType === 'OSS' ? (
                                    <>
                                        <div>
                                            <label className="label">Title <span className="text-red-600 font-semibold" aria-label="required">*</span></label>
                                            <input
                                                type="text"
                                                value={form.title}
                                                onChange={(e) => {
                                                    const value = toLettersOnly(e.target.value);
                                                    setForm((f) => ({ ...f, title: value }));
                                                    if (newFormErrors.title) setManualErrors((e2) => ({ ...e2, title: '' }));
                                                }}
                                                className={`input-field ${newFormErrors.title ? 'border-2 border-red-500 bg-red-50/50 ring-2 ring-red-200' : ''}`}
                                                placeholder="Document title"
                                                aria-invalid={!!newFormErrors.title}
                                            />
                                            {newFormErrors.title && (
                                                <p className="mt-1.5 flex items-center gap-2 text-sm font-medium text-red-700" role="alert">
                                                    <MdError className="w-4 h-4 flex-shrink-0" aria-hidden />
                                                    {newFormErrors.title}
                                                </p>
                                            )}
                                        </div>
                                        <div>
                                            <label className="label">BAC Folder No.</label>
                                            <input type="text" readOnly value={nextTransactionNumber ?? '…'} className="input-field bg-[var(--background-subtle)] cursor-default" aria-readonly="true" />
                                        </div>
                                        <div>
                                            <label className="label">Service Provider <span className="text-red-600 font-semibold" aria-label="required">*</span></label>
                                            <input type="text" value={form.oss_service_provider} onChange={(e) => { const value = toLettersOnly(e.target.value); setForm((f) => ({ ...f, oss_service_provider: value })); if (newFormErrors.oss_service_provider) setManualErrors((e2) => ({ ...e2, oss_service_provider: '' })); }} className={`input-field ${newFormErrors.oss_service_provider ? 'border-2 border-red-500 bg-red-50/50 ring-2 ring-red-200' : ''}`} placeholder="Service provider name" aria-invalid={!!newFormErrors.oss_service_provider} />
                                            {newFormErrors.oss_service_provider && <p className="mt-1.5 flex items-center gap-2 text-sm font-medium text-red-700" role="alert"><MdError className="w-4 h-4 flex-shrink-0" aria-hidden />{newFormErrors.oss_service_provider}</p>}
                                        </div>
                                        <div>
                                            <label className="label">Authorized Representative/Owner <span className="text-red-600 font-semibold" aria-label="required">*</span></label>
                                            <input type="text" value={form.oss_authorized_rep} onChange={(e) => { const value = toLettersOnly(e.target.value); setForm((f) => ({ ...f, oss_authorized_rep: value })); if (newFormErrors.oss_authorized_rep) setManualErrors((e2) => ({ ...e2, oss_authorized_rep: '' })); }} className={`input-field ${newFormErrors.oss_authorized_rep ? 'border-2 border-red-500 bg-red-50/50 ring-2 ring-red-200' : ''}`} placeholder="Authorized representative or owner" aria-invalid={!!newFormErrors.oss_authorized_rep} />
                                            {newFormErrors.oss_authorized_rep && <p className="mt-1.5 flex items-center gap-2 text-sm font-medium text-red-700" role="alert"><MdError className="w-4 h-4 flex-shrink-0" aria-hidden />{newFormErrors.oss_authorized_rep}</p>}
                                        </div>
                                        <div>
                                            <label className="label">Date <span className="text-red-600 font-semibold" aria-label="required">*</span></label>
                                            <input type="date" value={form.date} onChange={(e) => { setForm((f) => ({ ...f, date: e.target.value })); if (newFormErrors.date) setManualErrors((e2) => ({ ...e2, date: '' })); }} className={`input-field ${newFormErrors.date ? 'border-2 border-red-500 bg-red-50/50 ring-2 ring-red-200' : ''}`} aria-invalid={!!newFormErrors.date} />
                                            {newFormErrors.date && <p className="mt-1.5 flex items-center gap-2 text-sm font-medium text-red-700" role="alert"><MdError className="w-4 h-4 flex-shrink-0" aria-hidden />{newFormErrors.date}</p>}
                                        </div>
                                        <div>
                                            <label className="label">Upload <span className="text-red-600 font-semibold" aria-label="required">*</span></label>
                                            <div className="flex flex-wrap items-center gap-2">
                                                <input type="file" onChange={(e) => { setForm((f) => ({ ...f, file: e.target.files?.[0] ?? null })); if (newFormErrors.file) setManualErrors((e2) => ({ ...e2, file: '' })); }} className={`input-field py-1.5 file:mr-3 file:py-1.5 file:px-4 file:rounded-lg file:border-0 file:bg-[#16a34a] file:hover:bg-[#15803d] file:active:bg-[#166534] file:text-white file:font-semibold file:cursor-pointer file:transition-colors file:duration-200 flex-1 min-w-0 ${newFormErrors.file ? 'border-2 border-red-500 bg-red-50/50 ring-2 ring-red-200' : ''}`} accept=".pdf,.doc,.docx,.xls,.xlsx" aria-invalid={!!newFormErrors.file} />
                                            </div>
                                            {newFormErrors.file && <p className="mt-1.5 flex items-center gap-2 text-sm font-medium text-red-700" role="alert"><MdError className="w-4 h-4 flex-shrink-0" aria-hidden />{newFormErrors.file}</p>}
                                        </div>
                                    </>
                                ) : selectedSubDocType === "Applicable: Secretary's Certificate and Special Power of Attorney" ? (
                                    <>
                                        <div>
                                            <label className="label">Title <span className="text-red-600 font-semibold" aria-label="required">*</span></label>
                                            <input
                                                type="text"
                                                value={form.title}
                                                onChange={(e) => {
                                                    const value = toLettersOnly(e.target.value);
                                                    setForm((f) => ({ ...f, title: value }));
                                                    if (newFormErrors.title) setManualErrors((e2) => ({ ...e2, title: '' }));
                                                }}
                                                className={`input-field ${newFormErrors.title ? 'border-2 border-red-500 bg-red-50/50 ring-2 ring-red-200' : ''}`}
                                                placeholder="Document title"
                                                aria-invalid={!!newFormErrors.title}
                                            />
                                            {newFormErrors.title && (
                                                <p className="mt-1.5 flex items-center gap-2 text-sm font-medium text-red-700" role="alert">
                                                    <MdError className="w-4 h-4 flex-shrink-0" aria-hidden />
                                                    {newFormErrors.title}
                                                </p>
                                            )}
                                        </div>
                                        <div>
                                            <label className="label">BAC Folder No.</label>
                                            <input type="text" readOnly value={nextTransactionNumber ?? '…'} className="input-field bg-[var(--background-subtle)] cursor-default" aria-readonly="true" />
                                        </div>
                                        <div>
                                            <label className="label">Service Provider <span className="text-red-600 font-semibold" aria-label="required">*</span></label>
                                            <input type="text" value={form.secretary_service_provider} onChange={(e) => { const value = toLettersOnly(e.target.value); setForm((f) => ({ ...f, secretary_service_provider: value })); if (newFormErrors.secretary_service_provider) setManualErrors((e2) => ({ ...e2, secretary_service_provider: '' })); }} className={`input-field ${newFormErrors.secretary_service_provider ? 'border-2 border-red-500 bg-red-50/50 ring-2 ring-red-200' : ''}`} placeholder="Service provider name" aria-invalid={!!newFormErrors.secretary_service_provider} />
                                            {newFormErrors.secretary_service_provider && <p className="mt-1.5 flex items-center gap-2 text-sm font-medium text-red-700" role="alert"><MdError className="w-4 h-4 flex-shrink-0" aria-hidden />{newFormErrors.secretary_service_provider}</p>}
                                        </div>
                                        <div>
                                            <label className="label">Owner/Authorized Representative <span className="text-red-600 font-semibold" aria-label="required">*</span></label>
                                            <input type="text" value={form.secretary_owner_rep} onChange={(e) => { const value = toLettersOnly(e.target.value); setForm((f) => ({ ...f, secretary_owner_rep: value })); if (newFormErrors.secretary_owner_rep) setManualErrors((e2) => ({ ...e2, secretary_owner_rep: '' })); }} className={`input-field ${newFormErrors.secretary_owner_rep ? 'border-2 border-red-500 bg-red-50/50 ring-2 ring-red-200' : ''}`} placeholder="Owner or authorized representative" aria-invalid={!!newFormErrors.secretary_owner_rep} />
                                            {newFormErrors.secretary_owner_rep && <p className="mt-1.5 flex items-center gap-2 text-sm font-medium text-red-700" role="alert"><MdError className="w-4 h-4 flex-shrink-0" aria-hidden />{newFormErrors.secretary_owner_rep}</p>}
                                        </div>
                                        <div>
                                            <label className="label">Date <span className="text-red-600 font-semibold" aria-label="required">*</span></label>
                                            <input type="date" value={form.date} onChange={(e) => { setForm((f) => ({ ...f, date: e.target.value })); if (newFormErrors.date) setManualErrors((e2) => ({ ...e2, date: '' })); }} className={`input-field ${newFormErrors.date ? 'border-2 border-red-500 bg-red-50/50 ring-2 ring-red-200' : ''}`} aria-invalid={!!newFormErrors.date} />
                                            {newFormErrors.date && <p className="mt-1.5 flex items-center gap-2 text-sm font-medium text-red-700" role="alert"><MdError className="w-4 h-4 flex-shrink-0" aria-hidden />{newFormErrors.date}</p>}
                                        </div>
                                        <div>
                                            <label className="label">Upload <span className="text-red-600 font-semibold" aria-label="required">*</span></label>
                                            <div className="flex flex-wrap items-center gap-2">
                                                <input type="file" onChange={(e) => { setForm((f) => ({ ...f, file: e.target.files?.[0] ?? null })); if (newFormErrors.file) setManualErrors((e2) => ({ ...e2, file: '' })); }} className={`input-field py-1.5 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-[#16a34a] file:hover:bg-[#15803d] file:active:bg-[#166534] file:text-white file:font-semibold file:cursor-pointer file:transition-colors file:duration-200 flex-1 min-w-0 ${newFormErrors.file ? 'border-2 border-red-500 bg-red-50/50 ring-2 ring-red-200' : ''}`} accept=".pdf,.doc,.docx,.xls,.xlsx" aria-invalid={!!newFormErrors.file} />
                                            </div>
                                            {newFormErrors.file && <p className="mt-1.5 flex items-center gap-2 text-sm font-medium text-red-700" role="alert"><MdError className="w-4 h-4 flex-shrink-0" aria-hidden />{newFormErrors.file}</p>}
                                        </div>
                                    </>
                                ) : selectedSubDocType === 'PhilGEPS Posting of Award' ? (
                                    <>
                                        <div>
                                            <label className="label">Purpose <span className="text-red-600 font-semibold" aria-label="required">*</span></label>
                                            <input
                                                type="text"
                                                value={form.title}
                                                onChange={(e) => {
                                                    const value = toLettersOnly(e.target.value);
                                                    setForm((f) => ({ ...f, title: value }));
                                                    if (newFormErrors.title) setManualErrors((e2) => ({ ...e2, title: '' }));
                                                }}
                                                className={`input-field ${newFormErrors.title ? 'border-2 border-red-500 bg-red-50/50 ring-2 ring-red-200' : ''}`}
                                                placeholder="Purpose of posting"
                                                aria-invalid={!!newFormErrors.title}
                                            />
                                            {newFormErrors.title && (
                                                <p className="mt-1.5 flex items-center gap-2 text-sm font-medium text-red-700" role="alert">
                                                    <MdError className="w-4 h-4 flex-shrink-0" aria-hidden />
                                                    {newFormErrors.title}
                                                </p>
                                            )}
                                        </div>
                                        <div>
                                            <label className="label">BAC Folder No.</label>
                                            <input type="text" readOnly value={nextTransactionNumber ?? '…'} className="input-field bg-[var(--background-subtle)] cursor-default" aria-readonly="true" />
                                        </div>
                                        <div>
                                            <label className="label">Date <span className="text-red-600 font-semibold" aria-label="required">*</span></label>
                                            <input type="date" value={form.date} onChange={(e) => { setForm((f) => ({ ...f, date: e.target.value })); if (newFormErrors.date) setManualErrors((e2) => ({ ...e2, date: '' })); }} className={`input-field ${newFormErrors.date ? 'border-2 border-red-500 bg-red-50/50 ring-2 ring-red-200' : ''}`} aria-invalid={!!newFormErrors.date} />
                                            {newFormErrors.date && <p className="mt-1.5 flex items-center gap-2 text-sm font-medium text-red-700" role="alert"><MdError className="w-4 h-4 flex-shrink-0" aria-hidden />{newFormErrors.date}</p>}
                                        </div>
                                        <div>
                                            <label className="label">Upload <span className="text-red-600 font-semibold" aria-label="required">*</span></label>
                                            <div className="flex flex-wrap items-center gap-2">
                                                <input type="file" onChange={(e) => { setForm((f) => ({ ...f, file: e.target.files?.[0] ?? null })); if (newFormErrors.file) setManualErrors((e2) => ({ ...e2, file: '' })); }} className={`input-field py-1.5 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-[#16a34a] file:hover:bg-[#15803d] file:active:bg-[#166534] file:text-white file:font-semibold file:cursor-pointer file:transition-colors file:duration-200 flex-1 min-w-0 ${newFormErrors.file ? 'border-2 border-red-500 bg-red-50/50 ring-2 ring-red-200' : ''}`} accept=".pdf,.doc,.docx,.xls,.xlsx" aria-invalid={!!newFormErrors.file} />
                                            </div>
                                            {newFormErrors.file && <p className="mt-1.5 flex items-center gap-2 text-sm font-medium text-red-700" role="alert"><MdError className="w-4 h-4 flex-shrink-0" aria-hidden />{newFormErrors.file}</p>}
                                        </div>
                                    </>
                                ) : selectedSubDocType === 'Certificate of DILG R1 Website Posting of Award' ? (
                                    <>
                                        <div>
                                            <label className="label">Purpose <span className="text-red-600 font-semibold" aria-label="required">*</span></label>
                                            <input
                                                type="text"
                                                value={form.title}
                                                onChange={(e) => {
                                                    const value = toLettersOnly(e.target.value);
                                                    setForm((f) => ({ ...f, title: value }));
                                                    if (newFormErrors.title) setManualErrors((e2) => ({ ...e2, title: '' }));
                                                }}
                                                className={`input-field ${newFormErrors.title ? 'border-2 border-red-500 bg-red-50/50 ring-2 ring-red-200' : ''}`}
                                                placeholder="Purpose of certificate"
                                                aria-invalid={!!newFormErrors.title}
                                            />
                                            {newFormErrors.title && (
                                                <p className="mt-1.5 flex items-center gap-2 text-sm font-medium text-red-700" role="alert">
                                                    <MdError className="w-4 h-4 flex-shrink-0" aria-hidden />
                                                    {newFormErrors.title}
                                                </p>
                                            )}
                                        </div>
                                        <div>
                                            <label className="label">BAC Folder No.</label>
                                            <input type="text" readOnly value={nextTransactionNumber ?? '…'} className="input-field bg-[var(--background-subtle)] cursor-default" aria-readonly="true" />
                                        </div>
                                        <div>
                                            <label className="label">Date <span className="text-red-600 font-semibold" aria-label="required">*</span></label>
                                            <input type="date" value={form.date} onChange={(e) => { setForm((f) => ({ ...f, date: e.target.value })); if (newFormErrors.date) setManualErrors((e2) => ({ ...e2, date: '' })); }} className={`input-field ${newFormErrors.date ? 'border-2 border-red-500 bg-red-50/50 ring-2 ring-red-200' : ''}`} aria-invalid={!!newFormErrors.date} />
                                            {newFormErrors.date && <p className="mt-1.5 flex items-center gap-2 text-sm font-medium text-red-700" role="alert"><MdError className="w-4 h-4 flex-shrink-0" aria-hidden />{newFormErrors.date}</p>}
                                        </div>
                                        <div>
                                            <label className="label">Upload <span className="text-red-600 font-semibold" aria-label="required">*</span></label>
                                            <div className="flex flex-wrap items-center gap-2">
                                                <input type="file" onChange={(e) => { setForm((f) => ({ ...f, file: e.target.files?.[0] ?? null })); if (newFormErrors.file) setManualErrors((e2) => ({ ...e2, file: '' })); }} className={`input-field py-1.5 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-[#16a34a] file:hover:bg-[#15803d] file:active:bg-[#166534] file:text-white file:font-semibold file:cursor-pointer file:transition-colors file:duration-200 flex-1 min-w-0 ${newFormErrors.file ? 'border-2 border-red-500 bg-red-50/50 ring-2 ring-red-200' : ''}`} accept=".pdf,.doc,.docx,.xls,.xlsx" aria-invalid={!!newFormErrors.file} />
                                            </div>
                                            {newFormErrors.file && <p className="mt-1.5 flex items-center gap-2 text-sm font-medium text-red-700" role="alert"><MdError className="w-4 h-4 flex-shrink-0" aria-hidden />{newFormErrors.file}</p>}
                                        </div>
                                    </>
                                ) : selectedSubDocType === 'Notice of Award (Posted)' || selectedSubDocType === 'Abstract of Quotation (Posted)' || selectedSubDocType === 'BAC Resolution (Posted)' ? (
                                    <>
                                        <div>
                                            <label className="label">Title <span className="text-red-600 font-semibold" aria-label="required">*</span></label>
                                            <input
                                                type="text"
                                                value={form.title}
                                                onChange={(e) => {
                                                    const value = toLettersOnly(e.target.value);
                                                    setForm((f) => ({ ...f, title: value }));
                                                    if (newFormErrors.title) setManualErrors((e2) => ({ ...e2, title: '' }));
                                                }}
                                                className={`input-field ${newFormErrors.title ? 'border-2 border-red-500 bg-red-50/50 ring-2 ring-red-200' : ''}`}
                                                placeholder="Document title"
                                                aria-invalid={!!newFormErrors.title}
                                            />
                                            {newFormErrors.title && (
                                                <p className="mt-1.5 flex items-center gap-2 text-sm font-medium text-red-700" role="alert">
                                                    <MdError className="w-4 h-4 flex-shrink-0" aria-hidden />
                                                    {newFormErrors.title}
                                                </p>
                                            )}
                                        </div>
                                        <div>
                                            <label className="label">BAC Folder No.</label>
                                            <input type="text" readOnly value={nextTransactionNumber ?? '…'} className="input-field bg-[var(--background-subtle)] cursor-default" aria-readonly="true" />
                                        </div>
                                        <div>
                                            <label className="label">Date <span className="text-red-600 font-semibold" aria-label="required">*</span></label>
                                            <input type="date" value={form.date} onChange={(e) => { setForm((f) => ({ ...f, date: e.target.value })); if (newFormErrors.date) setManualErrors((e2) => ({ ...e2, date: '' })); }} className={`input-field ${newFormErrors.date ? 'border-2 border-red-500 bg-red-50/50 ring-2 ring-red-200' : ''}`} aria-invalid={!!newFormErrors.date} />
                                            {newFormErrors.date && <p className="mt-1.5 flex items-center gap-2 text-sm font-medium text-red-700" role="alert"><MdError className="w-4 h-4 flex-shrink-0" aria-hidden />{newFormErrors.date}</p>}
                                        </div>
                                    </>
                                ) : selectedSubDocType === 'Lease of Venue: Table Rating Factor' ? (
                                    <>
                                        <div>
                                            <label className="label">Title <span className="text-red-600 font-semibold" aria-label="required">*</span></label>
                                            <input
                                                type="text"
                                                value={form.title}
                                                onChange={(e) => {
                                                    const value = toLettersOnly(e.target.value);
                                                    setForm((f) => ({ ...f, title: value }));
                                                    if (newFormErrors.title) setManualErrors((e2) => ({ ...e2, title: '' }));
                                                }}
                                                className={`input-field ${newFormErrors.title ? 'border-2 border-red-500 bg-red-50/50 ring-2 ring-red-200' : ''}`}
                                                placeholder="Document title"
                                                aria-invalid={!!newFormErrors.title}
                                            />
                                            {newFormErrors.title && (
                                                <p className="mt-1.5 flex items-center gap-2 text-sm font-medium text-red-700" role="alert">
                                                    <MdError className="w-4 h-4 flex-shrink-0" aria-hidden />
                                                    {newFormErrors.title}
                                                </p>
                                            )}
                                        </div>
                                        <div>
                                            <label className="label">Date <span className="text-red-600 font-semibold" aria-label="required">*</span></label>
                                            <input type="date" value={form.date} onChange={(e) => { setForm((f) => ({ ...f, date: e.target.value })); if (newFormErrors.date) setManualErrors((e2) => ({ ...e2, date: '' })); }} className={`input-field ${newFormErrors.date ? 'border-2 border-red-500 bg-red-50/50 ring-2 ring-red-200' : ''}`} aria-invalid={!!newFormErrors.date} />
                                            {newFormErrors.date && <p className="mt-1.5 flex items-center gap-2 text-sm font-medium text-red-700" role="alert"><MdError className="w-4 h-4 flex-shrink-0" aria-hidden />{newFormErrors.date}</p>}
                                        </div>
                                        <div className="text-sm text-[var(--text-muted)] mt-2">
                                            No file is required for Lease of Venue. Click <span className="font-semibold text-[var(--text)]">Submit</span> below to save; the document will be marked complete.
                                        </div>
                                    </>
                                ) : selectedSubDocType === 'PHILGEPS - Lease of Venue' ? (
                                    <>
                                        <div>
                                            <label className="label">BAC Folder No.</label>
                                            <input
                                                type="text"
                                                readOnly
                                                value={nextTransactionNumber ?? '…'}
                                                className="input-field bg-[var(--background-subtle)] cursor-default"
                                                aria-readonly="true"
                                            />
                                        </div>
                                        <div className="text-sm text-[var(--text-muted)] mt-2 p-4 bg-green-50 rounded-xl border border-green-100 flex items-start gap-3">
                                            <MdInfo className="w-5 h-5 text-green-600 mt-0.5" aria-hidden />
                                            <span>
                                                No file or data is required for <strong>{selectedSubDocType}</strong>. Click <span className="font-semibold text-green-700">Submit / Save Updates</span> below to save; the document will automatically be marked complete.
                                            </span>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div>
                                            <label className="label">BAC Folder No.</label>
                                            <input
                                                type="text"
                                                readOnly
                                                value={nextTransactionNumber ?? '…'}
                                                className="input-field bg-[var(--background-subtle)] cursor-default"
                                                aria-readonly="true"
                                            />
                                        </div>
                                        {!selectedSubDocType?.startsWith('PHILGEPS - ') && (
                                            <div>
                                                <label className="label">Title <span className="text-red-600 font-semibold" aria-label="required">*</span></label>
                                                <input
                                                    type="text"
                                                    value={form.title}
                                                    onChange={(e) => {
                                                        const value = toLettersOnly(e.target.value);
                                                        setForm((f) => ({ ...f, title: value }));
                                                        if (newFormErrors.title) setManualErrors((e2) => ({ ...e2, title: '' }));
                                                    }}
                                                    className={`input-field ${newFormErrors.title ? 'border-2 border-red-500 bg-red-50/50 ring-2 ring-red-200' : ''}`}
                                                    placeholder="Document title"
                                                    aria-invalid={!!newFormErrors.title}
                                                    aria-describedby={newFormErrors.title ? 'err-title' : undefined}
                                                />
                                                {newFormErrors.title && (
                                                    <p id="err-title" className="mt-1.5 flex items-center gap-2 text-sm font-medium text-red-700" role="alert">
                                                        <MdError className="w-4 h-4 flex-shrink-0" aria-hidden />
                                                        {newFormErrors.title}
                                                    </p>
                                                )}
                                            </div>
                                        )}
                                        <div>
                                            <label className="label">Date</label>
                                            <input
                                                type="date"
                                                value={form.date}
                                                onChange={(e) => {
                                                    setForm((f) => ({ ...f, date: e.target.value }));
                                                    if (newFormErrors.date) setManualErrors((e2) => ({ ...e2, date: '' }));
                                                }}
                                                className={`input-field ${newFormErrors.date ? 'border-2 border-red-500 bg-red-50/50 ring-2 ring-red-200' : ''}`}
                                                aria-invalid={!!newFormErrors.date}
                                                aria-describedby={newFormErrors.date ? 'err-date' : undefined}
                                            />
                                            {newFormErrors.date && (
                                                <p id="err-date" className="mt-1.5 flex items-center gap-2 text-sm font-medium text-red-700" role="alert">
                                                    <MdError className="w-4 h-4 flex-shrink-0" aria-hidden />
                                                    {newFormErrors.date}
                                                </p>
                                            )}
                                        </div>
                                        {(() => {
                                            if (selectedSubDocType === 'PHILGEPS - Small Value Procurement' || selectedSubDocType === 'PHILGEPS - Public Bidding') return false;
                                            const kw = ['Lease of Venue', 'Small Value Procurement', 'Public Bidding', 'Minutes of the Meeting'];
                                            return kw.some(k => selectedSubDocType === k || selectedSubDocType?.includes(k));
                                        })() ? (
                                            <div className="text-sm text-[var(--text-muted)] mt-4 p-4 bg-green-50 rounded-xl border border-green-100 flex items-start gap-3">
                                                <MdInfo className="w-5 h-5 text-green-600 mt-0.5" aria-hidden />
                                                <span>
                                                    No file is required for <strong>{selectedSubDocType}</strong>. Click <span className="font-semibold text-green-700">Submit</span> below to save; the document will be marked complete as long as the date is provided.
                                                </span>
                                            </div>
                                        ) : (
                                            <div>
                                                <label className="label">Upload <span className="text-red-600 font-semibold" aria-label="required">*</span></label>
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <input
                                                        type="file"
                                                        onChange={(e) => {
                                                            setForm((f) => ({ ...f, file: e.target.files?.[0] ?? null }));
                                                            if (newFormErrors.file) setManualErrors((e2) => ({ ...e2, file: '' }));
                                                        }}
                                                        className={`input-field py-1.5 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-[#16a34a] file:hover:bg-[#15803d] file:active:bg-[#166534] file:text-white file:font-semibold file:cursor-pointer file:transition-colors file:duration-200 flex-1 min-w-0 ${newFormErrors.file ? 'border-2 border-red-500 bg-red-50/50 ring-2 ring-red-200' : ''}`}
                                                        accept=".pdf,.doc,.docx,.xls,.xlsx"
                                                        aria-invalid={!!newFormErrors.file}
                                                        aria-describedby={newFormErrors.file ? 'err-file' : undefined}
                                                    />
                                                </div>
                                                {newFormErrors.file && (
                                                    <p id="err-file" className="mt-1.5 flex items-center gap-2 text-sm font-medium text-red-700" role="alert">
                                                        <MdError className="w-4 h-4 flex-shrink-0" aria-hidden />
                                                        {newFormErrors.file}
                                                    </p>
                                                )}
                                            </div>
                                        )}
                                    </>
                                )}
                                {newError && (
                                    <div className="flex items-start gap-3 rounded-xl border-2 border-red-300 bg-red-50 px-4 py-3.5 mt-2" role="alert">
                                        <MdError className="w-5 h-5 flex-shrink-0 text-red-600 mt-0.5" aria-hidden />
                                        <p className="text-sm font-semibold text-red-800">{newError}</p>
                                    </div>
                                )}
                                <div className="flex justify-between gap-3 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setNewStep('subDoc')}
                                        className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--primary)] hover:text-[var(--primary-hover)] px-3 py-1.5 rounded-lg border border-transparent hover:border-[var(--primary-muted)] hover:bg-[var(--primary-muted)]/20 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-1"
                                    >
                                        <MdChevronLeft className="w-4 h-4" aria-hidden="true" />
                                        Back
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={newSubmitting}
                                        className="btn-primary min-w-[100px] flex items-center justify-center gap-2"
                                    >
                                        {newSubmitting ? (
                                            <>
                                                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                </svg>
                                                Saving...
                                            </>
                                        ) : (
                                            <>
                                                <MdCheckCircle className="w-4 h-4" />
                                                Submit
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            )}

            {/* Manage Documents modal – document type folders → BAC Folder No. → documents */}
            {activeModal === 'manage' && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
                    aria-modal="true"
                    role="dialog"
                >
                    <div className="card-elevated max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl rounded-2xl border-0">
                        <div className="p-6 border-b border-[var(--border-light)] flex items-center justify-between shrink-0 bg-[var(--surface)] rounded-t-2xl">
                            <div className="flex items-center gap-3 min-w-0">
                                {manageSelectedTypeId && (
                                    <button
                                        type="button"
                                        onClick={() => setManageSelectedTypeId(null)}
                                        className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--primary)] hover:text-[var(--primary-hover)] px-3 py-1.5 rounded-lg border border-transparent hover:border-[var(--primary-muted)] hover:bg-[var(--primary-muted)]/20 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-1"
                                        aria-label="Back to document types"
                                    >
                                        <MdChevronLeft className="w-4 h-4" aria-hidden="true" />
                                        Back
                                    </button>
                                )}
                                <h2 className="text-lg font-semibold text-[var(--text)] truncate">
                                    {!manageSelectedTypeId ? 'Manage Documents' : (DOC_TYPES.find((d) => d.id === manageSelectedTypeId)?.name || 'Documents')}
                                </h2>
                            </div>
                            <button
                                type="button"
                                onClick={() => { setActiveModal(null); setManageSelectedTypeId(null); setManageFolderPopup(null); }}
                                className="p-2 text-[var(--text-muted)] hover:bg-[var(--background-subtle)] hover:text-[var(--text)] rounded-lg transition-colors shrink-0"
                                aria-label="Close"
                            >
                                <MdClose className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-auto p-6">
                            {!manageSelectedTypeId ? (
                                /* Level 1: Document type folders */
                                <>
                                    {manageRefreshing && (
                                        <div className="flex items-center justify-center gap-2 py-3 text-sm text-[var(--text-muted)]">
                                            <span>Loading all documents…</span>
                                        </div>
                                    )}
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                    {DOC_TYPES.map((docType) => {
                                        const categoryName = (docType.name || '').trim();
                                        const docsInType = documents.filter((d) => (d.category || '').trim().toLowerCase() === categoryName.toLowerCase());
                                        const folderCount = new Set(docsInType.map((d) => (d.prNo || '').trim()).filter(Boolean)).size;
                                        return (
                                            <button
                                                key={docType.id}
                                                type="button"
                                                onClick={() => setManageSelectedTypeId(docType.id)}
                                                className="flex flex-col items-stretch rounded-xl border-2 border-[var(--border)] bg-[var(--surface)] hover:border-[var(--primary)] hover:bg-[var(--primary-muted)]/20 p-4 text-left transition-all shadow-sm"
                                            >
                                                <div className="w-12 h-12 rounded-xl bg-[var(--primary-muted)] flex items-center justify-center text-[var(--primary)] mb-3">
                                                    <MdFolder className="w-7 h-7" />
                                                </div>
                                                <p className="font-semibold text-[var(--text)] truncate">{docType.name}</p>
                                                <p className="text-xs text-[var(--text-muted)] mt-0.5">{folderCount} BAC folder{folderCount !== 1 ? 's' : ''}</p>
                                            </button>
                                        );
                                    })}
                                </div>
                                </>
                            ) : !manageSelectedPrNo ? (
                                /* Level 2: BAC Folder No. list (sorted) for this document type */
                                (() => {
                                    const docType = DOC_TYPES.find((d) => d.id === manageSelectedTypeId);
                                    const categoryName = (docType?.name || '').trim();
                                    const docsInCategory = documents.filter((d) => (d.category || '').trim().toLowerCase() === categoryName.toLowerCase());
                                    const prNoList = [...new Set(docsInCategory.map((d) => (d.prNo || '').trim()).filter(Boolean))].sort();
                                    if (prNoList.length === 0) {
                                        return (
                                            <p className="text-sm text-[var(--text-muted)] text-center py-8">No BAC folders yet for this document type.</p>
                                        );
                                    }
                                    return (
                                        <div className="space-y-2">
                                            <ul className="divide-y divide-[var(--border)] border border-[var(--border)] rounded-xl overflow-hidden bg-[var(--surface)]">
                                                {prNoList.map((prNo) => {
                                                    const count = docsInCategory.filter((d) => (d.prNo || '').trim() === prNo).length;
                                                    return (
                                                        <li key={prNo}>
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setManageFolderPopup({ typeId: manageSelectedTypeId, prNo });
                                                                    setManageFolderPopupIndex(0);
                                                                }}
                                                                className="w-full px-4 py-3 flex items-center justify-between gap-3 text-left hover:bg-[var(--primary-muted)]/30 transition-colors"
                                                            >
                                                                <span className="font-medium text-[var(--text)]">BAC Folder No. {prNo}</span>
                                                                <span className="text-sm text-[var(--text-muted)]">{count} document{count !== 1 ? 's' : ''}</span>
                                                            </button>
                                                        </li>
                                                    );
                                                })}
                                            </ul>
                                        </div>
                                    );
                                })()
                            ) : null}
                        </div>
                    </div>
                </div>
            )}

            {/* Manage: popup when a BAC Folder is clicked – shows the file itself automatically (no View/Update) */}
            {activeModal === 'manage' && manageFolderPopup && (() => {
                const docType = DOC_TYPES.find((d) => d.id === manageFolderPopup.typeId);
                const categoryName = (docType?.name || '').trim();
                const docs = documents.filter(
                    (d) => (d.category || '').trim().toLowerCase() === categoryName.toLowerCase() && (d.prNo || '').trim() === manageFolderPopup.prNo
                );
                const totalDocs = docs.length;
                const currentIndex = Math.min(manageFolderPopupIndex, Math.max(0, totalDocs - 1));
                const currentDoc = docs[currentIndex] || null;
                const showNav = totalDocs > 1;
                return (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" aria-modal="true" role="dialog">
                        <div className="bg-[var(--surface)] rounded-2xl shadow-2xl border border-[var(--border)] max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                            <div className="p-4 border-b border-[var(--border)] flex items-center justify-between shrink-0">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-xl bg-green-600 text-white shadow-sm">
                                        <MdFolder className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className="text-base font-bold text-[var(--text)]">BAC Folder No. {manageFolderPopup.prNo}</h3>
                                        <p className="text-xs text-[var(--text-muted)]">Document {currentIndex + 1} of {totalDocs}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setManageFolderPopup(null);
                                        }}
                                        className="p-2 text-[var(--text-muted)] hover:bg-[var(--background-subtle)] rounded-lg transition-colors"
                                        aria-label="Close"
                                    >
                                        <MdClose className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                            <div className="flex-1 overflow-hidden flex flex-col lg:flex-row min-h-0">
                                {totalDocs === 0 ? (
                                    <div className="p-12 text-center text-[var(--text-muted)] w-full flex flex-col items-center justify-center">
                                        <MdDescription className="w-16 h-16 opacity-20 mb-4" />
                                        <p className="text-lg font-medium">No documents in this folder.</p>
                                    </div>
                                ) : (
                                    <>
                                        {/* Left Side: Procurement Details (Desktop) */}
                                        <div className="hidden lg:block w-[320px] shrink-0 min-h-0">
                                            <DocDetailsView doc={currentDoc} />
                                        </div>

                                        {/* Right Side: Preview & Meta */}
                                        <div className="flex-1 overflow-hidden flex flex-col min-h-0 bg-gray-50/50">
                                            {/* Details for mobile only */}
                                            <div className="lg:hidden border-b border-[var(--border)] max-h-48 overflow-y-auto shrink-0 bg-white">
                                                <DocDetailsView doc={currentDoc} />
                                            </div>

                                            <div className="flex-1 overflow-auto p-4 min-h-0 flex flex-col">
                                                {!manageFolderPopupPreview ? (
                                                    <div className="flex flex-col items-center justify-center flex-1 min-h-[480px] text-[var(--text-muted)] rounded-2xl border-2 border-dashed border-[var(--border)] bg-white/50">
                                                        <div className="w-12 h-12 rounded-full border-4 border-[var(--border)] border-t-green-600 animate-spin mb-4" aria-hidden />
                                                        <span className="font-medium">Loading document metadata…</span>
                                                    </div>
                                                ) : manageFolderPopupPreview.previewBlobUrl === 'no-file' ? (
                                                    <div className="flex flex-col items-center justify-center flex-1 min-h-[480px] text-[var(--text-muted)] rounded-2xl border-2 border-dashed border-[var(--border)] bg-white/50">
                                                        <MdError className="w-12 h-12 text-amber-500 mb-4" />
                                                        <p className="text-lg font-bold text-[var(--text)]">No file available</p>
                                                        <p className="text-sm mt-1 max-w-[240px] text-center">This document record exists but no digital file was uploaded.</p>
                                                    </div>
                                                ) : manageFolderPopupPreview.previewBlobUrl === 'failed' ? (
                                                    <div className="flex flex-col items-center justify-center flex-1 min-h-[480px] text-[var(--text-muted)] rounded-2xl border-2 border-dashed border-red-100 bg-red-50/30">
                                                        <MdError className="w-12 h-12 text-red-500 mb-4" />
                                                        <p className="text-lg font-bold text-red-700">Preview Failed</p>
                                                        <p className="text-sm mt-1 text-red-600 text-center">Could not load the document preview.</p>
                                                    </div>
                                                ) : manageFolderPopupPreview.previewBlobUrl ? (
                                                    (() => {
                                                        const ct = manageFolderPopupPreview.previewBlobType || '';
                                                        const isPdf = ct.includes('pdf');
                                                        const isImage = /^image\//.test(ct);
                                                        const previewBoxClass = 'w-full min-h-[480px] flex-1 rounded-2xl border border-[var(--border)] bg-white shadow-sm overflow-hidden flex flex-col';
                                                        const docTitle = manageFolderPopupPreview.doc?.title || manageFolderPopupPreview.doc?.subDoc || 'Document';
                                                        const previewActionBar = (
                                                            <div className="w-full flex items-center justify-between gap-4 px-2 mb-3">
                                                                <div className="min-w-0">
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="px-2 py-0.5 rounded bg-green-100 text-green-700 text-[10px] font-bold uppercase tracking-wider">Preview</span>
                                                                        <p className="text-sm font-bold text-[var(--text)] truncate">{docTitle}</p>
                                                                    </div>
                                                                </div>
                                                                <div className="flex items-center gap-2 shrink-0">
                                                                    {isAdmin && currentDoc?.file_url && (
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => triggerDownload(currentDoc)}
                                                                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-green-600 hover:bg-green-700 active:bg-green-800 text-white text-xs font-bold shadow-sm transition-all hover:scale-105 active:scale-95 whitespace-nowrap"
                                                                            aria-label="Download file"
                                                                        >
                                                                            <MdDownload className="w-4 h-4" />
                                                                            Download File
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        );
                                                        if (isPdf) {
                                                            return (
                                                                <div className="h-full flex flex-col">
                                                                    {previewActionBar}
                                                                    <div className={previewBoxClass}>
                                                                        <embed
                                                                            src={`${manageFolderPopupPreview.previewBlobUrl}#toolbar=0&navpanes=0`}
                                                                            type="application/pdf"
                                                                            className="w-full h-full flex-1 border-0"
                                                                            title={docTitle}
                                                                        />
                                                                    </div>
                                                                </div>
                                                            );
                                                        }
                                                        if (isImage) {
                                                            return (
                                                                <div className="h-full flex flex-col">
                                                                    {previewActionBar}
                                                                    <div className={previewBoxClass}>
                                                                        <div className="flex-1 flex items-center justify-center p-6 bg-gray-200/50">
                                                                            <img
                                                                                src={manageFolderPopupPreview.previewBlobUrl}
                                                                                alt={docTitle}
                                                                                className="max-w-full max-h-[60vh] object-contain shadow-md rounded-lg"
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            );
                                                        }
                                                        return (
                                                            <div className="h-full flex flex-col">
                                                                {previewActionBar}
                                                                <div className={previewBoxClass}>
                                                                    <iframe
                                                                        src={manageFolderPopupPreview.previewBlobUrl}
                                                                        title={docTitle}
                                                                        className="w-full h-full flex-1 border-0"
                                                                        sandbox="allow-same-origin"
                                                                    />
                                                                </div>
                                                            </div>
                                                        );
                                                    })()
                                                ) : (
                                                    <div className="flex flex-col items-center justify-center flex-1 min-h-[480px] text-[var(--text-muted)] rounded-2xl border-2 border-dashed border-[var(--border)] bg-white/50">
                                                        <div className="w-12 h-12 rounded-full border-4 border-[var(--border)] border-t-green-600 animate-spin mb-4" aria-hidden />
                                                        <span className="font-medium">Loading digital file…</span>
                                                    </div>
                                                )}
                                            </div>
                                            {showNav && (
                                                <div className="px-6 py-4 border-t border-[var(--border)] flex items-center justify-between shrink-0 bg-white shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                                                    <button
                                                        type="button"
                                                        onClick={() => setManageFolderPopupIndex((i) => Math.max(0, i - 1))}
                                                        disabled={currentIndex === 0}
                                                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-[var(--border)] text-sm font-bold text-[var(--text)] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[var(--background-subtle)] transition-all active:scale-95"
                                                        aria-label="Previous"
                                                    >
                                                        <MdChevronLeft className="w-5 h-5 font-bold" />
                                                        Prev
                                                    </button>
                                                    <div className="flex items-center gap-2">
                                                        <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-green-50 text-green-700 font-bold text-xs">
                                                            {currentIndex + 1}
                                                        </span>
                                                        <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">of {totalDocs}</span>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => setManageFolderPopupIndex((i) => Math.min(totalDocs - 1, i + 1))}
                                                        disabled={currentIndex >= totalDocs - 1}
                                                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-[var(--border)] text-sm font-bold text-[var(--text)] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[var(--background-subtle)] transition-all active:scale-95"
                                                        aria-label="Next"
                                                    >
                                                        Next
                                                        <MdChevronRight className="w-5 h-5 font-bold" />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* Update documents selection modal – checklist by document type and sub-document */}
            {activeModal === 'updateList' && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
                    aria-modal="true"
                    role="dialog"
                >
                    <div className="card-elevated max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl rounded-2xl border-0">
                        <div className="p-6 border-b border-[var(--border-light)] flex items-center justify-between sticky top-0 bg-[var(--surface)] rounded-t-2xl z-10">
                            <h2 className="text-lg font-semibold text-[var(--text)]">
                                Update Documents
                            </h2>
                            <button
                                type="button"
                                onClick={() => {
                                    setActiveModal(null);
                                    setSelectedDoc(null);
                                    setUpdateError('');
                                }}
                                className="p-2 text-[var(--text-muted)] hover:bg-[var(--background-subtle)] hover:text-[var(--text)] rounded-lg transition-all duration-200 hover:scale-110 active:scale-95 focus:outline-none focus:ring-2 focus:ring-[var(--border)] focus:ring-offset-1"
                                aria-label="Close"
                            >
                                <MdClose className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 space-y-5">
                            {loading ? (
                                <div className="py-16 text-center">
                                    <div className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-[var(--border)] border-t-[var(--primary)] mx-auto mb-3" />
                                    <p className="text-sm text-[var(--text-muted)]">Loading documents...</p>
                                </div>
                            ) : (
                                <>
                                    {documents.length === 0 && (
                                        <p className="text-sm text-[var(--text-muted)] text-center rounded-xl bg-[var(--background-subtle)] px-4 py-3">
                                            No documents uploaded yet.
                                        </p>
                                    )}

                                    {/* Document checklist – grouped by document type, click a document to update it */}
                                    <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
                                        <p className="text-xs text-[var(--text-muted)]">Only documents you uploaded can be updated. Click a document to update it.</p>
                                        {updateChecklistData.map((docType) => {
                                            const subs = docType.subDocsWithStatus || [];
                                            const completed = subs.filter((s) => s.done).length;
                                            const ongoing = subs.filter((s) => !s.done && s.doc).length;
                                            const pending = subs.filter((s) => !s.doc).length;
                                            const total = subs.length;
                                            return (
                                                <div
                                                    key={docType.id}
                                                    className="rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden shadow-sm"
                                                >
                                                    <div className="px-4 py-3 bg-[var(--primary)]/10 border-b border-[var(--border)]">
                                                        <p className="text-sm font-semibold text-[var(--text)]">{docType.name}</p>
                                                        <p className="text-xs text-[var(--text-muted)] mt-1">
                                                            {total} document{total !== 1 ? 's' : ''}:{' '}
                                                            <span className="text-green-700 font-medium">{completed} Complete</span>
                                                            {ongoing > 0 && <><span className="text-[var(--text-muted)]"> · </span><span className="text-amber-700 font-medium">{ongoing} Ongoing</span></>}
                                                            {pending > 0 && <><span className="text-[var(--text-muted)]"> · </span><span className="text-[var(--text-muted)] font-medium">{pending} Pending</span></>}
                                                        </p>
                                                    </div>
                                                    <ul className="divide-y divide-[var(--border)]">
                                                        {subs.map((sub) => {
                                                            const hasDoc = !!sub.doc;
                                                            const status = sub.done ? 'complete' : hasDoc ? 'ongoing' : 'pending';
                                                            return (
                                                                <li key={`${docType.id}-${sub.name}`}>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => hasDoc && sub.canUpdate && handleChecklistSubDocClick(sub)}
                                                                        disabled={!hasDoc || !sub.canUpdate}
                                                                        className={`w-full px-4 py-2.5 flex items-center justify-between gap-3 text-left transition-colors text-sm ${hasDoc && sub.canUpdate ? 'hover:bg-[var(--primary-muted)]/30 cursor-pointer' : 'cursor-not-allowed opacity-60'}`}
                                                                    >
                                                                        <span className="font-medium text-[var(--text)] truncate">{sub.name}</span>
                                                                        <span className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${
                                                                            status === 'complete' ? 'bg-green-100 text-green-800' :
                                                                            status === 'ongoing' ? 'bg-amber-100 text-amber-800' :
                                                                            'bg-[var(--background-subtle)] text-[var(--text-muted)]'
                                                                        }`}>
                                                                            {status === 'complete' ? 'Complete' : status === 'ongoing' ? 'Ongoing' : 'Not started'}
                                                                        </span>
                                                                    </button>
                                                                </li>
                                                            );
                                                        })}
                                                    </ul>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Update documents modal */}
            {activeModal === 'update' && selectedDoc && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
                    aria-modal="true"
                    role="dialog"
                >
                    <div className="card-elevated max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl rounded-2xl border-0">
                        <div className="p-6 border-b border-[var(--border-light)] flex items-center justify-between sticky top-0 bg-[var(--surface)] rounded-t-2xl z-10">
                            <h2 className="text-lg font-semibold text-[var(--text)]">
                                Update Procurement Document
                            </h2>
                            <button
                                type="button"
                                onClick={() => {
                                    setActiveModal(null);
                                    setSelectedDoc(null);
                                    setUpdateError('');
                                }}
                                className="p-2 text-[var(--text-muted)] hover:bg-[var(--background-subtle)] hover:text-[var(--text)] rounded-lg transition-all duration-200 hover:scale-110 active:scale-95 focus:outline-none focus:ring-2 focus:ring-[var(--border)] focus:ring-offset-1"
                                aria-label="Close"
                            >
                                <MdClose className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleUpdateSubmit} className="p-6 space-y-5">
                            {updateError && (
                                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm" role="alert">
                                    {updateError}
                                </div>
                            )}

                            {selectedDoc?.subDoc === 'Purchase Request' ? (
                                <>
                                    <div>
                                        <label className="label">BAC Folder No.</label>
                                        <input
                                            type="text"
                                            readOnly
                                            value={form.prNo}
                                            className="input-field bg-[var(--background-subtle)] cursor-default"
                                            aria-readonly="true"
                                        />
                                    </div>
                                    <div>
                                        <label className="label">Purpose</label>
                                        <input
                                            type="text"
                                            value={form.title}
                                            onChange={(e) => setForm((f) => ({ ...f, title: toLettersOnly(e.target.value) }))}
                                            className="input-field"
                                            placeholder="Purpose of the purchase request"
                                        />
                                    </div>
                                    <div>
                                        <label className="label">PR No.</label>
                                        <input
                                            type="text"
                                            value={form.user_pr_no}
                                            onChange={(e) => setForm((f) => ({ ...f, user_pr_no: e.target.value }))}
                                            className="input-field"
                                            placeholder="Enter PR number"
                                        />
                                    </div>
                                    <div>
                                        <label className="label">Date</label>
                                        <input
                                            type="date"
                                            value={form.date}
                                            onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                                            className="input-field"
                                        />
                                    </div>
                                        <div>
                                            <label className="label">Total amount</label>
                                            <div className="flex items-center border border-[var(--border)] rounded-[var(--radius-sm)] bg-[var(--surface)] overflow-hidden focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
                                                <span className="pl-4 text-[var(--text)] font-medium" aria-hidden="true">₱</span>
                                                <input
                                                    type="text"
                                                    inputMode="decimal"
                                                    value={form.total_amount}
                                                    onChange={(e) => setForm((f) => ({ ...f, total_amount: toNumbersOnly(e.target.value) }))}
                                                    className="input-field input-currency border-0 rounded-none focus:ring-0 focus:shadow-none w-full min-w-0"
                                                    placeholder="0.00"
                                                />
                                            </div>
                                        </div>
                                </>
                            ) : selectedDoc?.subDoc === 'Activity Design' ? (
                                <>
                                    <div>
                                        <label className="label">BAC Folder No.</label>
                                        <input
                                            type="text"
                                            readOnly
                                            value={form.prNo}
                                            className="input-field bg-[var(--background-subtle)] cursor-default"
                                            aria-readonly="true"
                                        />
                                    </div>
                                    <div>
                                        <label className="label">Title</label>
                                        <input
                                            type="text"
                                            value={form.title}
                                            onChange={(e) => setForm((f) => ({ ...f, title: toLettersOnly(e.target.value) }))}
                                            className="input-field"
                                            placeholder="Document title"
                                        />
                                    </div>
                                    <div>
                                        <label className="label">PR No.</label>
                                        <input
                                            type="text"
                                            value={form.user_pr_no}
                                            onChange={(e) => setForm((f) => ({ ...f, user_pr_no: e.target.value }))}
                                            className="input-field"
                                            placeholder="Enter PR number"
                                        />
                                    </div>
                                    <div>
                                        <label className="label">Source of Fund</label>
                                        <input
                                            type="text"
                                            value={form.source_of_fund}
                                            onChange={(e) => setForm((f) => ({ ...f, source_of_fund: toLettersOnly(e.target.value) }))}
                                            className="input-field"
                                            placeholder="Source of fund"
                                        />
                                    </div>
                                        <div>
                                            <label className="label">Total Amount</label>
                                            <div className="flex items-center border border-[var(--border)] rounded-[var(--radius-sm)] bg-[var(--surface)] overflow-hidden focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
                                                <span className="pl-4 text-[var(--text)] font-medium" aria-hidden="true">₱</span>
                                                <input
                                                    type="text"
                                                    inputMode="decimal"
                                                    value={form.total_amount}
                                                    onChange={(e) => setForm((f) => ({ ...f, total_amount: toNumbersOnly(e.target.value) }))}
                                                    className="input-field input-currency border-0 rounded-none focus:ring-0 focus:shadow-none w-full min-w-0"
                                                    placeholder="0.00"
                                                />
                                            </div>
                                        </div>
                                </>
                            ) : selectedDoc?.subDoc === 'Project Procurement Management Plan/Supplemental PPMP' ? (
                                <>
                                    <div>
                                        <label className="label">BAC Folder No.</label>
                                        <input
                                            type="text"
                                            readOnly
                                            value={form.prNo}
                                            className="input-field bg-[var(--background-subtle)] cursor-default"
                                            aria-readonly="true"
                                        />
                                    </div>
                                    <div>
                                        <label className="label">Title</label>
                                        <input
                                            type="text"
                                            value={form.title}
                                            onChange={(e) => setForm((f) => ({ ...f, title: toLettersOnly(e.target.value) }))}
                                            className="input-field"
                                            placeholder="Document title"
                                        />
                                    </div>
                                    <div>
                                        <label className="label">PPMP No.</label>
                                        <input
                                            type="text"
                                            value={form.ppmp_no}
                                            onChange={(e) => setForm((f) => ({ ...f, ppmp_no: toNumbersOnly(e.target.value) }))}
                                            className="input-field"
                                            placeholder="Enter PPMP number"
                                        />
                                    </div>
                                    <div>
                                        <label className="label">Source of Fund</label>
                                        <input
                                            type="text"
                                            value={form.source_of_fund}
                                            onChange={(e) => setForm((f) => ({ ...f, source_of_fund: toLettersOnly(e.target.value) }))}
                                            className="input-field"
                                            placeholder="Source of fund"
                                        />
                                    </div>
                                        <div>
                                            <label className="label">Total Budget</label>
                                            <div className="flex items-center border border-[var(--border)] rounded-[var(--radius-sm)] bg-[var(--surface)] overflow-hidden focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
                                                <span className="pl-4 text-[var(--text)] font-medium" aria-hidden="true">₱</span>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    min="0"
                                                    value={form.total_amount}
                                                    onChange={(e) => setForm((f) => ({ ...f, total_amount: toNumbersOnly(e.target.value) }))}
                                                    className="input-field input-currency border-0 rounded-none focus:ring-0 focus:shadow-none w-full min-w-0"
                                                    placeholder="0.00"
                                                />
                                            </div>
                                        </div>
                                </>
                            ) : selectedDoc?.subDoc === 'Annual Procurement Plan' ? (
                                <>
                                    <div>
                                        <label className="label">Title</label>
                                        <input
                                            type="text"
                                            value={form.title}
                                            onChange={(e) => setForm((f) => ({ ...f, title: toLettersOnly(e.target.value) }))}
                                            className="input-field"
                                            placeholder="Document title"
                                        />
                                    </div>
                                    <div>
                                        <label className="label">APP No.</label>
                                        <select
                                            value={form.app_type}
                                            onChange={(e) => setForm((f) => ({ ...f, app_type: e.target.value }))}
                                            className="input-field"
                                        >
                                            <option value="">Select</option>
                                            <option value="Final">Final</option>
                                            <option value="Updated">Updated</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="label">Certified True Copy?</label>
                                        <div className="flex items-center gap-3">
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="radio"
                                                    name="certified_true_copy_app_update"
                                                    checked={form.certified_true_copy === true}
                                                    onChange={() => setForm((f) => ({ ...f, certified_true_copy: true }))}
                                                    className="rounded border-[var(--border)] text-[var(--primary)] focus:ring-[var(--primary)]"
                                                />
                                                <span className="text-sm text-[var(--text)]">Yes</span>
                                            </label>
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="radio"
                                                    name="certified_true_copy_app_update"
                                                    checked={form.certified_true_copy === false}
                                                    onChange={() => setForm((f) => ({ ...f, certified_true_copy: false, certified_signed_by: '' }))}
                                                    className="rounded border-[var(--border)] text-[var(--primary)] focus:ring-[var(--primary)]"
                                                />
                                                <span className="text-sm text-[var(--text)]">No</span>
                                            </label>
                                        </div>
                                        {form.certified_true_copy && (
                                            <div className="mt-2">
                                                <label className="label">Signed by</label>
                                                <input
                                                    type="text"
                                                    value={form.certified_signed_by}
                                                    onChange={(e) => setForm((f) => ({ ...f, certified_signed_by: e.target.value }))}
                                                    className="input-field"
                                                    placeholder="Name of signatory"
                                                />
                                            </div>
                                        )}
                                    </div>
                                </>
                            ) : selectedDoc?.subDoc === 'Market Scopping' ? (
                                <>
                                    <div>
                                        <label className="label">Title</label>
                                        <input
                                            type="text"
                                            value={form.title}
                                            onChange={(e) => setForm((f) => ({ ...f, title: toLettersOnly(e.target.value) }))}
                                            className="input-field"
                                            placeholder="Document title"
                                        />
                                    </div>
                                        <div>
                                            <label className="label">Budget</label>
                                            <div className="flex items-center border border-[var(--border)] rounded-[var(--radius-sm)] bg-[var(--surface)] overflow-hidden focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
                                                <span className="pl-4 text-[var(--text)] font-medium" aria-hidden="true">₱</span>
                                                <input
                                                    type="text"
                                                    inputMode="decimal"
                                                    value={form.market_budget}
                                                    onChange={(e) => setForm((f) => ({ ...f, market_budget: toNumbersOnly(e.target.value) }))}
                                                    className="input-field input-currency border-0 rounded-none focus:ring-0 focus:shadow-none w-full min-w-0"
                                                    placeholder="0.00"
                                                />
                                            </div>
                                        </div>
                                    <div>
                                        <label className="label">Period of market scoping</label>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="label text-xs">From</label>
                                                <input
                                                    type="month"
                                                    value={form.market_period_from}
                                                    onChange={(e) => setForm((f) => ({ ...f, market_period_from: e.target.value }))}
                                                    className="input-field"
                                                />
                                            </div>
                                            <div>
                                                <label className="label text-xs">To</label>
                                                <input
                                                    type="month"
                                                    value={form.market_period_to}
                                                    onChange={(e) => setForm((f) => ({ ...f, market_period_to: e.target.value }))}
                                                    className="input-field"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="label">Expected Delivery</label>
                                        <input
                                            type="month"
                                            value={form.market_expected_delivery}
                                            onChange={(e) => setForm((f) => ({ ...f, market_expected_delivery: e.target.value }))}
                                            className="input-field"
                                        />
                                    </div>
                                    <div>
                                        <label className="label">Service Providers (all 3 required)</label>
                                        <input
                                            type="text"
                                            value={form.market_service_provider_1}
                                            onChange={(e) => setForm((f) => ({ ...f, market_service_provider_1: toLettersOnly(e.target.value) }))}
                                            className="input-field"
                                            placeholder="Service Provider 1"
                                        />
                                        <input
                                            type="text"
                                            value={form.market_service_provider_2}
                                            onChange={(e) => setForm((f) => ({ ...f, market_service_provider_2: toLettersOnly(e.target.value) }))}
                                            className="input-field mt-2"
                                            placeholder="Service Provider 2"
                                        />
                                        <input
                                            type="text"
                                            value={form.market_service_provider_3}
                                            onChange={(e) => setForm((f) => ({ ...f, market_service_provider_3: toLettersOnly(e.target.value) }))}
                                            className="input-field mt-2"
                                            placeholder="Service Provider 3"
                                        />
                                    </div>
                                </>
                            ) : selectedDoc?.subDoc === 'Requisition and Issue Slip' ? (
                                <>
                                    <div>
                                        <label className="label">BAC Folder No.</label>
                                        <input
                                            type="text"
                                            readOnly
                                            value={form.prNo}
                                            className="input-field bg-[var(--background-subtle)] cursor-default"
                                            aria-readonly="true"
                                        />
                                    </div>
                                    <div>
                                        <label className="label">Purpose</label>
                                        <input
                                            type="text"
                                            value={form.title}
                                            onChange={(e) => setForm((f) => ({ ...f, title: toLettersOnly(e.target.value) }))}
                                            className="input-field"
                                            placeholder="Purpose of the requisition"
                                        />
                                    </div>
                                    <div>
                                        <label className="label">Office/Division</label>
                                        <input
                                            type="text"
                                            value={form.office_division}
                                            onChange={(e) => setForm((f) => ({ ...f, office_division: toLettersOnly(e.target.value) }))}
                                            className="input-field"
                                            placeholder="Office or division"
                                        />
                                    </div>
                                        <div>
                                            <label className="label">Received By</label>
                                            <input
                                                type="text"
                                                value={form.received_by}
                                                onChange={(e) => setForm((f) => ({ ...f, received_by: toLettersOnly(e.target.value) }))}
                                                className="input-field"
                                                placeholder="Name of recipient"
                                            />
                                        </div>
                                    <div>
                                        <label className="label">Date</label>
                                        <input
                                            type="date"
                                            value={form.date}
                                            onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                                            className="input-field"
                                        />
                                    </div>
                                </>
                            ) : selectedDoc?.subDoc === 'Notice of BAC Meeting' ? (
                                <>
                                    <div>
                                        <label className="label">Agenda</label>
                                        <input
                                            type="text"
                                            value={form.title}
                                            onChange={(e) => setForm((f) => ({ ...f, title: toLettersOnly(e.target.value) }))}
                                            className="input-field"
                                            placeholder="Agenda of the BAC meeting"
                                        />
                                    </div>
                                    <div>
                                        <label className="label">Date</label>
                                        <input
                                            type="date"
                                            value={form.date}
                                            onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                                            className="input-field"
                                        />
                                    </div>
                                </>
                            ) : selectedDoc?.subDoc === 'Invitation to COA' ? (
                                <>
                                    <div>
                                        <label className="label">Date</label>
                                        <input
                                            type="date"
                                            value={form.date}
                                            onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                                            className="input-field"
                                        />
                                    </div>
                                    <div>
                                        <label className="label">Date received</label>
                                        <input
                                            type="date"
                                            value={form.date_received}
                                            onChange={(e) => setForm((f) => ({ ...f, date_received: e.target.value }))}
                                            className="input-field"
                                        />
                                    </div>
                                </>
                            ) : selectedDoc?.subDoc === 'Attendance Sheet' ? (
                                <>
                                    <div>
                                        <label className="label">Agenda</label>
                                        <input
                                            type="text"
                                            value={form.title}
                                            onChange={(e) => setForm((f) => ({ ...f, title: toLettersOnly(e.target.value) }))}
                                            className="input-field"
                                            placeholder="Agenda"
                                        />
                                    </div>
                                    <div>
                                        <label className="label">Date</label>
                                        <input
                                            type="date"
                                            value={form.date}
                                            onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                                            className="input-field"
                                        />
                                    </div>
                                    <div>
                                        <label className="label">List of BAC Members</label>
                                        <p className="text-xs text-[var(--text-muted)] mb-2">Present = checked, Absent = unchecked.</p>
                                        {attendanceMembers.map((m) => (
                                            <div key={m.id} className="flex items-center gap-3 mb-2">
                                                <input
                                                    type="text"
                                                    value={m.name}
                                                    onChange={(e) => setAttendanceMembers((prev) => prev.map((x) => (x.id === m.id ? { ...x, name: e.target.value } : x)))}
                                                    className="input-field flex-1 min-w-0"
                                                    placeholder="Member name"
                                                />
                                                <label className="flex items-center gap-2 shrink-0 cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={m.present}
                                                        onChange={(e) => setAttendanceMembers((prev) => prev.map((x) => (x.id === m.id ? { ...x, present: e.target.checked } : x)))}
                                                        className="rounded border-[var(--border)] text-[var(--primary)] focus:ring-[var(--primary)]"
                                                    />
                                                    <span className="text-sm text-[var(--text)]">Present</span>
                                                </label>
                                                <button
                                                    type="button"
                                                    onClick={() => setAttendanceMembers((prev) => prev.filter((x) => x.id !== m.id))}
                                                    className="p-2 text-[var(--text-muted)] hover:text-red-600 hover:bg-red-50 rounded"
                                                    aria-label="Remove member"
                                                >
                                                    <MdClose className="w-5 h-5" />
                                                </button>
                                            </div>
                                        ))}
                                        <button
                                            type="button"
                                            onClick={() => setAttendanceMembers((prev) => [...prev, { id: Date.now(), name: '', present: true }])}
                                            className="text-sm text-[var(--primary)] hover:underline font-medium"
                                        >
                                            + Add BAC member
                                        </button>
                                    </div>
                                </>
                            ) : selectedDoc?.subDoc === 'Minutes of the Meeting' ? (
                                <>
                                    <div>
                                        <label className="label">Agenda/Others</label>
                                        <input
                                            type="text"
                                            value={form.title}
                                            onChange={(e) => setForm((f) => ({ ...f, title: toLettersOnly(e.target.value) }))}
                                            className="input-field"
                                            placeholder="Agenda or other details"
                                        />
                                    </div>
                                    <div>
                                        <label className="label">Date</label>
                                        <input
                                            type="date"
                                            value={form.date}
                                            onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                                            className="input-field"
                                        />
                                    </div>
                                </>
                            ) : selectedDoc?.subDoc === 'BAC Resolution' ? (
                                <>
                                    <div>
                                        <label className="label">BAC Folder No.</label>
                                        <input type="text" readOnly value={form.prNo} className="input-field bg-[var(--background-subtle)] cursor-default" aria-readonly="true" />
                                    </div>
                                    <div>
                                        <label className="label">Resolution No.</label>
                                        <input type="text" value={form.resolution_no} onChange={(e) => setForm((f) => ({ ...f, resolution_no: toNumbersOnly(e.target.value) }))} className="input-field" placeholder="Resolution number" />
                                    </div>
                                    <div>
                                        <label className="label">Title</label>
                                        <input type="text" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} className="input-field" placeholder="Title" />
                                    </div>
                                    <div>
                                        <label className="label">Winning Bidder</label>
                                        <input type="text" value={form.winning_bidder} onChange={(e) => setForm((f) => ({ ...f, winning_bidder: toLettersOnly(e.target.value) }))} className="input-field" placeholder="Winning bidder name" />
                                    </div>
                                    <div>
                                        <label className="label">Amount</label>
                                        <div className="flex items-center border border-[var(--border)] rounded-[var(--radius-sm)] bg-[var(--surface)] overflow-hidden focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
                                            <span className="pl-4 text-[var(--text)] font-medium" aria-hidden="true">₱</span>
                                            <input
                                                type="text"
                                                inputMode="decimal"
                                                value={formatCurrencyValue(form.total_amount)}
                                                onChange={(e) => setForm((f) => ({ ...f, total_amount: toNumbersOnly(e.target.value) }))}
                                                className="input-field input-currency border-0 rounded-none focus:ring-0 focus:shadow-none w-full min-w-0"
                                                placeholder="0.00"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="label">Options</label>
                                        <select value={form.resolution_option} onChange={(e) => setForm((f) => ({ ...f, resolution_option: e.target.value }))} className="input-field">
                                            <option value="">Select option</option>
                                            <option value="LCB">LCB</option>
                                            <option value="LCRB">LCRB</option>
                                            <option value="SCB">SCB</option>
                                            <option value="SCRB">SCRB</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="label">Office/Division</label>
                                        <input type="text" value={form.office_division} onChange={(e) => setForm((f) => ({ ...f, office_division: toLettersOnly(e.target.value) }))} className="input-field" placeholder="Office or division" />
                                    </div>
                                    <div>
                                        <label className="label">Date of Adoption</label>
                                        <input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} className="input-field" />
                                    </div>
                                    <div>
                                        <label className="label">Venue</label>
                                        <input type="text" value={form.venue} onChange={(e) => setForm((f) => ({ ...f, venue: toLettersOnly(e.target.value) }))} className="input-field" placeholder="Venue" />
                                    </div>
                                </>
                            ) : selectedDoc?.subDoc === 'Abstract of Quotation' ? (
                                <>
                                    <div>
                                        <label className="label">BAC Folder No.</label>
                                        <input type="text" readOnly value={form.prNo} className="input-field bg-[var(--background-subtle)] cursor-default" aria-readonly="true" />
                                    </div>
                                    <div>
                                        <label className="label">AOQ No.</label>
                                        <input
                                            type="text"
                                            value={form.aoq_no}
                                            onChange={(e) => setForm((f) => ({ ...f, aoq_no: toNumbersOnly(e.target.value) }))}
                                            className="input-field"
                                            placeholder="AOQ number"
                                        />
                                    </div>
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-wider">Bidder Details</span>
                                            <button
                                                type="button"
                                                onClick={() => setAbstractBidders((prev) => [...prev, { id: Date.now(), name: '', amount: '', remarks: '' }])}
                                                className="text-xs font-semibold text-[var(--primary)] hover:text-[var(--primary-dark)] flex items-center gap-1 transition-colors"
                                            >
                                                <MdAdd className="w-4 h-4" /> Add Bidder
                                            </button>
                                        </div>
                                        {abstractBidders.map((b) => (
                                            <div key={b.id} className="p-4 rounded-xl border border-[var(--border-light)] bg-[var(--background-subtle)]/30 space-y-4 relative group">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-xs font-semibold text-[var(--text-muted)] uppercase">Bidder information</span>
                                                    <button
                                                        type="button"
                                                        onClick={() => setAbstractBidders((prev) => prev.filter((x) => x.id !== b.id))}
                                                        className="p-1.5 text-[var(--text-muted)] hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                                        aria-label="Remove bidder"
                                                    >
                                                        <MdClose className="w-4 h-4" />
                                                    </button>
                                                </div>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="text-[11px] font-medium text-[var(--text-muted)] mb-1.5 block uppercase tracking-wider">Name</label>
                                                        <input
                                                            type="text"
                                                            value={b.name}
                                                            onChange={(e) => setAbstractBidders((prev) => prev.map((x) => (x.id === b.id ? { ...x, name: toLettersOnly(e.target.value) } : x)))}
                                                            className="input-field py-2 px-3 text-sm focus:ring-2 focus:ring-[var(--primary)]/20 shadow-sm"
                                                            placeholder="Full bidder name"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-[11px] font-medium text-[var(--text-muted)] mb-1.5 block uppercase tracking-wider">Amount</label>
                                                        <div className="flex items-center border border-[var(--border)] rounded-lg bg-white overflow-hidden py-2 px-3 focus-within:ring-2 focus-within:ring-[var(--primary)]/20 shadow-sm">
                                                            <span className="text-sm text-[var(--text-muted)] font-medium mr-1.5">₱</span>
                                                            <input
                                                                type="text"
                                                                inputMode="decimal"
                                                                value={b.amount}
                                                                onChange={(e) => setAbstractBidders((prev) => prev.map((x) => (x.id === b.id ? { ...x, amount: toNumbersOnly(e.target.value) } : x)))}
                                                                className="border-0 p-0 text-sm focus:ring-0 w-full font-medium"
                                                                placeholder="0.00"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="text-[11px] font-medium text-[var(--text-muted)] mb-1.5 block uppercase tracking-wider">Remarks</label>
                                                    <input
                                                        type="text"
                                                        value={b.remarks}
                                                        onChange={(e) => setAbstractBidders((prev) => prev.map((x) => (x.id === b.id ? { ...x, remarks: e.target.value } : x)))}
                                                        className="input-field py-2 px-3 text-sm focus:ring-2 focus:ring-[var(--primary)]/20 shadow-sm"
                                                        placeholder="Any specific notes or remarks..."
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                        {abstractBidders.length === 0 && (
                                            <div className="text-center py-8 border-2 border-dashed border-[var(--border-light)] rounded-xl opacity-60">
                                                <p className="text-sm text-[var(--text-muted)]">No bidders added yet. Click "+ Add Bidder" to start.</p>
                                            </div>
                                        )}
                                    </div>
                                </>
                            ) : selectedDoc?.subDoc === 'Notice of Award' ? (
                                <>
                                    <div>
                                        <label className="label">BAC Folder No.</label>
                                        <input type="text" readOnly value={form.prNo} className="input-field bg-[var(--background-subtle)] cursor-default" aria-readonly="true" />
                                    </div>
                                    <div>
                                        <label className="label">Title/Agenda</label>
                                        <input
                                            type="text"
                                            value={form.title}
                                            onChange={(e) => setForm((f) => ({ ...f, title: toLettersOnly(e.target.value) }))}
                                            className="input-field"
                                            placeholder="Notice of Award title"
                                        />
                                    </div>
                                    <div>
                                        <label className="label">Winning Bidder</label>
                                        <input
                                            type="text"
                                            value={form.winning_bidder}
                                            onChange={(e) => setForm((f) => ({ ...f, winning_bidder: toLettersOnly(e.target.value) }))}
                                            className="input-field"
                                            placeholder="Name of winning bidder"
                                        />
                                    </div>
                                    <div>
                                        <label className="label">Date</label>
                                        <input
                                            type="date"
                                            value={form.date}
                                            onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                                            className="input-field"
                                        />
                                    </div>
                                </>
                            ) : selectedDoc?.subDoc === 'Contract Services/Purchase Order' ? (
                                <>
                                    <div>
                                        <label className="label">BAC Folder No.</label>
                                        <input type="text" readOnly value={form.prNo} className="input-field bg-[var(--background-subtle)] cursor-default" aria-readonly="true" />
                                    </div>
                                    <div>
                                        <label className="label">Date</label>
                                        <input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} className="input-field" />
                                    </div>
                                    <div>
                                        <label className="label">Received by COA</label>
                                        <select value={form.contract_received_by_coa === true ? 'yes' : form.contract_received_by_coa === false ? 'no' : ''} onChange={(e) => { const v = e.target.value; setForm((f) => ({ ...f, contract_received_by_coa: v === 'yes' ? true : v === 'no' ? false : null })); }} className="input-field">
                                            <option value="">Select</option>
                                            <option value="yes">Yes</option>
                                            <option value="no">No</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="label">Contract Amount</label>
                                        <div className="flex items-center border border-[var(--border)] rounded-[var(--radius-sm)] bg-[var(--surface)] overflow-hidden focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
                                            <span className="pl-4 text-[var(--text)] font-medium" aria-hidden="true">₱</span>
                                            <input
                                                type="text"
                                                inputMode="decimal"
                                                value={form.contract_amount}
                                                    onChange={(e) => setForm((f) => ({ ...f, contract_amount: toNumbersOnly(e.target.value) }))}
                                                    onBlur={() => {
                                                        setForm((f) => {
                                                            const raw = String(f.contract_amount || '').trim();
                                                            if (!raw) return f;
                                                            const num = Number(raw);
                                                            if (Number.isNaN(num)) return f;
                                                            return { ...f, contract_amount: num.toFixed(2) };
                                                        });
                                                    }}
                                                className="input-field input-currency border-0 rounded-none focus:ring-0 focus:shadow-none w-full min-w-0"
                                                placeholder="0.00"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="label">Notarized (place)</label>
                                        <input type="text" value={form.notarized_place} onChange={(e) => setForm((f) => ({ ...f, notarized_place: e.target.value }))} className="input-field" placeholder="Place of notarization" />
                                    </div>
                                    <div>
                                        <label className="label">Notarized (date)</label>
                                        <input type="date" value={form.notarized_date} onChange={(e) => setForm((f) => ({ ...f, notarized_date: e.target.value }))} className="input-field" />
                                    </div>
                                </>
                            ) : selectedDoc?.subDoc === 'Notice to Proceed' ? (
                                <>
                                    <div>
                                        <label className="label">BAC Folder No.</label>
                                        <input type="text" readOnly value={form.prNo} className="input-field bg-[var(--background-subtle)] cursor-default" aria-readonly="true" />
                                    </div>
                                    <div>
                                        <label className="label">Date</label>
                                        <input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} className="input-field" />
                                    </div>
                                    <div>
                                        <label className="label">Service Provider</label>
                                        <input type="text" value={form.ntp_service_provider} onChange={(e) => setForm((f) => ({ ...f, ntp_service_provider: toLettersOnly(e.target.value) }))} className="input-field" placeholder="Service provider name" />
                                    </div>
                                    <div>
                                        <label className="label">Authorized Representative/Owner</label>
                                        <input type="text" value={form.ntp_authorized_rep} onChange={(e) => setForm((f) => ({ ...f, ntp_authorized_rep: toLettersOnly(e.target.value) }))} className="input-field" placeholder="Authorized representative or owner" />
                                    </div>
                                    <div>
                                        <label className="label">Received By</label>
                                        <input type="text" value={form.ntp_received_by} onChange={(e) => setForm((f) => ({ ...f, ntp_received_by: toLettersOnly(e.target.value) }))} className="input-field" placeholder="Received by" />
                                    </div>
                                </>
                            ) : selectedDoc?.subDoc === 'OSS' ? (
                                <>
                                    <div>
                                        <label className="label">BAC Folder No.</label>
                                        <input type="text" readOnly value={form.prNo} className="input-field bg-[var(--background-subtle)] cursor-default" aria-readonly="true" />
                                    </div>
                                    <div>
                                        <label className="label">Service Provider</label>
                                        <input type="text" value={form.oss_service_provider} onChange={(e) => setForm((f) => ({ ...f, oss_service_provider: toLettersOnly(e.target.value) }))} className="input-field" placeholder="Service provider name" />
                                    </div>
                                    <div>
                                        <label className="label">Authorized Representative/Owner</label>
                                        <input type="text" value={form.oss_authorized_rep} onChange={(e) => setForm((f) => ({ ...f, oss_authorized_rep: toLettersOnly(e.target.value) }))} className="input-field" placeholder="Authorized representative or owner" />
                                    </div>
                                    <div>
                                        <label className="label">Date</label>
                                        <input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} className="input-field" />
                                    </div>
                                </>
                            ) : selectedDoc?.subDoc === "Applicable: Secretary's Certificate and Special Power of Attorney" ? (
                                <>
                                    <div>
                                        <label className="label">BAC Folder No.</label>
                                        <input type="text" readOnly value={form.prNo} className="input-field bg-[var(--background-subtle)] cursor-default" aria-readonly="true" />
                                    </div>
                                    <div>
                                        <label className="label">Service Provider</label>
                                        <input type="text" value={form.secretary_service_provider} onChange={(e) => setForm((f) => ({ ...f, secretary_service_provider: toLettersOnly(e.target.value) }))} className="input-field" placeholder="Service provider name" />
                                    </div>
                                    <div>
                                        <label className="label">Owner/Authorized Representative</label>
                                        <input type="text" value={form.secretary_owner_rep} onChange={(e) => setForm((f) => ({ ...f, secretary_owner_rep: toLettersOnly(e.target.value) }))} className="input-field" placeholder="Owner or authorized representative" />
                                    </div>
                                    <div>
                                        <label className="label">Date</label>
                                        <input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} className="input-field" />
                                    </div>
                                </>
                            ) : selectedDoc?.subDoc === 'PhilGEPS Posting of Award' ? (
                                <>
                                    <div>
                                        <label className="label">BAC Folder No.</label>
                                        <input type="text" readOnly value={form.prNo} className="input-field bg-[var(--background-subtle)] cursor-default" aria-readonly="true" />
                                    </div>
                                    <div>
                                        <label className="label">Date</label>
                                        <input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} className="input-field" />
                                    </div>
                                    <div>
                                        <label className="label">Upload</label>
                                        <input type="file" onChange={(e) => setForm((f) => ({ ...f, file: e.target.files?.[0] ?? null }))} className="input-field py-1.5 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-[#16a34a] file:hover:bg-[#15803d] file:active:bg-[#166534] file:text-white file:font-semibold file:cursor-pointer file:transition-colors file:duration-200 w-full" accept=".pdf,.doc,.docx,.xls,.xlsx" />
                                    </div>
                                </>
                            ) : selectedDoc?.subDoc === 'Certificate of DILG R1 Website Posting of Award' ? (
                                <>
                                    <div>
                                        <label className="label">BAC Folder No.</label>
                                        <input type="text" readOnly value={form.prNo} className="input-field bg-[var(--background-subtle)] cursor-default" aria-readonly="true" />
                                    </div>
                                    <div>
                                        <label className="label">Date</label>
                                        <input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} className="input-field" />
                                    </div>
                                    <div>
                                        <label className="label">Upload</label>
                                        <input type="file" onChange={(e) => setForm((f) => ({ ...f, file: e.target.files?.[0] ?? null }))} className="input-field py-1.5 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-[#16a34a] file:hover:bg-[#15803d] file:active:bg-[#166534] file:text-white file:font-semibold file:cursor-pointer file:transition-colors file:duration-200 w-full" accept=".pdf,.doc,.docx,.xls,.xlsx" />
                                    </div>
                                </>
                            ) : selectedDoc?.subDoc === 'Notice of Award (Posted)' || selectedDoc?.subDoc === 'Abstract of Quotation (Posted)' || selectedDoc?.subDoc === 'BAC Resolution (Posted)' ? (
                                <>
                                    <div>
                                        <label className="label">Date</label>
                                        <input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} className="input-field" />
                                    </div>
                                </>
                            ) : selectedDoc?.subDoc === 'Lease of Venue: Table Rating Factor' ? (
                                <>
                                    <div className="text-sm text-[var(--text-muted)] p-4 bg-green-50 rounded-xl border border-green-100 flex items-start gap-3">
                                        <MdInfo className="w-5 h-5 text-green-600 mt-0.5" aria-hidden />
                                        <span>
                                            No file is required for Lease of Venue rating factor. Click <span className="font-semibold text-green-700">Update</span> below to save your progress; the document will be marked as complete.
                                        </span>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div>
                                        <label className="label">BAC Folder No.</label>
                                        <input
                                            type="text"
                                            readOnly
                                            value={form.prNo}
                                            className="input-field bg-[var(--background-subtle)] cursor-default"
                                            aria-readonly="true"
                                        />
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="label">Title</label>
                                            <input
                                                type="text"
                                                value={form.title}
                                                onChange={(e) =>
                                                    setForm((f) => ({ ...f, title: e.target.value }))
                                                }
                                                className="input-field"
                                                placeholder="Updated document title"
                                            />
                                        </div>
                                        <div>
                                            <label className="label">Category</label>
                                            <input
                                                type="text"
                                                value={form.category}
                                                onChange={(e) =>
                                                    setForm((f) => ({ ...f, category: e.target.value }))
                                                }
                                                className="input-field"
                                                placeholder="e.g. Goods, Services"
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="label">Sub-document</label>
                                            <input
                                                type="text"
                                                value={form.subDoc}
                                                onChange={(e) =>
                                                    setForm((f) => ({ ...f, subDoc: e.target.value }))
                                                }
                                                className="input-field"
                                                placeholder="Sub-document type"
                                            />
                                        </div>
                                        <div>
                                            <label className="label">Date</label>
                                            <input
                                                type="date"
                                                value={form.date}
                                                onChange={(e) =>
                                                    setForm((f) => ({ ...f, date: e.target.value }))
                                                }
                                                className="input-field"
                                            />
                                        </div>
                                    </div>
                                </>
                            )}
                            <div>
                                <label className="label">Replace File (optional)</label>
                                <div className="space-y-2">
                                    <input
                                        ref={updateFileInputRef}
                                        type="file"
                                        onChange={(e) =>
                                            setForm((f) => ({
                                                ...f,
                                                file: e.target.files?.[0] ?? null,
                                            }))
                                        }
                                        className="input-field py-1.5 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-[#16a34a] file:hover:bg-[#15803d] file:active:bg-[#166534] file:text-white file:font-semibold file:cursor-pointer file:transition-colors file:duration-200 flex-1 min-w-0"
                                        accept=".xls,.xlsx,.csv,.pdf,.png,.jpeg,.jpg"
                                    />
                                    {form.file ? (
                                        <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--background-subtle)]">
                                            <span className="text-sm text-[var(--text)] truncate flex-1">{form.file.name}</span>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setForm((f) => ({ ...f, file: null }));
                                                    if (updateFileInputRef.current) updateFileInputRef.current.value = '';
                                                }}
                                                className="flex-shrink-0 p-1 text-[var(--text-muted)] hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                                title="Remove file"
                                                aria-label="Remove file"
                                            >
                                                <MdClose className="w-5 h-5" />
                                            </button>
                                        </div>
                                    ) : selectedDoc?.file_url ? (
                                        <p className="text-sm text-[var(--text-muted)]">
                                            Current file: <span className="font-medium text-[var(--text)]">{selectedDoc.title || (selectedDoc.file_url?.split('/').pop() ?? '—')}</span>
                                        </p>
                                    ) : null}
                                </div>
                            </div>
                            <div className="flex justify-end gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setActiveModal(null);
                                        setSelectedDoc(null);
                                        setUpdateError('');
                                    }}
                                    className="btn-secondary flex items-center gap-2"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={updateSubmitting}
                                    className="btn-primary flex items-center justify-center gap-2"
                                >
                                    {updateSubmitting ? (
                                        <>
                                            <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            Updating...
                                        </>
                                    ) : (
                                        <>
                                            <MdCheckCircle className="w-4 h-4" />
                                            Save Updates
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* View Details Modal for Admin */}
            {activeModal === 'view' && selectedDoc && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
                    aria-modal="true"
                    role="dialog"
                >
                    <div className="card-elevated max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl rounded-2xl border-0">
                        <div className="p-6 border-b border-[var(--border-light)] flex items-center justify-between sticky top-0 bg-[var(--surface)] rounded-t-2xl z-10">
                            <div>
                                <h2 className="text-lg font-bold text-[var(--text)] flex items-center gap-2">
                                    <MdDescription className="text-[var(--primary)]" />
                                    Document Details
                                </h2>
                                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                                    {selectedDoc.subDoc} • Folder {selectedDoc.prNo}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    setActiveModal(null);
                                    setSelectedDoc(null);
                                }}
                                className="p-2 text-[var(--text-muted)] hover:bg-[var(--background-subtle)] hover:text-[var(--text)] rounded-lg transition-all"
                                aria-label="Close"
                            >
                                <MdClose className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 space-y-6">
                            {/* Header Info Section */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                                <div className="space-y-1">
                                    <label className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Title / Purpose</label>
                                    <p className="text-sm font-semibold text-[var(--text)]">{selectedDoc.title || '—'}</p>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Status</label>
                                    <div className="flex">
                                        <span className={`inline-flex items-center justify-center rounded-full px-2.5 py-1 text-[10px] font-bold border ${getStatusColor(selectedDoc.status)} capitalize`}>
                                            {selectedDoc.status || 'pending'}
                                        </span>
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Procurement Type</label>
                                    <p className="text-sm font-medium text-[var(--text)]">{selectedDoc.category || '—'}</p>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Date Submitted</label>
                                    <p className="text-sm font-medium text-[var(--text)]">{formatDate(selectedDoc.uploaded_at)}</p>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Submitted By</label>
                                    <p className="text-sm font-medium text-[var(--text)] break-all">{selectedDoc.uploadedBy || '—'}</p>
                                </div>
                                {selectedDoc.date && (
                                    <div className="space-y-1">
                                        <label className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Document Date</label>
                                        <p className="text-sm font-medium text-[var(--text)]">{formatDate(selectedDoc.date)}</p>
                                    </div>
                                )}
                            </div>

                            <hr className="border-[var(--border-light)]" />

                            {/* Specific Fields Section */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-bold text-[var(--text)] flex items-center gap-2">
                                    <MdPostAdd className="text-[var(--primary)]" />
                                    Specific Details
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 bg-[var(--background-subtle)]/30 p-4 rounded-xl border border-[var(--border-light)]/50">
                                    {[
                                        { label: 'PR No. / Ref No.', value: selectedDoc.user_pr_no },
                                        { label: 'PPMP No.', value: selectedDoc.ppmp_no },
                                        { label: 'Amount', value: selectedDoc.total_amount ? `₱${formatCurrencyValue(selectedDoc.total_amount)}` : null },
                                        { label: 'Source of Fund', value: selectedDoc.source_of_fund },
                                        { label: 'Office/Division', value: selectedDoc.office_division },
                                        { label: 'Received By', value: selectedDoc.received_by },
                                        { label: 'Venue', value: selectedDoc.venue },
                                        { label: 'Resolution No.', value: selectedDoc.resolution_no },
                                        { label: 'Winning Bidder', value: selectedDoc.winning_bidder },
                                        { label: 'AOQ No.', value: selectedDoc.aoq_no },
                                        { label: 'Market Budget', value: selectedDoc.market_budget ? `₱${formatCurrencyValue(selectedDoc.market_budget)}` : null },
                                        { label: 'Market Period', value: selectedDoc.market_period_from ? `${selectedDoc.market_period_from} to ${selectedDoc.market_period_to || '—'}` : null },
                                    ].filter(item => item.value && String(item.value).trim()).map((item, idx) => (
                                        <div key={idx} className="space-y-1">
                                            <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase">{item.label}</label>
                                            <p className="text-sm font-medium text-[var(--text)]">{item.value}</p>
                                        </div>
                                    ))}
                                    {(!selectedDoc.attendance_members && !selectedDoc.winning_bidder && !selectedDoc.user_pr_no) && (
                                        <p className="text-xs text-[var(--text-muted)] italic col-span-2">No additional specific details recorded.</p>
                                    )}
                                </div>
                            </div>

                            {/* Attendance / Bidders Special Sections */}
                            {selectedDoc.subDoc === 'Attendance Sheet' && selectedDoc.attendance_members && (
                                <div className="space-y-3">
                                    <h3 className="text-sm font-bold text-[var(--text)]">Members Attendance</h3>
                                    <div className="border border-[var(--border-light)] rounded-xl overflow-hidden shadow-sm">
                                        <table className="min-w-full divide-y divide-[var(--border-light)]">
                                            <thead className="bg-[var(--background-subtle)]">
                                                <tr>
                                                    <th className="px-4 py-2 text-left text-[10px] font-bold text-[var(--text-muted)] uppercase">Name</th>
                                                    <th className="px-4 py-2 text-center text-[10px] font-bold text-[var(--text-muted)] uppercase">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-[var(--border-light)] bg-white/50">
                                                {(() => {
                                                    try {
                                                        const members = typeof selectedDoc.attendance_members === 'string' 
                                                            ? JSON.parse(selectedDoc.attendance_members) 
                                                            : selectedDoc.attendance_members;
                                                        return Array.isArray(members) ? members.map((m, i) => (
                                                            <tr key={i}>
                                                                <td className="px-4 py-2 text-sm text-[var(--text)]">{m.name}</td>
                                                                <td className="px-4 py-2 text-center">
                                                                    <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold ${m.present ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                                                                        {m.present ? 'PRESENT' : 'ABSENT'}
                                                                    </span>
                                                                </td>
                                                            </tr>
                                                        )) : <tr><td colSpan="2" className="px-4 py-2 text-sm">No valid data</td></tr>;
                                                    } catch (e) { return null; }
                                                })()}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {/* File Section */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-bold text-[var(--text)] flex items-center gap-2">
                                    <MdFolder className="text-[var(--primary)]" />
                                    Attached Document
                                </h3>
                                {selectedDoc.file_url ? (
                                    <div className="flex items-center justify-between p-4 bg-blue-50 border border-blue-100 rounded-xl">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-blue-100 rounded-lg">
                                                <MdDescription className="w-6 h-6 text-blue-600" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-semibold text-blue-900 break-all">{selectedDoc.title || 'Document File'}</p>
                                                <p className="text-xs text-blue-700">Available for view/download</p>
                                            </div>
                                        </div>
                                        <a
                                            href={selectedDoc.file_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="btn-primary py-2 px-4 text-xs flex items-center gap-2 shadow-md hover:shadow-lg transition-all"
                                        >
                                            <MdDownload className="w-4 h-4" />
                                            View File
                                        </a>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-100 rounded-xl">
                                        <MdWarning className="w-5 h-5 text-amber-600" />
                                        <p className="text-sm font-medium text-amber-800">No file has been uploaded for this document yet.</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="p-4 bg-[var(--background-subtle)]/50 border-t border-[var(--border-light)] flex justify-end rounded-b-2xl">
                            <button
                                type="button"
                                onClick={() => {
                                    setActiveModal(null);
                                    setSelectedDoc(null);
                                }}
                                className="px-6 py-2 bg-[var(--surface)] border border-[var(--border)] text-[var(--text)] text-sm font-bold rounded-xl hover:bg-[var(--background-subtle)] transition-all active:scale-95 shadow-sm"
                            >
                                Close View
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Alert message pop-up */}
            {alertMessage && (
                <div
                    className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
                    aria-modal="true"
                    role="alertdialog"
                    aria-live="polite"
                >
                    <div className="card-elevated max-w-sm w-full shadow-2xl rounded-2xl border-0 overflow-hidden">
                        <div className="p-6 text-center">
                            <MdCheckCircle className="h-12 w-12 text-[var(--primary)] mx-auto mb-4" aria-hidden />
                            <p className="text-[var(--text)] font-medium">{alertMessage}</p>
                            <button
                                type="button"
                                onClick={() => setAlertMessage(null)}
                                className="mt-6 btn-primary w-full sm:w-auto min-w-[120px] flex items-center justify-center gap-2 mx-auto"
                            >
                                <MdCheckCircle className="w-4 h-4" />
                                OK
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Confirm dialog pop-up */}
            {confirmDialog && (
                <div
                    className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
                    aria-modal="true"
                    role="alertdialog"
                    aria-labelledby="confirm-title"
                >
                    <div className="card-elevated max-w-sm w-full shadow-2xl rounded-2xl border-0 overflow-hidden">
                        <div className="p-6">
                            <h2 id="confirm-title" className="text-lg font-semibold text-[var(--text)] mb-2">
                                Confirm
                            </h2>
                            <p className="text-[var(--text-muted)] mb-6">{confirmDialog.message}</p>
                            <div className="flex gap-3 justify-end">
                                <button
                                    type="button"
                                    onClick={() => setConfirmDialog(null)}
                                    className="btn-secondary flex items-center gap-2"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        confirmDialog.onConfirm();
                                    }}
                                    className="btn-primary flex items-center gap-2"
                                >
                                    <MdCheckCircle className="w-4 h-4" />
                                    Yes
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Document Preview Modal */}
            {previewDoc && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
                    aria-modal="true"
                    role="dialog"
                >
                    <div className="card-elevated max-w-6xl w-full max-h-[90vh] overflow-hidden shadow-2xl rounded-2xl border-0 flex flex-col">
                        <div className="p-6 border-b border-[var(--border-light)] flex items-center justify-between bg-[var(--surface)]">
                            <h2 className="text-lg font-semibold text-[var(--text)]">{previewDoc.title}</h2>
                            <button
                                type="button"
                                onClick={() => {
                                    setPreviewSequence(null);
                                    closePreview();
                                }}
                                className="p-2 text-[var(--text-muted)] hover:bg-[var(--background-subtle)] rounded-lg"
                                aria-label="Close"
                            >
                                <MdClose className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-auto bg-gray-100 p-4">
                            {previewDoc.previewBlobUrl === 'failed' ? (
                                <div className="flex flex-col items-center justify-center h-64 text-[var(--text-muted)]">
                                    <p>Could not load file.</p>
                                </div>
                            ) : previewDoc.previewBlobUrl ? (
                                (() => {
                                    const ct = previewDoc.previewBlobType || '';
                                    const isPdf = ct.includes('pdf');
                                    const isImage = /^image\//.test(ct);
                                    if (isPdf) {
                                        return (
                                            <embed
                                                src={`${previewDoc.previewBlobUrl}#toolbar=0&navpanes=0`}
                                                type="application/pdf"
                                                className="w-full min-h-[600px] flex-1 border-0 rounded-lg"
                                                title="Document"
                                            />
                                        );
                                    }
                                    if (isImage) {
                                        return (
                                            <img
                                                src={previewDoc.previewBlobUrl}
                                                alt={previewDoc.title}
                                                className="max-w-full max-h-[70vh] object-contain mx-auto"
                                            />
                                        );
                                    }
                                    return (
                                        <iframe
                                            src={previewDoc.previewBlobUrl}
                                            title={previewDoc.title}
                                            className="w-full min-h-[600px] flex-1 border-0 rounded-lg bg-white"
                                            sandbox="allow-same-origin"
                                        />
                                    );
                                })()
                            ) : (
                                <div className="flex flex-col items-center justify-center h-64 text-[var(--text-muted)]">
                                    <div className="w-10 h-10 rounded-full border-2 border-[var(--border)] border-t-[var(--primary)] animate-spin mb-3" aria-hidden />
                                    <span>Loading file…</span>
                                </div>
                            )}
                        </div>
                        <div className="p-4 border-t border-[var(--border-light)] bg-[var(--surface)] flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => {
                                    setPreviewSequence(null);
                                    closePreview();
                                }}
                                className="btn-primary"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Comments Modal */}
            {selectedDocForComment && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
                    aria-modal="true"
                    role="dialog"
                >
                    <div className="card-elevated max-w-2xl w-full max-h-[80vh] overflow-hidden shadow-2xl rounded-2xl border-0 flex flex-col">
                        <div className="p-6 border-b border-[var(--border-light)] flex items-center justify-between bg-[var(--surface)]">
                            <div>
                                <h2 className="text-lg font-semibold text-[var(--text)]">Comments & Notes</h2>
                                <p className="text-sm text-[var(--text-muted)] mt-1">{selectedDocForComment.title || 'Document'}</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    setSelectedDocForComment(null);
                                    setCommentText('');
                                }}
                                className="p-2 text-[var(--text-muted)] hover:bg-[var(--background-subtle)] rounded-lg"
                                aria-label="Close"
                            >
                                <MdClose className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6 space-y-4">
                            {comments[selectedDocForComment.id]?.length > 0 ? (
                                <div className="space-y-4">
                                    {comments[selectedDocForComment.id].map((comment, idx) => (
                                        <div key={idx} className="bg-[var(--background-subtle)] rounded-lg p-4">
                                            <div className="flex items-start justify-between mb-2">
                                                <p className="font-semibold text-sm text-[var(--text)]">{comment.author}</p>
                                                <p className="text-xs text-[var(--text-muted)]">
                                                    {new Date(comment.date).toLocaleString()}
                                                </p>
                                            </div>
                                            <p className="text-sm text-[var(--text-muted)] whitespace-pre-wrap">{comment.text}</p>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8 text-[var(--text-muted)]">
                                    <MdComment className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                    <p>No comments yet. Be the first to add a note!</p>
                                </div>
                            )}
                        </div>
                        <div className="p-6 border-t border-[var(--border-light)] bg-[var(--surface)] space-y-3">
                            <textarea
                                value={commentText}
                                onChange={(e) => setCommentText(e.target.value)}
                                placeholder="Add a comment or note..."
                                className="input-field w-full min-h-[100px] resize-y"
                                rows="3"
                            />
                            <div className="flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSelectedDocForComment(null);
                                        setCommentText('');
                                    }}
                                    className="btn-secondary"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleAddComment(selectedDocForComment.id)}
                                    disabled={!commentText.trim()}
                                    className="btn-primary inline-flex items-center gap-2"
                                >
                                    <MdComment className="w-4 h-4" />
                                    Add Comment
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Workflow Visualization Modal */}
            {workflowPRNo && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
                    aria-modal="true"
                    role="dialog"
                >
                    <div className="card-elevated max-w-5xl w-full max-h-[90vh] overflow-hidden shadow-2xl rounded-2xl border-0 flex flex-col">
                        <div className="p-6 border-b border-[var(--border-light)] flex items-center justify-between bg-[var(--surface)]">
                            <div>
                                <h2 className="text-lg font-semibold text-[var(--text)]">Procurement Workflow</h2>
                                <p className="text-sm text-[var(--text-muted)] mt-1">BAC Folder No.: {workflowPRNo}</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setWorkflowPRNo(null)}
                                className="p-2 text-[var(--text-muted)] hover:bg-[var(--background-subtle)] rounded-lg"
                                aria-label="Close"
                            >
                                <MdClose className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6">
                            <WorkflowVisualization prNo={workflowPRNo} documents={documents} />
                        </div>
                    </div>
                </div>
            )}

        
        </div>
    );
};


// Helper component for document metadata display
const DocDetailItem = ({ label, value }) => {
    if (!value && value !== 0 && value !== false) return null;
    return (
        <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">{label}</span>
            <span className="text-sm font-medium text-[var(--text)]">{String(value)}</span>
        </div>
    );
};

// Component to render detailed procurement info based on document type
const DocDetailsView = ({ doc }) => {
    if (!doc) return null;
    
    const renderSpecificFields = () => {
        const sub = (doc.subDoc || '').trim();
        
        switch (sub) {
            case 'Purchase Request':
                return (
                    <>
                        <DocDetailItem label="Purpose" value={doc.title} />
                        <DocDetailItem label="PR No." value={doc.user_pr_no} />
                        <DocDetailItem label="Total Amount" value={doc.total_amount ? `₱${Number(doc.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}` : null} />
                    </>
                );
            case 'Activity Design':
                return (
                    <>
                        <DocDetailItem label="Title" value={doc.title} />
                        <DocDetailItem label="PR No." value={doc.user_pr_no} />
                        <DocDetailItem label="Source of Fund" value={doc.source_of_fund} />
                        <DocDetailItem label="Total Amount" value={doc.total_amount ? `₱${Number(doc.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}` : null} />
                    </>
                );
            case 'Project Procurement Management Plan/Supplemental PPMP':
                return (
                    <>
                        <DocDetailItem label="Title" value={doc.title} />
                        <DocDetailItem label="PPMP No." value={doc.ppmp_no} />
                        <DocDetailItem label="Source of Fund" value={doc.source_of_fund} />
                        <DocDetailItem label="Total Budget" value={doc.total_amount ? `₱${Number(doc.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}` : null} />
                    </>
                );
            case 'Annual Procurement Plan':
                return (
                    <>
                        <DocDetailItem label="Title" value={doc.title} />
                        <DocDetailItem label="APP Type" value={doc.app_type} />
                        <DocDetailItem label="Certified True Copy" value={doc.certified_true_copy ? 'Yes' : 'No'} />
                        <DocDetailItem label="Signed By" value={doc.certified_signed_by} />
                    </>
                );
            case 'Market Scopping':
                return (
                    <>
                        <DocDetailItem label="Title" value={doc.title} />
                        <DocDetailItem label="Budget" value={doc.market_budget ? `₱${Number(doc.market_budget).toLocaleString(undefined, { minimumFractionDigits: 2 })}` : null} />
                        <DocDetailItem label="Period" value={`${doc.market_period_from || '—'} to ${doc.market_period_to || '—'}`} />
                        <DocDetailItem label="Expected Delivery" value={doc.market_expected_delivery} />
                        <DocDetailItem label="Service Providers" value={[doc.market_service_provider_1, doc.market_service_provider_2, doc.market_service_provider_3].filter(Boolean).join(', ')} />
                    </>
                );
            case 'Requisition and Issue Slip':
                return (
                    <>
                        <DocDetailItem label="Purpose" value={doc.title} />
                        <DocDetailItem label="Office/Division" value={doc.office_division} />
                        <DocDetailItem label="Received By" value={doc.received_by} />
                    </>
                );
            case 'Notice of BAC Meeting':
                return <DocDetailItem label="Agenda" value={doc.title} />;
            case 'Invitation to COA':
                return <DocDetailItem label="Date Received" value={doc.date_received} />;
            case 'Attendance Sheet':
                return <DocDetailItem label="Agenda" value={doc.title} />;
            case 'BAC Resolution':
                return (
                    <>
                        <DocDetailItem label="Resolution No." value={doc.resolution_no} />
                        <DocDetailItem label="Title" value={doc.title} />
                        <DocDetailItem label="Winning Bidder" value={doc.winning_bidder} />
                        <DocDetailItem label="Amount" value={doc.total_amount ? `₱${Number(doc.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}` : null} />
                        <DocDetailItem label="Office/Division" value={doc.office_division} />
                        <DocDetailItem label="Venue" value={doc.venue} />
                    </>
                );
            case 'Abstract of Quotation':
                return <DocDetailItem label="AOQ No." value={doc.aoq_no} />;
            case 'Contract Services/Purchase Order':
                return (
                    <>
                        <DocDetailItem label="Contract Amount" value={doc.contract_amount ? `₱${Number(doc.contract_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}` : null} />
                        <DocDetailItem label="Received by COA" value={doc.contract_received_by_coa ? 'Yes' : 'No'} />
                        <DocDetailItem label="Notarized" value={`${doc.notarized_place || ''} ${doc.notarized_date || ''}`} />
                    </>
                );
            case 'Notice to Proceed':
                return (
                    <>
                        <DocDetailItem label="Service Provider" value={doc.ntp_service_provider} />
                        <DocDetailItem label="Authorized Rep" value={doc.ntp_authorized_rep} />
                        <DocDetailItem label="Received By" value={doc.ntp_received_by} />
                    </>
                );
            case 'OSS':
                return (
                    <>
                        <DocDetailItem label="Service Provider" value={doc.oss_service_provider} />
                        <DocDetailItem label="Authorized Rep" value={doc.oss_authorized_rep} />
                    </>
                );
            case "Applicable: Secretary's Certificate and Special Power of Attorney":
                 return (
                    <>
                        <DocDetailItem label="Service Provider" value={doc.secretary_service_provider} />
                        <DocDetailItem label="Owner/Rep" value={doc.secretary_owner_rep} />
                    </>
                );
            default:
                return doc.title ? <DocDetailItem label="Title" value={doc.title} /> : null;
        }
    };

    return (
        <div className="h-full flex flex-col bg-[var(--surface)] border-r border-[var(--border)] overflow-y-auto">
            <div className="p-4 border-b border-[var(--border)] bg-[var(--background-subtle)]/30">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-green-50 text-green-600">
                        <MdDescription className="w-5 h-5" />
                    </div>
                    <div>
                        <h4 className="text-sm font-bold text-[var(--text)] tracking-tight">Procurement Details</h4>
                        <p className="text-[10px] text-[var(--text-muted)] font-medium uppercase tracking-widest">{doc.subDoc}</p>
                    </div>
                </div>
            </div>
            
            <div className="p-4 space-y-5">
                <div className="grid grid-cols-1 gap-5">
                    <DocDetailItem label="BAC Folder No." value={doc.prNo} />
                    <DocDetailItem label="Date Encoding" value={doc.date ? new Date(doc.date).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : '—'} />
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Status</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            doc.status === 'complete' ? 'bg-green-100 text-green-700' :
                            doc.status === 'ongoing' ? 'bg-amber-100 text-amber-700' :
                            'bg-red-100 text-red-700'
                        }`}>
                            {doc.status || 'pending'}
                        </span>
                    </div>
                    
                    <div className="pt-4 border-t border-[var(--border-light)] space-y-5">
                        {renderSpecificFields()}
                    </div>
                </div>
            </div>
        </div>
    );
};

// Workflow Visualization Component

const WorkflowVisualization = ({ prNo, documents }) => {
    const workflowDocs = documents.filter(doc => doc.prNo === prNo);
    
    const stages = [
        { id: 'initial', name: 'Initial Documents', color: 'bg-blue-500' },
        { id: 'afq', name: 'AFQ Concerns', color: 'bg-purple-500' },
        { id: 'meeting', name: 'BAC Meeting Documents', color: 'bg-indigo-500' },
        { id: 'award', name: 'Award Documents', color: 'bg-green-500' },
        { id: 'posting', name: 'Award Posting', color: 'bg-emerald-600' },
    ];

    const getStageDocs = (stageName) => {
        return workflowDocs.filter(doc => doc.category === stageName);
    };

    const getStageStatus = (stageName) => {
        const stageDocs = getStageDocs(stageName);
        if (stageDocs.length === 0) return 'not-started';
        const allComplete = stageDocs.every(doc => doc.status === 'complete');
        const anyOngoing = stageDocs.some(doc => doc.status === 'ongoing');
        if (allComplete) return 'complete';
        if (anyOngoing) return 'ongoing';
        return 'pending';
    };

    return (
        <div className="space-y-6">
            {/* Timeline */}
            <div className="relative">
                <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-[var(--border)]" />
                {stages.map((stage, idx) => {
                    const status = getStageStatus(stage.name);
                    const stageDocs = getStageDocs(stage.name);
                    const statusColors = {
                        'complete': 'bg-green-500',
                        'ongoing': 'bg-amber-500',
                        'pending': 'bg-red-500',
                        'not-started': 'bg-gray-300'
                    };
                    
                    return (
                        <div key={stage.id} className="relative flex items-start gap-4 mb-6">
                            <div className={`relative z-10 w-16 h-16 rounded-full ${statusColors[status]} flex items-center justify-center text-white font-bold text-sm flex-shrink-0`}>
                                {idx + 1}
                            </div>
                            <div className="flex-1 pt-2">
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className="font-semibold text-[var(--text)]">{stage.name}</h3>
                                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                        status === 'complete' ? 'bg-green-100 text-green-800' :
                                        status === 'ongoing' ? 'bg-amber-100 text-amber-800' :
                                        status === 'pending' ? 'bg-red-100 text-red-800' :
                                        'bg-gray-100 text-gray-800'
                                    }`}>
                                        {status === 'complete' ? 'Complete' :
                                         status === 'ongoing' ? 'Ongoing' :
                                         status === 'pending' ? 'Pending' : 'Not Started'}
                                    </span>
                                </div>
                                {stageDocs.length > 0 ? (
                                    <div className="space-y-2 mt-2">
                                        {stageDocs.map(doc => (
                                            <div key={doc.id} className="bg-[var(--background-subtle)] rounded-lg p-3 text-sm">
                                                <div className="flex items-center justify-between">
                                                    <span className="font-medium text-[var(--text)]">{doc.subDoc || doc.title}</span>
                                                    <span className={`px-2 py-1 rounded text-xs ${
                                                        doc.status === 'complete' ? 'bg-green-100 text-green-800' :
                                                        doc.status === 'ongoing' ? 'bg-amber-100 text-amber-800' :
                                                        'bg-red-100 text-red-800'
                                                    }`}>
                                                        {doc.status || 'pending'}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-sm text-[var(--text-muted)] italic mt-2">No documents uploaded yet</p>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Summary */}
            <div className="mt-8 p-4 bg-[var(--background-subtle)] rounded-lg">
                <h4 className="font-semibold text-[var(--text)] mb-3">Summary</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                    <div>
                        <p className="text-[var(--text-muted)]">Total Documents</p>
                        <p className="text-xl font-bold text-[var(--text)]">{workflowDocs.length}</p>
                    </div>
                    <div>
                        <p className="text-[var(--text-muted)]">Complete</p>
                        <p className="text-xl font-bold text-green-600">
                            {workflowDocs.filter(d => d.status === 'complete').length}
                        </p>
                    </div>
                    <div>
                        <p className="text-[var(--text-muted)]">Ongoing</p>
                        <p className="text-xl font-bold text-amber-600">
                            {workflowDocs.filter(d => d.status === 'ongoing').length}
                        </p>
                    </div>
                    <div>
                        <p className="text-[var(--text-muted)]">Pending</p>
                        <p className="text-xl font-bold text-red-600">
                            {workflowDocs.filter(d => d.status === 'pending').length}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Encode;
