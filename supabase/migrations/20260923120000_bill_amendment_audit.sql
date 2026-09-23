-- Bill amendments are recorded in the existing audit_log table, which has held
-- before_state/after_state since the first migration but never had anything
-- written to it. No new table is needed; these indexes are what the new reads
-- require.

-- The Bills list asks "which of these bills were amended?" for the fifty rows on
-- screen, and the bill's own history asks for one bill's entries. Without this
-- both are a sequential scan of the whole trail.
create index if not exists audit_log_entity_idx
  on public.audit_log (entity_type, entity_id, created_at desc);

-- HQ reviews amendments one branch at a time.
create index if not exists audit_log_outlet_idx
  on public.audit_log (outlet_id, created_at desc);
