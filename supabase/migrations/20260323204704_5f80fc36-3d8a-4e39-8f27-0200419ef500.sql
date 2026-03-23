
-- Drop the OLD overload (20 params, no ipe_cycle_id, no cycle_state, no user_text)
DROP FUNCTION IF EXISTS public.lucid_persist_cycle(
  uuid, integer, varchar, jsonb, varchar, varchar, varchar, varchar,
  jsonb, jsonb, varchar, varchar, varchar, varchar, varchar, varchar,
  numeric, varchar, jsonb, varchar, text
);

-- Drop the MIDDLE overload (has ipe_cycle_id/ipe_cycle_number but no cycle_state/user_text)
DROP FUNCTION IF EXISTS public.lucid_persist_cycle(
  uuid, integer, varchar, jsonb, varchar, varchar, varchar, varchar,
  jsonb, jsonb, varchar, varchar, varchar, varchar, varchar, varchar,
  numeric, varchar, jsonb, varchar, text, uuid, integer
);
