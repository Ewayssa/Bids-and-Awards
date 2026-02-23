from rest_framework import serializers
from .models import User, Document, Report, CalendarEvent, Notification

# Default password for new users; they must change it on first login.
DEFAULT_USER_PASSWORD = 'password'


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('id', 'username', 'role', 'fullName', 'position', 'office', 'password', 'is_active', 'must_change_password')
        extra_kwargs = {
            'password': {'write_only': True, 'required': False},
            'must_change_password': {'read_only': True},
        }

    def create(self, validated_data):
        password = validated_data.pop('password', None) or DEFAULT_USER_PASSWORD
        username = validated_data.pop('username')
        email = validated_data.pop('email', None) or ''
        # Only pass model fields that create_user accepts as extra_fields
        extra = {k: v for k, v in validated_data.items() if k in ('role', 'fullName', 'position', 'office', 'is_active')}
        extra['must_change_password'] = True
        user = User.objects.create_user(username=username, email=email, password=password, **extra)
        # Store temporarily so view can include in create response (not persisted)
        user._temporary_password = password
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if password:
            instance.set_password(password)
        instance.save()
        return instance

def _document_missing_count(obj):
    """Count of missing required fields (title, prNo, category, subDoc, date, file, uploadedBy)."""
    count = 0
    if not (obj.title and str(obj.title).strip()):
        count += 1
    if not (obj.prNo and str(obj.prNo).strip()):
        count += 1
    if not (obj.category and str(obj.category).strip()):
        count += 1
    if not (obj.subDoc and str(obj.subDoc).strip()):
        count += 1
    if not obj.date:
        count += 1
    has_file = bool(obj.file)
    if has_file and hasattr(obj.file, 'name'):
        has_file = bool(obj.file.name and str(obj.file.name).strip())
    if not has_file:
        count += 1
    if not (obj.uploadedBy and str(obj.uploadedBy).strip()):
        count += 1
    return count


class DocumentSerializer(serializers.ModelSerializer):
    file_url = serializers.SerializerMethodField()
    status = serializers.SerializerMethodField()  # Always return calculated status
    updated_at = serializers.DateTimeField(read_only=True)
    missing_count = serializers.SerializerMethodField()

    def get_status(self, obj):
        """Always return the current calculated status (real-time)"""
        return obj.calculate_status()

    def get_missing_count(self, obj):
        return _document_missing_count(obj)

    class Meta:
        model = Document
        fields = ('id', 'prNo', 'title', 'date', 'uploadedBy', 'category', 'subDoc', 'file', 'uploaded_at', 'updated_at', 'status', 'file_url', 'missing_count')
        extra_kwargs = {
            'file': {'required': False},
            'category': {'required': False, 'allow_blank': True},
            'subDoc': {'required': False, 'allow_blank': True},
        }

    def validate_category(self, value):
        """Ensure category has a default value if empty"""
        return value or 'General'

    def validate_subDoc(self, value):
        """Ensure subDoc has a default value if empty"""
        return value or 'N/A'

    def validate_date(self, value):
        """Allow empty string from form data to become None"""
        if value is None or value == '':
            return None
        return value

    def validate_prNo(self, value):
        """PR No must contain only digits."""
        if value is None or value == '':
            return value
        val = str(value).strip()
        if val and not val.isdigit():
            raise serializers.ValidationError('PR No must contain only numbers.')
        return val

    def create(self, validated_data):
        # Remove status if provided (it will be auto-calculated)
        validated_data.pop('status', None)
        instance = super().create(validated_data)
        # Status is automatically set in model's save() method and signal
        # Refresh to get the latest status after signal processing
        instance.refresh_from_db()
        return instance

    def update(self, instance, validated_data):
        # Never allow changing the original uploader through updates.
        # This ensures that the user who started the procurement
        # remains the "owner" for filtering and permissions logic.
        validated_data.pop('uploadedBy', None)

        # Don't clear file if not provided in update
        if 'file' not in validated_data or validated_data.get('file') is None:
            validated_data.pop('file', None)
        # Remove status if provided (it will be auto-calculated)
        validated_data.pop('status', None)
        
        # Update fields manually to ensure save() is called
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        
        # Save will trigger status recalculation via model's save() method
        instance.save()
        
        # Refresh from database to get updated status (after signal processes it)
        instance.refresh_from_db()
        
        return instance

    def get_file_url(self, obj):
        request = self.context.get('request')
        if obj.file and request:
            return request.build_absolute_uri(obj.file.url)
        return None


class ReportSerializer(serializers.ModelSerializer):
    file_url = serializers.SerializerMethodField()

    class Meta:
        model = Report
        fields = ('id', 'title', 'uploaded_at', 'uploadedBy', 'submitting_office', 'file', 'file_url')

    def get_file_url(self, obj):
        request = self.context.get('request')
        if obj.file and request:
            return request.build_absolute_uri(obj.file.url)
        return None


class CalendarEventSerializer(serializers.ModelSerializer):
    class Meta:
        model = CalendarEvent
        fields = ('id', 'title', 'date')

    def validate_date(self, value):
        """Require date; normalize datetime to date."""
        if value is None or value == '':
            raise serializers.ValidationError('Date is required.')
        if hasattr(value, 'date') and callable(getattr(value, 'date', None)):
            return value.date()
        return value


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = ('id', 'message', 'created_at', 'read', 'link')
