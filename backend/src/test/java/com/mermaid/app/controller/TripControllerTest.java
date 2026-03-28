package com.mermaid.app.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.mermaid.app.exception.TripNotActiveException;
import com.mermaid.app.exception.ResourceNotFoundException;
import com.mermaid.app.model.*;
import com.mermaid.app.service.TripService;
import org.junit.jupiter.api.Test;
import org.openapitools.jackson.nullable.JsonNullableModule;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.OffsetDateTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(TripController.class)
@Import(TripControllerTest.TestConfig.class)
class TripControllerTest {

    @TestConfiguration
    static class TestConfig {
        @Bean
        public com.fasterxml.jackson.databind.Module jsonNullableModule() {
            return new JsonNullableModule();
        }
    }

    @Autowired MockMvc mockMvc;
    @MockitoBean TripService tripService;
    @MockitoBean JwtDecoder jwtDecoder;

    private final ObjectMapper objectMapper = new ObjectMapper()
        .registerModule(new JavaTimeModule())
        .registerModule(new JsonNullableModule())
        .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);

    private static org.springframework.test.web.servlet.request.RequestPostProcessor asFisherman(long userId) {
        return jwt().jwt(b -> b.subject(String.valueOf(userId)))
                    .authorities(new SimpleGrantedAuthority("ROLE_FISHERMAN"));
    }

    @Test
    void startTrip_asFisherman_returns201() throws Exception {
        TripStartRequest req = new TripStartRequest("Navotas Port", "Manila Bay");
        com.mermaid.app.model.Trip trip = new com.mermaid.app.model.Trip(1L, 42L, TripStatus.ACTIVE, OffsetDateTime.now());
        when(tripService.startTrip(any(), eq(42L))).thenReturn(trip);

        mockMvc.perform(post("/trips")
                .with(asFisherman(42L))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
            .andExpect(status().isCreated());
    }

    @Test
    void startTrip_asNonFisherman_returns403() throws Exception {
        TripStartRequest req = new TripStartRequest("Navotas Port", "Manila Bay");

        mockMvc.perform(post("/trips")
                .with(jwt().authorities(new SimpleGrantedAuthority("ROLE_VENDOR")))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
            .andExpect(status().isForbidden());
    }

    @Test
    void startTrip_missingDeparturePoint_returns400() throws Exception {
        // departurePoint is required — omitting it triggers @Valid
        String body = "{\"targetArea\": \"Manila Bay\"}";

        mockMvc.perform(post("/trips")
                .with(asFisherman(42L))
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
            .andExpect(status().isBadRequest());
    }

    @Test
    void getTripById_notFound_returns404() throws Exception {
        when(tripService.getTripById(eq(99L), any()))
            .thenThrow(new ResourceNotFoundException("Trip not found: 99"));

        mockMvc.perform(get("/trips/99").with(asFisherman(42L)))
            .andExpect(status().isNotFound());
    }

    @Test
    void saveTripChecklist_activeTrip_returns200() throws Exception {
        SafetyChecklistRequest req = new SafetyChecklistRequest(true, true, false, true, true, false);
        when(tripService.saveTripChecklist(eq(1L), any(), any()))
            .thenReturn(new SafetyChecklist());

        mockMvc.perform(put("/trips/1/checklist")
                .with(asFisherman(42L))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
            .andExpect(status().isOk());
    }

    @Test
    void saveTripChecklist_completedTrip_returns409() throws Exception {
        SafetyChecklistRequest req = new SafetyChecklistRequest(true, true, true, true, true, true);
        when(tripService.saveTripChecklist(eq(1L), any(), any()))
            .thenThrow(new TripNotActiveException(1L));

        mockMvc.perform(put("/trips/1/checklist")
                .with(asFisherman(42L))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
            .andExpect(status().isConflict());
    }

    @Test
    void endTrip_activeTrip_returns200() throws Exception {
        when(tripService.endTrip(eq(1L), any(), any()))
            .thenReturn(new com.mermaid.app.model.Trip(1L, 42L, TripStatus.COMPLETED, OffsetDateTime.now()));

        mockMvc.perform(post("/trips/1/end")
                .with(asFisherman(42L))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
            .andExpect(status().isOk());
    }

    @Test
    void endTrip_completedTrip_returns409() throws Exception {
        when(tripService.endTrip(eq(1L), any(), any()))
            .thenThrow(new TripNotActiveException(1L));

        mockMvc.perform(post("/trips/1/end")
                .with(asFisherman(42L))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
            .andExpect(status().isConflict());
    }

    @Test
    void listTrips_invalidStatusParam_returns400() throws Exception {
        mockMvc.perform(get("/trips?status=BOGUS").with(asFisherman(42L)))
            .andExpect(status().isBadRequest());
    }
}
