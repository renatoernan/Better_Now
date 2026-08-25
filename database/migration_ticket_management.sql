-- =========================================================================
-- MIGRATION: GESTÃO DE REEMBOLSO E TRANSFERÊNCIA DE INGRESSOS (BETTER NOW)
-- Banco de Dados: Supabase (PostgreSQL)
-- =========================================================================

-- 1. Habilitar extensão UUID caso não esteja ativa
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. NOVAS COLUNAS NA TABELA DE PEDIDOS (app_event_orders)
ALTER TABLE app_event_orders ADD COLUMN IF NOT EXISTS refunded_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE app_event_orders ADD COLUMN IF NOT EXISTS refund_amount NUMERIC(10,2) DEFAULT NULL;
ALTER TABLE app_event_orders ADD COLUMN IF NOT EXISTS refund_reason TEXT DEFAULT NULL;

-- 3. TABELA DE AUDITORIA E LOG DE TRANSFERÊNCIA DE INGRESSOS (app_ticket_transfers)
CREATE TABLE IF NOT EXISTS app_ticket_transfers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id UUID NOT NULL REFERENCES app_event_tickets(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES app_event_orders(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES app_events(id) ON DELETE CASCADE,
  from_person_id UUID REFERENCES app_people(id) ON DELETE SET NULL,
  to_person_id UUID NOT NULL REFERENCES app_people(id) ON DELETE RESTRICT,
  from_person_name VARCHAR(255),
  to_person_name VARCHAR(255),
  transfer_reason TEXT,
  transferred_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices de performance
CREATE INDEX IF NOT EXISTS idx_ticket_transfers_ticket ON app_ticket_transfers(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_transfers_order ON app_ticket_transfers(order_id);
CREATE INDEX IF NOT EXISTS idx_ticket_transfers_event ON app_ticket_transfers(event_id);
CREATE INDEX IF NOT EXISTS idx_ticket_transfers_to_person ON app_ticket_transfers(to_person_id);

-- Habilitar RLS na tabela de transferências
ALTER TABLE app_ticket_transfers ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS para app_ticket_transfers
CREATE POLICY "Allow authenticated full access to app_ticket_transfers"
  ON app_ticket_transfers
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public read app_ticket_transfers"
  ON app_ticket_transfers
  FOR SELECT
  TO anon, authenticated
  USING (true);
