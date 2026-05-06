package com.mermaid.app.service;

import com.mermaid.app.domain.CatchAlert;
import com.mermaid.app.domain.FishSpecies;
import com.mermaid.app.event.CatchAlertCreatedEvent;
import com.mermaid.app.repository.CatchAlertRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CatchAlertFanoutServiceTest {

    @Mock CatchAlertRepository alertRepo;
    @Mock WatchlistService watchlistService;
    @Mock NotificationService notificationService;
    @InjectMocks CatchAlertFanoutService fanout;

    @Test
    void fanout_matchingSpecies_createsNotification() {
        CatchAlert alert = activeAlert(42L);
        when(alertRepo.findById(42L)).thenReturn(Optional.of(alert));
        when(watchlistService.vendorsMatching(alert)).thenReturn(List.of(10L));
        when(notificationService.existsByUserAndCatchAlertId(10L, 42L)).thenReturn(false);

        fanout.onCatchAlertCreated(new CatchAlertCreatedEvent(42L));

        verify(notificationService).create(eq(10L), eq("CATCH_ALERT_NEW"), anyString(), anyMap(), anyString());
    }

    @Test
    void fanout_idempotent_noDoubleNotification() {
        CatchAlert alert = activeAlert(42L);
        when(alertRepo.findById(42L)).thenReturn(Optional.of(alert));
        when(watchlistService.vendorsMatching(alert)).thenReturn(List.of(10L));
        when(notificationService.existsByUserAndCatchAlertId(10L, 42L)).thenReturn(true);

        fanout.onCatchAlertCreated(new CatchAlertCreatedEvent(42L));

        verify(notificationService, never()).create(anyLong(), anyString(), anyString(), anyMap(), anyString());
    }

    @Test
    void fanout_nonActiveAlert_skipsNotification() {
        CatchAlert alert = new CatchAlert();
        alert.setId(42L);
        alert.setStatus("CANCELLED");
        when(alertRepo.findById(42L)).thenReturn(Optional.of(alert));

        fanout.onCatchAlertCreated(new CatchAlertCreatedEvent(42L));

        verify(watchlistService, never()).vendorsMatching(any());
        verify(notificationService, never()).create(anyLong(), anyString(), anyString(), anyMap(), anyString());
    }

    @Test
    void fanout_alertNotFound_skips() {
        when(alertRepo.findById(99L)).thenReturn(Optional.empty());

        fanout.onCatchAlertCreated(new CatchAlertCreatedEvent(99L));

        verify(notificationService, never()).create(anyLong(), anyString(), anyString(), anyMap(), anyString());
    }

    @Test
    void fanout_noMatchingVendors_createsNoNotification() {
        CatchAlert alert = activeAlert(42L);
        when(alertRepo.findById(42L)).thenReturn(Optional.of(alert));
        when(watchlistService.vendorsMatching(alert)).thenReturn(List.of());

        fanout.onCatchAlertCreated(new CatchAlertCreatedEvent(42L));

        verify(notificationService, never()).create(anyLong(), anyString(), anyString(), anyMap(), anyString());
    }

    private CatchAlert activeAlert(Long id) {
        CatchAlert alert = new CatchAlert();
        alert.setId(id);
        alert.setStatus("ACTIVE");
        FishSpecies species = new FishSpecies();
        species.setId(1L);
        species.setCommonName("Tuna");
        alert.setSpecies(species);
        alert.setQuantityEstimate("50 kg");
        return alert;
    }
}
