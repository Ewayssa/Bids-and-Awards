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
        record.save(update_fields=['status', 'updated_at'])
        return True

    if not is_complete and record.status == 'completed':
        record.status = 'preparing' if record.documents.exists() else 'draft'
        record.save(update_fields=['status', 'updated_at'])
        return True

    return False


def sync_procurement_completion(record):
    """
    Backward-compatible wrapper for existing callers.
    """
    return sync_procurement_status(record)


def check_folder_readiness(record):
    """
    Checks if a procurement record (folder) is ready for PR No. assignment.
    Ready if all mandatory initial documents are present:
    1. Purchase Request
    2. Activity Design
    3. Requisition and Issue Slip (RIS)
    4. Market Scoping / Canvass
    """
    if not record or record.user_pr_no:
        return False
        
    required_groups = [
        ['Activity Design'],
        ['Requisition and Issue Slip', 'RIS'],
        ['Market Scoping', 'Market Scoping / Canvass']
    ]
    
    docs = record.documents.all()
    present_subdocs = [str(doc.subDoc or '').strip() for doc in docs]
    
    # Check for PR either as a Document or via the PurchaseRequest relation
    has_pr = 'Purchase Request' in present_subdocs or record.purchase_requests.exists()
    
    if not has_pr:
        return False
        
    # Check for the other 3 groups
    for group in required_groups:
        group_found = any(alias in present_subdocs for alias in group)
        if not group_found:
            return False
            
    # All present! Create notification if not already done
    msg = f"Procurement Folder '{record.title}' (PPMP No: {record.ppmp_no}) is now complete and ready for PR No. assignment."
    
    # Update the is_ready field on the record for easy filtering
    if not record.is_ready:
        record.is_ready = True
        record.save(update_fields=['is_ready'])

    # Import inside to avoid circular dependency
    from ..models import Notification
    
    # Use a specific link for the PR assignment page if available
    # Assuming /pr is where BAC assigns PR numbers
    if not Notification.objects.filter(message=msg).exists():
        Notification.objects.create(
            message=msg,
            link='/pr',
            admin_only=True # Visible to BAC Secretariat and BAC Members
        )
        return True
    return False


