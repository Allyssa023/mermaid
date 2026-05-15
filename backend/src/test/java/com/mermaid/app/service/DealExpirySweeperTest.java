package com.mermaid.app.service;

import com.mermaid.app.domain.Deal;
import com.mermaid.app.domain.DealStatus;
import com.mermaid.app.exception.DealConflictException;
import com.mermaid.app.repository.DealRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.OffsetDateTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DealExpirySweeperTest {

    @Mock DealRepository dealRepo;
    @Mock DealService dealService;

    @InjectMocks DealExpirySweeper sweeper;

    private static Deal expired(Long id, Long fishermanId) {
        Deal d = new Deal();
        d.setId(id);
        d.setFishermanId(fishermanId);
        d.setStatus(DealStatus.NEGOTIATING);
        d.setExpiresAt(OffsetDateTime.now().minusMinutes(5));
        return d;
    }

    @Test
    void sweep_noExpired_isNoop() {
        when(dealRepo.findExpired(any())).thenReturn(List.of());
        sweeper.sweep();
        verifyNoInteractions(dealService);
    }

    @Test
    void sweep_cancelsEachExpiredDealAsItsFisherman() {
        Deal a = expired(101L, 20L);
        Deal b = expired(102L, 21L);
        when(dealRepo.findExpired(any())).thenReturn(List.of(a, b));

        sweeper.sweep();

        verify(dealService).cancelDeal(20L, 101L, DealExpirySweeper.EXPIRY_REASON);
        verify(dealService).cancelDeal(21L, 102L, DealExpirySweeper.EXPIRY_REASON);
    }

    @Test
    void sweep_tolerantToAlreadyTerminalDeals() {
        Deal a = expired(101L, 20L);
        Deal b = expired(102L, 21L);
        when(dealRepo.findExpired(any())).thenReturn(List.of(a, b));
        doThrow(new DealConflictException("already AGREED"))
                .when(dealService).cancelDeal(eq(20L), eq(101L), any());

        sweeper.sweep(); // does not throw

        verify(dealService).cancelDeal(21L, 102L, DealExpirySweeper.EXPIRY_REASON);
    }

    @Test
    void sweep_continuesPastUnexpectedExceptions() {
        Deal a = expired(101L, 20L);
        Deal b = expired(102L, 21L);
        when(dealRepo.findExpired(any())).thenReturn(List.of(a, b));
        doThrow(new RuntimeException("db hiccup"))
                .when(dealService).cancelDeal(eq(20L), eq(101L), any());

        sweeper.sweep();

        verify(dealService).cancelDeal(21L, 102L, DealExpirySweeper.EXPIRY_REASON);
    }
}
