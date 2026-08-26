import nodemailer from "npm:nodemailer@6.9.13";

interface OrderNotifierParams {
  supabase: any;
  orderId: string;
  orderData?: any;
  type?: "confirmed" | "created" | "cancelled";
}

// Formatação de data no padrão brasileiro
function formatBrazilDate(dateStr?: string): string {
  if (!dateStr) return "";
  try {
    const parts = dateStr.split("-");
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    const d = new Date(dateStr);
    return d.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
  } catch {
    return dateStr;
  }
}

// Formatação de preço no padrão brasileiro
function formatPrice(val?: number): string {
  const num = Number(val) || 0;
  return num.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// Sanitização de telefone para o WAHA
function sanitizePhone(phone?: string): string {
  if (!phone) return "";
  let digits = phone.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.length === 10 || digits.length === 11) {
    digits = `55${digits}`;
  }
  return digits;
}

// Template HTML elegante e responsivo do Better Now
function generateHtmlEmail(params: {
  type: "confirmed" | "created" | "cancelled";
  clientName: string;
  orderNumber: string;
  eventTitle: string;
  total: string;
  quantity: number;
  eventDate: string;
  eventLocation: string;
  accessLink: string;
  paymentLink?: string;
  contentBody: string;
}): string {
  const { type, orderNumber, eventTitle, total, quantity, eventDate, eventLocation, accessLink, paymentLink, contentBody } = params;

  let statusBadge = {
    text: "Pagamento Confirmado",
    bg: "#dcfce7",
    color: "#166534",
    borderColor: "#bbf7d0",
  };
  let actionButtonText = "🎟️ Visualizar Ingressos e QR Code";
  let headerColor = "#059669";
  let targetLink = accessLink;

  if (type === "created") {
    statusBadge = {
      text: "Aguardando Pagamento",
      bg: "#fef3c7",
      color: "#92400e",
      borderColor: "#fde68a",
    };
    actionButtonText = "💳 Concluir Pagamento";
    headerColor = "#0284c7";
    targetLink = paymentLink || accessLink;
  } else if (type === "cancelled") {
    statusBadge = {
      text: "Pedido Cancelado",
      bg: "#fee2e2",
      color: "#991b1b",
      borderColor: "#fecaca",
    };
    actionButtonText = "Ver Outros Eventos";
    headerColor = "#dc2626";
    targetLink = accessLink;
  }

  const formatTextToHtml = (text: string) => {
    const escaped = text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    return escaped.replace(/\*([^\*\n]+)\*/g, "<strong>$1</strong>");
  };

  const formattedParagraphs = contentBody
    .split("\n")
    .filter((p) => p.trim() !== "")
    .map((p) => `<p style="margin: 0 0 12px 0; color: #334155; line-height: 1.6; font-size: 14px;">${formatTextToHtml(p)}</p>`)
    .join("");

  const isLocalhost = targetLink.includes("localhost") || targetLink.includes("127.0.0.1");
  const safeTargetLink = isLocalhost
    ? targetLink.replace(/^http:\/\/localhost(:\d+)?/, "https://betternow.cesire.com.br")
    : targetLink;

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${eventTitle}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f1f5f9; padding: 24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);">
          <tr>
            <td style="background: linear-gradient(135deg, ${headerColor} 0%, #1e293b 100%); padding: 32px 24px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">Better Now</h1>
              <p style="margin: 6px 0 0 0; color: rgba(255, 255, 255, 0.85); font-size: 13px;">Gestão de Eventos e Ingressos</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px 24px;">
              <table role="presentation" width="100%" style="margin-bottom: 20px;">
                <tr>
                  <td>
                    <span style="font-size: 12px; font-weight: bold; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">Pedido #${orderNumber}</span>
                  </td>
                  <td align="right">
                    <span style="display: inline-block; padding: 4px 12px; font-size: 12px; font-weight: 600; background-color: ${statusBadge.bg}; color: ${statusBadge.color}; border: 1px solid ${statusBadge.borderColor}; border-radius: 9999px;">
                      ${statusBadge.text}
                    </span>
                  </td>
                </tr>
              </table>
              <div style="margin-bottom: 24px;">
                ${formattedParagraphs}
              </div>
              <table role="presentation" width="100%" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px; margin-bottom: 28px;">
                <tr>
                  <td>
                    <h3 style="margin: 0 0 12px 0; color: #0f172a; font-size: 16px; font-weight: 700;">📍 ${eventTitle}</h3>
                    <table role="presentation" width="100%" style="font-size: 13px; color: #475569;">
                      <tr>
                        <td style="padding: 4px 0; width: 120px; font-weight: 600;">📅 Data / Hora:</td>
                        <td style="padding: 4px 0; color: #0f172a;">${eventDate || "A definir"}</td>
                      </tr>
                      <tr>
                        <td style="padding: 4px 0; font-weight: 600;">🏢 Local:</td>
                        <td style="padding: 4px 0; color: #0f172a;">${eventLocation}</td>
                      </tr>
                      <tr>
                        <td style="padding: 4px 0; font-weight: 600;">🎟️ Ingressos:</td>
                        <td style="padding: 4px 0; color: #0f172a;">${quantity} ${quantity === 1 ? "ingresso" : "ingressos"}</td>
                      </tr>
                      <tr>
                        <td style="padding: 4px 0; font-weight: 600;">💰 Total:</td>
                        <td style="padding: 4px 0; color: #0f172a; font-weight: 700; font-size: 14px;">${total}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              <table role="presentation" width="100%" style="margin-bottom: 12px;">
                <tr>
                  <td align="center">
                    <a href="${safeTargetLink}" target="_blank" style="display: inline-block; background-color: ${headerColor}; color: #ffffff; text-decoration: none; font-size: 15px; font-weight: 700; padding: 14px 28px; border-radius: 10px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); text-align: center;">
                      ${actionButtonText}
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin: 20px 0 0 0; text-align: center; font-size: 12px; color: #94a3b8;">
                Caso o botão acima não funcione, copie e cole este link no seu navegador:<br>
                <a href="${safeTargetLink}" style="color: #0284c7; word-break: break-all;">${safeTargetLink}</a>
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #f8fafc; padding: 20px 24px; border-top: 1px solid #e2e8f0; text-align: center;">
              <p style="margin: 0; color: #64748b; font-size: 12px;">
                Este é um e-mail automático do sistema Better Now.<br>
                Em caso de dúvidas, responda a este e-mail ou entre em contato com nossa equipe.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

