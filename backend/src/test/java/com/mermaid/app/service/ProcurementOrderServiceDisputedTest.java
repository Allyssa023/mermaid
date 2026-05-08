package com.mermaid.app.service;

import com.mermaid.app.domain.*;
import com.mermaid.app.repository.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import java.util.List;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ProcurementOrderServiceDisputedTest {

    @Mock OrderRepository orderRepo;
    @Mock ProcurementCartItemRepository cartRepo;
    @Mock CatchAlertRepository alertRepo;
    @Mock OrderStatusEventRepository eventRepo;
    @Mock FishSpeciesRepository speciesRepo;
    @Mock InventoryService inventoryService;
    @Mock org.springframework.context.ApplicationEventPublisher eventPublisher;

    @InjectMocks ProcurementOrderService service;

    @Test
    void listForFisherman_DISPUTED_bucket_returns_only_DISPUTED_statuses() {
        when(orderRepo.findBySellerIdAndKindAndStatusIn(eq(1L), eq(OrderKind.PROCUREMENT), eq(List.of("DISPUTED"))))
            .thenReturn(List.of());
        service.listForFisherman(1L, "DISPUTED");
        verify(orderRepo).findBySellerIdAndKindAndStatusIn(1L, OrderKind.PROCUREMENT, List.of("DISPUTED"));
    }

    @Test
    void listForVendor_DISPUTED_bucket_returns_only_DISPUTED_statuses() {
        when(orderRepo.findByBuyerIdAndKindAndStatusIn(eq(1L), eq(OrderKind.PROCUREMENT), eq(List.of("DISPUTED"))))
            .thenReturn(List.of());
        service.listForVendor(1L, "DISPUTED");
        verify(orderRepo).findByBuyerIdAndKindAndStatusIn(1L, OrderKind.PROCUREMENT, List.of("DISPUTED"));
    }
}
