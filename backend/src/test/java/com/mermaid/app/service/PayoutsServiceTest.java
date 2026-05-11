package com.mermaid.app.service;

import com.mermaid.app.domain.FishSpecies;
import com.mermaid.app.domain.Order;
import com.mermaid.app.domain.OrderKind;
import com.mermaid.app.domain.User;
import com.mermaid.app.repository.OrderRepository;
import com.mermaid.app.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PayoutsServiceTest {

    @Mock OrderRepository orderRepo;
    @Mock UserRepository userRepo;
    @InjectMocks PayoutsService service;

    private static final Long VENDOR = 10L;

    // ── Helpers ──────────────────────────────────────────────────────

    private Order completedRetailOrder(Long id, Long buyerId, Long speciesId, String speciesName,
                                       BigDecimal qty, BigDecimal pricePerKg) {
        FishSpecies sp = new FishSpecies();
        sp.setId(speciesId);
        sp.setCommonName(speciesName);

        Order o = new Order();
        o.setId(id);
        o.setSellerId(VENDOR);
        o.setBuyerId(buyerId);
        o.setKind(OrderKind.RETAIL);
        o.setStatus("COMPLETED");
        o.setSpecies(sp);
        o.setOrderedQtyKg(qty);
        o.setAgreedPricePerKg(pricePerKg);
        o.setCompletedAt(OffsetDateTime.now(ZoneOffset.UTC));
        return o;
    }

    private Order cancelledRetailOrder(Long id, Long buyerId) {
        FishSpecies sp = new FishSpecies();
        sp.setId(1L);
        sp.setCommonName("Tuna");

        Order o = new Order();
        o.setId(id);
        o.setSellerId(VENDOR);
        o.setBuyerId(buyerId);
        o.setKind(OrderKind.RETAIL);
        o.setStatus("CANCELLED");
        o.setSpecies(sp);
        o.setOrderedQtyKg(new BigDecimal("5"));
        o.setAgreedPricePerKg(new BigDecimal("100"));
        return o;
    }

    // ── summary ─────────────────────────────────────────────────────

    @Test
    void summary_sumsCompletedRetailOrders() {
        List<Order> orders = List.of(
            completedRetailOrder(1L, 20L, 1L, "Tuna",     new BigDecimal("10"), new BigDecimal("150")),
            completedRetailOrder(2L, 20L, 2L, "Mackerel", new BigDecimal("5"),  new BigDecimal("120")),
            completedRetailOrder(3L, 30L, 1L, "Tuna",     new BigDecimal("8"),  new BigDecimal("150"))
        );
        // summary() calls findBySellerIdAndKindAndStatusIn with COMPLETED status
        when(orderRepo.findBySellerIdAndKindAndStatusIn(VENDOR, OrderKind.RETAIL, List.of("COMPLETED")))
                .thenReturn(orders);

        Map<String, Object> result = service.summary(VENDOR);

        // pending = (10*150) + (5*120) + (8*150) = 1500+600+1200 = 3300
        assertThat((double) result.get("pendingTotal")).isEqualTo(3300.0);
        // paid is always 0 in stub
        assertThat((double) result.get("paidTotal")).isEqualTo(0.0);
    }

    @Test
    void summary_noCompletedOrders_returnsZeroPending() {
        when(orderRepo.findBySellerIdAndKindAndStatusIn(VENDOR, OrderKind.RETAIL, List.of("COMPLETED")))
                .thenReturn(List.of());

        Map<String, Object> result = service.summary(VENDOR);

        assertThat((double) result.get("pendingTotal")).isEqualTo(0.0);
    }

    // ── ledger ──────────────────────────────────────────────────────

    @Test
    void ledger_returnsEntryPerCompletedOrder() {
        List<Order> orders = List.of(
            completedRetailOrder(1L, 20L, 1L, "Tuna",     new BigDecimal("10"), new BigDecimal("150")),
            completedRetailOrder(2L, 20L, 2L, "Mackerel", new BigDecimal("5"),  new BigDecimal("120")),
            completedRetailOrder(3L, 30L, 1L, "Tuna",     new BigDecimal("8"),  new BigDecimal("150"))
        );
        when(orderRepo.findCompletedByVendorAndKindInRange(eq(VENDOR), eq(OrderKind.RETAIL), any(), any()))
                .thenReturn(orders);

        User buyer20 = new User(); buyer20.setId(20L); buyer20.setFullName("Ana Cruz");
        User buyer30 = new User(); buyer30.setId(30L); buyer30.setFullName("Jose Reyes");
        when(userRepo.findById(20L)).thenReturn(Optional.of(buyer20));
        when(userRepo.findById(30L)).thenReturn(Optional.of(buyer30));

        LocalDate from = LocalDate.of(2026, 4, 1);
        LocalDate to = LocalDate.of(2026, 4, 30);
        List<Map<String, Object>> result = service.ledger(VENDOR, from, to);

        // 3 completed orders → 3 ledger entries
        assertThat(result).hasSize(3);

        // Check first entry
        assertThat(result.get(0).get("orderId")).isEqualTo(1L);
        assertThat(result.get(0).get("buyerName")).isEqualTo("Ana Cruz");
        assertThat(result.get(0).get("speciesName")).isEqualTo("Tuna");
        assertThat((double) result.get(0).get("gross")).isEqualTo(1500.0); // 10*150
        assertThat((double) result.get(0).get("fees")).isEqualTo(0.0);
        assertThat((double) result.get(0).get("net")).isEqualTo(1500.0);
        assertThat(result.get(0).get("status")).isEqualTo("PENDING_PAYOUT");

        // Sum of ledger should match summary pending
        double ledgerSum = result.stream().mapToDouble(m -> (double) m.get("gross")).sum();
        // 1500 + 600 + 1200 = 3300
        assertThat(ledgerSum).isEqualTo(3300.0);
    }

    @Test
    void ledger_cancelledOrderExcluded() {
        // The repo query only returns COMPLETED, so cancelled orders are already filtered
        when(orderRepo.findCompletedByVendorAndKindInRange(eq(VENDOR), eq(OrderKind.RETAIL), any(), any()))
                .thenReturn(List.of()); // no completed orders

        LocalDate from = LocalDate.of(2026, 4, 1);
        LocalDate to = LocalDate.of(2026, 4, 30);
        List<Map<String, Object>> result = service.ledger(VENDOR, from, to);

        assertThat(result).isEmpty();
    }

    @Test
    void ledger_fromAfterTo_throwsIllegalArgument() {
        LocalDate from = LocalDate.of(2026, 5, 1);
        LocalDate to = LocalDate.of(2026, 4, 1);

        assertThatThrownBy(() -> service.ledger(VENDOR, from, to))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("from must not be after to");
    }
}
