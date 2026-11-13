-- Reconcile already-retained candidates after expanding explicit non-US city hints.
-- A location that also says U.S. was already marked us_indicated and is untouched.
update public.board_discovery_candidates
set location_hint='non_us_indicated'
where location_hint='unknown'
  and location ~* '\m(Gurugram|Gurgaon|Hyderabad|Pune|Mumbai|New Delhi|Noida|Chennai|Kolkata)\M';
