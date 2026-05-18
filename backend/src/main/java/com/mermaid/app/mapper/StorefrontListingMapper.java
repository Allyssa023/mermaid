package com.mermaid.app.mapper;

import com.mermaid.app.domain.StorefrontListing;
import com.mermaid.app.model.StorefrontListingResponse;
import com.mermaid.app.model.StorefrontListingSummary;
import com.mermaid.app.repository.FishSpeciesRepository;
import com.mermaid.app.repository.StorefrontListingLotRepository;
import com.mermaid.app.repository.UserRepository;
import org.openapitools.jackson.nullable.JsonNullable;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.List;
import java.util.stream.Collectors;

@Component
public class StorefrontListingMapper {

    private final FishSpeciesRepository speciesRepo;
    private final UserRepository userRepo;
    private final StorefrontListingLotRepository listingLotRepo;

    public StorefrontListingMapper(FishSpeciesRepository speciesRepo,
                                   UserRepository userRepo,
                                   StorefrontListingLotRepository listingLotRepo) {
        this.speciesRepo = speciesRepo;
        this.userRepo = userRepo;
        this.listingLotRepo = listingLotRepo;
    }

    public StorefrontListingResponse toDto(StorefrontListing entity, BigDecimal availableKg) {
        List<Long> lotIds = listingLotRepo.findByIdListingId(entity.getId())
                .stream().map(ll -> ll.getLotId()).collect(Collectors.toList());

        StorefrontListingResponse dto = new StorefrontListingResponse(
                entity.getId(),
                entity.getVendorId(),
                entity.getSpeciesId(),
                entity.getTitle(),
                toDouble(entity.getPricePerKg()),
                toDouble(entity.getMinQtyKg()),
                StorefrontListingResponse.StatusEnum.fromValue(entity.getStatus().name()),
                entity.getCreatedAt(),
                entity.getUpdatedAt(),
                lotIds
        );
        String speciesName = speciesRepo.findById(entity.getSpeciesId())
                .map(s -> s.getCommonName()).orElse(null);
        dto.setSpeciesName(JsonNullable.of(speciesName));
        dto.setDescription(JsonNullable.of(entity.getDescription()));
        dto.setPhotoUrl(JsonNullable.of(entity.getPhotoUrl()));
        dto.setPhotoEyes(JsonNullable.of(entity.getPhotoEyes()));
        dto.setPhotoGills(JsonNullable.of(entity.getPhotoGills()));
        dto.setPhotoScales(JsonNullable.of(entity.getPhotoScales()));
        dto.setPhotoBelly(JsonNullable.of(entity.getPhotoBelly()));
        dto.setPhotoFlesh(JsonNullable.of(entity.getPhotoFlesh()));
        dto.setAvailableKg(availableKg != null ? availableKg.doubleValue() : 0.0);
        dto.setDeliveryFee(toDouble(entity.getDeliveryFee()));
        dto.setViewCount(entity.getViewCount());
        return dto;
    }

    public StorefrontListingSummary toBuyerSummary(StorefrontListing entity, BigDecimal availableKg, String vendorName) {
        StorefrontListingSummary dto = new StorefrontListingSummary(
                entity.getId(),
                entity.getVendorId(),
                entity.getSpeciesId(),
                entity.getTitle(),
                toDouble(entity.getPricePerKg()),
                availableKg != null ? availableKg.doubleValue() : 0.0,
                StorefrontListingSummary.StatusEnum.fromValue(entity.getStatus().name()),
                entity.getCreatedAt()
        );
        String speciesName = speciesRepo.findById(entity.getSpeciesId())
                .map(s -> s.getCommonName()).orElse(null);
        dto.setVendorName(JsonNullable.of(vendorName));
        dto.setSpeciesName(JsonNullable.of(speciesName));
        dto.setDescription(JsonNullable.of(entity.getDescription()));
        dto.setPhotoUrl(JsonNullable.of(entity.getPhotoUrl()));
        dto.setPhotoEyes(JsonNullable.of(entity.getPhotoEyes()));
        dto.setPhotoGills(JsonNullable.of(entity.getPhotoGills()));
        dto.setPhotoScales(JsonNullable.of(entity.getPhotoScales()));
        dto.setPhotoBelly(JsonNullable.of(entity.getPhotoBelly()));
        dto.setPhotoFlesh(JsonNullable.of(entity.getPhotoFlesh()));
        dto.setMinQtyKg(toDouble(entity.getMinQtyKg()));
        dto.setDeliveryFee(toDouble(entity.getDeliveryFee()));
        return dto;
    }

    private static Double toDouble(BigDecimal value) {
        return value == null ? null : value.doubleValue();
    }
}
