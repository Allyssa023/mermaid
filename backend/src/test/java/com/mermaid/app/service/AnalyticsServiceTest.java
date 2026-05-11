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
class AnalyticsServiceTest {

    @Mock OrderRepository orderRepo;
    @Mock UserRepository userRepo;
    @InjectMocks AnalyticsService service;

    private static final Long VENDOR = 10L;
    private static final LocalDate FROM = LocalDate.of(2026, 4, 1);
    private static final LocalDate TO = LocalDate.of(2026, 4, 30);

    // ── Helpers ──────────────────────────────────────────────────────

    private Order completedRetailOrder(Long id, Long buyerId, Long speciesId,
                                       String speciesName, BigDecimal qty, BigDecimal pricePerKg) {
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

    private Order completedProcurementOrder(Long id, Long speciesId, String speciesName,
                                            BigDecimal qty, BigDecimal pricePerKg) {
        FishSpecies sp = new FishSpecies();
        sp.setId(speciesId);
        sp.setCommonName(speciesName);

        Order o = new Order();
        o.setId(id);
        o.setBuyerId(VENDOR); // vendor is buyer in procurement
        o.setSellerId(100L);
        o.setKind(OrderKind.PROCUREMENT);
        o.setStatus("COMPLETED");
        o.setSpecies(sp);
        o.setOrderedQtyKg(qty);
        o.setAgreedPricePerKg(pricePerKg);
        o.setCompletedAt(OffsetDateTime.now(ZoneOffset.UTC));
        return o;
    }

    private List<Order> fixtureOrders() {
        // 5 completed retail orders across 2 buyers, 2 species
        return List.of(
            completedRetailOrder(1L, 20L, 1L, "Tuna",     new BigDecimal("10"),  new BigDecimal("150")),
            completedRetailOrder(2L, 20L, 1L, "Tuna",     new BigDecimal("5"),   new BigDecimal("150")),
            completedRetailOrder(3L, 20L, 2L, "Mackerel", new BigDecimal("8"),   new BigDecimal("120")),
            completedRetailOrder(4L, 30L, 2L, "Mackerel", new BigDecimal("6"),   new BigDecimal("120")),
            completedRetailOrder(5L, 30L, 1L, "Tuna",     new BigDecimal("4"),   new BigDecimal("150"))
        );
    }

    // ── salesSummary ────────────────────────────────────────────────

    @Test
    void salesSummary_computesCorrectAggregates() {
        when(orderRepo.findCompletedByVendorAndKindInRange(eq(VENDOR), eq(OrderKind.RETAIL), any(), any()))
                .thenReturn(fixtureOrders());

        Map<String, Object> result = service.salesSummary(VENDOR, FROM, TO);

        assertThat(result.get("totalOrders")).isEqualTo(5);
        // revenue = (10*150) + (5*150) + (8*120) + (6*120) + (4*150) = 1500+750+960+720+600 = 4530
        assertThat((double) result.get("totalRevenue")).isEqualTo(4530.0);
        // totalQtyKg = 10+5+8+6+4 = 33
        assertThat((double) result.get("totalQtyKg")).isEqualTo(33.0);
        // uniqueBuyers = {20, 30} = 2
        assertThat(result.get("uniqueBuyers")).isEqualTo(2);
        // avgOrderValue = 4530/5 = 906.0
        assertThat((double) result.get("avgOrderValue")).isEqualTo(906.0);
    }

    @Test
    void salesSummary_emptyOrders_returnsZeros() {
        when(orderRepo.findCompletedByVendorAndKindInRange(eq(VENDOR), eq(OrderKind.RETAIL), any(), any()))
                .thenReturn(List.of());

        Map<String, Object> result = service.salesSummary(VENDOR, FROM, TO);

        assertThat(result.get("totalOrders")).isEqualTo(0);
        assertThat((double) result.get("totalRevenue")).isEqualTo(0.0);
        assertThat(result.get("uniqueBuyers")).isEqualTo(0);
    }

    // ── revenueBySpecies ────────────────────────────────────────────

    @Test
    void revenueBySpecies_groupsCorrectly() {
        when(orderRepo.findCompletedByVendorAndKindInRange(eq(VENDOR), eq(OrderKind.RETAIL), any(), any()))
                .thenReturn(fixtureOrders());

        List<Map<String, Object>> result = service.revenueBySpecies(VENDOR, FROM, TO);

        assertThat(result).hasSize(2);

        // Tuna: (10*150) + (5*150) + (4*150) = 2850
        Map<String, Object> tuna = result.stream()
                .filter(m -> "Tuna".equals(m.get("speciesName"))).findFirst().orElseThrow();
        assertThat((double) tuna.get("totalRevenue")).isEqualTo(2850.0);
        assertThat((double) tuna.get("totalQtyKg")).isEqualTo(19.0);

        // Mackerel: (8*120) + (6*120) = 1680
        Map<String, Object> mackerel = result.stream()
                .filter(m -> "Mackerel".equals(m.get("speciesName"))).findFirst().orElseThrow();
        assertThat((double) mackerel.get("totalRevenue")).isEqualTo(1680.0);
        assertThat((double) mackerel.get("totalQtyKg")).isEqualTo(14.0);
    }

    // ── procurementSpend ────────────────────────────────────────────

    @Test
    void procurementSpend_computesCorrectly() {
        List<Order> procOrders = List.of(
            completedProcurementOrder(10L, 1L, "Tuna",     new BigDecimal("20"), new BigDecimal("100")),
            completedProcurementOrder(11L, 2L, "Mackerel", new BigDecimal("15"), new BigDecimal("80"))
        );
        when(orderRepo.findCompletedByBuyerAndKindInRange(eq(VENDOR), eq(OrderKind.PROCUREMENT), any(), any()))
                .thenReturn(procOrders);

        Map<String, Object> result = service.procurementSpend(VENDOR, FROM, TO);

        assertThat(result.get("totalOrders")).isEqualTo(2);
        // spend = (20*100) + (15*80) = 2000+1200 = 3200
        assertThat((double) result.get("totalSpend")).isEqualTo(3200.0);
        assertThat((double) result.get("totalQtyKg")).isEqualTo(35.0);
    }

    // ── repeatBuyers ────────────────────────────────────────────────

    @Test
    void repeatBuyers_returnsQualifiedBuyers() {
        // Native query returns Object[] rows: {buyerId, orderCount, totalSpent, lastOrder}
        Object[] row1 = new Object[]{20L, 3L, 3210.0, java.sql.Timestamp.from(OffsetDateTime.now(ZoneOffset.UTC).toInstant())};

        List<Object[]> rows = new java.util.ArrayList<>();
        rows.add(row1);
        when(orderRepo.findRepeatBuyers(eq(VENDOR), any(), any(), eq(2))).thenReturn(rows);

        User buyer = new User();
        buyer.setId(20L);
        buyer.setFullName("Maria Santos");
        when(userRepo.findAllById(List.of(20L))).thenReturn(List.of(buyer));

        List<Map<String, Object>> result = service.repeatBuyers(VENDOR, FROM, TO, 2);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).get("buyerId")).isEqualTo(20L);
        assertThat(result.get(0).get("buyerName")).isEqualTo("Maria Santos");
        assertThat((int) result.get(0).get("orderCount")).isEqualTo(3);
    }

    // ── range validation ────────────────────────────────────────────

    @Test
    void salesSummary_rangeExceeds365Days_throwsIllegalArgument() {
        LocalDate from = LocalDate.of(2025, 1, 1);
        LocalDate to = LocalDate.of(2026, 5, 1); // > 365 days

        assertThatThrownBy(() -> service.salesSummary(VENDOR, from, to))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("365");
    }

    @Test
    void revenueBySpecies_rangeExceeds365Days_throwsIllegalArgument() {
        LocalDate from = LocalDate.of(2025, 1, 1);
        LocalDate to = LocalDate.of(2026, 5, 1);

        assertThatThrownBy(() -> service.revenueBySpecies(VENDOR, from, to))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("365");
    }

    @Test
    void procurementSpend_rangeExceeds365Days_throwsIllegalArgument() {
        LocalDate from = LocalDate.of(2025, 1, 1);
        LocalDate to = LocalDate.of(2026, 5, 1);

        assertThatThrownBy(() -> service.procurementSpend(VENDOR, from, to))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("365");
    }

    @Test
    void salesSummary_fromAfterTo_throwsIllegalArgument() {
        assertThatThrownBy(() -> service.salesSummary(VENDOR, TO, FROM))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("from must not be after to");
    }
}
