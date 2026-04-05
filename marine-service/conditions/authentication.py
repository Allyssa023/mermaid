import hmac

from django.conf import settings
from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed
from rest_framework.permissions import BasePermission


class ApiKeyAuthentication(BaseAuthentication):
    """
    Service-to-service API key authentication via X-API-Key header.
    Returns (None, key) on success — no Django User involved.
    Returns None if header is absent (defers to next authenticator).
    Raises AuthenticationFailed if header is present but wrong.
    """

    def authenticate(self, request):
        key = request.META.get("HTTP_X_API_KEY")
        if key is None:
            return None
        expected = settings.MARINE_API_KEY
        if not hmac.compare_digest(key, expected):
            raise AuthenticationFailed("Invalid API key.")
        return (None, key)

    def authenticate_header(self, request):
        return "X-API-Key"


class HasValidApiKey(BasePermission):
    """
    Grants access if request.auth is set (i.e., ApiKeyAuthentication succeeded).
    Use instead of IsAuthenticated for API-key-only endpoints.
    """

    def has_permission(self, request, view):
        return request.auth is not None
