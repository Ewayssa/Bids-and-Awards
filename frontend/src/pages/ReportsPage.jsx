import React, { useState, useEffect, useMemo } from 'react';
import { reportService } from '../services/api';
import { ROLES } from '../utils/auth';
import { MdUpload, MdChevronLeft, MdChevronRight, MdAdd, MdSearch, MdCheckCircle } from 'react-icons/md';
import PageHeader from '../components/PageHeader';
import Modal from '../components/Modal';

// Constants & Helpers
import { TABLE_PAGE_SIZE } from '../constants/reportConstants';
import { 
    formatDate, 
    getFetchUrl, 
    toFullUrl, 
    getSuggestedExt 
} from '../utils/reportHelpers';
import { exportToExcel } from '../utils/reportExporter';
import { useEncodedReports } from '../hooks/useEncodedReports';

// Sub-components
import UploadModal from '../components/UploadModal';
import EncodeModal from '../components/EncodeModal';
import PreviewModal from '../components/PreviewModal';

const Reports = ({ user }) => {
    const isAdmin = user?.role === ROLES.ADMIN;
    const currentEncoderId = user?.username || user?.fullName || '';

    // Main Reports State
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [tablePage, setTablePage] = useState(1);

    // Modal States
    const [uploadModalOpen, setUploadModalOpen] = useState(false);
    const [encodeModalOpen, setEncodeModalOpen] = useState(false);
    const [previewReport, setPreviewReport] = useState(null);
    const [confirmUpload, setConfirmUpload] = useState(null);

    // Upload Form State
    const [uploading, setUploading] = useState(false);
    const [uploadError, setUploadError] = useState('');
    const [uploadSuccess, setUploadSuccess] = useState('');
    const [uploadForm, setUploadForm] = useState({ title: '', submitting_office: '', file: null });

    // Custom Hook for Encoding
    const {
        encodedRows,
        isFinalized,
        setIsFinalized,
        addRow,
        updateRow,
        removeRow,
    } = useEncodedReports(currentEncoderId);

    const loadReports = async () => {
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

    useEffect(() => { loadReports(); }, []);

    // Search and Pagination
    const filteredReports = useMemo(() => {
        const q = (searchQuery || '').trim().toLowerCase();
        if (!q) return reports;
        return reports.filter((r) => {
            const title = String(r.title || '').toLowerCase();
            const office = String(r.submitting_office || '').toLowerCase();
            const by = String(r.uploadedBy || '').toLowerCase();
            const dateStr = String(formatDate(r.uploaded_at) || '').toLowerCase();
            return title.includes(q) || office.includes(q) || by.includes(q) || dateStr.includes(q);
        });
    }, [reports, searchQuery]);

    const totalPages = Math.max(1, Math.ceil(filteredReports.length / TABLE_PAGE_SIZE));
    const paginatedReports = useMemo(() => {
        const start = (tablePage - 1) * TABLE_PAGE_SIZE;
        return filteredReports.slice(start, start + TABLE_PAGE_SIZE);
    }, [filteredReports, tablePage]);

    useEffect(() => { setTablePage(1); }, [filteredReports.length]);

    // Handlers
    const handleFileChange = (e) => {
        const file = e.target.files?.[0];
        if (!file) return setUploadForm(p => ({ ...p, file: null }));
        
        const isPdf = file.name.toLowerCase().endsWith('.pdf') || file.type === 'application/pdf';
        if (!isPdf) {
            setUploadError('Only PDF files are allowed for reports.');
            e.target.value = '';
            return setUploadForm(p => ({ ...p, file: null }));
        }
        setUploadError('');
        setUploadForm(p => ({ ...p, file }));
    };

    const performUpload = async () => {
        setUploadError('');
        setUploading(true);
        try {
            const fd = new FormData();
            fd.append('title', uploadForm.title.trim());
            fd.append('submitting_office', uploadForm.submitting_office.trim() || '');
            fd.append('uploadedBy', user?.fullName || user?.username || '');
            fd.append('file', uploadForm.file);

            await reportService.create(fd);
            setUploadForm({ title: '', submitting_office: '', file: null });
            setUploadSuccess('Report uploaded successfully.');
            setUploadModalOpen(false);
            loadReports();
        } catch (err) {
            setUploadError(err.response?.data?.detail || err.message || 'Failed to upload report.');
        } finally {
            setUploading(false);
        }
    };

    const handleUploadSubmit = (e) => {
        e.preventDefault();
        if (!uploadForm.title.trim()) return setUploadError('Report title is required.');
        if (!uploadForm.file) return setUploadError('Please select a file to upload.');
        
        setConfirmUpload({
            message: 'Are you sure you want to upload this report?',
            onConfirm: () => { setConfirmUpload(null); performUpload(); },
        });
    };

    const openPreview = async (r) => {
        const fileUrl = r?.file_url ?? r?.file;
        if (!fileUrl && !r?.id) return;
        setPreviewReport({ title: r.title || 'Report Preview', file_url: fileUrl, previewBlobUrl: null, previewBlobType: null });
        
        try {
            const fetchUrl = getFetchUrl(fileUrl);
            const tryFetch = async (url) => {
                const res = await fetch(toFullUrl(url), { credentials: 'include' });
                if (!res.ok) throw new Error(`Failed to load: ${res.status}`);
                return res;
            };
            
            const res = await (r?.id ? tryFetch(`/api/reports/${r.id}/preview/`) : tryFetch(fetchUrl));
            const contentType = (res.headers.get('content-type') || '').split(';')[0].trim();
            const blob = await res.blob();
            const blobUrl = URL.createObjectURL(blob);
            setPreviewReport(prev => prev ? { ...prev, previewBlobUrl: blobUrl, previewBlobType: contentType } : null);
        } catch (err) {
            setPreviewReport(prev => prev ? { ...prev, previewBlobUrl: 'failed' } : null);
        }
    };

    const triggerDownload = async (r) => {
        const fileUrl = r?.file_url ?? r?.file;
        if (!fileUrl && !r?.id) return;
        
        try {
            const res = await fetch(toFullUrl(fileUrl || `/api/reports/${r.id}/preview/`), { credentials: 'include' });
            const blob = await res.blob();
            const ext = getSuggestedExt(fileUrl);
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${(r.title || 'report').replace(/[/\\?%*:|"<>]/g, '_')}${ext}`;
            a.click();
            URL.revokeObjectURL(url);
        } catch (err) {
            window.open(toFullUrl(fileUrl), '_blank');
        }
    };

    return (
        <div className="space-y-5 pb-8">
            <PageHeader title="Reports" subtitle="Upload and view all reports in the system." />

            <section className="content-section overflow-hidden rounded-xl p-0">
                {uploadSuccess && (
                    <div className="px-5 pt-5 pb-0">
                        <div className="alert-success rounded-xl">
                            {uploadSuccess}
                        </div>
                    </div>
                )}
                <div className={`section-header ${uploadSuccess ? 'section-header--nested' : ''}`}>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="min-w-0 flex-1 overflow-hidden">
                            <h2 className="text-base sm:text-lg font-bold text-[var(--text)] truncate block">All Uploaded Reports</h2>
                            {searchQuery && (
                                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                                    Showing {filteredReports.length} of {reports.length} reports
                                </p>
                            )}
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <button onClick={() => setEncodeModalOpen(true)} className="btn-secondary inline-flex items-center gap-1.5 py-2.5 px-4 text-sm"><MdAdd className="w-4 h-4" /> Encode</button>
                            <button onClick={() => { setUploadSuccess(''); setUploadModalOpen(true); }} className="btn-primary inline-flex items-center gap-1.5 py-2.5 px-4 text-sm"><MdUpload className="w-4 h-4" /> Upload Report</button>
                        </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-[var(--border-light)]">
                        <div className="relative w-full max-w-3xl">
                            <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)]" />
                            <input
                                type="search"
                                placeholder="Search reports (title, office, uploaded by, date)..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="input-field w-full pl-10 rounded-lg"
                            />
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-[var(--border)] w-full">
                        <thead className="table-header">
                            <tr>
                                <th className="table-th">Report Title</th>
                                <th className="table-th">Submitting Office</th>
                                <th className="table-th">Uploaded By</th>
                                <th className="table-th text-center">Date Submitted</th>
                                {isAdmin && <th className="table-th text-center">Actions</th>}
                            </tr>
                        </thead>
                        <tbody className="bg-[var(--surface)] divide-y divide-[var(--border-light)]">
                            {loading ? (
                                <tr><td colSpan={isAdmin ? 5 : 4} className="table-td text-center py-12">Loading reports...</td></tr>
                            ) : reports.length === 0 ? (
                                <tr><td colSpan={isAdmin ? 5 : 4} className="table-td text-center py-12">No reports uploaded yet.</td></tr>
                            ) : paginatedReports.map((r) => (
                                <tr key={r.id} className="hover:bg-[var(--background-subtle)]/50 transition-all duration-300 group">
                                    <td className="table-td font-medium">{r.title || '—'}</td>
                                    <td className="table-td-muted">{r.submitting_office || '—'}</td>
                                    <td className="table-td-muted">{r.uploadedBy || '—'}</td>
                                    <td className="table-td-muted text-center">{formatDate(r.uploaded_at) || '—'}</td>
                                    {isAdmin && (
                                    <td className="table-td text-center">
                                        <div className="flex items-center justify-center gap-2">
                                            <button 
                                                onClick={() => openPreview(r)} 
                                                className="px-3 py-1 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 rounded-full border border-emerald-200 dark:border-emerald-500/20 text-[10px] font-black uppercase tracking-widest hover:bg-emerald-100 transition-all active:scale-95 shadow-sm shadow-emerald-500/5"
                                                title="Preview report"
                                            >
                                                Preview
                                            </button>
                                            <button 
                                                onClick={() => triggerDownload(r)} 
                                                className="px-3 py-1 bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 rounded-full border border-blue-200 dark:border-blue-500/20 text-[10px] font-black uppercase tracking-widest hover:bg-blue-100 transition-all active:scale-95 shadow-sm shadow-blue-500/5"
                                                title="Download PDF"
                                            >
                                                Download
                                            </button>
                                        </div>
                                    </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {filteredReports.length > TABLE_PAGE_SIZE && (
                    <div className="pagination-nav">
                        <button type="button" onClick={() => setTablePage(p => Math.max(1, p - 1))} disabled={tablePage <= 1} className="pagination-btn" aria-label="Previous page"><MdChevronLeft className="w-5 h-5" /></button>
                        <span className="pagination-info">Page {tablePage} of {totalPages}</span>
                        <button type="button" onClick={() => setTablePage(p => Math.min(totalPages, p + 1))} disabled={tablePage >= totalPages} className="pagination-btn" aria-label="Next page"><MdChevronRight className="w-5 h-5" /></button>
                    </div>
                )}
            </section>

            {/* Modals */}
            {uploadModalOpen && !confirmUpload && (
                <UploadModal 
                    onClose={() => setUploadModalOpen(false)} 
                    onSubmit={handleUploadSubmit}
                    form={uploadForm}
                    setForm={setUploadForm}
                    uploading={uploading}
                    uploadError={uploadError}
                    handleFileChange={handleFileChange}
                />
            )}

            {encodeModalOpen && (
                <EncodeModal 
                    onClose={() => setEncodeModalOpen(false)}
                    addRow={addRow}
                    exportExcel={() => exportToExcel(encodedRows, filteredReports)}
                    encodedRows={encodedRows}
                    updateRow={updateRow}
                    removeRow={removeRow}
                    isFinalized={isFinalized}
                    setIsFinalized={setIsFinalized}
                    currentEncoderId={currentEncoderId}
                />
            )}

            {previewReport && (
                <PreviewModal 
                    onClose={() => {
                        if (previewReport.previewBlobUrl && previewReport.previewBlobUrl !== 'failed') URL.revokeObjectURL(previewReport.previewBlobUrl);
                        setPreviewReport(null);
                    }} 
                    previewReport={previewReport} 
                />
            )}

            {/* Confirm Upload Modal */}
            <Modal
                isOpen={!!confirmUpload}
                onClose={() => setConfirmUpload(null)}
                title="Confirm Upload"
                size="md"
            >
                <div className="p-2 space-y-6">
                    <div className="flex items-center gap-4 p-5 bg-blue-50 dark:bg-blue-500/5 rounded-2xl border border-blue-100 dark:border-blue-500/20">
                        <MdUpload className="w-10 h-10 text-blue-600 shrink-0" />
                        <div>
                            <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">Confirm Action</p>
                            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                                {confirmUpload?.message}
                            </p>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={() => setConfirmUpload(null)} className="flex-1 py-3.5 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-xl font-bold uppercase tracking-widest text-[10px] hover:bg-slate-200 transition-colors">
                            Cancel
                        </button>
                        <button 
                            onClick={confirmUpload?.onConfirm} 
                            disabled={uploading} 
                            className="flex-1 py-4 bg-emerald-600/90 hover:bg-emerald-700 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl shadow-emerald-500/20 backdrop-blur-md transition-all active:scale-95 flex items-center justify-center gap-2.5 disabled:opacity-50"
                        >
                            {uploading ? <div className="w-3 h-3 rounded-full border-2 border-white/30 border-t-white animate-spin" /> : <MdUpload className="w-4 h-4" />}
                            Upload
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default Reports;
