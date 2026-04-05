from django.test import TestCase, RequestFactory
from unittest.mock import MagicMock


class TestApiKeyAuthentication(TestCase):
    def setUp(self):
        from conditions.authentication import ApiKeyAuthentication
        self.auth = ApiKeyAuthentication()
        self.factory = RequestFactory()

    def _make_request(self, key=None):
        request = self.factory.get("/api/conditions")
        if key:
            request.META["HTTP_X_API_KEY"] = key
        return request

    def test_valid_key_returns_auth_tuple(self):
        from django.test import override_settings
        with override_settings(MARINE_API_KEY="test-key"):
            from rest_framework.request import Request
            request = self._make_request(key="test-key")
            drf_request = Request(request)
            result = self.auth.authenticate(drf_request)
        assert result is not None
        assert result[0] is None
        assert result[1] == "test-key"

    def test_missing_key_returns_none(self):
        from rest_framework.request import Request
        request = self._make_request()
        drf_request = Request(request)
        result = self.auth.authenticate(drf_request)
        assert result is None

    def test_wrong_key_raises_authentication_failed(self):
        from django.test import override_settings
        from rest_framework.exceptions import AuthenticationFailed
        with override_settings(MARINE_API_KEY="correct-key"):
            from rest_framework.request import Request
            request = self._make_request(key="wrong-key")
            drf_request = Request(request)
            with self.assertRaises(AuthenticationFailed):
                self.auth.authenticate(drf_request)


class TestHasValidApiKey(TestCase):
    def test_authenticated_request_is_permitted(self):
        from conditions.authentication import HasValidApiKey
        perm = HasValidApiKey()
        request = MagicMock()
        request.auth = "some-key"
        assert perm.has_permission(request, None) is True

    def test_unauthenticated_request_is_denied(self):
        from conditions.authentication import HasValidApiKey
        perm = HasValidApiKey()
        request = MagicMock()
        request.auth = None
        assert perm.has_permission(request, None) is False
