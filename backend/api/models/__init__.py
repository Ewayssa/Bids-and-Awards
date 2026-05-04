from django.contrib.auth.models import AbstractUser, UserManager as AuthUserManager  # type: ignore
from django.db import models  # type: ignore
from django.db.models.signals import post_save, pre_save  # type: ignore
from django.dispatch import receiver  # type: ignore
import json
import os
import re
import uuid
from ..utils.document_status import DocumentStatusCalculator


def document_file_upload_to(instance, filename):
    """
    Store uploaded document in a folder by category and BAC Folder No. (prNo).
    Path: documents/{category}/{prNo}/{filename}
    """
    category = (instance.category or 'General').strip()
    category = re.sub(r'[<>:"/\\|?*\x00-\x1f]', '_', category)[:100] or 'General'
    pr_no = (instance.prNo or 'unknown').strip()
    pr_no = re.sub(r'[<>:"/\\|?*\x00-\x1f]', '_', pr_no)[:50] or 'unknown'
    name = os.path.basename(filename)
    name = re.sub(r'[<>:"/\\|?*\x00-\x1f]', '_', name)[:200] or 'document'
    return os.path.join('documents', category, pr_no, name)


class UserManager(AuthUserManager):
    """Custom manager so create_user/create_superuser accept role, fullName, office."""

    def create_superuser(self, username, email=None, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('role', 'admin')
        if extra_fields.get('is_staff') is not True:
            raise ValueError('Superuser must have is_staff=True.')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Superuser must have is_superuser=True.')
        return self._create_user(username, email, password, **extra_fields)


class User(AbstractUser):
    ROLE_CHOICES = (
        ('admin', 'Admin'),
        ('bac_secretariat', 'BAC Secretariat'),
        ('bac_member', 'BAC Member'),
        ('supply', 'Supply Officer'),
        ('end_user', 'End User'),
    )
    POSITION_CHOICES = (
        ('BAC Secretariat', 'BAC Secretariat'),
        ('BAC Member', 'BAC Member'),
        ('Supply Officer', 'Supply Officer'),
    )
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='end_user')
    fullName = models.CharField(max_length=255, blank=True)
    position = models.CharField(
        max_length=255, 
        blank=True, 
        choices=POSITION_CHOICES,
        help_text='Position or designation'
    )
    office = models.CharField(max_length=255, blank=True, help_text='Department')
    must_change_password = models.BooleanField(default=False, help_text='Require user to set a new password on next login')

    objects = UserManager()

    def __str__(self):
        return self.username





