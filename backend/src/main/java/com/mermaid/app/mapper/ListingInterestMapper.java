package com.mermaid.app.mapper;

import com.mermaid.app.domain.ListingInterest;
import com.mermaid.app.model.ListingInterestDetail;
import com.mermaid.app.model.VendorInterestItem;
import org.openapitools.jackson.nullable.JsonNullable;
import org.springframework.stereotype.Component;

@Component
public class ListingInterestMapper {

    private final DemandListingMapper demandListingMapper;

    public ListingInterestMapper(DemandListingMapper demandListingMapper) {
        this.demandListingMapper = demandListingMapper;
    }

    /** Maps to the flat ListingInterest DTO (used in the 201 response). */
    public com.mermaid.app.model.ListingInterest toModel(ListingInterest entity, String fishermanName) {
        com.mermaid.app.model.ListingInterest m = new com.mermaid.app.model.ListingInterest();
        m.setId(entity.getId());
        m.setListingId(entity.getListing().getId());
        m.setFishermanId(entity.getFishermanId());
        m.setMessage(entity.getMessage());
        m.setCreatedAt(entity.getCreatedAt());
        m.setFishermanName(JsonNullable.of(fishermanName));
        return m;
    }

    /** Maps to ListingInterestDetail (used in GET /my-interests). */
    public ListingInterestDetail toDetailModel(ListingInterest entity, String vendorName) {
        ListingInterestDetail d = new ListingInterestDetail();
        d.setId(entity.getId());
        d.setMessage(entity.getMessage());
        d.setCreatedAt(entity.getCreatedAt());
        d.setListing(demandListingMapper.toModel(entity.getListing(), vendorName));
        return d;
    }

    /** Maps to VendorInterestItem (used in GET /vendor/demand-listings/interests). */
    public VendorInterestItem toVendorItem(ListingInterest entity, String fishermanName) {
        VendorInterestItem v = new VendorInterestItem();
        v.setId(entity.getId());
        v.setListingId(entity.getListing().getId());
        v.setSpeciesName(entity.getListing().getSpecies() != null
            ? entity.getListing().getSpecies().getCommonName() : "Unknown");
        v.setFishermanName(fishermanName);
        v.setMessage(JsonNullable.of(entity.getMessage()));
        v.setCreatedAt(entity.getCreatedAt());
        return v;
    }
}
