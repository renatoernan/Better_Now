import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-idempotency-key",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req: Request) => {
  // Tratar preflight CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Método não permitido. Utilize POST." }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const mpAccessToken = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN") || Deno.env.get("MP_ACCESS_TOKEN");
    if (!mpAccessToken) {
      console.error("MERCADOPAGO_ACCESS_TOKEN não configurada no ambiente do Supabase.");
      return new Response(
        JSON.stringify({ error: "Configuração de pagamento indisponível no servidor. Entre em contato com o suporte." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY") || "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json().catch(() => ({}));
    const {
      event_id,
      batch_index = 0,
      quantity = 1,
      payment_method = "credit_card", // 'credit_card' | 'pix'
      card_token,
      payment_method_id,
      installments = 1,
      issuer_id,
      client_name,
      client_email,
      client_phone,
      client_document,
      client_id,
      coupon_code,
      coupon_id,
      convenience_fee_percentage = 0,
      existing_order_id,
      attendees,
      ip_address,
    } = body;

    // 1. Validações básicas de entrada
    if (!event_id || !quantity || Number(quantity) <= 0) {
      return new Response(
        JSON.stringify({ error: "Parâmetros inválidos: event_id e quantidade são obrigatórios." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (payment_method === "credit_card" && !card_token) {
      return new Response(
        JSON.stringify({ error: "Token do cartão não fornecido para pagamento com cartão." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Buscar dados oficiais do evento no banco de dados (ZERO-TRUST CLIENT)
    const { data: event, error: eventError } = await supabase
      .from("app_events")
      .select("*")
      .eq("id", event_id)
      .maybeSingle();

    if (eventError || !event) {
      console.error("Erro ao buscar evento no banco:", eventError);
      return new Response(
        JSON.stringify({ error: "Evento não encontrado ou indisponível." }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Identificar lote oficial e preço real a partir de observations (ou price_batches se existir)
    let batches: any[] = [];
    if (event.observations) {
      try {
        const parsed = typeof event.observations === "string" ? JSON.parse(event.observations) : event.observations;
        if (Array.isArray(parsed?.price_batches)) {
          batches = parsed.price_batches;
        }
      } catch {
        // Ignora erro de parse
      }
    }
    if (batches.length === 0 && Array.isArray((event as any).price_batches)) {
      batches = (event as any).price_batches;
    }

    const bIndex = Number(batch_index) || 0;
    const targetBatch = batches[bIndex] || batches[0] || {};
    const unitPrice = Number(targetBatch?.price) || 0;
    const batchName = targetBatch?.name || `Lote ${bIndex + 1}`;

    // 3. Validação de Estoque / Lote Esgotado
    if (targetBatch && targetBatch.quantity && Number(targetBatch.quantity) > 0) {
      const { data: approvedOrders } = await supabase
        .from("app_event_orders")
        .select("quantity")
        .eq("event_id", event_id)
        .eq("batch_index", bIndex)
        .in("status", ["approved", "paid", "completed"]);

      const totalSold = (approvedOrders || []).reduce(
        (acc: number, curr: any) => acc + (Number(curr.quantity) || 1),
        0
      );
      const remaining = Math.max(0, Number(targetBatch.quantity) - totalSold);

      if (remaining <= 0) {
        return new Response(
          JSON.stringify({ error: `O lote "${batchName}" está esgotado.` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (Number(quantity) > remaining) {
        return new Response(
          JSON.stringify({ error: `Restam apenas ${remaining} ingressos disponíveis para este lote.` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const rawSubtotal = unitPrice * Number(quantity);

    // 4. Validação Segura do Cupom de Desconto em app_event_coupons
    let validatedDiscount = 0;
    let validCouponId = coupon_id || null;
    let appliedCouponCode = coupon_code || null;

    if (coupon_code || coupon_id) {
      try {
        let query = supabase.from("app_event_coupons").select("*").eq("is_active", true);
        if (coupon_id) {
          query = query.eq("id", coupon_id);
        } else if (coupon_code) {
          query = query.ilike("code", String(coupon_code).trim());
        }

        const { data: couponData } = await query.maybeSingle();

        if (couponData) {
          const now = new Date();
          const isValidDate =
            (!couponData.valid_from || new Date(couponData.valid_from) <= now) &&
            (!couponData.valid_until || new Date(couponData.valid_until) >= now);
          const isValidEvent = !couponData.event_id || couponData.event_id === event_id;
          const hasUsesLeft =
            couponData.max_uses === null ||
            couponData.max_uses === undefined ||
            Number(couponData.current_uses || 0) < Number(couponData.max_uses);

          if (isValidDate && isValidEvent && hasUsesLeft) {
            validCouponId = couponData.id;
            appliedCouponCode = couponData.code;
            if (couponData.discount_type === "percentage") {
              validatedDiscount = (rawSubtotal * Number(couponData.discount_value)) / 100;
            } else {
              validatedDiscount = Math.min(rawSubtotal, Number(couponData.discount_value));
            }
          }
        }
      } catch (couponErr) {
        console.warn("Aviso ao validar cupom de desconto:", couponErr);
      }
    }

    const subtotal = Math.max(0, rawSubtotal - validatedDiscount);
    const feeRate = Number(convenience_fee_percentage) || 0;
    const feeAmount = subtotal * (feeRate / 100);
    const totalAmount = Number((subtotal + feeAmount).toFixed(2));

    if (totalAmount <= 0) {
      return new Response(
        JSON.stringify({ error: "O valor final do pedido deve ser maior que zero." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 5. Criação ou Atualização do Pedido em app_event_orders com valores auditados
    const cleanDoc = client_document ? String(client_document).replace(/\D/g, "") : null;
    let orderId = existing_order_id || null;
    let orderRecord = null;

    if (orderId) {
      const { data: updatedOrder } = await supabase
        .from("app_event_orders")
        .update({
          client_id: client_id || null,
          client_name: client_name || "",
          client_email: client_email || "",
          client_phone: client_phone || "",
          client_document: cleanDoc,
          amount_total: totalAmount,
          batch_index: bIndex,
          batch_name: batchName,
          payment_method: payment_method,
          convenience_fee: feeAmount,
          convenience_fee_percentage: feeRate,
          coupon_id: validCouponId,
          coupon_code: appliedCouponCode,
          discount_amount: validatedDiscount,
          cancellation_reason: attendees ? JSON.stringify(attendees) : null,
          ip_address: ip_address || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", orderId)
        .select()
        .single();

      orderRecord = updatedOrder;
    }

    if (!orderRecord) {
      const { data: newOrder, error: insertError } = await supabase
        .from("app_event_orders")
        .insert({
          event_id: event_id,
          client_id: client_id || null,
          client_name: client_name || "",
          client_email: client_email || "",
          client_phone: client_phone || "",
          client_document: cleanDoc,
          ip_address: ip_address || null,
          amount_total: totalAmount,
          currency: "brl",
          quantity: Number(quantity),
          batch_index: bIndex,
          batch_name: batchName,
          status: "pending",
          payment_method: payment_method,
          convenience_fee: feeAmount,
          convenience_fee_percentage: feeRate,
          coupon_id: validCouponId,
          coupon_code: appliedCouponCode,
          discount_amount: validatedDiscount,
          cancellation_reason: attendees ? JSON.stringify(attendees) : null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (insertError) {
        console.error("Erro ao persistir pedido:", insertError);
      }
      orderRecord = newOrder;
      orderId = newOrder?.id;
    }

    // 6. Preparar Payload Oficial para API do Mercado Pago
    const nameParts = (client_name || "Comprador").trim().split(/\s+/);
    const firstName = nameParts[0] || "Comprador";
    const lastName = nameParts.slice(1).join(" ") || "Cliente";
    const payerEmail = client_email?.trim() || "comprador@betternow.com.br";

    const idempotencyKey = `pay-${orderId}-${Date.now()}`;

    let mpPayload: any = {
      transaction_amount: totalAmount,
      description: `Ingresso - ${event.title || "Evento"} (${batchName}) [${quantity}x]`,
      payer: {
        email: payerEmail,
        first_name: firstName,
        last_name: lastName,
        identification: cleanDoc && cleanDoc.length === 11 ? {
          type: "CPF",
          number: cleanDoc,
        } : undefined,
      },
      external_reference: String(orderId),
      notification_url: `${supabaseUrl}/functions/v1/mercadopago-webhook`,
      metadata: {
        order_id: orderId,
        event_id: event_id,
        client_id: client_id,
        quantity: quantity,
        batch_index: bIndex,
      },
    };

    if (payment_method === "credit_card") {
      mpPayload = {
        ...mpPayload,
        token: card_token,
        installments: Number(installments) || 1,
        payment_method_id: payment_method_id || undefined,
        issuer_id: issuer_id ? Number(issuer_id) : undefined,
      };
    } else if (payment_method === "pix") {
      mpPayload = {
        ...mpPayload,
        payment_method_id: "pix",
      };
    }

    // 7. Chamada Segura à API do Mercado Pago no Servidor
    const mpResponse = await fetch("https://api.mercadopago.com/v1/payments", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${mpAccessToken}`,
        "X-Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify(mpPayload),
    });

    const mpData = await mpResponse.json();

    if (!mpResponse.ok || !mpData.id) {
      console.error("Erro da API do Mercado Pago:", mpData);
      const errMsg =
        mpData?.message ||
        mpData?.cause?.[0]?.description ||
        "Não foi possível processar o pagamento com a operadora.";

      return new Response(
        JSON.stringify({
          success: false,
          status: "rejected",
          orderId: orderId || "",
          paymentId: "",
          error: errMsg,
          details: mpData?.cause || null,
        }),
        { status: mpResponse.status >= 400 && mpResponse.status < 500 ? 200 : 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const paymentId = String(mpData.id);
    const paymentStatus = mpData.status; // 'approved', 'in_process', 'pending', 'rejected'
    const statusDetail = mpData.status_detail;

    // 8. Atualizar registro do pedido com o ID da transação
    if (orderId) {
      const updateData: any = {
        stripe_session_id: paymentId,
        updated_at: new Date().toISOString(),
      };

      if (paymentStatus === "approved") {
        updateData.status = "paid";
      } else if (paymentStatus === "rejected") {
        updateData.status = "failed";
      }

      await supabase
        .from("app_event_orders")
        .update(updateData)
        .eq("id", orderId);
    }

    // 9. Processamento de Sucesso / Aprovação Imediata
    if (paymentStatus === "approved") {
      // Incrementar uso do cupom se aplicável
      if (validCouponId) {
        try {
          const { data: cpn } = await supabase
            .from("app_event_coupons")
            .select("current_uses")
            .eq("id", validCouponId)
            .single();

          if (cpn) {
            await supabase
              .from("app_event_coupons")
              .update({ current_uses: (Number(cpn.current_uses) || 0) + 1 })
              .eq("id", validCouponId);
          }
        } catch {
          // Silencioso
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          status: "approved",
          statusDetail,
          orderId: orderId || "",
          paymentId,
          amountTotal: totalAmount,
          message: "Pagamento aprovado com sucesso! Seus ingressos foram emitidos! 🎉",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 10. Resposta para Pagamento PIX (com QR Code)
    if (payment_method === "pix") {
      const pointOfInteraction = mpData.point_of_interaction;
      const transactionData = pointOfInteraction?.transaction_data;
      const qrCode = transactionData?.qr_code;
      const qrCodeBase64 = transactionData?.qr_code_base64;
      const ticketUrl = transactionData?.ticket_url;
      const expirationDate = mpData.date_of_expiration;

      return new Response(
        JSON.stringify({
          success: true,
          status: paymentStatus || "pending",
          orderId: orderId || "",
          paymentId,
          qrCode,
          qrCodeBase64,
          ticketUrl,
          expirationDate,
          amount: totalAmount,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 11. Resposta para Cartão em Análise ou Pendente
    return new Response(
      JSON.stringify({
        success: paymentStatus !== "rejected",
        status: paymentStatus,
        statusDetail,
        orderId: orderId || "",
        paymentId,
        message:
          paymentStatus === "in_process"
            ? "Seu pagamento está em análise pela operadora do cartão."
            : "Pagamento pendente de confirmação.",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Erro interno na Edge Function process-mercadopago-payment:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Erro interno ao processar pagamento.",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
