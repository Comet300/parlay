-- Rebrand: update the DEFAULT value of facets.color_scheme to the new
-- app brand tokens (sky blue + orange). Existing facets on the default
-- theme are backfilled to match; custom themes are untouched.

ALTER TABLE facets
  ALTER COLUMN color_scheme
  SET DEFAULT '{"primary":"#0EA5E9","accent":"#F97316","background":"#FFFFFF","theme":"default"}'::jsonb;

UPDATE facets
SET color_scheme = jsonb_set(
                     jsonb_set(color_scheme, '{primary}', '"#0EA5E9"'),
                     '{accent}', '"#F97316"'
                   )
WHERE color_scheme->>'theme' = 'default';
