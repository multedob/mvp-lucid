## Deploy `get-team-message` edge function

A função já existe em `supabase/functions/get-team-message/index.ts` e está pronta. Só precisa ser deployada.

### Passos

1. Deploy via `supabase--deploy_edge_functions` com `["get-team-message"]`.
2. Validar com `supabase--curl_edge_functions`:
   - `POST /get-team-message`
   - body: `{"context_key":"test"}`
   - esperado: `{"message": null}` (tabela `team_messages` vazia)
3. Se erro, checar logs com `supabase--edge_function_logs`.

Nenhum outro arquivo será modificado. Sem migrações, sem mudanças de config.