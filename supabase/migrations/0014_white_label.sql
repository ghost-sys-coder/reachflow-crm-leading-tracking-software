ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS white_label_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS brand_primary_color  text,
  ADD COLUMN IF NOT EXISTS brand_accent_color   text;
