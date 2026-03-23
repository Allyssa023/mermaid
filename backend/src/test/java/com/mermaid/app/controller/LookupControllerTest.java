package com.mermaid.app.controller;

import com.mermaid.app.model.FishSpecies;
import com.mermaid.app.model.MarketLocation;
import com.mermaid.app.service.FishSpeciesService;
import com.mermaid.app.service.MarketLocationService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(LookupController.class)
class LookupControllerTest {

    @Autowired MockMvc mockMvc;

    @MockitoBean FishSpeciesService fishSpeciesService;
    @MockitoBean MarketLocationService marketLocationService;
    @MockitoBean JwtDecoder jwtDecoder;

    @Test
    void listFishSpecies_noJwt_returns401() throws Exception {
        mockMvc.perform(get("/lookups/fish-species"))
               .andExpect(status().isUnauthorized());
    }

    @Test
    void listFishSpecies_withJwt_returns200WithList() throws Exception {
        when(fishSpeciesService.listActive()).thenReturn(
            List.of(new FishSpecies(1L, "Bangus", true)));

        mockMvc.perform(get("/lookups/fish-species").with(jwt()))
               .andExpect(status().isOk())
               .andExpect(jsonPath("$[0].commonName").value("Bangus"));
    }

    @Test
    void listMarketLocations_withJwt_returns200WithList() throws Exception {
        when(marketLocationService.listActive()).thenReturn(
            List.of(new MarketLocation(1L, "Navotas Fish Port", "Navotas", true)));

        mockMvc.perform(get("/lookups/market-locations").with(jwt()))
               .andExpect(status().isOk())
               .andExpect(jsonPath("$[0].name").value("Navotas Fish Port"));
    }
}
