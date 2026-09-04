insert into app_settings (key, value)
values
  ('trial_days', '30'),
  ('trial_cnr_fetches', '10')
on conflict (key) do nothing;
