import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { documentService } from '../services/api';
import { ROLES } from '../utils/roles';
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
    MdChevronLeft,
    MdChevronRight,
} from 'react-icons/md';
import PageHeader from '../components/PageHeader';
import { DOC_TYPES, RFQ_PROCUREMENT_METHODS } from '../constants/docTypes';

const REQUIRED_NEW_FIELDS = ['title', 'date', 'file'];
const CHECKLIST_ITEMS = [
    { key: 'title', label: 'Title' },
    { key: 'category', label: 'Category' },
    { key: 'subDoc', label: 'Sub-document' },
    { key: 'date', label: 'Date' },
    { key: 'file', label: 'File uploaded' },
];

const toLettersOnly = (value) => value.replace(/[^A-Za-z\s]/g, '');
const toNumbersOnly = (value) => value.replace(/[^0-9.]/g, '');

const Encode = ({ user }) => {
    const [searchParams] = useSearchParams();
    const [documents, setDocuments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [newSubmitting, setNewSubmitting] = useState(false);
    const [updateSubmitting, setUpdateSubmitting] = useState(false);
    const [newError, setNewError] = useState('');
    const [updateError, setUpdateError] = useState('');
    const [newFormErrors, setNewFormErrors] = useState({}); // { title: 'required', ... }
    const [activeModal, setActiveModal] = useState(null); // 'new' | 'update' | 'updateList' | 'manage' | null
    const [newStep, setNewStep] = useState('docType'); // 'docType' | 'subDoc' | 'form'
    const [selectedDocType, setSelectedDocType] = useState(null);
    const [selectedSubDocType, setSelectedSubDocType] = useState(null);
    const [selectedDoc, setSelectedDoc] = useState(null);
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
    const [alertMessage, setAlertMessage] = useState(null);
    const [confirmDialog, setConfirmDialog] = useState(null); // { message, onConfirm }
    const [searchQuery, setSearchQuery] = useState('');
    const [filterCategory, setFilterCategory] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [filterPRNo, setFilterPRNo] = useState('');
    const [filterDateFrom, setFilterDateFrom] = useState('');
    const [filterDateTo, setFilterDateTo] = useState('');
    const [sortKey, setSortKey] = useState(''); // '' | 'uploaded_at' | 'updated_at' | 'status' | 'category'
    const [sortDir, setSortDir] = useState('asc'); // 'asc' | 'desc'
    const [viewMode, setViewMode] = useState('list'); // 'list' | 'grouped'
    const [expandedGroups, setExpandedGroups] = useState(new Set());
    const [tablePage, setTablePage] = useState(1);
    const TABLE_PAGE_SIZE = 10;
    const [showFilters, setShowFilters] = useState(false);
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
    const [attendanceMembers, setAttendanceMembers] = useState([]); // For Attendance Sheet: [{ id, name, present }]
    const [abstractBidders, setAbstractBidders] = useState([]); // For Abstract of Quotation: [{ id, name, amount, remarks }]
    const [manageSelectedTypeId, setManageSelectedTypeId] = useState(null); // Manage modal: selected document type (DOC_TYPES id)
    const [manageSelectedPrNo, setManageSelectedPrNo] = useState(null); // Manage modal: selected BAC Folder No.
    const [manageFolderPopup, setManageFolderPopup] = useState(null); // { typeId, prNo } when set, show popup with all docs in that BAC folder
    const [manageFolderPopupPreview, setManageFolderPopupPreview] = useState(null); // { doc, previewBlobUrl, previewBlobType } for inline file display
    const [manageFolderPopupIndex, setManageFolderPopupIndex] = useState(0); // which doc (with file) is shown when multiple
    const [manageRefreshing, setManageRefreshing] = useState(false);

    const computeRFQNoFromDate = (dateStr) => {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        if (Number.isNaN(d.getTime())) return '';
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const seq = String(d.getMonth() + 1).padStart(3, '0'); // 001 = Jan, 002 = Feb, etc.
        return `${month}/${day}/${seq}`;
    };
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
        setNewError('');
        setNewSubmitting(true);
        try {
            const fd = new FormData();
            fd.append('mode', 'new');
            fd.append('title', form.title);
            // BAC Folder No. (prNo) is auto-generated by the backend (not sent)
            fd.append('category', form.category || 'General');
            fd.append('subDoc', form.subDoc || 'N/A');
            if (form.date) fd.append('date', form.date);
            fd.append('uploadedBy', user?.fullName || user?.username || '');
            fd.append('status', form.status || 'pending');
            if (form.user_pr_no !== undefined && form.user_pr_no !== '') fd.append('user_pr_no', form.user_pr_no);
            if (form.total_amount !== undefined && form.total_amount !== '') fd.append('total_amount', form.total_amount);
            if (form.source_of_fund !== undefined && form.source_of_fund !== '') fd.append('source_of_fund', form.source_of_fund);
            if (form.ppmp_no !== undefined && form.ppmp_no !== '') fd.append('ppmp_no', form.ppmp_no);
            if (form.app_no !== undefined && form.app_no !== '') fd.append('app_no', form.app_no);
            if (form.app_type !== undefined && form.app_type !== '') fd.append('app_type', form.app_type);
            fd.append('certified_true_copy', form.certified_true_copy ? 'true' : 'false');
            if (form.certified_signed_by !== undefined) fd.append('certified_signed_by', form.certified_signed_by || '');
            if (form.market_budget !== undefined && form.market_budget !== '') fd.append('market_budget', form.market_budget);
            if (form.market_period_from !== undefined) fd.append('market_period_from', form.market_period_from || '');
            if (form.market_period_to !== undefined) fd.append('market_period_to', form.market_period_to || '');
            if (form.market_expected_delivery !== undefined) {
                let value = form.market_expected_delivery || '';
                if (!value && form.deadline_date) {
                    // Combine separate date & time into a single string for backend
                    value = `${form.deadline_date}${form.deadline_time ? ' ' + form.deadline_time : ''}`;
                }
                if (value) fd.append('market_expected_delivery', value);
            }
            if (form.market_service_provider_1 !== undefined) fd.append('market_service_provider_1', form.market_service_provider_1 || '');
            if (form.market_service_provider_2 !== undefined) fd.append('market_service_provider_2', form.market_service_provider_2 || '');
            if (form.market_service_provider_3 !== undefined) fd.append('market_service_provider_3', form.market_service_provider_3 || '');
            if (form.office_division !== undefined) fd.append('office_division', form.office_division || '');
            if (form.received_by !== undefined) fd.append('received_by', form.received_by || '');
            if (form.date_received) fd.append('date_received', form.date_received);
            if (selectedSubDocType === 'Attendance Sheet' && attendanceMembers.length > 0) {
                const members = attendanceMembers
                    .filter((m) => (m.name || '').trim())
                    .map((m) => ({ name: (m.name || '').trim(), present: !!m.present }));
                if (members.length > 0) fd.append('attendance_members', JSON.stringify(members));
            }
            if (form.resolution_no !== undefined) fd.append('resolution_no', form.resolution_no || '');
            if (form.winning_bidder !== undefined) fd.append('winning_bidder', form.winning_bidder || '');
            if (form.resolution_option !== undefined) fd.append('resolution_option', form.resolution_option || '');
            if (form.venue !== undefined) fd.append('venue', form.venue || '');
            if (selectedSubDocType === 'Abstract of Quotation' && abstractBidders.length >= 3) {
                const bidders = abstractBidders
                    .filter((b) => (b.name || '').trim() && (b.amount !== undefined && b.amount !== '') && (b.remarks || '').trim())
                    .map((b) => ({ name: (b.name || '').trim(), amount: b.amount === undefined || b.amount === null ? '' : String(b.amount).trim(), remarks: (b.remarks || '').trim() }));
                if (bidders.length >= 3) fd.append('abstract_bidders', JSON.stringify(bidders));
            }
            if (form.aoq_no !== undefined) fd.append('aoq_no', form.aoq_no || '');
            if (selectedSubDocType === 'Contract Services/Purchase Order') {
                fd.append('contract_received_by_coa', form.contract_received_by_coa ? 'true' : 'false');
                if (form.contract_amount !== undefined && form.contract_amount !== '') fd.append('contract_amount', form.contract_amount);
                if (form.notarized_place !== undefined) fd.append('notarized_place', form.notarized_place || '');
                if (form.notarized_date) fd.append('notarized_date', form.notarized_date);
            }
            if (selectedSubDocType === 'Notice to Proceed') {
                if (form.ntp_service_provider !== undefined) fd.append('ntp_service_provider', form.ntp_service_provider || '');
                if (form.ntp_authorized_rep !== undefined) fd.append('ntp_authorized_rep', form.ntp_authorized_rep || '');
                if (form.ntp_received_by !== undefined) fd.append('ntp_received_by', form.ntp_received_by || '');
            }
            if (selectedSubDocType === 'OSS') {
                if (form.oss_service_provider !== undefined) fd.append('oss_service_provider', form.oss_service_provider || '');
                if (form.oss_authorized_rep !== undefined) fd.append('oss_authorized_rep', form.oss_authorized_rep || '');
            }
            if (selectedSubDocType === "Applicable: Secretary's Certificate and Special Power of Attorney") {
                if (form.secretary_service_provider !== undefined) fd.append('secretary_service_provider', form.secretary_service_provider || '');
                if (form.secretary_owner_rep !== undefined) fd.append('secretary_owner_rep', form.secretary_owner_rep || '');
            }
            if (form.file) fd.append('file', form.file);

            await documentService.create(fd);

            setSelectedDoc(null);
            setForm({ title: '', prNo: '', user_pr_no: '', total_amount: '', source_of_fund: '', ppmp_no: '', app_no: '', app_type: '', certified_true_copy: false, certified_signed_by: '', market_budget: '', market_period_from: '', market_period_to: '', market_expected_delivery: '', deadline_date: '', deadline_time: '', market_service_provider_1: '', market_service_provider_2: '', market_service_provider_3: '', office_division: '', received_by: '', date_received: '', attendance_members: '', resolution_no: '', winning_bidder: '', resolution_option: '', venue: '', aoq_no: '', abstract_bidders: '', contract_received_by_coa: false, contract_amount: '', notarized_place: '', notarized_date: '', ntp_service_provider: '', ntp_authorized_rep: '', ntp_received_by: '', oss_service_provider: '', oss_authorized_rep: '', secretary_service_provider: '', secretary_owner_rep: '', category: '', subDoc: '', date: '', file: null, status: 'pending' });
            // Small delay to ensure backend has processed status calculation
            setTimeout(() => {
                load();
            }, 300);
            setActiveModal(null);
            setAlertMessage('New procurement document saved.');
            setAttendanceMembers([]);
            setAbstractBidders([]);
        } catch (err) {
            setNewError(err.response?.data?.detail || err.message || 'Failed to save.');
        } finally {
            setNewSubmitting(false);
        }
    };

    const validateNewForm = () => {
        const err = {};
        const isLeaseOfVenue = selectedSubDocType === 'Lease of Venue: Table Rating Factor' || (selectedSubDocType && (selectedSubDocType.includes('Lease of Venue') || selectedSubDocType.includes('List of Venue')));
        // Only require Title when the "fill out details" form actually shows a Title/Agenda field
        const formShowsTitleField = !(
            selectedSubDocType === 'Invitation to COA' ||
            isLeaseOfVenue ||
            (selectedDocType?.name === 'RFQ Concerns' && (
                selectedSubDocType?.startsWith('PHILGEPS - List of Venue') ||
                (selectedSubDocType?.startsWith('PHILGEPS - ') && !selectedSubDocType.includes('List of Venue')) ||
                selectedSubDocType?.startsWith('Certificate of DILG - List of Venue') ||
                selectedSubDocType?.startsWith('Certificate of DILG - Small Value Procurement')
            ))
        );
        if (formShowsTitleField && !(form.title && form.title.trim())) err.title = 'This field is required';
        setNewFormErrors(err);
        return Object.keys(err).length === 0;
    };

    const handleNewSubmit = (e) => {
        e.preventDefault();

        if (!validateNewForm()) {
            setNewError('Please complete required fields (Title).');
            return;
        }

        // PHILGEPS RFQ Concerns: require Date + Upload for SVP / Public Bidding only
        if (
            selectedDocType?.name === 'RFQ Concerns' &&
            selectedSubDocType?.startsWith('PHILGEPS - ') &&
            !selectedSubDocType.includes('List of Venue')
        ) {
            if (!(form.date && form.date.trim())) {
                setNewError('Date is required for this PHILGEPS document.');
                return;
            }
            if (!form.file) {
                setNewError('Upload is required for this PHILGEPS document.');
                return;
            }
        }

        // Certificate of DILG RFQ Concerns - Small Value Procurement: validate Date, RFQ No., Deadline, Service Providers
        if (
            selectedDocType?.name === 'RFQ Concerns' &&
            selectedSubDocType?.startsWith('Certificate of DILG - Small Value Procurement')
        ) {
            if (!(form.date && form.date.trim())) {
                setNewError('Date is required for this Certificate of DILG document.');
                return;
            }
            const autoRFQ = form.user_pr_no && form.user_pr_no.trim()
                ? form.user_pr_no.trim()
                : computeRFQNoFromDate(form.date);
            if (!autoRFQ) {
                setNewError('RFQ No. could not be generated. Please check the date.');
                return;
            }
            if (!(form.deadline_date && form.deadline_date.trim())) {
                setNewError('Deadline date is required for this Certificate of DILG document.');
                return;
            }
            if (!(form.deadline_time && form.deadline_time.trim())) {
                setNewError('Deadline time is required for this Certificate of DILG document.');
                return;
            }
            const trimmedProviders = certificateServiceProviders.map((p) => (p || '').trim());
            if (trimmedProviders.slice(0, 3).some((p) => !p)) {
                setNewError('Please enter at least 3 service providers.');
                return;
            }
            // Sync first three providers into the form fields so they are saved
            setForm((f) => ({
                ...f,
                user_pr_no: autoRFQ,
                market_service_provider_1: trimmedProviders[0] || '',
                market_service_provider_2: trimmedProviders[1] || '',
                market_service_provider_3: trimmedProviders.slice(2).join('; ') || '',
            }));
        }

        if (selectedSubDocType === 'Market Scopping') {
            const s1 = (form.market_service_provider_1 || '').trim();
            const s2 = (form.market_service_provider_2 || '').trim();
            const s3 = (form.market_service_provider_3 || '').trim();
            if (!s1 || !s2 || !s3) {
                setNewError('All 3 Service Providers must be entered. Document will not be uploaded until all 3 are filled.');
                return;
            }
        }
        if (selectedSubDocType === 'Requisition and Issue Slip') {
            if (!(form.date && form.date.trim())) {
                setNewError('Date is required for Requisition and Issue Slip.');
                return;
            }
            if (!(form.office_division && form.office_division.trim())) {
                setNewError('Office/Division is required for Requisition and Issue Slip.');
                return;
            }
            if (!(form.received_by && form.received_by.trim())) {
                setNewError('Received By is required for Requisition and Issue Slip.');
                return;
            }
        }
        if (selectedSubDocType === 'Notice of BAC Meeting') {
            if (!(form.date && form.date.trim())) {
                setNewError('Date is required for Notice of BAC Meeting.');
                return;
            }
            if (!form.file) {
                setNewError('Upload is required for Notice of BAC Meeting.');
                return;
            }
        }
        if (selectedSubDocType === 'Invitation to COA') {
            if (!(form.date && form.date.trim())) {
                setNewError('Date is required for Invitation to COA.');
                return;
            }
            if (!(form.date_received && form.date_received.trim())) {
                setNewError('Date received is required for Invitation to COA.');
                return;
            }
            if (!form.file) {
                setNewError('Upload is required for Invitation to COA.');
                return;
            }
        }
        if (selectedSubDocType === 'Attendance Sheet') {
            if (!(form.date && form.date.trim())) {
                setNewError('Date is required for Attendance Sheet.');
                return;
            }
            const withNames = attendanceMembers.filter((m) => (m.name || '').trim());
            if (withNames.length === 0) {
                setNewError('Add at least one BAC member with a name.');
                return;
            }
            if (!form.file) {
                setNewError('Upload is required for Attendance Sheet.');
                return;
            }
        }
        if (selectedSubDocType === 'Minutes of the Meeting') {
            if (!(form.title && form.title.trim())) {
                setNewError('Agenda/Others is required for Minutes of the Meeting.');
                return;
            }
            if (!(form.date && form.date.trim())) {
                setNewError('Date is required for Minutes of the Meeting.');
                return;
            }
        }
        if (selectedSubDocType === 'BAC Resolution') {
            if (!(form.resolution_no && form.resolution_no.trim())) {
                setNewError('Resolution No. is required for BAC Resolution.');
                return;
            }
            if (!(form.title && form.title.trim())) {
                setNewError('Title is required for BAC Resolution.');
                return;
            }
            if (!(form.winning_bidder && form.winning_bidder.trim())) {
                setNewError('Winning Bidder is required for BAC Resolution.');
                return;
            }
            if (form.total_amount === '' || form.total_amount === undefined || form.total_amount === null) {
                setNewError('Amount is required for BAC Resolution.');
                return;
            }
            if (!(form.resolution_option && form.resolution_option.trim())) {
                setNewError('Options is required for BAC Resolution.');
                return;
            }
            if (!(form.office_division && form.office_division.trim())) {
                setNewError('Office/Division is required for BAC Resolution.');
                return;
            }
            if (!(form.date && form.date.trim())) {
                setNewError('Date of Adoption is required for BAC Resolution.');
                return;
            }
            if (!(form.venue && form.venue.trim())) {
                setNewError('Venue is required for BAC Resolution.');
                return;
            }
            if (!form.file) {
                setNewError('Upload is required for BAC Resolution.');
                return;
            }
        }
        if (selectedSubDocType === 'Abstract of Quotation') {
            if (!(form.aoq_no && form.aoq_no.trim())) {
                setNewError('AOQ No. is required for Abstract of Quotation.');
                return;
            }
            if (!(form.date && form.date.trim())) {
                setNewError('Date is required for Abstract of Quotation.');
                return;
            }
            if (!(form.title && form.title.trim())) {
                setNewError('Purpose is required for Abstract of Quotation.');
                return;
            }
            if (abstractBidders.length < 3) {
                setNewError('At least 3 bidders are required. Add bidders and fill Bidder name, Amount, and Remarks for each.');
                return;
            }
            const filled = abstractBidders.filter((b) => (b.name || '').trim() && (b.amount !== undefined && b.amount !== '') && (b.remarks || '').trim());
            if (filled.length < 3) {
                setNewError('All 3 required bidder rows must have Bidder name, Amount, and Remarks filled. You cannot proceed until all 3 are complete.');
                return;
            }
            const hasIncomplete = abstractBidders.some((b) => !(b.name || '').trim() || (b.amount === undefined || b.amount === '') || !(b.remarks || '').trim());
            if (hasIncomplete) {
                setNewError('Every bidder row must have Bidder name, Amount, and Remarks filled. Complete all rows or remove empty ones.');
                return;
            }
            if (!form.file) {
                setNewError('Upload is required for Abstract of Quotation.');
                return;
            }
        }
        if (selectedSubDocType === 'Contract Services/Purchase Order') {
            if (!(form.date && form.date.trim())) {
                setNewError('Date is required for Contract Services.');
                return;
            }
            if (form.contract_received_by_coa !== true && form.contract_received_by_coa !== false) {
                setNewError('Received by COA (Yes or No) is required for Contract Services.');
                return;
            }
            if (form.contract_amount === '' || form.contract_amount === undefined || form.contract_amount === null) {
                setNewError('Contract Amount is required for Contract Services.');
                return;
            }
            if (!(form.notarized_place && form.notarized_place.trim())) {
                setNewError('Notarized (place) is required for Contract Services.');
                return;
            }
            if (!(form.notarized_date && form.notarized_date.trim())) {
                setNewError('Notarized (date) is required for Contract Services.');
                return;
            }
            if (!form.file) {
                setNewError('Upload is required for Contract Services.');
                return;
            }
        }
        if (selectedSubDocType === 'Notice to Proceed') {
            if (!(form.date && form.date.trim())) {
                setNewError('Date is required for Notice to Proceed.');
                return;
            }
            if (!(form.ntp_service_provider && form.ntp_service_provider.trim())) {
                setNewError('Service Provider is required for Notice to Proceed.');
                return;
            }
            if (!(form.ntp_authorized_rep && form.ntp_authorized_rep.trim())) {
                setNewError('Authorized Representative/Owner is required for Notice to Proceed.');
                return;
            }
            if (!(form.ntp_received_by && form.ntp_received_by.trim())) {
                setNewError('Received By is required for Notice to Proceed.');
                return;
            }
            if (!form.file) {
                setNewError('Upload is required for Notice to Proceed.');
                return;
            }
        }
        if (selectedSubDocType === 'OSS') {
            if (!(form.oss_service_provider && form.oss_service_provider.trim())) {
                setNewError('Service Provider is required for OSS.');
                return;
            }
            if (!(form.oss_authorized_rep && form.oss_authorized_rep.trim())) {
                setNewError('Authorized Representative/Owner is required for OSS.');
                return;
            }
            if (!(form.date && form.date.trim())) {
                setNewError('Date is required for OSS.');
                return;
            }
            if (!form.file) {
                setNewError('Upload is required for OSS.');
                return;
            }
        }
        if (selectedSubDocType === "Applicable: Secretary's Certificate and Special Power of Attorney") {
            if (!(form.secretary_service_provider && form.secretary_service_provider.trim())) {
                setNewError("Service Provider is required for Secretary's Certificate.");
                return;
            }
            if (!(form.secretary_owner_rep && form.secretary_owner_rep.trim())) {
                setNewError("Owner/Authorized Representative is required for Secretary's Certificate.");
                return;
            }
            if (!(form.date && form.date.trim())) {
                setNewError("Date is required for Secretary's Certificate.");
                return;
            }
            if (!form.file) {
                setNewError("Upload is required for Secretary's Certificate.");
                return;
            }
        }
        if (selectedSubDocType === 'PhilGEPS Posting of Award') {
            if (!(form.date && form.date.trim())) {
                setNewError('Date is required for PhilGEPS Posting of Award.');
                return;
            }
            if (!form.file) {
                setNewError('Upload is required for PhilGEPS Posting of Award.');
                return;
            }
        }
        if (selectedSubDocType === 'Certificate of DILG R1 Website Posting of Award') {
            if (!(form.date && form.date.trim())) {
                setNewError('Date is required for Certificate of DILG R1 Website Posting of Award.');
                return;
            }
            if (!form.file) {
                setNewError('Upload is required for Certificate of DILG R1 Website Posting of Award.');
                return;
            }
        }
        if (selectedSubDocType === 'Notice of Award (Posted)' || selectedSubDocType === 'Abstract of Quotation (Posted)' || selectedSubDocType === 'BAC Resolution (Posted)') {
            if (!(form.date && form.date.trim())) {
                setNewError('Date is required for this document.');
                return;
            }
        }
        setNewError('');
        setConfirmDialog({
            message: 'Are you sure you want to submit this new procurement?',
            onConfirm: () => {
                setConfirmDialog(null);
                performNewSubmit();
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
            fd.append('mode', 'update');
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
    const docRequiresTitle = (doc) => {
        const sub = (doc?.subDoc || '').trim();
        return !(
            sub === 'Invitation to COA' ||
            sub === 'List of Venue' ||
            sub.endsWith(' - List of Venue') ||
            sub === 'Lease of Venue: Table Rating Factor' ||
            sub === 'PHILGEPS - Small Value Procurement' ||
            sub === 'PHILGEPS - Public Bidding' ||
            sub === 'Certificate of DILG - Small Value Procurement' ||
            sub === 'Certificate of DILG - List of Venue' ||
            sub === 'Certificate of DILG - Public Bidding' ||
            sub === 'Small Value Procurement' ||
            sub === 'Public Bidding'
        );
    };

    const docRequiresDate = (doc) => {
        const sub = (doc?.subDoc || '').trim();
        return !(sub === 'List of Venue' || sub.endsWith(' - List of Venue') || sub === 'Lease of Venue: Table Rating Factor');
    };

    const isIncomplete = (doc) =>
        (docRequiresTitle(doc) && !doc.title) || !doc.prNo || !doc.category || (docRequiresDate(doc) && !doc.date);

    const isAdmin = user?.role === ROLES.ADMIN;
    const canViewAllDocuments = isAdmin; // Only admin can view/download documents; employees cannot view files
    const canUploadDocuments = true; // Both admin and employee see New Procurement and Update buttons
    
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
        if (docRequiresTitle(doc) && !(doc.title && String(doc.title).trim())) missing.push('Title');
        if (!(doc.prNo && String(doc.prNo).trim())) missing.push('BAC Folder No.');
        if (!(doc.category && String(doc.category).trim())) missing.push('Category');
        if (!(doc.subDoc && String(doc.subDoc).trim())) missing.push('Sub-document');
        const isActivityDesign = (doc.subDoc || '').trim() === 'Activity Design';
        const isPPMP = (doc.subDoc || '').trim() === 'Project Procurement Management Plan/Supplemental PPMP';
        const isAPP = (doc.subDoc || '').trim() === 'Annual Procurement Plan';
        if (isActivityDesign) {
            if (!(doc.source_of_fund && String(doc.source_of_fund).trim())) missing.push('Source of Fund');
        } else if (isPPMP) {
            if (!(doc.source_of_fund && String(doc.source_of_fund).trim())) missing.push('Source of Fund');
            if (!(doc.ppmp_no && String(doc.ppmp_no).trim())) missing.push('PPMP No.');
        } else if (isAPP) {
            if (!(doc.app_type && String(doc.app_type).trim())) missing.push('Type (Final/Updated)');
            if ((doc.app_type || '').trim() === 'Updated' && !(doc.app_no && String(doc.app_no).trim())) missing.push('APP No.');
            if (doc.certified_true_copy && !(doc.certified_signed_by && String(doc.certified_signed_by).trim())) missing.push('Signed by');
        } else if ((doc.subDoc || '').trim() === 'Market Scopping') {
            if (doc.market_budget == null || doc.market_budget === '') missing.push('Budget');
            if (!(doc.market_period_from && String(doc.market_period_from).trim())) missing.push('Period from');
            if (!(doc.market_period_to && String(doc.market_period_to).trim())) missing.push('Period to');
            if (!(doc.market_expected_delivery && String(doc.market_expected_delivery).trim())) missing.push('Expected Delivery');
            if (!(doc.market_service_provider_1 && String(doc.market_service_provider_1).trim())) missing.push('Service Provider 1');
            if (!(doc.market_service_provider_2 && String(doc.market_service_provider_2).trim())) missing.push('Service Provider 2');
            if (!(doc.market_service_provider_3 && String(doc.market_service_provider_3).trim())) missing.push('Service Provider 3');
        } else if ((doc.subDoc || '').trim() === 'Requisition and Issue Slip') {
            if (!doc.date) missing.push('Date');
            if (!(doc.office_division && String(doc.office_division).trim())) missing.push('Office/Division');
            if (!(doc.received_by && String(doc.received_by).trim())) missing.push('Received By');
        } else if (docRequiresDate(doc) && !doc.date) {
            missing.push('Date');
        }
        const noFileRequired = (() => {
            const sub = (doc.subDoc || '').trim();
            return sub === 'List of Venue' || sub.endsWith(' - List of Venue') || sub === 'Lease of Venue: Table Rating Factor' ||
                sub === 'Minutes of the Meeting' || sub === 'Notice of Award (Posted)' || sub === 'Abstract of Quotation (Posted)' || sub === 'BAC Resolution (Posted)';
        })();
        const hasFile = doc.file || (doc.file_url && String(doc.file_url).trim());
        if (!noFileRequired && !hasFile) missing.push('File');
        if (!(doc.uploadedBy && String(doc.uploadedBy).trim())) missing.push('Uploaded By');
        return missing;
    };

    const isUserUploader = (doc) => {
        if (!doc?.uploadedBy || !user) return false;
        const uploadedBy = (doc.uploadedBy || '').trim().toLowerCase();
        const meFull = (user.fullName || '').trim().toLowerCase();
        const meUser = (user.username || '').trim().toLowerCase();
        return (meFull && uploadedBy === meFull) || (meUser && uploadedBy === meUser);
    };

    // Checklist data for Update modal: which sub-docs are completed (any document matching category+subDoc)
    const checklistData = useMemo(() => {
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
        const activeType = checklistData.find((dt) => dt.id === activeChecklistCategoryId);
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
    }, [activeModal, activeChecklistCategoryId, checklistData, documents, lastAutoPreviewFolderId]);

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
        if (sub === 'Lease of Venue: Table Rating Factor' || sub.includes('Lease of Venue') || sub === 'List of Venue' || sub.endsWith(' - List of Venue')) {
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

    const hasActiveFilters = searchQuery || filterCategory || filterStatus || filterPRNo || filterDateFrom || filterDateTo;

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
        setActiveModal('new');
        setNewStep('docType');
        setSelectedDocType(null);
        setSelectedSubDocType(null);
        setForm({ title: '', prNo: '', user_pr_no: '', total_amount: '', source_of_fund: '', ppmp_no: '', app_no: '', app_type: '', certified_true_copy: false, certified_signed_by: '', market_budget: '', market_period_from: '', market_period_to: '', market_expected_delivery: '', market_service_provider_1: '', market_service_provider_2: '', market_service_provider_3: '', office_division: '', received_by: '', date_received: '', attendance_members: '', resolution_no: '', winning_bidder: '', resolution_option: '', venue: '', aoq_no: '', abstract_bidders: '', contract_received_by_coa: false, contract_amount: '', notarized_place: '', notarized_date: '', ntp_service_provider: '', ntp_authorized_rep: '', ntp_received_by: '', oss_service_provider: '', oss_authorized_rep: '', secretary_service_provider: '', secretary_owner_rep: '', category: '', subDoc: '', date: '', file: null, status: 'pending' });
        setNewError('');
        setNewFormErrors({});
        setCertificateServiceProviders(['', '', '']);
    };
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
                    <div className="p-5 sm:p-6 border-b border-[var(--border-light)]">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="card overflow-hidden flex items-center gap-4 sm:gap-6 px-4 py-6 sm:px-6 sm:py-8 hover:shadow-[var(--shadow-lg)] transition-shadow duration-300 group">
                                <div className="min-w-0 flex-1">
                                    <p className="text-base sm:text-lg font-semibold text-[var(--text)]">Start New Procurement</p>
                                    <p className="mt-1 text-[var(--text-muted)] text-sm">Use this section to submit new procurement documents for BAC processing. New documents should be filed here.</p>
                                </div>
                                <button type="button" onClick={openNew} className="bg-green-600 hover:bg-green-700 active:bg-green-800 text-white font-semibold shrink-0 rounded-xl flex items-center justify-center gap-2 px-4 py-3 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2">
                                    <MdUpload className="w-5 h-5" />
                                    Start New
                                </button>
                            </div>
                            <div className="card overflow-hidden flex items-center gap-4 sm:gap-6 px-4 py-6 sm:px-6 sm:py-8 hover:shadow-[var(--shadow-lg)] transition-shadow duration-300 group">
                                <div className="min-w-0 flex-1">
                                    <p className="text-base sm:text-lg font-semibold text-[var(--text)]">Update Documents</p>
                                    <p className="mt-1 text-[var(--text-muted)] text-sm">Use this section to update existing documents, add missing details, or correct information. To complete a document, click its ongoing entry in the checklist.</p>
                                </div>
                                <button type="button" onClick={openUpdate} className="bg-green-600 hover:bg-green-700 active:bg-green-800 text-white font-semibold shrink-0 rounded-xl flex items-center justify-center gap-2 px-4 py-3 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2">
                                    <MdEdit className="w-5 h-5" />
                                    Update
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
                                {hasActiveFilters && (
                                    <span className="ml-2 text-sm font-normal text-[var(--text-muted)]">
                                        ({filteredDocuments.length} of {updateListDocs.length})
                                    </span>
                                )}
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
                                    No documents match your filters.
                                    {hasActiveFilters && (
                                        <button
                                            type="button"
                                            onClick={clearFilters}
                                            className="block mx-auto mt-2 text-[var(--primary)] hover:underline"
                                        >
                                            Clear filters
                                        </button>
                                    )}
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
                                                                    {(canViewAllDocuments || isAdmin) && <th className="table-th">Actions</th>}
                                                                </tr>
                                                            </thead>
                                                            <tbody className="bg-[var(--surface)] divide-y divide-[var(--border-light)]">
                                                                {docs.map((doc) => {
                                                                    const statusColors = {
                                                                        complete: 'bg-green-100 text-green-800 border-green-200',
                                                                        ongoing: 'bg-yellow-100 text-yellow-800 border-yellow-200',
                                                                        pending: 'bg-red-100 text-red-800 border-red-200',
                                                                    };
                                                                    const statusColor = statusColors[doc.status] || statusColors.pending;
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
                                                                            {(canViewAllDocuments || isAdmin) && (
                                                                            <td className="table-td">
                                                                                {doc.file_url ? (
                                                                                    <div className="flex items-center justify-center gap-2">
                                                                                        <button
                                                                                            type="button"
                                                                                            onClick={() => {
                                                                                                setPreviewSequence(null);
                                                                                                openPreview(doc);
                                                                                            }}
                                                                                            className="inline-flex items-center justify-center px-3 py-1 text-[11px] font-medium rounded-full border border-[var(--border)] text-[var(--primary)] hover:border-[var(--primary)] hover:bg-[var(--primary-muted)] transition-all duration-300 ease-out hover:scale-105 active:scale-95"
                                                                                            title="View document"
                                                                                        >
                                                                                            <MdVisibility className="w-3.5 h-3.5" />
                                                                                        </button>
                                                                                        {isAdmin && null}
                                                                                    </div>
                                                                                ) : (
                                                                                    <span className="text-[var(--text-muted)]">—</span>
                                                                                )}
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
                                            {(canViewAllDocuments || isAdmin) && <th className="table-th">Actions</th>}
                                        </tr>
                                    </thead>
                                    <tbody className="bg-[var(--surface)] divide-y divide-[var(--border-light)]">
                                        {paginatedDocuments.map((doc) => {
                                            const statusColors = {
                                                complete: 'bg-green-100 text-green-800 border-green-200',
                                                ongoing: 'bg-yellow-100 text-yellow-800 border-yellow-200',
                                                pending: 'bg-red-100 text-red-800 border-red-200',
                                            };
                                            const statusColor = statusColors[doc.status] || statusColors.pending;
                                            
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
                                                    {(canViewAllDocuments || isAdmin) && (
                                                    <td className="table-td">
                                                        {doc.file_url ? (
                                                            <div className="flex items-center justify-center gap-2">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setPreviewSequence(null);
                                                                        openPreview(doc);
                                                                    }}
                                                                    className="inline-flex items-center justify-center px-3 py-1 text-[11px] font-medium rounded-full border border-[var(--border)] text-[var(--primary)] hover:border-[var(--primary)] hover:bg-[var(--primary-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)] focus:ring-offset-1 transition-all duration-300 ease-out hover:scale-105 active:scale-95"
                                                                    title="View document"
                                                                >
                                                                    View
                                                                </button>
                                                                {isAdmin && null}
                                                            </div>
                                                        ) : (
                                                            <span className="text-[var(--text-muted)]">—</span>
                                                        )}
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
                                        className="p-2 rounded-lg border border-[var(--border)] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[var(--background-subtle)]"
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
                                        className="p-2 rounded-lg border border-[var(--border)] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[var(--background-subtle)]"
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
                                        className="text-sm text-[var(--primary)] hover:text-[var(--primary-hover)] hover:underline font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-1 rounded px-2 py-1"
                                    >
                                        ← Back
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
                                {selectedDocType?.name === 'RFQ Concerns' && selectedSubDocType?.startsWith('PHILGEPS - List of Venue') ? (
                                    <>
                                        <div className="text-sm text-[var(--text-muted)]">
                                            No additional details are required for this PHILGEPS - Lease of Venue entry. Click
                                            &nbsp;<span className="font-semibold text-[var(--text)]">Submit</span> below to save it.
                                        </div>
                                    </>
                                ) : selectedDocType?.name === 'RFQ Concerns' &&
                                  selectedSubDocType?.startsWith('PHILGEPS - ') &&
                                  !selectedSubDocType.includes('List of Venue') ? (
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
                                                    if (newFormErrors.date) setNewFormErrors((e2) => ({ ...e2, date: '' }));
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
                                                        if (newFormErrors.file) setNewFormErrors((e2) => ({ ...e2, file: '' }));
                                                    }}
                                                    className={`input-field py-1.5 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-[var(--background-subtle)] file:text-[var(--text)] flex-1 min-w-0 ${newFormErrors.file ? 'border-2 border-red-500 bg-red-50/50 ring-2 ring-red-200' : ''}`}
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
                                ) : selectedDocType?.name === 'RFQ Concerns' && selectedSubDocType?.startsWith('Certificate of DILG - List of Venue') ? (
                                    <>
                                        <div className="text-sm text-[var(--text-muted)]">
                                            No additional details are required for this Certificate of DILG - Lease of Venue entry. Click
                                            &nbsp;<span className="font-semibold text-[var(--text)]">Submit</span> below to save it.
                                        </div>
                                    </>
                                ) : selectedDocType?.name === 'RFQ Concerns' &&
                                  selectedSubDocType?.startsWith('Certificate of DILG - Small Value Procurement') ? (
                                    <>
                                        <div>
                                            <label className="label">Date <span className="text-red-600 font-semibold" aria-label="required">*</span></label>
                                            <input
                                                type="date"
                                                value={form.date}
                                                onChange={(e) => {
                                                    setForm((f) => ({ ...f, date: e.target.value }));
                                                    if (newFormErrors.date) setNewFormErrors((e2) => ({ ...e2, date: '' }));
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
                                            <label className="label">Service Providers <span className="text-red-600 font-semibold" aria-label="required">*</span></label>
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
                                        <div>
                                            <label className="label">Upload <span className="text-red-600 font-semibold" aria-label="required">*</span></label>
                                            <div className="flex flex-wrap items-center gap-2">
                                                <input
                                                    type="file"
                                                    onChange={(e) => {
                                                        setForm((f) => ({ ...f, file: e.target.files?.[0] ?? null }));
                                                        if (newFormErrors.file) setNewFormErrors((e2) => ({ ...e2, file: '' }));
                                                    }}
                                                    className={`input-field py-1.5 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-[var(--background-subtle)] file:text-[var(--text)] flex-1 min-w-0 ${newFormErrors.file ? 'border-2 border-red-500 bg-red-50/50 ring-2 ring-red-200' : ''}`}
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
                                ) : /* Purchase Request: BAC Folder No., Purpose, PR No., Date, Total amount, Upload */ selectedSubDocType === 'Purchase Request' ? (
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
                                                    if (newFormErrors.title) setNewFormErrors((e2) => ({ ...e2, title: '' }));
                                                }}
                                                className={`input-field ${newFormErrors.title ? 'border-2 border-red-500 bg-red-50/50 ring-2 ring-red-200' : ''}`}
                                                placeholder="Purpose of the purchase request"
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
                                                onChange={(e) => {
                                                    setForm((f) => ({ ...f, date: e.target.value }));
                                                    if (newFormErrors.date) setNewFormErrors((e2) => ({ ...e2, date: '' }));
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
                                            <label className="label">Total amount</label>
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
                                        <div>
                                            <label className="label">Upload <span className="text-red-600 font-semibold" aria-label="required">*</span></label>
                                            <div className="flex flex-wrap items-center gap-2">
                                                <input
                                                    type="file"
                                                    onChange={(e) => {
                                                        setForm((f) => ({ ...f, file: e.target.files?.[0] ?? null }));
                                                        if (newFormErrors.file) setNewFormErrors((e2) => ({ ...e2, file: '' }));
                                                    }}
                                                    className={`input-field py-1.5 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-[var(--background-subtle)] file:text-[var(--text)] flex-1 min-w-0 ${newFormErrors.file ? 'border-2 border-red-500 bg-red-50/50 ring-2 ring-red-200' : ''}`}
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
                                ) : selectedSubDocType === 'Activity Design' ? (
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
                                                    if (newFormErrors.title) setNewFormErrors((e2) => ({ ...e2, title: '' }));
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
                                        <div>
                                            <label className="label">Upload <span className="text-red-600 font-semibold" aria-label="required">*</span></label>
                                            <div className="flex flex-wrap items-center gap-2">
                                                <input
                                                    type="file"
                                                    onChange={(e) => {
                                                        setForm((f) => ({ ...f, file: e.target.files?.[0] ?? null }));
                                                        if (newFormErrors.file) setNewFormErrors((e2) => ({ ...e2, file: '' }));
                                                    }}
                                                    className={`input-field py-1.5 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-[var(--background-subtle)] file:text-[var(--text)] flex-1 min-w-0 ${newFormErrors.file ? 'border-2 border-red-500 bg-red-50/50 ring-2 ring-red-200' : ''}`}
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
                                ) : selectedSubDocType === 'Project Procurement Management Plan/Supplemental PPMP' ? (
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
                                                    if (newFormErrors.title) setNewFormErrors((e2) => ({ ...e2, title: '' }));
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
                                        <div>
                                            <label className="label">Upload <span className="text-red-600 font-semibold" aria-label="required">*</span></label>
                                            <div className="flex flex-wrap items-center gap-2">
                                                <input
                                                    type="file"
                                                    onChange={(e) => {
                                                        setForm((f) => ({ ...f, file: e.target.files?.[0] ?? null }));
                                                        if (newFormErrors.file) setNewFormErrors((e2) => ({ ...e2, file: '' }));
                                                    }}
                                                    className={`input-field py-1.5 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-[var(--background-subtle)] file:text-[var(--text)] flex-1 min-w-0 ${newFormErrors.file ? 'border-2 border-red-500 bg-red-50/50 ring-2 ring-red-200' : ''}`}
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
                                                    if (newFormErrors.title) setNewFormErrors((e2) => ({ ...e2, title: '' }));
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
                                                        if (newFormErrors.file) setNewFormErrors((e2) => ({ ...e2, file: '' }));
                                                    }}
                                                    className={`input-field py-1.5 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-[var(--background-subtle)] file:text-[var(--text)] flex-1 min-w-0 ${newFormErrors.file ? 'border-2 border-red-500 bg-red-50/50 ring-2 ring-red-200' : ''}`}
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
                                                    if (newFormErrors.title) setNewFormErrors((e2) => ({ ...e2, title: '' }));
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
                                            <label className="label">Budget</label>
                                            <div className="flex items-center border border-[var(--border)] rounded-[var(--radius-sm)] bg-[var(--surface)] overflow-hidden focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
                                                <span className="pl-4 text-[var(--text)] font-medium" aria-hidden="true">₱</span>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    min="0"
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
                                                        if (newFormErrors.file) setNewFormErrors((e2) => ({ ...e2, file: '' }));
                                                    }}
                                                    className={`input-field py-1.5 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-[var(--background-subtle)] file:text-[var(--text)] flex-1 min-w-0 ${newFormErrors.file ? 'border-2 border-red-500 bg-red-50/50 ring-2 ring-red-200' : ''}`}
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
                                                    if (newFormErrors.title) setNewFormErrors((e2) => ({ ...e2, title: '' }));
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
                                                    if (newFormErrors.date) setNewFormErrors((e2) => ({ ...e2, date: '' }));
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
                                                        if (newFormErrors.file) setNewFormErrors((e2) => ({ ...e2, file: '' }));
                                                    }}
                                                    className={`input-field py-1.5 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-[var(--background-subtle)] file:text-[var(--text)] flex-1 min-w-0 ${newFormErrors.file ? 'border-2 border-red-500 bg-red-50/50 ring-2 ring-red-200' : ''}`}
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
                                                    if (newFormErrors.title) setNewFormErrors((e2) => ({ ...e2, title: '' }));
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
                                                    if (newFormErrors.date) setNewFormErrors((e2) => ({ ...e2, date: '' }));
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
                                                        if (newFormErrors.file) setNewFormErrors((e2) => ({ ...e2, file: '' }));
                                                    }}
                                                    className={`input-field py-1.5 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-[var(--background-subtle)] file:text-[var(--text)] flex-1 min-w-0 ${newFormErrors.file ? 'border-2 border-red-500 bg-red-50/50 ring-2 ring-red-200' : ''}`}
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
                                                    if (newFormErrors.date) setNewFormErrors((e2) => ({ ...e2, date: '' }));
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
                                                        if (newFormErrors.file) setNewFormErrors((e2) => ({ ...e2, file: '' }));
                                                    }}
                                                    className={`input-field py-1.5 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-[var(--background-subtle)] file:text-[var(--text)] flex-1 min-w-0 ${newFormErrors.file ? 'border-2 border-red-500 bg-red-50/50 ring-2 ring-red-200' : ''}`}
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
                                                    if (newFormErrors.title) setNewFormErrors((e2) => ({ ...e2, title: '' }));
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
                                                    if (newFormErrors.date) setNewFormErrors((e2) => ({ ...e2, date: '' }));
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
                                            <p className="text-xs text-[var(--text-muted)] mb-2">Add members and check Present if they attended, or leave unchecked for absent.</p>
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
                                                        className="p-2 text-[var(--text-muted)] hover:text-red-600 hover:bg-red-50 rounded transition-colors"
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
                                        <div>
                                            <label className="label">Upload <span className="text-red-600 font-semibold" aria-label="required">*</span></label>
                                            <div className="flex flex-wrap items-center gap-2">
                                                <input
                                                    type="file"
                                                    onChange={(e) => {
                                                        setForm((f) => ({ ...f, file: e.target.files?.[0] ?? null }));
                                                        if (newFormErrors.file) setNewFormErrors((e2) => ({ ...e2, file: '' }));
                                                    }}
                                                    className={`input-field py-1.5 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-[var(--background-subtle)] file:text-[var(--text)] flex-1 min-w-0 ${newFormErrors.file ? 'border-2 border-red-500 bg-red-50/50 ring-2 ring-red-200' : ''}`}
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
                                                    if (newFormErrors.title) setNewFormErrors((e2) => ({ ...e2, title: '' }));
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
                                                    if (newFormErrors.date) setNewFormErrors((e2) => ({ ...e2, date: '' }));
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
                                            <input type="text" value={form.resolution_no} onChange={(e) => { const value = toNumbersOnly(e.target.value); setForm((f) => ({ ...f, resolution_no: value })); if (newFormErrors.resolution_no) setNewFormErrors((e2) => ({ ...e2, resolution_no: '' })); }} className={`input-field ${newFormErrors.resolution_no ? 'border-2 border-red-500 bg-red-50/50 ring-2 ring-red-200' : ''}`} placeholder="Resolution number" aria-invalid={!!newFormErrors.resolution_no} />
                                            {newFormErrors.resolution_no && <p className="mt-1.5 flex items-center gap-2 text-sm font-medium text-red-700" role="alert"><MdError className="w-4 h-4 flex-shrink-0" aria-hidden />{newFormErrors.resolution_no}</p>}
                                        </div>
                                        <div>
                                            <label className="label">Title <span className="text-red-600 font-semibold" aria-label="required">*</span></label>
                                            <input type="text" value={form.title} onChange={(e) => { const value = toLettersOnly(e.target.value); setForm((f) => ({ ...f, title: value })); if (newFormErrors.title) setNewFormErrors((e2) => ({ ...e2, title: '' })); }} className={`input-field ${newFormErrors.title ? 'border-2 border-red-500 bg-red-50/50 ring-2 ring-red-200' : ''}`} placeholder="Title" aria-invalid={!!newFormErrors.title} />
                                            {newFormErrors.title && <p className="mt-1.5 flex items-center gap-2 text-sm font-medium text-red-700" role="alert"><MdError className="w-4 h-4 flex-shrink-0" aria-hidden />{newFormErrors.title}</p>}
                                        </div>
                                        <div>
                                            <label className="label">Winning Bidder <span className="text-red-600 font-semibold" aria-label="required">*</span></label>
                                            <input type="text" value={form.winning_bidder} onChange={(e) => { const value = toLettersOnly(e.target.value); setForm((f) => ({ ...f, winning_bidder: value })); if (newFormErrors.winning_bidder) setNewFormErrors((e2) => ({ ...e2, winning_bidder: '' })); }} className={`input-field ${newFormErrors.winning_bidder ? 'border-2 border-red-500 bg-red-50/50 ring-2 ring-red-200' : ''}`} placeholder="Winning bidder name" aria-invalid={!!newFormErrors.winning_bidder} />
                                            {newFormErrors.winning_bidder && <p className="mt-1.5 flex items-center gap-2 text-sm font-medium text-red-700" role="alert"><MdError className="w-4 h-4 flex-shrink-0" aria-hidden />{newFormErrors.winning_bidder}</p>}
                                        </div>
                                        <div>
                                            <label className="label">Amount <span className="text-red-600 font-semibold" aria-label="required">*</span></label>
                                            <div className="flex items-center border border-[var(--border)] rounded-[var(--radius-sm)] bg-[var(--surface)] overflow-hidden focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
                                                <span className="pl-4 text-[var(--text)] font-medium" aria-hidden="true">₱</span>
                                                <input type="number" step="0.01" min="0" value={form.total_amount} onChange={(e) => { const value = toNumbersOnly(e.target.value); setForm((f) => ({ ...f, total_amount: value })); if (newFormErrors.total_amount) setNewFormErrors((e2) => ({ ...e2, total_amount: '' })); }} className="input-field input-currency border-0 rounded-none focus:ring-0 focus:shadow-none w-full min-w-0" placeholder="0.00" />
                                            </div>
                                            {newFormErrors.total_amount && <p className="mt-1.5 flex items-center gap-2 text-sm font-medium text-red-700" role="alert"><MdError className="w-4 h-4 flex-shrink-0" aria-hidden />{newFormErrors.total_amount}</p>}
                                        </div>
                                        <div>
                                            <label className="label">Options <span className="text-red-600 font-semibold" aria-label="required">*</span></label>
                                            <select value={form.resolution_option} onChange={(e) => { setForm((f) => ({ ...f, resolution_option: e.target.value })); if (newFormErrors.resolution_option) setNewFormErrors((e2) => ({ ...e2, resolution_option: '' })); }} className={`input-field ${newFormErrors.resolution_option ? 'border-2 border-red-500 bg-red-50/50 ring-2 ring-red-200' : ''}`} aria-invalid={!!newFormErrors.resolution_option}>
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
                                            <input type="text" value={form.office_division} onChange={(e) => { const value = toLettersOnly(e.target.value); setForm((f) => ({ ...f, office_division: value })); if (newFormErrors.office_division) setNewFormErrors((e2) => ({ ...e2, office_division: '' })); }} className={`input-field ${newFormErrors.office_division ? 'border-2 border-red-500 bg-red-50/50 ring-2 ring-red-200' : ''}`} placeholder="Office or division" aria-invalid={!!newFormErrors.office_division} />
                                            {newFormErrors.office_division && <p className="mt-1.5 flex items-center gap-2 text-sm font-medium text-red-700" role="alert"><MdError className="w-4 h-4 flex-shrink-0" aria-hidden />{newFormErrors.office_division}</p>}
                                        </div>
                                        <div>
                                            <label className="label">Date of Adoption <span className="text-red-600 font-semibold" aria-label="required">*</span></label>
                                            <input type="date" value={form.date} onChange={(e) => { setForm((f) => ({ ...f, date: e.target.value })); if (newFormErrors.date) setNewFormErrors((e2) => ({ ...e2, date: '' })); }} className={`input-field ${newFormErrors.date ? 'border-2 border-red-500 bg-red-50/50 ring-2 ring-red-200' : ''}`} aria-invalid={!!newFormErrors.date} />
                                            {newFormErrors.date && <p className="mt-1.5 flex items-center gap-2 text-sm font-medium text-red-700" role="alert"><MdError className="w-4 h-4 flex-shrink-0" aria-hidden />{newFormErrors.date}</p>}
                                        </div>
                                        <div>
                                            <label className="label">Venue <span className="text-red-600 font-semibold" aria-label="required">*</span></label>
                                            <input type="text" value={form.venue} onChange={(e) => { const value = toLettersOnly(e.target.value); setForm((f) => ({ ...f, venue: value })); if (newFormErrors.venue) setNewFormErrors((e2) => ({ ...e2, venue: '' })); }} className={`input-field ${newFormErrors.venue ? 'border-2 border-red-500 bg-red-50/50 ring-2 ring-red-200' : ''}`} placeholder="Venue" aria-invalid={!!newFormErrors.venue} />
                                            {newFormErrors.venue && <p className="mt-1.5 flex items-center gap-2 text-sm font-medium text-red-700" role="alert"><MdError className="w-4 h-4 flex-shrink-0" aria-hidden />{newFormErrors.venue}</p>}
                                        </div>
                                        <div>
                                            <label className="label">Upload <span className="text-red-600 font-semibold" aria-label="required">*</span></label>
                                            <div className="flex flex-wrap items-center gap-2">
                                                <input type="file" onChange={(e) => { setForm((f) => ({ ...f, file: e.target.files?.[0] ?? null })); if (newFormErrors.file) setNewFormErrors((e2) => ({ ...e2, file: '' })); }} className={`input-field py-1.5 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-[var(--background-subtle)] file:text-[var(--text)] flex-1 min-w-0 ${newFormErrors.file ? 'border-2 border-red-500 bg-red-50/50 ring-2 ring-red-200' : ''}`} accept=".pdf,.doc,.docx,.xls,.xlsx" aria-invalid={!!newFormErrors.file} />
                                            </div>
                                            {newFormErrors.file && <p className="mt-1.5 flex items-center gap-2 text-sm font-medium text-red-700" role="alert"><MdError className="w-4 h-4 flex-shrink-0" aria-hidden />{newFormErrors.file}</p>}
                                        </div>
                                    </>
                                ) : selectedSubDocType === 'Contract Services/Purchase Order' ? (
                                    <>
                                        <div>
                                            <label className="label">BAC Folder No.</label>
                                            <input type="text" readOnly value={nextTransactionNumber ?? '…'} className="input-field bg-[var(--background-subtle)] cursor-default" aria-readonly="true" />
                                        </div>
                                        <div>
                                            <label className="label">Date <span className="text-red-600 font-semibold" aria-label="required">*</span></label>
                                            <input type="date" value={form.date} onChange={(e) => { setForm((f) => ({ ...f, date: e.target.value })); if (newFormErrors.date) setNewFormErrors((e2) => ({ ...e2, date: '' })); }} className={`input-field ${newFormErrors.date ? 'border-2 border-red-500 bg-red-50/50 ring-2 ring-red-200' : ''}`} aria-invalid={!!newFormErrors.date} />
                                            {newFormErrors.date && <p className="mt-1.5 flex items-center gap-2 text-sm font-medium text-red-700" role="alert"><MdError className="w-4 h-4 flex-shrink-0" aria-hidden />{newFormErrors.date}</p>}
                                        </div>
                                        <div>
                                            <label className="label">Received by COA <span className="text-red-600 font-semibold" aria-label="required">*</span></label>
                                            <select value={form.contract_received_by_coa === true ? 'yes' : form.contract_received_by_coa === false ? 'no' : ''} onChange={(e) => { const v = e.target.value; setForm((f) => ({ ...f, contract_received_by_coa: v === 'yes' ? true : v === 'no' ? false : null })); if (newFormErrors.contract_received_by_coa) setNewFormErrors((e2) => ({ ...e2, contract_received_by_coa: '' })); }} className={`input-field ${newFormErrors.contract_received_by_coa ? 'border-2 border-red-500 bg-red-50/50 ring-2 ring-red-200' : ''}`} aria-invalid={!!newFormErrors.contract_received_by_coa}>
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
                                                <input type="number" step="0.01" min="0" value={form.contract_amount} onChange={(e) => { const value = toNumbersOnly(e.target.value); setForm((f) => ({ ...f, contract_amount: value })); if (newFormErrors.contract_amount) setNewFormErrors((e2) => ({ ...e2, contract_amount: '' })); }} className="input-field input-currency border-0 rounded-none focus:ring-0 focus:shadow-none w-full min-w-0" placeholder="0.00" />
                                            </div>
                                            {newFormErrors.contract_amount && <p className="mt-1.5 flex items-center gap-2 text-sm font-medium text-red-700" role="alert"><MdError className="w-4 h-4 flex-shrink-0" aria-hidden />{newFormErrors.contract_amount}</p>}
                                        </div>
                                        <div>
                                            <label className="label">Notarized (place) <span className="text-red-600 font-semibold" aria-label="required">*</span></label>
                                            <input type="text" value={form.notarized_place} onChange={(e) => { setForm((f) => ({ ...f, notarized_place: e.target.value })); if (newFormErrors.notarized_place) setNewFormErrors((e2) => ({ ...e2, notarized_place: '' })); }} className={`input-field ${newFormErrors.notarized_place ? 'border-2 border-red-500 bg-red-50/50 ring-2 ring-red-200' : ''}`} placeholder="Place of notarization" aria-invalid={!!newFormErrors.notarized_place} />
                                            {newFormErrors.notarized_place && <p className="mt-1.5 flex items-center gap-2 text-sm font-medium text-red-700" role="alert"><MdError className="w-4 h-4 flex-shrink-0" aria-hidden />{newFormErrors.notarized_place}</p>}
                                        </div>
                                        <div>
                                            <label className="label">Notarized (date) <span className="text-red-600 font-semibold" aria-label="required">*</span></label>
                                            <input type="date" value={form.notarized_date} onChange={(e) => { setForm((f) => ({ ...f, notarized_date: e.target.value })); if (newFormErrors.notarized_date) setNewFormErrors((e2) => ({ ...e2, notarized_date: '' })); }} className={`input-field ${newFormErrors.notarized_date ? 'border-2 border-red-500 bg-red-50/50 ring-2 ring-red-200' : ''}`} aria-invalid={!!newFormErrors.notarized_date} />
                                            {newFormErrors.notarized_date && <p className="mt-1.5 flex items-center gap-2 text-sm font-medium text-red-700" role="alert"><MdError className="w-4 h-4 flex-shrink-0" aria-hidden />{newFormErrors.notarized_date}</p>}
                                        </div>
                                        <div>
                                            <label className="label">Upload <span className="text-red-600 font-semibold" aria-label="required">*</span></label>
                                            <div className="flex flex-wrap items-center gap-2">
                                                <input type="file" onChange={(e) => { setForm((f) => ({ ...f, file: e.target.files?.[0] ?? null })); if (newFormErrors.file) setNewFormErrors((e2) => ({ ...e2, file: '' })); }} className={`input-field py-1.5 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-[var(--background-subtle)] file:text-[var(--text)] flex-1 min-w-0 ${newFormErrors.file ? 'border-2 border-red-500 bg-red-50/50 ring-2 ring-red-200' : ''}`} accept=".pdf,.doc,.docx,.xls,.xlsx" aria-invalid={!!newFormErrors.file} />
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
                                            <input type="date" value={form.date} onChange={(e) => { setForm((f) => ({ ...f, date: e.target.value })); if (newFormErrors.date) setNewFormErrors((e2) => ({ ...e2, date: '' })); }} className={`input-field ${newFormErrors.date ? 'border-2 border-red-500 bg-red-50/50 ring-2 ring-red-200' : ''}`} aria-invalid={!!newFormErrors.date} />
                                            {newFormErrors.date && <p className="mt-1.5 flex items-center gap-2 text-sm font-medium text-red-700" role="alert"><MdError className="w-4 h-4 flex-shrink-0" aria-hidden />{newFormErrors.date}</p>}
                                        </div>
                                        <div>
                                            <label className="label">Service Provider <span className="text-red-600 font-semibold" aria-label="required">*</span></label>
                                            <input type="text" value={form.ntp_service_provider} onChange={(e) => { const value = toLettersOnly(e.target.value); setForm((f) => ({ ...f, ntp_service_provider: value })); if (newFormErrors.ntp_service_provider) setNewFormErrors((e2) => ({ ...e2, ntp_service_provider: '' })); }} className={`input-field ${newFormErrors.ntp_service_provider ? 'border-2 border-red-500 bg-red-50/50 ring-2 ring-red-200' : ''}`} placeholder="Service provider name" aria-invalid={!!newFormErrors.ntp_service_provider} />
                                            {newFormErrors.ntp_service_provider && <p className="mt-1.5 flex items-center gap-2 text-sm font-medium text-red-700" role="alert"><MdError className="w-4 h-4 flex-shrink-0" aria-hidden />{newFormErrors.ntp_service_provider}</p>}
                                        </div>
                                        <div>
                                            <label className="label">Authorized Representative/Owner <span className="text-red-600 font-semibold" aria-label="required">*</span></label>
                                            <input type="text" value={form.ntp_authorized_rep} onChange={(e) => { const value = toLettersOnly(e.target.value); setForm((f) => ({ ...f, ntp_authorized_rep: value })); if (newFormErrors.ntp_authorized_rep) setNewFormErrors((e2) => ({ ...e2, ntp_authorized_rep: '' })); }} className={`input-field ${newFormErrors.ntp_authorized_rep ? 'border-2 border-red-500 bg-red-50/50 ring-2 ring-red-200' : ''}`} placeholder="Authorized representative or owner" aria-invalid={!!newFormErrors.ntp_authorized_rep} />
                                            {newFormErrors.ntp_authorized_rep && <p className="mt-1.5 flex items-center gap-2 text-sm font-medium text-red-700" role="alert"><MdError className="w-4 h-4 flex-shrink-0" aria-hidden />{newFormErrors.ntp_authorized_rep}</p>}
                                        </div>
                                        <div>
                                            <label className="label">Received By <span className="text-red-600 font-semibold" aria-label="required">*</span></label>
                                            <input type="text" value={form.ntp_received_by} onChange={(e) => { const value = toLettersOnly(e.target.value); setForm((f) => ({ ...f, ntp_received_by: value })); if (newFormErrors.ntp_received_by) setNewFormErrors((e2) => ({ ...e2, ntp_received_by: '' })); }} className={`input-field ${newFormErrors.ntp_received_by ? 'border-2 border-red-500 bg-red-50/50 ring-2 ring-red-200' : ''}`} placeholder="Received by" aria-invalid={!!newFormErrors.ntp_received_by} />
                                            {newFormErrors.ntp_received_by && <p className="mt-1.5 flex items-center gap-2 text-sm font-medium text-red-700" role="alert"><MdError className="w-4 h-4 flex-shrink-0" aria-hidden />{newFormErrors.ntp_received_by}</p>}
                                        </div>
                                        <div>
                                            <label className="label">Upload <span className="text-red-600 font-semibold" aria-label="required">*</span></label>
                                            <div className="flex flex-wrap items-center gap-2">
                                                <input type="file" onChange={(e) => { setForm((f) => ({ ...f, file: e.target.files?.[0] ?? null })); if (newFormErrors.file) setNewFormErrors((e2) => ({ ...e2, file: '' })); }} className={`input-field py-1.5 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-[var(--background-subtle)] file:text-[var(--text)] flex-1 min-w-0 ${newFormErrors.file ? 'border-2 border-red-500 bg-red-50/50 ring-2 ring-red-200' : ''}`} accept=".pdf,.doc,.docx,.xls,.xlsx" aria-invalid={!!newFormErrors.file} />
                                            </div>
                                            {newFormErrors.file && <p className="mt-1.5 flex items-center gap-2 text-sm font-medium text-red-700" role="alert"><MdError className="w-4 h-4 flex-shrink-0" aria-hidden />{newFormErrors.file}</p>}
                                        </div>
                                    </>
                                ) : selectedSubDocType === 'OSS' ? (
                                    <>
                                        <div>
                                            <label className="label">BAC Folder No.</label>
                                            <input type="text" readOnly value={nextTransactionNumber ?? '…'} className="input-field bg-[var(--background-subtle)] cursor-default" aria-readonly="true" />
                                        </div>
                                        <div>
                                            <label className="label">Service Provider <span className="text-red-600 font-semibold" aria-label="required">*</span></label>
                                            <input type="text" value={form.oss_service_provider} onChange={(e) => { const value = toLettersOnly(e.target.value); setForm((f) => ({ ...f, oss_service_provider: value })); if (newFormErrors.oss_service_provider) setNewFormErrors((e2) => ({ ...e2, oss_service_provider: '' })); }} className={`input-field ${newFormErrors.oss_service_provider ? 'border-2 border-red-500 bg-red-50/50 ring-2 ring-red-200' : ''}`} placeholder="Service provider name" aria-invalid={!!newFormErrors.oss_service_provider} />
                                            {newFormErrors.oss_service_provider && <p className="mt-1.5 flex items-center gap-2 text-sm font-medium text-red-700" role="alert"><MdError className="w-4 h-4 flex-shrink-0" aria-hidden />{newFormErrors.oss_service_provider}</p>}
                                        </div>
                                        <div>
                                            <label className="label">Authorized Representative/Owner <span className="text-red-600 font-semibold" aria-label="required">*</span></label>
                                            <input type="text" value={form.oss_authorized_rep} onChange={(e) => { const value = toLettersOnly(e.target.value); setForm((f) => ({ ...f, oss_authorized_rep: value })); if (newFormErrors.oss_authorized_rep) setNewFormErrors((e2) => ({ ...e2, oss_authorized_rep: '' })); }} className={`input-field ${newFormErrors.oss_authorized_rep ? 'border-2 border-red-500 bg-red-50/50 ring-2 ring-red-200' : ''}`} placeholder="Authorized representative or owner" aria-invalid={!!newFormErrors.oss_authorized_rep} />
                                            {newFormErrors.oss_authorized_rep && <p className="mt-1.5 flex items-center gap-2 text-sm font-medium text-red-700" role="alert"><MdError className="w-4 h-4 flex-shrink-0" aria-hidden />{newFormErrors.oss_authorized_rep}</p>}
                                        </div>
                                        <div>
                                            <label className="label">Date <span className="text-red-600 font-semibold" aria-label="required">*</span></label>
                                            <input type="date" value={form.date} onChange={(e) => { setForm((f) => ({ ...f, date: e.target.value })); if (newFormErrors.date) setNewFormErrors((e2) => ({ ...e2, date: '' })); }} className={`input-field ${newFormErrors.date ? 'border-2 border-red-500 bg-red-50/50 ring-2 ring-red-200' : ''}`} aria-invalid={!!newFormErrors.date} />
                                            {newFormErrors.date && <p className="mt-1.5 flex items-center gap-2 text-sm font-medium text-red-700" role="alert"><MdError className="w-4 h-4 flex-shrink-0" aria-hidden />{newFormErrors.date}</p>}
                                        </div>
                                        <div>
                                            <label className="label">Upload <span className="text-red-600 font-semibold" aria-label="required">*</span></label>
                                            <div className="flex flex-wrap items-center gap-2">
                                                <input type="file" onChange={(e) => { setForm((f) => ({ ...f, file: e.target.files?.[0] ?? null })); if (newFormErrors.file) setNewFormErrors((e2) => ({ ...e2, file: '' })); }} className={`input-field py-1.5 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-[var(--background-subtle)] file:text-[var(--text)] flex-1 min-w-0 ${newFormErrors.file ? 'border-2 border-red-500 bg-red-50/50 ring-2 ring-red-200' : ''}`} accept=".pdf,.doc,.docx,.xls,.xlsx" aria-invalid={!!newFormErrors.file} />
                                            </div>
                                            {newFormErrors.file && <p className="mt-1.5 flex items-center gap-2 text-sm font-medium text-red-700" role="alert"><MdError className="w-4 h-4 flex-shrink-0" aria-hidden />{newFormErrors.file}</p>}
                                        </div>
                                    </>
                                ) : selectedSubDocType === "Applicable: Secretary's Certificate and Special Power of Attorney" ? (
                                    <>
                                        <div>
                                            <label className="label">BAC Folder No.</label>
                                            <input type="text" readOnly value={nextTransactionNumber ?? '…'} className="input-field bg-[var(--background-subtle)] cursor-default" aria-readonly="true" />
                                        </div>
                                        <div>
                                            <label className="label">Service Provider <span className="text-red-600 font-semibold" aria-label="required">*</span></label>
                                            <input type="text" value={form.secretary_service_provider} onChange={(e) => { const value = toLettersOnly(e.target.value); setForm((f) => ({ ...f, secretary_service_provider: value })); if (newFormErrors.secretary_service_provider) setNewFormErrors((e2) => ({ ...e2, secretary_service_provider: '' })); }} className={`input-field ${newFormErrors.secretary_service_provider ? 'border-2 border-red-500 bg-red-50/50 ring-2 ring-red-200' : ''}`} placeholder="Service provider name" aria-invalid={!!newFormErrors.secretary_service_provider} />
                                            {newFormErrors.secretary_service_provider && <p className="mt-1.5 flex items-center gap-2 text-sm font-medium text-red-700" role="alert"><MdError className="w-4 h-4 flex-shrink-0" aria-hidden />{newFormErrors.secretary_service_provider}</p>}
                                        </div>
                                        <div>
                                            <label className="label">Owner/Authorized Representative <span className="text-red-600 font-semibold" aria-label="required">*</span></label>
                                            <input type="text" value={form.secretary_owner_rep} onChange={(e) => { const value = toLettersOnly(e.target.value); setForm((f) => ({ ...f, secretary_owner_rep: value })); if (newFormErrors.secretary_owner_rep) setNewFormErrors((e2) => ({ ...e2, secretary_owner_rep: '' })); }} className={`input-field ${newFormErrors.secretary_owner_rep ? 'border-2 border-red-500 bg-red-50/50 ring-2 ring-red-200' : ''}`} placeholder="Owner or authorized representative" aria-invalid={!!newFormErrors.secretary_owner_rep} />
                                            {newFormErrors.secretary_owner_rep && <p className="mt-1.5 flex items-center gap-2 text-sm font-medium text-red-700" role="alert"><MdError className="w-4 h-4 flex-shrink-0" aria-hidden />{newFormErrors.secretary_owner_rep}</p>}
                                        </div>
                                        <div>
                                            <label className="label">Date <span className="text-red-600 font-semibold" aria-label="required">*</span></label>
                                            <input type="date" value={form.date} onChange={(e) => { setForm((f) => ({ ...f, date: e.target.value })); if (newFormErrors.date) setNewFormErrors((e2) => ({ ...e2, date: '' })); }} className={`input-field ${newFormErrors.date ? 'border-2 border-red-500 bg-red-50/50 ring-2 ring-red-200' : ''}`} aria-invalid={!!newFormErrors.date} />
                                            {newFormErrors.date && <p className="mt-1.5 flex items-center gap-2 text-sm font-medium text-red-700" role="alert"><MdError className="w-4 h-4 flex-shrink-0" aria-hidden />{newFormErrors.date}</p>}
                                        </div>
                                        <div>
                                            <label className="label">Upload <span className="text-red-600 font-semibold" aria-label="required">*</span></label>
                                            <div className="flex flex-wrap items-center gap-2">
                                                <input type="file" onChange={(e) => { setForm((f) => ({ ...f, file: e.target.files?.[0] ?? null })); if (newFormErrors.file) setNewFormErrors((e2) => ({ ...e2, file: '' })); }} className={`input-field py-1.5 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-[var(--background-subtle)] file:text-[var(--text)] flex-1 min-w-0 ${newFormErrors.file ? 'border-2 border-red-500 bg-red-50/50 ring-2 ring-red-200' : ''}`} accept=".pdf,.doc,.docx,.xls,.xlsx" aria-invalid={!!newFormErrors.file} />
                                            </div>
                                            {newFormErrors.file && <p className="mt-1.5 flex items-center gap-2 text-sm font-medium text-red-700" role="alert"><MdError className="w-4 h-4 flex-shrink-0" aria-hidden />{newFormErrors.file}</p>}
                                        </div>
                                    </>
                                ) : selectedSubDocType === 'PhilGEPS Posting of Award' ? (
                                    <>
                                        <div>
                                            <label className="label">BAC Folder No.</label>
                                            <input type="text" readOnly value={nextTransactionNumber ?? '…'} className="input-field bg-[var(--background-subtle)] cursor-default" aria-readonly="true" />
                                        </div>
                                        <div>
                                            <label className="label">Date <span className="text-red-600 font-semibold" aria-label="required">*</span></label>
                                            <input type="date" value={form.date} onChange={(e) => { setForm((f) => ({ ...f, date: e.target.value })); if (newFormErrors.date) setNewFormErrors((e2) => ({ ...e2, date: '' })); }} className={`input-field ${newFormErrors.date ? 'border-2 border-red-500 bg-red-50/50 ring-2 ring-red-200' : ''}`} aria-invalid={!!newFormErrors.date} />
                                            {newFormErrors.date && <p className="mt-1.5 flex items-center gap-2 text-sm font-medium text-red-700" role="alert"><MdError className="w-4 h-4 flex-shrink-0" aria-hidden />{newFormErrors.date}</p>}
                                        </div>
                                        <div>
                                            <label className="label">Upload <span className="text-red-600 font-semibold" aria-label="required">*</span></label>
                                            <div className="flex flex-wrap items-center gap-2">
                                                <input type="file" onChange={(e) => { setForm((f) => ({ ...f, file: e.target.files?.[0] ?? null })); if (newFormErrors.file) setNewFormErrors((e2) => ({ ...e2, file: '' })); }} className={`input-field py-1.5 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-[var(--background-subtle)] file:text-[var(--text)] flex-1 min-w-0 ${newFormErrors.file ? 'border-2 border-red-500 bg-red-50/50 ring-2 ring-red-200' : ''}`} accept=".pdf,.doc,.docx,.xls,.xlsx" aria-invalid={!!newFormErrors.file} />
                                            </div>
                                            {newFormErrors.file && <p className="mt-1.5 flex items-center gap-2 text-sm font-medium text-red-700" role="alert"><MdError className="w-4 h-4 flex-shrink-0" aria-hidden />{newFormErrors.file}</p>}
                                        </div>
                                    </>
                                ) : selectedSubDocType === 'Certificate of DILG R1 Website Posting of Award' ? (
                                    <>
                                        <div>
                                            <label className="label">BAC Folder No.</label>
                                            <input type="text" readOnly value={nextTransactionNumber ?? '…'} className="input-field bg-[var(--background-subtle)] cursor-default" aria-readonly="true" />
                                        </div>
                                        <div>
                                            <label className="label">Date <span className="text-red-600 font-semibold" aria-label="required">*</span></label>
                                            <input type="date" value={form.date} onChange={(e) => { setForm((f) => ({ ...f, date: e.target.value })); if (newFormErrors.date) setNewFormErrors((e2) => ({ ...e2, date: '' })); }} className={`input-field ${newFormErrors.date ? 'border-2 border-red-500 bg-red-50/50 ring-2 ring-red-200' : ''}`} aria-invalid={!!newFormErrors.date} />
                                            {newFormErrors.date && <p className="mt-1.5 flex items-center gap-2 text-sm font-medium text-red-700" role="alert"><MdError className="w-4 h-4 flex-shrink-0" aria-hidden />{newFormErrors.date}</p>}
                                        </div>
                                        <div>
                                            <label className="label">Upload <span className="text-red-600 font-semibold" aria-label="required">*</span></label>
                                            <div className="flex flex-wrap items-center gap-2">
                                                <input type="file" onChange={(e) => { setForm((f) => ({ ...f, file: e.target.files?.[0] ?? null })); if (newFormErrors.file) setNewFormErrors((e2) => ({ ...e2, file: '' })); }} className={`input-field py-1.5 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-[var(--background-subtle)] file:text-[var(--text)] flex-1 min-w-0 ${newFormErrors.file ? 'border-2 border-red-500 bg-red-50/50 ring-2 ring-red-200' : ''}`} accept=".pdf,.doc,.docx,.xls,.xlsx" aria-invalid={!!newFormErrors.file} />
                                            </div>
                                            {newFormErrors.file && <p className="mt-1.5 flex items-center gap-2 text-sm font-medium text-red-700" role="alert"><MdError className="w-4 h-4 flex-shrink-0" aria-hidden />{newFormErrors.file}</p>}
                                        </div>
                                    </>
                                ) : selectedSubDocType === 'Notice of Award (Posted)' || selectedSubDocType === 'Abstract of Quotation (Posted)' || selectedSubDocType === 'BAC Resolution (Posted)' ? (
                                    <>
                                        <div>
                                            <label className="label">BAC Folder No.</label>
                                            <input type="text" readOnly value={nextTransactionNumber ?? '…'} className="input-field bg-[var(--background-subtle)] cursor-default" aria-readonly="true" />
                                        </div>
                                        <div>
                                            <label className="label">Date <span className="text-red-600 font-semibold" aria-label="required">*</span></label>
                                            <input type="date" value={form.date} onChange={(e) => { setForm((f) => ({ ...f, date: e.target.value })); if (newFormErrors.date) setNewFormErrors((e2) => ({ ...e2, date: '' })); }} className={`input-field ${newFormErrors.date ? 'border-2 border-red-500 bg-red-50/50 ring-2 ring-red-200' : ''}`} aria-invalid={!!newFormErrors.date} />
                                            {newFormErrors.date && <p className="mt-1.5 flex items-center gap-2 text-sm font-medium text-red-700" role="alert"><MdError className="w-4 h-4 flex-shrink-0" aria-hidden />{newFormErrors.date}</p>}
                                        </div>
                                    </>
                                ) : selectedSubDocType === 'Lease of Venue: Table Rating Factor' ? (
                                    <>
                                        <div className="text-sm text-[var(--text-muted)]">
                                            No file is required for Lease of Venue. Click <span className="font-semibold text-[var(--text)]">Submit</span> below to save; the document will be marked complete.
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
                                        <div>
                                            <label className="label">Title <span className="text-red-600 font-semibold" aria-label="required">*</span></label>
                                            <input
                                                type="text"
                                                value={form.title}
                                                onChange={(e) => {
                                                    const value = toLettersOnly(e.target.value);
                                                    setForm((f) => ({ ...f, title: value }));
                                                    if (newFormErrors.title) setNewFormErrors((e2) => ({ ...e2, title: '' }));
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
                                            <label className="label">Date</label>
                                            <input
                                                type="date"
                                                value={form.date}
                                                onChange={(e) => {
                                                    setForm((f) => ({ ...f, date: e.target.value }));
                                                    if (newFormErrors.date) setNewFormErrors((e2) => ({ ...e2, date: '' }));
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
                                            <label className="label">File</label>
                                            <div className="flex flex-wrap items-center gap-2">
                                                <input
                                                    type="file"
                                                    onChange={(e) => {
                                                        setForm((f) => ({ ...f, file: e.target.files?.[0] ?? null }));
                                                        if (newFormErrors.file) setNewFormErrors((e2) => ({ ...e2, file: '' }));
                                                    }}
                                                    className={`input-field py-1.5 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-[var(--background-subtle)] file:text-[var(--text)] flex-1 min-w-0 ${newFormErrors.file ? 'border-2 border-red-500 bg-red-50/50 ring-2 ring-red-200' : ''}`}
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
                                )}
                                <div className="flex justify-between gap-3 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setNewStep('subDoc')}
                                        className="text-sm text-[var(--primary)] hover:text-[var(--primary-hover)] hover:underline font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-1 rounded px-2 py-1"
                                    >
                                        ← Back
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
                                        className="p-2 rounded-lg text-[var(--text-muted)] hover:bg-[var(--background-subtle)] hover:text-[var(--text)] shrink-0"
                                        aria-label="Back"
                                    >
                                        <MdExpandLess className="w-5 h-5 rotate-90" />
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
                                            <p className="text-sm text-[var(--text-muted)] mb-4">Click a BAC Folder to see all documents in a popup.</p>
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
                const showNav = totalDocs > 1;
                return (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" aria-modal="true" role="dialog">
                        <div className="bg-[var(--surface)] rounded-2xl shadow-2xl border border-[var(--border)] max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                            <div className="p-4 border-b border-[var(--border)] flex items-center justify-between shrink-0">
                                <h3 className="text-base font-semibold text-[var(--text)]">BAC Folder No. {manageFolderPopup.prNo}</h3>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setManageFolderPopup(null);
                                    }}
                                    className="p-2 text-[var(--text-muted)] hover:bg-[var(--background-subtle)] rounded-lg"
                                    aria-label="Close"
                                >
                                    <MdClose className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="flex-1 overflow-hidden flex flex-col min-h-0">
                                {totalDocs === 0 ? (
                                    <div className="p-6 text-center text-[var(--text-muted)]">No documents in this folder.</div>
                                ) : (
                                    <>
                                        {showNav && (
                                            <div className="px-4 py-2 border-b border-[var(--border)] flex items-center justify-center gap-3 shrink-0">
                                                <button
                                                    type="button"
                                                    onClick={() => setManageFolderPopupIndex((i) => Math.max(0, i - 1))}
                                                    disabled={currentIndex === 0}
                                                    className="p-2 rounded-lg border border-[var(--border)] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[var(--background-subtle)]"
                                                    aria-label="Previous"
                                                >
                                                    <MdChevronLeft className="w-5 h-5" />
                                                </button>
                                                <span className="text-sm text-[var(--text-muted)]">
                                                    Page {currentIndex + 1} of {totalDocs}
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => setManageFolderPopupIndex((i) => Math.min(totalDocs - 1, i + 1))}
                                                    disabled={currentIndex >= totalDocs - 1}
                                                    className="p-2 rounded-lg border border-[var(--border)] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[var(--background-subtle)]"
                                                    aria-label="Next"
                                                >
                                                    <MdChevronRight className="w-5 h-5" />
                                                </button>
                                            </div>
                                        )}
                                        <div className="flex-1 overflow-auto bg-gray-100 p-4 min-h-0 flex flex-col">
                                            {!manageFolderPopupPreview ? (
                                                <div className="flex flex-col items-center justify-center flex-1 min-h-[480px] text-[var(--text-muted)] rounded-lg border border-[var(--border)] bg-white">
                                                    <div className="w-10 h-10 rounded-full border-2 border-[var(--border)] border-t-[var(--primary)] animate-spin mb-3" aria-hidden />
                                                    <span>Loading…</span>
                                                </div>
                                            ) : manageFolderPopupPreview.previewBlobUrl === 'no-file' ? (
                                                <div className="flex flex-col items-center justify-center flex-1 min-h-[480px] text-[var(--text-muted)] rounded-lg border border-[var(--border)] bg-white">
                                                    <p className="font-medium">No file</p>
                                                    <p className="text-sm mt-1">This document has no file uploaded.</p>
                                                </div>
                                            ) : manageFolderPopupPreview.previewBlobUrl === 'failed' ? (
                                                <div className="flex flex-col items-center justify-center flex-1 min-h-[480px] text-[var(--text-muted)] rounded-lg border border-[var(--border)] bg-white">
                                                    <p>Could not load file.</p>
                                                </div>
                                            ) : manageFolderPopupPreview.previewBlobUrl ? (
                                                (() => {
                                                    const ct = manageFolderPopupPreview.previewBlobType || '';
                                                    const isPdf = ct.includes('pdf');
                                                    const isImage = /^image\//.test(ct);
                                                    const previewBoxClass = 'w-full min-h-[480px] flex-1 rounded-lg border border-[var(--border)] bg-white overflow-hidden flex flex-col';
                                                    if (isPdf) {
                                                        return (
                                                            <div className={previewBoxClass}>
                                                                <embed
                                                                    src={`${manageFolderPopupPreview.previewBlobUrl}#toolbar=0&navpanes=0`}
                                                                    type="application/pdf"
                                                                    className="w-full min-h-[480px] flex-1 border-0"
                                                                    title={manageFolderPopupPreview.doc?.title || 'Document'}
                                                                />
                                                            </div>
                                                        );
                                                    }
                                                    if (isImage) {
                                                        return (
                                                            <div className={`${previewBoxClass} items-center justify-center`}>
                                                                <img
                                                                    src={manageFolderPopupPreview.previewBlobUrl}
                                                                    alt={manageFolderPopupPreview.doc?.title || 'Document'}
                                                                    className="max-w-full max-h-[70vh] object-contain"
                                                                />
                                                            </div>
                                                        );
                                                    }
                                                    return (
                                                        <div className={previewBoxClass}>
                                                            <iframe
                                                                src={manageFolderPopupPreview.previewBlobUrl}
                                                                title={manageFolderPopupPreview.doc?.title || 'Document'}
                                                                className="w-full min-h-[480px] flex-1 border-0"
                                                                sandbox="allow-same-origin"
                                                            />
                                                        </div>
                                                    );
                                                })()
                                            ) : (
                                                <div className="flex flex-col items-center justify-center flex-1 min-h-[480px] text-[var(--text-muted)] rounded-lg border border-[var(--border)] bg-white">
                                                    <div className="w-10 h-10 rounded-full border-2 border-[var(--border)] border-t-[var(--primary)] animate-spin mb-3" aria-hidden />
                                                    <span>Loading file…</span>
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
                                        {checklistData.map((docType) => {
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
            {activeModal === 'update' && selectedDoc && !confirmDialog && (
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
                                                type="number"
                                                step="0.01"
                                                min="0"
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
                                            <input type="number" step="0.01" min="0" value={form.total_amount} onChange={(e) => setForm((f) => ({ ...f, total_amount: toNumbersOnly(e.target.value) }))} className="input-field input-currency border-0 rounded-none focus:ring-0 focus:shadow-none w-full min-w-0" placeholder="0.00" />
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
                                            <input type="number" step="0.01" min="0" value={form.contract_amount} onChange={(e) => setForm((f) => ({ ...f, contract_amount: toNumbersOnly(e.target.value) }))} className="input-field input-currency border-0 rounded-none focus:ring-0 focus:shadow-none w-full min-w-0" placeholder="0.00" />
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
                                        <input type="file" onChange={(e) => setForm((f) => ({ ...f, file: e.target.files?.[0] ?? null }))} className="input-field py-1.5 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-[var(--background-subtle)] file:text-[var(--text)] w-full" accept=".pdf,.doc,.docx,.xls,.xlsx" />
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
                                        <input type="file" onChange={(e) => setForm((f) => ({ ...f, file: e.target.files?.[0] ?? null }))} className="input-field py-1.5 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-[var(--background-subtle)] file:text-[var(--text)] w-full" accept=".pdf,.doc,.docx,.xls,.xlsx" />
                                    </div>
                                </>
                            ) : selectedDoc?.subDoc === 'Notice of Award (Posted)' || selectedDoc?.subDoc === 'Abstract of Quotation (Posted)' || selectedDoc?.subDoc === 'BAC Resolution (Posted)' ? (
                                <>
                                    <div>
                                        <label className="label">BAC Folder No.</label>
                                        <input type="text" readOnly value={form.prNo} className="input-field bg-[var(--background-subtle)] cursor-default" aria-readonly="true" />
                                    </div>
                                    <div>
                                        <label className="label">Date</label>
                                        <input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} className="input-field" />
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
                                        className="input-field py-1.5 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-[var(--background-subtle)] file:text-[var(--text)] flex-1 min-w-0"
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
