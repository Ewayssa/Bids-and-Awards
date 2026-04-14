import React from 'react';
import { MdDescription } from 'react-icons/md';

const WorkflowVisualization = ({ prNo, documents }) => {
    const workflowDocs = documents.filter(doc => doc.prNo === prNo);
    
    const stages = [
        { id: 'initial', name: 'Initial Documents' },
        { id: 'afq', name: 'AFQ Concerns' },
        { id: 'meeting', name: 'BAC Meeting Documents' },
        { id: 'award', name: 'Award Documents' },
        { id: 'posting', name: 'Award Posting' },
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
                        complete: 'bg-primary-600',
                        ongoing: 'bg-amber-500',
                        pending: 'bg-rose-500',
                        'not-started': 'bg-slate-300 dark:bg-slate-600',
                    };
                    
                    return (
                        <div key={stage.id} className="relative flex items-start gap-4 mb-6">
                            <div className={`relative z-10 w-16 h-16 rounded-full ${statusColors[status]} flex items-center justify-center font-bold text-sm flex-shrink-0 ${status === 'not-started' ? 'text-slate-700 dark:text-slate-100' : 'text-white'}`}>
                                {idx + 1}
                            </div>
                            <div className="flex-1 pt-2">
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className="font-semibold text-[var(--text)]">{stage.name}</h3>
                                    <span
                                        className={
                                            status === 'complete' ? 'status-badge status-badge--complete' :
                                            status === 'ongoing' ? 'status-badge status-badge--ongoing' :
                                            status === 'pending' ? 'status-badge status-badge--pending' :
                                            'inline-flex items-center px-3 py-1 rounded-lg text-xs font-semibold bg-[var(--background-subtle)] text-[var(--text-muted)] border border-[var(--border)]'
                                        }
                                    >
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
                                                    <span className={`status-badge !text-[10px] !py-0.5 !px-2 ${
                                                        doc.status === 'complete' ? 'status-badge--complete' :
                                                        doc.status === 'ongoing' ? 'status-badge--ongoing' :
                                                        'status-badge--pending'
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
            <div className="mt-8 p-4 bg-[var(--background-subtle)] rounded-xl border border-[var(--border-light)]">
                <h4 className="font-semibold text-[var(--text)] mb-3">Summary</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                    <div>
                        <p className="text-[var(--text-muted)]">Total Documents</p>
                        <p className="text-xl font-bold text-[var(--text)] tabular-nums">{workflowDocs.length}</p>
                    </div>
                    <div>
                        <p className="text-[var(--text-muted)]">Complete</p>
                        <p className="text-xl font-bold text-primary-600 tabular-nums">
                            {workflowDocs.filter(d => d.status === 'complete').length}
                        </p>
                    </div>
                    <div>
                        <p className="text-[var(--text-muted)]">Ongoing</p>
                        <p className="text-xl font-bold text-amber-600 tabular-nums">
                            {workflowDocs.filter(d => d.status === 'ongoing').length}
                        </p>
                    </div>
                    <div>
                        <p className="text-[var(--text-muted)]">Pending</p>
                        <p className="text-xl font-bold text-rose-600 tabular-nums">
                            {workflowDocs.filter(d => d.status === 'pending').length}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default WorkflowVisualization;
