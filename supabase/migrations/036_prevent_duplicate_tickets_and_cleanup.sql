-- ==============================================================================
-- Migração 036: Prevenção de Ingressos Duplicados e Limpeza de Dados
-- ==============================================================================

-- 1. Limpar ingressos duplicados mantendo apenas o registro original mais antigo de cada (order_id, ticket_number)
DELETE FROM public.app_event_tickets
WHERE id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (
      PARTITION BY order_id, ticket_number 
      ORDER BY created_at ASC, id ASC
    ) as rnum
    FROM public.app_event_tickets
  ) duplicates
  WHERE duplicates.rnum > 1
);

-- 2. Adicionar restrição de unicidade composta (order_id, ticket_number) na tabela app_event_tickets
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_constraint 
    WHERE conname = 'unique_order_ticket_number'
  ) THEN
    ALTER TABLE public.app_event_tickets 
    ADD CONSTRAINT unique_order_ticket_number UNIQUE (order_id, ticket_number);
  END IF;
END $$;

-- 3. Criar índice explicativo para reforçar performance de buscas por par order_id e ticket_number
CREATE INDEX IF NOT EXISTS idx_app_event_tickets_order_ticket_num 
ON public.app_event_tickets(order_id, ticket_number);
