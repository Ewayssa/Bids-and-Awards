/**
 * Procurement workflow stages (12-stage Realistic DILG/RA 9184 Process)
 */
export const WORKFLOW_STAGES = [
    { id: 1, name: 'Planning', description: 'PPMP/APP alignment and initial preparation' },
    { id: 2, name: 'Requisition', description: 'Purchase Request (PR) certification' },
    { id: 3, name: 'Pre-Procurement', description: 'BAC review and determination of procurement mode' },
    { id: 4, name: 'Posting', description: 'PhilGEPS advertisement and RFQ floating' },
    { id: 5, name: 'Opening', description: 'Submission and opening of bids/quotations' },
    { id: 6, name: 'Evaluation', description: 'Bid evaluation and LCB identification (TWG)' },
    { id: 7, name: 'Post-Qual', description: 'Verification and validation of the winning bidder' },
    { id: 8, name: 'Resolution', description: 'BAC Recommendation and Resolution to Award' },
    { id: 9, name: 'Awarding', description: 'Issuance and acceptance of Notice of Award (NOA)' },
    { id: 10, name: 'Contracting', description: 'Contract signing / PO issuance and notarization' },
    { id: 11, name: 'Proceed', description: 'Issuance of Notice to Proceed (NTP)' },
    { id: 12, name: 'Completion', description: 'Delivery, inspection, acceptance, and payment' },
];

export const PROCUREMENT_STAGES = [
    {
        id: 'planning',
        name: 'Planning & Budgeting',
        order: 1,
        categories: ['Planning'],
        subDocs: [
            'PPMP (Approved)',
            'APP (Excerpt)',
            'Project Profile / Proposal',
            'Certificate of Budget Availability'
        ],
        description: 'Verification of project alignment and fund availability.'
    },
    {
        id: 'requisition',
        name: 'Procurement Request',
        order: 2,
        categories: ['Requisition'],
        subDocs: [
            'Purchase Request (PR)',
            'Technical Specifications'
        ],
        description: 'Submission of formalized requirements by the end-user.'
    },
    {
        id: 'pre_procurement',
        name: 'Pre-Procurement Review',
        order: 3,
        categories: ['Pre-Procurement'],
        subDocs: [
            'BAC Checklist',
            'Mode of Procurement Resolution',
            'Pre-Procurement Minutes'
        ],
        description: 'BAC Secretariat review and mode determination.'
    },
    {
        id: 'posting',
        name: 'Posting & Floating',
        order: 4,
        categories: ['Posting'],
        subDocs: [
            'RFQ / ITB Posting (PhilGEPS)',
            'Proof of Posting (Website)',
            'Proof of Posting (Conspicuous Places)',
            'Notice to Observers (COA/NGO)'
        ],
        description: 'Ensuring transparency through public advertisement.'
    },
    {
        id: 'opening',
        name: 'Bid Opening',
        order: 5,
        categories: ['Opening'],
        subDocs: [
            'Attendance Sheet',
            'Minutes of Opening',
            'Checklist of Requirements',
            'Signed Bids / Quotations'
        ],
        description: 'Formal receipt and discovery of vendor proposals.'
    },
    {
        id: 'evaluation',
        name: 'Bid Evaluation',
        order: 6,
        categories: ['Evaluation'],
        subDocs: [
            'Abstract of Bids / Quotations',
            'TWG Evaluation Report',
            'Ranking of Bidders',
            'LCB Determination'
        ],
        description: 'Detailed analysis of technical and financial components.'
    },
    {
        id: 'post_qual',
        name: 'Post-Qualification',
        order: 7,
        categories: ['Post-Qual'],
        subDocs: [
            'Post-Qualification Report',
            'Verification of Documents',
            'LCRB / HRRB Determination'
        ],
        description: 'Verification of legal, technical, and financial capability.'
    },
    {
        id: 'resolution',
        name: 'BAC Resolution',
        order: 8,
        categories: ['Resolution'],
        subDocs: [
            'BAC Resolution to Award',
            'Notice of BAC Meeting Result',
            'Rating Factor (if applicable)'
        ],
        description: 'Official recommendation of the BAC to the HOPE.'
    },
    {
        id: 'award',
        name: 'Awarding (NOA)',
        order: 9,
        categories: ['Award'],
        subDocs: [
            'Notice of Award (NOA)',
            'Conformed NOA (Signed by Bidder)',
            'Performance Security (if req)'
        ],
        description: 'Formal notification of the winning bidder.'
    },
    {
        id: 'contracting',
        name: 'Contract Execution',
        order: 10,
        categories: ['Contracting'],
        subDocs: [
            'Contract Agreement / PO',
            'Notarized Contract Documents',
            'Obligation Request (ObR)'
        ],
        description: 'Binding the agreement between DILG and the supplier.'
    },
    {
        id: 'proceed',
        name: 'Notice to Proceed',
        order: 11,
        categories: ['NTP'],
        subDocs: [
            'Notice to Proceed (NTP)',
            'Conformed NTP (Signed by Bidder)'
        ],
        description: 'Authorization for the supplier to commence work.'
    },
    {
        id: 'completion',
        name: 'Completion & Implementation',
        order: 12,
        categories: ['Completion'],
        subDocs: [
            'Delivery Receipt / Invoice',
            'Inspection & Acceptance Report (IAR)',
            'Certificate of Completion',
            'Disbursement Voucher (DV)',
            'Payment Receipt / Check'
        ],
        description: 'Final project delivery and financial closure.'
    }
];

