from ..models import Document

# Requirements mapping (replicated from frontend docTypes.js for backend enforcement)
BASE_PREP = [
    'Activity Design', 
    'Market Scoping', 
    'Project Procurement Management Plan/Supplemental PPMP', 
    'Purchase Request', 
    'Annual Procurement Plan', 
    'RFQ Draft'
]
BASE_POSTING = ['Proof of Posting (Website)', 'Proof of Posting (Conspicuous Places)', 'Certificate of Posting']
BASE_FLOAT = [
    'Received RFQs with Documentary Requirements (Mayor’s Permit, Income Tax Return/Tax Clearance, PhilGEPS Registration/No., Menu)',
    'Quotation 1', 
    'Quotation 2', 
    'Quotation 3'
]
BASE_MEETING = ['Notice of BAC Meeting', 'Invitation to COA', 'Attendance Sheet']
BASE_AWARD = [
    'Abstract of Quotation', 
    'BAC Resolution', 
    'Minutes of the Meeting', 
    'Notice of Award', 
    'Notice to Proceed', 
    'Contract of Services/Purchase Order'
]

LOV_ADDITIONAL = [
    'Certification of Non Availability of DILG R1 facility',
    'Certification of Non Availability of Other Government Facility',
    'Table of Rating Factor (for Lease of Venue)'
]
SVP_ADDITIONAL = ['Proof of Posting (PhilGEPS)']
SUPPLIES_ADDITIONAL = ['Requisition and Issue Slip']

REQUIREMENTS_BY_TYPE = {
    'lease_of_venue': BASE_PREP + LOV_ADDITIONAL + BASE_POSTING + BASE_FLOAT + BASE_MEETING + BASE_AWARD,
    'small_value': BASE_PREP + SVP_ADDITIONAL + BASE_POSTING + BASE_FLOAT + BASE_MEETING + BASE_AWARD,
    'public_bidding': BASE_PREP + SVP_ADDITIONAL + BASE_POSTING + BASE_FLOAT + BASE_MEETING + BASE_AWARD,
    'negotiated': BASE_PREP + BASE_POSTING + BASE_FLOAT + BASE_MEETING + BASE_AWARD,
    'supplies': BASE_PREP + SUPPLIES_ADDITIONAL + BASE_POSTING + BASE_FLOAT + BASE_MEETING + BASE_AWARD,
}

REQUIRED_CHECKLIST_BY_TYPE = {
    'lease_of_venue': [
        {'name': 'Purchase Request'},
        {'name': 'Project Procurement Management Plan/Supplemental PPMP'},
        {'name': 'Annual Procurement Plan'},
        {'name': 'Certification of Non Availability of DILG R1 facility'},
        {'name': 'Certification of Non Availability of Other Government Facility or RFQ Received and Certified by Government Facility'},
        {'name': 'Cost Benefit Analysis'},
        {'name': 'Received RFQs with Documentary Requirements', 'min_files': 3},
        {'name': 'BAC Resolution'},
        {'name': 'Abstract of Quotation'},
        {'name': 'Notice of Award'},
        {'name': 'Contract of Services/Purchase Order'},
        {'name': 'Notice to Proceed'},
    ],
    'small_value': [
        {'name': 'Purchase Request'},
        {'name': 'Project Procurement Management Plan/Supplemental PPMP'},
        {'name': 'Annual Procurement Plan'},
        {'name': 'Receiving Copy: Blank Request for Quotation'},
        {'name': 'Received RFQs with Documentary Requirements', 'min_files': 3},
        {'name': 'BAC Resolution'},
        {'name': 'Abstract of Quotation'},
        {'name': 'Notice of Award'},
        {'name': 'Contract of Services/Purchase Order'},
        {'name': 'Notice to Proceed'},
    ],
    'negotiated': [
        {'name': 'Purchase Request'},
        {'name': 'Project Procurement Management Plan/Supplemental PPMP'},
        {'name': 'Annual Procurement Plan'},
        {'name': 'Technical Specifications / TOR'},
        {'name': 'Justification for Negotiated Procurement'},
        {'name': 'BAC Resolution'},
        {'name': 'Abstract of Quotation / Negotiation Result'},
        {'name': 'Contract'},
    ],
    'public_bidding': [
        {'name': 'Purchase Request'},
        {'name': 'Project Procurement Management Plan/Supplemental PPMP'},
        {'name': 'Annual Procurement Plan'},
        {'name': 'BAC Resolution'},
        {'name': 'Contract'},
    ],
}

