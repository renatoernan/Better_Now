import { 
  normalizeSortString, 
  prepareGuestListItems, 
  renderGuestListPrintHtml 
} from '../guestListPrintService';
import { FlattenedTicketItem } from '../../../../components/features/AdminEventOrders';
import { Event } from '../../../types/types/event';

describe('guestListPrintService', () => {
  describe('normalizeSortString', () => {
    it('deve remover acentos e normalizar para maiúsculas', () => {
      expect(normalizeSortString('Ágata Silva')).toBe('AGATA SILVA');
      expect(normalizeSortString('Érica')).toBe('ERICA');
      expect(normalizeSortString('Ícaro')).toBe('ICARO');
      expect(normalizeSortString('Óscar')).toBe('OSCAR');
      expect(normalizeSortString('Úrsula')).toBe('URSULA');
      expect(normalizeSortString('  João da Silva  ')).toBe('JOAO DA SILVA');
    });
  });

  describe('prepareGuestListItems', () => {
    const mockTickets: FlattenedTicketItem[] = [
      {
        id: 'ticket-1',
        ticketIndex: 1,
        ticketNumber: '1',
        holderName: 'Zuleica Santos',
        hasNamedHolder: true,
        holderDoc: '11122233344',
        holderPhone: '11999999999',
        buyerName: 'Comprador A',
        unitPrice: 100,
        ticketStatus: 'valid',
        order: {
          id: 'ord-1',
          event_id: 'event-1',
          amount_total: 100,
          currency: 'BRL',
          quantity: 1,
          batch_index: 1,
          batch_name: 'Lote 1',
          status: 'paid',
          created_at: new Date().toISOString(),
        },
      },
      {
        id: 'ticket-2',
        ticketIndex: 2,
        ticketNumber: '2',
        holderName: 'Ana Clara',
        hasNamedHolder: true,
        holderDoc: '22233344455',
        holderPhone: '11988888888',
        buyerName: 'Comprador B',
        unitPrice: 100,
        ticketStatus: 'valid',
        order: {
          id: 'ord-2',
          event_id: 'event-1',
          amount_total: 100,
          currency: 'BRL',
          quantity: 1,
          batch_index: 1,
          batch_name: 'Lote 1',
          status: 'paid',
          created_at: new Date().toISOString(),
        },
      },
      {
        id: 'ticket-3',
        ticketIndex: 3,
        ticketNumber: '3',
        holderName: 'Participante 3',
        hasNamedHolder: false, // fallback to buyer
        buyerName: 'Bernardo Lima',
        unitPrice: 0,
        ticketStatus: 'valid',
        order: {
          id: 'ord-3',
          event_id: 'event-1',
          amount_total: 0,
          currency: 'BRL',
          quantity: 1,
          batch_index: 2,
          batch_name: 'Cortesia VIP',
          payment_method: 'complimentary',
          status: 'paid',
          created_at: new Date().toISOString(),
        },
      },
      {
        id: 'ticket-4',
        ticketIndex: 4,
        ticketNumber: '4',
        holderName: 'Carlos Cancelado',
        hasNamedHolder: true,
        buyerName: 'Comprador D',
        unitPrice: 100,
        ticketStatus: 'cancelled',
        order: {
          id: 'ord-4',
          event_id: 'event-1',
          amount_total: 100,
          currency: 'BRL',
          quantity: 1,
          batch_index: 1,
          status: 'cancelled',
          created_at: new Date().toISOString(),
        },
      },
    ];

    it('deve ordenar alfabeticamente de A a Z e ignorar ingressos cancelados no modo valid_only', () => {
      const result = prepareGuestListItems(mockTickets, { statusFilter: 'valid_only' });

      // Cancelado deve ser removido
      expect(result).toHaveLength(3);

      // Ana Clara deve ser o primeiro
      expect(result[0].holderName).toBe('Ana Clara');
      expect(result[0].seq).toBe(1);

      // Bernardo Lima deve ser o segundo (fallback de cota do comprador)
      expect(result[1].holderName).toContain('Bernardo Lima');
      expect(result[1].seq).toBe(2);

      // Zuleica Santos deve ser o terceiro
      expect(result[2].holderName).toBe('Zuleica Santos');
      expect(result[2].seq).toBe(3);
    });

    it('deve filtrar por lote corretamente', () => {
      const result = prepareGuestListItems(mockTickets, {
        batchFilter: 'Cortesia VIP',
        statusFilter: 'all',
      });

      expect(result).toHaveLength(1);
      expect(result[0].batchName).toBe('Cortesia VIP');
      expect(result[0].isComplimentary).toBe(true);
    });

    it('deve filtrar por faixa alfabética', () => {
      const result = prepareGuestListItems(mockTickets, {
        letterFilter: 'A-F',
        statusFilter: 'valid_only',
      });

      // Ana Clara (A) e Bernardo Lima (B) estão entre A e F. Zuleica (Z) fica de fora.
      expect(result).toHaveLength(2);
      expect(result.map(r => r.firstLetter)).toEqual(['A', 'B']);
    });
  });

  describe('renderGuestListPrintHtml', () => {
    const mockEvent: Event = {
      id: 'event-1',
      title: 'Halloween 2026',
      description: 'Festa de Halloween',
      event_date: '2026-10-31',
      location: 'Espaço Jardins',
      event_type: 'party',
      status: 'active',
    };

    it('deve gerar HTML com metadados do evento e tabela de portaria', () => {
      const prepared = prepareGuestListItems([
        {
          id: 'ticket-1',
          ticketIndex: 1,
          ticketNumber: '1',
          holderName: 'Ana Clara',
          hasNamedHolder: true,
          holderDoc: '22233344455',
          holderPhone: '11988888888',
          buyerName: 'Comprador B',
          unitPrice: 100,
          ticketStatus: 'valid',
          order: {
            id: '0354a02d-xxxx',
            event_id: 'event-1',
            amount_total: 100,
            currency: 'BRL',
            quantity: 1,
            batch_index: 1,
            batch_name: 'Lote 1',
            status: 'paid',
            created_at: new Date().toISOString(),
          },
        },
      ]);

      const html = renderGuestListPrintHtml(mockEvent, prepared, {
        orientation: 'landscape',
        density: 'compact',
        includeSignatureLine: true,
        includeInstructions: true,
      });

      expect(html).toContain('Halloween 2026');
      expect(html).toContain('Plano B • Contingência Portaria');
      expect(html).toContain('Ana Clara');
      expect(html).toContain('LETRA A');
      expect(html).toContain('Espaço Jardins');
      expect(html).toContain('window.print()');
    });
  });
});
