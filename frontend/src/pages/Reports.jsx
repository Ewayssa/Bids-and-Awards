import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import ExcelJS from 'exceljs';
import { reportService } from '../services/api';
import { ROLES } from '../utils/roles';
import { MdUpload, MdClose, MdDownload, MdChevronLeft, MdChevronRight, MdAdd, MdDelete } from 'react-icons/md';
import PageHeader from '../components/PageHeader';

const TABLE_PAGE_SIZE = 10;

// Column keys, labels, and types for encode/export (procurement monitoring report)
const SOURCE_OF_FUNDS_OPTIONS = [
    'Government of the Philippines (current year\'s budget)',
    'Prior Years\' Appropriation',
    'Other (specify in remarks)',
];

const REPORT_COLUMNS = [
    { key: 'code_pap', label: 'Code (PAP)', type: 'text', shortLabel: 'Code (PAP)' },
    { key: 'procurement_project', label: 'Procurement Project', type: 'text', shortLabel: 'Procurement Project' },
    { key: 'pmo_end_user', label: 'PMO/End-User', type: 'text', shortLabel: 'PMO/End-User' },
    { key: 'early_procurement', label: 'Is this an Early Procurement Activity?', type: 'select', options: ['Yes', 'No'], shortLabel: 'Early Procurement?' },
    { key: 'mode_of_procurement', label: 'Mode of Procurement', type: 'text', shortLabel: 'Mode of Procurement' },
    { key: 'pre_proc_conference', label: 'Pre-Proc Conference', type: 'date', shortLabel: 'Pre-Proc Conference' },
    { key: 'ads_post_ib', label: 'Ads/Post of IB', type: 'date', shortLabel: 'Ads/Post of IB' },
    { key: 'pre_bid_conf', label: 'Pre-bid Conf', type: 'date', shortLabel: 'Pre-bid Conf' },
    { key: 'eligibility_check', label: 'Eligibility Check', type: 'date', shortLabel: 'Eligibility Check' },
    { key: 'sub_open_bids', label: 'Sub/Open of Bids', type: 'date', shortLabel: 'Sub/Open of Bids' },
    { key: 'bid_evaluation', label: 'Bid Evaluation', type: 'date', shortLabel: 'Bid Evaluation' },
    { key: 'post_qual', label: 'Post Qual', type: 'date', shortLabel: 'Post Qual' },
    { key: 'bac_resolution_date', label: 'Date of BAC Resolution Recommending Award', type: 'date', shortLabel: 'Date of BAC Resolution Recommending Award' },
    { key: 'notice_of_award', label: 'Notice of Award', type: 'date', shortLabel: 'Notice of Award' },
    { key: 'contract_signing', label: 'Contract Signing', type: 'date', shortLabel: 'Contract Signing' },
    { key: 'notice_to_proceed', label: 'Notice to Proceed', type: 'date', shortLabel: 'Notice to Proceed' },
    { key: 'delivery_completion', label: 'Delivery/Completion', type: 'date', shortLabel: 'Delivery/Completion' },
    { key: 'inspection_acceptance', label: 'Inspection & Acceptance', type: 'date', shortLabel: 'Inspection & Acceptance' },
    { key: 'source_of_funds', label: 'Source of Funds', type: 'select', options: SOURCE_OF_FUNDS_OPTIONS, shortLabel: 'Source of Funds' },
    { key: 'abc_total', label: 'ABC (PhP) - Total', type: 'number', shortLabel: 'Total' },
    { key: 'abc_mooe', label: 'ABC (PhP) - MOOE', type: 'number', shortLabel: 'MOOE' },
    { key: 'abc_co', label: 'ABC (PhP) - CO', type: 'number', shortLabel: 'CO' },
    { key: 'contract_cost_total', label: 'Contract Cost (PhP) - Total', type: 'number', shortLabel: 'Total' },
    { key: 'contract_cost_mooe', label: 'Contract Cost (PhP) - MOOE', type: 'number', shortLabel: 'MOOE' },
    { key: 'contract_cost_co', label: 'Contract Cost (PhP) - CO', type: 'number', shortLabel: 'CO' },
    { key: 'remarks', label: 'Remarks (Explaining changes from the APP)', type: 'text', shortLabel: 'Remarks (Explaining changes from the APP)' },
];

// Two-tier header: group label in row 1, sub-labels in row 2 (for groups with multiple columns)
const HEADER_GROUPS = [
    { groupLabel: 'Code (PAP)', colKeys: ['code_pap'] },
    { groupLabel: 'Procurement Project', colKeys: ['procurement_project'] },
    { groupLabel: 'PMO/End-User', colKeys: ['pmo_end_user'] },
    { groupLabel: 'Is this an Early Procurement Activity?', colKeys: ['early_procurement'] },
    { groupLabel: 'Mode of Procurement', colKeys: ['mode_of_procurement'] },
    { groupLabel: 'Actual Procurement Activities (DD-MM-YYYY)', colKeys: ['pre_proc_conference', 'ads_post_ib', 'pre_bid_conf', 'eligibility_check', 'sub_open_bids', 'bid_evaluation', 'post_qual', 'bac_resolution_date'] },
    { groupLabel: 'Notice of Award', colKeys: ['notice_of_award'] },
    { groupLabel: 'Contract Signing', colKeys: ['contract_signing'] },
    { groupLabel: 'Notice to Proceed', colKeys: ['notice_to_proceed'] },
    { groupLabel: 'Delivery/Completion', colKeys: ['delivery_completion'] },
    { groupLabel: 'Inspection & Acceptance', colKeys: ['inspection_acceptance'] },
    { groupLabel: 'Source of Funds', colKeys: ['source_of_funds'] },
    { groupLabel: 'ABC (PhP)', colKeys: ['abc_total', 'abc_mooe', 'abc_co'] },
    { groupLabel: 'Contract Cost (PhP)', colKeys: ['contract_cost_total', 'contract_cost_mooe', 'contract_cost_co'] },
    { groupLabel: 'Remarks (Explaining changes from the APP)', colKeys: ['remarks'] },
];