class Document(models.Model):
    STATUS_CHOICES = (
        ('pending', 'Pending'),
        ('ongoing', 'Ongoing'),
        ('complete', 'Complete'),
    )
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    prNo = models.CharField(max_length=100, blank=True, help_text='BAC Folder No.')
    title = models.CharField(max_length=255, blank=True)
    date = models.DateField(null=True, blank=True)
    uploadedBy = models.CharField(max_length=255, blank=True)
    category = models.CharField(max_length=255)
    subDoc = models.CharField(max_length=255)
    user_pr_no = models.CharField(max_length=100, blank=True, help_text='Official PR No. assigned by BAC')
    ppmp_no = models.CharField(max_length=100, blank=True, help_text='Associated PPMP No.')
    year = models.CharField(max_length=4, blank=True)
    quarter = models.CharField(max_length=10, blank=True)
    pr_items = models.TextField(blank=True)
    total_amount = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    source_of_fund = models.CharField(max_length=255, blank=True)
    app_no = models.CharField(max_length=100, blank=True)
    app_type = models.CharField(max_length=20, blank=True)
    
    # Certification and Market fields
    certified_signed_by = models.CharField(max_length=255, blank=True)
    market_period_from = models.CharField(max_length=20, blank=True)
    market_period_to = models.CharField(max_length=20, blank=True)
    market_expected_delivery = models.CharField(max_length=20, blank=True)
    market_service_provider_1 = models.CharField(max_length=255, blank=True)
    market_service_provider_2 = models.CharField(max_length=255, blank=True)
    market_service_provider_3 = models.CharField(max_length=255, blank=True)
    
    # Office and Process fields
    office_division = models.CharField(max_length=255, blank=True)
    received_by = models.CharField(max_length=255, blank=True)
    attendance_members = models.TextField(blank=True)
    resolution_no = models.CharField(max_length=100, blank=True)
    resolution_option = models.CharField(max_length=20, blank=True)
    venue = models.CharField(max_length=255, blank=True)
    winning_bidder = models.CharField(max_length=255, blank=True)
    abstract_bidders = models.TextField(blank=True)
    aoq_no = models.CharField(max_length=100, blank=True)
    
    # Notice and Award fields
    notice_award_authorized_rep = models.CharField(max_length=255, blank=True)
    notice_award_conforme = models.CharField(max_length=255, blank=True)
    notice_award_service_provider = models.CharField(max_length=255, blank=True)
    table_rating_address = models.CharField(max_length=500, blank=True)
    table_rating_factor_value = models.CharField(max_length=100, blank=True)
    table_rating_service_provider = models.CharField(max_length=255, blank=True)
    
    # Final strict fields
    notarized_place = models.CharField(max_length=255, blank=True)
    ntp_service_provider = models.CharField(max_length=255, blank=True)
    ntp_authorized_rep = models.CharField(max_length=255, blank=True)
    ntp_received_by = models.CharField(max_length=255, blank=True)
    oss_service_provider = models.CharField(max_length=255, blank=True)
    oss_authorized_rep = models.CharField(max_length=255, blank=True)
    secretary_service_provider = models.CharField(max_length=255, blank=True)
    secretary_owner_rep = models.CharField(max_length=255, blank=True)
    
    po_status = models.CharField(max_length=20, blank=True)
    certified_true_copy = models.BooleanField(default=False)
    contract_received_by_coa = models.BooleanField(default=False)
    
    file = models.FileField(upload_to=document_file_upload_to, blank=True, null=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')

    def calculate_status(self):
        """
        Automatically calculate status based on document completeness.
        Uses DocumentStatusCalculator for clean, maintainable logic.
        """
        return DocumentStatusCalculator.calculate_status(self)

    def save(self, *args, **kwargs):
        # Always auto-calculate status before saving
        self.status = self.calculate_status()
        super().save(*args, **kwargs)

    @property
    def current_status(self):
        """Always return the current calculated status (real-time)"""
        return self.calculate_status()

    def __str__(self):
        return f"{self.title} ({self.prNo})"


# Signal to ensure status is always recalculated after save
@receiver(post_save, sender=Document)
def recalculate_document_status(sender, instance, created, **kwargs):
    """
    Ensure status is always recalculated and saved after any save operation.
    Refresh from DB first to get the latest file information.
    """
    # Refresh from DB to get latest file path (file.name is set after save)
    instance.refresh_from_db()

    # Recalculate status with fresh data
    calculated_status = instance.calculate_status()

    if instance.status != calculated_status:
        Document.objects.filter(pk=instance.pk).update(status=calculated_status)
        instance.status = calculated_status


class Report(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=255)
    uploaded_at = models.DateTimeField(auto_now_add=True)
    uploadedBy = models.CharField(max_length=255, blank=True)
    submitting_office = models.CharField(max_length=255, blank=True)
    file = models.FileField(upload_to='reports/')

    def __str__(self):
        return self.title


class CalendarEvent(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=255)
    date = models.DateField()
    created_at = models.DateTimeField(auto_now_add=True)
    reminder_sent = models.BooleanField(default=False, help_text='Has an upcoming reminder been sent for this event?')

    def __str__(self):
        return f"{self.title} ({self.date})"


class Notification(models.Model):
    """In-system notifications (no email/SMS)."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    message = models.CharField(max_length=500)
    created_at = models.DateTimeField(auto_now_add=True)
    read = models.BooleanField(default=False)
    link = models.CharField(max_length=255, blank=True)  # e.g. /encode
    
    # Target audience
    recipient_role = models.CharField(
        max_length=20, 
        choices=User.ROLE_CHOICES, 
        blank=True, 
        null=True,
        help_text='If set, only users with this role will see the notification'
    )
    recipient = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='notifications',
        help_text='If set, only this specific user will see the notification'
    )
    admin_only = models.BooleanField(default=False, help_text='Deprecated: Use recipient_role="admin" or "bac_secretariat" instead')

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.message[:50]


class AuditLog(models.Model):
    """Audit trail for important system actions (who did what, when)."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    action = models.CharField(max_length=64, db_index=True)  # e.g. document_created, user_login
    actor = models.CharField(max_length=255, blank=True)   # username or "System"
    target_type = models.CharField(max_length=64, blank=True)  # document, user, report, etc.
    target_id = models.CharField(max_length=64, blank=True)
    description = models.CharField(max_length=500, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.actor}: {self.action} at {self.created_at}"

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

    def __str__(self):
        return f"{self.pr_no} - {self.title}"



# Single synchronization: When ProcurementRecord.user_pr_no is updated, 
# propagate it to all linked PR documents.
@receiver(post_save, sender=ProcurementRecord)
def sync_pr_number_to_documents(sender, instance, created, **kwargs):
    """
    If a user_pr_no is assigned to the record, find all related PR documents 
    and update their user_pr_no as well for consistency.
    """
    if instance.user_pr_no:
        from . import Document
        Document.objects.filter(prNo=instance.pr_no).update(user_pr_no=instance.user_pr_no)

class PurchaseRequest(models.Model):
    STATUS_CHOICES = (
        ('ongoing', 'Ongoing'),
        ('completed', 'Completed'),
        ('po_generated', 'PO Generated'),
        ('cancelled', 'Cancelled'),
    )
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    ppmp = models.ForeignKey(
        ProcurementRecord, 
        on_delete=models.CASCADE, 
        related_name='purchase_requests',
        null=True,
        blank=True,
        help_text='Link to the associated PPMP (Procurement Record)'
    )
    pr_no = models.CharField(max_length=100, blank=True)
    purpose = models.TextField(help_text='Purpose of the purchase request')
    grand_total = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='ongoing')
    created_by = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        
        # Sync PR No. and Purpose to the parent ProcurementRecord (Folder) if linked
        if self.ppmp:
            updated = False
            # Update folder's user_pr_no if it differs
            if self.pr_no and self.ppmp.user_pr_no != self.pr_no:
                self.ppmp.user_pr_no = self.pr_no
                updated = True
            # Update folder's title (Purpose) if it differs
            if self.purpose and self.ppmp.title != self.purpose:
                self.ppmp.title = self.purpose
                updated = True
            
            if updated:
                self.ppmp.save(update_fields=['user_pr_no', 'title'])
        
        # Propagate PR No to items
        if self.pr_no:
            self.items.all().update(pr_no=self.pr_no)

    def __str__(self):
        return f"PR {self.pr_no} - {self.purpose[:50]}"

