-- ============================================================
-- third_party_invites — internal_nickname + sent_at
-- Fonte: bug UX descoberto no smoke 06/jun — user reusava o
-- mesmo link pra múltiplas pessoas e perdia rastreabilidade
-- de quem respondeu o quê.
--
-- internal_nickname: apelido do amigo definido pelo user no
--   momento da criação do invite. NUNCA exposto pro terceiro.
--   Obrigatório em invites novos (validado no backend).
--   NULLABLE pra compatibilidade com invites legados.
--
-- sent_at: timestamp de quando user marcou o invite como
--   enviado. NULL = aguardando envio (ainda não compartilhou).
--   Separado de submitted_at — copiar/enviar ≠ responder.
-- ============================================================

ALTER TABLE third_party_invites
  ADD COLUMN IF NOT EXISTS internal_nickname TEXT,
  ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ;

-- Constraint: nickname não pode ser vazio se informado, max 40 chars.
-- Idempotente — não falha se já existe.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tpi_nickname_length'
  ) THEN
    ALTER TABLE third_party_invites
      ADD CONSTRAINT tpi_nickname_length
      CHECK (
        internal_nickname IS NULL
        OR length(trim(internal_nickname)) BETWEEN 1 AND 40
      );
  END IF;
END $$;

-- Index pra busca por nickname dentro de um ciclo
CREATE INDEX IF NOT EXISTS idx_tpi_nickname
  ON third_party_invites(ipe_cycle_id, internal_nickname)
  WHERE internal_nickname IS NOT NULL;

-- Documentação inline
COMMENT ON COLUMN third_party_invites.internal_nickname IS
  'Apelido interno do amigo definido pelo user dono do invite. Nunca exposto pro terceiro. NULL em invites legados pré-fix UX 06/jun.';

COMMENT ON COLUMN third_party_invites.sent_at IS
  'Timestamp de quando user marcou o invite como enviado pro amigo. NULL = aguardando envio. Separado de submitted_at.';
