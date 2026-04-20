import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { documentService, reportService, dashboardService, procurementRecordService } from '../../services/api';
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
import NewProcurementRecordModal from "./modals/NewProcurementRecordModal";
import ProcurementDocumentModal from "./modals/ProcurementDocumentModal";
import ProcurementWorkflowView from "./ProcurementWorkflowView";

const Encode = ({ user }) => {
    const [searchParams] = useSearchParams();
    const [showNewRecordModal, setShowNewRecordModal] = useState(false);
    const [viewMode, setViewMode] = useState('list'); // 'list' | 'grouped'
    const [expandedGroups, setExpandedGroups] = useState(new Set());
    const [selectedWorkflowFolder, setSelectedWorkflowFolder] = useState(null);
    const [alertMessage, setAlertMessage] = useState(null);
    const [confirmDialog, setConfirmDialog] = useState(null); // { message, onConfirm }
    const [loading, setLoading] = useState(true);
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

    const isAdmin = user?.role === ROLES.ADMIN;
    const canUploadDocuments = [ROLES.ADMIN, ROLES.ENCODER, ROLES.USER].includes(user?.role);
    const canViewAllDocuments = [ROLES.ADMIN, ROLES.VIEWER, ROLES.ENCODER, ROLES.USER].includes(user?.role);

    const load = async () => {
        setLoading(true);
        try {
            const [dashboardData, docsResponse, recordsResponse] = await Promise.all([
                dashboardService.getData(true, ''),
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
            setPendingBreakdown(dashboardData?.pendingBreakdown ?? []);
        } catch (e) {
            console.error('Load failed:', e);
            setDocuments([]);
            setProcurementRecords([]);
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
                const url = getFetchUrl(r.file_url);
                window.open(url, '_blank', 'noopener');
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


    return (
        <div className="min-h-full pb-12">
            <PageHeader
                title="Document Encoding"
                subtitle="Create new procurement records and keep document details complete and updated."
            />

            <div className="content-section overflow-hidden rounded-xl w-full max-w-[96rem] mx-auto min-w-0 p-0 shadow-lg shadow-slate-200/50">
                {user?.role !== ROLES.VIEWER && (
                    <div className="p-6 sm:p-8 border-b border-[var(--border-light)] bg-white/50 backdrop-blur-sm">
                        <div className="grid grid-cols-1 gap-6">
                            <div className="card relative flex flex-col sm:flex-row items-center gap-6 p-6 sm:p-8 hover:shadow-[var(--shadow-lg)] transition-all duration-300 group bg-white border border-[var(--border-light)] shadow-xl shadow-slate-100/50">
                                <div className="absolute top-0 left-0 w-1.5 h-full bg-[var(--primary)] rounded-l-xl opacity-80 group-hover:opacity-100 transition-opacity" />
                                <div className="min-w-0 flex-1 text-center sm:text-left">
                                    <h3 className="text-lg sm:text-xl font-bold text-[var(--text)] tracking-tight">Add New Procurement</h3>

                                </div>
                                <button 
                                    type="button" 
                                    onClick={() => setShowNewRecordModal(true)} 
                                    className="px-8 py-4 bg-emerald-600/90 hover:bg-emerald-700 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-emerald-500/20 backdrop-blur-md transition-all active:scale-95 flex items-center justify-center gap-2.5 w-full sm:w-auto"
                                >
                                    <MdUpload className="w-5 h-5 transition-transform group-hover:scale-110" />
                                    <span>Add New Procurement</span>
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Procurement Records Section */}
                <div className="p-6 sm:p-8 bg-[var(--background-subtle)]/30">
                    <div className="flex items-center justify-between mb-8 overflow-hidden">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-2xl bg-[var(--primary)] flex items-center justify-center text-white shadow-xl shadow-[var(--primary)]/20">
                                <MdTimeline className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tight">Active Procurement Projects</h3>
                                <p className="text-xs text-slate-400 font-bold tracking-widest mt-0.5">FOLDER-CENTRIC WORKFLOW CONSOLE</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl border border-slate-100 shadow-sm">
                            <span className="text-xs font-black text-[var(--primary)]">{procurementRecords.length}</span>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Projects</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {loading ? (
                            Array(3).fill(0).map((_, i) => (
                                <div key={i} className="h-48 rounded-3xl bg-slate-100 animate-pulse" />
                            ))
                        ) : procurementRecords.length > 0 ? (
                            procurementRecords.map((record) => (
                                <div 
                                    key={record.id}
                                    onClick={() => handleOpenWorkflow(record)}
                                    className="group cursor-pointer bg-white dark:bg-slate-900 rounded-[2rem] p-6 border-2 border-transparent hover:border-[var(--primary)]/50 transition-all duration-500 hover:shadow-2xl hover:shadow-[var(--primary)]/10 flex flex-col gap-4 relative overflow-hidden"
                                >
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--primary)]/5 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700" />
                                    
                                    <div className="flex items-start justify-between relative z-10">
                                        <div className="flex items-center gap-3">
                                            <div className="w-12 h-12 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-xl shadow-inner group-hover:scale-110 transition-transform duration-300">
                                                {record.procurement_type === 'lease_of_venue' ? '🏢' : 
                                                 record.procurement_type === 'small_value' ? '📋' : 
                                                 record.procurement_type === 'public_bidding' ? '📢' : '🤝'}
                                            </div>
                                            <div>
                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-0.5">Tracking ID: {record.id?.toString().slice(0,8) || 'N/A'}</p>
                                                <p className="text-xs font-black text-[var(--primary)] uppercase">PR No: {record.pr_no}</p>
                                            </div>
                                        </div>
                                        <div className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border ${
                                            record.status === 'awarded' || record.status === 'closed' 
                                                ? 'bg-emerald-100 text-emerald-600 border-emerald-200' 
                                                : record.status === 'draft' 
                                                    ? 'bg-slate-100 text-slate-500 border-slate-200'
                                                    : 'bg-blue-100 text-blue-600 border-blue-200'
                                        }`}>
                                            {record.status}
                                        </div>
                                    </div>

                                    <div className="relative z-10 flex-1">
                                        <h4 className="text-lg font-black text-slate-900 dark:text-white leading-tight line-clamp-2 group-hover:text-[var(--primary)] transition-colors duration-300">
                                            {record.title}
                                        </h4>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-2">
                                            {record.procurement_type_display || record.procurement_type}
                                        </p>
                                    </div>

                                    <div className="pt-4 border-t border-slate-50 dark:border-slate-800 flex items-center justify-between relative z-10">
                                        <div className="flex flex-col">
                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Budget (ABC)</span>
                                            <span className="text-xs font-black text-slate-900 dark:text-slate-200">₱{record.total_amount ? formatCurrencyValue(record.total_amount) : '0.00'}</span>
                                        </div>
                                        <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-300 group-hover:bg-[var(--primary)] group-hover:text-white transition-all duration-300 shadow-sm">
                                            <MdChevronRight className="w-6 h-6" />
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="col-span-full py-20 bg-white/50 rounded-[2rem] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-center">
                                <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4 text-slate-300">
                                    <MdDescription className="w-8 h-8" />
                                </div>
                                <h4 className="text-lg font-bold text-slate-400">No Active Projects</h4>
                                <p className="text-xs text-slate-400 mt-2 uppercase tracking-widest font-black">Begin a new procurement folder to track progress</p>
                            </div>
                        )}
                    </div>
                </div>

            </div>

            {/* Structured Workflow Modals */}
            <NewProcurementRecordModal
                show={showNewRecordModal}
                onClose={() => setShowNewRecordModal(false)}
                onSuccess={(newRecord) => {
                    setShowNewRecordModal(false);
                    load();
                    if (newRecord) {
                        handleOpenWorkflow(newRecord);
                    }
                }}
                currentUser={user}
            />

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