@receiver(post_save, sender=PurchaseRequest)
def check_pr_folder_readiness(sender, instance, created, **kwargs):
    """When a PR is saved, check if the parent folder is now complete."""
    if instance.ppmp:
        from ..utils.workflow_logic import check_folder_readiness
        check_folder_readiness(instance.ppmp)

class PurchaseRequestItem(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    purchase_request = models.ForeignKey(
        PurchaseRequest, 
        on_delete=models.CASCADE, 
        related_name='items'
    )
    pr_no = models.CharField(max_length=100, blank=True, null=True, help_text='Denormalized PR No. for reporting')
    unit = models.CharField(max_length=50)
    description = models.TextField()
    quantity = models.DecimalField(max_digits=12, decimal_places=2)
    unit_cost = models.DecimalField(max_digits=14, decimal_places=2)
    total = models.DecimalField(max_digits=14, decimal_places=2)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if self.purchase_request and self.purchase_request.pr_no:
            self.pr_no = self.purchase_request.pr_no
        super().save(*args, **kwargs)

    def __str__(self):
        return f"[{self.pr_no}] {self.description} ({self.quantity} {self.unit})"

class PurchaseOrder(models.Model):
    STATUS_CHOICES = (
        ('pending', 'Pending'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    )
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    purchase_request = models.ForeignKey(
        PurchaseRequest, 
        on_delete=models.CASCADE, 
        related_name='purchase_orders',
        null=True,
        blank=True
    )
    po_no = models.CharField(max_length=100, unique=True)
    supplier_name = models.CharField(max_length=255)
    supplier_address = models.CharField(max_length=500, blank=True)
    po_date = models.DateField()
    mode_of_procurement = models.CharField(max_length=100, blank=True)
    delivery_terms = models.CharField(max_length=255, blank=True)
    total_amount = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    
    # Keeping some legacy fields for backward compatibility or if needed by printer
    tin = models.CharField(max_length=100, blank=True)
    place_of_delivery = models.CharField(max_length=255, blank=True)
    date_of_delivery = models.CharField(max_length=255, blank=True)
    payment_term = models.CharField(max_length=100, blank=True)
    amount_in_words = models.CharField(max_length=500, blank=True)
    fund_cluster = models.CharField(max_length=100, blank=True)
    funds_available = models.CharField(max_length=255, blank=True)
    ors_burs_no = models.CharField(max_length=100, blank=True)
    date_of_ors_burs = models.DateField(null=True, blank=True)
    ors_burs_amount = models.CharField(max_length=100, blank=True)
    
    created_by = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"PO {self.po_no}"

