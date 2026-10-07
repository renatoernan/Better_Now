-- 047_ticket_transfers_policies.sql
-- Histórico de transferências de ingresso.
--
-- A tabela app_ticket_transfers foi criada com RLS ativado e nenhuma política:
-- o banco recusava toda gravação e, como o Supabase devolve o erro em vez de
-- lançá-lo, a tela de Pedidos nunca percebeu. Nenhuma transferência ficou
-- registrada até 07/10/2026. Só administradores leem e gravam o histórico.

DROP POLICY IF EXISTS "ticket_transfers_admin_read" ON public.app_ticket_transfers;
CREATE POLICY "ticket_transfers_admin_read" ON public.app_ticket_transfers
  FOR SELECT TO authenticated USING (public.is_mural_admin());

DROP POLICY IF EXISTS "ticket_transfers_admin_insert" ON public.app_ticket_transfers;
CREATE POLICY "ticket_transfers_admin_insert" ON public.app_ticket_transfers
  FOR INSERT TO authenticated WITH CHECK (public.is_mural_admin());

GRANT SELECT, INSERT ON public.app_ticket_transfers TO authenticated;
GRANT ALL PRIVILEGES ON public.app_ticket_transfers TO service_role;

-- Registro retroativo da transferência de 07/10/2026 (Juliana Brandão → Renato Kiste),
-- feita antes desta correção
INSERT INTO public.app_ticket_transfers
  (ticket_id, order_id, event_id, to_person_id, from_person_name, to_person_name, transfer_reason, transferred_at, created_at)
SELECT tk.id, tk.order_id, tk.event_id, tk.client_id, 'Juliana Brandão', 'Renato Kiste',
       'Registro retroativo (transferência feita antes do histórico funcionar)', NOW(), NOW()
  FROM public.app_event_tickets tk
 WHERE tk.id = 'beebbdae-222d-42f6-bcfd-2322a2856336'
   AND NOT EXISTS (SELECT 1 FROM public.app_ticket_transfers x WHERE x.ticket_id = tk.id);
