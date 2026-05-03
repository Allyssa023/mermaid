package com.mermaid.app.service;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class StubPaymentGatewayServiceTest {

    private final StubPaymentGatewayService service = new StubPaymentGatewayService();

    @Test
    void createIntent_returnsFakeKeys() {
        var result = service.createIntent(15000, "Order #1", "idem-key-1");

        assertNotNull(result.clientKey());
        assertTrue(result.clientKey().startsWith("ck_stub_"));
        assertEquals("pk_stub_test", result.publicKey());
        assertNotNull(result.paymentIntentId());
        assertTrue(result.paymentIntentId().startsWith("pi_stub_"));
    }

    @Test
    void createIntent_uniquePerCall() {
        var r1 = service.createIntent(1000, "Test1", "key1");
        var r2 = service.createIntent(2000, "Test2", "key2");

        assertNotEquals(r1.clientKey(), r2.clientKey());
        assertNotEquals(r1.paymentIntentId(), r2.paymentIntentId());
    }

    @Test
    void verifyWebhookSignature_alwaysTrue() {
        assertTrue(service.verifyWebhookSignature("payload", "sig"));
        assertTrue(service.verifyWebhookSignature(null, null));
    }

    @Test
    void getGatewayName_returnsStub() {
        assertEquals("STUB", service.getGatewayName());
    }
}
