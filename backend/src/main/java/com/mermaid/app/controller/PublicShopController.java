package com.mermaid.app.controller;

import com.mermaid.app.api.PublicApi;
import com.mermaid.app.model.PublicShopView;
import com.mermaid.app.service.ShopProfileService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class PublicShopController implements PublicApi {

    private final ShopProfileService shopProfileService;

    public PublicShopController(ShopProfileService shopProfileService) {
        this.shopProfileService = shopProfileService;
    }

    @Override
    public ResponseEntity<PublicShopView> getPublicShop(String vendorIdOrSlug) {
        return ResponseEntity.ok(shopProfileService.getPublic(vendorIdOrSlug));
    }
}
