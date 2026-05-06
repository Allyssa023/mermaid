package com.mermaid.app.service;

import com.mermaid.app.domain.*;
import com.mermaid.app.exception.InsufficientStockException;
import com.mermaid.app.exception.ResourceNotFoundException;
import com.mermaid.app.repository.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class InventoryServiceTest {

    @Mock InventoryLotRepository lotRepo;
    @Mock InventoryMovementRepository moveRepo;
    @Mock NotificationService notifications;
    @Mock StorefrontListingRepository listingRepo;
    @Mock StorefrontListingLotRepository listingLotRepo;
    @Mock OrderRepository orderRepo;
    @Mock FishSpeciesRepository speciesRepo;
    @Mock NotificationRepository notificationRepo;
    @InjectMocks InventoryService service;

    // ---- addLotFromProcurement ----

    @Test
    void addLotFromProcurement_createsLotAndMovement() {
        Order order = order(1L, 10L, species(5L), bd("20.00"), bd("150.00"));
        when(orderRepo.findById(1L)).thenReturn(Optional.of(order));
        InventoryLot saved = lot(100L, 10L, 5L, bd("20.00"));
        when(lotRepo.save(any())).thenReturn(saved);
        when(moveRepo.save(any())).thenAnswer(i -> i.getArgument(0));

        InventoryLot result = service.addLotFromProcurement(1L);

        assertThat(result.getId()).isEqualTo(100L);
        ArgumentCaptor<InventoryLot> lotCap = ArgumentCaptor.forClass(InventoryLot.class);
        verify(lotRepo).save(lotCap.capture());
        assertThat(lotCap.getValue().getVendorId()).isEqualTo(10L);
        assertThat(lotCap.getValue().getSpeciesId()).isEqualTo(5L);
        assertThat(lotCap.getValue().getInitialKg()).isEqualByComparingTo("20.00");
        assertThat(lotCap.getValue().getRemainingKg()).isEqualByComparingTo("20.00");

        ArgumentCaptor<InventoryMovement> movCap = ArgumentCaptor.forClass(InventoryMovement.class);
        verify(moveRepo).save(movCap.capture());
        assertThat(movCap.getValue().getReason()).isEqualTo(MovementReason.PROCUREMENT_RECEIVED);
        assertThat(movCap.getValue().getDeltaKg()).isEqualByComparingTo("20.00");
    }

    @Test
    void addLotFromProcurement_unknownOrder_throws() {
        when(orderRepo.findById(99L)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.addLotFromProcurement(99L))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    // ---- recordAdjustment ----

    @Test
    void recordAdjustment_reducesRemainingAndWritesMovement() {
        InventoryLot lot = lot(1L, 10L, 5L, bd("10.00"));
        when(lotRepo.findByIdInForUpdate(List.of(1L))).thenReturn(List.of(lot));
        when(lotRepo.save(any())).thenAnswer(i -> i.getArgument(0));
        when(moveRepo.save(any())).thenAnswer(i -> i.getArgument(0));
        when(lotRepo.sumAvailableByVendorAndSpecies(10L, 5L)).thenReturn(bd("7.00")); // above threshold, no LOW_STOCK

        InventoryLot result = service.recordAdjustment(1L, bd("-3.00"), MovementReason.ADJUSTMENT_LOSS, "spoiled");

        assertThat(result.getRemainingKg()).isEqualByComparingTo("7.00");
        ArgumentCaptor<InventoryMovement> cap = ArgumentCaptor.forClass(InventoryMovement.class);
        verify(moveRepo).save(cap.capture());
        assertThat(cap.getValue().getReason()).isEqualTo(MovementReason.ADJUSTMENT_LOSS);
        assertThat(cap.getValue().getNote()).isEqualTo("spoiled");
    }

    @Test
    void recordAdjustment_belowZero_throwsInsufficientStock() {
        InventoryLot lot = lot(1L, 10L, 5L, bd("2.00"));
        when(lotRepo.findByIdInForUpdate(List.of(1L))).thenReturn(List.of(lot));

        assertThatThrownBy(() ->
                service.recordAdjustment(1L, bd("-5.00"), MovementReason.ADJUSTMENT_LOSS, null))
                .isInstanceOf(InsufficientStockException.class);
    }

    // ---- deductForOrder FIFO ----

    @Test
    void deductForOrder_fifoAcrossThreeLots() {
        Order order = orderWithListing(1L, 10L, 5L, bd("25.00"), 99L);
        when(orderRepo.findById(1L)).thenReturn(Optional.of(order));

        StorefrontListing listing = listing(99L, 10L, 5L);
        when(listingRepo.findByIdAndIsDeletedFalse(99L)).thenReturn(Optional.of(listing));

        StorefrontListingLot link1 = new StorefrontListingLot(99L, 1L);
        StorefrontListingLot link2 = new StorefrontListingLot(99L, 2L);
        StorefrontListingLot link3 = new StorefrontListingLot(99L, 3L);
        when(listingLotRepo.findByIdListingId(99L)).thenReturn(List.of(link1, link2, link3));

        InventoryLot l1 = lot(1L, 10L, 5L, bd("10.00"));
        InventoryLot l2 = lot(2L, 10L, 5L, bd("10.00"));
        InventoryLot l3 = lot(3L, 10L, 5L, bd("10.00"));
        when(lotRepo.findByIdInForUpdate(anyCollection())).thenReturn(List.of(l1, l2, l3));
        when(lotRepo.save(any())).thenAnswer(i -> i.getArgument(0));
        when(moveRepo.save(any())).thenAnswer(i -> i.getArgument(0));

        when(lotRepo.sumAvailableByVendorAndSpecies(10L, 5L)).thenReturn(bd("5.00")); // at threshold, no LOW_STOCK

        service.deductForOrder(1L);

        assertThat(l1.getRemainingKg()).isEqualByComparingTo("0.00");
        assertThat(l2.getRemainingKg()).isEqualByComparingTo("0.00");
        assertThat(l3.getRemainingKg()).isEqualByComparingTo("5.00");
        verify(moveRepo, times(3)).save(argThat(m -> m.getReason() == MovementReason.SALE_COMPLETED));
    }

    @Test
    void deductForOrder_soldOutWhenTotalZero() {
        Order order = orderWithListing(1L, 10L, 5L, bd("10.00"), 99L);
        when(orderRepo.findById(1L)).thenReturn(Optional.of(order));

        StorefrontListing listing = listing(99L, 10L, 5L);
        when(listingRepo.findByIdAndIsDeletedFalse(99L)).thenReturn(Optional.of(listing));
        when(listingLotRepo.findByIdListingId(99L)).thenReturn(List.of(new StorefrontListingLot(99L, 1L)));

        InventoryLot l1 = lot(1L, 10L, 5L, bd("10.00"));
        when(lotRepo.findByIdInForUpdate(anyCollection())).thenReturn(List.of(l1));
        when(lotRepo.save(any())).thenAnswer(i -> i.getArgument(0));
        when(moveRepo.save(any())).thenAnswer(i -> i.getArgument(0));

        when(lotRepo.sumAvailableByVendorAndSpecies(10L, 5L)).thenReturn(bd("0.00"));
        when(notificationRepo.existsRecentLowStock(eq(10L), eq(5L), any())).thenReturn(false);
        when(speciesRepo.findById(5L)).thenReturn(Optional.of(species(5L)));
        when(listingRepo.save(any())).thenAnswer(i -> i.getArgument(0));

        service.deductForOrder(1L);

        assertThat(listing.getStatus()).isEqualTo(StorefrontListingStatus.SOLD_OUT);
    }

    @Test
    void deductForOrder_insufficientStock_throws() {
        Order order = orderWithListing(1L, 10L, 5L, bd("50.00"), 99L);
        when(orderRepo.findById(1L)).thenReturn(Optional.of(order));

        StorefrontListing listing = listing(99L, 10L, 5L);
        when(listingRepo.findByIdAndIsDeletedFalse(99L)).thenReturn(Optional.of(listing));
        when(listingLotRepo.findByIdListingId(99L)).thenReturn(List.of(new StorefrontListingLot(99L, 1L)));

        InventoryLot l1 = lot(1L, 10L, 5L, bd("5.00"));
        when(lotRepo.findByIdInForUpdate(anyCollection())).thenReturn(List.of(l1));

        assertThatThrownBy(() -> service.deductForOrder(1L))
                .isInstanceOf(InsufficientStockException.class);
    }

    // ---- LOW_STOCK debounce ----

    @Test
    void lowStock_debounced_secondNotificationWithin12h_notCreated() {
        InventoryLot lot = lot(1L, 10L, 5L, bd("10.00"));
        when(lotRepo.findByIdInForUpdate(List.of(1L))).thenReturn(List.of(lot));
        when(lotRepo.save(any())).thenAnswer(i -> i.getArgument(0));
        when(moveRepo.save(any())).thenAnswer(i -> i.getArgument(0));
        when(lotRepo.sumAvailableByVendorAndSpecies(10L, 5L)).thenReturn(bd("3.00")); // below threshold
        when(notificationRepo.existsRecentLowStock(eq(10L), eq(5L), any())).thenReturn(true); // debounce active

        service.recordAdjustment(1L, bd("-7.00"), MovementReason.ADJUSTMENT_LOSS, null);

        verify(notifications, never()).create(any(), any(), any(), any());
    }

    @Test
    void lowStock_firstOccurrence_notificationCreated() {
        InventoryLot lot = lot(1L, 10L, 5L, bd("10.00"));
        when(lotRepo.findByIdInForUpdate(List.of(1L))).thenReturn(List.of(lot));
        when(lotRepo.save(any())).thenAnswer(i -> i.getArgument(0));
        when(moveRepo.save(any())).thenAnswer(i -> i.getArgument(0));
        when(lotRepo.sumAvailableByVendorAndSpecies(10L, 5L)).thenReturn(bd("3.00")); // below threshold
        when(notificationRepo.existsRecentLowStock(eq(10L), eq(5L), any())).thenReturn(false);
        when(speciesRepo.findById(5L)).thenReturn(Optional.of(species(5L)));
        when(notifications.create(any(), any(), any(), any())).thenReturn(null);

        service.recordAdjustment(1L, bd("-7.00"), MovementReason.ADJUSTMENT_LOSS, null);

        verify(notifications).create(eq(10L), eq("LOW_STOCK"), anyString(), anyMap());
    }

    // ---- helpers ----

    private static BigDecimal bd(String v) { return new BigDecimal(v); }

    private static FishSpecies species(Long id) {
        FishSpecies s = new FishSpecies();
        s.setId(id);
        s.setCommonName("Bangus #" + id);
        return s;
    }

    private static InventoryLot lot(Long id, Long vendorId, Long speciesId, BigDecimal remaining) {
        InventoryLot l = new InventoryLot();
        l.setId(id);
        l.setVendorId(vendorId);
        l.setSpeciesId(speciesId);
        l.setInitialKg(remaining);
        l.setRemainingKg(remaining);
        return l;
    }

    private static Order order(Long id, Long buyerId, FishSpecies species, BigDecimal qty, BigDecimal price) {
        Order o = new Order();
        o.setId(id);
        o.setBuyerId(buyerId);
        o.setSpecies(species);
        o.setSellerId(1L);
        o.setOrderedQtyKg(qty);
        o.setAgreedPricePerKg(price);
        return o;
    }

    private static Order orderWithListing(Long id, Long buyerId, Long speciesId,
                                           BigDecimal qty, Long listingId) {
        FishSpecies sp = species(speciesId);
        Order o = order(id, buyerId, sp, qty, bd("100.00"));
        o.setStorefrontListingId(listingId);
        return o;
    }

    private static StorefrontListing listing(Long id, Long vendorId, Long speciesId) {
        StorefrontListing l = new StorefrontListing();
        l.setId(id);
        l.setVendorId(vendorId);
        l.setSpeciesId(speciesId);
        l.setStatus(StorefrontListingStatus.PUBLISHED);
        l.setTitle("Test listing");
        l.setPricePerKg(bd("200.00"));
        l.setMinQtyKg(bd("0.5"));
        return l;
    }
}
