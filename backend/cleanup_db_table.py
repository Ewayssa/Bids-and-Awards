from django.db import connection

def cleanup_db():
    cols_to_drop = [
        'user_pr_no', 'total_amount', 'ppmp_no', 'app_no', 'app_type', 
        'procurement_id', 'procurement_record_id', 'quarter', 'year', 
        'pr_items', 'po_status',
        # Adding others from migration 0060 just in case
        'abstract_bidders', 'aoq_no', 'attendance_members', 'certified_signed_by',
        'certified_true_copy', 'contract_amount', 'contract_received_by_coa',
        'date_received', 'market_budget', 'market_expected_delivery',
        'market_period_from', 'market_period_to', 'market_service_provider_1',
        'market_service_provider_2', 'market_service_provider_3',
        'notarized_date', 'notarized_place', 'notice_award_authorized_rep',
        'notice_award_conforme', 'notice_award_service_provider',
        'ntp_authorized_rep', 'ntp_received_by', 'ntp_service_provider',
        'office_division', 'oss_authorized_rep', 'oss_service_provider',
        'received_by', 'resolution_no', 'resolution_option',
        'secretary_owner_rep', 'secretary_service_provider', 'source_of_fund',
        'table_rating_address', 'table_rating_factor_value',
        'table_rating_service_provider', 'venue', 'winning_bidder'
    ]
    
    with connection.cursor() as cursor:
        # Get actual columns first
        cursor.execute('DESCRIBE api_document')
        actual_cols = [col[0] for col in cursor.fetchall()]
        print(f"Actual columns: {actual_cols}")
        
        for col in cols_to_drop:
            if col in actual_cols:
                try:
                    cursor.execute(f'ALTER TABLE api_document DROP COLUMN {col}')
                    print(f"Dropped {col}")
                except Exception as e:
                    print(f"Failed to drop {col}: {e}")
            else:
                print(f"Column {col} not found, skipping.")

if __name__ == '__main__':
    import os
    import django
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bac_backend.settings')
    django.setup()
    cleanup_db()
