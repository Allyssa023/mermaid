package com.mermaid.app.controller;

import com.mermaid.app.model.*;
import com.mermaid.app.service.*;
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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(AdminController.class)
class AdminControllerTest {

    @Autowired MockMvc mvc;
    @MockitoBean JwtDecoder jwtDecoder;
    @MockitoBean AdminUserService adminUserService;
    @MockitoBean AdvisoryService advisoryService;
    @MockitoBean FishSpeciesService fishSpeciesService;
    @MockitoBean MarketLocationService marketLocationService;
    @MockitoBean AdminMetricsService adminMetricsService;
    @MockitoBean DauService dauService;
    @MockitoBean AdminHealthService adminHealthService;
    @MockitoBean AuditLogService auditLogService;
    @MockitoBean com.mermaid.app.repository.OrderRepository orderRepo;
    @MockitoBean com.mermaid.app.service.OrderTimelineService timelineService;
    @MockitoBean com.mermaid.app.mapper.BuyerOrderMapper buyerOrderMapper;

    private static org.springframework.test.web.servlet.request.RequestPostProcessor asAdmin() {
        return jwt().jwt(j -> j.claim("roles", List.of("ROLE_ADMIN")).subject("1"));
    }

    @Test
    void adminGetMetrics_requiresAuth() throws Exception {
        mvc.perform(get("/admin/metrics"))
            .andExpect(status().isUnauthorized());
    }

    @Test
    void adminGetMetrics_returnsMetrics() throws Exception {
        AdminMetrics m = new AdminMetrics();
        m.setTotalUsers(100); m.setFishermen(60); m.setVendors(25);
        m.setBuyers(13); m.setAdmins(2); m.setNewThisWeek(5);
        m.setActiveNow(8); m.setTotalTrips(500); m.setActiveTrips(10);
        m.setTripsToday(12); m.setTotalListings(80); m.setOpenListings(40);
        m.setTotalOrders(300); m.setOrdersToday(15); m.setDisputedOrders(3);
        m.setActiveAdvisories(4);
        when(adminMetricsService.getMetrics()).thenReturn(m);

        mvc.perform(get("/admin/metrics").with(asAdmin()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.totalUsers").value(100))
            .andExpect(jsonPath("$.activeAdvisories").value(4));
    }

    @Test
    void adminListFishSpecies_returnsAll() throws Exception {
        FishSpecies s = new FishSpecies();
        s.setId(1L); s.setCommonName("Tuna"); s.setActive(false);
        when(fishSpeciesService.listAll()).thenReturn(List.of(s));

        mvc.perform(get("/admin/fish-species").with(asAdmin()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[0].commonName").value("Tuna"))
            .andExpect(jsonPath("$[0].active").value(false));
    }

    @Test
    void adminReactivateFishSpecies_returnsReactivated() throws Exception {
        FishSpecies s = new FishSpecies();
        s.setId(5L); s.setCommonName("Bangus"); s.setActive(true);
        when(fishSpeciesService.reactivate(5L)).thenReturn(s);

        mvc.perform(post("/admin/fish-species/5/reactivate").with(asAdmin()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.active").value(true));
    }

    @Test
    void adminListMarketLocations_returnsAll() throws Exception {
        MarketLocation loc = new MarketLocation();
        loc.setId(3L); loc.setName("Navotas Fish Port"); loc.setActive(false);
        when(marketLocationService.listAll()).thenReturn(List.of(loc));

        mvc.perform(get("/admin/market-locations").with(asAdmin()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[0].name").value("Navotas Fish Port"));
    }

    @Test
    void adminGetHealth_returnsList() throws Exception {
        HealthCheck h = new HealthCheck();
        h.setName("Database"); h.setStatus(HealthCheck.StatusEnum.OK); h.setDetail("Connected");
        when(adminHealthService.getHealthChecks()).thenReturn(List.of(h));

        mvc.perform(get("/admin/health").with(asAdmin()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[0].name").value("Database"))
            .andExpect(jsonPath("$[0].status").value("OK"));
    }

    @Test
    void adminListAuditLog_returnsList() throws Exception {
        when(auditLogService.list(null)).thenReturn(List.of());

        mvc.perform(get("/admin/audit-log").with(asAdmin()))
            .andExpect(status().isOk());
    }
}
