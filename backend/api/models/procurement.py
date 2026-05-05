import uuid
from django.db import models
from .document import Document

class ProcurementRecord(models.Model):
    PROCUREMENT_TYPE_CHOICES = [
        ('lease_of_venue', 'Lease of Venue'),
        ('small_value', 'Small Value Procurement'),
        ('public_bidding', 'Public Bidding'),
        ('negotiated', 'Negotiated Procurement'),
        ('supplies', 'CSE / Supplies'),
    ]

    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('preparing', 'Preparing Documents'),
        ('under_review', 'Under Review'),
        ('for_revision', 'For Revision'),
        ('approved', 'Approved for Input'),
        ('for_input', 'For Input'),
        ('for_posting', 'For Posting'),
        ('for_float', 'For Float'),
        ('for_schedule', 'For Schedule'),
        ('under_evaluation', 'Under Evaluation'),
        ('for_award', 'For Award'),
        ('awarded', 'Awarded'),
        ('for_liquidation', 'For Liquidation'),
        ('completed', 'Completed'),
        ('closed', 'Closed'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    pr_no = models.CharField(max_length=100, help_text='BAC Folder No.')
    ppmp_no = models.CharField(max_length=100, blank=True, help_text='Associated PPMP No. for grouping')
    is_ready = models.BooleanField(default=False, help_text='True if all mandatory docs (PR, Activity Design, RIS, Market Scoping) are uploaded')
    user_pr_no = models.CharField(max_length=100, blank=True, help_text='Official PR No. assigned by BAC')
    year = models.CharField(max_length=4, blank=True, help_text='Year (e.g. 2024)')
    quarter = models.CharField(max_length=10, blank=True, help_text='Quarter (e.g. Q1, Q2)')
    rfq_no = models.CharField(max_length=100, blank=True, help_text='RFQ No.')
    title = models.CharField(max_length=255, help_text='Title / Purpose')
    procurement_type = models.CharField(max_length=50, choices=PROCUREMENT_TYPE_CHOICES, blank=True, help_text='Type of procurement')
    mode_of_procurement = models.CharField(max_length=100, blank=True, default='', help_text='Mode of Procurement')
    source_of_fund = models.CharField(max_length=255, blank=True, help_text='Fund Source')
    total_amount = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True, help_text='ABC / Total Amount')
    end_user_office = models.CharField(max_length=255, blank=True, help_text='End-User / Office')
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default='draft')
    remarks = models.TextField(blank=True, help_text='General Remarks')
    created_by = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    @property
    def documents(self):
        """Fetch all documents associated with this folder (manual link via pr_no)"""
        return Document.objects.filter(prNo=self.pr_no)

    def __str__(self):
        return f"{self.pr_no} - {self.title}"
