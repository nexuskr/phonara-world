
ALTER TABLE viral_mission_submissions
  ADD CONSTRAINT viral_mission_submissions_chain_catalog_uniq
  UNIQUE (chain_id, catalog_key);
