import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { documentService, dashboardService, procurementRecordService, getDocumentPreviewUrl, getUploadedFilename, openPreviewTab } from '../../services/api';
import { generatePR_Excel, generatePR_PDFBlob } from '../../utils/prGenerator';
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
import PPMPFolderModal from "./modals/PPMPFolderModal";

const Encode = ({ user }) => {
    const [selectedWorkflowFolder, setSelectedWorkflowFolder] = useState(null);
    const [alertMessage, setAlertMessage] = useState(null);
    const [confirmDialog, setConfirmDialog] = useState(null); // { message, onConfirm }
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [documents, setDocuments] = useState([]);
    const [activeModal, setActiveModal] = useState(null);
    const [selectedDoc, setSelectedDoc] = useState(null);
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

        } catch (e) {
            console.error('Load failed:', e);
            setError(e.message || 'Failed to load documents');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const getAuthHeaders = () => {
        const token = localStorage.getItem('token');
        return token ? { Authorization: `Bearer ${token}` } : {};
    };

    const formatDate = (d) => (!d ? '—' : typeof d === 'string' ? d.split('T')[0] : d);

    const handleView = async (doc) => {
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

        // For Purchase Requests specifically: directly trigger the layout generation in a new tab
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
                
                // Open PR as a PDF in a new standardized preview tab
                const blob = await generatePR_PDFBlob(prData);
                const url = URL.createObjectURL(blob);
                openPreviewTab(url, `Purchase Request ${doc.user_pr_no || doc.ppmp_no}`);
                return;
            } catch (err) {
                console.error('Failed to generate PR preview tab:', err);
                // Fallback: Continue to open the modal
                setSelectedDoc(doc);
                setActiveModal('view');
                return;
            }
        }

        setSelectedDoc(doc);
        setActiveModal('view');
    };

    // Group documents by PPMP No for the Folder view
    const ppmpGroups = useMemo(() => {
        const groups = {};
        documents.forEach(doc => {
            const ppmp = (doc.ppmp_no || 'Unassigned').trim();
            if (!groups[ppmp]) groups[ppmp] = [];
            groups[ppmp].push(doc);
        });
        return groups;
    }, [documents]);

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
