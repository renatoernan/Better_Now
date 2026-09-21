-- 043_revote_after_void.sql
-- Anular um voto precisa devolver o direito de voto ao ingresso.
--
-- A trava uniq_contest_ticket cobria também os votos anulados, então o convidado
-- cujo voto a organização anulava ficava impedido de votar de novo — o oposto do
-- que a anulação existe para resolver. A unicidade passa a valer só entre os
-- votos válidos; as linhas anuladas continuam na tabela para auditoria.

ALTER TABLE public.app_contest_votes
  DROP CONSTRAINT IF EXISTS uniq_contest_ticket;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_contest_ticket_active
  ON public.app_contest_votes (contest_id, ticket_id)
  WHERE voided_at IS NULL;

COMMENT ON INDEX public.uniq_contest_ticket_active IS
  'Um voto válido por ingresso em cada concurso. Votos anulados saem da trava para o convidado poder votar de novo.';
