-- 029_create_views_for_backwards_compatibility.sql
-- Criar Views alias app_events, app_clients e app_event_types apontando para as tabelas principais events, clients e event_types

CREATE OR REPLACE VIEW public.app_events AS 
SELECT * FROM public.events;

CREATE OR REPLACE VIEW public.app_clients AS 
SELECT * FROM public.clients;

CREATE OR REPLACE VIEW public.app_event_types AS 
SELECT * FROM public.event_types;

-- Conceder permissões de acesso
GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_events TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_clients TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_event_types TO anon, authenticated, service_role;
