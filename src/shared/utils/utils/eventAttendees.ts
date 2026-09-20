import { supabase } from '../../services/lib/supabase';

/**
 * Lista de presença do evento: um item por ingresso, com o nome do titular
 * resolvido do mesmo jeito que a portaria resolve.
 *
 * A fonte da verdade é o ingresso, não o cadastro em app_people: há convidado
 * nominal que nunca virou cadastro, e há ingresso que carrega o client_id do
 * comprador. Montar a lista por pessoa perde os dois casos, e foi o que deixava
 * o modo tablet com menos nomes que o check-in.
 */
export interface EventAttendee {
  ticketId: string;
  orderId: string;
  ticketNumber: number;
  personId: string | null;
  name: string;
  document?: string | null;
  phone?: string | null;
  email?: string | null;
  status: string;
  orderStatus?: string | null;
  checkedIn: boolean;
}

/**
 * Só ingresso de pedido pago existe para a portaria e para o concurso. 'approved'
 * é o rótulo antigo de pedidos aprovados, ainda presente em pedidos legados.
 */
export const isPaidOrderStatus = (status?: string | null): boolean =>
  status === 'paid' || status === 'approved';

const onlyDigits = (v: unknown): string => String(v ?? '').replace(/\D/g, '');

/**
 * Os participantes nominais do pedido são gravados como JSON em
 * cancellation_reason — convenção herdada do checkout, que a portaria também lê.
 */
