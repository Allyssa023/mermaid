package com.mermaid.app.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.mermaid.app.exception.ResourceNotFoundException;
import com.mermaid.app.exception.TripNotActiveException;
import com.mermaid.app.model.*;
import com.mermaid.app.service.CatchLogService;
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

@WebMvcTest(CatchLogController.class)
@Import({CatchLogControllerTest.TestConfig.class, com.mermaid.app.config.JacksonConfig.class})
class CatchLogControllerTest {

    @TestConfiguration
    static class TestConfig {
        @Bean
        public com.fasterxml.jackson.databind.Module jsonNullableModule() {
            return new JsonNullableModule();
        }
    }

    @Autowired MockMvc mockMvc;
    @MockitoBean CatchLogService catchLogService;
    @MockitoBean JwtDecoder jwtDecoder;

    private final ObjectMapper objectMapper = new ObjectMapper()
        .registerModule(new JavaTimeModule())
        .registerModule(new JsonNullableModule())
        .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);

    private static org.springframework.test.web.servlet.request.RequestPostProcessor asFisherman(long userId) {
        return jwt().jwt(b -> b.subject(String.valueOf(userId)))
                    .authorities(new SimpleGrantedAuthority("ROLE_FISHERMAN"));
    }

    private com.mermaid.app.model.CatchLog catchLogModel() {
        FishSpecies species = new FishSpecies(3L, "Bangus", true);
        return new com.mermaid.app.model.CatchLog(1L, 1L, species, OffsetDateTime.now());
    }

    @Test
    void createCatchLog_asFisherman_returns201() throws Exception {
        CatchLogCreateRequest req = new CatchLogCreateRequest(3L, "5.0");
        when(catchLogService.create(eq(1L), any(), any())).thenReturn(catchLogModel());

        mockMvc.perform(post("/trips/1/catches")
                .with(asFisherman(42L))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
            .andExpect(status().isCreated());
    }

    @Test
    void createCatchLog_belowMinQuantity_returns400() throws Exception {
        // quantityKg: 0.0 violates @DecimalMin("0.1")
        String body = "{\"speciesId\": 3, \"quantityKg\": 0.0}";

        mockMvc.perform(post("/trips/1/catches")
                .with(asFisherman(42L))
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
            .andExpect(status().isBadRequest());
    }

    @Test
    void createCatchLog_completedTrip_returns409() throws Exception {
        CatchLogCreateRequest req = new CatchLogCreateRequest(3L, "5.0");
        when(catchLogService.create(eq(1L), any(), any()))
            .thenThrow(new TripNotActiveException(1L));

        mockMvc.perform(post("/trips/1/catches")
                .with(asFisherman(42L))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
            .andExpect(status().isConflict());
    }

    @Test
    void updateCatchLog_returns200() throws Exception {
        CatchLogUpdateRequest req = new CatchLogUpdateRequest();
        when(catchLogService.update(eq(1L), eq(10L), any(), any()))
            .thenReturn(catchLogModel());

        mockMvc.perform(put("/trips/1/catches/10")
                .with(asFisherman(42L))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
            .andExpect(status().isOk());
    }

    @Test
    void deleteCatchLog_returns204() throws Exception {
        mockMvc.perform(delete("/trips/1/catches/10").with(asFisherman(42L)))
            .andExpect(status().isNoContent());
    }

    @Test
    void deleteCatchLog_notFound_returns404() throws Exception {
        org.mockito.Mockito.doThrow(new ResourceNotFoundException("CatchLog not found: 99"))
            .when(catchLogService).delete(eq(1L), eq(99L), any());

        mockMvc.perform(delete("/trips/1/catches/99").with(asFisherman(42L)))
            .andExpect(status().isNotFound());
    }
}
