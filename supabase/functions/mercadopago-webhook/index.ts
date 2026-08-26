import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-signature, x-request-id",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

// Função para validar a assinatura criptográfica x-signature do Mercado Pago (HMAC SHA-256)
async function verifyMercadoPagoSignature(
  req: Request,
  webhookSecret?: string
): Promise<boolean> {
  if (!webhookSecret) return true; // Se a chave secreta de webhook não estiver configurada, não bloqueia

  const xSignature = req.headers.get("x-signature");
  const xRequestId = req.headers.get("x-request-id");
  if (!xSignature || !xRequestId) return false;

  const parts = xSignature.split(",");
  let ts = "";
  let v1 = "";
  for (const part of parts) {
    const [k, v] = part.trim().split("=");
    if (k === "ts") ts = v;
    if (k === "v1") v1 = v;
  }

  if (!ts || !v1) return false;

  const url = new URL(req.url);
  const dataId = url.searchParams.get("data.id") || "";

  // Template de assinatura Mercado Pago: id:[data.id_url];request-id:[x-request-id_header];ts:[ts_header];
  const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;

  try {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(webhookSecret);
    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const signature = await crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(manifest));
    const hashHex = Array.from(new Uint8Array(signature))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    return hashHex === v1;
  } catch (err) {
    console.warn("Aviso ao validar assinatura x-signature:", err);
    return false;
  }
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const mpAccessToken = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN") || Deno.env.get("MP_ACCESS_TOKEN");
    if (!mpAccessToken) {
      console.error("MERCADOPAGO_ACCESS_TOKEN não configurada.");
      return new Response(JSON.stringify({ error: "Configuração do gateway ausente." }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const webhookSecret = Deno.env.get("MERCADOPAGO_WEBHOOK_SECRET");
    if (webhookSecret) {
      const isValid = await verifyMercadoPagoSignature(req, webhookSecret);
      if (!isValid) {
        console.warn("Assinatura x-signature do Webhook Mercado Pago inválida ou forjada.");
        return new Response(JSON.stringify({ error: "Assinatura do webhook inválida." }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY") || "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const url = new URL(req.url);
    const searchParams = url.searchParams;

    let paymentId = searchParams.get("data.id") || searchParams.get("id");
    let topic = searchParams.get("type") || searchParams.get("topic");

    if (!paymentId && req.method === "POST") {
      try {
        const body = await req.json();
        paymentId = body?.data?.id || body?.id;
        topic = body?.type || body?.topic || topic;
      } catch {
        // Body não é JSON
      }
    }

    console.log(`Webhook Mercado Pago recebido. Topic: ${topic}, PaymentId: ${paymentId}`);

    if (!paymentId) {
      return new Response(JSON.stringify({ message: "Nenhum ID de pagamento recebido." }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Consultar dados do pagamento de forma autenticada no Mercado Pago
    const mpPaymentRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: {
        Authorization: `Bearer ${mpAccessToken}`,
      },
    });

    if (!mpPaymentRes.ok) {
      console.error(`Erro ao consultar pagamento ${paymentId} no Mercado Pago:`, await mpPaymentRes.text());
      return new Response(JSON.stringify({ error: "Erro ao consultar pagamento." }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payment = await mpPaymentRes.json();
    console.log(`Status do pagamento ${paymentId}: ${payment.status}, ExternalReference: ${payment.external_reference}`);

    const externalRef = payment.external_reference; // ID do pedido em app_event_orders
    const paymentStatus = payment.status; // 'approved', 'pending', 'in_process', 'rejected', 'cancelled', 'refunded'

    let mappedStatus = "pending";
    if (paymentStatus === "approved") {
      mappedStatus = "paid";
    } else if (paymentStatus === "rejected" || paymentStatus === "cancelled") {
      mappedStatus = "failed";
    } else if (paymentStatus === "refunded") {
      mappedStatus = "canceled";
    }

    let orderData = null;

    if (externalRef) {
      const { data: order, error: orderErr } = await supabase
        .from("app_event_orders")
        .select("*")
        .eq("id", externalRef)
        .single();

      if (order && !orderErr) {
        orderData = order;
      }
    }

    if (!orderData && payment.metadata?.order_id) {
      const { data: order } = await supabase
        .from("app_event_orders")
        .select("*")
        .eq("id", payment.metadata.order_id)
        .single();
      if (order) orderData = order;
    }

    if (orderData) {
      // Atualizar status do pedido
      await supabase
        .from("app_event_orders")
        .update({
          status: mappedStatus,
          stripe_payment_intent_id: String(paymentId),
          updated_at: new Date().toISOString(),
        })
        .eq("id", orderData.id);

      // Se o pagamento foi aprovado e ainda não tem ingressos gerados, gerar agora
      if (mappedStatus === "paid") {
        const { data: existingTickets } = await supabase
          .from("app_event_tickets")
          .select("id")
          .eq("order_id", orderData.id);

        if (!existingTickets || existingTickets.length === 0) {
          const quantity = orderData.quantity || 1;
          const ticketsToInsert = [];

          for (let i = 1; i <= quantity; i++) {
            const randomCode = crypto.randomUUID().split("-")[0].toUpperCase();
            const qrCodeHash = `BN-${orderData.event_id.slice(0, 4)}-${i}-${randomCode}`;

            ticketsToInsert.push({
              order_id: orderData.id,
              event_id: orderData.event_id,
              client_id: orderData.client_id || null,
              ticket_number: i,
              qr_code_hash: qrCodeHash,
              status: "valid",
            });
          }

          const { data: createdTickets, error: ticketError } = await supabase
            .from("app_event_tickets")
            .insert(ticketsToInsert)
            .select();

          if (ticketError) {
            console.error("Erro ao gerar ingressos:", ticketError);
          } else {
            console.log(`${createdTickets?.length || 0} ingressos gerados com sucesso para o pedido ${orderData.id}`);

            // Disparar Webhook para n8n (WhatsApp / E-mail) se configurado
            const n8nWebhookUrl = Deno.env.get("N8N_PURCHASE_WEBHOOK_URL");
            if (n8nWebhookUrl) {
              try {
                await fetch(n8nWebhookUrl, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    event: "ticket_purchased",
                    payment_gateway: "mercadopago",
                    order: orderData,
                    tickets: createdTickets,
                    payment_info: {
                      payment_id: paymentId,
                      payment_type: payment.payment_type_id,
                      payment_method: payment.payment_method_id,
                      installments: payment.installments,
                    },
                    client: {
                      name: orderData.client_name,
                      email: orderData.client_email,
                      phone: orderData.client_phone,
                    },
                  }),
                });
              } catch (n8nErr) {
                console.error("Erro ao disparar webhook para n8n:", n8nErr);
              }
            }
          }
        }
      }
    }

    return new Response(JSON.stringify({ success: true, status: mappedStatus }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("Erro no Webhook Mercado Pago:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