const parseAttendees = (raw: unknown): any[] => {
  if (typeof raw !== 'string' || !raw.trim().startsWith('[')) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

/**
 * Nomes chegam do checkout em CAIXA ALTA, tudo minúsculo ou misturado. Os cards
 * do tablet precisam de uma grafia só, então normaliza para Inicial Maiúscula,
 * preservando as partículas ("de", "dos") minúsculas quando não abrem o nome.
 */
const NAME_PARTICLES = new Set([
  'de', 'da', 'do', 'das', 'dos', 'e', 'di', 'du', 'del', 'della', 'van', 'von', 'y',
]);

export const formatPersonName = (raw: string): string => {
  const value = String(raw || '').trim();
  if (!value) return value;

  return value
    .toLocaleLowerCase('pt-BR')
    .split(/\s+/)
    .map((word, i) => {
      if (i > 0 && NAME_PARTICLES.has(word)) return word;
      // Nomes compostos por hífen ou apóstrofo capitalizam cada parte
      return word.replace(
        /(^|[-'’])([\p{L}])/gu,
        (_m, sep: string, letter: string) => sep + letter.toLocaleUpperCase('pt-BR')
      );
    })
    .join(' ');
};

export const isTicketCheckedIn = (t: { status?: string | null; used_at?: string | null }): boolean =>
  t.status === 'used' || Boolean(t.used_at);

export const fetchEventAttendees = async (
  eventId: string,
  options: { includeUnpaid?: boolean } = {}
): Promise<EventAttendee[]> => {
  if (!eventId) return [];

  const { data: tickets, error: ticketsErr } = await supabase
    .from('app_event_tickets')
    .select('*, person:app_people(id, nome, documento, whatsapp, email, telefone)')
    .eq('event_id', eventId)
    .order('ticket_number', { ascending: true });

  if (ticketsErr) throw ticketsErr;
  if (!tickets?.length) return [];

  // Pedidos trazem o comprador e a lista nominal de participantes
  const orderIds = Array.from(new Set(tickets.map(t => t.order_id).filter(Boolean)));
  const ordersMap: Record<string, any> = {};
  const peopleById: Record<string, any> = {};
  const peopleByDoc: Record<string, any> = {};

  if (orderIds.length > 0) {
    const { data: orders } = await supabase
      .from('app_event_orders')
      .select('id, client_id, client_name, client_document, client_phone, client_email, cancellation_reason, status')
      .in('id', orderIds);

    const personIds: string[] = [];
    const docs: string[] = [];

    (orders || []).forEach(o => {
      ordersMap[o.id] = o;
      if (o.client_id) personIds.push(o.client_id);
      const buyerDoc = onlyDigits(o.client_document);
      if (buyerDoc) docs.push(buyerDoc);

      parseAttendees(o.cancellation_reason).forEach((att: any) => {
        const id = att?.person_id || att?.client_id;
        if (id) personIds.push(id);
        const doc = onlyDigits(att?.documento || att?.cpf);
        if (doc) docs.push(doc);
      });
    });

    const uniqueIds = Array.from(new Set(personIds));
    const uniqueDocs = Array.from(new Set(docs));

    const index = (people: any[] | null) => {
      (people || []).forEach(p => {
        if (p.id) peopleById[p.id] = p;
        const doc = onlyDigits(p.documento);
        if (doc) peopleByDoc[doc] = p;
      });
    };

    if (uniqueIds.length > 0) {
      const { data } = await supabase
        .from('app_people')
        .select('id, nome, documento, whatsapp, email, telefone')
        .in('id', uniqueIds);
      index(data);
    }

    if (uniqueDocs.length > 0) {
      const { data } = await supabase
        .from('app_people')
        .select('id, nome, documento, whatsapp, email, telefone')
        .in('documento', uniqueDocs);
      index(data);
    }
  }

  // Duplicatas de ingresso existem no banco; a portaria também deduplica assim
  const seen = new Set<string>();
  const unique = tickets.filter(t => {
    if (!options.includeUnpaid && !isPaidOrderStatus(ordersMap[t.order_id]?.status)) return false;
    const key = `${t.order_id}-${t.ticket_number}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return unique.map(t => {
    const order = ordersMap[t.order_id];
    const idx = Math.max(0, (Number(t.ticket_number) || 1) - 1);
    const attendee = parseAttendees(order?.cancellation_reason)[idx] || null;

    const attPersonId = attendee?.person_id || attendee?.client_id;
    const attDoc = onlyDigits(attendee?.documento || attendee?.cpf);
    const matched = (attPersonId ? peopleById[attPersonId] : null) || (attDoc ? peopleByDoc[attDoc] : null);

    // Ingresso gravado com o client_id do comprador não define o titular dos
    // ingressos seguintes do mesmo pedido.
    const isBuyerPerson = t.person?.id && order?.client_id && t.person.id === order.client_id;
    const validPerson = (!isBuyerPerson || idx === 0) ? t.person : null;
    const isExplicitHolder = Boolean(t.person?.nome && (!isBuyerPerson || idx === 0));

    const name = isExplicitHolder
      ? t.person.nome
      : (matched?.nome || attendee?.nome || validPerson?.nome
        || (idx === 0 ? order?.client_name : null) || `Participante ${idx + 1}`);

    const personId = isExplicitHolder
      ? (t.person?.id ?? null)
      : (matched?.id || attPersonId || validPerson?.id || (idx === 0 ? order?.client_id : null) || null);

    const document = isExplicitHolder
      ? (t.person?.documento ?? null)
      : (matched?.documento || attendee?.documento || attendee?.cpf || validPerson?.documento
        || (idx === 0 ? order?.client_document : null) || null);

    const phone = isExplicitHolder
      ? (t.person?.whatsapp ?? null)
      : (matched?.whatsapp || matched?.telefone || attendee?.whatsapp || attendee?.telefone
        || validPerson?.whatsapp || (idx === 0 ? order?.client_phone : null) || null);

    const email = isExplicitHolder
      ? (t.person?.email ?? null)
      : (matched?.email || attendee?.email || validPerson?.email
        || (idx === 0 ? order?.client_email : null) || null);

    return {
      ticketId: t.id,
      orderId: t.order_id,
      ticketNumber: Number(t.ticket_number) || 1,
      personId,
      name,
      document,
      phone,
      email,
      status: t.status,
      orderStatus: order?.status ?? null,
      checkedIn: isTicketCheckedIn(t),
    };
  });
};

export default fetchEventAttendees;
