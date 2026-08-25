-- =========================================================================
-- MIGRATION: LIBERAÇÃO DE RLS PARA CLIENTES/COMPRADORES (app_people)
-- E SINCRONIZAÇÃO RETROATIVA DE COMPRADORES SEM CADASTRO
-- Banco de Dados: Supabase (PostgreSQL)
-- =========================================================================

-- 1. Habilitar RLS e garantir políticas de INSERT/UPDATE para usuários públicos (anon) e autenticados
ALTER TABLE IF EXISTS public.app_people ENABLE ROW LEVEL SECURITY;

-- Remover políticas restritivas antigas se existirem
DROP POLICY IF EXISTS "Allow public read app_people" ON public.app_people;
DROP POLICY IF EXISTS "Allow public insert app_people" ON public.app_people;
DROP POLICY IF EXISTS "Allow public update app_people" ON public.app_people;
DROP POLICY IF EXISTS "Allow authenticated full access to app_people" ON public.app_people;
DROP POLICY IF EXISTS "Allow anon and authenticated all app_people" ON public.app_people;

-- Conceder permissões na tabela para anon e authenticated
GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_people TO anon, authenticated, service_role;

-- Criar políticas RLS para leitura, inserção e atualização
CREATE POLICY "Allow public read app_people"
  ON public.app_people
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow public insert app_people"
  ON public.app_people
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Allow public update app_people"
  ON public.app_people
  FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- 2. SCRIPT DE SINCRONIZAÇÃO RETROATIVA:
-- Insere compradores de app_event_orders que ainda não existiam em app_people e vincula o client_id
DO $$
DECLARE
  rec RECORD;
  v_clean_doc TEXT;
  v_person_id UUID;
BEGIN
  FOR rec IN 
    SELECT DISTINCT 
      id AS order_id, 
      client_name, 
      client_document, 
      client_phone, 
      client_email
    FROM public.app_event_orders
    WHERE client_document IS NOT NULL AND client_document <> ''
  LOOP
    -- Limpar documento mantendo apenas dígitos
    v_clean_doc := regexp_replace(rec.client_document, '\D', '', 'g');
    
    IF length(v_clean_doc) >= 11 THEN
      -- Verificar se já existe pessoa com esse documento
      SELECT id INTO v_person_id
      FROM public.app_people
      WHERE regexp_replace(coalesce(documento, ''), '\D', '', 'g') = v_clean_doc
      LIMIT 1;

      -- Se não existir, cadastrar novo registro em app_people
      IF v_person_id IS NULL THEN
        INSERT INTO public.app_people (
          nome,
          documento,
          whatsapp,
          email,
          ativo,
          created_at,
          updated_at
        ) VALUES (
          trim(rec.client_name),
          v_clean_doc,
          rec.client_phone,
          rec.client_email,
          true,
          NOW(),
          NOW()
        )
        RETURNING id INTO v_person_id;
      END IF;

      -- Atualizar client_id na ordem se estiver null
      IF v_person_id IS NOT NULL THEN
        UPDATE public.app_event_orders
        SET client_id = v_person_id
        WHERE id = rec.order_id AND client_id IS NULL;

        -- Atualizar client_id nos ingressos vinculados se estiverem null
        UPDATE public.app_event_tickets
        SET client_id = v_person_id
        WHERE order_id = rec.order_id AND client_id IS NULL;
      END IF;
    END IF;
  END LOOP;
END $$;
