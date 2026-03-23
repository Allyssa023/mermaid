package com.mermaid.app.controller;

import com.mermaid.app.model.Advisory;
import com.mermaid.app.model.Severity;
import com.mermaid.app.service.AdvisoryService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.OffsetDateTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(AdvisoryController.class)
class AdvisoryControllerTest {

    @Autowired MockMvc mockMvc;
    @MockitoBean AdvisoryService advisoryService;
    @MockitoBean JwtDecoder jwtDecoder;

    @Test
    void listAdvisories_noJwt_returns401() throws Exception {
        mockMvc.perform(get("/advisories"))
               .andExpect(status().isUnauthorized());
    }

    @Test
    void listAdvisories_defaultsToActiveOnly() throws Exception {
        when(advisoryService.listActive(null)).thenReturn(List.of(sampleAdvisory()));

        mockMvc.perform(get("/advisories").with(jwt()))
               .andExpect(status().isOk())
               .andExpect(jsonPath("$[0].title").value("Storm Warning"));

        verify(advisoryService).listActive(null);
        verify(advisoryService, never()).listAll();
    }

    @Test
    void listAdvisories_activeOnlyFalse_callsListAll() throws Exception {
        when(advisoryService.listAll()).thenReturn(List.of(sampleAdvisory()));

        mockMvc.perform(get("/advisories").param("activeOnly", "false").with(jwt()))
               .andExpect(status().isOk());

        verify(advisoryService).listAll();
        verify(advisoryService, never()).listActive(any());
    }

    @Test
    void listAdvisories_withSeverityFilter_passesFilterToService() throws Exception {
        when(advisoryService.listActive(Severity.HIGH)).thenReturn(List.of());

        mockMvc.perform(get("/advisories")
               .param("severity", "HIGH")
               .with(jwt()))
               .andExpect(status().isOk());

        verify(advisoryService).listActive(Severity.HIGH);
    }

    private Advisory sampleAdvisory() {
        return new Advisory(
            1L, "Storm Warning", "Rough seas expected",
            Severity.HIGH, "Visayan Sea",
            OffsetDateTime.now(), OffsetDateTime.now().plusDays(2), true);
    }
}
