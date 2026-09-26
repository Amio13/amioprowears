-- 0009_collections.sql — new collections (data only, no schema change).
-- Top clubs and National teams are ticked per jersey. Females, Kids and Vintage are now
-- automatic from gender/era (lib/catalogue.ts → productCollections), so their old ticks
-- are removed. Safe to run more than once. Run it right AFTER the push that adds these
-- collections (see the homepage note at the bottom).

-- Old ticks for the automatic collections.
update public.products
set collections = array_remove(array_remove(collections, 'female-kits'), 'vintage')
where collections && array['female-kits', 'vintage'];

-- Existing jerseys: the big clubs → Top clubs, Nigeria → National teams.
update public.products
set collections = array_append(collections, 'top-clubs')
where club in ('Arsenal', 'Real Madrid', 'Liverpool', 'Manchester United')
  and not ('top-clubs' = any(collections));

update public.products
set collections = array_append(collections, 'national-teams')
where club = 'Nigeria'
  and not ('national-teams' = any(collections));

-- Homepage rows → the owner's new sections (still editable in admin → Homepage).
-- Run AFTER the code that knows these collections is live: older code resets the whole
-- homepage config to defaults when it sees a collection it doesn't know.
update public.settings
set homepage = jsonb_set(homepage, '{rows}', '["top-clubs", "national-teams", "female-kits", "kids", "vintage"]'::jsonb)
where id = 1;
