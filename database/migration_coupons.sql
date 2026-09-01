-- =========================================================================
-- MIGRATION: SISTEMA DE CUPONS DE DESCONTO PARA EVENTOS (BETTER NOW)
-- Banco de Dados: Supabase (PostgreSQL)
-- Fuso Horário Padrão: UTC-3 (Horário de Brasília)
-- Tabelas: app_event_coupons, app_event_coupon_usages
-- RPC: app_validate_and_apply_coupon
-- =========================================================================

-- Habilitar extensão UUID caso não esteja ativa
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. TABELA PRINCIPAL DE CUPONS DE EVENTOS
CREATE TABLE IF NOT EXISTS app_event_coupons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES app_events(id) ON DELETE CASCADE,
  code VARCHAR(50) NOT NULL,
  description TEXT,
  discount_type VARCHAR(20) NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value NUMERIC(10,2) NOT NULL CHECK (discount_value > 0),
  max_uses INTEGER NOT NULL CHECK (max_uses > 0),
  current_uses INTEGER NOT NULL DEFAULT 0 CHECK (current_uses >= 0),
  limit_one_per_cpf BOOLEAN NOT NULL DEFAULT TRUE,
  batch_indexes INTEGER[] DEFAULT NULL, -- NULL ou vazio = aplica a todos os lotes
  valid_from TIMESTAMP WITH TIME ZONE NOT NULL,
  valid_until TIMESTAMP WITH TIME ZONE NOT NULL,
  min_order_value NUMERIC(10,2) DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT uq_event_coupon_code UNIQUE (event_id, code)
);

-- 2. TABELA DE REGISTRO DE UTILIZAÇÕES DOS CUPONS
CREATE TABLE IF NOT EXISTS app_event_coupon_usages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  coupon_id UUID NOT NULL REFERENCES app_event_coupons(id) ON DELETE CASCADE,
  order_id UUID REFERENCES app_event_orders(id) ON DELETE SET NULL,
  event_id UUID NOT NULL REFERENCES app_events(id) ON DELETE CASCADE,
  client_name VARCHAR(255),
  client_document VARCHAR(50),
  client_phone VARCHAR(50),
  client_email VARCHAR(255),
  batch_index INTEGER,
  discount_applied NUMERIC(10,2) NOT NULL,
  original_amount NUMERIC(10,2) NOT NULL,
  final_amount NUMERIC(10,2) NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. ADICIONAR CAMPOS DE CUPOM NA TABELA DE ORDENS (SE NÃO EXISTIREM)
ALTER TABLE app_event_orders ADD COLUMN IF NOT EXISTS coupon_id UUID REFERENCES app_event_coupons(id) ON DELETE SET NULL;
ALTER TABLE app_event_orders ADD COLUMN IF NOT EXISTS coupon_code VARCHAR(50);
ALTER TABLE app_event_orders ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(10,2) DEFAULT 0;

-- 4. ÍNDICES PARA ALTA PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_coupons_event_id ON app_event_coupons(event_id);
CREATE INDEX IF NOT EXISTS idx_coupons_code ON app_event_coupons(code);
CREATE INDEX IF NOT EXISTS idx_coupons_active ON app_event_coupons(is_active) WHERE is_active = TRUE AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_coupon_usages_coupon_id ON app_event_coupon_usages(coupon_id);
CREATE INDEX IF NOT EXISTS idx_coupon_usages_event_id ON app_event_coupon_usages(event_id);
CREATE INDEX IF NOT EXISTS idx_coupon_usages_client_doc ON app_event_coupon_usages(coupon_id, client_document);

-- 5. TRIGGER DE ATUALIZAÇÃO DO TIMESTAMP updated_at
CREATE OR REPLACE FUNCTION app_update_coupon_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

DROP TRIGGER IF EXISTS trg_app_event_coupons_updated_at ON app_event_coupons;
CREATE TRIGGER trg_app_event_coupons_updated_at
    BEFORE UPDATE ON app_event_coupons
    FOR EACH ROW
    EXECUTE FUNCTION app_update_coupon_updated_at();

