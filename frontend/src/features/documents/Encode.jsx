import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { documentService, reportService, dashboardService, procurementRecordService, getDocumentPreviewUrl, getUploadedFilename, openPreviewTab } from '../../services/api';
import { ROLES } from '../../utils/auth';
import {
    MdUpload,
    MdClose,
    MdSearch,
    MdComment,
    MdExpandMore,
    MdExpandLess,
    MdTimeline,
    MdDescription,
    MdChevronLeft,
    MdChevronRight,
    MdLabel
} from 'react-icons/md';
import PageHeader from '../../components/PageHeader';
import { TABLE_PAGE_SIZE } from '../../utils/constants';
import { DOC_TYPES, RFQ_PROCUREMENT_METHODS } from '../../constants/docTypes';
import { formatCurrencyValue } from '../../utils/validation';

// Modular Components
import DocViewModal from './modals/DocViewModal';
import WorkflowModal from './modals/WorkflowModal';
import CommentModal from './modals/CommentModal';
import AlertModal from './modals/AlertModal';
import ConfirmDialog from './modals/ConfirmDialog';
import PreviewModal from './modals/PreviewModal';
import ProcurementDocumentModal from "./modals/ProcurementDocumentModal";
import ProcurementWorkflowView from "./ProcurementWorkflowView";
import { generatePR_Excel } from "../../utils/prGenerator";
import PPMPFolderModal from "./modals/PPMPFolderModal";

