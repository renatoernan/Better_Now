import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import Stripe from "https://esm.sh/stripe@16.0.0?target=deno";

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
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeSecretKey) {
      throw new Error("STRIPE_SECRET_KEY não foi configurada nas variáveis de ambiente.");
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2024-06-20",
      httpClient: Stripe.createFetchHttpClient(),
    });

    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY") || "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    const { event_id, batch_index, quantity, client_name, client_email, client_phone, client_id, success_url, cancel_url } = body;

    if (!event_id || !quantity || quantity <= 0) {
      return new Response(
        JSON.stringify({ error: "Dados inválidos: event_id e quantidade são obrigatórios." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Buscar dados do evento no banco de dados
    let { data: event, error: eventError } = await supabase
      .from("app_events")
      .select("id, title, price_batches")
      .eq("id", event_id)
      .single();

    if (eventError || !event) {
      const fallback = await supabase
        .from("events")
        .select("id, title, price_batches")
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

    // Converter para centavos
    const unitAmountCents = Math.round(unitPrice * 100);

    if (unitAmountCents <= 0) {
      return new Response(
        JSON.stringify({ error: "O valor do ingresso deve ser maior que zero para checkout Stripe." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // URL de retorno padrão se não enviada
    const origin = req.headers.get("origin") || "http://localhost:5173";
    const defaultSuccessUrl = success_url || `${origin}/eventos/${event_id}?payment=success&session_id={CHECKOUT_SESSION_ID}`;
    const defaultCancelUrl = cancel_url || `${origin}/eventos/${event_id}?payment=cancel`;

    // Criar a sessão no Stripe Checkout
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "brl",
            product_data: {
              name: `${event.title} - ${batchName}`,
              description: `Ingresso para ${event.title} (${quantity}x)`,
            },
            unit_amount: unitAmountCents,
          },
          quantity: quantity,
        },
      ],
      mode: "payment",
      success_url: defaultSuccessUrl,
      cancel_url: defaultCancelUrl,
      customer_email: client_email || undefined,
      metadata: {
        event_id,
        client_id: client_id || "",
        client_name: client_name || "",
        client_email: client_email || "",
        client_phone: client_phone || "",
        batch_index: String(batch_index || 0),
        batch_name: batchName,
        quantity: String(quantity),
      },
    });

    // Criar registro de pedido pendente no Supabase
    const { data: order, error: orderError } = await supabase
      .from("event_orders")
      .insert({
        event_id,
        client_id: client_id || null,
        client_name: client_name || "",
        client_email: client_email || "",
        client_phone: client_phone || "",
        stripe_session_id: session.id,
        amount_total: (unitAmountCents * quantity) / 100,
        currency: "brl",
        quantity: quantity,
        batch_index: batch_index || 0,
        batch_name: batchName,
        status: "pending",
      })
      .select()
      .single();

    if (orderError) {
      console.error("Erro ao registrar pedido pendente:", orderError);
    }

    return new Response(
      JSON.stringify({ sessionId: session.id, url: session.url, orderId: order?.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("Erro na Edge Function create-checkout-session:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Erro interno ao processar o checkout." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
