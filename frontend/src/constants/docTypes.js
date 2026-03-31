/** Document types and required sub-documents for checklist (matches Encode page Update modal). For RFQ Concerns, first choose PHILGEPS or Certificate of DILG, then choose a procurement method below. */
export const RFQ_PROCUREMENT_METHODS = [
    { value: 'Lease of Venue', label: 'Lease of Venue' },
    { value: 'Small Value Procurement', label: 'Small Value Procurement' },
    { value: 'Public Bidding', label: 'Public Bidding' },
];

export const DOC_TYPES = [
    {
        id: 'initial',
        name: 'Initial Documents',
        subDocs: ['Purchase Request', 'Activity Design', 'Project Procurement Management Plan/Supplemental PPMP', 'Annual Procurement Plan', 'Market Scopping', 'Requisition and Issue Slip']
    },
    {
        id: 'afq',
        name: 'RFQ Concerns',
        subDocs: [
            'PHILGEPS',
            'Certificate of DILG',
        ],
    },
    {
        id: 'meeting',
        name: 'BAC Meeting Documents',
        subDocs: ['Notice of BAC Meeting', 'Invitation to COA', 'Attendance Sheet', 'Minutes of the Meeting'],
    },
    {
        id: 'award',
        name: 'Award Documents',
        subDocs: ['BAC Resolution', 'Abstract of Quotation', 'Lease of Venue: Table Rating Factor', 'Notice of Award', 'Contract Services/Purchase Order', 'Notice to Proceed', 'OSS', "Applicable: Secretary's Certificate and Special Power of Attorney"],
    },
    {
        id: 'posting',
        name: 'Award Posting',
        subDocs: ['PhilGEPS Posting of Award', 'Certificate of DILG R1 Website Posting of Award', 'Notice of Award (Posted)', 'Abstract of Quotation (Posted)', 'BAC Resolution (Posted)'],
    },
];
