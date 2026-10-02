import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { extractGatewayFinancials, fetchMercadoPagoPayment } from "../_shared/mpFinancials.ts";

/**
 * Busca no Mercado Pago a taxa real, o líquido e a data de liberação dos
 * pedidos pagos de um evento e grava nas colunas de gateway.
 *
 * Serve ao controle de repasses: preenche o histórico anterior à migration 044
 * e atualiza a liberação do dinheiro (cartão fica retido alguns dias no MP).
 * Só administradores chamam; a escrita usa service_role.
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

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const mpAccessToken = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN") || Deno.env.get("MP_ACCESS_TOKEN");

    if (!mpAccessToken) {
      return json({ ok: false, message: "MERCADOPAGO_ACCESS_TOKEN não configurada." }, 500);
    }

    // Confere que quem chama é administrador, com o token da própria sessão
    const authHeader = req.headers.get("Authorization") ?? "";
    const asCaller = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: isAdmin, error: adminErr } = await asCaller.rpc("is_mural_admin");
    if (adminErr || !isAdmin) {
      return json({ ok: false, message: "Acesso restrito a administradores." }, 403);
    }

    const { event_id, order_ids, only_missing = false } = await req.json().catch(() => ({}));
    if (!event_id && !(Array.isArray(order_ids) && order_ids.length)) {
      return json({ ok: false, message: "Informe event_id ou order_ids." }, 400);
    }

    const admin = createClient(supabaseUrl, serviceKey);

    let query = admin
      .from("app_event_orders")
      .select("id, stripe_session_id, payment_method, gateway_fee, money_release_status")
      .in("status", ["paid", "approved", "refunded"])
      .gt("amount_total", 0)
      .not("stripe_session_id", "is", null);

    if (Array.isArray(order_ids) && order_ids.length) query = query.in("id", order_ids);
    else query = query.eq("event_id", event_id);

    const { data: orders, error } = await query;
    if (error) throw error;

    const targets = (orders || []).filter((o) =>
      o.payment_method !== "pix_chave" &&
      // Sem only_missing, ressincroniza também o que ainda não foi liberado
      (!only_missing || o.gateway_fee == null || o.money_release_status !== "released")
    );

    let synced = 0;
    const failed: string[] = [];

    for (const order of targets) {
      const payment = await fetchMercadoPagoPayment(String(order.stripe_session_id), mpAccessToken);
      const gateway = extractGatewayFinancials(payment);
      if (!gateway) {
        failed.push(order.id);
        continue;
      }

      const { error: upErr } = await admin
        .from("app_event_orders")
        .update(gateway)
        .eq("id", order.id);

      if (upErr) failed.push(order.id);
      else synced++;
    }

    return json({ ok: true, total: targets.length, synced, failed });
  } catch (err) {
    console.error("sync-order-financials:", err);
    return json({ ok: false, message: "Erro ao sincronizar com o Mercado Pago." }, 500);
  }
});
