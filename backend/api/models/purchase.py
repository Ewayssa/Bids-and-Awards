import uuid
from django.db import models
from django.db.models.signals import post_save
from django.dispatch import receiver
from .procurement import ProcurementRecord

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
        to_field='pr_no',
        on_delete=models.CASCADE, 
        related_name='purchase_requests',
        null=True,
        blank=True,
        help_text='Link to the associated PPMP (Procurement Record)'
    )
    pr_no = models.CharField(max_length=100, blank=True, null=True, unique=True)
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
        to_field='pr_no',
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
