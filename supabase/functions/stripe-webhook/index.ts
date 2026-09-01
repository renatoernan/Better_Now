import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import Stripe from "https://esm.sh/stripe@16.0.0?target=deno";
import { sendOrderNotificationsFromBackend } from "../_shared/orderNotifier.ts";

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Método não permitido", { status: 405 });
  }

  const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
  const stripeWebhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

  if (!stripeSecretKey) {
    console.error("STRIPE_SECRET_KEY não definida");
    return new Response("Configuração do Stripe ausente", { status: 500 });
  }

  const stripe = new Stripe(stripeSecretKey, {
    apiVersion: "2024-06-20",
    httpClient: Stripe.createFetchHttpClient(),
  });

  const signature = req.headers.get("stripe-signature");
  const bodyText = await req.text();

  let event: Stripe.Event;

  try {
    if (stripeWebhookSecret && signature) {
      event = await stripe.webhooks.constructEventAsync(bodyText, signature, stripeWebhookSecret);
    } else {
      // Em modo de desenvolvimento sem secret configurado, parseia o JSON diretamente com warning
      console.warn("STRIPE_WEBHOOK_SECRET não configurado. Processando payload sem verificação de assinatura.");
      event = JSON.parse(bodyText) as Stripe.Event;
    }
  } catch (err: any) {
    console.error(`Falha na validação do Webhook Stripe: ${err.message}`);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY") || "";
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  console.log(`Evento Stripe recebido: ${event.type}`);

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const sessionId = session.id;
        const paymentIntentId = typeof session.payment_intent === "string" ? session.payment_intent : null;
        const metadata = session.metadata || {};

        console.log(`Checkout concluído com sucesso para a sessão: ${sessionId}`);

        // 1. Atualizar o status do pedido para 'paid'
        const { data: order, error: updateError } = await supabase
          .from("app_event_orders")
          .update({
            status: "paid",
            stripe_payment_intent_id: paymentIntentId,
            updated_at: new Date().toISOString(),
          })
          .eq("stripe_session_id", sessionId)
          .select()
          .single();

        let orderData = order;

        // Se o pedido não existia previamente na tabela, podemos criá-lo a partir dos metadados
        if (updateError || !orderData) {
          console.warn("Pedido não encontrado previamente via stripe_session_id. Criando registro a partir dos metadados...");
          const quantity = Number(metadata.quantity || 1);
          const amountTotal = (session.amount_total || 0) / 100;

          const { data: newOrder, error: insertError } = await supabase
            .from("app_event_orders")
            .insert({
              event_id: metadata.event_id || null,
              client_id: metadata.client_id || null,
              client_name: metadata.client_name || session.customer_details?.name || "",
              client_email: metadata.client_email || session.customer_details?.email || "",
              client_phone: metadata.client_phone || session.customer_details?.phone || "",
              stripe_session_id: sessionId,
              stripe_payment_intent_id: paymentIntentId,
              amount_total: amountTotal,
              currency: session.currency || "brl",
              quantity: quantity,
              batch_index: Number(metadata.batch_index || 0),
              batch_name: metadata.batch_name || "Lote Padrão",
              status: "paid",
            })
            .select()
            .single();

          if (insertError) {
            console.error("Erro ao criar pedido via webhook:", insertError);
          } else {
            orderData = newOrder;
          }
        }

        if (orderData) {
          // 2. Gerar N ingressos na tabela app_event_tickets com QR Code único
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
            .upsert(ticketsToInsert, { onConflict: "order_id,ticket_number", ignoreDuplicates: true })
            .select();

          if (ticketError) {
            console.error("Erro ao gerar ingressos:", ticketError);
          } else {
            console.log(`${createdTickets?.length || 0} ingressos gerados com sucesso.`);

            // 3. Disparar notificações automáticas e independentes (E-mail SMTP + WhatsApp WAHA)
            sendOrderNotificationsFromBackend({
              supabase,
              orderId: orderData.id,
              orderData,
              type: "confirmed",
            }).catch((notifErr) => {
              console.warn("Aviso no disparo de notificações Stripe:", notifErr);
            });
          }

          // Registrar utilização do cupom se o pedido possuir cupom
          if (orderData.coupon_id || orderData.coupon_code) {
            try {
              let targetCouponId = orderData.coupon_id;
              if (!targetCouponId && orderData.coupon_code) {
                const { data: cData } = await supabase
                  .from("app_event_coupons")
                  .select("id, current_uses")
                  .eq("event_id", orderData.event_id)
                  .ilike("code", String(orderData.coupon_code).trim())
                  .is("deleted_at", null)
                  .maybeSingle();
                if (cData) targetCouponId = cData.id;
              }

              if (targetCouponId) {
                const { data: existingUsage } = await supabase
                  .from("app_event_coupon_usages")
                  .select("id")
                  .eq("coupon_id", targetCouponId)
                  .eq("order_id", orderData.id)
                  .maybeSingle();

                if (!existingUsage) {
                  const discAmt = Number(orderData.discount_amount || 0);
                  const origAmt = Number(orderData.amount_total || 0) + discAmt;

                  await supabase.from("app_event_coupon_usages").insert({
                    coupon_id: targetCouponId,
                    order_id: orderData.id,
                    event_id: orderData.event_id,
                    client_name: orderData.client_name || null,
                    client_document: orderData.client_document || null,
                    client_phone: orderData.client_phone || null,
                    client_email: orderData.client_email || null,
                    batch_index: orderData.batch_index ?? 0,
                    discount_applied: discAmt,
                    original_amount: origAmt,
                    final_amount: Number(orderData.amount_total || 0),
                    used_at: new Date().toISOString(),
                  });

                  const { count: realUsageCount } = await supabase
                    .from("app_event_coupon_usages")
                    .select("id", { count: "exact", head: true })
                    .eq("coupon_id", targetCouponId);

                  await supabase
                    .from("app_event_coupons")
                    .update({ current_uses: realUsageCount || 1, updated_at: new Date().toISOString() })
                    .eq("id", targetCouponId);
                }
              }
            } catch (cpnErr) {
              console.warn("Aviso ao registrar uso de cupom no webhook Stripe:", cpnErr);
            }
          }
        }
        break;
      }

      case "checkout.session.expired":
      case "payment_intent.payment_failed": {
        const session = event.data.object as any;
        const sessionId = session.id;

        await supabase
          .from("app_event_orders")
          .update({
            status: event.type === "checkout.session.expired" ? "canceled" : "failed",
            updated_at: new Date().toISOString(),
          })
          .eq("stripe_session_id", sessionId);

        console.log(`Pedido da sessão ${sessionId} marcado como ${event.type}`);
        break;
      }

      default:
        console.log(`Evento ${event.type} ignorado.`);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("Erro interno no processamento do webhook:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
