# Ongoing Task: Update Ongoing Status Logic for New Procurements

## Steps:
- [x] 1. Backup current document_status.py and document_helpers.py (copy to .bak)
- [x] 2. Add `is_new_procurement(document)` helper in `backend/api/utils/document_status.py`
- [x] 3. Modify `_has_basic_fields` to skip prNo/user_pr_no checks for new procurement
- [x] 4. Update `calculate_status` to use ignore_prno=True for new procurement
- [x] 5. Sync `get_document_missing_count` in `backend/api/utils/document_helpers.py`
- [x] 6. `cd backend && python manage.py check`
- [ ] 7. Test: `cd backend && python manage.py runserver`, create new Procurement in frontend/encode
- [ ] 8. `cd backend && python manage.py recalculate_document_status`
- [ ] 9. Update TODO.md with [x] and attempt_completion

## Previous Backend Fixes (Complete):
- [x] CHECKLIST_DOC_TYPES import fix

