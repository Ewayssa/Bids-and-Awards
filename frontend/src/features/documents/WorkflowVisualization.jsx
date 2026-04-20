import React from 'react';
import { 
    MdTimeline, 
    MdCheckCircle, 
    MdRadioButtonUnchecked, 
    MdErrorOutline,
    MdInfo
} from 'react-icons/md';
import { PROCUREMENT_STAGES, REQUIRED_DOCS_BY_TYPE } from '../../constants/docTypes';

const WorkflowVisualization = ({ prNo, documents = [], procurementType }) => {
    // 1. Determine procurement type: prop priority, then detection from docs
    const pType = procurementType || documents[0]?.procurement_type || 'small_value';
    const methodDisplay = documents[0]?.procurement_method_display || (pType.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '));
    
    // 2. Get the specific requirements for this type
    const requiredDocsList = REQUIRED_DOCS_BY_TYPE[pType] || [];
    
    // 3. Filter stages to only show those that have required documents
    // and enrich with uploaded status
    const enrichedStages = PROCUREMENT_STAGES.map(stage => {
        // Find which required documents belong to this stage's categories or subDocs list
        // We match by name against the stage's subDocs list for precision
        const docsInStage = stage.subDocs.filter(subName => requiredDocsList.includes(subName));
        
        // If this stage doesn't have any required documents for this procurement type, 
        // we might still want to show it if documents WERE uploaded to it (edge cases)
        const uploadedDocs = documents.filter(doc => 
            stage.subDocs.includes(doc.subDoc) || 
            stage.categories.includes(doc.category)
        );

        if (docsInStage.length === 0 && uploadedDocs.length === 0) return null;

        // Map requirements to their upload status
        const requirementProgress = docsInStage.map(reqName => {
            const uploaded = uploadedDocs.find(d => d.subDoc === reqName);
            return {
                name: reqName,
                status: uploaded ? uploaded.status : 'missing',
                id: uploaded ? uploaded.id : `missing-${reqName}`,
                isMissing: !uploaded
            };
        });

        // Determine stage status
        let stageStatus = 'not-started';
        if (uploadedDocs.length > 0) {
            const allRequiredUploaded = requirementProgress.every(r => !r.isMissing);
            const allComplete = uploadedDocs.every(d => d.status === 'complete') && allRequiredUploaded;
            const anyOngoing = uploadedDocs.some(d => d.status === 'ongoing');
            
            if (allComplete) stageStatus = 'complete';
            else if (anyOngoing || uploadedDocs.length > 0) stageStatus = 'ongoing';
        }

        return {
            ...stage,
            status: stageStatus,
            requirements: requirementProgress,
            uploadedCount: uploadedDocs.length,
            requiredCount: docsInStage.length
        };
    }).filter(stage => {
        if (!stage) return false;
        // SPECIAL LOGIC: Hide RFQ Concerns for Lease of Venue
        if (pType === 'lease_of_venue' && stage.id === 'afq') return false;
        return true;
    });

    const statusColors = {
        complete: 'bg-[var(--primary)] text-white shadow-[0_0_15px_rgba(var(--primary-rgb),0.3)]',
        ongoing: 'bg-amber-500 text-white shadow-[0_0_15px_rgba(245,158,11,0.3)]',
        pending: 'bg-[var(--destructive)] text-white shadow-[0_0_15px_rgba(var(--destructive-rgb),0.3)]',
        'not-started': 'bg-[var(--background-subtle)] text-[var(--text-muted)] border border-[var(--border)]',
    };

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between p-4 bg-[var(--primary-muted)]/10 rounded-2xl border border-[var(--primary)]/10">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[var(--primary)] flex items-center justify-center text-white shadow-lg">
                        <MdTimeline className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-[var(--primary)] uppercase tracking-[0.2em] mb-0.5">Methodology</p>
                        <h3 className="text-sm font-bold text-[var(--text)]">{methodDisplay}</h3>
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-0.5">Folder No.</p>
                    <p className="text-xs font-bold text-[var(--text)]">{prNo}</p>
                </div>
            </div>

            <div className="relative pl-4 overflow-hidden">
                {/* Visual Line */}
                <div className="absolute left-[31px] top-8 bottom-8 w-0.5 bg-gradient-to-b from-[var(--primary)] via-[var(--border)] to-[var(--border-light)] opacity-30" />
                
                <div className="space-y-12">
                    {enrichedStages.map((stage, idx) => (
                        <div key={stage.id} className="relative flex gap-8 group">
                            {/* Stage Circle */}
                            <div className={`relative z-10 w-10 h-10 rounded-full ${statusColors[stage.status]} flex items-center justify-center font-bold text-xs shrink-0 transition-all duration-500 group-hover:scale-110`}>
                                {stage.status === 'complete' ? <MdCheckCircle className="w-6 h-6" /> : (idx + 1)}
                            </div>

                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-4">
                                    <div>
                                        <h4 className="font-bold text-[var(--text)] group-hover:text-[var(--primary)] transition-colors">{stage.name}</h4>
                                        <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-widest mt-0.5">
                                            {stage.uploadedCount} of {stage.requiredCount} Requirement{stage.requiredCount !== 1 ? 's' : ''}
                                        </p>
                                    </div>
                                    <span className={`status-badge !text-[9px] ${
                                        stage.status === 'complete' ? 'status-badge--complete' :
                                        stage.status === 'ongoing' ? 'status-badge--ongoing' :
                                        '!bg-[var(--background-subtle)] !text-[var(--text-muted)] !border-[var(--border)]'
                                    }`}>
                                        {stage.status === 'complete' ? 'Done' : stage.status === 'ongoing' ? 'In Progress' : 'Pending'}
                                    </span>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {stage.requirements.map(req => (
                                        <div 
                                            key={req.id} 
                                            className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                                                req.isMissing 
                                                ? 'bg-red-50/30 dark:bg-red-500/5 border-red-100 dark:border-red-500/10 grayscale-[0.5] opacity-60' 
                                                : 'bg-white dark:bg-[var(--surface)] border-[var(--border-light)] hover:border-[var(--primary)]/30 hover:shadow-md'
                                            }`}
                                        >
                                            <div className="flex items-center gap-3 min-w-0">
                                                {req.isMissing ? (
                                                    <MdRadioButtonUnchecked className="w-4 h-4 text-red-300 shrink-0" />
                                                ) : (
                                                    <MdCheckCircle className={`w-4 h-4 shrink-0 ${
                                                        req.status === 'complete' ? 'text-[var(--primary)]' : 'text-amber-500'
                                                    }`} />
                                                )}
                                                <span className={`text-[11px] font-medium truncate ${req.isMissing ? 'text-red-800/60 dark:text-red-400/60' : 'text-[var(--text)]'}`} title={req.name}>
                                                    {req.name}
                                                </span>
                                            </div>
                                            {req.isMissing && (
                                                <span className="text-[8px] font-black text-red-500/50 uppercase tracking-tighter shrink-0 ml-2">Missing</span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

        </div>
    );
};

export default WorkflowVisualization;
