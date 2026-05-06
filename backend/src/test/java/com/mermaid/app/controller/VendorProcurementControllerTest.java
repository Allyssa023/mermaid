package com.mermaid.app.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.mermaid.app.domain.*;
import com.mermaid.app.repository.CatchAlertRepository;
import com.mermaid.app.repository.OrderRepository;
import com.mermaid.app.repository.UserRepository;
import com.mermaid.app.service.ProcurementCartService;
import com.mermaid.app.service.ProcurementOrderService;
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

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(VendorProcurementController.class)
@Import({VendorProcurementControllerTest.TestConfig.class, com.mermaid.app.config.JacksonConfig.class})
class VendorProcurementControllerTest {

    @TestConfiguration
    static class TestConfig {
        @Bean
        public com.fasterxml.jackson.databind.Module jsonNullableModule() {
            return new JsonNullableModule();
        }
    }

    @Autowired MockMvc mockMvc;

    @MockitoBean ProcurementCartService cartService;
    @MockitoBean ProcurementOrderService orderService;
    @MockitoBean CatchAlertRepository alertRepo;
    @MockitoBean OrderRepository orderRepo;
    @MockitoBean UserRepository userRepo;
    @MockitoBean JwtDecoder jwtDecoder;

    private final ObjectMapper om = new ObjectMapper()
            .registerModule(new JavaTimeModule())
            .registerModule(new JsonNullableModule())
            .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);

    private static org.springframework.test.web.servlet.request.RequestPostProcessor asVendor(long id) {
        return jwt().jwt(b -> b.subject(String.valueOf(id)))
                    .authorities(new SimpleGrantedAuthority("ROLE_VENDOR"));
    }

    // ── GET /vendor/procurement/feed ──────────────────────────────────────────

    @Test
    void getFeed_returnsItems() throws Exception {
        CatchAlert alert = alert(10L, 1L, species(5L, "Tuna"),
                bd("0.00"), bd("100.00"), OffsetDateTime.now().plusHours(2));
        when(alertRepo.findActiveFeed(any())).thenReturn(List.of(alert));
        when(cartService.list(20L)).thenReturn(List.of());
        when(userRepo.findById(1L)).thenReturn(Optional.empty());

        mockMvc.perform(get("/vendor/procurement/feed").with(asVendor(20L)))
               .andExpect(status().isOk())
               .andExpect(jsonPath("$[0].id").value(10))
               .andExpect(jsonPath("$[0].speciesName").value("Tuna"))
               .andExpect(jsonPath("$[0].inCart").value(false));
    }

    @Test
    void getFeed_withSpeciesFilter_callsFilteredRepo() throws Exception {
        when(alertRepo.findActiveFeedBySpecies(any(), eq(5L))).thenReturn(List.of());
        when(cartService.list(20L)).thenReturn(List.of());

        mockMvc.perform(get("/vendor/procurement/feed")
                .param("speciesId", "5")
                .with(asVendor(20L)))
               .andExpect(status().isOk())
               .andExpect(jsonPath("$").isArray());
    }

    @Test
    void getFeed_unauthenticated_returns401() throws Exception {
        mockMvc.perform(get("/vendor/procurement/feed"))
               .andExpect(status().isUnauthorized());
    }

    // ── GET /vendor/procurement/cart ──────────────────────────────────────────

    @Test
    void getCart_returnsEmptyList() throws Exception {
        when(cartService.list(20L)).thenReturn(List.of());

        mockMvc.perform(get("/vendor/procurement/cart").with(asVendor(20L)))
               .andExpect(status().isOk())
               .andExpect(jsonPath("$").isArray())
               .andExpect(jsonPath("$").isEmpty());
    }

    // ── POST /vendor/procurement/cart/items ───────────────────────────────────

    @Test
    void addCartItem_happyPath_returns200() throws Exception {
        CatchAlert al = alert(10L, 1L, species(5L, "Bangus"), bd("0.00"), bd("80.00"),
                OffsetDateTime.now().plusHours(2));
        ProcurementCartItem saved = cartItem(1L, 20L, al, bd("30.00"), bd("200.00"));

        when(cartService.addOrUpdate(eq(20L), eq(10L), any(), any())).thenReturn(saved);
        when(userRepo.findById(1L)).thenReturn(Optional.empty());

        String body = om.writeValueAsString(Map.of("catchAlertId", 10, "qtyKg", 30.0));
        mockMvc.perform(post("/vendor/procurement/cart/items")
                .contentType(MediaType.APPLICATION_JSON)
                .content(body)
                .with(asVendor(20L)))
               .andExpect(status().isOk())
               .andExpect(jsonPath("$.id").value(1))
               .andExpect(jsonPath("$.qtyKg").value(30.0));
    }

    @Test
    void addCartItem_missingBody_returns400() throws Exception {
        mockMvc.perform(post("/vendor/procurement/cart/items")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}")
                .with(asVendor(20L)))
               .andExpect(status().isBadRequest());
    }

    // ── POST /vendor/procurement/checkout ─────────────────────────────────────

    @Test
    void checkout_returnsOrders() throws Exception {
        FishSpecies sp = species(5L, "Tuna");
        Order ord = order(77L, 20L, 1L, sp, "PENDING");
        when(orderService.checkout(20L)).thenReturn(List.of(ord));
        when(userRepo.findById(1L)).thenReturn(Optional.empty());

        mockMvc.perform(post("/vendor/procurement/checkout").with(asVendor(20L)))
               .andExpect(status().isOk())
               .andExpect(jsonPath("$[0].id").value(77));
    }

    @Test
    void checkout_emptyCart_returns400() throws Exception {
        when(orderService.checkout(20L)).thenThrow(new IllegalArgumentException("Procurement cart is empty"));

        mockMvc.perform(post("/vendor/procurement/checkout").with(asVendor(20L)))
               .andExpect(status().isBadRequest());
    }

    // ── GET /vendor/procurement/orders ────────────────────────────────────────

    @Test
    void listOrders_returnsOrders() throws Exception {
        FishSpecies sp = species(5L, "Tuna");
        Order ord = order(77L, 20L, 1L, sp, "PENDING");
        when(orderService.listForVendor(20L, null)).thenReturn(List.of(ord));
        when(userRepo.findById(1L)).thenReturn(Optional.empty());

        mockMvc.perform(get("/vendor/procurement/orders").with(asVendor(20L)))
               .andExpect(status().isOk())
               .andExpect(jsonPath("$[0].id").value(77));
    }

    // ── POST /vendor/procurement/orders/{orderId}/cancel ──────────────────────

    @Test
    void cancelOrder_happyPath_returns200() throws Exception {
        FishSpecies sp = species(5L, "Tuna");
        Order ord = order(77L, 20L, 1L, sp, "CANCELLED");
        when(orderService.vendorCancel(eq(20L), eq(77L), any())).thenReturn(ord);
        when(userRepo.findById(1L)).thenReturn(Optional.empty());

        mockMvc.perform(post("/vendor/procurement/orders/77/cancel")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"reason\":\"no longer needed\"}")
                .with(asVendor(20L)))
               .andExpect(status().isOk())
               .andExpect(jsonPath("$.status").value("CANCELLED"));
    }

    // ── POST /vendor/procurement/preorders ────────────────────────────────────

    @Test
    void placePreorder_returns200() throws Exception {
        FishSpecies sp = species(5L, "Tuna");
        Order ord = order(88L, 20L, 2L, sp, "PENDING");
        ord.setCatchAlertId(null);
        when(orderService.placePreorder(eq(20L), eq(2L), eq(5L), any(), any(), any())).thenReturn(ord);
        when(userRepo.findById(2L)).thenReturn(Optional.empty());

        String body = om.writeValueAsString(Map.of(
                "fishermanId", 2,
                "speciesId", 5,
                "qtyKg", 50.0,
                "pricePerKg", 180.0));
        mockMvc.perform(post("/vendor/procurement/preorders")
                .contentType(MediaType.APPLICATION_JSON)
                .content(body)
                .with(asVendor(20L)))
               .andExpect(status().isOk())
               .andExpect(jsonPath("$.id").value(88));
    }

    // ── helpers ────────────────────────────────────────────────────────────────

    private static FishSpecies species(Long id, String name) {
        FishSpecies sp = new FishSpecies();
        sp.setId(id);
        sp.setCommonName(name);
        return sp;
    }

    private static CatchAlert alert(Long id, Long fishermanId, FishSpecies sp,
                                    BigDecimal claimedKg, BigDecimal qtyKg, OffsetDateTime expiresAt) {
        CatchAlert a = new CatchAlert();
        a.setId(id);
        a.setFishermanId(fishermanId);
        a.setSpecies(sp);
        a.setClaimedKg(claimedKg);
        a.setQuantityKg(qtyKg);
        a.setStatus("ACTIVE");
        a.setExpiresAt(expiresAt);
        a.setCreatedAt(OffsetDateTime.now());
        return a;
    }

    private static ProcurementCartItem cartItem(Long id, Long vendorId, CatchAlert alert,
                                                BigDecimal qtyKg, BigDecimal price) {
        ProcurementCartItem item = new ProcurementCartItem();
        item.setId(id);
        item.setVendorId(vendorId);
        item.setCatchAlert(alert);
        item.setQtyKg(qtyKg);
        item.setOfferedPricePerKg(price);
        return item;
    }

    private static Order order(Long id, Long buyerId, Long sellerId, FishSpecies sp, String status) {
        Order o = new Order();
        o.setId(id);
        o.setBuyerId(buyerId);
        o.setSellerId(sellerId);
        o.setSpecies(sp);
        o.setStatus(status);
        o.setKind(OrderKind.PROCUREMENT);
        o.setAgreedPricePerKg(new BigDecimal("100.00"));
        o.setOrderedQtyKg(new BigDecimal("30.00"));
        o.setCreatedAt(OffsetDateTime.now());
        return o;
    }

    private static BigDecimal bd(String val) { return new BigDecimal(val); }
}
