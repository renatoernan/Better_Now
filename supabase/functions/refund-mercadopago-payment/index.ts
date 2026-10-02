import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { extractGatewayFinancials, fetchMercadoPagoPayment } from "../_shared/mpFinancials.ts";

/**
 * Reembolso de pedidos pagos pelo Mercado Pago.
 *
 * Até aqui o reembolso do sistema só marcava o pedido no banco e nunca chegava
 * ao MP: o comprador não recebia o dinheiro e o pedido ficava divergente do MP.
 * Esta função faz o estorno de verdade e só então registra no sistema, com os
 * valores que o MP devolve.
 *
 * Ações (só administradores):
 *   refund   — estorna no MP (total ou parcial) e registra no pedido
 *   register — só registra no sistema; para estorno já feito no painel do MP
 *   undo     — desfaz um reembolso registrado no sistema que não aconteceu no MP
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const round2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;
const CENT = 0.01;

/**
 * Recusas do MP traduzidas para quem opera: o que aconteceu e o que fazer.
 * A mensagem original segue entre parênteses para suporte.
 */
const explainMpRefusal = (raw: string): string => {
  const msg = raw.toLowerCase();
  if (msg.includes("enough available money") || msg.includes("insufficient")) {
    return "Saldo disponível insuficiente na conta do Mercado Pago. O estorno sai do saldo disponível da conta, e o valor desta venda já foi sacado ou transferido. Deposite saldo na conta do MP (um Pix para a própria conta resolve) e tente de novo.";
  }
  if (msg.includes("invalid refund amount") || msg.includes("amount")) {
    return "Valor de estorno recusado pelo Mercado Pago. Confira se não excede o valor ainda disponível para estorno.";
  }
  if (msg.includes("payment too old") || msg.includes("expired") || msg.includes("180")) {
    return "Prazo de estorno pelo Mercado Pago encerrado (180 dias após a venda). Devolva ao comprador por fora (Pix) e use \"Já estornei no painel do Mercado Pago\" para registrar.";
  }
  if (msg.includes("chargeback") || msg.includes("mediation") || msg.includes("dispute")) {
    return "Pagamento em disputa ou chargeback no Mercado Pago: o estorno fica bloqueado até a disputa terminar.";
  }
  if (msg.includes("status")) {
    return "O status atual do pagamento no Mercado Pago não permite estorno.";
  }
  return "O Mercado Pago recusou o estorno.";
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const mpAccessToken = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN") || Deno.env.get("MP_ACCESS_TOKEN");

    const authHeader = req.headers.get("Authorization") ?? "";
    const asCaller = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: isAdmin, error: adminErr } = await asCaller.rpc("is_mural_admin");
    if (adminErr || !isAdmin) {
      return json({ ok: false, message: "Acesso restrito a administradores." }, 403);
    }

    const { order_id, action = "refund", amount = null, reason = null } = await req.json().catch(() => ({}));
    if (!order_id) return json({ ok: false, message: "Informe o pedido." }, 400);

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: order, error: orderErr } = await admin
      .from("app_event_orders")
      .select("id, status, amount_total, refund_amount, refunded_at, stripe_session_id, payment_method")
      .eq("id", order_id)
      .maybeSingle();

    if (orderErr) throw orderErr;
    if (!order) return json({ ok: false, message: "Pedido não encontrado." }, 404);

    const paymentId = String(order.stripe_session_id || "");
    const viaMp = /^\d+$/.test(paymentId) && order.payment_method !== "pix_chave";
    const gross = round2(order.amount_total);
    const now = new Date().toISOString();

    // Grava no pedido o estado de estorno exatamente como o MP informa
    const applyMirror = async (payment: any, extra: Record<string, unknown>) => {
      const gateway = extractGatewayFinancials(payment);
      const { error } = await admin
        .from("app_event_orders")
        .update({ ...(gateway || {}), ...extra, updated_at: now })
        .eq("id", order.id);
      if (error) throw error;
    };

    const cancelTickets = async () => {
      await admin.from("app_event_tickets").update({ status: "cancelled" }).eq("order_id", order.id);
    };

    // -------------------------------------------------------------- undo
    if (action === "undo") {
      if (order.status !== "refunded" && !order.refunded_at) {
        return json({ ok: false, message: "Este pedido não está reembolsado no sistema." }, 409);
      }
      if (viaMp && mpAccessToken) {
        const payment = await fetchMercadoPagoPayment(paymentId, mpAccessToken);
        if (payment && Number(payment.transaction_amount_refunded || 0) > CENT) {
          return json({
            ok: false,
            message: "O Mercado Pago registra estorno neste pagamento. Não é possível desfazer: o dinheiro já voltou ao comprador.",
          }, 409);
        }
      }

      const { error } = await admin
        .from("app_event_orders")
        .update({ status: "paid", refunded_at: null, refund_amount: null, refund_reason: null, updated_at: now })
        .eq("id", order.id);
      if (error) throw error;

      // Ingressos voltam a valer, exceto os que já tinham feito check-in
      await admin
        .from("app_event_tickets")
        .update({ status: "valid" })
        .eq("order_id", order.id)
        .in("status", ["cancelled", "canceled"]);

      return json({ ok: true, action: "undo" });
    }

    // -------------------------------------------------------------- register
    if (action === "register") {
      let refunded = amount != null ? round2(amount) : gross;
      let payment: any = null;
      if (viaMp && mpAccessToken) {
        payment = await fetchMercadoPagoPayment(paymentId, mpAccessToken);
        const mpRefunded = round2(payment?.transaction_amount_refunded || 0);
        // Havendo estorno no MP, o valor registrado é o do MP
        if (mpRefunded > CENT) refunded = mpRefunded;
      }
      const isTotal = refunded >= gross - CENT;
      const extra = {
        status: isTotal ? "refunded" : order.status,
        refunded_at: now,
        refund_amount: refunded,
        refund_reason: reason || "Estorno feito no painel do Mercado Pago",
      };
      if (payment) await applyMirror(payment, extra);
      else {
        const { error } = await admin.from("app_event_orders").update({ ...extra, updated_at: now }).eq("id", order.id);
        if (error) throw error;
      }
      if (isTotal) await cancelTickets();
      return json({ ok: true, action: "register", refunded_amount: refunded, total: isTotal });
    }

    // -------------------------------------------------------------- refund
    if (!viaMp) {
      return json({ ok: false, message: "Este pedido não foi pago pelo Mercado Pago. Use a opção de apenas registrar." }, 400);
    }
    if (!mpAccessToken) {
      return json({ ok: false, message: "MERCADOPAGO_ACCESS_TOKEN não configurada." }, 500);
    }

    const before = await fetchMercadoPagoPayment(paymentId, mpAccessToken);
    if (!before) return json({ ok: false, message: "Pagamento não encontrado no Mercado Pago." }, 404);

    const mpGross = round2(before.transaction_amount);
    const alreadyRefunded = round2(before.transaction_amount_refunded || 0);
    const refundable = round2(mpGross - alreadyRefunded);
    if (refundable <= CENT) {
      // Nada a estornar: só alinha o sistema ao MP
      await applyMirror(before, {
        status: "refunded", refunded_at: order.refunded_at || now, refund_amount: alreadyRefunded,
      });
      await cancelTickets();
      return json({ ok: true, action: "refund", refunded_amount: alreadyRefunded, total: true, already: true });
    }

    const requested = amount != null ? round2(amount) : refundable;
    if (requested <= 0 || requested > refundable + CENT) {
      return json({ ok: false, message: `Valor inválido. Disponível para estorno no MP: R$ ${refundable.toFixed(2)}.` }, 400);
    }
    const isPartial = requested < refundable - CENT;

    // A chave inclui o que já foi estornado: repetir a mesma solicitação (rede
    // caiu, clique duplo) não gera um segundo estorno
    const idempotencyKey = `refund-${order.id}-${Math.round(requested * 100)}-${Math.round(alreadyRefunded * 100)}`;

    const res = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}/refunds`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${mpAccessToken}`,
        "X-Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify(isPartial ? { amount: requested } : {}),
    });
    const body = await res.json().catch(() => ({}));

    if (!res.ok) {
      console.error("refund-mercadopago-payment MP error:", res.status, body);
      const mpMessage = body?.message || body?.cause?.[0]?.description || "erro desconhecido";
      return json({ ok: false, message: `${explainMpRefusal(mpMessage)} (MP: ${mpMessage})` }, 502);
    }

    // Relê o pagamento para registrar exatamente o que o MP passou a informar
    const after = (await fetchMercadoPagoPayment(paymentId, mpAccessToken)) || before;
    const refundedTotal = round2(after.transaction_amount_refunded || alreadyRefunded + requested);
    const isTotal = refundedTotal >= mpGross - CENT;

    await applyMirror(after, {
      status: isTotal ? "refunded" : order.status,
      refunded_at: now,
      refund_amount: refundedTotal,
      refund_reason: reason || null,
    });
    if (isTotal) await cancelTickets();

    return json({ ok: true, action: "refund", refunded_amount: refundedTotal, total: isTotal, refund_id: body?.id ?? null });
  } catch (err) {
    console.error("refund-mercadopago-payment:", err);
    return json({ ok: false, message: "Erro ao processar o reembolso." }, 500);
  }
});
