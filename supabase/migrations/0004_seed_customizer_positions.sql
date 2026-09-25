-- 0004_seed_customizer_positions.sql — adjust the sample products' print overlays.
-- In 0003 the left_chest badge box sat on top of the crest printed on the
-- placeholder shirts, the sleeve box hung off the edge of the sleeve, and a full
-- 12-letter name was wider than the shirt body. Data only; safe to re-run.
-- Positions are % of the photo (left = centre, top = top edge) and can be
-- fine-tuned per product in the admin (Phase 6).

update public.products
set customizer = jsonb_set(
      jsonb_set(
        customizer,
        '{badges}',
        '{"left_chest":  {"top": 12, "left": 64,   "width": 10},
          "right_chest": {"top": 22, "left": 36,   "width": 12},
          "sleeve":      {"top": 21, "left": 16.5, "width": 9}}'::jsonb
      ),
      '{name,width}',
      '46'::jsonb
    ),
    updated_at = now()
where slug in (
  'super-eagles-home-2025-26',
  'super-eagles-away-2025-26-womens',
  'arsenal-home-2025-26-player',
  'real-madrid-home-2025-26',
  'man-utd-home-2025-26-kids',
  'nigeria-1994-retro-home'
);
