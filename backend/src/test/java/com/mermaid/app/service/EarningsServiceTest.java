package com.mermaid.app.service;

import com.mermaid.app.domain.Order;
import com.mermaid.app.domain.OrderKind;
import com.mermaid.app.repository.OrderRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.offset;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class EarningsServiceTest {

    @Mock OrderRepository orderRepo;
    @InjectMocks EarningsService service;

    private Order makeOrder(String paymentMethod, BigDecimal qty, BigDecimal price) {
        Order o = new Order();
        o.setKind(OrderKind.PROCUREMENT);
        o.setStatus("COMPLETED");
        o.setPaymentMethod(paymentMethod);
        o.setOrderedQtyKg(qty);
        o.setAgreedPricePerKg(price);
        o.setCompletedAt(OffsetDateTime.now());
        return o;
    }

    @Test
    void summary_splits_cash_and_credit_correctly() {
        Order cash   = makeOrder("CASH",   new BigDecimal("10"), new BigDecimal("50"));
        Order credit = makeOrder("CREDIT", new BigDecimal("5"),  new BigDecimal("80"));
        when(orderRepo.findBySellerIdAndKindAndStatusAndCompletedAtBetween(
            eq(1L), eq(OrderKind.PROCUREMENT), eq("COMPLETED"), any(), any()))
            .thenReturn(List.of(cash, credit));

        var summary = service.getSummary(1L, null, null);

        assertThat(summary.getTotalGross()).isCloseTo(900.0, offset(0.01));
        assertThat(summary.getCashCollected()).isCloseTo(500.0, offset(0.01));
        assertThat(summary.getCreditOutstanding()).isCloseTo(400.0, offset(0.01));
        assertThat(summary.getOrderCount()).isEqualTo(2);
    }
}