export const DOC_TYPES = PROCUREMENT_STAGES;

export const RFQ_PROCUREMENT_METHODS = [
    { value: 'Lease of Venue', label: 'Lease of Venue' },
    { value: 'Small Value Procurement', label: 'Small Value Procurement' },
    { value: 'Public Bidding', label: 'Public Bidding' },
    { value: 'Negotiated Procurement', label: 'Negotiated Procurement' },
    { value: 'Shopping', label: 'Shopping' },
    { value: 'Direct Contracting', label: 'Direct Contracting' },
];

/**
 * Dynamic Document Checklist requirements per Procurement Type
 */
const BASE_REQS = [
    'PPMP (Approved)', 'APP (Excerpt)', 'Purchase Request (PR)', 
    'BAC Checklist', 'Notice of Award (NOA)', 
    'Contract Agreement / PO', 'Notice to Proceed (NTP)', 'Disbursement Voucher (DV)'
];

/**
 * Official BAC Checklist Configuration per Procurement Type
 */
export const CHECKLIST_CONFIG = {
    lease_of_venue: {
        name: 'Lease of Venue',
        groups: [
            {
                name: 'Initial Documents',
                documents: [
                    { name: 'Purchase Request', required: true },
                    { name: 'Project Procurement Management Plan/Supplemental PPMP', required: true },
                    { name: 'Annual Procurement Plan', required: true }
                ]
            },
            {
                name: 'Special (Lease of Venue)',
                documents: [
                    { name: 'Certification of Non Availability of DILG R1 facility', required: true },
                    { name: 'Certification of Non Availability of Other Government Facility or RFQ Received and Certified by Government Facility', required: true },
                    { name: 'Cost Benefit Analysis', required: true },
                    { name: 'Justification Why Use Private Venue', required: false }
                ]
            },
            {
                name: 'RFQ Concerns',
                documents: [
                    { name: 'Certificate of DILG R1 Website and Conspicuous Posting for RFQ', required: false },
                    { name: 'Receiving Copy: Blank Request for Quotation (with #, Deadline of Submission, and received by Canvassers/Suppliers)', required: false },
                    { 
                        name: 'Received RFQs with Documentary Requirements (Mayor’s Permit, Income Tax Return/Tax Clearance, PhilGEPS Registration/No., Menu)', 
                        required: true,
                        minFiles: 3 
                    }
                ]
            },
            {
                name: 'BAC Meeting Documents',
                documents: [
                    { name: 'Notice of BAC Meeting', required: false },
                    { name: 'Invitation to COA', required: false },
                    { name: 'Attendance Sheet', required: false },
                    { name: 'Minutes of Meeting', required: false }
                ]
            },
            {
                name: 'Award Documents',
                documents: [
                    { name: 'BAC Resolution', required: true },
                    { name: 'Abstract of Quotation', required: true },
                    { name: 'Table of Rating Factor (for Lease of Venue)', required: false },
                    { name: 'Notice of Award', required: true },
                    { name: 'Contract of Services/Purchase Order', required: true },
                    { name: 'Notice to Proceed', required: true },
                    { name: 'Omnibus Sworn Statement', required: false }
                ]
            },
            {
                name: 'Award Posting',
                documents: [
                    { name: 'Certificate of Posting to Website and Conspicuous Place', required: false }
                ]
            }
        ]
    },
    small_value: {
        name: 'Small Value Procurement (SVP)',
        groups: [
            {
                name: 'Initial Documents',
                documents: [
                    { name: 'Purchase Request', required: true },
                    { name: 'Project Procurement Management Plan/Supplemental PPMP', required: true },
                    { name: 'Annual Procurement Plan', required: true }
                ]
            },
            {
                name: 'RFQ Concerns',
                documents: [
                    { name: 'PhilGEPS Posting for RFQ', required: false },
                    { name: 'Certificate of DILG R1 Website and Conspicuous Posting for RFQ', required: false },
                    { name: 'Receiving Copy: Blank Request for Quotation (with #, Deadline of Submission, and received by Canvassers/Suppliers)', required: true },
                    { 
                        name: 'Received RFQs with Documentary Requirements (Mayor’s Permit, Income Tax Return/Tax Clearance, PhilGEPS Registration/No.)', 
                        required: true,
                        minFiles: 3
                    }
                ]
            },
            {
                name: 'BAC Meeting Documents',
                documents: [
                    { name: 'Notice of BAC Meeting', required: false },
                    { name: 'Invitation to COA', required: false },
                    { name: 'Attendance Sheet', required: false },
                    { name: 'Minutes of Meeting', required: false }
                ]
            },
            {
                name: 'Award Documents',
                documents: [
                    { name: 'BAC Resolution', required: true },
                    { name: 'Abstract of Quotation', required: true },
                    { name: 'Notice of Award', required: true },
                    { name: 'Contract of Services/Purchase Order', required: true },
                    { name: 'Notice to Proceed', required: true },
                    { name: 'Omnibus Sworn Statement', required: false }
                ]
            },
            {
                name: 'Award Posting',
                documents: [
                    { name: 'PhilGEPS Posting of Award', required: false },
                    { name: 'Certificate of Posting to Website and Conspicuous Place', required: false }
                ]
            }
        ]
    },
    negotiated: {
        name: 'Negotiated Procurement',
        groups: [
            {
                name: 'Initial Documents',
                documents: [
                    { name: 'Purchase Request', required: true },
                    { name: 'Project Procurement Management Plan/Supplemental PPMP', required: true },
                    { name: 'Annual Procurement Plan', required: true },
                    { name: 'Technical Specifications / TOR', required: true }
                ]
            },
            {
                name: 'Special',
                documents: [
                    { name: 'Justification for Negotiated Procurement', required: true }
                ]
            },
            {
                name: 'Award Documents',
                documents: [
                    { name: 'BAC Resolution', required: true },
                    { name: 'Abstract of Quotation / Negotiation Result', required: true },
                    { name: 'Notice of Award', required: false },
                    { name: 'Contract', required: true },
                    { name: 'Notice to Proceed', required: false }
                ]
            }
        ]
    },
    public_bidding: {
        name: 'Public Bidding',
        groups: [
            {
                name: 'Initial Documents',
                documents: [
                    { name: 'Purchase Request', required: true },
                    { name: 'Project Procurement Management Plan/Supplemental PPMP', required: true },
                    { name: 'Annual Procurement Plan', required: true }
                ]
            },
            // Fallback for public bidding if not explicitly defined by user yet
            {
                name: 'Award Documents',
                documents: [
                    { name: 'BAC Resolution', required: true },
                    { name: 'Contract', required: true }
                ]
            }
        ]
    }
};

export const REQUIRED_DOCS_BY_TYPE = Object.keys(CHECKLIST_CONFIG).reduce((acc, type) => {
    acc[type] = CHECKLIST_CONFIG[type].groups.flatMap(g => g.documents.map(d => d.name));
    return acc;
}, {});


export const WORKFLOW_STATUS_FLOW = [
    'draft',
    'planning',
    'requisition',
    'pre_procurement',
    'posting',
    'opening',
    'evaluating',
    'post_qualifying',
    'resolution',
    'awarding',
    'contracting',
    'proceeding',
    'implementation',
    'completed'
];

export const DOCUMENT_STATUS_LABELS = {
    pending: 'Missing',
    uploaded: 'Uploaded',
    under_review: 'Pending Review',
    reviewed: 'Reviewed',
    approved: 'Approved'
};