/**
 * Disparador unificado e resiliente de notificações de pedidos (E-mail SMTP + WhatsApp WAHA)
 * Os dois canais operam de forma 100% independente através de Promise.allSettled.
 */
export async function sendOrderNotificationsFromBackend(params: OrderNotifierParams): Promise<{
  email: { success: boolean; message?: string; error?: any };
  whatsapp: { success: boolean; message?: string; error?: any };
}> {
  const { supabase, orderId, type = "confirmed" } = params;

  try {
    // 1. Buscar dados do pedido
    let order = params.orderData;
    if (!order || !order.event_id) {
      const { data: fetchedOrder, error: orderErr } = await supabase
        .from("app_event_orders")
        .select("*")
        .eq("id", orderId)
        .maybeSingle();

      if (orderErr || !fetchedOrder) {
        console.warn(`[Notifier] Pedido ${orderId} não encontrado no banco.`);
        return {
          email: { success: false, message: "Pedido não encontrado." },
          whatsapp: { success: false, message: "Pedido não encontrado." },
        };
      }
      order = fetchedOrder;
    }

    // 2. Carregar configurações do app_settings
    const { data: settingsRows } = await supabase
      .from("app_settings")
      .select("key, value")
      .in("key", [
        "email_smtp_user",
        "email_smtp_password",
        "email_outgoing_host",
        "email_smtp_port",
        "email_from_name",
        "email_from_address",
        "email_security",
        "email_auth_required",
        "email_enabled",
        "waha_api_url",
        "waha_session_name",
        "waha_api_key",
        "waha_enabled",
        "waha_msg_order_confirmed",
        "waha_msg_order_created",
        "waha_msg_order_cancelled",
        "email_msg_order_confirmed_subject",
        "email_msg_order_confirmed_body",
        "email_msg_order_created_subject",
        "email_msg_order_created_body",
      ]);

    const settings: Record<string, any> = {};
    (settingsRows || []).forEach((row: any) => {
      let val = row.value;
      if (typeof val === "string") {
        try {
          val = JSON.parse(val);
        } catch {}
      }
      settings[row.key] = val;
    });

    // 3. Buscar dados do evento
    const { data: eventRow } = await supabase
      .from("app_events")
      .select("*")
      .eq("id", order.event_id)
      .maybeSingle();

    const eventTitle = eventRow?.title || eventRow?.name || "Evento";
    let eventDate = eventRow?.event_date ? formatBrazilDate(eventRow.event_date) : "A definir";
    if (eventRow?.start_time) {
      eventDate = eventDate !== "A definir" ? `${eventDate} às ${eventRow.start_time}` : eventRow.start_time;
    }
    const eventLocation = eventRow?.location || "Local a definir";

    const origin = "https://betternow.cesire.com.br";
    const accessLink = `${origin}/eventos/${order.event_id}?payment=success&order_id=${order.id}`;
    const paymentLink =
      order.payment_url ||
      order.checkout_url ||
      `${origin}/eventos/${order.event_id}?payment=awaiting&order_id=${order.id}`;
    const orderNumber = order.id.substring(0, 8).toUpperCase();
    const formattedTotal = formatPrice(Number(order.amount_total) || 0);
    const clientName = order.client_name || "Cliente";

    const templateData: Record<string, any> = {
      cliente: clientName,
      numero_pedido: orderNumber,
      evento: eventTitle,
      total: formattedTotal,
      quantidade: order.quantity || 1,
      data_evento: eventDate,
      local_evento: eventLocation,
      link_acesso: accessLink,
      link_pagamento: paymentLink,
    };

    const replacePlaceholders = (text: string) => {
      return text.replace(/\{(\w+)\}/g, (_, k) => (templateData[k] !== undefined ? String(templateData[k]) : `{${k}}`));
    };

    // =========================================================================
    // CANAL 1: E-MAIL (SMTP) - ISOLADO
    // =========================================================================
    const sendEmailTask = async () => {
      const emailEnabled = settings.email_enabled !== false;
      const recipientEmail = order.client_email?.trim();

      if (!emailEnabled) {
        return { success: false, message: "E-mail desativado nas configurações." };
      }
      if (!recipientEmail) {
        return { success: false, message: "E-mail do cliente não informado no pedido." };
      }

      const smtpHost = settings.email_outgoing_host || "mail.cesire.com.br";
      const smtpPort = Number(settings.email_smtp_port) || 465;
      const smtpUser = settings.email_smtp_user || "betternow@cesire.com.br";
      const smtpPassword = settings.email_smtp_password || "";
      const fromName = settings.email_from_name || "Better Now";
      const fromAddress = settings.email_from_address || smtpUser;
      const isSecure = smtpPort === 465 || settings.email_security === "ssl_tls";

      const defaultSubject =
        type === "confirmed"
          ? `🎉 Ingressos Confirmados! Pedido #${orderNumber} - ${eventTitle}`
          : type === "created"
          ? `Pedido Recebido #${orderNumber} - ${eventTitle}`
          : `Pedido Cancelado #${orderNumber} - ${eventTitle}`;

      const defaultBody =
        type === "confirmed"
          ? `Parabéns, {cliente}!\n\nSeu pagamento para o evento {evento} foi confirmado com sucesso!\n\nDetalhes do Evento:\n- Data: {data_evento}\n- Local: {local_evento}\n- Quantidade de Ingressos: {quantidade}\n\nVocê pode visualizar seus ingressos e QR Codes no link abaixo:\n{link_acesso}`
          : type === "created"
          ? `Olá, {cliente}!\n\nRecebemos o seu pedido #{numero_pedido} para o evento {evento}.\n\nValor Total: {total}\nQuantidade de Ingressos: {quantidade}\n\nPara efetuar ou concluir o pagamento, acesse o link abaixo:\n{link_pagamento}`
          : `Olá, {cliente}.\n\nInformamos que seu pedido #{numero_pedido} para o evento {evento} foi cancelado.`;

      const rawSubject =
        (type === "confirmed"
          ? settings.email_msg_order_confirmed_subject
          : settings.email_msg_order_created_subject) || defaultSubject;
      const rawBody =
        (type === "confirmed"
          ? settings.email_msg_order_confirmed_body
          : settings.email_msg_order_created_body) || defaultBody;

      const finalSubject = replacePlaceholders(rawSubject);
      const finalBody = replacePlaceholders(rawBody);

      const emailHtml = generateHtmlEmail({
        type,
        clientName,
        orderNumber,
        eventTitle,
        total: formattedTotal,
        quantity: order.quantity || 1,
        eventDate,
        eventLocation,
        accessLink,
        paymentLink,
        contentBody: finalBody,
      });

      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: isSecure,
        connectionTimeout: 15000,
        tls: { rejectUnauthorized: false },
        auth: {
          user: smtpUser,
          pass: smtpPassword,
        },
      });

      const sender = fromName ? `"${fromName}" <${fromAddress}>` : fromAddress;

      const info = await transporter.sendMail({
        from: sender,
        to: recipientEmail,
        subject: finalSubject,
        text: finalBody,
        html: emailHtml,
      });

      console.log(`[Notifier Backend] E-mail enviado para ${recipientEmail} (MsgId: ${info.messageId})`);
      return { success: true, message: `E-mail enviado para ${recipientEmail}`, messageId: info.messageId };
    };

    // =========================================================================
    // CANAL 2: WHATSAPP (WAHA) - ISOLADO
    // =========================================================================
    const sendWahaTask = async () => {
      const wahaEnabled = settings.waha_enabled !== false;
      const recipientPhone = sanitizePhone(order.client_phone);

      if (!wahaEnabled) {
        return { success: false, message: "WhatsApp WAHA desativado nas configurações." };
      }
      if (!recipientPhone) {
        return { success: false, message: "Telefone do cliente não informado no pedido." };
      }

      let apiUrl = settings.waha_api_url || "";
      if (!apiUrl) {
        return { success: false, message: "URL da API do WAHA não configurada." };
      }
      apiUrl = apiUrl.replace(/\/+$/, "");

      const sessionName = settings.waha_session_name || "default";
      const apiKey = settings.waha_api_key || "";

      const defaultWahaMsg =
        type === "confirmed"
          ? `🎉 Parabéns, {cliente}! Seu pagamento para o evento *{evento}* foi confirmado com sucesso!\n\n🎟️ *Quantidade de Ingressos:* {quantidade}\n📅 *Data:* {data_evento}\n📍 *Local:* {local_evento}\n\nVocê pode acessar seus ingressos a qualquer momento através do link: {link_acesso}`
          : type === "created"
          ? `Olá, {cliente}! Recebemos seu pedido #{numero_pedido} para o evento *{evento}*.\n\n💰 *Total:* {total}\n⏳ *Status:* Aguardando Pagamento\n\n💳 *Link para Pagamento:* {link_pagamento}`
          : `Olá, {cliente}. Informamos que seu pedido #{numero_pedido} para o evento *{evento}* foi cancelado.`;

      const rawWahaMsg =
        (type === "confirmed"
          ? settings.waha_msg_order_confirmed
          : type === "created"
          ? settings.waha_msg_order_created
          : settings.waha_msg_order_cancelled) || defaultWahaMsg;

      const finalWahaText = replacePlaceholders(rawWahaMsg);
      const chatId = `${recipientPhone}@c.us`;

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (apiKey) {
        headers["X-Api-Key"] = apiKey;
      }

      const wahaRes = await fetch(`${apiUrl}/api/sendText`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          session: sessionName,
          chatId,
          text: finalWahaText,
        }),
      });

      if (!wahaRes.ok) {
        const errText = await wahaRes.text();
        console.warn(`[Notifier Backend] Erro no WAHA (${wahaRes.status}):`, errText);
        return { success: false, message: `Erro WAHA (${wahaRes.status}): ${errText}` };
      }

      console.log(`[Notifier Backend] Mensagem WAHA enviada para ${recipientPhone}`);
      return { success: true, message: `WhatsApp enviado para ${recipientPhone}` };
    };

    // Execução independente dos dois canais via Promise.allSettled
    const [emailResult, wahaResult] = await Promise.allSettled([sendEmailTask(), sendWahaTask()]);

    return {
      email:
        emailResult.status === "fulfilled"
          ? emailResult.value
          : { success: false, error: emailResult.reason?.message || emailResult.reason },
      whatsapp:
        wahaResult.status === "fulfilled"
          ? wahaResult.value
          : { success: false, error: wahaResult.reason?.message || wahaResult.reason },
    };
  } catch (err: any) {
    console.error("[Notifier Backend] Erro geral na rotina de notificação:", err);
    return {
      email: { success: false, error: err.message },
      whatsapp: { success: false, error: err.message },
    };
  }
}
