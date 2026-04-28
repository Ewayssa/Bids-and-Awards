from datetime import timedelta
import os
import shutil

from django.core import mail
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient

from api.models import CalendarEvent, Document, ProcurementRecord, Report, User
from api.services.dashboard_service import DashboardService
from api.services.notification_service import EmailNotificationService
from api.utils.document_helpers import get_document_missing_count

TEST_MEDIA_ROOT = os.path.join(os.getcwd(), 'backend-test-media')


def ensure_test_media_root():
    os.makedirs(os.path.join(TEST_MEDIA_ROOT, 'documents'), exist_ok=True)
    os.makedirs(os.path.join(TEST_MEDIA_ROOT, 'reports'), exist_ok=True)


ensure_test_media_root()


@override_settings(
    EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend',
    DEFAULT_FROM_EMAIL='noreply@example.com',
)
class CalendarEventEmailTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.actor = User.objects.create_user(
            username='secretariat',
            email='secretariat@example.com',
            password='password',
            role='admin',
        )
        self.recipient = User.objects.create_user(
            username='member',
            email='member@example.com',
            password='password',
        )
        self.client.force_authenticate(self.actor)

    def test_calendar_event_create_emails_system_users(self):
        response = self.client.post(
            reverse('calendar-event-list'),
            {
                'title': 'Pre-bid Conference',
                'date': timezone.now().date().isoformat(),
                'created_by': self.actor.username,
            },
            format='json',
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn('OFFICIAL NOTICE: New BAC Activity - Pre-bid Conference', mail.outbox[0].subject)
        self.assertCountEqual(
            mail.outbox[0].to,
            ['secretariat@example.com', 'member@example.com'],
        )

    def test_due_event_reminder_emails_once_and_marks_sent(self):
        event = CalendarEvent.objects.create(
            title='Bid Opening',
            date=timezone.now().date() + timedelta(days=1),
        )

        result = EmailNotificationService.send_due_event_reminders()
        event.refresh_from_db()

        self.assertEqual(result['sent'], 1)
        self.assertEqual(result['errors'], 0)
        self.assertTrue(event.reminder_sent)
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn('REMINDER: Scheduled BAC Activity - Bid Opening', mail.outbox[0].subject)

        second_result = EmailNotificationService.send_due_event_reminders()
        self.assertEqual(second_result['sent'], 0)
        self.assertEqual(len(mail.outbox), 1)


@override_settings(MEDIA_ROOT=TEST_MEDIA_ROOT)
class PreviewFilenameTests(TestCase):
    @classmethod
    def setUpClass(cls):
        ensure_test_media_root()
        super().setUpClass()

    @classmethod
    def tearDownClass(cls):
        super().tearDownClass()
        shutil.rmtree(TEST_MEDIA_ROOT, ignore_errors=True)

    def test_document_preview_uses_uploaded_filename_in_inline_header(self):
        uploaded_file = SimpleUploadedFile(
            'Original Upload Name.pdf',
            b'%PDF-1.4 test document',
            content_type='application/pdf',
        )
        document = Document.objects.create(
            title='Internal Title',
            category='BAC Meeting Documents',
            subDoc='Notice of BAC Meeting',
            file=uploaded_file,
        )

        response = self.client.get(reverse('upload-preview', args=[document.id]))

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response['Content-Type'], 'application/pdf')
        self.assertIn('inline', response['Content-Disposition'])
        self.assertIn('filename="Original_Upload_Name.pdf"', response['Content-Disposition'])

    def test_report_preview_uses_uploaded_filename_in_inline_header(self):
        uploaded_file = SimpleUploadedFile(
            'Quarterly Report.pdf',
            b'%PDF-1.4 test report',
            content_type='application/pdf',
        )
        report = Report.objects.create(
            title='Report Title',
            uploadedBy='Tester',
            file=uploaded_file,
        )

        response = self.client.get(reverse('report-preview', args=[report.id]))

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response['Content-Type'], 'application/pdf')
        self.assertIn('inline', response['Content-Disposition'])
        self.assertIn('filename="Quarterly_Report.pdf"', response['Content-Disposition'])


class PurchaseRequestGeneratedFileTests(TestCase):
    def test_purchase_request_generated_file_does_not_require_upload(self):
        document = Document.objects.create(
            title='Office Supplies',
            date=timezone.now().date(),
            prNo='2026-04-001',
            category='Procurement',
            subDoc='Purchase Request',
            uploadedBy='Tester',
            total_amount='1500.00',
            pr_items='[{"unit":"pc","description":"Paper","quantity":3,"unit_cost":500}]',
        )

        self.assertFalse(document.file)
        self.assertEqual(document.status, 'complete')
        self.assertEqual(get_document_missing_count(document), 0)


