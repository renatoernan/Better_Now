import { supabase } from './lib/supabase';
import { formatBrazilDate, formatPrice } from '../utils/utils/eventUtils';
import { formatCPF } from '../utils/utils/cpfUtils';
import { sendWahaTextMessage } from './wahaService';

export interface RescueTicketItem {
  id: string;
  order_id: string;
  ticket_number: number | string;
  qr_code_hash: string;
  status: 'valid' | 'used' | 'canceled';
  used_at: string | null;
  created_at?: string;
  batch_name?: string;
  holder_name: string;
  holder_document?: string;
  holder_whatsapp?: string;
}

export interface RescueEventInfo {
  id: string;
  title: string;
  event_date: string | null;
  start_time: string | null;
  end_time: string | null;
  location: string | null;
  address: string | null;
  city: string | null;
  image_url: string | null;
}

export interface RescueBuyerInfo {
  name: string;
  phone: string | null;
  email: string | null;
  document: string;
}

export interface RescueResult {
  ok: boolean;
  found: boolean;
  error?: string;
  message?: string;
  event?: RescueEventInfo;
  buyer?: RescueBuyerInfo;
  total_tickets?: number;
  tickets?: RescueTicketItem[];
}

/**
 * Remove qualquer caractere não numérico do CPF
 */
export const cleanCpfDigits = (raw: string): string => {
  return (raw || '').replace(/\D/g, '');
};

/**
 * Formata telefone brasileiro para exibição amigável
 */
export const formatDisplayPhone = (rawPhone?: string | null): string => {
  if (!rawPhone) return '';
  const digits = rawPhone.replace(/\D/g, '');
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  if (digits.length === 13 && digits.startsWith('55')) {
    const ddd = digits.slice(2, 4);
    const num = digits.slice(4);
    return `+55 (${ddd}) ${num.length === 9 ? `${num.slice(0, 5)}-${num.slice(5)}` : `${num.slice(0, 4)}-${num.slice(4)}`}`;
  }
  return rawPhone;
};

/**
 * Busca dados do evento para a tela de resgate
 */
export const fetchEventForRescue = async (eventId?: string | null): Promise<RescueEventInfo | null> => {
  try {
    let query = supabase
      .from('app_events')
      .select('id, title, event_date, start_time, end_time, location, observations');

    if (eventId && eventId.trim() !== '') {
      query = query.eq('id', eventId.trim());
    } else {
      query = query.order('created_at', { ascending: false }).limit(1);
    }

    const { data, error } = await query.maybeSingle();

    if (error || !data) {
      console.warn('Evento não encontrado para resgate:', eventId, error);
      return null;
    }

    let imageUrl: string | null = null;
    if (data.observations) {
      try {
        const parsed = JSON.parse(data.observations);
        imageUrl = parsed.image_url || parsed.cover_url || parsed.banner_url || null;
      } catch {}
    }

    return {
      id: data.id,
      title: data.title || 'Evento',
      event_date: data.event_date || null,
      start_time: data.start_time || null,
      end_time: data.end_time || null,
      location: data.location || null,
      address: null,
      city: null,
      image_url: imageUrl,
    };
  } catch (err) {
    console.error('Erro ao buscar evento para resgate:', err);
    return null;
  }
};

/**
 * Fallback de consulta segura client-side caso a RPC SQL ainda não esteja criada
 */
