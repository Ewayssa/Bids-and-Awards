from django.contrib.auth.models import AbstractUser, UserManager as AuthUserManager  # type: ignore
from django.db import models  # type: ignore
from django.db.models.signals import post_save, pre_save  # type: ignore
from django.dispatch import receiver  # type: ignore
import uuid


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
        ('employee', 'Employee'),
    )
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default='employee')
    fullName = models.CharField(max_length=255, blank=True)
    position = models.CharField(max_length=255, blank=True, help_text='Position or designation')
    office = models.CharField(max_length=255, blank=True, help_text='Department')
    must_change_password = models.BooleanField(default=False, help_text='Require user to set a new password on next login')

    objects = UserManager()

    def __str__(self):
        return self.username


class PasswordResetToken(models.Model):
    """Token for password reset flow; expires after 1 hour."""
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    token = models.CharField(max_length=64, unique=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Reset for {self.user.username}"


class Document(models.Model):
    STATUS_CHOICES = (
        ('pending', 'Pending'),
        ('ongoing', 'Ongoing'),
        ('complete', 'Complete'),
    )
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    prNo = models.CharField(max_length=100, blank=True, help_text='BAC Folder No. / Transaction number (auto-generated on create, format YYYY-MM-NNN)')
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
    uploadedBy = models.CharField(max_length=255, blank=True)
    category = models.CharField(max_length=255)
    subDoc = models.CharField(max_length=255)
    file = models.FileField(upload_to='documents/', blank=True, null=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)  # Track last update time
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')

    def calculate_status(self):
        """
        Automatically calculate status based on document completeness.
        Pending = not yet uploaded (no document record). For existing documents:
        - Ongoing: Any detail field is missing or empty
        - Complete: All detail fields are filled out
        For most sub-docs: requires date. For "Activity Design" and "Project Procurement Management Plan/Supplemental PPMP": requires source_of_fund. For "Annual Procurement Plan": requires app_no, app_type, and Signed by when Certified True Copy.
        """
        # Check title - must have a value
        has_title = bool(self.title and self.title.strip())
        
        # Check PR No - must have a value
        has_pr_no = bool(self.prNo and self.prNo.strip())
        
        # Check category - must have a value (not empty, not just whitespace)
        has_category = bool(self.category and self.category.strip())
        
        # Check subDoc - must have a value (not empty, not just whitespace)
        has_sub_doc = bool(self.subDoc and self.subDoc.strip())
        
        # Date / Source of Fund / APP fields depending on subDoc
        sub_doc_trim = (self.subDoc or '').strip()
        if sub_doc_trim == 'Annual Procurement Plan':
            has_app_type = bool(self.app_type and self.app_type.strip())
            has_app_no = has_app_type and (self.app_type.strip() != 'Updated' or bool(self.app_no and self.app_no.strip()))
            has_certified = not self.certified_true_copy or bool(self.certified_signed_by and self.certified_signed_by.strip())
            has_date = has_app_type and has_app_no and has_certified
        elif sub_doc_trim in ('Activity Design', 'Project Procurement Management Plan/Supplemental PPMP'):
            has_date = bool(self.source_of_fund and self.source_of_fund.strip())
        elif sub_doc_trim == 'Market Scopping':
            has_budget = self.market_budget is not None
            has_period = bool(self.market_period_from and self.market_period_from.strip()) and bool(self.market_period_to and self.market_period_to.strip())
            has_expected = bool(self.market_expected_delivery and self.market_expected_delivery.strip())
            has_all_3 = (
                bool(self.market_service_provider_1 and self.market_service_provider_1.strip()) and
                bool(self.market_service_provider_2 and self.market_service_provider_2.strip()) and
                bool(self.market_service_provider_3 and self.market_service_provider_3.strip())
            )
            has_date = has_budget and has_period and has_expected and has_all_3
        elif sub_doc_trim == 'Requisition and Issue Slip':
            has_date = (
                bool(self.date) and
                bool(self.office_division and self.office_division.strip()) and
                bool(self.received_by and self.received_by.strip())
            )
        elif sub_doc_trim == 'List of Venue':
            has_date = True  # No date required for Philgeps List of Venue
        elif sub_doc_trim.endswith(' - List of Venue'):
            has_date = True  # RFQ List of Venue variants
        elif sub_doc_trim in ('Public Bidding', 'Small Value Procurement', 'PHILGEPS', 'Certificate of DILG'):
            has_date = bool(self.date)
        elif sub_doc_trim.endswith(' - Small Value Procurement') or sub_doc_trim.endswith(' - Public Bidding'):
            has_date = bool(self.date)
        else:
            has_date = bool(self.date)
        
        # Check file - must be uploaded (except List of Venue: no file required)
        has_file = True
        if sub_doc_trim != 'List of Venue' and not sub_doc_trim.endswith(' - List of Venue'):
            has_file = bool(self.file)
            if has_file and hasattr(self.file, 'name'):
                # For saved files, check that name is not empty
                has_file = bool(self.file.name and str(self.file.name).strip())
        
        # Check uploadedBy - must have a value
        has_uploaded_by = bool(self.uploadedBy and self.uploadedBy.strip())
        
        # If ANY field is missing or empty, status is ongoing
        if not (has_title and has_pr_no and has_category and has_sub_doc and has_date and has_file and has_uploaded_by):
            return 'ongoing'
        
        # All fields are present and filled
        return 'complete'

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