-- 6. FUNÇÃO RPC PARA VALIDAÇÃO E APLICAÇÃO ATÔMICA
CREATE OR REPLACE FUNCTION app_validate_and_apply_coupon(
  p_event_id UUID,
  p_code VARCHAR,
  p_order_id UUID DEFAULT NULL,
  p_batch_index INTEGER DEFAULT 0,
  p_original_amount NUMERIC DEFAULT 0,
  p_client_name VARCHAR DEFAULT NULL,
  p_client_document VARCHAR DEFAULT NULL,
  p_client_phone VARCHAR DEFAULT NULL,
  p_client_email VARCHAR DEFAULT NULL,
  p_record_usage BOOLEAN DEFAULT FALSE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_coupon app_event_coupons%ROWTYPE;
  v_clean_code VARCHAR;
  v_clean_doc VARCHAR;
  v_discount NUMERIC(10,2) := 0;
  v_final_amount NUMERIC(10,2) := 0;
  v_now TIMESTAMP WITH TIME ZONE := NOW();
  v_existing_usage_count INTEGER;
BEGIN
  v_clean_code := UPPER(TRIM(p_code));
  v_clean_doc := REGEXP_REPLACE(COALESCE(p_client_document, ''), '\D', '', 'g');

  -- 1. Buscar cupom com bloqueio de linha para concorrência segura se for registrar uso
  IF p_record_usage THEN
    SELECT * INTO v_coupon
    FROM app_event_coupons
    WHERE event_id = p_event_id
      AND UPPER(code) = v_clean_code
      AND deleted_at IS NULL
    FOR UPDATE;
  ELSE
    SELECT * INTO v_coupon
    FROM app_event_coupons
    WHERE event_id = p_event_id
      AND UPPER(code) = v_clean_code
      AND deleted_at IS NULL;
  END IF;

  -- 2. Verificações de existência e ativação
  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Cupom não encontrado ou inválido para este evento.');
  END IF;

  IF NOT v_coupon.is_active THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Este cupom foi desativado.');
  END IF;

  -- 3. Verificação de vigência
  IF v_now < v_coupon.valid_from THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Este cupom ainda não está ativo.');
  END IF;

  IF v_now > v_coupon.valid_until THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Este cupom expirou.');
  END IF;

  -- 4. Verificação de limite máximo de usos global
  IF v_coupon.current_uses >= v_coupon.max_uses THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Este cupom atingiu o limite máximo de utilizações.');
  END IF;

  -- 5. Verificação de restrição por lote
  IF v_coupon.batch_indexes IS NOT NULL AND ARRAY_LENGTH(v_coupon.batch_indexes, 1) > 0 THEN
    IF NOT (p_batch_index = ANY(v_coupon.batch_indexes)) THEN
      RETURN jsonb_build_object('valid', false, 'error', 'Este cupom não é válido para o lote selecionado.');
    END IF;
  END IF;

  -- 6. Verificação de valor mínimo do pedido
  IF v_coupon.min_order_value > 0 AND p_original_amount < v_coupon.min_order_value THEN
    RETURN jsonb_build_object('valid', false, 'error', 'O valor mínimo do pedido para este cupom é R$ ' || TO_CHAR(v_coupon.min_order_value, 'FM999G990D00'));
  END IF;

  -- 7. Verificação de uso único por CPF/Documento
  IF v_coupon.limit_one_per_cpf AND LENGTH(v_clean_doc) > 0 THEN
    SELECT COUNT(*) INTO v_existing_usage_count
    FROM app_event_coupon_usages
    WHERE coupon_id = v_coupon.id
      AND REGEXP_REPLACE(COALESCE(client_document, ''), '\D', '', 'g') = v_clean_doc;

    IF v_existing_usage_count > 0 THEN
      RETURN jsonb_build_object('valid', false, 'error', 'Você já utilizou este cupom anteriormente.');
    END IF;
  END IF;

  -- 8. Cálculo do desconto (percentual até 100% ou fixo em R$ sem saldo negativo)
  IF v_coupon.discount_type = 'percentage' THEN
    v_discount := ROUND((p_original_amount * (LEAST(v_coupon.discount_value, 100.0) / 100.0)), 2);
  ELSE
    v_discount := LEAST(v_coupon.discount_value, p_original_amount);
  END IF;

  -- Garantir que o desconto não ultrapasse o total original
  IF v_discount > p_original_amount THEN
    v_discount := p_original_amount;
  END IF;

  v_final_amount := GREATEST(0.00, p_original_amount - v_discount);

  -- 9. Registrar utilização se solicitado
  IF p_record_usage THEN
    UPDATE app_event_coupons
    SET current_uses = current_uses + 1,
        updated_at = NOW()
    WHERE id = v_coupon.id;

    INSERT INTO app_event_coupon_usages (
      coupon_id,
      order_id,
      event_id,
      client_name,
      client_document,
      client_phone,
      client_email,
      batch_index,
      discount_applied,
      original_amount,
      final_amount,
      used_at
    ) VALUES (
      v_coupon.id,
      p_order_id,
      p_event_id,
      p_client_name,
      p_client_document,
      p_client_phone,
      p_client_email,
      p_batch_index,
      v_discount,
      p_original_amount,
      v_final_amount,
      NOW()
    );
  END IF;

  RETURN jsonb_build_object(
    'valid', true,
    'coupon_id', v_coupon.id,
    'code', v_coupon.code,
    'discount_type', v_coupon.discount_type,
    'discount_value', v_coupon.discount_value,
    'discount_applied', v_discount,
    'original_amount', p_original_amount,
    'final_amount', v_final_amount,
    'current_uses', v_coupon.current_uses + (CASE WHEN p_record_usage THEN 1 ELSE 0 END),
    'max_uses', v_coupon.max_uses
  );
END;
$$;

-- 7. POLÍTICAS RLS (Row Level Security)
ALTER TABLE app_event_coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_event_coupon_usages ENABLE ROW LEVEL SECURITY;

-- Limpar policies anteriores para evitar duplicidade
DROP POLICY IF EXISTS "Public can read active event coupons" ON app_event_coupons;
DROP POLICY IF EXISTS "Admin full access to event coupons" ON app_event_coupons;
DROP POLICY IF EXISTS "Admin full access to coupon usages" ON app_event_coupon_usages;
DROP POLICY IF EXISTS "Public insert coupon usages" ON app_event_coupon_usages;

-- Políticas para app_event_coupons
CREATE POLICY "Public can read active event coupons"
  ON app_event_coupons
  FOR SELECT
  USING (is_active = true AND deleted_at IS NULL);

CREATE POLICY "Admin full access to event coupons"
  ON app_event_coupons
  FOR ALL
  USING (auth.role() = 'authenticated');

-- Políticas para app_event_coupon_usages
CREATE POLICY "Admin full access to coupon usages"
  ON app_event_coupon_usages
  FOR ALL
  USING (auth.role() = 'authenticated');

CREATE POLICY "Public insert coupon usages"
  ON app_event_coupon_usages
  FOR INSERT
  WITH CHECK (true);
