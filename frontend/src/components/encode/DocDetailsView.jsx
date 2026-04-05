import React from 'react';
import { MdDescription } from 'react-icons/md';

const DocDetailItem = ({ label, value }) => {
    if (!value && value !== 0 && value !== false) return null;
    return (
        <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">{label}</span>
            <span className="text-sm font-medium text-[var(--text)]">{String(value)}</span>
        </div>
    );
};

const DocDetailsView = ({ doc }) => {
    if (!doc) return null;
    
    const renderSpecificFields = () => {
        const sub = (doc.subDoc || '').trim();
        
        switch (sub) {
            case 'Purchase Request':
                return (
                    <>
                        <DocDetailItem label="Purpose" value={doc.title} />
                        <DocDetailItem label="PR No." value={doc.user_pr_no} />
                        <DocDetailItem label="Total Amount" value={doc.total_amount ? `₱${Number(doc.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}` : null} />
                    </>
                );
            case 'Activity Design':
                return (
                    <>
                        <DocDetailItem label="Title" value={doc.title} />
                        <DocDetailItem label="PR No." value={doc.user_pr_no} />
                        <DocDetailItem label="Source of Fund" value={doc.source_of_fund} />
                        <DocDetailItem label="Total Amount" value={doc.total_amount ? `₱${Number(doc.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}` : null} />
                    </>
                );
            case 'Project Procurement Management Plan/Supplemental PPMP':
                return (
                    <>
                        <DocDetailItem label="Title" value={doc.title} />
                        <DocDetailItem label="PPMP No." value={doc.ppmp_no} />
                        <DocDetailItem label="Source of Fund" value={doc.source_of_fund} />
                        <DocDetailItem label="Total Budget" value={doc.total_amount ? `₱${Number(doc.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}` : null} />
                    </>
                );
            case 'Annual Procurement Plan':
                return (
                    <>
                        <DocDetailItem label="Title" value={doc.title} />
                        <DocDetailItem label="APP Type" value={doc.app_type} />
                        <DocDetailItem label="Certified True Copy" value={doc.certified_true_copy ? 'Yes' : 'No'} />
                        <DocDetailItem label="Signed By" value={doc.certified_signed_by} />
                    </>
                );
            case 'Market Scopping':
                return (
                    <>
                        <DocDetailItem label="Title" value={doc.title} />
                        <DocDetailItem label="Budget" value={doc.market_budget ? `₱${Number(doc.market_budget).toLocaleString(undefined, { minimumFractionDigits: 2 })}` : null} />
                        <DocDetailItem label="Period" value={`${doc.market_period_from || '—'} to ${doc.market_period_to || '—'}`} />
                        <DocDetailItem label="Expected Delivery" value={doc.market_expected_delivery} />
                        <DocDetailItem label="Service Providers" value={[doc.market_service_provider_1, doc.market_service_provider_2, doc.market_service_provider_3].filter(Boolean).join(', ')} />
                    </>
                );
            case 'Requisition and Issue Slip':
                return (
                    <>
                        <DocDetailItem label="Purpose" value={doc.title} />
                        <DocDetailItem label="Office/Division" value={doc.office_division} />
                        <DocDetailItem label="Received By" value={doc.received_by} />
                    </>
                );
            case 'Notice of BAC Meeting':
                return <DocDetailItem label="Agenda" value={doc.title} />;
            case 'Invitation to COA':
                return <DocDetailItem label="Date Received" value={doc.date_received} />;
            case 'Attendance Sheet':
                return <DocDetailItem label="Agenda" value={doc.title} />;
            case 'BAC Resolution':
                return (
                    <>
                        <DocDetailItem label="Resolution No." value={doc.resolution_no} />
                        <DocDetailItem label="Title" value={doc.title} />
                        <DocDetailItem label="Winning Bidder" value={doc.winning_bidder} />
                        <DocDetailItem label="Amount" value={doc.total_amount ? `₱${Number(doc.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}` : null} />
                        <DocDetailItem label="Office/Division" value={doc.office_division} />
                        <DocDetailItem label="Venue" value={doc.venue} />
                    </>
                );
            case 'Abstract of Quotation':
                return <DocDetailItem label="AOQ No." value={doc.aoq_no} />;
            case 'Contract Services/Purchase Order':
                return (
                    <>
                        <DocDetailItem label="Contract Amount" value={doc.contract_amount ? `₱${Number(doc.contract_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}` : null} />
                        <DocDetailItem label="Received by COA" value={doc.contract_received_by_coa ? 'Yes' : 'No'} />
                        <DocDetailItem label="Notarized" value={`${doc.notarized_place || ''} ${doc.notarized_date || ''}`} />
                    </>
                );
            case 'Notice to Proceed':
                return (
                    <>
                        <DocDetailItem label="Service Provider" value={doc.ntp_service_provider} />
                        <DocDetailItem label="Authorized Rep" value={doc.ntp_authorized_rep} />
                        <DocDetailItem label="Received By" value={doc.ntp_received_by} />
                    </>
                );
            case 'OSS':
                return (
                    <>
                        <DocDetailItem label="Service Provider" value={doc.oss_service_provider} />
                        <DocDetailItem label="Authorized Rep" value={doc.oss_authorized_rep} />
                    </>
                );
            case "Applicable: Secretary's Certificate and Special Power of Attorney":
                 return (
                    <>
                        <DocDetailItem label="Service Provider" value={doc.secretary_service_provider} />
                        <DocDetailItem label="Owner/Rep" value={doc.secretary_owner_rep} />
                    </>
                );
            default:
                return doc.title ? <DocDetailItem label="Title" value={doc.title} /> : null;
        }
    };

    return (
        <div className="h-full flex flex-col bg-[var(--surface)] border-r border-[var(--border)] overflow-y-auto">
            <div className="p-4 border-b border-[var(--border)] bg-[var(--background-subtle)]/30">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-green-50 text-green-600">
                        <MdDescription className="w-5 h-5" />
                    </div>
                    <div>
                        <h4 className="text-sm font-bold text-[var(--text)] tracking-tight">Procurement Details</h4>
                        <p className="text-[10px] text-[var(--text-muted)] font-medium uppercase tracking-widest">{doc.subDoc}</p>
                    </div>
                </div>
            </div>
            
            <div className="p-4 space-y-5">
                <div className="grid grid-cols-1 gap-5">
                    <DocDetailItem label="BAC Folder No." value={doc.prNo} />
                    <DocDetailItem label="Date Encoding" value={doc.date ? new Date(doc.date).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : '—'} />
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Status</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            doc.status === 'complete' ? 'bg-green-100 text-green-700' :
                            doc.status === 'ongoing' ? 'bg-amber-100 text-amber-700' :
                            'bg-red-100 text-red-700'
                        }`}>
                            {doc.status || 'pending'}
                        </span>
                    </div>
                    
                    <div className="pt-4 border-t border-[var(--border-light)] space-y-5">
                        {renderSpecificFields()}
                    </div>
                </div>
            </div>
        </div>
    );
};

export { DocDetailsView, DocDetailItem };
export default DocDetailsView;
