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
