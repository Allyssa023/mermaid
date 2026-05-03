package com.mermaid.app.controller;

import com.mermaid.app.api.BuyerFavoritesApi;
import com.mermaid.app.model.AddFavoriteRequest;
import com.mermaid.app.model.BuyerFavorite;
import com.mermaid.app.model.FavoriteTargetType;
import com.mermaid.app.security.SecurityUtils;
import com.mermaid.app.service.FavoriteService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@PreAuthorize("hasRole('BUYER')")
public class BuyerFavoriteController implements BuyerFavoritesApi {

    private final FavoriteService service;

    public BuyerFavoriteController(FavoriteService service) {
        this.service = service;
    }

    @Override
    public ResponseEntity<List<BuyerFavorite>> getBuyerFavorites(FavoriteTargetType type) {
        return ResponseEntity.ok(service.list(SecurityUtils.currentUserId(), type));
    }

    @Override
    public ResponseEntity<BuyerFavorite> addBuyerFavorite(AddFavoriteRequest request) {
        return ResponseEntity.status(201).body(service.add(SecurityUtils.currentUserId(), request));
    }

    @Override
    public ResponseEntity<Void> removeBuyerFavorite(Long favoriteId) {
        service.removeById(SecurityUtils.currentUserId(), favoriteId);
        return ResponseEntity.noContent().build();
    }

    @Override
    public ResponseEntity<Void> removeBuyerFavoriteByTarget(FavoriteTargetType targetType, Long targetId) {
        service.removeByTarget(SecurityUtils.currentUserId(), targetType, targetId);
        return ResponseEntity.noContent().build();
    }
}
