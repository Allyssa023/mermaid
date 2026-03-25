package com.mermaid.app.mapper;

import com.mermaid.app.domain.DemandListing;
import org.openapitools.jackson.nullable.JsonNullable;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;

@Component
public class DemandListingMapper {

    private final FishSpeciesMapper fishSpeciesMapper;
    private final MarketLocationMapper marketLocationMapper;

    public DemandListingMapper(FishSpeciesMapper fishSpeciesMapper,
                                MarketLocationMapper marketLocationMapper) {
        this.fishSpeciesMapper = fishSpeciesMapper;
        this.marketLocationMapper = marketLocationMapper;
    }

    public com.mermaid.app.model.DemandListing toModel(DemandListing entity, String vendorName) {
        com.mermaid.app.model.DemandListing m = new com.mermaid.app.model.DemandListing(
            entity.getId(),
            entity.getVendorId(),
            fishSpeciesMapper.toModel(entity.getSpecies()),
            marketLocationMapper.toModel(entity.getLocation()),
            toDouble(entity.getQuantityKg()),
            toDouble(entity.getOfferPricePerKg()),
            entity.getStatus(),
            entity.getPostedAt()
        );
        m.setVendorName(JsonNullable.of(vendorName));
        m.setNotes(JsonNullable.of(entity.getNotes()));
        m.setNeededBy(JsonNullable.of(entity.getNeededBy()));
        m.setUpdatedAt(JsonNullable.of(entity.getUpdatedAt()));
        return m;
    }

    public com.mermaid.app.model.OfferLookupItem toOfferLookupItem(DemandListing entity, String vendorName) {
        com.mermaid.app.model.OfferLookupItem item = new com.mermaid.app.model.OfferLookupItem(
            entity.getId(),
            entity.getVendorId(),
            vendorName,
            marketLocationMapper.toModel(entity.getLocation()),
            toDouble(entity.getOfferPricePerKg()),
            toDouble(entity.getQuantityKg())
        );
        item.setFishSpecies(fishSpeciesMapper.toModel(entity.getSpecies()));
        item.setNeededBy(JsonNullable.of(entity.getNeededBy()));
        return item;
    }

    private static Double toDouble(BigDecimal value) {
        return value == null ? null : value.doubleValue();
    }
}
