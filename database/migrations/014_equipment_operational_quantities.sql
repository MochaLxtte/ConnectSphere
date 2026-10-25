-- KAN-9 / CF-16: read operational stock without inventing full KAN-18 stock maintenance.
-- Existing equipment and reservation history is preserved; old rows start with no losses recorded.
ALTER TABLE equipment_types
  ADD COLUMN damaged_quantity integer NOT NULL DEFAULT 0,
  ADD COLUMN maintenance_quantity integer NOT NULL DEFAULT 0,
  ADD CONSTRAINT equipment_damaged_quantity_nonnegative CHECK (damaged_quantity >= 0),
  ADD CONSTRAINT equipment_maintenance_quantity_nonnegative CHECK (maintenance_quantity >= 0),
  ADD CONSTRAINT equipment_operational_quantities_within_total
    CHECK (damaged_quantity::bigint + maintenance_quantity::bigint <= total_quantity::bigint);

-- KAN-26 must recheck operational capacity under the equipment-pool lock before reserving.
-- The historical reservation trigger is intentionally unchanged by this read-only story.
