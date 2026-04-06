
-- Reset all data for user olivia.kalicinski@gmail.com
-- User ID: 4f0ce0eb-8c8b-4ad9-9631-97aca6cabd8e

DO $$
DECLARE
  uid UUID := '4f0ce0eb-8c8b-4ad9-9631-97aca6cabd8e';
BEGIN
  DELETE FROM audit_log WHERE cycle_id IN (SELECT id FROM cycles WHERE user_id = uid);
  DELETE FROM structural_snapshots WHERE cycle_id IN (SELECT id FROM cycles WHERE user_id = uid);
  DELETE FROM node_history WHERE cycle_id IN (SELECT id FROM cycles WHERE user_id = uid);
  DELETE FROM canonical_ils WHERE ipe_cycle_id IN (SELECT id FROM ipe_cycles WHERE user_id = uid);
  DELETE FROM pill_scoring WHERE ipe_cycle_id IN (SELECT id FROM ipe_cycles WHERE user_id = uid);
  DELETE FROM pill_responses WHERE ipe_cycle_id IN (SELECT id FROM ipe_cycles WHERE user_id = uid);
  DELETE FROM block_responses WHERE ipe_cycle_id IN (SELECT id FROM ipe_cycles WHERE user_id = uid);
  DELETE FROM questionnaire_state WHERE ipe_cycle_id IN (SELECT id FROM ipe_cycles WHERE user_id = uid);
  DELETE FROM cycles WHERE user_id = uid;
  DELETE FROM ipe_cycles WHERE user_id = uid;
  UPDATE users SET version = 0 WHERE id = uid;
END $$;