# Mapping of stages to required documents for that stage to be "complete"
STAGE_REQUIREMENTS = {
    3: lambda type: [d for d in REQUIREMENTS_BY_TYPE.get(type, []) if d in BASE_PREP or d in LOV_ADDITIONAL[:2] or d in SUPPLIES_ADDITIONAL],
    6: lambda type: [d for d in REQUIREMENTS_BY_TYPE.get(type, []) if 'Posting' in d],
    7: lambda type: [d for d in REQUIREMENTS_BY_TYPE.get(type, []) if 'Quotation' in d or 'RFQ Issued' in d],
    8: lambda type: [d for d in REQUIREMENTS_BY_TYPE.get(type, []) if d in BASE_MEETING],
    10: lambda type: [d for d in REQUIREMENTS_BY_TYPE.get(type, []) if d in BASE_AWARD or 'Rating Factor' in d],
}

def is_stage_ready_to_advance(record):
    """
    Check if the current stage has all required documents uploaded and completed.
    Returns (bool, list_of_missing)
    """
    stage_id = record.current_stage
    p_type = record.procurement_type
    
    # Stages that don't require documents yet or are administrative
    if stage_id in [1, 2, 4, 5, 9, 11, 12]:
        return True, []
        
    required_docs = STAGE_REQUIREMENTS.get(stage_id, lambda t: [])(p_type)
    if not required_docs:
        return True, []
        
    uploaded_docs = record.documents.filter(status='complete').values_list('subDoc', flat=True)
    missing = [d for d in required_docs if d not in uploaded_docs]
    
    return len(missing) == 0, missing


def document_matches_requirement(document, requirement_name):
    sub_doc = (document.subDoc or '').strip().lower()
    required = (requirement_name or '').strip().lower()
    if not sub_doc or not required:
        return False
    if sub_doc == required:
        return True
    if 'purchase request' in required and 'purchase request' in sub_doc:
        return True
    return required in sub_doc or sub_doc in required


def get_missing_required_files(record):
    """
    Return required checklist entries that do not yet have uploaded/generated files.
    This is intentionally file-based, not metadata-completeness-based.
    """
    docs = list(record.documents.all())

    if not (record.procurement_type or '').strip():
        if not docs:
            return ['At least one document']
        return [
            doc.subDoc or doc.title or 'Document'
            for doc in docs
            if not (bool(doc.file) or (doc.subDoc or '').strip() == 'Purchase Request')
        ]

    requirements = REQUIRED_CHECKLIST_BY_TYPE.get(record.procurement_type, REQUIRED_CHECKLIST_BY_TYPE['small_value'])
    missing = []

    for requirement in requirements:
        name = requirement['name']
        min_files = requirement.get('min_files', 1)
        matches = [
            doc for doc in docs
            if document_matches_requirement(doc, name)
            and (bool(doc.file) or (doc.subDoc or '').strip() == 'Purchase Request')
        ]
        if len(matches) < min_files:
            missing.append(name)

    return missing


def has_required_files_completed(record):
    return len(get_missing_required_files(record)) == 0


def sync_procurement_status(record):
    """
    Keep procurement status aligned with required checklist file uploads.
    """
    if not record or record.status == 'closed':
        return False

    is_complete = has_required_files_completed(record)
    if is_complete and record.status != 'completed':
        record.status = 'completed'
        record.current_stage = max(record.current_stage or 1, 12)
        record.save(update_fields=['status', 'current_stage', 'updated_at'])
        return True

    if not is_complete and record.status == 'completed':
        record.status = 'preparing' if record.documents.exists() else 'draft'
        if (record.current_stage or 1) >= 12:
            record.current_stage = 2 if record.documents.exists() else 1
        record.save(update_fields=['status', 'current_stage', 'updated_at'])
        return True

    return False


def sync_procurement_completion(record):
    """
    Backward-compatible wrapper for existing callers.
    """
    return sync_procurement_status(record)
