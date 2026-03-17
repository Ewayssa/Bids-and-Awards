"""
Centralized constants for the BAC application.
"""

# Default password for new users; they must change it on first login.
DEFAULT_USER_PASSWORD = 'password'

# Document types and required sub-documents (must match frontend DOC_TYPES)
CHECKLIST_DOC_TYPES = [
    ('Initial Documents', [
        'Purchase Request', 
        'Activity Design', 
        'Project Procurement Management Plan/Supplemental PPMP', 
        'Annual Procurement Plan', 
        'Market Scopping', 
        'Requisition and Issue Slip'
    ]),
    ('RFQ Concerns', [
        'PHILGEPS - List of Venue',
        'PHILGEPS - Small Value Procurement',
        'PHILGEPS - Public Bidding',
        'Certificate of DILG - List of Venue',
        'Certificate of DILG - Small Value Procurement',
        'Certificate of DILG - Public Bidding',
    ]),
    ('BAC Meeting Documents', [
        'Certificate of BAC', 
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
