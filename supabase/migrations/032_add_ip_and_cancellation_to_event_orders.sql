-- 032_add_ip_and_cancellation_to_event_orders.sql
-- Adiciona colunas para registro de IP, documento do comprador e motivo de cancelamento na tabela app_event_orders

ALTER TABLE public.app_event_orders
  ADD COLUMN IF NOT EXISTS ip_address TEXT,
  ADD COLUMN IF NOT EXISTS client_document TEXT,
  ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;

-- Índice para acelerar busca por ordens pendentes do mesmo comprador/IP no mesmo evento
CREATE INDEX IF NOT EXISTS idx_app_event_orders_pending_check 
  ON public.app_event_orders (event_id, status, client_phone, client_document, ip_address);
