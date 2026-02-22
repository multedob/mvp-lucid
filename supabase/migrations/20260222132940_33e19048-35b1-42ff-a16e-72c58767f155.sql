
-- RLS policies with DROP IF EXISTS to avoid conflicts

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users_select_own" ON users;
CREATE POLICY "users_select_own" ON users FOR SELECT USING (id = auth.uid());
DROP POLICY IF EXISTS "users_insert_own" ON users;
CREATE POLICY "users_insert_own" ON users FOR INSERT WITH CHECK (id = auth.uid());

ALTER TABLE cycles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "cycles_select_own" ON cycles;
CREATE POLICY "cycles_select_own" ON cycles FOR SELECT USING (user_id = auth.uid());

ALTER TABLE structural_snapshots ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "snapshots_select_own" ON structural_snapshots;
CREATE POLICY "snapshots_select_own" ON structural_snapshots FOR SELECT
  USING (cycle_id IN (SELECT id FROM cycles WHERE user_id = auth.uid()));

ALTER TABLE node_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "node_history_select_own" ON node_history;
CREATE POLICY "node_history_select_own" ON node_history FOR SELECT
  USING (cycle_id IN (SELECT id FROM cycles WHERE user_id = auth.uid()));

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "audit_log_select_own" ON audit_log;
CREATE POLICY "audit_log_select_own" ON audit_log FOR SELECT
  USING (cycle_id IN (SELECT id FROM cycles WHERE user_id = auth.uid()));

ALTER TABLE structural_model_registry ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "registry_select_all" ON structural_model_registry;
CREATE POLICY "registry_select_all" ON structural_model_registry FOR SELECT USING (true);

ALTER TABLE rag_corpus ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "rag_corpus_select_all" ON rag_corpus;
CREATE POLICY "rag_corpus_select_all" ON rag_corpus FOR SELECT USING (true);
