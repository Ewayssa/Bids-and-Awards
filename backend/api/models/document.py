import os
import re
import uuid
from django.db import models
from django.db.models.signals import post_save
from django.dispatch import receiver
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

class Document(models.Model):
    STATUS_CHOICES = (
        ('pending', 'Pending'),
        ('ongoing', 'Ongoing'),
        ('complete', 'Complete'),
    )
    # Basic fields
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    prNo = models.CharField(max_length=100, blank=True, help_text='BAC Folder No.')
    title = models.CharField(max_length=255, blank=True)
    date = models.DateField(null=True, blank=True)
    uploadedBy = models.CharField(max_length=255, blank=True)
    category = models.CharField(max_length=255)
    subDoc = models.CharField(max_length=255)
    
    file = models.FileField(upload_to=document_file_upload_to, blank=True, null=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    
    # Association fields (planning)
    ppmp_no = models.CharField(max_length=100, blank=True, help_text='Associated PPMP No.')
    year = models.CharField(max_length=4, blank=True)
    quarter = models.CharField(max_length=10, blank=True)

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