const rescueTicketsFallback = async (eventId: string | null | undefined, cleanCpf: string): Promise<RescueResult> => {
  try {
    // 1. Busca evento
    let event = await fetchEventForRescue(eventId);
    let targetEventId = eventId || event?.id || '';

    if (!targetEventId) {
      return {
        ok: false,
        found: false,
        error: 'Evento não encontrado para consulta de ingressos.',
      };
    }

    // 2. Busca ordens pagas e cortesias do evento
    const { data: orders, error: ordersErr } = await supabase
      .from('app_event_orders')
      .select('id, client_id, client_name, client_document, client_phone, client_email, batch_name, cancellation_reason, status, payment_method, created_at')
      .eq('event_id', targetEventId)
      .or('status.in.(paid,approved,free,cortesia,completed),payment_method.eq.cortesia')
      .order('created_at', { ascending: false });

    if (ordersErr) throw ordersErr;

    // Filtra ordens que pertencem a este CPF
    const matchedOrders: any[] = [];
    let buyerData: RescueBuyerInfo | null = null;

    (orders || []).forEach((o) => {
      const orderDoc = cleanCpfDigits(o.client_document);
      const isDocMatch = orderDoc === cleanCpf;
      const attsMatch = typeof o.cancellation_reason === 'string' && o.cancellation_reason.includes(cleanCpf);

      if (isDocMatch || attsMatch) {
        matchedOrders.push(o);
        if (!buyerData && o.client_name) {
          buyerData = {
            name: o.client_name,
            phone: o.client_phone || null,
            email: o.client_email || null,
            document: formatCPF(cleanCpf),
          };
        }
      }
    });

    // Se ainda não encontrou via campo direto do pedido, verifica em app_people
    if (matchedOrders.length === 0) {
      const { data: peopleWithCpf } = await supabase
        .from('app_people')
        .select('id, nome, documento, whatsapp, telefone, email')
        .eq('documento', cleanCpf);

      if (peopleWithCpf && peopleWithCpf.length > 0) {
        const personIds = peopleWithCpf.map((p) => p.id);
        const { data: ordersByPerson } = await supabase
          .from('app_event_orders')
          .select('id, client_id, client_name, client_document, client_phone, client_email, batch_name, cancellation_reason, status, payment_method, created_at')
          .eq('event_id', targetEventId)
          .or('status.in.(paid,approved,free,cortesia,completed),payment_method.eq.cortesia')
          .in('client_id', personIds);

        if (ordersByPerson && ordersByPerson.length > 0) {
          matchedOrders.push(...ordersByPerson);
          const p = peopleWithCpf[0];
          buyerData = {
            name: p.nome || ordersByPerson[0].client_name || 'Comprador',
            phone: p.whatsapp || p.telefone || ordersByPerson[0].client_phone || null,
            email: p.email || ordersByPerson[0].client_email || null,
            document: formatCPF(cleanCpf),
          };
        }
      }
    }

    if (matchedOrders.length === 0) {
      return {
        ok: true,
        found: false,
        message: 'Nenhum ingresso pago ou cortesia foi encontrado para este CPF neste evento.',
      };
    }

    // 3. Busca ingressos das ordens localizadas
    const orderIds = matchedOrders.map((o) => o.id);
    const { data: tickets, error: ticketsErr } = await supabase
      .from('app_event_tickets')
      .select('*, client:app_people(id, nome, documento, whatsapp, email)')
      .eq('event_id', targetEventId)
      .in('order_id', orderIds)
      .not('status', 'in', '("canceled","cancelled")')
      .order('ticket_number', { ascending: true });

    if (ticketsErr) throw ticketsErr;

    const activeTickets = (tickets || []).filter(
      (t: any) => t.status !== 'canceled' && t.status !== 'cancelled'
    );

    if (activeTickets.length === 0) {
      return {
        ok: true,
        found: false,
        message: 'Nenhum ingresso ativo encontrado para este CPF.',
      };
    }

    // 4. Monta e enriquece lista de ingressos
    const ordersMap: Record<string, any> = {};
    matchedOrders.forEach((o) => {
      ordersMap[o.id] = o;
    });

    const parsedTickets: RescueTicketItem[] = activeTickets.map((t: any, idx: number) => {
      const order = ordersMap[t.order_id] || {};
      let attendees: any[] = [];
      if (order.cancellation_reason && typeof order.cancellation_reason === 'string' && order.cancellation_reason.trim().startsWith('[')) {
        try {
          const parsed = JSON.parse(order.cancellation_reason);
          if (Array.isArray(parsed)) attendees = parsed;
        } catch {}
      }

      const directPerson = t.client;
      let holderName = directPerson?.nome || attendees[idx]?.nome || (idx === 0 ? order.client_name : null) || `Participante ${idx + 1}`;
      let holderDoc = directPerson?.documento || attendees[idx]?.documento || attendees[idx]?.cpf || (idx === 0 ? order.client_document : null);
      let holderPhone = directPerson?.whatsapp || attendees[idx]?.whatsapp || attendees[idx]?.telefone || (idx === 0 ? order.client_phone : null);

      return {
        id: t.id,
        order_id: t.order_id,
        ticket_number: t.ticket_number || idx + 1,
        qr_code_hash: t.qr_code_hash,
        status: t.status === 'used' ? 'used' : 'valid',
        used_at: t.used_at || null,
        created_at: t.created_at,
        batch_name: order.batch_name || 'Geral',
        holder_name: holderName,
        holder_document: holderDoc ? formatCPF(holderDoc) : undefined,
        holder_whatsapp: holderPhone || undefined,
      };
    });

    return {
      ok: true,
      found: true,
      event,
      buyer: buyerData || {
        name: matchedOrders[0].client_name || 'Comprador',
        phone: matchedOrders[0].client_phone || null,
        email: matchedOrders[0].client_email || null,
        document: formatCPF(cleanCpf),
      },
      total_tickets: parsedTickets.length,
      tickets: parsedTickets,
    };
  } catch (err: any) {
    console.error('Erro no fallback de resgate de ingressos:', err);
    return {
      ok: false,
      found: false,
      error: err.message || 'Erro ao consultar ingressos.',
    };
  }
};

