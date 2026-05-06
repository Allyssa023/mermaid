ALTER TABLE notifications ADD COLUMN IF NOT EXISTS payload_json TEXT;

CREATE TABLE inventory_lots (
    id                          BIGSERIAL    PRIMARY KEY,
    vendor_id                   BIGINT       NOT NULL REFERENCES users(id),
    species_id                  BIGINT       NOT NULL REFERENCES fish_species(id),
    source_procurement_order_id BIGINT       REFERENCES orders(id),
    received_at                 TIMESTAMPTZ  NOT NULL DEFAULT now(),
    initial_kg                  NUMERIC(10,2) NOT NULL CHECK (initial_kg >= 0),
    remaining_kg                NUMERIC(10,2) NOT NULL CHECK (remaining_kg >= 0),
    cost_per_kg                 NUMERIC(10,2),
    freshness_graded_at         TIMESTAMPTZ,
    created_at                  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX idx_inventory_lots_vendor_species ON inventory_lots (vendor_id, species_id);
CREATE INDEX idx_inventory_lots_fifo ON inventory_lots (vendor_id, species_id, received_at) WHERE remaining_kg > 0;

CREATE TABLE inventory_movements (
    id            BIGSERIAL    PRIMARY KEY,
    lot_id        BIGINT       NOT NULL REFERENCES inventory_lots(id),
    delta_kg      NUMERIC(10,2) NOT NULL,
    reason        VARCHAR(32)  NOT NULL
        CONSTRAINT chk_movement_reason CHECK (reason IN ('PROCUREMENT_RECEIVED','SALE_COMPLETED','ADJUSTMENT_LOSS','ADJUSTMENT_CORRECTION')),
    ref_order_id  BIGINT       REFERENCES orders(id),
    note          TEXT,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX idx_inventory_movements_lot ON inventory_movements (lot_id, created_at);
