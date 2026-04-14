"""Custom middleware for the API app."""

from django.conf import settings


class DisableCSRFForAPI:
    """Exempt API requests from CSRF so the React frontend can POST/PATCH/DELETE without a token."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if request.path.startswith('/api/'):
            setattr(request, '_dont_enforce_csrf_checks', True)
        return self.get_response(request)


class SecureHeadersMiddleware:
    """
    Add additional security-related HTTP response headers, similar to the
    CodeIgniter SecureHeaders filter shown in the screenshot.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        media_url = getattr(settings, "MEDIA_URL", "/media/")

        # Allow embedding report preview in iframe (so View shows file in modal)
        if '/api/reports/' in request.path and '/preview/' in request.path:
            response['X-Frame-Options'] = 'SAMEORIGIN'
        # Media files: allow embedding, force inline
        elif request.path.startswith(media_url):
            if "X-Frame-Options" in response:
                del response["X-Frame-Options"]
            response["Content-Disposition"] = "inline"
        else:
            response.setdefault("X-Frame-Options", "DENY")

        # Basic XSS protection header (legacy but harmless for modern browsers).
        response.setdefault("X-XSS-Protection", "1; mode=block")

        # Prevent MIME type sniffing.
        response.setdefault("X-Content-Type-Options", "nosniff")

        # HSTS: only in production to avoid pinning localhost / plain HTTP dev.
        if not settings.DEBUG:
            response.setdefault(
                "Strict-Transport-Security",
                "max-age=31536000; includeSubDomains",
            )

        # Limit information sent in the Referer header.
        response.setdefault("Referrer-Policy", "no-referrer-when-downgrade")

        # Restrict powerful browser features (Permissions Policy).
        response.setdefault(
            "Permissions-Policy",
            "geolocation=(), microphone=(), camera=()",
        )

        return response
