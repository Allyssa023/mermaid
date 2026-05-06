package com.mermaid.app.domain;

import jakarta.persistence.*;
import java.io.Serializable;
import java.util.Objects;

@Entity
@Table(name = "storefront_listing_lots")
public class StorefrontListingLot {

    @Embeddable
    public static class Id implements Serializable {
        @Column(name = "listing_id")
        private Long listingId;

        @Column(name = "lot_id")
        private Long lotId;

        public Id() {}

        public Id(Long listingId, Long lotId) {
            this.listingId = listingId;
            this.lotId = lotId;
        }

        public Long getListingId() { return listingId; }
        public Long getLotId() { return lotId; }

        @Override
        public boolean equals(Object o) {
            if (this == o) return true;
            if (!(o instanceof Id)) return false;
            Id that = (Id) o;
            return Objects.equals(listingId, that.listingId) && Objects.equals(lotId, that.lotId);
        }

        @Override
        public int hashCode() { return Objects.hash(listingId, lotId); }
    }

    @EmbeddedId
    private Id id;

    public StorefrontListingLot() {}

    public StorefrontListingLot(Long listingId, Long lotId) {
        this.id = new Id(listingId, lotId);
    }

    public Id getId() { return id; }
    public void setId(Id id) { this.id = id; }

    public Long getListingId() { return id != null ? id.getListingId() : null; }
    public Long getLotId() { return id != null ? id.getLotId() : null; }
}
