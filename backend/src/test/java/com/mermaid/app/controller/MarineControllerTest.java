package com.mermaid.app.controller;

import com.github.benmanes.caffeine.cache.Cache;
import com.mermaid.app.client.MarineServiceClient;
import com.mermaid.app.config.CacheConfig;
import com.mermaid.app.exception.MarineServiceUnavailableException;
import com.mermaid.app.exception.ResourceNotFoundException;
import com.mermaid.app.mapper.MarineConditionsMapper;
import com.mermaid.app.model.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.OffsetDateTime;
import java.util.List;

import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(MarineController.class)
@Import({CacheConfig.class})
class MarineControllerTest {

    @Autowired MockMvc mockMvc;

    @MockitoBean MarineServiceClient client;
    @MockitoBean MarineConditionsMapper mapper;
    @MockitoBean JwtDecoder jwtDecoder;  // prevents SecurityConfig from building a real one

    @Autowired Cache<String, AllMarineConditionsResponse> cache;

    private AllMarineConditionsResponse sampleAllResponse() {
        MarineConditionsResponse zone = new MarineConditionsResponse();
        zone.setZoneId("manila_bay");
        zone.setZoneName("Manila Bay");
        zone.setRegion("Luzon");
        zone.setLat(14.5);
        zone.setLng(120.8);
        zone.setObservedAt(OffsetDateTime.now());
        zone.setDataSource("Open-Meteo");

        RiskAssessmentDto risk = new RiskAssessmentDto();
        risk.setLevel(RiskLevel.SAFE);
        risk.setScore(0);
        risk.setFactors(List.of());
        risk.setAdvisory("Safe.");
        zone.setRisk(risk);

        zone.setMarine(new MarineDataDto());
        zone.setWeather(new WeatherDataDto());

        AllMarineConditionsResponse all = new AllMarineConditionsResponse();
        all.setZones(List.of(zone));
        all.setGeneratedAt(OffsetDateTime.now());
        return all;
    }

    @BeforeEach
    void clearCache() {
        cache.invalidateAll();
    }

    @Test
    void getAllConditions_noJwt_returns401() throws Exception {
        mockMvc.perform(get("/marine/conditions"))
               .andExpect(status().isUnauthorized());
    }

    @Test
    void getAllConditions_withJwt_returns200() throws Exception {
        AllMarineConditionsResponse expected = sampleAllResponse();
        when(mapper.toAllResponse(any())).thenReturn(expected);
        when(client.getAllConditions()).thenReturn(null); // mapper is mocked, dto value irrelevant

        mockMvc.perform(get("/marine/conditions").with(jwt()))
               .andExpect(status().isOk())
               .andExpect(jsonPath("$.zones[0].zoneId").value("manila_bay"))
               .andExpect(jsonPath("$.zones[0].risk.level").value("SAFE"));
    }

    @Test
    void getAllConditions_calledTwice_clientCalledOnce() throws Exception {
        AllMarineConditionsResponse expected = sampleAllResponse();
        when(mapper.toAllResponse(any())).thenReturn(expected);
        when(client.getAllConditions()).thenReturn(null);

        mockMvc.perform(get("/marine/conditions").with(jwt())).andExpect(status().isOk());
        mockMvc.perform(get("/marine/conditions").with(jwt())).andExpect(status().isOk());

        verify(client, times(1)).getAllConditions(); // second call is a cache hit
    }

    @Test
    void getZoneConditions_withJwt_returns200() throws Exception {
        MarineConditionsResponse zone = sampleAllResponse().getZones().get(0);
        when(mapper.toResponse(any())).thenReturn(zone);
        when(client.getZoneConditions("manila_bay")).thenReturn(null);

        mockMvc.perform(get("/marine/conditions/manila_bay").with(jwt()))
               .andExpect(status().isOk())
               .andExpect(jsonPath("$.zoneId").value("manila_bay"));
    }

    @Test
    void getZoneConditions_unknownZone_returns404() throws Exception {
        when(client.getZoneConditions("bad_zone"))
            .thenThrow(new ResourceNotFoundException("Zone not found: bad_zone"));

        mockMvc.perform(get("/marine/conditions/bad_zone").with(jwt()))
               .andExpect(status().isNotFound());
    }

    @Test
    void getAllConditions_clientThrows503_returns503() throws Exception {
        when(client.getAllConditions())
            .thenThrow(new MarineServiceUnavailableException("unavailable"));

        mockMvc.perform(get("/marine/conditions").with(jwt()))
               .andExpect(status().isServiceUnavailable());
    }
}
