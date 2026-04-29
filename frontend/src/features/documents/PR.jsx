import React, { useState, useEffect, useMemo } from 'react';
import PageHeader from '../../components/PageHeader';
import { MdReceipt, MdAdd, MdCheck, MdClose, MdVisibility, MdDownload } from 'react-icons/md';
import { ROLES } from '../../utils/auth';
import CreatePRModal from './modals/CreatePRModal';
import DocViewModal from './modals/DocViewModal';
import DocUploadModal from './modals/DocUploadModal';
import AlertModal from './modals/AlertModal';
import { generatePR_Excel } from '../../utils/prGenerator';
import { documentService, getDocumentPreviewUrl, getUploadedFilename, openPreviewTab } from '../../services/api';

const PR = ({ user }) => {
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [prs, setPrs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedDoc, setSelectedDoc] = useState(null);
    const [uploadingMissingType, setUploadingMissingType] = useState(null);
    const [selectedFileForUpload, setSelectedFileForUpload] = useState(null);
    const [editingPrId, setEditingPrId] = useState(null);
    const [assignValue, setAssignValue] = useState('');
    const [assigning, setAssigning] = useState(false);

    const isAdmin = user?.role === ROLES.ADMIN;
    const isMember = user?.role === ROLES.MEMBER;
    const canAssignPR = isAdmin || isMember;

    const loadPRWithRelatedDocs = async (item) => {
        let relatedDocuments = [];

        try {
            if (item.ppmp_no) {
                relatedDocuments = await documentService.getAll({ ppmp_no: item.ppmp_no });
            } else if (item.prNo) {
                relatedDocuments = await documentService.getAll({ prNo: item.prNo });
            }
        } catch (err) {
            console.error('Failed to load related PR documents:', err);
        }

        const hasSelf = relatedDocuments.some(doc => doc.id === item.id);
        return {
            ...item,
            related_documents: hasSelf ? relatedDocuments : [item, ...relatedDocuments]
        };
    };

    const handleView = async (item) => {
        const hydrated = await loadPRWithRelatedDocs(item);
        setSelectedDoc(hydrated);
    };

    const refreshSelectedDoc = async (fallbackDoc = selectedDoc) => {
        if (!fallbackDoc) return;
        const data = await documentService.getAll({ subDoc: 'Purchase Request' });
        setPrs(data);
        const updated = data.find(p => p.id === fallbackDoc.id) || fallbackDoc;
        setSelectedDoc(await loadPRWithRelatedDocs(updated));
    };

    const handleQuickView = (item) => {
        try {
            if (item.id && item.file_url) {
                openPreviewTab(getDocumentPreviewUrl(item.id), getUploadedFilename(item));
            } else {
                // Defensive parsing for pr_items
                let items = [];
                try {
                    if (typeof item.pr_items === 'string' && item.pr_items.trim()) {
                        items = JSON.parse(item.pr_items);
                    } else if (Array.isArray(item.pr_items)) {
                        items = item.pr_items;
                    }
                } catch (e) {
                    console.error('Data parsing error:', e);
                }

                const prData = {
                    items: items,
                    total: item.total_amount,
                    ppmp_no: item.ppmp_no,
                    prNo: item.user_pr_no || '',
                    title: item.title,
                    office: item.end_user_office || ''
                };
                generatePR_Excel(prData);
            }
        } catch (err) {
            console.error('Quick view failed:', err);
            // Fallback: Open the modal if generation fails
            setSelectedDoc(item);
        }
    };

    const fetchPRs = async () => {
        setLoading(true);
        try {
            const data = await documentService.getAll({ 
                subDoc: 'Purchase Request'
            });
            
            const relatedData = await documentService.getAll({
                category: 'Initial Documents'
            });
            
            const enhancedData = data.map(pr => {
                const prDocs = relatedData.filter(d => 
                    (d.ppmp_no && pr.ppmp_no && d.ppmp_no === pr.ppmp_no) || 
                    (d.prNo && pr.prNo && d.prNo === pr.prNo) ||
                    (d.id === pr.id)
                );
                const hasAD = prDocs.some(d => d.subDoc === 'Activity Design' && (d.file || d.file_url));
                const hasRIS = prDocs.some(d => (d.subDoc === 'Requisition and Issue Slip' || d.subDoc === 'RIS') && (d.file || d.file_url));
                const hasMS = prDocs.some(d => (d.subDoc === 'Market Scoping' || d.subDoc === 'Market Scoping / Canvass') && (d.file || d.file_url));
                
                const isComplete = hasAD && hasRIS && hasMS;
                return {
                    ...pr,
                    displayStatus: isComplete ? 'COMPLETE' : 'ONGOING'
                };
            });
            
            setPrs(enhancedData);
        } catch (err) {
            console.error('Failed to fetch PRs:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleAssignPR = async (item) => {
        if (item.user_pr_no || !assignValue.trim() || assigning) return;
        setAssigning(true);
        try {
            await documentService.assignPRNo(item.id, assignValue.trim());
            await fetchPRs();
            setEditingPrId(null);
            setAssignValue('');
        } catch (err) {
            console.error('Failed to assign PR No.:', err);
            alert(err.response?.data?.error || 'Failed to assign PR No. Please check if the number is already used.');
        } finally {
            setAssigning(false);
        }
    };

    const startAssigning = (item) => {
        if (item.user_pr_no) return;
        setEditingPrId(item.id);
        setAssignValue('');
    };


    useEffect(() => {
        fetchPRs();
    }, []);



    return (
        <div className="min-h-full pb-12">
            <PageHeader
                title="Purchase Request"
                subtitle="Manage and track Purchase Requests."
            >
                {user?.role !== ROLES.VIEWER && (
                    <button 
                        type="button" 
                        onClick={() => setShowCreateModal(true)} 
                        className="px-6 py-2.5 bg-emerald-600/90 hover:bg-emerald-700 text-white rounded-xl font-bold uppercase tracking-wider text-[11px] shadow-sm transition-all active:scale-95 flex items-center gap-2"
                    >
                        <MdAdd className="w-5 h-5" />
                        <span>New PR</span>
                    </button>
                )}
            </PageHeader>



            <div className="content-section overflow-hidden rounded-xl w-full max-w-[96rem] mx-auto min-w-0 p-0 shadow-lg shadow-slate-200/50">


                {prs.length > 0 ? (
                    <div className="bg-white dark:bg-slate-900 overflow-x-auto min-h-[400px]">
                                <table className="w-full border-separate border-spacing-0 table-fixed bg-white dark:bg-slate-900 shadow-sm rounded-xl overflow-hidden text-center">
                                    <colgroup>
                                        <col className="w-[20%]" />
                                        <col className="w-[25%]" />
                                        <col className="w-[20%]" />
                                        <col className="w-[35%]" />
                                    </colgroup>
                                    <thead className="table-header">
                                        <tr>
                                            <th className="table-th !text-center !px-4">PR No.</th>
                                            <th className="table-th !text-center !px-4">PPMP No.</th>
                                            <th className="table-th !text-center !px-4">Status</th>
                                            <th className="table-th !text-center !px-4">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {prs.map((item, idx) => {
                                            return (
                                                <tr key={idx} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-all duration-300 group">
                                                    <td className="table-td !text-center !px-4 !py-3 border-b border-slate-50 dark:border-slate-800/50">
                                                        <button 
                                                            onClick={() => handleQuickView(item)}
                                                            className={`text-xs font-black transition-all truncate text-center hover:text-slate-900 dark:hover:text-white block w-full ${item.user_pr_no ? 'text-slate-800 dark:text-slate-200' : 'text-slate-400 italic'}`}
                                                        >
                                                            {item.user_pr_no || 'No PR No. Assigned'}
                                                        </button>
                                                    </td>
                                                    <td className="table-td !text-center !px-4 !py-3 border-b border-slate-50 dark:border-slate-800/50">
                                                        <span className="inline-block px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-black rounded-lg border border-slate-200 dark:border-slate-700 font-mono">
                                                            {item.ppmp_no || 'UNLINKED'}
                                                        </span>
                                                    </td>
                                                    <td className="table-td !text-center !px-4 !py-3 border-b border-slate-50 dark:border-slate-800/50">
                                                        <span className={`inline-block px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                                                            item.displayStatus === 'COMPLETE' 
                                                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' 
                                                                : 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400'
                                                        }`}>
                                                            {item.displayStatus || 'ONGOING'}
                                                        </span>
                                                    </td>
                                                    <td className="table-td !text-center !px-3 !py-3 border-b border-slate-50 dark:border-slate-800/50 min-w-[280px]">
                                                        <div className="flex flex-wrap justify-center items-center gap-2">
                                                            {editingPrId === item.id && !item.user_pr_no ? (
                                                                <div className="flex items-center justify-center gap-1.5 animate-in slide-in-from-right duration-200">
                                                                    <input
                                                                        autoFocus
                                                                        type="text"
                                                                        value={assignValue}
                                                                        onChange={(e) => setAssignValue(e.target.value)}
                                                                        className="h-8 w-24 px-2 bg-white border-2 border-emerald-500 rounded text-[10px] font-black focus:outline-none focus:ring-4 focus:ring-emerald-500/10"
                                                                        placeholder="PR No."
                                                                    />
                                                                    <button
                                                                        disabled={assigning || !assignValue.trim()}
                                                                        onClick={() => handleAssignPR(item)}
                                                                        className="w-8 h-8 flex items-center justify-center bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-all active:scale-90 shadow-sm"
                                                                    >
                                                                        {assigning ? <div className="w-3 h-3 border-2 border-white/30 border-t-white animate-spin rounded-full" /> : <MdCheck className="w-5 h-5" />}
                                                                    </button>
                                                                    <button
                                                                        onClick={() => setEditingPrId(null)}
                                                                        className="w-8 h-8 flex items-center justify-center bg-slate-100 text-slate-400 rounded-lg hover:bg-slate-200 transition-all active:scale-90"
                                                                    >
                                                                        <MdClose className="w-5 h-5" />
                                                                    </button>
                                                                </div>
                                                            ) : (
                                                                canAssignPR && !item.user_pr_no && (
                                                                    <button
                                                                        onClick={() => startAssigning(item)}
                                                                        className="btn-action-secondary justify-center !text-emerald-700 !border-emerald-200 hover:!bg-emerald-50 !text-[10px] !font-black !uppercase !tracking-wide"
                                                                    >
                                                                        Assign PR No.
                                                                    </button>
                                                                )
                                                            )}
                                                            <button
                                                                onClick={() => handleView(item)}
                                                                className="btn-action justify-center bg-slate-900 dark:bg-emerald-600 text-white hover:bg-slate-800 dark:hover:bg-emerald-700 !text-[10px] !font-black !uppercase !tracking-wide shadow-sm"
                                                            >
                                                                View
                                                            </button>
                                                            <button
                                                                onClick={() => handleQuickView(item)}
                                                                className="btn-action-secondary justify-center !text-slate-800 dark:!text-white !text-[10px] !font-black !uppercase !tracking-wide"
                                                            >
                                                                Download
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                    </div>
                ) : (
                    <div className="p-6 sm:p-8 bg-[var(--background-subtle)]/30 min-h-[400px] flex flex-col items-center justify-center text-center">
                        <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4 text-slate-300">
                            <MdReceipt className="w-8 h-8" />
                        </div>
                        <h4 className="text-lg font-bold text-slate-400">No Purchase Requests</h4>
                        <p className="text-xs text-slate-400 mt-2 uppercase tracking-widest font-black">Generate your first PR above</p>
                    </div>
                )}
            </div>

            <CreatePRModal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                onSuccess={(data) => {
                    fetchPRs();
                    setSuccessMessage('Purchase Request saved successfully.');
                    setShowCreateModal(false);
                }}
            />

            {selectedDoc && (
                <DocViewModal 
                    doc={selectedDoc} 
                    onClose={() => setSelectedDoc(null)} 
                    onUploadMissing={(type, file) => {
                        setUploadingMissingType(type);
                        setSelectedFileForUpload(file);
                    }}
                />
            )}

            {uploadingMissingType && selectedDoc && (
                <DocUploadModal
                    isOpen={true}
                    onClose={() => {
                        setUploadingMissingType(null);
                        setSelectedFileForUpload(null);
                    }}
                    docType={uploadingMissingType}
                    targetDoc={selectedDoc}
                    initialFile={selectedFileForUpload}
                    user={user}
                    onSuccess={async (newDoc) => {
                        await refreshSelectedDoc(newDoc?.subDoc === 'Purchase Request' ? newDoc : selectedDoc);
                        setSuccessMessage(`${uploadingMissingType} uploaded successfully.`);
                    }}
                />
            )}

            <AlertModal
                message={successMessage}
                onClose={() => setSuccessMessage('')}
            />
        </div>
    );
};

export default PR;
