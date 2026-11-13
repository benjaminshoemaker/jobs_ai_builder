-- Keep explicit Mexico, Brazil and Argentina locations out of the U.S.-or-unknown review lane.
-- Preserve New Mexico and any location that also explicitly offers U.S. eligibility.
update public.board_discovery_candidates
set location_hint='non_us_indicated'
where location_hint='unknown'
  and location ~* '\m(Mexico|Brazil|Argentina)\M'
  and location !~* '\mNew Mexico\M'
  and location !~* '\m(United States|USA|US|U\.S\.)\M';
