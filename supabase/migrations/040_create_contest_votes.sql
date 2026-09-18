-- 040_create_contest_votes.sql
-- Registro de votos dos concursos.
--
-- Diferente de todas as outras tabelas do projeto, esta NÃO aceita escrita de
-- anon nem de authenticated: o voto entra exclusivamente pela Edge Function
-- register-contest-vote, que roda com service_role e valida janela, check-in,
-- pertencimento e duplicidade. Um resultado que as pessoas vão disputar não
-- pode depender de o cliente se comportar bem.

DO $$
BEGIN
  IF to_regclass('public.app_contest_entries') IS NULL THEN
    RAISE EXCEPTION 'app_contest_entries não existe. Aplique a migration 039 antes desta.';
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.app_contest_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contest_id UUID NOT NULL REFERENCES public.app_event_contests(id) ON DELETE CASCADE,
  entry_id UUID NOT NULL REFERENCES public.app_contest_entries(id) ON DELETE CASCADE,
  ticket_id UUID NOT NULL REFERENCES public.app_event_tickets(id) ON DELETE CASCADE,

  voting_mode TEXT NOT NULL DEFAULT 'kiosk' CHECK (voting_mode IN ('kiosk', 'magic_link')),
  collected_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  ip_address TEXT,
  user_agent TEXT,

  -- Anulação administrativa preserva a trilha em vez de apagar a linha
  voided_at TIMESTAMPTZ,
  voided_reason TEXT,
  voided_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Idempotência: o tablet reenvia da fila local após queda de rede, e a mesma
  -- tentativa não pode virar dois votos.
  client_vote_id TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Um ingresso, um voto por concurso. A trava real fica aqui, não na interface.
  CONSTRAINT uniq_contest_ticket UNIQUE (contest_id, ticket_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS uniq_contest_client_vote
  ON public.app_contest_votes (contest_id, client_vote_id)
  WHERE client_vote_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_votes_entry
  ON public.app_contest_votes (entry_id) WHERE voided_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_votes_contest
  ON public.app_contest_votes (contest_id, created_at);

-- RLS: leitura só para admin; escrita para ninguém além do service_role,
-- que ignora RLS por definição. Sem política de INSERT, nem anon nem
-- authenticated conseguem gravar voto por conta própria.
ALTER TABLE public.app_contest_votes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "votes_admin_read" ON public.app_contest_votes;
CREATE POLICY "votes_admin_read" ON public.app_contest_votes
  FOR SELECT TO authenticated USING (public.is_mural_admin());

DROP POLICY IF EXISTS "votes_admin_void" ON public.app_contest_votes;
CREATE POLICY "votes_admin_void" ON public.app_contest_votes
  FOR UPDATE TO authenticated
  USING (public.is_mural_admin()) WITH CHECK (public.is_mural_admin());

REVOKE ALL ON public.app_contest_votes FROM anon;
GRANT SELECT, UPDATE ON public.app_contest_votes TO authenticated;
GRANT ALL PRIVILEGES ON public.app_contest_votes TO service_role;

-- Apuração. security_invoker faz o RLS da tabela de votos valer também aqui,
-- senão a view vazaria a contagem para qualquer um.
CREATE OR REPLACE VIEW public.app_contest_results
WITH (security_invoker = true) AS
SELECT
  e.contest_id,
  e.id AS entry_id,
  e.participant_name,
  e.participant_person_id,
  e.photo_id,
  e.status AS entry_status,
  COUNT(v.id) FILTER (WHERE v.voided_at IS NULL) AS vote_count,
  MIN(v.created_at) FILTER (WHERE v.voided_at IS NULL) AS first_vote_at
FROM public.app_contest_entries e
LEFT JOIN public.app_contest_votes v ON v.entry_id = e.id
GROUP BY e.contest_id, e.id, e.participant_name, e.participant_person_id, e.photo_id, e.status;

GRANT SELECT ON public.app_contest_results TO authenticated, service_role;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.app_contest_votes;
EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_object THEN NULL;
END $$;

COMMENT ON TABLE public.app_contest_votes IS
  'Votos dos concursos. Gravação exclusiva via Edge Function register-contest-vote (service_role).';
COMMENT ON COLUMN public.app_contest_votes.client_vote_id IS
  'Id gerado no tablet; torna idempotente o reenvio da fila local após queda de rede.';
COMMENT ON COLUMN public.app_contest_votes.voided_at IS
  'Anulação administrativa. A linha permanece para auditoria e sai da contagem.';
