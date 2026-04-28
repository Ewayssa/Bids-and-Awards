"""
Centralized constants for the BAC application.
"""

# Default password for new users; they must change it on first login.
DEFAULT_USER_PASSWORD = 'password'

# Procurement Record Stages - organized by workflow order
PROCUREMENT_STAGES = [
    {
        'id': 'initial',
        'name': 'Initial Documents',
        'order': 1,
        'categories': ['Initial Documents'],
        'subDocs': ['Purchase Request', 'Project Procurement Management Plan/Supplemental PPMP', 'Annual Procurement Plan', 'Supplies']
    },
    {
        'id': 'pre_procurement',
        'name': 'Pre-Procurement Documents',
        'order': 2,
        'categories': ['Pre-Procurement'],
        'subDocs': ['Request for Quotation', 'Invitation to Bid', 'Bidding Documents']
    },
    {
        'id': 'rfq',
        'name': 'RFQ / Quotation Documents',
        'order': 3,
        'categories': ['RFQ Concerns'],
        'subDocs': ['PHILGEPS', 'Certificate of DILG']
    },
    {
        'id': 'bac_meeting',
        'name': 'BAC Meeting / Evaluation Documents',
        'order': 4,
        'categories': ['BAC Meeting Documents'],
        'subDocs': ['Notice of BAC Meeting', 'Invitation to COA', 'Attendance Sheet', 'Minutes of the Meeting']
    },
    {
        'id': 'award',
        'name': 'Award Documents',
        'order': 5,
        'categories': ['Award Documents'],
        'subDocs': ['BAC Resolution', 'Abstract of Quotation', 'Lease of Venue: Table Rating Factor', 'Notice of Award', 'Contract Services/Purchase Order', 'Notice to Proceed', 'OSS', "Applicable: Secretary's Certificate and Special Power of Attorney"]
    },
    {
        'id': 'posting',
        'name': 'Award Posting',
        'order': 6,
        'categories': ['Award Posting'],
        'subDocs': ['PhilGEPS Posting of Award', 'Certificate of DILG R1 Website Posting of Award', 'Notice of Award (Posted)', 'Abstract of Quotation (Posted)', 'BAC Resolution (Posted)']
    },
    {
        'id': 'post_award',
        'name': 'Post-Award / Completion Documents',
        'order': 7,
        'categories': ['Post-Award'],
        'subDocs': ['Purchase Order', 'Contract', 'Delivery Receipt', 'Inspection Report', 'Certificate of Completion']
    },
]

# Document types and required sub-documents (must match frontend DOC_TYPES)
CHECKLIST_DOC_TYPES = [
    ('Initial Documents', [
        'Purchase Request', 
        'Project Procurement Management Plan/Supplemental PPMP', 
        'Annual Procurement Plan', 
        'Supplies'
    ]),
    ('RFQ Concerns', [
        'PHILGEPS - Lease of Venue',
        'PHILGEPS - Small Value Procurement',
        'PHILGEPS - Public Bidding',
        'Certificate of DILG - Lease of Venue',
        'Certificate of DILG - Small Value Procurement',
        'Certificate of DILG - Public Bidding',
    ]),
    ('BAC Meeting Documents', [
        'Notice of BAC Meeting', 
        'Invitation to COA', 
        'Attendance Sheet', 
        'Minutes of the Meeting'
    ]),
    ('Award Documents', [
        'BAC Resolution', 
        'Abstract of Quotation', 
        'Lease of Venue: Table Rating Factor', 
        'Notice of Award', 
        'Contract Services/Purchase Order', 
        'Notice to Proceed', 
        'OSS', 
        "Applicable: Secretary's Certificate and Special Power of Attorney"
    ]),
    ('Award Posting', [
        'PhilGEPS Posting of Award', 
        'Certificate of DILG R1 Website Posting of Award', 
        'Notice of Award (Posted)', 
        'Abstract of Quotation (Posted)', 
        'BAC Resolution (Posted)'
    ]),
]
