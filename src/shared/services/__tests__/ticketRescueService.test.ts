import {
  cleanCpfDigits,
  formatDisplayPhone,
  formatRescueWhatsAppMessage,
  buildWhatsAppDirectUrl,
  rescueTicketsByCpf,
  RescueTicketItem,
} from '../ticketRescueService';

jest.mock('../lib/supabase', () => ({
  supabase: {
    rpc: jest.fn(),
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      neq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
    })),
  },
}));

describe('ticketRescueService', () => {
  describe('cleanCpfDigits', () => {
    it('deve extrair somente os números de um CPF formatado', () => {
      expect(cleanCpfDigits('123.456.789-00')).toBe('12345678900');
      expect(cleanCpfDigits(' 123.456.789-00 ')).toBe('12345678900');
      expect(cleanCpfDigits('12345678900')).toBe('12345678900');
      expect(cleanCpfDigits('')).toBe('');
    });
  });

  describe('formatDisplayPhone', () => {
    it('deve formatar números com DDD e 9 dígitos', () => {
      expect(formatDisplayPhone('11999998888')).toBe('(11) 99999-8888');
    });

    it('deve formatar números com DDD e 8 dígitos (fixo)', () => {
      expect(formatDisplayPhone('1133334444')).toBe('(11) 3333-4444');
    });

    it('deve formatar números com DDI 55', () => {
      expect(formatDisplayPhone('5511999998888')).toBe('+55 (11) 99999-8888');
    });

    it('deve devolver string vazia para valores nulos', () => {
      expect(formatDisplayPhone(null)).toBe('');
      expect(formatDisplayPhone(undefined)).toBe('');
    });
  });

  describe('formatRescueWhatsAppMessage', () => {
    const mockTickets: RescueTicketItem[] = [
      {
        id: 't-1',
        order_id: 'ord-1',
        ticket_number: 1,
        qr_code_hash: 'HASH-ABC-123',
        status: 'valid',
        used_at: null,
        batch_name: '1º Lote VIP',
        holder_name: 'Renato Kiste',
      },
      {
        id: 't-2',
        order_id: 'ord-1',
        ticket_number: 2,
        qr_code_hash: 'HASH-DEF-456',
        status: 'used',
        used_at: '2026-10-23T14:00:00Z',
        batch_name: '1º Lote VIP',
        holder_name: 'Maria Silva',
      },
    ];

    it('deve montar a mensagem formatada para WhatsApp com todos os ingressos e QR Codes', () => {
      const msg = formatRescueWhatsAppMessage({
        eventTitle: 'Festival Better Now',
        eventDate: '2026-11-15',
        eventLocation: 'Espaço Unimed',
        buyerName: 'Renato Kiste',
        tickets: mockTickets,
        rescueUrl: 'https://betternow.cesire.com.br/eventos/ev-1/resgate?cpf=12345678900',
      });

      expect(msg).toContain('Festival Better Now');
      expect(msg).toContain('Renato Kiste');
      expect(msg).toContain('Ingresso #1');
      expect(msg).toContain('HASH-ABC-123');
      expect(msg).toContain('Válido para entrada');
      expect(msg).toContain('Ingresso #2');
      expect(msg).toContain('Maria Silva');
      expect(msg).toContain('HASH-DEF-456');
      expect(msg).toContain('Já utilizado no check-in');
      expect(msg).toContain('https://betternow.cesire.com.br/eventos/ev-1/resgate?cpf=12345678900');
    });
  });

  describe('buildWhatsAppDirectUrl', () => {
    it('deve gerar URL do WhatsApp com número normalizado e texto codificado', () => {
      const url = buildWhatsAppDirectUrl('11999998888', 'Olá mundo!');
      expect(url).toContain('https://api.whatsapp.com/send?');
      expect(url).toContain('phone=5511999998888');
      expect(url).toContain('text=Ol%C3%A1%20mundo!');
    });
  });

  describe('rescueTicketsByCpf validação', () => {
    it('deve rejeitar CPF inválido com erro amigável', async () => {
      const result = await rescueTicketsByCpf('ev-1', '123');
      expect(result.ok).toBe(false);
      expect(result.error).toContain('CPF inválido');
    });
  });
});