const DATE_MIN = '2000-01-01';
const DATE_MAX = '2060-12-31';

const emptyEncodedRow = () => REPORT_COLUMNS.reduce((acc, { key }) => ({ ...acc, [key]: '' }), {});

const STORAGE_KEY_ENCODED_REPORT = 'bac_reports_encoded_rows';

const Reports = ({ user }) => {
    const isAdmin = user?.role === ROLES.ADMIN;
    const currentEncoderId = user?.username || user?.fullName || '';
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [uploadModalOpen, setUploadModalOpen] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [uploadError, setUploadError] = useState('');
    const [uploadSuccess, setUploadSuccess] = useState('');
    const [form, setForm] = useState({
        title: '',
        submitting_office: '',
        file: null,
    });
    const [confirmUpload, setConfirmUpload] = useState(null); // { onConfirm }
    const [previewReport, setPreviewReport] = useState(null); // same as Encode: { title, file_url, previewBlobUrl, previewBlobType }
    const [filters, setFilters] = useState({
        date_from: '',
        date_to: '',
    });
    const [tablePage, setTablePage] = useState(1);
    const [encodedRows, setEncodedRows] = useState(() => {
        try {
            const raw = localStorage.getItem(STORAGE_KEY_ENCODED_REPORT);
            if (!raw) return [];
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return [];
        }
    });
    const [encodeModalOpen, setEncodeModalOpen] = useState(false);

    const load = async () => {
        try {
            const data = await reportService.getAll();
            const list = Array.isArray(data) ? data : (data?.results ?? []);
            const sorted = [...list].sort((a, b) => (new Date(b.uploaded_at || 0).getTime() - new Date(a.uploaded_at || 0).getTime()));
            setReports(sorted);
        } catch (e) {
            setReports([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, []);

    useEffect(() => {
        try {
            if (encodedRows.length) localStorage.setItem(STORAGE_KEY_ENCODED_REPORT, JSON.stringify(encodedRows));
            else localStorage.removeItem(STORAGE_KEY_ENCODED_REPORT);
        } catch (_) {}
    }, [encodedRows]);

    const formatDate = (d, { forFilter = false } = {}) => {
        if (!d) return forFilter ? '' : '—';
        const dateObj = typeof d === 'string' ? new Date(d) : d instanceof Date ? d : new Date(String(d));
        if (Number.isNaN(dateObj.getTime())) return forFilter ? '' : '—';
        const year = dateObj.getFullYear();
        const month = String(dateObj.getMonth() + 1).padStart(2, '0');
        const day = String(dateObj.getDate()).padStart(2, '0');
        const isoDate = `${year}-${month}-${day}`;
        return isoDate;
    };

    const filteredReports = useMemo(() => {
        return reports.filter((r) => {
            const dateStr = formatDate(r.uploaded_at, { forFilter: true });
            if (!dateStr) return false;
            if (filters.date_from && dateStr < filters.date_from) return false;
            if (filters.date_to && dateStr > filters.date_to) return false;
            return true;
        });
    }, [reports, filters]);

    const totalPages = Math.max(1, Math.ceil(filteredReports.length / TABLE_PAGE_SIZE));
    const paginatedReports = useMemo(() => {
        const start = (tablePage - 1) * TABLE_PAGE_SIZE;
        return filteredReports.slice(start, start + TABLE_PAGE_SIZE);
    }, [filteredReports, tablePage]);

    useEffect(() => {
        setTablePage(1);
    }, [filteredReports.length]);

    const hasActiveFilters = !!(filters.date_from || filters.date_to);
    const clearFilters = () => setFilters({ date_from: '', date_to: '' });

    const toDDMMYYYY = (val) => {
        if (val == null || val === '') return '';
        const d = typeof val === 'string' ? new Date(val) : val;
        if (Number.isNaN(d.getTime())) return String(val);
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        return `${day}-${month}-${year}`;
    };

    const formatNumberDisplay = (val) => {
        if (val == null || val === '') return '';
        const n = Number(val);
        if (Number.isNaN(n)) return '';
        return '₱' + n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    const formatNumberAsYouType = (rawStr) => {
        if (rawStr == null || rawStr === '') return '';
        const s = String(rawStr).replace(/[^0-9.]/g, ''); // allow digits and decimal point (tuldok)
        const parts = s.split('.');
        const intPart = parts[0] || '0';
        const decPart = parts.length > 1 ? parts[1].slice(0, 2) : ''; // up to 2 decimal places
        const withCommas = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        return '₱' + withCommas + (decPart ? '.' + decPart : '');
    };

    const sanitizeNumberInput = (str) => {
        if (str == null) return '';
        const s = String(str).replace(/[^0-9.]/g, ''); // numbers and tuldok (.) only
        const parts = s.split('.');
        if (parts.length > 2) return parts[0] + '.' + parts.slice(1).join('');
        return s;
    };

    const validateDateRange = (val) => {
        if (val == null || val === '') return true;
        const d = new Date(val);
        if (Number.isNaN(d.getTime())) return false;
        const min = new Date(DATE_MIN);
        const max = new Date(DATE_MAX);
        return d >= min && d <= max;
    };

    const handleExportExcel = async () => {
        const hasEncoded = encodedRows.length > 0;
        const hasUploaded = filteredReports.length > 0;
        if (!hasEncoded && !hasUploaded) return;

        const today = new Date();
        const reportDateLabel = today.toLocaleDateString('en-PH', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
        const reportDateUpper = reportDateLabel.toUpperCase();
        const totalCols = REPORT_COLUMNS.length;

        const workbook = new ExcelJS.Workbook();
        const ws = workbook.addWorksheet('Monitoring Report', { views: [{ state: 'frozen', ySplit: 7 }] });

        const makeFill = (argb) => ({
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb },
            bgColor: { argb },
        });
        const borderThin = { style: 'thin', color: { argb: 'FF000000' } };
        const borderAll = { top: borderThin, left: borderThin, bottom: borderThin, right: borderThin };

        let rowNum = 1;

        // Row 1: DILG (left) | Procurement Monitoring Report (centered)
        ws.getCell(rowNum, 1).value = 'DEPARTMENT OF THE INTERIOR AND LOCAL GOVERNMENT - REGION 1';
        ws.getCell(rowNum, 1).font = { bold: true };
        ws.getCell(rowNum, 1).fill = makeFill('FFFFFFFF');
        ws.getCell(rowNum, 1).alignment = { horizontal: 'left' };
        ws.getCell(rowNum, 1).border = borderAll;
        ws.mergeCells(rowNum, 1, rowNum, Math.floor(totalCols / 2));
        const midStart = Math.floor(totalCols / 2) + 1;
        ws.getCell(rowNum, midStart).value = 'Procurement Monitoring Report';
        ws.getCell(rowNum, midStart).font = { bold: true };
        ws.getCell(rowNum, midStart).fill = makeFill('FFFFFFFF');
        ws.getCell(rowNum, midStart).alignment = { horizontal: 'center' };
        ws.getCell(rowNum, midStart).border = borderAll;
        ws.mergeCells(rowNum, midStart, rowNum, totalCols);
        rowNum += 1;

        // Row 2: Monitoring Report as of [DATE]
        ws.getCell(rowNum, 1).value = `Monitoring Report as of ${reportDateUpper}`;
        ws.getCell(rowNum, 1).font = { bold: true };
        ws.getCell(rowNum, 1).fill = makeFill('FFF9FAFB');
        ws.getCell(rowNum, 1).border = borderAll;
        ws.mergeCells(rowNum, 1, rowNum, totalCols);
        rowNum += 1;

        // Row 3: empty
        rowNum += 1;

        // Row 4: COMPLETED PROCUREMENT ACTIVITIES
        ws.getCell(rowNum, 1).value = 'COMPLETED PROCUREMENT ACTIVITIES';
        ws.getCell(rowNum, 1).font = { bold: true };
        ws.getCell(rowNum, 1).fill = makeFill('FFD1D5DB');
        ws.getCell(rowNum, 1).border = borderAll;
        ws.mergeCells(rowNum, 1, rowNum, totalCols);
        rowNum += 1;

        // Row 5: grey placeholder
        for (let c = 1; c <= totalCols; c++) {
            ws.getCell(rowNum, c).fill = makeFill('FFE5E7EB');
            ws.getCell(rowNum, c).border = borderAll;
        }
        rowNum += 1;

        // Row 6: amber placeholder
        for (let c = 1; c <= totalCols; c++) {
            ws.getCell(rowNum, c).fill = makeFill('FFFEF3C7');
            ws.getCell(rowNum, c).border = borderAll;
        }
        rowNum += 1;

        // Single header row: all column titles (no double row)
        REPORT_COLUMNS.forEach((col, c) => {
            const cell = ws.getCell(rowNum, c + 1);
            cell.value = col.label;
            cell.font = { bold: true };
            cell.fill = makeFill('FFD1D5DB');
            cell.border = borderAll;
            cell.alignment = { horizontal: 'left' };
        });
        rowNum += 1;

        const dataRows = hasEncoded
            ? encodedRows.map((row) =>
                REPORT_COLUMNS.map((col) => {
                    const v = row[col.key] ?? '';
                    if (col.type === 'date') return toDDMMYYYY(v) || v;
                    if (col.type === 'number') return formatNumberDisplay(v) || ''; // always include peso sign in export
                    return v;
                })
            )
            : filteredReports.map((r) => [
                '', r.title || '', r.submitting_office || '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '',
            ]);

        const pinkFill = makeFill('FFFDF2F8');
        dataRows.forEach((rowValues) => {
            rowValues.forEach((val, c) => {
                const cell = ws.getCell(rowNum, c + 1);
                cell.value = val;
                cell.fill = pinkFill;
                cell.border = borderAll;
                if (REPORT_COLUMNS[c]?.type === 'number' && val !== '') cell.alignment = { horizontal: 'right' };
            });
            rowNum += 1;
        });

        const colWidths = [14, 40, 24, 18, 20, 16, 16, 14, 14, 16, 14, 12, 26, 16, 16, 16, 18, 20, 22, 16, 14, 14, 20, 18, 18, 30];
        colWidths.forEach((w, i) => { ws.getColumn(i + 1).width = w; });

        const buffer = await workbook.xlsx.writeBuffer({ useStyles: true });
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        const dateStr = today.toISOString().split('T')[0];
        a.href = url;
        a.download = `procurement-monitoring-report-${dateStr}.xlsx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    };

    const performUpload = async () => {
        setUploadError('');
        setUploadSuccess('');
        setUploading(true);
        try {
            const fd = new FormData();
            fd.append('title', form.title.trim());
            fd.append('submitting_office', form.submitting_office.trim() || '');
            fd.append('uploadedBy', user?.fullName || user?.username || '');
            fd.append('file', form.file);

            await reportService.create(fd);
            setForm({ title: '', submitting_office: '', file: null });
            setUploadSuccess('Report uploaded successfully.');
            setUploadModalOpen(false);
            setUploadError('');
            load();
        } catch (err) {
            setUploadError(err.response?.data?.detail || err.message || 'Failed to upload report.');
        } finally {
            setUploading(false);
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        setUploadError('');
        if (!form.title.trim()) {
            setUploadError('Report title is required.');
            return;
        }
        if (!form.file) {
            setUploadError('Please select a file to upload.');
            return;
        }
        setConfirmUpload({
            message: 'Are you sure you want to upload this report?',
            onConfirm: () => {
                setConfirmUpload(null);
                performUpload();
            },
        });
    };

    const handleFileChange = (e) => {
        const file = e.target.files?.[0];
        if (!file) {
            setForm((prev) => ({ ...prev, file: null }));
            return;
        }
        const name = String(file.name || '').toLowerCase();
        const type = String(file.type || '');
        const isPdf = name.endsWith('.pdf') || type === 'application/pdf';
        if (!isPdf) {
            setUploadError('Only PDF files are allowed for reports.');
            e.target.value = '';
            setForm((prev) => ({ ...prev, file: null }));
            return;
        }
        setUploadError('');
        setForm((prev) => ({ ...prev, file }));
    };

    const closeModal = () => {
        setUploadModalOpen(false);
        setUploadError('');
        setForm({ title: '', submitting_office: '', file: null });
    };

    const getFetchUrl = (url) => {
        if (!url) return url;
        if (url.startsWith('/')) return url;
        try {
            const parsed = new URL(url);
            return parsed.pathname + parsed.search;
        } catch {
            return url;
        }
    };

    const toFullUrl = (url) => {
        if (!url || typeof url !== 'string') return url;
        if (url.startsWith('http://') || url.startsWith('https://')) return url;
        const path = url.startsWith('/') ? url : `/${url}`;
        return `${window.location.origin}${path}`;
    };

    /** View: show preview of the uploaded file — same approach as Encode: fetch by file_url first, then preview API. */
    const openPreview = async (r) => {
        const fileUrl = r?.file_url ?? r?.file;
        if (!fileUrl && !r?.id) return;
        setPreviewReport({ title: r.title || 'Report Preview', file_url: fileUrl, previewBlobUrl: null, previewBlobType: null });
        const tryFetch = async (url) => {
            const full = toFullUrl(url);
            const res = await fetch(full, { credentials: 'include' });
            if (!res.ok) throw new Error(`Failed to load: ${res.status}`);
            return res;
        };
        try {
            let res;
            if (fileUrl) {
                try {
                    res = await tryFetch(getFetchUrl(fileUrl));
                } catch {
                    res = await tryFetch(fileUrl);
                }
            } else if (r?.id != null) {
                res = await tryFetch(`/api/reports/${r.id}/preview/`);
            } else {
                throw new Error('No file');
            }
            const contentType = (res.headers.get('content-type') || '').split(';')[0].trim();
            const blob = await res.blob();
            if (blob.size === 0) throw new Error('Empty file');
            const isJson = (contentType || '').toLowerCase().includes('application/json');
            const isHtml = (contentType || '').toLowerCase().includes('text/html');
            if ((isJson || isHtml) && blob.size < 2000) throw new Error('Server returned error page');
            let blobType = blob.type || contentType || 'application/octet-stream';
            if (blobType === 'application/octet-stream' && (contentType.toLowerCase().includes('pdf') || /\.pdf(\?|$)/i.test(String(fileUrl || '')))) {
                blobType = 'application/pdf';
            }
            const blobForView = blob.type ? blob : new Blob([blob], { type: blobType });
            const blobUrl = URL.createObjectURL(blobForView);
            setPreviewReport((prev) => (prev ? { ...prev, previewBlobUrl: blobUrl, previewBlobType: blobType } : null));
        } catch (err) {
            setPreviewReport((prev) => (prev ? { ...prev, previewBlobUrl: 'failed' } : null));
        }
    };

    const closePreview = () => {
        if (previewReport?.previewBlobUrl && previewReport.previewBlobUrl !== 'failed') {
            URL.revokeObjectURL(previewReport.previewBlobUrl);
        }
        setPreviewReport(null);
    };

    const addEncodedRow = () =>
        setEncodedRows((prev) => [
            ...prev,
            {
                ...emptyEncodedRow(),
                __owner: currentEncoderId || 'Unknown',
            },
        ]);
    const updateEncodedRow = (index, key, value) => {
        setEncodedRows((prev) => {
            const next = [...prev];
            if (!next[index]) return next;
            const row = next[index];
            const owner = row.__owner;
            if (owner && owner !== currentEncoderId) return next;
            next[index] = { ...row, [key]: value };
            return next;
        });
    };
    const removeEncodedRow = (index) =>
        setEncodedRows((prev) =>
            prev.filter((row, i) => {
                if (i !== index) return true;
                const owner = row.__owner;
                if (owner && owner !== currentEncoderId) return true;
                return false;
            })
        );

    const getSuggestedExt = (url) => {
        if (!url || typeof url !== 'string') return '.pdf';
        const m = url.match(/\.([a-z0-9]+)(?:\?|$)/i);
        return m ? `.${m[1].toLowerCase()}` : '.pdf';
    };

    const triggerDownload = async (r, { blob: existingBlob, blobUrl } = {}) => {
        const fileUrl = r?.file_url ?? r?.file;
        if (!fileUrl && !r?.id && !blobUrl) return;
        const ext = getSuggestedExt(fileUrl || blobUrl);
        const base = r?.title ? `${r.title.replace(/[/\\?%*:|"<>]/g, '_')}` : 'report';
        const suggestedName = base.endsWith(ext) ? base : `${base}${ext}`;

        // Prefer file picker (Save As) so user can choose where to save
        const showPicker = typeof window.showSaveFilePicker === 'function';
        let handle = null;
        if (showPicker) {
            try {
                handle = await window.showSaveFilePicker({ suggestedName });
            } catch (err) {
                if (err?.name === 'AbortError') return; // user cancelled
                throw err;
            }
        }

        try {
            let blob;
            if (existingBlob instanceof Blob) {
                blob = existingBlob;
            } else if (blobUrl && typeof blobUrl === 'string' && blobUrl.startsWith('blob:')) {
                const res = await fetch(blobUrl);
                blob = await res.blob();
            } else {
                const tryFetch = async (url) => {
                    const full = toFullUrl(url);
                    const res = await fetch(full, { credentials: 'include' });
                    if (!res.ok) throw new Error(`Failed to load: ${res.status}`);
                    return res;
                };
                let res;
                if (r?.id != null) {
                    try {
                        res = await tryFetch(`/api/reports/${r.id}/preview/`);
                    } catch {
                        if (fileUrl) {
                            try { res = await tryFetch(getFetchUrl(fileUrl)); } catch { res = await tryFetch(fileUrl); }
                        } else throw new Error('No file');
                    }
                } else if (fileUrl) {
                    try { res = await tryFetch(getFetchUrl(fileUrl)); } catch { res = await tryFetch(fileUrl); }
                } else {
                    throw new Error('No file');
                }
                blob = await res.blob();
            }
            const ext2 = blob.type?.includes('pdf') ? '.pdf' : blob.type?.includes('spreadsheet') || blob.type?.includes('excel') ? '.xlsx' : blob.type?.includes('msword') ? '.docx' : ext.startsWith('.') ? ext : `.${ext.replace(/^\./, '') || 'pdf'}`;
            const finalName = suggestedName.endsWith(ext2) || suggestedName.toLowerCase().endsWith(ext2.toLowerCase()) ? suggestedName : `${(suggestedName.replace(/\.[^.]+$/, '') || base || 'report')}${ext2}`;

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
            if (fileUrl) window.open(toFullUrl(fileUrl), '_blank', 'noopener');
        }
    };

    return (
        <div className="space-y-5">
            <PageHeader
                title="Reports"
                subtitle="Upload and view all reports in the system."
            />

            <section className="content-section overflow-hidden rounded-xl p-0">
                {uploadSuccess && (
                    <div className="p-4 px-5 pt-5 rounded-t-xl bg-green-50 border-b border-green-200 text-green-800 text-sm">
                        {uploadSuccess}
                    </div>
                )}
                <div className={`section-header ${uploadSuccess ? 'section-header--nested' : ''}`}>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="min-w-0 flex-1 overflow-hidden">
                            <h2 className="text-base sm:text-lg font-bold text-[var(--text)] truncate block">All Uploaded Reports</h2>
                            {hasActiveFilters && (
                                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                                    Showing {filteredReports.length} of {reports.length} report{reports.length !== 1 ? 's' : ''}
                                </p>
                            )}
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <button
                                type="button"
                                onClick={() => setEncodeModalOpen(true)}
                                className="inline-flex items-center gap-1.5 rounded-xl text-sm py-2.5 px-4 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white font-semibold shadow-sm transition-all duration-200"
                            >
                                <MdAdd className="w-4 h-4" />
                                Encode
                            </button>
                            <button
                                type="button"
                                onClick={() => { setUploadSuccess(''); setUploadModalOpen(true); }}
                                className="inline-flex items-center gap-1.5 rounded-xl text-sm py-2.5 px-4 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white font-semibold shadow-sm transition-all duration-200"
                            >
                                <MdUpload className="w-4 h-4" />
                                Upload Report
                            </button>
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 mt-3 pt-3 border-t border-[var(--border-light)]">
                        <div className="flex items-center gap-2 shrink-0">
                            <label className="text-xs text-[var(--text-muted)] shrink-0">From</label>
                            <input
                                type="date"
                                value={filters.date_from}
                                onChange={(e) => setFilters((f) => ({ ...f, date_from: e.target.value }))}
                                className="input-field py-1.5 text-xs px-2 min-w-[120px] rounded-lg"
                            />
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                            <label className="text-xs text-[var(--text-muted)] shrink-0">To</label>
                            <input
                                type="date"
                                value={filters.date_to}
                                onChange={(e) => setFilters((f) => ({ ...f, date_to: e.target.value }))}
                                className="input-field py-1.5 text-xs px-2 min-w-[120px] rounded-lg"
                            />
                        </div>
                        {hasActiveFilters && (
                            <button
                                type="button"
                                onClick={clearFilters}
                                className="text-xs text-[var(--primary)] hover:underline font-medium shrink-0"
                            >
                                Clear
                            </button>
                        )}
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-[var(--border)] w-full">
                        <thead className="table-header">
                            <tr>
                                <th className="table-th">Report Title</th>
                                <th className="table-th">Submitting Office</th>
                                <th className="table-th">Uploaded By</th>
                                <th className="table-th">Date Submitted</th>
                                {isAdmin && (
                                    <th className="table-th">Actions</th>
                                )}
                            </tr>
                        </thead>
                        <tbody className="bg-[var(--surface)] divide-y divide-[var(--border-light)]">
                            {loading ? (
                                <tr>
                                    <td colSpan={isAdmin ? 5 : 4} className="table-td text-center py-12">
                                        <div className="flex flex-col items-center justify-center text-[var(--text-muted)]">
                                            <div className="w-10 h-10 rounded-full border-2 border-[var(--border)] border-t-[var(--primary)] animate-spin mb-3" aria-hidden />
                                            <span className="text-sm">Loading reports…</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : reports.length === 0 ? (
                                <tr>
                                    <td colSpan={isAdmin ? 5 : 4} className="table-td text-center py-12">
                                        <p className="text-[var(--text-muted)] font-medium">No reports uploaded yet</p>
                                        <p className="text-sm text-[var(--text-subtle)] mt-1">Use &apos;Upload Report&apos; to add one.</p>
                                    </td>
                                </tr>
                            ) : filteredReports.length === 0 ? (
                                <tr>
                                    <td colSpan={isAdmin ? 5 : 4} className="table-td text-center py-12 text-[var(--text-muted)]">
                                        No reports match your filters. <button type="button" onClick={clearFilters} className="text-[var(--primary)] hover:underline font-medium mt-1 inline-block">Clear filters</button>
                                    </td>
                                </tr>
                            ) : (
                                paginatedReports.map((r) => (
                                    <tr key={r.id} className="hover:bg-[var(--background-subtle)]/50 transition-all duration-300 ease-out group">
                                        <td className="table-td font-medium">{r.title || '—'}</td>
                                        <td className="table-td-muted">{r.submitting_office || '—'}</td>
                                        <td className="table-td-muted">{r.uploadedBy || '—'}</td>
                                        <td className="table-td-muted">{formatDate(r.uploaded_at) || '—'}</td>
                                        {isAdmin && (
                                            <td className="table-td whitespace-nowrap">
                                                {(r.file_url || r.file || r.id) ? (
                                                    <div className="flex items-center justify-center gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => openPreview(r)}
                                                            className="inline-flex items-center justify-center px-3 py-1 text-[11px] font-medium rounded-full border border-[var(--border)] text-[var(--primary)] hover:border-[var(--primary)] hover:bg-[var(--primary-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)] focus:ring-offset-1 transition-all duration-300 ease-out hover:scale-105 active:scale-95"
                                                            title="View file"
                                                        >
                                                            View
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => triggerDownload(r)}
                                                            className="inline-flex items-center justify-center px-3 py-1 text-[11px] font-medium rounded-full border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--background-subtle)] focus:outline-none focus:ring-1 focus:ring-[var(--border)] focus:ring-offset-1 transition-all duration-300 ease-out hover:scale-105 active:scale-95"
                                                            title="Download file"
                                                        >
                                                            Download
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <span className="text-[var(--text-muted)]">—</span>
                                                )}
                                            </td>
                                        )}
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                {filteredReports.length > TABLE_PAGE_SIZE && (
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
                            Page {tablePage} of {totalPages}
                        </span>
                        <button
                            type="button"
                            onClick={() => setTablePage((p) => Math.min(totalPages, p + 1))}
                            disabled={tablePage >= totalPages}
                            className="p-2 rounded-lg border border-[var(--border)] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[var(--background-subtle)]"
                            aria-label="Next page"
                        >
                            <MdChevronRight className="w-5 h-5" />
                        </button>
                    </div>
                )}
            </section>

            {/* Upload Report modal */}
            {uploadModalOpen && !confirmUpload && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm"
                    aria-modal="true"
                    role="dialog"
                >
                    <div className="card-elevated max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl rounded-2xl border-0">
                        <div className="p-6 border-b border-[var(--border-light)] flex items-center justify-between sticky top-0 bg-[var(--surface)] rounded-t-2xl z-10">
                            <h2 className="text-lg font-semibold text-[var(--text)]">Upload Report</h2>
                            <button
                                type="button"
                                onClick={closeModal}
                                className="p-2 text-[var(--text-muted)] hover:bg-[var(--background-subtle)] rounded-lg transition-all duration-300 ease-out hover:scale-110 active:scale-95"
                                aria-label="Close"
                            >
                                <MdClose className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            {uploadError && (
                                <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm shadow-sm transition-all duration-300 ease-out">
                                    {uploadError}
                                </div>
                            )}
                            <div>
                                <label className="block text-sm font-medium text-[var(--text)] mb-1">
                                    Report Title <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={form.title}
                                    onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                                    className="input-field w-full"
                                    placeholder="e.g. Monthly BAC Report"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-[var(--text)] mb-1">
                                    Submitting Office
                                </label>
                                <input
                                    type="text"
                                    value={form.submitting_office}
                                    onChange={(e) => setForm((prev) => ({ ...prev, submitting_office: e.target.value }))}
                                    className="input-field w-full"
                                    placeholder="e.g. BAC Secretariat"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-[var(--text)] mb-1">
                                    File <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="file"
                                    onChange={handleFileChange}
                                    className="block w-full text-sm text-[var(--text)] file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-[#16a34a] file:hover:bg-[#15803d] file:active:bg-[#166534] file:text-white file:font-medium file:cursor-pointer file:transition-colors file:duration-200"
                                    accept=".pdf,application/pdf"
                                />
                                {form.file && (
                                    <p className="mt-1 text-sm text-[var(--text-muted)]">{form.file.name}</p>
                                )}
                            </div>
                            <div className="flex justify-end gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className="px-4 py-2 rounded-xl border border-[var(--border)] text-[var(--text)] hover:bg-[var(--background-subtle)] font-medium transition-all duration-300 ease-out hover:shadow-sm active:scale-[0.98]"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={uploading}
                                    className="btn-primary inline-flex items-center gap-2"
                                >
                                    <MdUpload className="w-5 h-5" />
                                    {uploading ? 'Uploading...' : 'Upload'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Encode Report modal — Excel-like table (portal so it appears above sidebar) */}
            {encodeModalOpen && createPortal(
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm"
                    aria-modal="true"
                    role="dialog"
                    aria-labelledby="encode-report-title"
                    onClick={() => setEncodeModalOpen(false)}
                >
                    <div
                        className="bg-white w-full max-w-[96vw] h-[85vh] max-h-[85vh] flex flex-col rounded-xl shadow-2xl border-2 border-gray-300 overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                        style={{ minHeight: '400px' }}
                    >
                        <div className="p-4 border-b-2 border-gray-200 flex items-center justify-between shrink-0 bg-gray-50">
                            <h2 id="encode-report-title" className="text-xl font-bold text-gray-800">Encode Report</h2>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={addEncodedRow}
                                    className="inline-flex items-center gap-1.5 rounded-lg text-sm py-2.5 px-4 bg-green-600 hover:bg-green-700 text-white font-semibold shadow"
                                >
                                    <MdAdd className="w-5 h-5" />
                                    Add row
                                </button>
                                <button
                                    type="button"
                                    onClick={handleExportExcel}
                                    disabled={encodedRows.length === 0}
                                    className="inline-flex items-center gap-1.5 rounded-lg text-sm py-2.5 px-4 bg-gray-600 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold shadow"
                                >
                                    <MdDownload className="w-5 h-5" />
                                    Export
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setEncodeModalOpen(false)}
                                    className="p-2.5 text-gray-600 hover:bg-gray-200 rounded-lg border border-gray-300"
                                    aria-label="Isara"
                                >
                                    <MdClose className="w-6 h-6" />
                                </button>
                            </div>
                        </div>
                        <div className="flex-1 min-h-0 overflow-auto p-4 bg-gray-100">
                            {/* Single wide block so all row colors extend full width when scrolling */}
                            <div className="bg-white rounded-lg border-2 border-gray-300 shadow-inner" style={{ width: 'max-content', minWidth: '100%' }}>
                                {/* Report title block */}
                                <div className="border-b border-gray-400 px-3 py-2.5 flex items-center justify-between bg-white">
                                    <span className="text-sm font-semibold text-gray-800 flex-1">DEPARTMENT OF THE INTERIOR AND LOCAL GOVERNMENT - REGION 1</span>
                                    <span className="text-base font-bold text-gray-900 shrink-0 px-4">Procurement Monitoring Report</span>
                                    <span className="flex-1" aria-hidden />
                                </div>
                                <div className="border-b border-gray-400 px-3 py-2 bg-gray-50">
                                    <span className="text-sm font-bold text-gray-800">
                                        Monitoring Report as of {new Date().toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' }).toUpperCase()}
                                    </span>
                                </div>
                                {/* Section header */}
                                <div className="bg-gray-300 border-b border-gray-400 px-3 py-2">
                                    <span className="text-sm font-semibold text-gray-800">COMPLETED PROCUREMENT ACTIVITIES</span>
                                </div>
                                {/* Grey placeholder row */}
                                <div className="bg-gray-200 border-b border-gray-400 h-8" />
                                {/* Yellow new-entry row */}
                                <div className="bg-amber-100 border-b border-gray-400 h-8" />
                                {/* Table - defines the width of the whole block so title rows match */}
                                <table className="border-collapse text-gray-900 bg-gray-300" style={{ tableLayout: 'auto', minWidth: '2600px', width: '100%' }}>
                                    <thead>
                                        <tr className="bg-gray-300 border-b border-gray-500">
                                            <th rowSpan={2} className="bg-gray-300 border-r border-gray-400 px-2 py-2 text-left text-xs font-bold w-10 text-gray-800 align-middle">#</th>
                                            {HEADER_GROUPS.map((grp) =>
                                                grp.colKeys.length === 1 ? (
                                                    <th key={grp.colKeys[0]} rowSpan={2} className="bg-gray-300 border-r border-gray-400 px-2 py-2 text-left text-xs font-bold text-gray-800 align-middle min-w-[120px]" title={grp.groupLabel}>
                                                        {grp.groupLabel}
                                                    </th>
                                                ) : (
                                                    <th key={grp.colKeys.join('-')} colSpan={grp.colKeys.length} className="bg-gray-300 border-r border-gray-400 px-2 py-2 text-center text-xs font-bold text-gray-800 align-middle min-w-[100px]">
                                                        {grp.groupLabel}
                                                    </th>
                                                )
                                            )}
                                            <th rowSpan={2} className="bg-gray-300 border-gray-400 px-2 py-2 text-center text-xs font-bold w-16 text-gray-800 align-middle">Action</th>
                                        </tr>
                                        <tr className="bg-gray-300 border-b-2 border-gray-500">
                                            {HEADER_GROUPS.map((grp) =>
                                                grp.colKeys.length > 1
                                                    ? grp.colKeys.map((key) => {
                                                          const col = REPORT_COLUMNS.find((c) => c.key === key);
                                                          const subLabel = col?.shortLabel ?? col?.label ?? key;
                                                          return (
                                                              <th key={key} className="bg-gray-300 border-r border-gray-400 px-2 py-1.5 text-left text-xs font-bold text-gray-800 min-w-[90px]" title={col?.label}>
                                                                  {subLabel}
                                                              </th>
                                                          );
                                                      })
                                                    : null
                                            )}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {encodedRows.map((row, index) => {
                                            const owner = row.__owner || '';
                                            const isOwner = !owner || owner === currentEncoderId;
                                            return (
                                                <tr key={index} className="border-b border-gray-300">
                                                    <td className="bg-pink-50 border-r border-gray-300 px-2 py-1 text-sm font-medium text-gray-700 align-top hover:bg-pink-100">
                                                        {index + 1}
                                                    </td>
                                                    {REPORT_COLUMNS.map((col) => {
                                                        const val = row[col.key] ?? '';
                                                        const isDateInvalid = col.type === 'date' && val && !validateDateRange(val);
                                                        if (col.type === 'date') {
                                                            return (
                                                                <td key={col.key} className="bg-pink-50 border-r border-gray-300 p-0 align-top last:border-r-0">
                                                                    <input
                                                                        type="date"
                                                                        value={String(val)}
                                                                        min={DATE_MIN}
                                                                        max={DATE_MAX}
                                                                        onChange={(e) => updateEncodedRow(index, col.key, e.target.value)}
                                                                        title={isDateInvalid ? 'Invalid: Input must be between 1/1/2000 and 12/31/2060' : ''}
                                                                        disabled={!isOwner}
                                                                        className={`w-full min-w-0 py-1.5 px-2 text-sm border-0 rounded focus:ring-2 focus:ring-green-500 text-gray-800 ${isDateInvalid ? 'bg-red-200' : 'bg-transparent'} ${!isOwner ? 'cursor-not-allowed bg-gray-100 text-gray-500' : ''}`}
                                                                    />
                                                                </td>
                                                            );
                                                        }
                                                        if (col.type === 'number') {
                                                            const rawVal = val === '' || val == null ? '' : String(val).replace(/[^0-9.]/g, '');
                                                            const displayVal = formatNumberAsYouType(rawVal);
                                                            return (
                                                                <td key={col.key} className="bg-pink-50 border-r border-gray-300 p-0 align-top last:border-r-0">
                                                                    <input
                                                                        type="text"
                                                                        inputMode="decimal"
                                                                        value={displayVal}
                                                                        onChange={(e) => {
                                                                            if (!isOwner) return;
                                                                            const stripped = e.target.value.replace(/[₱,\s]/g, '');
                                                                            const sanitized = sanitizeNumberInput(stripped);
                                                                            const limited = (() => {
                                                                                const p = sanitized.split('.');
                                                                                if (p.length > 2) return p[0] + '.' + p.slice(1).join('').slice(0, 2);
                                                                                if (p.length === 2 && p[1].length > 2) return p[0] + '.' + p[1].slice(0, 2);
                                                                                return sanitized;
                                                                            })();
                                                                            updateEncodedRow(index, col.key, limited);
                                                                        }}
                                                                        onBlur={() => {
                                                                            if (!isOwner) return;
                                                                            const r = row[col.key];
                                                                            if (r === '' || r == null) return;
                                                                            const n = parseFloat(String(r).replace(/[^0-9.]/g, ''));
                                                                            if (!Number.isNaN(n)) updateEncodedRow(index, col.key, Number(n).toFixed(2));
                                                                        }}
                                                                        disabled={!isOwner}
                                                                        className={`w-full min-w-0 py-1.5 px-2 text-sm border-0 rounded text-right focus:ring-2 focus:ring-green-500 text-gray-800 bg-transparent ${!isOwner ? 'cursor-not-allowed bg-gray-100 text-gray-500' : ''}`}
                                                                        placeholder="₱0.00"
                                                                        title="Numbers and decimal (tuldok) only, e.g. 1234567.89"
                                                                    />
                                                                </td>
                                                            );
                                                        }
                                                        if (col.type === 'select' && col.options) {
                                                            return (
                                                                <td key={col.key} className="bg-pink-50 border-r border-gray-300 p-0 align-top last:border-r-0">
                                                                    <select
                                                                        value={String(val)}
                                                                        onChange={(e) => updateEncodedRow(index, col.key, e.target.value)}
                                                                        disabled={!isOwner}
                                                                        className={`w-full min-w-0 py-1.5 px-2 text-sm border-0 rounded focus:ring-2 focus:ring-green-500 text-gray-800 bg-transparent ${!isOwner ? 'cursor-not-allowed bg-gray-100 text-gray-500' : ''}`}
                                                                    >
                                                                        <option value="">—</option>
                                                                        {col.options.map((opt) => (
                                                                            <option key={opt} value={opt}>{opt}</option>
                                                                        ))}
                                                                    </select>
                                                                </td>
                                                            );
                                                        }
                                                        return (
                                                            <td key={col.key} className="bg-pink-50 border-r border-gray-300 p-0 align-top last:border-r-0">
                                                                <input
                                                                    type="text"
                                                                    value={String(val)}
                                                                    onChange={(e) => updateEncodedRow(index, col.key, e.target.value)}
                                                                    disabled={!isOwner}
                                                                    className={`w-full min-w-0 py-1.5 px-2 text-sm border-0 rounded focus:ring-2 focus:ring-green-500 text-gray-800 bg-transparent ${!isOwner ? 'cursor-not-allowed bg-gray-100 text-gray-500' : ''}`}
                                                                />
                                                            </td>
                                                        );
                                                    })}
                                                    <td className="bg-pink-50 border-gray-300 p-0 align-top text-center">
                                                        <button
                                                            type="button"
                                                            onClick={() => removeEncodedRow(index)}
                                                            disabled={!isOwner}
                                                            className={`p-2 text-red-600 rounded border border-transparent hover:border-red-300 ${isOwner ? 'hover:bg-red-100 cursor-pointer' : 'cursor-not-allowed opacity-50'}`}
                                                            title={isOwner ? 'Remove row' : 'You can only remove rows you encoded'}
                                                            aria-label="Remove row"
                                                        >
                                                            <MdDelete className="w-5 h-5" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                                {encodedRows.length === 0 && (
                                    <div className="py-12 text-center text-gray-600 text-base border-t-2 border-gray-300 bg-gray-50">
                                        <p className="font-medium">No entries yet.</p>
                                        <p className="mt-1">Click &quot;Add row&quot; above to start encoding.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Preview modal — same as Encode: blob URL in embed/img/iframe */}
            {previewReport && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm"
                    aria-modal="true"
                    role="dialog"
                >
                    <div className="card-elevated max-w-6xl w-full max-h-[90vh] overflow-hidden shadow-2xl rounded-2xl border-0 flex flex-col">
                        <div className="p-6 border-b border-[var(--border-light)] flex items-center justify-between bg-[var(--surface)]">
                            <h2 className="text-lg font-semibold text-[var(--text)]">{previewReport.title}</h2>
                            <button
                                type="button"
                                onClick={closePreview}
                                className="p-2 text-[var(--text-muted)] hover:bg-[var(--background-subtle)] rounded-lg"
                                aria-label="Close"
                            >
                                <MdClose className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-auto bg-gray-100 p-4 min-h-[70vh] flex flex-col">
                            {previewReport.previewBlobUrl === 'failed' ? (
                                <div className="flex flex-col items-center justify-center h-64 text-[var(--text-muted)]">
                                    <p>Could not load file.</p>
                                </div>
                            ) : previewReport.previewBlobUrl ? (
                                (() => {
                                    const ct = previewReport.previewBlobType || '';
                                    const isPdf = ct.includes('pdf');
                                    const isImage = /^image\//.test(ct);
                                    if (isPdf) {
                                        return (
                                            <embed
                                                src={`${previewReport.previewBlobUrl}#toolbar=0&navpanes=0`}
                                                type="application/pdf"
                                                className="w-full min-h-[600px] flex-1 border-0 rounded-lg"
                                                title="Document"
                                            />
                                        );
                                    }
                                    if (isImage) {
                                        return (
                                            <img
                                                src={previewReport.previewBlobUrl}
                                                alt={previewReport.title}
                                                className="max-w-full max-h-[70vh] object-contain mx-auto block"
                                            />
                                        );
                                    }
                                    return (
                                        <iframe
                                            src={previewReport.previewBlobUrl}
                                            title={previewReport.title}
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
                            <button type="button" onClick={closePreview} className="btn-primary">
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Confirm upload dialog */}
            {confirmUpload && (
                <div
                    className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm"
                    aria-modal="true"
                    role="alertdialog"
                    aria-labelledby="reports-confirm-title"
                >
                    <div className="card-elevated max-w-sm w-full shadow-2xl rounded-2xl border-0 overflow-hidden">
                        <div className="p-6">
                            <h2 id="reports-confirm-title" className="text-lg font-semibold text-[var(--text)] mb-2">
                                Confirm upload
                            </h2>
                            <p className="text-[var(--text-muted)] mb-6">{confirmUpload.message}</p>
                            <div className="flex gap-3 justify-end">
                                <button
                                    type="button"
                                    onClick={() => setConfirmUpload(null)}
                                    className="btn-secondary"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={() => confirmUpload.onConfirm()}
                                    disabled={uploading}
                                    className="btn-primary"
                                >
                                    {uploading ? 'Uploading...' : 'Yes, upload'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Reports;
