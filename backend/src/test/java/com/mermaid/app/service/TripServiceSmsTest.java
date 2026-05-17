package com.mermaid.app.service;

import com.mermaid.app.domain.Trip;
import com.mermaid.app.domain.User;
import com.mermaid.app.model.TripStatus;
import com.mermaid.app.mapper.TripMapper;
import com.mermaid.app.model.TripStartRequest;
import com.mermaid.app.repository.TripRepository;
import com.mermaid.app.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TripServiceSmsTest {

    @Mock TripRepository tripRepo;
    @Mock TripMapper tripMapper;
    @Mock UserRepository userRepo;
    @Mock SmsService smsService;
    @Mock com.mermaid.app.repository.CatchLogRepository catchLogRepo;
    @Mock com.mermaid.app.repository.CatchAlertRepository catchAlertRepo;
    @Mock org.springframework.context.ApplicationEventPublisher eventPublisher;
    @InjectMocks TripService service;

    @Test
    void startTrip_sends_sms_to_emergency_contact() {
        User user = new User();
        user.setId(1L);
        user.setFullName("Isidro Cruz");
        user.setVesselName("MV Diwata");
        user.setEmergencyContactPhone("09171234567");
        when(userRepo.findById(1L)).thenReturn(Optional.of(user));

        Trip savedTrip = new Trip();
        savedTrip.setId(10L);
        savedTrip.setFishermanId(1L);
        savedTrip.setStatus(TripStatus.ACTIVE);
        when(tripRepo.save(any())).thenReturn(savedTrip);
        when(tripMapper.toModel(any(), any())).thenReturn(new com.mermaid.app.model.Trip());

        TripStartRequest req = new TripStartRequest();
        service.startTrip(req, 1L);

        verify(smsService).send(eq("09171234567"), contains("Isidro Cruz"));
    }

    @Test
    void startTrip_skips_sms_when_emergency_contact_is_null() {
        User user = new User();
        user.setId(1L);
        user.setFullName("Isidro Cruz");
        when(userRepo.findById(1L)).thenReturn(Optional.of(user));

        Trip savedTrip = new Trip();
        savedTrip.setId(10L);
        savedTrip.setFishermanId(1L);
        savedTrip.setStatus(TripStatus.ACTIVE);
        when(tripRepo.save(any())).thenReturn(savedTrip);
        when(tripMapper.toModel(any(), any())).thenReturn(new com.mermaid.app.model.Trip());

        TripStartRequest req = new TripStartRequest();
        service.startTrip(req, 1L);

        verify(smsService, never()).send(any(), any());
    }

    @Test
    void startTrip_does_not_propagate_sms_exception() {
        User user = new User();
        user.setId(1L);
        user.setFullName("Isidro Cruz");
        user.setEmergencyContactPhone("09171234567");
        when(userRepo.findById(1L)).thenReturn(Optional.of(user));
        doThrow(new RuntimeException("SMS failed")).when(smsService).send(any(), any());

        Trip savedTrip = new Trip();
        savedTrip.setFishermanId(1L);
        savedTrip.setStatus(TripStatus.ACTIVE);
        when(tripRepo.save(any())).thenReturn(savedTrip);
        when(tripMapper.toModel(any(), any())).thenReturn(new com.mermaid.app.model.Trip());

        TripStartRequest req = new TripStartRequest();
        service.startTrip(req, 1L);
    }

    @Test
    void endTrip_sends_return_sms() {
        User user = new User();
        user.setId(1L);
        user.setFullName("Isidro Cruz");
        user.setEmergencyContactPhone("09171234567");
        when(userRepo.findById(1L)).thenReturn(Optional.of(user));

        Trip trip = new Trip();
        trip.setId(5L);
        trip.setFishermanId(1L);
        trip.setStatus(TripStatus.ACTIVE);
        when(tripRepo.findByIdAndFishermanId(5L, 1L)).thenReturn(Optional.of(trip));
        when(tripRepo.save(any())).thenReturn(trip);
        when(tripMapper.toModel(any(), any())).thenReturn(new com.mermaid.app.model.Trip());

        service.endTrip(5L, null, 1L);

        verify(smsService).send(eq("09171234567"), contains("returned safely"));
    }
}
