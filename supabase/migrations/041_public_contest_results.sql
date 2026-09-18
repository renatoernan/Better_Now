-- 041_public_contest_results.sql
-- Exposição controlada da apuração para o telão.
--
-- A view app_contest_results (migration 040) é security_invoker e continua
-- invisível ao público — é a visão da organização. Esta aqui é a visão do
-- telão: devolve apenas contagens agregadas, e só dos concursos que o admin
-- liberou. Nunca expõe a tabela de votos nem qualquer identificador de votante.

DO $$
BEGIN
  IF to_regclass('public.app_contest_votes') IS NULL THEN
    RAISE EXCEPTION 'app_contest_votes não existe. Aplique a migration 040 antes desta.';
  END IF;
END $$;

-- security_invoker fica FALSE de propósito: a view precisa contar votos que o
-- anon não pode ler diretamente. A proteção é o filtro do WHERE, que só deixa
-- passar concurso com placar ao vivo ligado ou resultado já publicado.
CREATE OR REPLACE VIEW public.app_public_contest_results AS
SELECT
  c.id            AS contest_id,
  c.event_id,
  c.title         AS contest_title,
  c.status        AS contest_status,
  e.id            AS entry_id,
  e.participant_name,
  p.photo_url,
  COUNT(v.id) FILTER (WHERE v.voided_at IS NULL) AS vote_count,
  MIN(v.created_at) FILTER (WHERE v.voided_at IS NULL) AS first_vote_at
FROM public.app_event_contests c
JOIN public.app_contest_entries e ON e.contest_id = c.id AND e.status = 'active'
LEFT JOIN public.app_event_photos p ON p.id = e.photo_id
LEFT JOIN public.app_contest_votes v ON v.entry_id = e.id
WHERE c.deleted_at IS NULL
  AND (
    (c.show_live_results AND c.status = 'voting')  -- placar durante a votação
    OR c.status = 'published'                      -- vencedor revelado pelo admin
  )
GROUP BY c.id, c.event_id, c.title, c.status, e.id, e.participant_name, p.photo_url;

GRANT SELECT ON public.app_public_contest_results TO anon, authenticated, service_role;

-- Lista de candidatos para o telão, sem contagem: serve para exibir a disputa
-- enquanto o resultado está lacrado.
CREATE OR REPLACE VIEW public.app_public_contest_entries
WITH (security_invoker = true) AS
SELECT
  c.id      AS contest_id,
  c.event_id,
  c.title   AS contest_title,
  c.status  AS contest_status,
  c.show_live_results,
  e.id      AS entry_id,
  e.participant_name,
  e.display_order,
  p.photo_url
FROM public.app_event_contests c
JOIN public.app_contest_entries e ON e.contest_id = c.id AND e.status = 'active'
LEFT JOIN public.app_event_photos p ON p.id = e.photo_id
WHERE c.deleted_at IS NULL AND c.status <> 'draft';

GRANT SELECT ON public.app_public_contest_entries TO anon, authenticated, service_role;

COMMENT ON VIEW public.app_public_contest_results IS
  'Apuração para o telão: só agregados, e apenas de concursos com placar ao vivo ou resultado publicado. Não expõe votante.';
COMMENT ON VIEW public.app_public_contest_entries IS
  'Candidatos visíveis ao público, sem contagem de votos.';
