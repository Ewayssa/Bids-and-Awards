export const SOURCE_OF_FUNDS_OPTIONS = [
    'Government of the Philippines (current year\'s budget)',
    'Prior Years\' Appropriation',
    'Other (specify in remarks)',
];

export const REPORT_COLUMNS = [
    { key: 'code_pap', label: 'Code (PAP)', type: 'text', shortLabel: 'Code (PAP)' },
    { key: 'procurement_project', label: 'Procurement Project', type: 'text', shortLabel: 'Procurement Project' },
    { key: 'pmo_end_user', label: 'PMO/End-User', type: 'text', shortLabel: 'PMO/End-User' },
    { key: 'early_procurement', label: 'Is this an Early Procurement Activity?', type: 'select', options: ['Yes', 'No'], shortLabel: 'Early Procurement?' },
    { key: 'mode_of_procurement', label: 'Mode of Procurement', type: 'text', shortLabel: 'Mode of Procurement' },
    { key: 'pre_proc_conference', label: 'Pre-Proc Conference', type: 'date', shortLabel: 'Pre-Proc Conference' },
    { key: 'ads_post_ib', label: 'Ads/Post of IB', type: 'date', shortLabel: 'Ads/Post of IB' },
    { key: 'pre_bid_conf', label: 'Pre-bid Conf', type: 'date', shortLabel: 'Pre-bid Conf' },
    { key: 'eligibility_check', label: 'Eligibility Check', type: 'date', shortLabel: 'Eligibility Check' },
    { key: 'sub_open_bids', label: 'Sub/Open of Bids', type: 'date', shortLabel: 'Sub/Open of Bids' },
    { key: 'bid_evaluation', label: 'Bid Evaluation', type: 'date', shortLabel: 'Bid Evaluation' },
    { key: 'post_qual', label: 'Post Qual', type: 'date', shortLabel: 'Post Qual' },
    { key: 'bac_resolution_date', label: 'Date of BAC Resolution Recommending Award', type: 'date', shortLabel: 'Date of BAC Resolution Recommending Award' },
    { key: 'notice_of_award', label: 'Notice of Award', type: 'date', shortLabel: 'Notice of Award' },
    { key: 'contract_signing', label: 'Contract Signing', type: 'date', shortLabel: 'Contract Signing' },
    { key: 'notice_to_proceed', label: 'Notice to Proceed', type: 'date', shortLabel: 'Notice to Proceed' },
    { key: 'delivery_completion', label: 'Delivery/Completion', type: 'date', shortLabel: 'Delivery/Completion' },
    { key: 'inspection_acceptance', label: 'Inspection & Acceptance', type: 'date', shortLabel: 'Inspection & Acceptance' },
    { key: 'source_of_funds', label: 'Source of Funds', type: 'select', options: SOURCE_OF_FUNDS_OPTIONS, shortLabel: 'Source of Funds' },
    { key: 'abc_total', label: 'ABC (PhP) - Total', type: 'number', shortLabel: 'Total' },
    { key: 'abc_mooe', label: 'ABC (PhP) - MOOE', type: 'number', shortLabel: 'MOOE' },
    { key: 'abc_co', label: 'ABC (PhP) - CO', type: 'number', shortLabel: 'CO' },
    { key: 'contract_cost_total', label: 'Contract Cost (PhP) - Total', type: 'number', shortLabel: 'Total' },
    { key: 'contract_cost_mooe', label: 'Contract Cost (PhP) - MOOE', type: 'number', shortLabel: 'MOOE' },
    { key: 'contract_cost_co', label: 'Contract Cost (PhP) - CO', type: 'number', shortLabel: 'CO' },
    { key: 'co3', label: 'CO3', type: 'text', shortLabel: 'CO3' },
    { key: 'list_of_invited_observers', label: 'List of Invited Observers', type: 'text', shortLabel: 'List of Invited Observers' },
    { key: 'invitation_eligibility_check', label: 'Eligibility Check', type: 'date', shortLabel: 'Eligibility Check' },
    { key: 'invitation_sub_open_bids', label: 'Sub/Open of Bids', type: 'date', shortLabel: 'Sub/Open of Bids' },
    { key: 'invitation_bid_evaluation', label: 'Bid Evaluation', type: 'date', shortLabel: 'Bid Evaluation' },
    { key: 'invitation_post_qual', label: 'Post Qual', type: 'date', shortLabel: 'Post Qual' },
    { key: 'invitation_delivery_completion_acceptance', label: 'Delivery/Completion/Acceptance (If applicable)', type: 'date', shortLabel: 'Delivery/Completion/Acceptance (If applicable)' },
    { key: 'remarks', label: 'Remarks (Explaining changes from the APP)', type: 'text', shortLabel: 'Remarks (Explaining changes from the APP)' },
];

export const HEADER_GROUPS = [
    { groupLabel: 'Code (PAP)', colKeys: ['code_pap'] },
    { groupLabel: 'Procurement Project', colKeys: ['procurement_project'] },
    { groupLabel: 'PMO/End-User', colKeys: ['pmo_end_user'] },
    { groupLabel: 'Is this an Early Procurement Activity?', colKeys: ['early_procurement'] },
    { groupLabel: 'Mode of Procurement', colKeys: ['mode_of_procurement'] },
    { groupLabel: 'Actual Procurement Activities (MM/DD/YYYY)', colKeys: ['pre_proc_conference', 'ads_post_ib', 'pre_bid_conf', 'eligibility_check', 'sub_open_bids', 'bid_evaluation', 'post_qual', 'bac_resolution_date'] },
    { groupLabel: 'Notice of Award', colKeys: ['notice_of_award'] },
    { groupLabel: 'Contract Signing', colKeys: ['contract_signing'] },
    { groupLabel: 'Notice to Proceed', colKeys: ['notice_to_proceed'] },
    { groupLabel: 'Delivery/Completion', colKeys: ['delivery_completion'] },
    { groupLabel: 'Inspection & Acceptance', colKeys: ['inspection_acceptance'] },
    { groupLabel: 'Source of Funds', colKeys: ['source_of_funds'] },
    { groupLabel: 'ABC (PhP)', colKeys: ['abc_total', 'abc_mooe', 'abc_co'] },
    { groupLabel: 'Contract Cost (PhP)', colKeys: ['contract_cost_total', 'contract_cost_mooe', 'contract_cost_co'] },
    { groupLabel: 'CO3', colKeys: ['co3'] },
    { groupLabel: 'List of Invited Observers', colKeys: ['list_of_invited_observers'] },
    { groupLabel: 'Date of Receipt of Invitation', colKeys: ['invitation_eligibility_check', 'invitation_sub_open_bids', 'invitation_bid_evaluation', 'invitation_post_qual', 'invitation_delivery_completion_acceptance'] },
    { groupLabel: 'Remarks (Explaining changes from the APP)', colKeys: ['remarks'] },
];

export const TABLE_PAGE_SIZE = 10;
export const DATE_MIN = '2000-01-01';
export const DATE_MAX = '2060-12-31';
export const STORAGE_KEY_ENCODED_REPORT = 'bac_reports_encoded_rows';
