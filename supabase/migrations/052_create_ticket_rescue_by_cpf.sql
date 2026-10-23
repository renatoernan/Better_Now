-- 052_create_ticket_rescue_by_cpf.sql
-- Função segura para resgate de ingressos e QR Codes de check-in por CPF do comprador.
--
-- Permite que compradores que perderam o QR Code acessem o link compartilhado no
-- grupo de WhatsApp do evento e consultem todos os ingressos comprados por eles,
-- sem necessidade de autenticação e com isolamento total dos dados.

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.rescue_event_tickets_by_cpf(
  p_event_id UUID,
  p_cpf TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
#variable_conflict use_column
DECLARE
  v_clean_cpf TEXT;
  v_event RECORD;
  v_buyer RECORD;
  v_tickets JSONB;
  v_total INTEGER;
BEGIN
  -- 1. Valida e limpa o CPF
  v_clean_cpf := regexp_replace(COALESCE(p_cpf, ''), '\D', '', 'g');
  IF length(v_clean_cpf) <> 11 THEN
    RETURN jsonb_build_object(
      'ok', FALSE,
      'error', 'CPF inválido. Informe os 11 dígitos do CPF.'
    );
  END IF;

  -- 2. Busca informações públicas do evento
  SELECT id, title, event_date, start_time, end_time, location, observations
  INTO v_event
  FROM public.app_events
  WHERE id = p_event_id;

  IF v_event.id IS NULL THEN
    RETURN jsonb_build_object(
      'ok', FALSE,
      'error', 'Evento não encontrado.'
    );
  END IF;

  -- 3. Localiza os dados do comprador correspondente nas ordens pagas ou cortesias do evento
  SELECT 
    o.client_name,
    COALESCE(p.whatsapp, p.telefone, o.client_phone) AS client_phone,
    COALESCE(p.email, o.client_email) AS client_email,
    o.client_document
  INTO v_buyer
  FROM public.app_event_orders o
  LEFT JOIN public.app_people p ON p.id = o.client_id
  WHERE o.event_id = p_event_id
    AND (o.status IN ('paid', 'approved', 'free', 'cortesia', 'completed') OR o.payment_method = 'cortesia')
    AND (
      regexp_replace(COALESCE(o.client_document, ''), '\D', '', 'g') = v_clean_cpf
      OR (p.id IS NOT NULL AND regexp_replace(COALESCE(p.documento, ''), '\D', '', 'g') = v_clean_cpf)
    )
  ORDER BY o.created_at DESC
  LIMIT 1;

  -- Fallback: verifica se o CPF está vinculado em app_people nos tickets ou como participante nominal
  IF v_buyer.client_name IS NULL THEN
    SELECT 
      COALESCE(p.nome, o.client_name) AS client_name,
      COALESCE(p.whatsapp, p.telefone, o.client_phone) AS client_phone,
      COALESCE(p.email, o.client_email) AS client_email,
      v_clean_cpf AS client_document
    INTO v_buyer
    FROM public.app_event_tickets t
    JOIN public.app_event_orders o ON o.id = t.order_id
    LEFT JOIN public.app_people p ON p.id = t.client_id
    WHERE t.event_id = p_event_id
      AND (o.status IN ('paid', 'approved', 'free', 'cortesia', 'completed') OR o.payment_method = 'cortesia')
      AND t.status NOT IN ('canceled', 'cancelled')
      AND (
        (p.id IS NOT NULL AND regexp_replace(COALESCE(p.documento, ''), '\D', '', 'g') = v_clean_cpf)
        OR (o.cancellation_reason LIKE '%' || v_clean_cpf || '%')
      )
    ORDER BY t.created_at DESC
    LIMIT 1;
  END IF;

  -- Se nenhum comprador/participante foi encontrado com o CPF informado
  IF v_buyer.client_name IS NULL THEN
    RETURN jsonb_build_object(
      'ok', TRUE,
      'found', FALSE,
      'message', 'Nenhum ingresso pago ou cortesia foi encontrado para este CPF neste evento.'
    );
  END IF;

  -- 4. Busca todos os ingressos pertencentes às compras desse CPF para o evento
  WITH matched_orders AS (
    SELECT o.id, o.batch_name, o.client_name, o.client_document, o.cancellation_reason, o.created_at
    FROM public.app_event_orders o
    LEFT JOIN public.app_people p ON p.id = o.client_id
    WHERE o.event_id = p_event_id
      AND (o.status IN ('paid', 'approved', 'free', 'cortesia', 'completed') OR o.payment_method = 'cortesia')
      AND (
        regexp_replace(COALESCE(o.client_document, ''), '\D', '', 'g') = v_clean_cpf
        OR (p.id IS NOT NULL AND regexp_replace(COALESCE(p.documento, ''), '\D', '', 'g') = v_clean_cpf)
        OR (o.cancellation_reason LIKE '%' || v_clean_cpf || '%')
      )
  ),
  ticket_rows AS (
    SELECT 
      t.id,
      t.order_id,
      t.ticket_number,
      t.qr_code_hash,
      t.status,
      t.used_at,
      t.created_at,
      mo.batch_name,
      COALESCE(tp.nome, mo.client_name) AS holder_name,
      COALESCE(tp.documento, mo.client_document) AS holder_document,
      tp.whatsapp AS holder_whatsapp,
      mo.cancellation_reason
    FROM public.app_event_tickets t
    JOIN matched_orders mo ON mo.id = t.order_id
    LEFT JOIN public.app_people tp ON tp.id = t.client_id
    WHERE t.event_id = p_event_id
      AND t.status NOT IN ('canceled', 'cancelled')
    ORDER BY t.ticket_number ASC, t.created_at ASC
  )
  SELECT 
    COUNT(*),
    jsonb_agg(
      jsonb_build_object(
        'id', tr.id,
        'order_id', tr.order_id,
        'ticket_number', tr.ticket_number,
        'qr_code_hash', tr.qr_code_hash,
        'status', tr.status,
        'used_at', tr.used_at,
        'created_at', tr.created_at,
        'batch_name', tr.batch_name,
        'holder_name', tr.holder_name,
        'holder_document', tr.holder_document,
        'holder_whatsapp', tr.holder_whatsapp,
        'attendees_json', tr.cancellation_reason
      )
    )
  INTO v_total, v_tickets
  FROM ticket_rows tr;

  IF v_total IS NULL OR v_total = 0 THEN
    RETURN jsonb_build_object(
      'ok', TRUE,
      'found', FALSE,
      'message', 'Nenhum ingresso ativo encontrado para este CPF.'
    );
  END IF;

  RETURN jsonb_build_object(
    'ok', TRUE,
    'found', TRUE,
    'event', jsonb_build_object(
      'id', v_event.id,
      'title', v_event.title,
      'event_date', v_event.event_date,
      'start_time', v_event.start_time,
      'end_time', v_event.end_time,
      'location', v_event.location
    ),
    'buyer', jsonb_build_object(
      'name', v_buyer.client_name,
      'phone', v_buyer.client_phone,
      'email', v_buyer.client_email,
      'document', v_buyer.client_document
    ),
    'total_tickets', v_total,
    'tickets', COALESCE(v_tickets, '[]'::jsonb)
  );
END;
$$;

-- Permite chamada pública por anon, autenticado e service_role
REVOKE ALL ON FUNCTION public.rescue_event_tickets_by_cpf(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rescue_event_tickets_by_cpf(UUID, TEXT) TO anon, authenticated, service_role;