@override_settings(MEDIA_ROOT=TEST_MEDIA_ROOT)
class ProcurementCompletionTests(TestCase):
    @classmethod
    def setUpClass(cls):
        ensure_test_media_root()
        super().setUpClass()

    @classmethod
    def tearDownClass(cls):
        super().tearDownClass()
        shutil.rmtree(TEST_MEDIA_ROOT, ignore_errors=True)

    def test_record_auto_completes_when_all_required_files_are_uploaded(self):
        user = User.objects.create_user(
            username='uploader',
            email='uploader@example.com',
            password='password',
            role='admin',
        )
        client = APIClient()
        client.force_authenticate(user)
        record = ProcurementRecord.objects.create(
            pr_no='2026-04-999',
            ppmp_no='PPMP-999',
            title='Public bidding test',
            procurement_type='public_bidding',
            created_by='Tester',
        )

        Document.objects.create(
            procurement_record=record,
            prNo=record.pr_no,
            ppmp_no=record.ppmp_no,
            title='PR',
            date=timezone.now().date(),
            category='Initial Documents',
            subDoc='Purchase Request',
            uploadedBy='Tester',
            total_amount='1000.00',
        )

        for sub_doc in [
            'Project Procurement Management Plan/Supplemental PPMP',
            'Annual Procurement Plan',
            'BAC Resolution',
        ]:
            Document.objects.create(
                procurement_record=record,
                prNo=record.pr_no,
                ppmp_no=record.ppmp_no,
                title=sub_doc,
                date=timezone.now().date(),
                category='Initial Documents',
                subDoc=sub_doc,
                uploadedBy='Tester',
                file=SimpleUploadedFile(f'{sub_doc}.pdf', b'%PDF-1.4 test', content_type='application/pdf'),
            )

        record.refresh_from_db()
        self.assertNotEqual(record.status, 'completed')

        response = client.post(
            reverse('upload-list'),
            {
                'title': 'Contract',
                'prNo': record.pr_no,
                'ppmp_no': record.ppmp_no,
                'category': 'Award Documents',
                'subDoc': 'Contract',
                'date': timezone.now().date().isoformat(),
                'uploadedBy': 'Tester',
                'procurement_record': str(record.id),
                'file': SimpleUploadedFile('Contract.pdf', b'%PDF-1.4 test', content_type='application/pdf'),
            },
            format='multipart',
        )

        self.assertEqual(response.status_code, 201)
        record.refresh_from_db()
        self.assertEqual(record.status, 'completed')


class DashboardFolderStatsTests(TestCase):
    def test_stats_count_completed_by_folder_not_document(self):
        record = ProcurementRecord.objects.create(
            pr_no='2026-04-997',
            ppmp_no='PPMP-997',
            title='Folder stats',
            created_by='Tester',
        )

        Document.objects.create(
            procurement_record=record,
            prNo=record.pr_no,
            ppmp_no=record.ppmp_no,
            title='PR',
            category='Initial Documents',
            subDoc='Purchase Request',
            uploadedBy='Tester',
            total_amount='1000.00',
        )

        for sub_doc in ['Requisition and Issue Slip', 'Activity Design', 'Market Scoping']:
            Document.objects.create(
                procurement_record=record,
                prNo=record.pr_no,
                ppmp_no=record.ppmp_no,
                title=sub_doc,
                category='Initial Documents',
                subDoc=sub_doc,
                uploadedBy='Tester',
                file=SimpleUploadedFile(f'{sub_doc}.pdf', b'%PDF-1.4 test', content_type='application/pdf'),
            )

        stats = DashboardService.get_folder_stats()

        self.assertEqual(stats['total'], 1)
        self.assertEqual(stats['complete'], 1)
        self.assertEqual(stats['ongoing'], 0)

    def test_stats_count_folder_with_missing_file_as_ongoing(self):
        record = ProcurementRecord.objects.create(
            pr_no='2026-04-996',
            ppmp_no='PPMP-996',
            title='Folder stats ongoing',
            created_by='Tester',
        )
        Document.objects.create(
            procurement_record=record,
            prNo=record.pr_no,
            ppmp_no=record.ppmp_no,
            title='Activity Design',
            category='Initial Documents',
            subDoc='Activity Design',
            uploadedBy='Tester',
        )

        stats = DashboardService.get_folder_stats()

        self.assertEqual(stats['total'], 1)
        self.assertEqual(stats['complete'], 0)
        self.assertEqual(stats['ongoing'], 1)

    def test_record_without_procurement_type_completes_from_linked_files(self):
        record = ProcurementRecord.objects.create(
            pr_no='2026-04-998',
            ppmp_no='PPMP-998',
            title='Legacy package',
            procurement_type='',
            created_by='Tester',
        )

        Document.objects.create(
            procurement_record=record,
            prNo=record.pr_no,
            ppmp_no=record.ppmp_no,
            title='PR',
            category='Initial Documents',
            subDoc='Purchase Request',
            uploadedBy='Tester',
            total_amount='1000.00',
        )
        Document.objects.create(
            procurement_record=record,
            prNo=record.pr_no,
            ppmp_no=record.ppmp_no,
            title='PPMP',
            category='Initial Documents',
            subDoc='Project Procurement Management Plan/Supplemental PPMP',
            uploadedBy='Tester',
            file=SimpleUploadedFile('PPMP.pdf', b'%PDF-1.4 test', content_type='application/pdf'),
        )

        from api.utils.workflow_logic import sync_procurement_completion
        sync_procurement_completion(record)

        record.refresh_from_db()
        self.assertEqual(record.status, 'completed')
        self.assertEqual(record.current_stage, 12)