const Encode = ({ user }) => {
    const [searchParams] = useSearchParams();
    const [viewMode, setViewMode] = useState('list'); // 'list' | 'grouped'
    const [expandedGroups, setExpandedGroups] = useState(new Set());
    const [selectedWorkflowFolder, setSelectedWorkflowFolder] = useState(null);
    const [alertMessage, setAlertMessage] = useState(null);
    const [confirmDialog, setConfirmDialog] = useState(null); // { message, onConfirm }
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterCategory, setFilterCategory] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [filterPRNo, setFilterPRNo] = useState('');
    const [filterDateFrom, setFilterDateFrom] = useState('');
    const [filterDateTo, setFilterDateTo] = useState('');
    const [sortKey, setSortKey] = useState('uploaded_at');
    const [sortDir, setSortDir] = useState('desc');
    const [showFilters, setShowFilters] = useState(false);
    const [tablePage, setTablePage] = useState(1);
    const [documents, setDocuments] = useState([]);
    const [pendingBreakdown, setPendingBreakdown] = useState([]);
    const [activeModal, setActiveModal] = useState(null);
    const [selectedDoc, setSelectedDoc] = useState(null);
    const [lastAutoPreviewFolderId, setLastAutoPreviewFolderId] = useState(null);
    const [activeChecklistCategoryId, setActiveChecklistCategoryId] = useState(null);
    const [selectedProcurementRecord, setSelectedProcurementRecord] = useState(null);
    const [procurementRecords, setProcurementRecords] = useState([]);
    const [selectedPPMP, setSelectedPPMP] = useState(null);
    const [selectedPPMPDocs, setSelectedPPMPDocs] = useState([]);

    const isAdmin = user?.role === ROLES.ADMIN;
    const canUploadDocuments = [ROLES.ADMIN, ROLES.SECRETARIAT].includes(user?.role);
    const canViewAllDocuments = [ROLES.ADMIN, ROLES.SECRETARIAT, ROLES.MEMBER].includes(user?.role);

    const load = async () => {
        setLoading(true);
        setError(null);
        try {
            const [docsResponse, recordsResponse] = await Promise.all([
                documentService.getAll(),
                procurementRecordService.getAll(),
            ]);
            
            const list = Array.isArray(docsResponse) ? docsResponse : (docsResponse?.results ?? []);
            const sortedDocs = [...list].sort((a, b) => {
                const aTime = a.uploaded_at ? new Date(a.uploaded_at).getTime() : 0;
                const bTime = b.uploaded_at ? new Date(b.uploaded_at).getTime() : 0;
                return bTime - aTime;
            });
            
            setDocuments(sortedDocs);
            setProcurementRecords(recordsResponse);
            
            // Non-blocking dashboard load
            dashboardService.getData(true, '').then(data => {
                setPendingBreakdown(data?.pendingBreakdown ?? []);
            }).catch(e => console.error('Dashboard load failed:', e));

        } catch (e) {
            console.error('Load failed:', e);
            setError(e.message || 'Failed to load documents');
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

    const getAuthHeaders = () => {
        const token = localStorage.getItem('token');
        return token ? { Authorization: `Bearer ${token}` } : {};
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
        if (doc?.id && doc?.file_url) {
            openPreviewTab(getDocumentPreviewUrl(doc.id), getUploadedFilename(doc));
            return;
        }

        if (doc && (doc.file_url || doc.file)) {
            const url = doc.file_url || (doc.file instanceof File ? URL.createObjectURL(doc.file) : doc.file);
            if (url) {
                openPreviewTab(url, getUploadedFilename(doc));
                return;
            }
        }

        // For Purchase Requests specifically: directly trigger the layout generation
        if (doc?.subDoc === 'Purchase Request') {
            try {
                // Defensive parsing for pr_items
                let items = [];
                try {
                    if (typeof doc.pr_items === 'string' && doc.pr_items.trim()) {
                        items = JSON.parse(doc.pr_items);
                    } else if (Array.isArray(doc.pr_items)) {
                        items = doc.pr_items;
                    }
                } catch (e) {
                    console.error('Data parsing error in Encode:', e);
                }

                const prData = {
                    items: items,
                    total: doc.total_amount,
                    ppmp_no: doc.ppmp_no,
                    prNo: doc.user_pr_no || '',
                    title: doc.title,
                    office: doc.end_user_office || ''
                };
                generatePR_Excel(prData);
                return;
            } catch (err) {
                console.error('Failed to generate PR quick view:', err);
                // Fallback: Continue to open the modal
                setSelectedDoc(doc);
                setActiveModal('view');
                return;
            }
        }

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

    // Group documents by PPMP No for the Folder view
    const ppmpGroups = useMemo(() => {
        const groups = {};
        filteredDocuments.forEach(doc => {
            const ppmp = (doc.ppmp_no || 'Unassigned').trim();
            if (!groups[ppmp]) groups[ppmp] = [];
            groups[ppmp].push(doc);
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
        const hasUploadedOrGeneratedFile = !!(
            doc.file ||
            (doc.file_url && String(doc.file_url).trim()) ||
            (doc.subDoc === 'Purchase Request' && (doc.pr_items || doc.total_amount || doc.title || doc.ppmp_no))
        );
        if (hasUploadedOrGeneratedFile) return [];

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

        // File requirement check. Purchase Requests are generated from saved PR data,
        // so the downloadable/viewable PR Excel file does not need an uploaded file.
        const noFileRequired = (() => {
            if (sub === 'Purchase Request') return true;
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
        const r = { id: doc?.id, file_url: doc?.file_url, title: doc?.title };
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
                    res = await fetch(fetchUrl, { 
                        credentials: 'include',
                        headers: getAuthHeaders()
                    });
                } catch {
                    res = await fetch(r.file_url, { 
                        credentials: 'include',
                        headers: getAuthHeaders()
                    });
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
                const url = r?.id ? getDocumentPreviewUrl(r.id) : getFetchUrl(r.file_url);
                openPreviewTab(url, getUploadedFilename(doc));
            }
        }
    };

    const openWorkflow = (prNo) => {
        // Find the procurement record in our dedicated projects list
        const record = procurementRecords.find(r => r.pr_no === prNo);
        if (record) {
            handleOpenWorkflow(record);
        } else {
            // Fallback for legacy documents without a linked ProcurementRecord
            setSelectedWorkflowFolder(prNo);
            setActiveModal('workflow');
        }
    };



    const getStatusColor = (status) => {
        switch (status?.toLowerCase()) {
            case 'complete': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
            case 'ongoing': return 'bg-amber-100 text-amber-700 border-amber-200';
            default: return 'bg-slate-100 text-slate-700 border-slate-200';
        }
    };
    
    const handleOpenWorkflow = (record) => {
        setSelectedProcurementRecord(record);
        setActiveModal('detailedWorkflow');
    };

    const handleOpenPPMPFolder = (ppmpNo) => {
        setSelectedPPMP(ppmpNo);
        setSelectedPPMPDocs(ppmpGroups[ppmpNo] || []);
        // Find if there's a matching procurement record for this PPMP
        // If multiple exist, we just take the first one or link to a general view
        const matchingRecord = procurementRecords.find(r => r.ppmp_no === ppmpNo);
        setSelectedProcurementRecord(matchingRecord);
        setActiveModal('ppmpFolder');
    };


    return (
        <div className="min-h-full pb-12">
            <PageHeader
                title="Procurement Records"
                subtitle="Consolidated view of all procurement documents grouped by PPMP classification."
            >
            </PageHeader>

            <div className="content-section overflow-hidden rounded-xl w-full max-w-[96rem] mx-auto min-w-0 p-0 shadow-lg shadow-slate-200/50">


                {/* Procurement Records Section - UPLOADED PROCUREMENT */}
                <div className="p-6 sm:p-8 bg-[var(--background-subtle)]/30">
                    <div className="flex items-center justify-between mb-8 overflow-hidden">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-2xl bg-[var(--primary)] flex items-center justify-center text-white shadow-xl shadow-[var(--primary)]/20">
                                <MdTimeline className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tight">
                                    Uploaded Procurement
                                </h3>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl border border-slate-100 shadow-sm">
                            <span className="text-xs font-black text-[var(--primary)]">{Object.keys(ppmpGroups).length}</span>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Folders</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {loading ? (
                            Array(3).fill(0).map((_, i) => (
                                <div key={i} className="h-32 rounded-2xl bg-slate-100 animate-pulse" />
                            ))
                        ) : error ? (
                            <div className="col-span-full py-20 bg-red-50 rounded-[2rem] border-2 border-dashed border-red-200 flex flex-col items-center justify-center text-center">
                                <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-4 text-red-400">
                                    <MdClose className="w-8 h-8" />
                                </div>
                                <h4 className="text-lg font-bold text-red-600">Loading Error</h4>
                                <p className="text-xs text-red-400 mt-2 uppercase tracking-widest font-black">{error}</p>
                                <button onClick={load} className="mt-4 px-6 py-2 bg-red-600 text-white rounded-xl font-bold uppercase text-[10px] tracking-widest">Retry</button>
                            </div>
                        ) : Object.keys(ppmpGroups).length > 0 ? (
                            Object.keys(ppmpGroups).sort((a, b) => {
                                // Sort by latest document's upload time (LIFO)
                                const latestA = Math.max(...ppmpGroups[a].map(d => new Date(d.uploaded_at).getTime()));
                                const latestB = Math.max(...ppmpGroups[b].map(d => new Date(d.uploaded_at).getTime()));
                                return latestB - latestA;
                            }).map((ppmpNo) => {
                                const docs = ppmpGroups[ppmpNo];
                                const prNo = docs.find(d => d.prNo && d.prNo !== 'Unassigned')?.prNo || 'Pending';
                                const displayPRNo = docs.find(d => d.user_pr_no)?.user_pr_no || prNo;
                                
                                return (
                                    <div 
                                        key={ppmpNo}
                                        onClick={() => handleOpenPPMPFolder(ppmpNo)}
                                        className="group cursor-pointer bg-white dark:bg-slate-900 rounded-2xl p-4 border-2 border-slate-200 dark:border-slate-800 hover:border-[var(--primary)]/50 transition-all duration-500 hover:shadow-xl hover:shadow-[var(--primary)]/10 flex flex-col gap-2 relative overflow-hidden self-start"
                                    >
                                        <div className="absolute top-0 right-0 w-28 h-28 bg-[var(--primary)]/5 rounded-full -mr-14 -mt-14 group-hover:scale-150 transition-transform duration-700" />
                                        
                                        <div className="flex items-start justify-between relative z-10">
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-base shadow-inner group-hover:scale-110 transition-transform duration-300 shrink-0">
                                                    📂
                                                </div>
                                                <h4 className="text-sm font-black text-slate-900 dark:text-white leading-tight truncate group-hover:text-[var(--primary)] transition-colors duration-300">
                                                    PR #: {displayPRNo}
                                                </h4>
                                            </div>
                                            <div className="px-2.5 py-1 bg-slate-50 dark:bg-slate-800 rounded-full text-[8px] font-black uppercase tracking-widest text-slate-400 border border-slate-100 dark:border-slate-700 shrink-0">
                                                {docs.length} Documents
                                            </div>
                                        </div>

                                        <div className="pt-2 border-t border-slate-50 dark:border-slate-800 flex items-center justify-end relative z-10">
                                            <div className="flex items-center gap-2 text-[var(--primary)] font-black text-[10px] uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                                                Open Folder
                                                <div className="w-7 h-7 rounded-lg bg-[var(--primary)] flex items-center justify-center text-white shadow-sm">
                                                    <MdChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <div className="col-span-full py-20 bg-white/50 rounded-[2rem] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-center">
                                <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4 text-slate-300">
                                    <MdDescription className="w-8 h-8" />
                                </div>
                                <h4 className="text-lg font-bold text-slate-400">No Active Projects</h4>
                                <p className="text-xs text-slate-400 mt-2 uppercase tracking-widest font-black">Group documents by PPMP No to see them here</p>
                            </div>
                        )}
                    </div>
                </div>

            </div>

            {/* Structured Workflow Modals */}

            {/* View Details Modal */}
            {activeModal === 'view' && (
                <DocViewModal 
                    doc={selectedDoc} 
                    isOpen={activeModal === 'view'} 
                    onClose={() => {
                        setActiveModal(null);
                        setSelectedDoc(null);
                    }} 
                />
            )}

            {/* Workflow Timeline Modal */}
            <WorkflowModal
                isOpen={activeModal === 'workflow'}
                onClose={() => {
                    setActiveModal(null);
                    setSelectedWorkflowFolder(null);
                }}
                prNo={selectedWorkflowFolder}
            />

            <PPMPFolderModal
                isOpen={activeModal === 'ppmpFolder'}
                onClose={() => {
                    setActiveModal(null);
                    setSelectedPPMP(null);
                    setSelectedPPMPDocs([]);
                }}
                ppmpNo={selectedPPMP}
                documents={selectedPPMPDocs}
            />

            <ProcurementDocumentModal
                isOpen={activeModal === 'detailedWorkflow'}
                onClose={() => {
                    setActiveModal(null);
                    setSelectedProcurementRecord(null);
                }}
                record={selectedProcurementRecord}
                user={user}
                onRefresh={load}
            />

            <CommentModal
                isOpen={activeModal === 'comment'}
                onClose={() => {
                    setActiveModal(null);
                    setSelectedDoc(null);
                }}
                doc={selectedDoc}
                onCommentAdded={load}
            />

            <AlertModal
                message={alertMessage}
                onClose={() => setAlertMessage(null)}
            />

            <ConfirmDialog
                isOpen={!!confirmDialog}
                message={confirmDialog?.message}
                onConfirm={confirmDialog?.onConfirm}
                onCancel={() => setConfirmDialog(null)}
            />
        </div>
    );
};

export default Encode;
