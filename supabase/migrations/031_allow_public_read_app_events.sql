-- 031_allow_public_read_app_events.sql
-- Habilitar leitura pública para as tabelas existentes (app_events e app_event_types) para visitantes anônimos (anon)

GRANT SELECT ON public.app_events TO anon, authenticated, service_role;
GRANT SELECT ON public.app_event_types TO anon, authenticated, service_role;

-- Habilitar RLS e criar políticas de SELECT público
ALTER TABLE public.app_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_event_types ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public select app_events" ON public.app_events;
CREATE POLICY "Allow public select app_events" ON public.app_events
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public select app_event_types" ON public.app_event_types;
CREATE POLICY "Allow public select app_event_types" ON public.app_event_types
  FOR SELECT USING (true);
