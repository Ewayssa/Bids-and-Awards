from django.contrib.auth.models import AbstractUser, UserManager as AuthUserManager  # type: ignore
from django.db import models  # type: ignore
from django.db.models.signals import post_save, pre_save  # type: ignore
from django.dispatch import receiver  # type: ignore
import json
import os
import re
import uuid
from .utils.document_status import DocumentStatusCalculator


CHECKLIST_DOC_TYPES = [
    ('Planning', [
        'Annual Procurement Plan',
        'Activity Design', 
        'Project Procurement Management Plan/Supplemental PPMP',
        'Market Scopping'
    ]),
    ('Procurement', ['Requisition and Issue Slip']),
    ('Pre-Bidding', ['Lease of Venue', 'Invitation to COA']),
    ('Bidding', ['Attendance Sheet', 'BAC Resolution', 'Abstract of Quotation']),
    ('Post Qualification', ['Lease of Venue: Table Rating Factor', 'Notice of Award']),
    ('Contract', ['Contract Services/Purchase Order', 'Notice to Proceed', 'OSS']),
    ('RFQ', [
        'PHILGEPS - Small Value Procurement',
        'PHILGEPS - Public Bidding', 
        'Certificate of DILG - Small Value Procurement',
        'Certificate of DILG - Public Bidding'
    ]),
    ('Secretary Cert', ["Applicable: Secretary's Certificate and Special Power of Attorney"])
]


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
        ('user', 'User'),
    )
    POSITION_CHOICES = (
        ('BAC Chairperson', 'BAC Chairperson'),
        ('BAC Secretariat', 'BAC Secretariat'),
        ('BAC Member', 'BAC Member'),
    )
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default='user')
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
    prNo = models.CharField(max_length=100, blank=True, help_text='BAC Folder No. (auto-generated on create, format YYYY-MM-NNN)')
    title = models.CharField(max_length=255, blank=True)
    user_pr_no = models.CharField(max_length=100, blank=True, help_text='PR No. (user-entered, for Purchase Request)')
    total_amount = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True, help_text='Total amount (for Purchase Request)')
    source_of_fund = models.CharField(max_length=255, blank=True, help_text='Source of Fund (for Activity Design, PPMP)')
    ppmp_no = models.CharField(max_length=100, blank=True, help_text='PPMP No. (user-entered, for Project Procurement Management Plan/Supplemental PPMP)')
    app_no = models.CharField(max_length=100, blank=True, help_text='APP No. (for Annual Procurement Plan)')
    app_type = models.CharField(max_length=20, blank=True, help_text='APP type: Final or Updated (for Annual Procurement Plan)')
    certified_true_copy = models.BooleanField(default=False, help_text='Certified True Copy? (for Annual Procurement Plan)')
    certified_signed_by = models.CharField(max_length=255, blank=True, help_text='Signed by (when Certified True Copy is Yes)')
    market_budget = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True, help_text='Budget (for Market Scopping)')
    market_period_from = models.CharField(max_length=20, blank=True, help_text='Period from MM/YY (for Market Scopping)')
    market_period_to = models.CharField(max_length=20, blank=True, help_text='Period to MM/YY (for Market Scopping)')
    market_expected_delivery = models.CharField(max_length=20, blank=True, help_text='Expected Delivery MM/YYYY (for Market Scopping)')
    market_service_provider_1 = models.CharField(max_length=255, blank=True, help_text='Service Provider 1 (for Market Scopping)')
    market_service_provider_2 = models.CharField(max_length=255, blank=True, help_text='Service Provider 2 (for Market Scopping)')
    market_service_provider_3 = models.CharField(max_length=255, blank=True, help_text='Service Provider 3 (for Market Scopping)')
    office_division = models.CharField(max_length=255, blank=True, help_text='Office/Division (for Requisition and Issue Slip)')
    received_by = models.CharField(max_length=255, blank=True, help_text='Received By (for Requisition and Issue Slip)')
    date = models.DateField(null=True, blank=True)
    date_received = models.DateField(null=True, blank=True, help_text='Date received (for Invitation to COA)')
    attendance_members = models.TextField(blank=True, help_text='JSON array of {name, present} (for Attendance Sheet)')
    resolution_no = models.CharField(max_length=100, blank=True, help_text='Resolution No. (for BAC Resolution)')
    winning_bidder = models.CharField(max_length=255, blank=True, help_text='Winning Bidder (for BAC Resolution)')
    resolution_option = models.CharField(max_length=20, blank=True, help_text='Options: LCB, LCRB, SCB, SCRB (for BAC Resolution)')
    venue = models.CharField(max_length=255, blank=True, help_text='Venue (for BAC Resolution)')
    aoq_no = models.CharField(max_length=100, blank=True, help_text='AOQ No. (for Abstract of Quotation)')
    abstract_bidders = models.TextField(blank=True, help_text='JSON array of {name, amount, remarks} (for Abstract of Quotation), min 3 bidders')
    table_rating_service_provider = models.CharField(max_length=255, blank=True, help_text='Service Provider (for Lease of Venue: Table Rating Factor)')
    table_rating_address = models.CharField(max_length=500, blank=True, help_text='Address (for Lease of Venue: Table Rating Factor)')
    table_rating_factor_value = models.CharField(max_length=100, blank=True, help_text='Factor Value (for Lease of Venue: Table Rating Factor)')
    notice_award_service_provider = models.CharField(max_length=255, blank=True, help_text='Service Provider (for Notice of Award)')
    notice_award_authorized_rep = models.CharField(max_length=255, blank=True, help_text='Authorized Representative/Owner (for Notice of Award)')
    notice_award_conforme = models.CharField(max_length=255, blank=True, help_text='Conforme (for Notice of Award)')
    contract_received_by_coa = models.BooleanField(default=False, help_text='Received by COA? Yes/No (for Contract Services/Purchase Order)')
    contract_amount = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True, help_text='Contract Amount (for Contract Services/Purchase Order)')
    notarized_place = models.CharField(max_length=255, blank=True, help_text='Notarized place (for Contract Services/Purchase Order)')
    notarized_date = models.DateField(null=True, blank=True, help_text='Notarized date (for Contract Services/Purchase Order)')
    ntp_service_provider = models.CharField(max_length=255, blank=True, help_text='Service Provider (for Notice to Proceed)')
    ntp_authorized_rep = models.CharField(max_length=255, blank=True, help_text='Authorized Representative/Owner (for Notice to Proceed)')
    ntp_received_by = models.CharField(max_length=255, blank=True, help_text='Received By (for Notice to Proceed)')
    oss_service_provider = models.CharField(max_length=255, blank=True, help_text='Service Provider (for OSS)')
    oss_authorized_rep = models.CharField(max_length=255, blank=True, help_text='Authorized Representative/Owner (for OSS)')
    secretary_service_provider = models.CharField(max_length=255, blank=True, help_text="Service Provider (for Secretary's Certificate)")
    secretary_owner_rep = models.CharField(max_length=255, blank=True, help_text="Owner/Authorized Representative (for Secretary's Certificate)")
    uploadedBy = models.CharField(max_length=255, blank=True)
    category = models.CharField(max_length=255)
    subDoc = models.CharField(max_length=255)
    file = models.FileField(upload_to=document_file_upload_to, blank=True, null=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)  # Track last update time
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')

    def calculate_status(self):
        """
        Automatically calculate status based on document completeness.
        Uses DocumentStatusCalculator for clean, maintainable logic.
        """
        return DocumentStatusCalculator.calculate_status(self)

    def save(self, *args, **kwargs):
        # Always auto-calculate status before saving
        # This ensures status reflects current document completeness
        calculated_status = self.calculate_status()
        self.status = calculated_status
        
        # If update_fields is specified, add status to it so it gets saved
        if 'update_fields' in kwargs and kwargs['update_fields'] is not None:
            update_fields = list(kwargs['update_fields'])
            if 'status' not in update_fields:
                update_fields.append('status')
            kwargs['update_fields'] = update_fields
        
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
    This catches cases where save() might be bypassed or status wasn't updated.
    Refresh from DB first to get the latest file information.
    """
    # Refresh from DB to get latest file path (file.name is set after save)
    instance.refresh_from_db()
    
    # Recalculate status with fresh data
    calculated_status = instance.calculate_status()
    
    # Always update status if it differs (ensures real-time accuracy)
    if instance.status != calculated_status:
        # Use update() to avoid triggering save signal again (prevents infinite loop)
        # update() bypasses the model's save() method and signals
        Document.objects.filter(pk=instance.pk).update(status=calculated_status)
        # Update instance attribute so it's in sync
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

    def __str__(self):
        return f"{self.title} ({self.date})"


class Notification(models.Model):
    """In-system notifications (no email/SMS)."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    message = models.CharField(max_length=500)
    created_at = models.DateTimeField(auto_now_add=True)
    read = models.BooleanField(default=False)
    link = models.CharField(max_length=255, blank=True)  # e.g. /encode
    admin_only = models.BooleanField(default=False, help_text='Only visible to admin users')

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
