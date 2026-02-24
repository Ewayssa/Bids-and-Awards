import React, { useState, useEffect, useMemo } from 'react';
import { reportService } from '../services/api';
import { ROLES } from '../utils/roles';
import { MdUpload, MdClose, MdDownload } from 'react-icons/md';
import PageHeader from '../components/PageHeader';

const Reports = ({ user }) => {
    const isAdmin = user?.role === ROLES.ADMIN;
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
    const [previewReport, setPreviewReport] = useState(null); // { title, file_url, previewBlobUrl, previewBlobType }
    const [filters, setFilters] = useState({
        date_from: '',
        date_to: '',
    });

    const load = async () => {
        try {
            const data = await reportService.getAll();
            const list = Array.isArray(data) ? data : (data?.results ?? []);
            setReports(list);
        } catch (e) {
            setReports([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, []);

    const formatDate = (d) => {
        if (!d) return '—';
        const str = typeof d === 'string' ? d : (d.toISO && d.toISOString ? d.toISOString() : String(d));
        return str.split('T')[0];
    };


    const filteredReports = useMemo(() => {
        return reports.filter((r) => {
            const dateStr = formatDate(r.uploaded_at);
            if (filters.date_from && dateStr < filters.date_from) return false;
            if (filters.date_to && dateStr > filters.date_to) return false;
            return true;
        });
    }, [reports, filters]);

    const hasActiveFilters = !!(filters.date_from || filters.date_to);
    const clearFilters = () => setFilters({ date_from: '', date_to: '' });

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
        setForm((prev) => ({ ...prev, file: file || null }));
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

    const openPreview = async (r) => {
        if (!r?.file_url) return;
        setPreviewReport({ title: r.title || 'Report Preview', file_url: r.file_url, previewBlobUrl: null, previewBlobType: null });
        const tryFetch = async (url) => {
            const res = await fetch(url, { credentials: 'include' });
            if (!res.ok) throw new Error(`Failed to load: ${res.status}`);
            return res;
        };
        try {
            const fetchUrl = getFetchUrl(r.file_url);
            let res;
            try {
                res = await tryFetch(fetchUrl);
            } catch {
                res = await tryFetch(r.file_url);
            }
            const contentType = res.headers.get('content-type') || '';
            const blob = await res.blob();
            const blobType = blob.type || (contentType.split(';')[0].trim()) || 'application/octet-stream';
            const blobForView = blob.type ? blob : new Blob([blob], { type: blobType });
            const blobUrl = URL.createObjectURL(blobForView);
            setPreviewReport((prev) => prev ? { ...prev, previewBlobUrl: blobUrl, previewBlobType: blobType } : null);
        } catch (err) {
            console.error('Preview failed:', err);
            setPreviewReport((prev) => prev ? { ...prev, previewBlobUrl: 'failed' } : null);
        }
    };

    const closePreview = () => {
        if (previewReport?.previewBlobUrl && previewReport.previewBlobUrl !== 'failed') {
            URL.revokeObjectURL(previewReport.previewBlobUrl);
        }
        setPreviewReport(null);
    };

    const getSuggestedExt = (url) => {
        if (!url || typeof url !== 'string') return '.pdf';
        const m = url.match(/\.([a-z0-9]+)(?:\?|$)/i);
        return m ? `.${m[1].toLowerCase()}` : '.pdf';
    };

    const triggerDownload = async (r, { blob: existingBlob, blobUrl } = {}) => {
        if (!r?.file_url && !blobUrl) return;
        const ext = getSuggestedExt(r?.file_url || blobUrl);
        const base = r?.title ? `${r.title.replace(/[/\\?%*:|"<>]/g, '_')}` : 'report';
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
            let filename = r?.title ? `${r.title.replace(/[/\\?%*:|"<>]/g, '_')}` : 'report';
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
            console.error('Download failed:', err);
            if (r?.file_url) window.open(r.file_url, '_blank', 'noopener');
        }
    };

    return (
        <div className="space-y-6">
            <PageHeader
                title="Reports"
                subtitle="Upload and view all reports in the system."
            />

            {uploadSuccess && (
                <div className="p-4 rounded-xl bg-green-50 border border-green-200 text-green-800 text-sm shadow-sm transition-all duration-300 ease-out">
                    {uploadSuccess}
                </div>
            )}

            {/* Reports Table */}
            <section className="card overflow-hidden">
                <div className="px-4 sm:px-6 py-4 border-b border-[var(--border-light)] bg-[var(--background-subtle)]/50">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="min-w-0 flex-1 overflow-hidden">
                            <h2 className="text-base sm:text-lg font-semibold text-[var(--text)] truncate block">All Uploaded Reports</h2>
                            {hasActiveFilters && (
                                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                                    Showing {filteredReports.length} of {reports.length} report{reports.length !== 1 ? 's' : ''}
                                </p>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => { setUploadSuccess(''); setUploadModalOpen(true); }}
                                className="inline-flex items-center gap-1.5 rounded-lg text-sm py-2 px-3 bg-green-600 hover:bg-green-700 text-white font-medium transition-colors"
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
                                className="input-field py-1.5 text-xs px-2 min-w-[120px]"
                            />
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                            <label className="text-xs text-[var(--text-muted)] shrink-0">To</label>
                            <input
                                type="date"
                                value={filters.date_to}
                                onChange={(e) => setFilters((f) => ({ ...f, date_to: e.target.value }))}
                                className="input-field py-1.5 text-xs px-2 min-w-[120px]"
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
                <div className="overflow-x-auto table-scroll-wrap table-fit">
                    <table className="min-w-full divide-y divide-[var(--border)] border-collapse text-sm w-full table-fixed">
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
                                    <td colSpan={isAdmin ? 5 : 4} className="px-4 py-12 text-center">
                                        <div className="flex flex-col items-center justify-center text-[var(--text-muted)]">
                                            <div className="w-10 h-10 rounded-full border-2 border-[var(--border)] border-t-[var(--primary)] animate-spin mb-3" aria-hidden />
                                            <span className="text-sm">Loading reports…</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : reports.length === 0 ? (
                                <tr>
                                    <td colSpan={isAdmin ? 5 : 4} className="px-4 py-12 text-center">
                                        <p className="text-[var(--text-muted)] font-medium">No reports uploaded yet</p>
                                        <p className="text-sm text-[var(--text-subtle)] mt-1">Use &apos;Upload Report&apos; to add one.</p>
                                    </td>
                                </tr>
                            ) : filteredReports.length === 0 ? (
                                <tr>
                                    <td colSpan={isAdmin ? 5 : 4} className="px-4 py-12 text-center text-[var(--text-muted)]">
                                        No reports match your filters. <button type="button" onClick={clearFilters} className="text-[var(--primary)] hover:underline font-medium mt-1 inline-block">Clear filters</button>
                                    </td>
                                </tr>
                            ) : (
                                filteredReports.map((r) => (
                                    <tr key={r.id} className="hover:bg-[var(--background-subtle)]/50 transition-all duration-300 ease-out group">
                                        <td className="table-td font-medium">{r.title || '—'}</td>
                                        <td className="table-td-muted">{r.submitting_office || '—'}</td>
                                        <td className="table-td-muted">{r.uploadedBy || '—'}</td>
                                        <td className="table-td-muted">{formatDate(r.uploaded_at)}</td>
                                        {isAdmin && (
                                            <td className="table-td whitespace-nowrap">
                                                {r.file_url ? (
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
            </section>

            {/* Upload Report modal */}
            {uploadModalOpen && !confirmUpload && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
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
                                    accept=".pdf,.doc,.docx,.xls,.xlsx,.csv"
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

            {/* Preview modal - shows file first, then user can download */}
            {previewReport && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
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
                        <div className="flex-1 overflow-auto bg-gray-100 p-4">
                            {previewReport.previewBlobUrl === 'failed' ? (
                                <div className="flex flex-col items-center justify-center h-64 text-[var(--text-muted)] gap-2">
                                    <p>Could not load preview.</p>
                                    <button
                                        type="button"
                                        onClick={() => triggerDownload({ file_url: previewReport.file_url, title: previewReport.title })}
                                        className="btn-secondary inline-flex items-center gap-2"
                                    >
                                        <MdDownload className="w-4 h-4" />
                                        Download instead
                                    </button>
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
                                                title="Report Preview"
                                            />
                                        );
                                    }
                                    if (isImage) {
                                        return (
                                            <img
                                                src={previewReport.previewBlobUrl}
                                                alt={previewReport.title}
                                                className="max-w-full max-h-[70vh] object-contain mx-auto"
                                            />
                                        );
                                    }
                                    return (
                                        <div className="flex flex-col items-center justify-center h-64 text-[var(--text-muted)] gap-3">
                                            <p>This file type cannot be previewed in the browser.</p>
                                            <p className="text-sm">Use the <strong>Download</strong> button below to save the file.</p>
                                        </div>
                                    );
                                })()
                            ) : (
                                <div className="flex flex-col items-center justify-center h-64 text-[var(--text-muted)]">
                                    <div className="w-10 h-10 rounded-full border-2 border-[var(--border)] border-t-[var(--primary)] animate-spin mb-3" aria-hidden />
                                    <span>Loading preview…</span>
                                </div>
                            )}
                        </div>
                        <div className="p-4 border-t border-[var(--border-light)] bg-[var(--surface)] flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => triggerDownload(
                                    { file_url: previewReport.file_url, title: previewReport.title },
                                    previewReport.previewBlobUrl && previewReport.previewBlobUrl !== 'failed' ? { blobUrl: previewReport.previewBlobUrl } : {}
                                )}
                                className="btn-secondary inline-flex items-center gap-2"
                            >
                                <MdDownload className="w-4 h-4" />
                                Download
                            </button>
                            <button
                                type="button"
                                onClick={closePreview}
                                className="btn-primary"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Confirm upload dialog */}
            {confirmUpload && (
                <div
                    className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
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
