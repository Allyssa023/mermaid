package com.mermaid.app.service;

import com.mermaid.app.domain.Order;
import com.mermaid.app.domain.OrderKind;
import com.mermaid.app.domain.Payment;
import com.mermaid.app.repository.OrderRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.offset;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class EarningsServiceTest {

    @Mock OrderRepository orderRepo;
    @Mock com.mermaid.app.repository.HandoffConfirmationRepository handoffRepo;
    @Mock com.mermaid.app.repository.PaymentRepository paymentRepo;
    @Mock com.mermaid.app.repository.UserRepository userRepo;
    @InjectMocks EarningsService service;

    private Order makeOrder(Long id, String paymentMethod, BigDecimal qty, BigDecimal price) {
        Order o = new Order();
        o.setId(id);
        o.setKind(OrderKind.PROCUREMENT);
        o.setStatus("COMPLETED");
        o.setPaymentMethod(paymentMethod);
        o.setOrderedQtyKg(qty);
        o.setAgreedPricePerKg(price);
        o.setCompletedAt(OffsetDateTime.now());
        return o;
    }

    private Payment makePayment(String method, String status) {
        Payment p = new Payment();
        p.setMethod(method);
        p.setStatus(status);
        return p;
    }

    @Test
    void summary_splits_cash_and_credit_correctly() {
        Order cash   = makeOrder(1L, "CASH",   new BigDecimal("10"), new BigDecimal("50"));
        Order credit = makeOrder(2L, "CREDIT", new BigDecimal("5"),  new BigDecimal("80"));
        when(orderRepo.findBySellerIdAndStatusAndCompletedAtBetween(
            eq(1L), eq("COMPLETED"), any(), any()))
            .thenReturn(List.of(cash, credit));
        when(handoffRepo.findByOrderId(any())).thenReturn(Optional.empty());
        when(paymentRepo.findByOrderId(1L)).thenReturn(Optional.of(makePayment("CASH", "CONFIRMED")));
        when(paymentRepo.findByOrderId(2L)).thenReturn(Optional.of(makePayment("CREDIT", "PENDING")));

        var summary = service.getSummary(1L, null, null);

        assertThat(summary.getTotalGross()).isCloseTo(900.0, offset(0.01));
        assertThat(summary.getCashCollected()).isCloseTo(500.0, offset(0.01));
        assertThat(summary.getCreditOutstanding()).isCloseTo(400.0, offset(0.01));
        assertThat(summary.getOrderCount()).isEqualTo(2);
    }
}
