"""Custom middleware for the API app."""


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

        # Clickjacking protection (also handled by Django's XFrameOptionsMiddleware,
        # but we set it explicitly here to mirror the original filter).
        response.setdefault("X-Frame-Options", "DENY")

        # Basic XSS protection header (legacy but harmless for modern browsers).
        response.setdefault("X-XSS-Protection", "1; mode=block")

        # Prevent MIME type sniffing.
        response.setdefault("X-Content-Type-Options", "nosniff")

        # Enforce HTTPS for clients that have seen this header (HSTS).
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
