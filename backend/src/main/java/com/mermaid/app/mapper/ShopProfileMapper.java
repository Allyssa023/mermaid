package com.mermaid.app.mapper;

import com.mermaid.app.repository.MarketLocationRepository;
import org.openapitools.jackson.nullable.JsonNullable;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;

@Component
public class ShopProfileMapper {

    private final MarketLocationRepository locationRepo;

    public ShopProfileMapper(MarketLocationRepository locationRepo) {
        this.locationRepo = locationRepo;
    }

    public com.mermaid.app.model.ShopProfile toDto(com.mermaid.app.domain.ShopProfile entity) {
        com.mermaid.app.model.ShopProfile dto = new com.mermaid.app.model.ShopProfile(
                entity.getId(),
                entity.getVendorId(),
                entity.getSlug(),
                entity.getDisplayName(),
                entity.getCreatedAt(),
                entity.getUpdatedAt());

        dto.setBio(JsonNullable.of(entity.getBio()));
        dto.setLogoUrl(JsonNullable.of(entity.getLogoUrl()));
        dto.setBannerUrl(JsonNullable.of(entity.getBannerUrl()));
        dto.setHoursJson(JsonNullable.of(entity.getHoursJson()));
        dto.setPickupLocationId(JsonNullable.of(entity.getPickupLocationId()));
        dto.setLat(entity.getLat() != null ? JsonNullable.of(entity.getLat().doubleValue()) : JsonNullable.undefined());
        dto.setLng(entity.getLng() != null ? JsonNullable.of(entity.getLng().doubleValue()) : JsonNullable.undefined());

        if (entity.getPickupLocationId() != null) {
            locationRepo.findById(entity.getPickupLocationId())
                    .ifPresent(loc -> dto.setPickupLocationName(JsonNullable.of(loc.getName())));
        }
        return dto;
    }

    public void applyPatch(com.mermaid.app.model.ShopProfileRequest req,
                           com.mermaid.app.domain.ShopProfile entity) {
        if (req.getSlug() != null && req.getSlug().isPresent()) {
            entity.setSlug(req.getSlug().get());
        }
        if (req.getDisplayName() != null && req.getDisplayName().isPresent()) {
            entity.setDisplayName(req.getDisplayName().get());
        }
        if (req.getBio() != null && req.getBio().isPresent()) {
            entity.setBio(req.getBio().get());
        }
        if (req.getLogoUrl() != null && req.getLogoUrl().isPresent()) {
            entity.setLogoUrl(req.getLogoUrl().get());
        }
        if (req.getBannerUrl() != null && req.getBannerUrl().isPresent()) {
            entity.setBannerUrl(req.getBannerUrl().get());
        }
        if (req.getHoursJson() != null && req.getHoursJson().isPresent()) {
            entity.setHoursJson(req.getHoursJson().get());
        }
        if (req.getPickupLocationId() != null && req.getPickupLocationId().isPresent()) {
            entity.setPickupLocationId(req.getPickupLocationId().get());
        }
        if (req.getLat() != null && req.getLat().isPresent()) {
            Double v = req.getLat().get();
            entity.setLat(v != null ? BigDecimal.valueOf(v) : null);
        }
        if (req.getLng() != null && req.getLng().isPresent()) {
            Double v = req.getLng().get();
            entity.setLng(v != null ? BigDecimal.valueOf(v) : null);
        }
    }
}
