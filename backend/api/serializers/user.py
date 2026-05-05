import secrets
import string
from rest_framework import serializers
from ..models import User

class RegisterSerializer(serializers.Serializer):
    """Public self-registration: creates an inactive user (admin must activate)."""
    username = serializers.CharField(max_length=150, required=True)
    password = serializers.CharField(write_only=True, required=True, min_length=8)
    fullName = serializers.CharField(max_length=255, required=True, allow_blank=False)
    position = serializers.CharField(max_length=255, required=False, allow_blank=True, default='')
    office = serializers.CharField(max_length=255, required=False, allow_blank=True, default='')

    def validate_username(self, value):
        value = (value or '').strip()
        if not value:
            raise serializers.ValidationError('Username is required.')
        if User.objects.filter(username__iexact=value).exists():
            raise serializers.ValidationError('A user with this username already exists.')
        return value

    def create(self, validated_data):
        username = validated_data['username'].strip()
        password = validated_data['password']
        full_name = (validated_data.get('fullName') or '').strip()
        position = (validated_data.get('position') or '').strip()
        office = (validated_data.get('office') or '').strip()
        email = username if '@' in username else ''
        user = User.objects.create_user(
            username=username,
            email=email,
            password=password,
            fullName=full_name or username,
            position=position,
            office=office,
            role='user',
            is_active=False,
        )
        user.must_change_password = False
        user.save(update_fields=['must_change_password'])
        return user


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('id', 'username', 'role', 'fullName', 'position', 'office', 'password', 'is_active', 'must_change_password')
        extra_kwargs = {
            'password': {'write_only': True, 'required': False},
            'must_change_password': {'read_only': True},
        }

    def create(self, validated_data):
        alphabet = string.ascii_letters + string.digits + '!@#$%'
        random_password = ''.join(secrets.choice(alphabet) for _ in range(12))
        password = validated_data.pop('password', None) or random_password
        username = validated_data.pop('username')
        email = validated_data.pop('email', None) or ''
        # When username looks like an email, populate email field (used for password reset)
        if not email and '@' in username:
            email = username
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
