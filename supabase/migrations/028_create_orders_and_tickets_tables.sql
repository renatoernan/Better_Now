-- 028_create_orders_and_tickets_tables.sql
-- Criar tabelas de Pedidos de Evento e Ingressos para integração com Stripe

-- 1. Criar tabela de pedidos (event_orders)
CREATE TABLE IF NOT EXISTS public.event_orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
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
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'paid', 'canceled', 'failed'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Criar tabela de ingressos (event_tickets)
CREATE TABLE IF NOT EXISTS public.event_tickets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.event_orders(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  ticket_number INTEGER NOT NULL DEFAULT 1,
  qr_code_hash TEXT NOT NULL UNIQUE,
  status VARCHAR(20) NOT NULL DEFAULT 'valid', -- 'valid', 'used', 'canceled'
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Criar Índices de Performance
CREATE INDEX IF NOT EXISTS idx_event_orders_event_id ON public.event_orders(event_id);
CREATE INDEX IF NOT EXISTS idx_event_orders_client_id ON public.event_orders(client_id);
CREATE INDEX IF NOT EXISTS idx_event_orders_stripe_session ON public.event_orders(stripe_session_id);
CREATE INDEX IF NOT EXISTS idx_event_orders_status ON public.event_orders(status);

CREATE INDEX IF NOT EXISTS idx_event_tickets_order_id ON public.event_tickets(order_id);
CREATE INDEX IF NOT EXISTS idx_event_tickets_event_id ON public.event_tickets(event_id);
CREATE INDEX IF NOT EXISTS idx_event_tickets_client_id ON public.event_tickets(client_id);
CREATE INDEX IF NOT EXISTS idx_event_tickets_qr_code_hash ON public.event_tickets(qr_code_hash);
CREATE INDEX IF NOT EXISTS idx_event_tickets_status ON public.event_tickets(status);

-- 4. Habilitar RLS
ALTER TABLE public.event_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_tickets ENABLE ROW LEVEL SECURITY;

-- 5. Criar Políticas RLS
-- Permitir leitura e criação para usuários autenticados e anônimos (ou service role para webhooks)
CREATE POLICY "Allow public select event_orders" ON public.event_orders FOR SELECT USING (true);
CREATE POLICY "Allow public insert event_orders" ON public.event_orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update event_orders" ON public.event_orders FOR UPDATE USING (true);
CREATE POLICY "Allow public delete event_orders" ON public.event_orders FOR DELETE USING (true);

CREATE POLICY "Allow public select event_tickets" ON public.event_tickets FOR SELECT USING (true);
CREATE POLICY "Allow public insert event_tickets" ON public.event_tickets FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update event_tickets" ON public.event_tickets FOR UPDATE USING (true);
CREATE POLICY "Allow public delete event_tickets" ON public.event_tickets FOR DELETE USING (true);

-- 6. Conceder Permissões para roles do Supabase
GRANT ALL PRIVILEGES ON public.event_orders TO authenticated, anon, service_role;
GRANT ALL PRIVILEGES ON public.event_tickets TO authenticated, anon, service_role;