/**
 * Consulta ingressos comprados pelo CPF para o evento especificado
 */
export const rescueTicketsByCpf = async (eventId: string | null | undefined, rawCpf: string): Promise<RescueResult> => {
  const cleanCpf = cleanCpfDigits(rawCpf);
  if (cleanCpf.length !== 11) {
    return {
      ok: false,
      found: false,
      error: 'CPF inválido. Certifique-se de digitar os 11 dígitos do seu CPF.',
    };
  }

  let targetEventId = eventId;

  try {
    if (!targetEventId) {
      const defaultEv = await fetchEventForRescue(null);
      targetEventId = defaultEv?.id;
    }

    // 1. Tenta executar via RPC seguro no banco de dados se houver targetEventId
    if (targetEventId) {
      const { data, error } = await supabase.rpc('rescue_event_tickets_by_cpf', {
        p_event_id: targetEventId,
        p_cpf: cleanCpf,
      });

      // Se a RPC rodou com sucesso sem erro de schema
      if (!error && data && data.ok) {
        if (!data.found || !data.tickets || data.tickets.length === 0) {
          return {
            ok: true,
            found: false,
            message: data.message || 'Nenhum ingresso pago ou cortesia foi encontrado para este CPF neste evento.',
          };
        }

      // Normaliza dados dos ingressos
      const tickets: RescueTicketItem[] = (data.tickets || []).map((t: any, idx: number) => {
        let holderName = t.holder_name;
        let holderDoc = t.holder_document;

        // Se houver attendees_json, tenta descompactar o nome correto por índice
        if (t.attendees_json && typeof t.attendees_json === 'string' && t.attendees_json.trim().startsWith('[')) {
          try {
            const arr = JSON.parse(t.attendees_json);
            if (Array.isArray(arr) && arr[idx]?.nome) {
              holderName = arr[idx].nome;
              if (arr[idx].documento || arr[idx].cpf) {
                holderDoc = arr[idx].documento || arr[idx].cpf;
              }
            }
          } catch {}
        }

        return {
          id: t.id,
          order_id: t.order_id,
          ticket_number: t.ticket_number || idx + 1,
          qr_code_hash: t.qr_code_hash,
          status: t.status === 'used' ? 'used' : 'valid',
          used_at: t.used_at || null,
          created_at: t.created_at,
          batch_name: t.batch_name || 'Geral',
          holder_name: holderName || `Participante ${idx + 1}`,
          holder_document: holderDoc ? formatCPF(holderDoc) : undefined,
          holder_whatsapp: t.holder_whatsapp || undefined,
        };
      });

        return {
          ok: true,
          found: true,
          event: data.event,
          buyer: {
            name: data.buyer?.name || 'Comprador',
            phone: data.buyer?.phone || null,
            email: data.buyer?.email || null,
            document: formatCPF(cleanCpf),
          },
          total_tickets: tickets.length,
          tickets,
        };
      }
    }

    // 2. Se a RPC não existe no banco ou falhou, usa o fallback robusto
    return await rescueTicketsFallback(targetEventId, cleanCpf);
  } catch (err) {
    console.warn('Erro ao chamar RPC rescue_event_tickets_by_cpf, acionando fallback:', err);
    return await rescueTicketsFallback(targetEventId, cleanCpf);
  }
};

/**
 * Monta o texto oficial formatado para envio no WhatsApp
 */
