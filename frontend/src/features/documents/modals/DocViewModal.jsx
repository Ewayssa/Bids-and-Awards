import React, { useEffect, useMemo, useState } from 'react';
import {
    MdAssignment,
    MdCheckCircle,
    MdClose,
    MdCloudUpload,
    MdPictureAsPdf
} from 'react-icons/md';
import Modal from '../../../components/Modal';
import { getDocumentPreviewUrl } from '../../../services/api';
import { generatePR_PDFBlob } from '../../../utils/prGenerator';

const DocViewModal = ({
    doc,
    onClose,
    onUploadMissing
}) => {
    const currentDoc = doc || {};

    const [activePreviewId, setActivePreviewId] = useState(currentDoc.id);
    const [generatedPrPreviewUrl, setGeneratedPrPreviewUrl] = useState(null);

    const isPR = useMemo(() => {
        return currentDoc.subDoc === 'Purchase Request' || currentDoc.grand_total !== undefined;
    }, [currentDoc]);

    const requiredSupportingDocs = useMemo(() => {
        if (isPR) {
            return [
                { subDoc: 'Activity Design', label: 'Activity Design', aliases: ['Activity Design'] },
                { subDoc: 'Requisition and Issue Slip', label: 'RIS', aliases: ['Requisition and Issue Slip', 'RIS'] },
                { subDoc: 'Market Scoping', label: 'Market Scoping', aliases: ['Market Scoping', 'Market Scoping / Canvass'] }
            ];
        }
        return [];
    }, [isPR]);

    const supportDocLabels = useMemo(() => ({
        'Purchase Request': 'Purchase Request',
        'Activity Design': 'Activity Design',
        'Requisition and Issue Slip': 'RIS',
        'RIS': 'RIS',
        'Market Scoping': 'Market Scoping',
        'Market Scoping / Canvass': 'Market Scoping'
    }), []);

    const isGeneratedPRFile = (target) => {
        if (!target) return false;
        const targetIsPR = target.subDoc === 'Purchase Request' || target.grand_total !== undefined;
        if (!targetIsPR) return false;
        // Check for either legacy or new structured fields
        return !!(target.pr_items || target.items || target.total_amount || target.grand_total || target.title || target.purpose || target.ppmp_no);
    };
    const hasUploadedFile = (target) => !!(target?.file_url || target?.file || isGeneratedPRFile(target));
    
    // Normalization helpers
    const getNormalizedTotal = (target) => target?.grand_total || target?.total_amount || 0;
    const getNormalizedItems = (target) => {
        if (!target) return [];
        if (target.items) return target.items;
        try {
            return typeof target.pr_items === 'string' ? JSON.parse(target.pr_items || '[]') : (target.pr_items || []);
        } catch (e) {
            return [];
        }
    };
    const getNormalizedPrNo = (target) => target?.pr_no || target?.user_pr_no || target?.prNo || 'Pending';
    const getNormalizedTitle = (target) => target?.purpose || target?.title || 'General Procurement';

    const matchesRequiredDoc = (docItem, required) => {
        if (!docItem || !required) return false;
        const aliases = required.aliases || [required.subDoc];
        return aliases.some(alias => docItem.subDoc === alias || (docItem.subDoc || '').includes(alias));
    };


    const items = getNormalizedItems(currentDoc);
    const totalAmount = getNormalizedTotal(currentDoc);
    const prNo = getNormalizedPrNo(currentDoc);
    const title = getNormalizedTitle(currentDoc);

    const relatedDocuments = useMemo(() => {
        const docs = Array.isArray(currentDoc.related_documents) ? currentDoc.related_documents : [currentDoc];
        const byId = new Map();
        docs.forEach(item => {
            if (item?.id) byId.set(item.id, item);
        });
        if (currentDoc.id) byId.set(currentDoc.id, currentDoc);
        return Array.from(byId.values());
    }, [currentDoc]);

    const documentsForPreview = useMemo(() => {
        const wanted = new Set(requiredSupportingDocs.map(item => item.subDoc));
        
        // Filter to relevant docs
        const filtered = relatedDocuments.filter(item => (
            item.id === currentDoc.id
            || wanted.has(item.subDoc)
            || requiredSupportingDocs.some(required => matchesRequiredDoc(item, required))
            || hasUploadedFile(item)
        ));

        // De-duplicate by subDoc name to avoid double "Purchase Request" etc.
        const deDuped = new Map();
        
        filtered.forEach(docItem => {
            const label = docItem.subDoc || (docItem.grand_total !== undefined ? 'Purchase Request' : 'Other');
            // If we already have this type, only replace if the new one has a file
            if (!deDuped.has(label) || (!hasUploadedFile(deDuped.get(label)) && hasUploadedFile(docItem))) {
                deDuped.set(label, docItem);
            }
        });

        const previewDocs = Array.from(deDuped.values());

        // Add missing placeholders
        requiredSupportingDocs.forEach(required => {
            const existing = previewDocs.some(item => matchesRequiredDoc(item, required));
            if (!existing) {
                previewDocs.push({
                    id: `missing-${required.subDoc}`,
                    subDoc: required.subDoc,
                    label: required.label,
                    isMissingPlaceholder: true
                });
            }
        });

        return previewDocs;
    }, [relatedDocuments, requiredSupportingDocs, currentDoc.id]);

    useEffect(() => {
        const selectedDoc = documentsForPreview.find(item => item.id === activePreviewId);
        if (selectedDoc && hasUploadedFile(selectedDoc)) return;

        const firstUploadedDoc = documentsForPreview.find(item => hasUploadedFile(item));
        setActivePreviewId(firstUploadedDoc?.id || documentsForPreview[0]?.id || null);
    }, [documentsForPreview, activePreviewId]);

    const getPreviewUrl = (target) => {
        if (!target) return null;
        if (isGeneratedPRFile(target)) {
            return generatedPrPreviewUrl;
        }
        if (target.id && hasUploadedFile(target)) {
            return `${getDocumentPreviewUrl(target.id)}?v=${Date.now()}`;
        }

        let url = target.file_url || target.file;
        if (!url || typeof url !== 'string' || url.includes('/api/')) return null;

        if (url.includes('/media/')) {
            url = `/media/${url.split('/media/')[1]}`;
        } else if (!url.startsWith('http') && !url.startsWith('/')) {
            url = `/media/${url}`;
        } else if (url.startsWith('http')) {
            try {
                const parsed = new URL(url);
                if (parsed.hostname.includes('localhost') || parsed.hostname.includes('127.0.0.1')) {
                    url = parsed.pathname + parsed.search;
                }
            } catch (e) {}
        }

        return `${url}${url.includes('?') ? '&' : '?'}v=${Date.now()}`;
    };

    const activePreviewDoc = documentsForPreview.find(item => item.id === activePreviewId) || documentsForPreview[0] || null;

    useEffect(() => {
        let cancelled = false;
        let objectUrl = null;

        const buildGeneratedPreview = async () => {
            if (!activePreviewDoc || !isGeneratedPRFile(activePreviewDoc)) {
                setGeneratedPrPreviewUrl(null);
                return;
            }

            const blob = await generatePR_PDFBlob({
                items: getNormalizedItems(activePreviewDoc),
                total: getNormalizedTotal(activePreviewDoc),
                ppmp_no: activePreviewDoc.ppmp_no,
                prNo: getNormalizedPrNo(activePreviewDoc),
                title: getNormalizedTitle(activePreviewDoc),
                office: activePreviewDoc.end_user_office || '',
                date: activePreviewDoc.date || activePreviewDoc.uploaded_at
            });

            if (cancelled) return;
            objectUrl = URL.createObjectURL(blob);
            setGeneratedPrPreviewUrl(objectUrl);
        };

        buildGeneratedPreview().catch(() => setGeneratedPrPreviewUrl(null));

        return () => {
            cancelled = true;
            if (objectUrl) URL.revokeObjectURL(objectUrl);
        };
    }, [activePreviewDoc?.id, activePreviewDoc?.file_url, activePreviewDoc?.file, activePreviewDoc?.pr_items, activePreviewDoc?.items, activePreviewDoc?.total_amount, activePreviewDoc?.grand_total]);

    const previewUrl = getPreviewUrl(activePreviewDoc);
    const previewFrameUrl = previewUrl ? `${previewUrl}#toolbar=0&navpanes=0&scrollbar=0&view=FitH` : null;
    const formatMoney = (value) => `PHP ${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    if (!doc) return null;

    const isMissingAnyDoc = useMemo(() => {
        return documentsForPreview.some(doc => doc.isMissingPlaceholder);
    }, [documentsForPreview]);

    const displayStatus = useMemo(() => {
        if (isPR) {
            return isMissingAnyDoc ? 'ONGOING' : 'COMPLETE';
        }
        return currentDoc.status || 'ACTIVE';
    }, [isPR, currentDoc.status, isMissingAnyDoc]);

    return (
        <Modal
            isOpen={true}
            onClose={onClose}
            title={currentDoc.title || 'Document View'}
            size="2xl"
            header={<></>}
            containerClassName="!h-[86vh] !max-h-[86vh] overflow-hidden !max-w-7xl !rounded-2xl"
            bodyClassName="!p-0 !overflow-hidden min-h-0 !flex !flex-col w-full"
        >
            <div className="flex-1 min-h-0 w-full flex flex-col bg-slate-100 dark:bg-slate-950 overflow-hidden">
                <header className="h-[76px] bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4 px-5 sm:px-7 shrink-0 z-20">
                    <div className="flex items-center gap-4 min-w-0">
                        <div className="w-11 h-11 bg-emerald-600 rounded-xl flex items-center justify-center text-white shadow-sm shrink-0">
                            <MdAssignment className="w-6 h-6" />
                        </div>
                        <div className="min-w-0">
                            <div className="flex items-center gap-3 min-w-0">
                                <h2 className="text-[15px] font-black text-slate-950 dark:text-white uppercase tracking-[0.16em] truncate">
                                    {isPR || currentDoc.ppmp_no ? (currentDoc.prNo || currentDoc.pr_no || 'No PR No. Assigned') : (currentDoc.subDoc || 'Document')}
                                </h2>
                                <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest shrink-0 ${displayStatus === 'COMPLETE' ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' : 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400'}`}>
                                    {displayStatus}
                                </span>
                            </div>
                            <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mt-1 truncate">
                                PR No. {prNo} / {title}
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={onClose}
                        className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all active:scale-95 border border-slate-200 dark:border-slate-700 shrink-0"
                    >
                        <MdClose className="w-5 h-5" />
                    </button>
                </header>

                <div className="flex-1 min-h-0 flex flex-col lg:flex-row overflow-hidden">
                    <aside className="w-full lg:w-[380px] shrink-0 bg-white dark:bg-slate-900 border-b lg:border-b-0 lg:border-r border-slate-200 dark:border-slate-800 flex flex-col min-h-0">
                        <div className="p-5 sm:p-6 border-b border-slate-200 dark:border-slate-800">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3">
                                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Total</p>
                                    <p className="mt-1 text-sm font-black text-emerald-700 dark:text-emerald-400 truncate">
                                        {formatMoney(totalAmount)}
                                    </p>
                                </div>
                                <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3">
                                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Items</p>
                                    <p className="mt-1 text-sm font-black text-slate-900 dark:text-white">
                                        {items.length}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
                            <section className="p-5 sm:p-6 border-b border-slate-200 dark:border-slate-800">
                                <div className="flex items-center justify-between gap-3 mb-4">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0">
                                            <MdAssignment className="w-4 h-4" />
                                        </div>
                                        <div className="min-w-0">
                                            <h3 className="text-[10px] font-black text-slate-900 dark:text-slate-100 uppercase tracking-[0.18em]">Bill of Quantities</h3>
                                            <p className="text-[10px] font-bold text-slate-400 mt-0.5">Line item summary</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    {items.length > 0 ? items.map((item, idx) => {
                                        const rowTotal = (Number(item.quantity) || 0) * (Number(item.unit_cost) || 0);
                                        return (
                                            <div key={idx} className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-3 transition-colors hover:border-emerald-200 dark:hover:border-emerald-500/30">
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="min-w-0">
                                                        <p className="text-[11px] font-black text-slate-900 dark:text-slate-100 leading-relaxed">
                                                            {item.description || 'Untitled item'}
                                                        </p>
                                                        <p className="mt-1 text-[9px] font-black uppercase tracking-widest text-slate-400">
                                                            {item.quantity || 0} {item.unit || 'unit'} x {formatMoney(item.unit_cost)}
                                                        </p>
                                                    </div>
                                                    <p className="text-[11px] font-black text-emerald-700 dark:text-emerald-400 text-right shrink-0">
                                                        {formatMoney(rowTotal)}
                                                    </p>
                                                </div>
                                            </div>
                                        );
                                    }) : (
                                        <div className="rounded-lg border border-dashed border-slate-200 dark:border-slate-800 p-6 text-center">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No line items available</p>
                                        </div>
                                    )}
                                </div>
                            </section>

                            <section className="p-5 sm:p-6">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-9 h-9 rounded-lg bg-red-50 dark:bg-red-500/10 text-red-500 flex items-center justify-center shrink-0">
                                        <MdPictureAsPdf className="w-4 h-4" />
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className="text-[10px] font-black text-slate-900 dark:text-slate-100 uppercase tracking-[0.18em]">Files</h3>
                                        <p className="text-[10px] font-bold text-slate-400 mt-0.5">Select a document to preview</p>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    {documentsForPreview.length > 0 ? documentsForPreview.map(item => {
                                        const hasFile = hasUploadedFile(item);
                                        const isActive = activePreviewDoc?.id === item.id;
                                        return (
                                            <div
                                                key={item.id}
                                                onClick={() => setActivePreviewId(item.id)}
                                                role="button"
                                                tabIndex={0}
                                                onKeyDown={(event) => {
                                                    if (event.key === 'Enter' || event.key === ' ') setActivePreviewId(item.id);
                                                }}
                                                className={`w-full min-h-[62px] rounded-lg border px-3 py-2.5 text-left transition-all ${
                                                    isActive
                                                        ? 'border-emerald-300 dark:border-emerald-500/40 bg-emerald-50 dark:bg-emerald-500/10 shadow-sm'
                                                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 hover:border-slate-300 dark:hover:border-slate-700'
                                                }`}
                                            >
                                                <div className="flex items-center justify-between gap-3">
                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex items-center gap-2">
                                                            <span className={`text-[8px] font-black uppercase tracking-widest ${isActive ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-400'}`}>
                                                                {hasFile ? 'Uploaded' : 'Missing'}
                                                            </span>
                                                            {hasFile && <MdCheckCircle className={`w-3 h-3 shrink-0 ${isActive ? 'text-emerald-600' : 'text-emerald-500/60'}`} />}
                                                        </div>
                                                        <h5 className={`mt-1 text-[11px] font-black truncate ${isActive ? 'text-slate-950 dark:text-white' : 'text-slate-600 dark:text-slate-300'}`}>
                                                            {item.label || supportDocLabels[item.subDoc] || item.subDoc || (item.grand_total !== undefined ? 'Purchase Request' : (item.title || 'Untitled Document'))}
                                                        </h5>
                                                    </div>
                                                    {!hasFile && (
                                                        <button
                                                            type="button"
                                                            onClick={(event) => {
                                                                event.stopPropagation();
                                                                onUploadMissing?.(item.subDoc, null);
                                                            }}
                                                            className="shrink-0 inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-[9px] font-black uppercase tracking-widest transition-all bg-amber-50 text-amber-600 hover:bg-amber-100 dark:bg-amber-500/10 dark:text-amber-300 dark:hover:bg-amber-500/20 shadow-sm"
                                                            title="Upload Document"
                                                        >
                                                            <MdCloudUpload className="w-4 h-4" />
                                                            <span>Upload</span>
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    }) : (
                                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-300">No supporting files</p>
                                    )}
                                </div>
                            </section>
                        </div>

                    </aside>

                    <main className="flex-1 min-w-0 min-h-0 bg-slate-100 dark:bg-slate-950 flex flex-col overflow-hidden">
                        <div className="h-16 flex items-center justify-between gap-3 px-5 sm:px-7 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                                    <MdPictureAsPdf className="w-5 h-5 text-red-500" />
                                </div>
                                <div className="min-w-0">
                                    <h3 className="text-xs font-black text-slate-900 dark:text-slate-100 uppercase tracking-[0.18em]">File Preview</h3>
                                    <p className="text-[10px] font-bold text-slate-400 truncate">
                                        {activePreviewDoc ? (supportDocLabels[activePreviewDoc.subDoc] || activePreviewDoc.subDoc || (activePreviewDoc.grand_total !== undefined ? 'Purchase Request' : '')) : 'Supporting documents'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="flex-1 min-h-0 p-4 sm:p-5 overflow-hidden">
                            <div className="h-full relative rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
                                {previewFrameUrl ? (
                                    <div className="absolute inset-0 bg-slate-100 dark:bg-slate-950">
                                        <object
                                            src={previewFrameUrl}
                                            data={previewFrameUrl}
                                            type="application/pdf"
                                            className="block w-full h-full border-0 bg-white animate-in fade-in duration-300"
                                            title={`${activePreviewDoc?.subDoc || 'Document'} Preview`}
                                        >
                                            <iframe
                                                src={previewFrameUrl}
                                                className="block w-full h-full border-0 bg-white"
                                                title={`${activePreviewDoc?.subDoc || 'Document'} Preview`}
                                            />
                                            <div className="h-full flex flex-col items-center justify-center p-8 text-center bg-white dark:bg-slate-950">
                                                <p className="text-[11px] font-black text-slate-800 dark:text-slate-200 uppercase tracking-widest">
                                                    Preview unavailable
                                                </p>
                                                <a
                                                    href={previewUrl}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="mt-3 text-[10px] font-black uppercase tracking-widest text-emerald-600 hover:text-emerald-700"
                                                >
                                                    Open file
                                                </a>
                                            </div>
                                        </object>
                                    </div>
                                ) : (
                                    <div className="h-full flex flex-col items-center justify-center p-12 text-center space-y-5 bg-white dark:bg-slate-950">
                                        <div className="w-16 h-16 bg-amber-50 dark:bg-amber-500/10 rounded-xl flex items-center justify-center">
                                            <MdCloudUpload className="w-8 h-8 text-amber-500/60" />
                                        </div>
                                        <div className="space-y-2">
                                            <p className="text-[12px] font-black text-slate-800 dark:text-slate-200 uppercase tracking-widest">
                                                {activePreviewDoc ? `${supportDocLabels[activePreviewDoc.subDoc] || activePreviewDoc.subDoc} Not Uploaded` : 'No Supporting File Selected'}
                                            </p>
                                            <p className="text-[11px] font-bold text-slate-400 leading-relaxed max-w-[240px] mx-auto">
                                                {activePreviewDoc ? 'Upload the file to make it available for preview.' : 'Use the upload menu to add supporting documents.'}
                                            </p>
                                        </div>
                                        {activePreviewDoc && (
                                            <button
                                                onClick={() => onUploadMissing(activePreviewDoc.subDoc, null)}
                                                className="px-6 py-3 bg-slate-900 dark:bg-emerald-600 text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-sm"
                                            >
                                                Upload Now
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </main>
                </div>
            </div>
        </Modal>
    );
};

export default DocViewModal;
