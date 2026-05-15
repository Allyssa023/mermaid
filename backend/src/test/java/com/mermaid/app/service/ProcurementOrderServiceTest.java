package com.mermaid.app.service;

import com.mermaid.app.domain.*;
import com.mermaid.app.event.OrderStatusChangeEvent;
import com.mermaid.app.exception.ListingClosedException;
import com.mermaid.app.exception.ResourceNotFoundException;
import com.mermaid.app.repository.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.security.access.AccessDeniedException;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ProcurementOrderServiceTest {

    @Mock ProcurementCartItemRepository cartRepo;
    @Mock CatchAlertRepository alertRepo;
    @Mock OrderRepository orderRepo;
    @Mock OrderStatusEventRepository eventRepo;
    @Mock FishSpeciesRepository speciesRepo;
    @Mock InventoryService inventoryService;
    @Mock ApplicationEventPublisher eventPublisher;

    @InjectMocks ProcurementOrderService service;

    // ── checkout ──────────────────────────────────────────────────────────────

    @Test
    void checkout_happyPath_createsOrderAndIncrementsClaim() {
        FishSpecies sp = species(5L);
        CatchAlert alert = alert(10L, 1L, sp, bd("50.00"), bd("100.00"), "ACTIVE",
                OffsetDateTime.now().plusHours(2));
        ProcurementCartItem cartItem = cartItem(20L, 99L, alert, bd("30.00"), null);

        when(cartRepo.findAllByVendorIdOrderByCreatedAtAsc(99L)).thenReturn(List.of(cartItem));
        when(alertRepo.findByIdInForUpdate(List.of(10L))).thenReturn(List.of(alert));
        when(alertRepo.save(any())).thenAnswer(i -> i.getArgument(0));
        Order saved = order(77L, 99L, 1L, sp, "PENDING");
        when(orderRepo.save(any())).thenReturn(saved);
        when(eventRepo.save(any())).thenAnswer(i -> i.getArgument(0));

        List<Order> result = service.checkout(99L);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getId()).isEqualTo(77L);

        ArgumentCaptor<CatchAlert> alertCap = ArgumentCaptor.forClass(CatchAlert.class);
        verify(alertRepo).save(alertCap.capture());
        assertThat(alertCap.getValue().getClaimedKg()).isEqualByComparingTo("80.00");

        ArgumentCaptor<Order> orderCap = ArgumentCaptor.forClass(Order.class);
        verify(orderRepo).save(orderCap.capture());
        assertThat(orderCap.getValue().getKind()).isEqualTo(OrderKind.RETAIL);
        assertThat(orderCap.getValue().getBuyerId()).isEqualTo(99L);

        verify(cartRepo).deleteAllByVendorId(99L);
    }

    @Test
    void checkout_emptyCart_throws() {
        when(cartRepo.findAllByVendorIdOrderByCreatedAtAsc(99L)).thenReturn(List.of());
        assertThatThrownBy(() -> service.checkout(99L))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("empty");
    }

    @Test
    void checkout_expiredAlert_throwsListingClosed() {
        FishSpecies sp = species(5L);
        CatchAlert alert = alert(10L, 1L, sp, bd("0.00"), bd("100.00"), "ACTIVE",
                OffsetDateTime.now().minusMinutes(1));
        ProcurementCartItem cartItem = cartItem(20L, 99L, alert, bd("30.00"), null);

        when(cartRepo.findAllByVendorIdOrderByCreatedAtAsc(99L)).thenReturn(List.of(cartItem));
        when(alertRepo.findByIdInForUpdate(List.of(10L))).thenReturn(List.of(alert));

        assertThatThrownBy(() -> service.checkout(99L))
                .isInstanceOf(ListingClosedException.class);
    }

    @Test
    void checkout_overcommit_throwsListingClosed() {
        FishSpecies sp = species(5L);
        CatchAlert alert = alert(10L, 1L, sp, bd("90.00"), bd("100.00"), "ACTIVE",
                OffsetDateTime.now().plusHours(2));
        ProcurementCartItem cartItem = cartItem(20L, 99L, alert, bd("20.00"), null);

        when(cartRepo.findAllByVendorIdOrderByCreatedAtAsc(99L)).thenReturn(List.of(cartItem));
        when(alertRepo.findByIdInForUpdate(List.of(10L))).thenReturn(List.of(alert));

        assertThatThrownBy(() -> service.checkout(99L))
                .isInstanceOf(ListingClosedException.class)
                .hasMessageContaining("overcommitted");
    }

    @Test
    void checkout_cancelledAlert_throwsListingClosed() {
        FishSpecies sp = species(5L);
        CatchAlert alert = alert(10L, 1L, sp, bd("0.00"), bd("100.00"), "CANCELLED",
                OffsetDateTime.now().plusHours(2));
        ProcurementCartItem cartItem = cartItem(20L, 99L, alert, bd("30.00"), null);

        when(cartRepo.findAllByVendorIdOrderByCreatedAtAsc(99L)).thenReturn(List.of(cartItem));
        when(alertRepo.findByIdInForUpdate(List.of(10L))).thenReturn(List.of(alert));

        assertThatThrownBy(() -> service.checkout(99L))
                .isInstanceOf(ListingClosedException.class);
    }

    // ── releaseClaim ──────────────────────────────────────────────────────────

    @Test
    void releaseClaim_restoresClaimedKg() {
        FishSpecies sp = species(5L);
        CatchAlert alert = alert(10L, 1L, sp, bd("30.00"), bd("100.00"), "ACTIVE",
                OffsetDateTime.now().plusHours(2));
        Order ord = order(77L, 99L, 1L, sp, "CANCELLED");
        ord.setCatchAlertId(10L);
        ord.setOrderedQtyKg(bd("30.00"));

        when(orderRepo.findById(77L)).thenReturn(Optional.of(ord));
        when(alertRepo.findByIdInForUpdate(List.of(10L))).thenReturn(List.of(alert));
        when(alertRepo.save(any())).thenAnswer(i -> i.getArgument(0));

        service.releaseClaim(77L);

        ArgumentCaptor<CatchAlert> cap = ArgumentCaptor.forClass(CatchAlert.class);
        verify(alertRepo).save(cap.capture());
        assertThat(cap.getValue().getClaimedKg()).isEqualByComparingTo("0.00");
    }

    @Test
    void releaseClaim_doesNotGoBelowZero() {
        FishSpecies sp = species(5L);
        CatchAlert alert = alert(10L, 1L, sp, bd("5.00"), bd("100.00"), "ACTIVE",
                OffsetDateTime.now().plusHours(2));
        Order ord = order(77L, 99L, 1L, sp, "CANCELLED");
        ord.setCatchAlertId(10L);
        ord.setOrderedQtyKg(bd("30.00"));

        when(orderRepo.findById(77L)).thenReturn(Optional.of(ord));
        when(alertRepo.findByIdInForUpdate(List.of(10L))).thenReturn(List.of(alert));
        when(alertRepo.save(any())).thenAnswer(i -> i.getArgument(0));

        service.releaseClaim(77L);

        ArgumentCaptor<CatchAlert> cap = ArgumentCaptor.forClass(CatchAlert.class);
        verify(alertRepo).save(cap.capture());
        assertThat(cap.getValue().getClaimedKg()).isEqualByComparingTo("0.00");
    }

    @Test
    void releaseClaim_preorderNoAlert_skips() {
        FishSpecies sp = species(5L);
        Order ord = order(77L, 99L, 1L, sp, "CANCELLED");
        ord.setCatchAlertId(null);

        when(orderRepo.findById(77L)).thenReturn(Optional.of(ord));

        service.releaseClaim(77L);

        verify(alertRepo, never()).findByIdInForUpdate(any());
    }

    // ── placePreorder ─────────────────────────────────────────────────────────

    @Test
    void placePreorder_createsProcurementOrderWithNullAlertId() {
        FishSpecies sp = species(5L);
        when(speciesRepo.findById(5L)).thenReturn(Optional.of(sp));
        Order saved = order(88L, 99L, 2L, sp, "PENDING");
        saved.setCatchAlertId(null);
        when(orderRepo.save(any())).thenReturn(saved);
        when(eventRepo.save(any())).thenAnswer(i -> i.getArgument(0));

        Order result = service.placePreorder(99L, 2L, 5L, bd("50.00"), bd("200.00"), "deliver early");

        assertThat(result.getKind()).isEqualTo(OrderKind.PROCUREMENT);
        ArgumentCaptor<Order> cap = ArgumentCaptor.forClass(Order.class);
        verify(orderRepo).save(cap.capture());
        assertThat(cap.getValue().getCatchAlertId()).isNull();
        assertThat(cap.getValue().getNotes()).isEqualTo("deliver early");
    }

    // ── vendorCancel ──────────────────────────────────────────────────────────

    @Test
    void vendorCancel_pendingOrder_cancelsAndReleasesClaim() {
        FishSpecies sp = species(5L);
        CatchAlert alert = alert(10L, 1L, sp, bd("30.00"), bd("100.00"), "ACTIVE",
                OffsetDateTime.now().plusHours(2));
        Order ord = order(77L, 99L, 1L, sp, "PENDING");
        ord.setKind(OrderKind.PROCUREMENT);
        ord.setCatchAlertId(10L);
        ord.setOrderedQtyKg(bd("30.00"));

        when(orderRepo.findById(77L)).thenReturn(Optional.of(ord));
        when(orderRepo.save(any())).thenAnswer(i -> i.getArgument(0));
        when(alertRepo.findByIdInForUpdate(List.of(10L))).thenReturn(List.of(alert));
        when(alertRepo.save(any())).thenAnswer(i -> i.getArgument(0));
        when(eventRepo.save(any())).thenAnswer(i -> i.getArgument(0));

        Order result = service.vendorCancel(99L, 77L, "not needed");

        assertThat(result.getStatus()).isEqualTo("CANCELLED");
        verify(alertRepo).save(argThat(a -> a.getClaimedKg().compareTo(BigDecimal.ZERO) == 0));
    }

    @Test
    void vendorCancel_wrongVendor_throws() {
        FishSpecies sp = species(5L);
        Order ord = order(77L, 55L, 1L, sp, "PENDING");
        ord.setKind(OrderKind.PROCUREMENT);
        when(orderRepo.findById(77L)).thenReturn(Optional.of(ord));

        assertThatThrownBy(() -> service.vendorCancel(99L, 77L, null))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void vendorCancel_completedOrder_throws() {
        FishSpecies sp = species(5L);
        Order ord = order(77L, 99L, 1L, sp, "COMPLETED");
        ord.setKind(OrderKind.PROCUREMENT);
        when(orderRepo.findById(77L)).thenReturn(Optional.of(ord));

        assertThatThrownBy(() -> service.vendorCancel(99L, 77L, null))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("COMPLETED");
    }

    // ── fisherman transitions ─────────────────────────────────────────────────

    @Test
    void fishermanAccept_pendingOrder_transitions() {
        FishSpecies sp = species(5L);
        Order ord = order(77L, 99L, 1L, sp, "PENDING");
        ord.setKind(OrderKind.PROCUREMENT);
        when(orderRepo.findById(77L)).thenReturn(Optional.of(ord));
        when(orderRepo.save(any())).thenAnswer(i -> i.getArgument(0));
        when(eventRepo.save(any())).thenAnswer(i -> i.getArgument(0));

        Order result = service.fishermanAccept(1L, 77L);
        assertThat(result.getStatus()).isEqualTo("ACCEPTED");
    }

    @Test
    void fishermanComplete_readyOrder_callsAddLot() {
        FishSpecies sp = species(5L);
        Order ord = order(77L, 99L, 1L, sp, "READY");
        ord.setKind(OrderKind.PROCUREMENT);
        when(orderRepo.findById(77L)).thenReturn(Optional.of(ord));
        when(orderRepo.save(any())).thenAnswer(i -> i.getArgument(0));
        when(eventRepo.save(any())).thenAnswer(i -> i.getArgument(0));

        service.fishermanComplete(1L, 77L);

        verify(inventoryService).addLotFromProcurement(77L);
    }

    @Test
    void fishermanCancel_acceptedOrder_releasesAndCancels() {
        FishSpecies sp = species(5L);
        CatchAlert alert = alert(10L, 1L, sp, bd("30.00"), bd("100.00"), "ACTIVE",
                OffsetDateTime.now().plusHours(2));
        Order ord = order(77L, 99L, 1L, sp, "ACCEPTED");
        ord.setKind(OrderKind.PROCUREMENT);
        ord.setCatchAlertId(10L);
        ord.setOrderedQtyKg(bd("30.00"));
        when(orderRepo.findById(77L)).thenReturn(Optional.of(ord));
        when(orderRepo.save(any())).thenAnswer(i -> i.getArgument(0));
        when(alertRepo.findByIdInForUpdate(List.of(10L))).thenReturn(List.of(alert));
        when(alertRepo.save(any())).thenAnswer(i -> i.getArgument(0));
        when(eventRepo.save(any())).thenAnswer(i -> i.getArgument(0));

        Order result = service.fishermanCancel(1L, 77L, "bad catch");
        assertThat(result.getStatus()).isEqualTo("CANCELLED");
        verify(alertRepo).save(argThat(a -> a.getClaimedKg().compareTo(BigDecimal.ZERO) == 0));
    }

    @Test
    void fishermanAccept_wrongFisherman_throws() {
        FishSpecies sp = species(5L);
        Order ord = order(77L, 99L, 2L, sp, "PENDING");
        ord.setKind(OrderKind.PROCUREMENT);
        when(orderRepo.findById(77L)).thenReturn(Optional.of(ord));

        assertThatThrownBy(() -> service.fishermanAccept(1L, 77L))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void fishermanMarkReady_fromPending_throws() {
        FishSpecies sp = species(5L);
        Order ord = order(77L, 99L, 1L, sp, "PENDING");
        ord.setKind(OrderKind.PROCUREMENT);
        when(orderRepo.findById(77L)).thenReturn(Optional.of(ord));

        assertThatThrownBy(() -> service.fishermanMarkReady(1L, 77L))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("PENDING");
    }

    // ── helpers ────────────────────────────────────────────────────────────────

    private static FishSpecies species(Long id) {
        FishSpecies sp = new FishSpecies();
        sp.setId(id);
        sp.setCommonName("Tuna");
        return sp;
    }

    private static CatchAlert alert(Long id, Long fishermanId, FishSpecies sp,
                                    BigDecimal claimedKg, BigDecimal quantityKg,
                                    String status, OffsetDateTime expiresAt) {
        CatchAlert a = new CatchAlert();
        a.setId(id);
        a.setFishermanId(fishermanId);
        a.setSpecies(sp);
        a.setClaimedKg(claimedKg);
        a.setQuantityKg(quantityKg);
        a.setStatus(status);
        a.setExpiresAt(expiresAt);
        a.setAskingPricePerKg(bd("100.00"));
        return a;
    }

    private static ProcurementCartItem cartItem(Long id, Long vendorId, CatchAlert alert,
                                                BigDecimal qtyKg, BigDecimal offeredPrice) {
        ProcurementCartItem item = new ProcurementCartItem();
        item.setId(id);
        item.setVendorId(vendorId);
        item.setCatchAlert(alert);
        item.setQtyKg(qtyKg);
        item.setOfferedPricePerKg(offeredPrice);
        return item;
    }

    private static Order order(Long id, Long buyerId, Long sellerId, FishSpecies sp, String status) {
        Order o = new Order();
        o.setId(id);
        o.setBuyerId(buyerId);
        o.setSellerId(sellerId);
        o.setSpecies(sp);
        o.setStatus(status);
        o.setKind(OrderKind.PROCUREMENT);
        o.setAgreedPricePerKg(bd("100.00"));
        return o;
    }

    private static BigDecimal bd(String val) { return new BigDecimal(val); }
}