export const formatRescueWhatsAppMessage = ({
  eventTitle,
  eventDate,
  eventLocation,
  buyerName,
  tickets,
  rescueUrl,
}: {
  eventTitle: string;
  eventDate?: string | null;
  eventLocation?: string | null;
  buyerName: string;
  tickets: RescueTicketItem[];
  rescueUrl: string;
}): string => {
  const dateFormatted = eventDate ? formatBrazilDate(eventDate) : 'Data a confirmar';
  const locationFormatted = eventLocation || 'Local a confirmar';
  const count = tickets.length;

  let msg = `🎟️ *Seus Ingressos - ${eventTitle}*\n\n` +
    `Olá, *${buyerName}*! Aqui estão os ingressos resgatados vinculados ao seu CPF:\n\n` +
    `📅 *Data:* ${dateFormatted}\n` +
    `📍 *Local:* ${locationFormatted}\n` +
    `🔢 *Total:* ${count} ${count === 1 ? 'ingresso' : 'ingressos'}\n\n` +
    `━━━━━━━━━━━━━━━━━━━━\n`;

  tickets.forEach((t, i) => {
    const isUsed = t.status === 'used';
    const statusIcon = isUsed ? '⚠️' : '✅';
    const statusText = isUsed ? 'Já utilizado no check-in' : 'Válido para entrada';

    msg += `🎫 *Ingresso #${t.ticket_number}*\n` +
      `👤 *Titular:* ${t.holder_name}\n` +
      `🏷️ *Lote:* ${t.batch_name || 'Geral'}\n` +
      `${statusIcon} *Status:* ${statusText}\n` +
      `🔑 *Código de Check-in:* \`${t.qr_code_hash}\`\n\n`;
  });

  msg += `━━━━━━━━━━━━━━━━━━━━\n` +
    `📲 *Acesse seus QR Codes na tela a qualquer momento:*\n` +
    `${rescueUrl}\n\n` +
    `👉 *Dica para o dia do evento:*\n` +
    `Apresente o QR Code na tela do seu celular e um documento oficial com foto na portaria para entrada rápida. Bom evento! 🎉`;

  return msg;
};

/**
 * Cria a URL direta do WhatsApp Web/App
 */
export const buildWhatsAppDirectUrl = (phone: string, text: string): string => {
  let cleanDigits = phone.replace(/\D/g, '');
  if (cleanDigits.startsWith('0')) cleanDigits = cleanDigits.slice(1);
  if (!cleanDigits.startsWith('55') && (cleanDigits.length === 10 || cleanDigits.length === 11)) {
    cleanDigits = `55${cleanDigits}`;
  }

  const phoneParam = cleanDigits ? `phone=${cleanDigits}&` : '';
  return `https://api.whatsapp.com/send?${phoneParam}text=${encodeURIComponent(text)}`;
};

/**
 * Dispara notificação via WAHA (caso configurado) e retorna o link direto como fallback
 */
export const sendRescueNotification = async ({
  phone,
  message,
}: {
  phone: string;
  message: string;
}): Promise<{ success: boolean; viaWaha: boolean; directUrl: string; message: string }> => {
  const directUrl = buildWhatsAppDirectUrl(phone, message);

  try {
    // 1. Verifica se WAHA está configurado no banco de dados
    const { data } = await supabase
      .from('app_settings')
      .select('key, value')
      .in('key', ['waha_api_url', 'waha_session_name', 'waha_api_key', 'waha_enabled']);

    const settings: Record<string, any> = {};
    (data || []).forEach((item) => {
      let val = item.value;
      if (typeof val === 'string') {
        try { val = JSON.parse(val); } catch {}
      }
      settings[item.key] = val;
    });

    const isWahaEnabled = settings.waha_enabled !== false && Boolean(settings.waha_api_url);

    if (isWahaEnabled && phone) {
      const wahaRes = await sendWahaTextMessage({
        apiUrl: settings.waha_api_url,
        sessionName: settings.waha_session_name || 'default',
        apiKey: settings.waha_api_key,
        phone,
        text: message,
      });

      if (wahaRes.success) {
        return {
          success: true,
          viaWaha: true,
          directUrl,
          message: 'Ingressos enviados com sucesso para o seu WhatsApp pelo canal oficial!',
        };
      }
    }

    return {
      success: true,
      viaWaha: false,
      directUrl,
      message: 'Pronto para enviar pelo WhatsApp!',
    };
  } catch (err) {
    console.warn('Erro ao disparar via WAHA, fallback direto:', err);
    return {
      success: true,
      viaWaha: false,
      directUrl,
      message: 'Pronto para enviar pelo WhatsApp!',
    };
  }
};
