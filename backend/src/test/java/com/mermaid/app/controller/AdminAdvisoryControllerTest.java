package com.mermaid.app.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.mermaid.app.model.*;
import com.mermaid.app.service.AdvisoryService;
import com.mermaid.app.service.AdminUserService;
import com.mermaid.app.service.FishSpeciesService;
import com.mermaid.app.service.MarketLocationService;
import org.junit.jupiter.api.Test;
import org.openapitools.jackson.nullable.JsonNullableModule;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
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

@WebMvcTest(AdminController.class)
@Import(AdminAdvisoryControllerTest.TestConfig.class)
class AdminAdvisoryControllerTest {

    @TestConfiguration
    static class TestConfig {
        @Bean
        public com.fasterxml.jackson.databind.Module jsonNullableModule() {
            return new JsonNullableModule();
        }
    }

    @Autowired MockMvc mockMvc;

    private final ObjectMapper objectMapper = new ObjectMapper()
        .registerModule(new JavaTimeModule())
        .registerModule(new JsonNullableModule())
        .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);

    @MockitoBean AdvisoryService advisoryService;
    @MockitoBean FishSpeciesService fishSpeciesService;
    @MockitoBean MarketLocationService marketLocationService;
    @MockitoBean AdminUserService adminUserService;
    @MockitoBean com.mermaid.app.service.AdminMetricsService adminMetricsService;
    @MockitoBean com.mermaid.app.service.DauService dauService;
    @MockitoBean com.mermaid.app.service.AdminHealthService adminHealthService;
    @MockitoBean com.mermaid.app.service.AuditLogService auditLogService;
    @MockitoBean JwtDecoder jwtDecoder;
    @MockitoBean com.mermaid.app.repository.OrderRepository orderRepository;
    @MockitoBean com.mermaid.app.mapper.BuyerOrderMapper buyerOrderMapper;
    @MockitoBean com.mermaid.app.service.OrderTimelineService orderTimelineService;

    // --- Advisory CRUD ---

    @Test
    void adminListAdvisories_asAdmin_returns200() throws Exception {
        when(advisoryService.listAll()).thenReturn(List.of(sampleAdvisory()));

        mockMvc.perform(get("/admin/advisories")
               .with(jwt().jwt(b -> b.subject("1").claim("roles", List.of("ROLE_ADMIN")))))
               .andExpect(status().isOk())
               .andExpect(jsonPath("$[0].title").value("Storm Warning"));
    }

    @Test
    void adminCreateAdvisory_validRequest_returns201() throws Exception {
        AdvisoryCreateRequest request = new AdvisoryCreateRequest(
            "Storm Warning", "Rough seas expected",
            Severity.HIGH, "Visayan Sea",
            OffsetDateTime.now(), OffsetDateTime.now().plusDays(2));
        when(advisoryService.create(any(), eq(1L))).thenReturn(sampleAdvisory());

        mockMvc.perform(post("/admin/advisories")
               .with(jwt().jwt(b -> b.subject("1").claim("roles", List.of("ROLE_ADMIN"))))
               .contentType(MediaType.APPLICATION_JSON)
               .content(objectMapper.writeValueAsString(request)))
               .andExpect(status().isCreated())
               .andExpect(jsonPath("$.title").value("Storm Warning"));
    }

    @Test
    void adminCreateAdvisory_blankTitle_returns400() throws Exception {
        AdvisoryCreateRequest request = new AdvisoryCreateRequest(
            "", "Rough seas expected",
            Severity.HIGH, "Visayan Sea",
            OffsetDateTime.now(), OffsetDateTime.now().plusDays(2));

        mockMvc.perform(post("/admin/advisories")
               .with(jwt().jwt(b -> b.subject("1").claim("roles", List.of("ROLE_ADMIN"))))
               .contentType(MediaType.APPLICATION_JSON)
               .content(objectMapper.writeValueAsString(request)))
               .andExpect(status().isBadRequest());
    }

    @Test
    void adminCreateAdvisory_invalidDates_returns400() throws Exception {
        OffsetDateTime now = OffsetDateTime.now();
        AdvisoryCreateRequest request = new AdvisoryCreateRequest(
            "Bad Advisory", "Message content here",
            Severity.LOW, "Manila Bay",
            now.plusDays(5), now.plusDays(1));
        when(advisoryService.create(any(), any()))
            .thenThrow(new IllegalArgumentException("activeTo must be after activeFrom"));

        mockMvc.perform(post("/admin/advisories")
               .with(jwt().jwt(b -> b.subject("1").claim("roles", List.of("ROLE_ADMIN"))))
               .contentType(MediaType.APPLICATION_JSON)
               .content(objectMapper.writeValueAsString(request)))
               .andExpect(status().isBadRequest());
    }

    @Test
    void adminDeleteAdvisory_notFound_returns404() throws Exception {
        org.mockito.Mockito.doThrow(new com.mermaid.app.exception.ResourceNotFoundException("Advisory not found: 99"))
            .when(advisoryService).delete(99L);

        mockMvc.perform(delete("/admin/advisories/99")
               .with(jwt().jwt(b -> b.subject("1").claim("roles", List.of("ROLE_ADMIN")))))
               .andExpect(status().isNotFound());
    }

    // --- Fish species CRUD ---

    @Test
    void adminCreateFishSpecies_asAdmin_returns201() throws Exception {
        FishSpeciesCreateRequest request = new FishSpeciesCreateRequest("Bangus");
        when(fishSpeciesService.create(any())).thenReturn(new FishSpecies(1L, "Bangus", true));

        mockMvc.perform(post("/admin/fish-species")
               .with(jwt().jwt(b -> b.subject("1").claim("roles", List.of("ROLE_ADMIN"))))
               .contentType(MediaType.APPLICATION_JSON)
               .content(objectMapper.writeValueAsString(request)))
               .andExpect(status().isCreated())
               .andExpect(jsonPath("$.commonName").value("Bangus"));
    }

    @Test
    void adminDeleteFishSpecies_notFound_returns404() throws Exception {
        org.mockito.Mockito.doThrow(new com.mermaid.app.exception.ResourceNotFoundException("Fish species not found: 99"))
            .when(fishSpeciesService).delete(99L);

        mockMvc.perform(delete("/admin/fish-species/99")
               .with(jwt().jwt(b -> b.subject("1").claim("roles", List.of("ROLE_ADMIN")))))
               .andExpect(status().isNotFound());
    }

    // --- Market location CRUD ---

    @Test
    void adminCreateMarketLocation_asAdmin_returns201() throws Exception {
        MarketLocationCreateRequest request = new MarketLocationCreateRequest("Carbon Market", "Cebu City");
        when(marketLocationService.create(any()))
            .thenReturn(new MarketLocation(1L, "Carbon Market", "Cebu City", true));

        mockMvc.perform(post("/admin/market-locations")
               .with(jwt().jwt(b -> b.subject("1").claim("roles", List.of("ROLE_ADMIN"))))
               .contentType(MediaType.APPLICATION_JSON)
               .content(objectMapper.writeValueAsString(request)))
               .andExpect(status().isCreated())
               .andExpect(jsonPath("$.name").value("Carbon Market"));
    }

    private Advisory sampleAdvisory() {
        return new Advisory(
            1L, "Storm Warning", "Rough seas expected",
            Severity.HIGH, "Visayan Sea",
            OffsetDateTime.now(), OffsetDateTime.now().plusDays(2), true);
    }
}
