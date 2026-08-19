-- 030_add_payment_methods_and_proof_to_event_orders.sql
-- Criação das tabelas app_event_orders e app_event_tickets vinculadas a app_events e app_people

-- 1. Criar tabela de pedidos de evento (app_event_orders)
CREATE TABLE IF NOT EXISTS public.app_event_orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID REFERENCES public.app_events(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.app_people(id) ON DELETE SET NULL,
  client_name TEXT,
  client_email TEXT,
  client_phone TEXT,
  stripe_session_id TEXT UNIQUE,
  stripe_payment_intent_id TEXT,
  amount_total NUMERIC NOT NULL,
  currency VARCHAR(10) DEFAULT 'brl',
  quantity INTEGER NOT NULL DEFAULT 1,
  batch_index INTEGER DEFAULT 0,
  batch_name TEXT,
  status VARCHAR(30) NOT NULL DEFAULT 'pending', -- 'pending', 'paid', 'canceled', 'failed', 'pending_proof'
  payment_method TEXT,
  convenience_fee NUMERIC DEFAULT 0,
  convenience_fee_percentage NUMERIC DEFAULT 0,
  payment_proof_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Garantir colunas caso a tabela já exista
ALTER TABLE public.app_event_orders
  ADD COLUMN IF NOT EXISTS payment_method TEXT,
  ADD COLUMN IF NOT EXISTS convenience_fee NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS convenience_fee_percentage NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payment_proof_url TEXT;

-- 2. Criar tabela de ingressos de evento (app_event_tickets)
CREATE TABLE IF NOT EXISTS public.app_event_tickets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.app_event_orders(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES public.app_events(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.app_people(id) ON DELETE SET NULL,
  ticket_number INTEGER NOT NULL DEFAULT 1,
  qr_code_hash TEXT NOT NULL UNIQUE,
  status VARCHAR(20) NOT NULL DEFAULT 'valid', -- 'valid', 'used', 'canceled'
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Índices de Performance
CREATE INDEX IF NOT EXISTS idx_app_event_orders_event_id ON public.app_event_orders(event_id);
CREATE INDEX IF NOT EXISTS idx_app_event_orders_client_id ON public.app_event_orders(client_id);
CREATE INDEX IF NOT EXISTS idx_app_event_orders_stripe_session ON public.app_event_orders(stripe_session_id);
CREATE INDEX IF NOT EXISTS idx_app_event_orders_status ON public.app_event_orders(status);

CREATE INDEX IF NOT EXISTS idx_app_event_tickets_order_id ON public.app_event_tickets(order_id);
CREATE INDEX IF NOT EXISTS idx_app_event_tickets_event_id ON public.app_event_tickets(event_id);
CREATE INDEX IF NOT EXISTS idx_app_event_tickets_client_id ON public.app_event_tickets(client_id);
CREATE INDEX IF NOT EXISTS idx_app_event_tickets_qr_code_hash ON public.app_event_tickets(qr_code_hash);
CREATE INDEX IF NOT EXISTS idx_app_event_tickets_status ON public.app_event_tickets(status);

-- 4. Habilitar RLS
ALTER TABLE public.app_event_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_event_tickets ENABLE ROW LEVEL SECURITY;

-- 5. Políticas RLS
DROP POLICY IF EXISTS "Allow public select app_event_orders" ON public.app_event_orders;
DROP POLICY IF EXISTS "Allow public insert app_event_orders" ON public.app_event_orders;
DROP POLICY IF EXISTS "Allow public update app_event_orders" ON public.app_event_orders;
DROP POLICY IF EXISTS "Allow public delete app_event_orders" ON public.app_event_orders;

CREATE POLICY "Allow public select app_event_orders" ON public.app_event_orders FOR SELECT USING (true);
CREATE POLICY "Allow public insert app_event_orders" ON public.app_event_orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update app_event_orders" ON public.app_event_orders FOR UPDATE USING (true);
CREATE POLICY "Allow public delete app_event_orders" ON public.app_event_orders FOR DELETE USING (true);

DROP POLICY IF EXISTS "Allow public select app_event_tickets" ON public.app_event_tickets;
DROP POLICY IF EXISTS "Allow public insert app_event_tickets" ON public.app_event_tickets;
DROP POLICY IF EXISTS "Allow public update app_event_tickets" ON public.app_event_tickets;
DROP POLICY IF EXISTS "Allow public delete app_event_tickets" ON public.app_event_tickets;

CREATE POLICY "Allow public select app_event_tickets" ON public.app_event_tickets FOR SELECT USING (true);
CREATE POLICY "Allow public insert app_event_tickets" ON public.app_event_tickets FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update app_event_tickets" ON public.app_event_tickets FOR UPDATE USING (true);
CREATE POLICY "Allow public delete app_event_tickets" ON public.app_event_tickets FOR DELETE USING (true);

-- 6. Conceder Permissões
GRANT ALL PRIVILEGES ON public.app_event_orders TO authenticated, anon, service_role;
GRANT ALL PRIVILEGES ON public.app_event_tickets TO authenticated, anon, service_role;
