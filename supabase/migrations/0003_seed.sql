-- 0003_seed.sql — settings row, 3 badges, 6 sample products.
-- Images point at placeholder SVGs in /public/placeholders; replace them from the
-- admin (Phase 6) with real photos in Supabase Storage. Safe to re-run.
-- Prices are customer prices from lib/pricing.ts (net in the comments).

insert into public.settings (id, name_number_fee, store_open, announcement)
values (1, 550, true, 'Delivery to motor parks in all 36 states + FCT')
on conflict (id) do nothing;

insert into public.badges (id, name, image_url, price, position) values
  ('b0000000-0000-4000-8000-000000000001', 'Premier League',   '/placeholders/badge-premier-league.svg',   1050, 'sleeve'),      -- net 1,000
  ('b0000000-0000-4000-8000-000000000002', 'Champions League', '/placeholders/badge-champions-league.svg', 1550, 'sleeve'),      -- net 1,500
  ('b0000000-0000-4000-8000-000000000003', 'AFCON',            '/placeholders/badge-afcon.svg',            1050, 'left_chest')   -- net 1,000
on conflict (id) do nothing;

insert into public.products
  (name, slug, description, club, gender, type, era, season, collections, sizes,
   out_of_stock_sizes, price, sale_price, image_front, image_back, allow_name_number,
   customizer, is_featured, sort_order)
values
  ('Super Eagles Home 2025/26', 'super-eagles-home-2025-26',
   'The Super Eagles home shirt in classic green. Breathable fan fit.',
   'Nigeria', 'male', 'fan', 'current', '2025/26', '{new-arrivals,super-eagles}', '{S,M,L,XL,XXL}',
   '{}', 15350, null,                                                     -- net 15,000
   '/placeholders/nigeria-home-front.svg', '/placeholders/nigeria-home-back.svg', true,
   '{"name":{"top":18,"left":50,"width":60,"fontSize":9},"number":{"top":30,"left":50,"width":40,"fontSize":28},"badges":{"left_chest":{"top":22,"left":64,"width":14},"sleeve":{"top":20,"left":12,"width":10}},"textColor":"#FFFFFF","font":"bebas"}',
   true, 1),

  ('Super Eagles Away 2025/26 Women''s', 'super-eagles-away-2025-26-womens',
   'White away shirt with green trim, cut for a women''s fit.',
   'Nigeria', 'female', 'fan', 'current', '2025/26', '{super-eagles,female-kits}', '{XS,S,M,L,XL}',
   '{XS}', 15350, 13850,                                                  -- net 15,000; sale net 13,500
   '/placeholders/nigeria-away-front.svg', '/placeholders/nigeria-away-back.svg', true,
   '{"name":{"top":18,"left":50,"width":60,"fontSize":9},"number":{"top":30,"left":50,"width":40,"fontSize":28},"badges":{"left_chest":{"top":22,"left":64,"width":14},"sleeve":{"top":20,"left":12,"width":10}},"textColor":"#0B8A4A","font":"bebas"}',
   false, 2),

  ('Arsenal Home 2025/26 Player Version', 'arsenal-home-2025-26-player',
   'Player-version home shirt: slim fit, lightweight fabric.',
   'Arsenal', 'male', 'player', 'current', '2025/26', '{new-arrivals,champions-league}', '{S,M,L,XL,XXL}',
   '{}', 20450, null,                                                     -- net 20,000
   '/placeholders/arsenal-home-front.svg', '/placeholders/arsenal-home-back.svg', true,
   '{"name":{"top":18,"left":50,"width":60,"fontSize":9},"number":{"top":30,"left":50,"width":40,"fontSize":28},"badges":{"left_chest":{"top":22,"left":64,"width":14},"sleeve":{"top":20,"left":12,"width":10}},"textColor":"#FFFFFF","font":"bebas"}',
   true, 3),

  ('Real Madrid Home 2025/26', 'real-madrid-home-2025-26',
   'All-white home shirt with navy trim. Fan fit.',
   'Real Madrid', 'male', 'fan', 'current', '2025/26', '{champions-league}', '{S,M,L,XL,XXL}',
   '{XXL}', 15350, null,                                                  -- net 15,000
   '/placeholders/real-madrid-home-front.svg', '/placeholders/real-madrid-home-back.svg', true,
   '{"name":{"top":18,"left":50,"width":60,"fontSize":9},"number":{"top":30,"left":50,"width":40,"fontSize":28},"badges":{"left_chest":{"top":22,"left":64,"width":14},"sleeve":{"top":20,"left":12,"width":10}},"textColor":"#1D2B5C","font":"oswald"}',
   false, 4),

  ('Manchester United Home 2025/26 Kids', 'man-utd-home-2025-26-kids',
   'Kids'' home shirt in red. Sizes by age.',
   'Manchester United', 'kids', 'fan', 'current', '2025/26', '{new-arrivals}', '{4-5Y,6-7Y,8-9Y,10-11Y,12-13Y}',
   '{}', 12300, null,                                                     -- net 12,000
   '/placeholders/man-utd-kids-front.svg', '/placeholders/man-utd-kids-back.svg', true,
   '{"name":{"top":18,"left":50,"width":60,"fontSize":9},"number":{"top":30,"left":50,"width":40,"fontSize":28},"badges":{"left_chest":{"top":22,"left":64,"width":14},"sleeve":{"top":20,"left":12,"width":10}},"textColor":"#FFFFFF","font":"bebas"}',
   false, 5),

  ('Nigeria 1994 Retro Home', 'nigeria-1994-retro-home',
   'The iconic USA ''94 green-and-white pattern, remade as a retro shirt.',
   'Nigeria', 'male', 'fan', 'vintage', '1994', '{vintage,super-eagles}', '{S,M,L,XL,XXL}',
   '{}', 25500, null,                                                     -- net 25,000
   '/placeholders/nigeria-1994-front.svg', '/placeholders/nigeria-1994-back.svg', true,
   '{"name":{"top":18,"left":50,"width":60,"fontSize":9},"number":{"top":30,"left":50,"width":40,"fontSize":28},"badges":{"left_chest":{"top":22,"left":64,"width":14},"sleeve":{"top":20,"left":12,"width":10}},"textColor":"#FFFFFF","font":"bebas"}',
   true, 6)
on conflict (slug) do nothing;

-- Allowed badges per product.
insert into public.product_badges (product_id, badge_id)
select p.id, b.id::uuid
from (values
  ('super-eagles-home-2025-26',        'b0000000-0000-4000-8000-000000000003'),
  ('super-eagles-away-2025-26-womens', 'b0000000-0000-4000-8000-000000000003'),
  ('arsenal-home-2025-26-player',      'b0000000-0000-4000-8000-000000000001'),
  ('arsenal-home-2025-26-player',      'b0000000-0000-4000-8000-000000000002'),
  ('real-madrid-home-2025-26',         'b0000000-0000-4000-8000-000000000002'),
  ('man-utd-home-2025-26-kids',        'b0000000-0000-4000-8000-000000000001')
) as link(slug, badge_id)
join public.products p on p.slug = link.slug
join public.badges b on b.id = link.badge_id::uuid
on conflict do nothing;
