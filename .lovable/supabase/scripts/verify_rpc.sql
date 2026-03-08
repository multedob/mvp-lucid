-- verify_rpc.sql
-- Executar no Supabase SQL Editor após cada migration que altere lucid_persist_cycle.
-- Resultado esperado: 1 linha com num_parametros = 22

SELECT
  oid::regprocedure AS assinatura,
  pronargs          AS num_parametros
FROM pg_proc
WHERE proname = 'lucid_persist_cycle'
  AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
ORDER BY pronargs;
