import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Tratar requisição OPTIONS para CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const mpAccessToken = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN") || Deno.env.get("MP_ACCESS_TOKEN");
    if (!mpAccessToken) {
      throw new Error("MERCADOPAGO_ACCESS_TOKEN não foi configurada nas variáveis de ambiente do Supabase.");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY") || "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    const {
      event_id,
      batch_index,
      quantity,
      client_name,
      client_email,
      client_phone,
      client_id,
      payment_method,
      convenience_fee,
      convenience_fee_percentage,
      success_url,
      failure_url,
      pending_url
    } = body;

    if (!event_id || !quantity || quantity <= 0) {
      return new Response(
        JSON.stringify({ error: "Dados inválidos: event_id e quantidade são obrigatórios." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Buscar dados do evento no banco
    let { data: event, error: eventError } = await supabase
      .from("app_events")
      .select("id, title, price_batches, image_url")
      .eq("id", event_id)
      .single();

    if (eventError || !event) {
      const fallback = await supabase
        .from("events")
        .select("id, title, price_batches, image_url")
        .eq("id", event_id)
        .single();
      event = fallback.data;
    }

    if (!event) {
      return new Response(
        JSON.stringify({ error: "Evento não encontrado." }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Determinar o preço do lote selecionado
    let unitPrice = 0;
    let batchName = "Lote Geral";

    if (event.price_batches && Array.isArray(event.price_batches) && event.price_batches.length > 0) {
      const idx = batch_index !== undefined ? Number(batch_index) : 0;
      const batch = event.price_batches[idx] || event.price_batches[0];
      unitPrice = Number(batch.price) || 0;
      batchName = batch.name || `Lote ${idx + 1}`;
    }

    const subtotal = unitPrice * quantity;
    const fee = Number(convenience_fee) || (subtotal * ((Number(convenience_fee_percentage) || 0) / 100));
    const totalAmount = subtotal + fee;
    const itemUnitPrice = Number((totalAmount / quantity).toFixed(2));

    if (totalAmount <= 0) {
      return new Response(
        JSON.stringify({ error: "O valor total deve ser maior que zero para o checkout." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const origin = req.headers.get("origin") || "http://localhost:5173";
    const defaultSuccessUrl = success_url || `${origin}/eventos/${event_id}?payment=success`;
    const defaultFailureUrl = failure_url || `${origin}/eventos/${event_id}?payment=failure`;
    const defaultPendingUrl = pending_url || `${origin}/eventos/${event_id}?payment=pending`;

    // 1. Criar registro do pedido em app_event_orders com status 'pending'
    const { data: order, error: orderError } = await supabase
      .from("app_event_orders")
      .insert({
        event_id,
        client_id: client_id || null,
        client_name: client_name || "",
        client_email: client_email || "",
        client_phone: client_phone || "",
        amount_total: totalAmount,
        currency: "brl",
        quantity: quantity,
        batch_index: batch_index || 0,
        batch_name: batchName,
        status: "pending",
        payment_method: payment_method || "mercadopago",
        convenience_fee: fee,
        convenience_fee_percentage: Number(convenience_fee_percentage) || 0
      })
      .select()
      .single();

    if (orderError) {
      console.error("Erro ao registrar pedido pendente no Supabase:", orderError);
    }

    // 2. Criar a Preferência no Mercado Pago com suporte a parcelamento em até 12x
    const preferencePayload: any = {
      items: [
        {
          id: `${event_id}-${batch_index || 0}`,
          title: `${event.title} - ${batchName}`,
          description: `Ingresso(s) para o evento ${event.title} (${quantity}x)`,
          picture_url: event.image_url || undefined,
          quantity: quantity,
          currency_id: "BRL",
          unit_price: itemUnitPrice,
        },
      ],
      payer: {
        name: client_name || "Comprador",
        email: client_email || "cliente@betternow.com.br",
        phone: client_phone ? { number: client_phone.replace(/\D/g, "") } : undefined,
      },
      back_urls: {
        success: `${defaultSuccessUrl}&order_id=${order?.id || ""}`,
        failure: `${defaultFailureUrl}&order_id=${order?.id || ""}`,
        pending: `${defaultPendingUrl}&order_id=${order?.id || ""}`,
      },
      payment_methods: {
        installments: 12, // Permite parcelamento em até 12x no cartão
        default_installments: 1,
      },
      external_reference: order?.id || `${event_id}-${Date.now()}`,
      metadata: {
        order_id: order?.id,
        event_id: event_id,
        client_id: client_id,
        quantity: quantity,
        batch_index: batch_index,
      },
      notification_url: `${supabaseUrl}/functions/v1/mercadopago-webhook`,
    };

    const mpResponse = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${mpAccessToken}`,
      },
      body: JSON.stringify(preferencePayload),
    });

    const preferenceData = await mpResponse.json();

    if (!mpResponse.ok) {
      console.error("Erro retornado pela API do Mercado Pago:", preferenceData);
      return new Response(
        JSON.stringify({ error: preferenceData.message || "Erro ao gerar preferência no Mercado Pago." }),
        { status: mpResponse.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Atualizar o pedido com o preference_id do Mercado Pago
    if (order?.id && preferenceData.id) {
      await supabase
        .from("app_event_orders")
        .update({
          stripe_session_id: preferenceData.id, // Armazenar o id da sessão/preferência
          updated_at: new Date().toISOString()
        })
        .eq("id", order.id);
    }

    // Retorna a URL de checkout (sandbox_init_point se em teste ou init_point para produção)
    const checkoutUrl = preferenceData.sandbox_init_point || preferenceData.init_point;

    return new Response(
      JSON.stringify({
        preferenceId: preferenceData.id,
        initPoint: preferenceData.init_point,
        sandboxInitPoint: preferenceData.sandbox_init_point,
        checkoutUrl: checkoutUrl,
        orderId: order?.id
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("Erro na Edge Function create-mercadopago-preference:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Erro interno ao gerar o checkout do Mercado Pago." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
