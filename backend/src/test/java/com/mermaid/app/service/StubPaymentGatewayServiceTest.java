package com.mermaid.app.service;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class StubPaymentGatewayServiceTest {

    private final StubPaymentGatewayService service = new StubPaymentGatewayService();

    @Test
    void createPaymentRequest_gcash_returnsRedirectUrl() {
        var r = service.createPaymentRequest(15000, "GCASH", "Order #1", "idem-1", "http://localhost:5173/payment/return");
        assertNotNull(r.paymentRequestId());
        assertTrue(r.paymentRequestId().startsWith("pr_stub_"));
        assertNotNull(r.redirectUrl());
        assertTrue(r.redirectUrl().startsWith("https://stub-redirect.test/"));
        assertNull(r.clientKey());
    }

    @Test
    void createPaymentRequest_card_returnsClientKey() {
        var r = service.createPaymentRequest(15000, "CARD", "Order #1", "idem-2", "http://localhost:5173/payment/return");
        assertNotNull(r.clientKey());
        assertTrue(r.clientKey().startsWith("ck_stub_"));
        assertNull(r.redirectUrl());
    }

    @Test
    void createPaymentRequest_uniquePerCall() {
        var r1 = service.createPaymentRequest(1000, "GCASH", "T1", "k1", "http://x");
        var r2 = service.createPaymentRequest(2000, "GCASH", "T2", "k2", "http://x");
        assertNotEquals(r1.paymentRequestId(), r2.paymentRequestId());
    }

    @Test
    void disburse_returnsStubPayoutId() {
        var r = service.disburse("09171234567", "PH_GCASH", 10000, "Pay fisherman", "idem-3");
        assertNotNull(r.payoutId());
        assertTrue(r.payoutId().startsWith("po_stub_"));
        assertEquals("SUCCEEDED", r.status());
    }

    @Test
    void verifyWebhookSignature_alwaysTrue() {
        assertTrue(service.verifyWebhookSignature("payload", "token"));
        assertTrue(service.verifyWebhookSignature(null, null));
    }

    @Test
    void getGatewayName_returnsStub() {
        assertEquals("STUB", service.getGatewayName());
    }
}
