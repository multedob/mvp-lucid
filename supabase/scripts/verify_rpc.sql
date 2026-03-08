-- verify_rpc.sql — Verifica assinatura canônica do lucid_persist_cycle
-- Resultado esperado: 1 linha, num_parametros = 23
-- Atualizado em PC-2 (user_text adicionado como 23º parâmetro)

SELECT
  p.proname                         AS nome_funcao,
  pronargs                          AS num_parametros,
  array_agg(unnest.name ORDER BY ordinality) AS parametros
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
CROSS JOIN LATERAL unnest(proargnames) WITH ORDINALITY AS unnest(name, ordinality)
WHERE n.nspname = 'public'
  AND p.proname = 'lucid_persist_cycle'
GROUP BY p.proname, pronargs
ORDER BY pronargs DESC
LIMIT 1;
