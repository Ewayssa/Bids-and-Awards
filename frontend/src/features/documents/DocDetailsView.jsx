import React from 'react';
import { formatDisplayDate } from '../../utils/helpers.jsx';
import { MdDescription } from 'react-icons/md';

const DocDetailItem = ({ label, value, isPRNo = false }) => {
    const isMissing = !value && value !== 0 && value !== false;
    if (isMissing && !isPRNo) return null;
    
    return (
        <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">{label}</span>
            <span className={`text-sm font-medium ${isMissing ? 'text-[var(--text-muted)]' : 'text-[var(--text)]'}`}>
                {isMissing ? 'N/A' : String(value)}
            </span>
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
                        <DocDetailItem label="PR No." value={doc.user_pr_no} isPRNo={true} />
                    </>
                );
            case 'Project Procurement Management Plan/Supplemental PPMP':
                return (
                    <>
                        <DocDetailItem label="Title" value={doc.title} />
                        <DocDetailItem label="PPMP No." value={doc.ppmp_no} />
                        <DocDetailItem label="Source of Fund" value={doc.source_of_fund} />
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
            case 'Notice of BAC Meeting':
                return <DocDetailItem label="Agenda" value={doc.title} />;
            case 'Invitation to COA':
                return <DocDetailItem label="Date Received" value={formatDisplayDate(doc.date_received)} />;
            case 'Attendance Sheet':
                return <DocDetailItem label="Agenda" value={doc.title} />;
            case 'BAC Resolution':
                return (
                    <>
                        <DocDetailItem label="Resolution No." value={doc.resolution_no} />
                        <DocDetailItem label="Title" value={doc.title} />
                        <DocDetailItem label="Winning Bidder" value={doc.winning_bidder} />
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
                        <DocDetailItem label="Notarized" value={`${doc.notarized_place || ''} ${formatDisplayDate(doc.notarized_date) || ''}`} />
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
        <div className="flex flex-col bg-[var(--surface)]">
            
            <div className="p-4 space-y-4">
                <div className="grid grid-cols-2 gap-x-4 gap-y-4">
                    {renderSpecificFields()}
                </div>
            </div>
        </div>
    );
};

export { DocDetailsView, DocDetailItem };
export default DocDetailsView;
