import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { sendOrderNotificationsFromBackend } from "../_shared/orderNotifier.ts";
import { fetchMercadoPagoPayment } from "../_shared/mpFinancials.ts";

/**
 * Mensagem de "aguardando pagamento" com atraso de 5 minutos.
 *
 * Mandar o aviso no instante da compra fazia o comprador receber "aguardando"
 * junto (ou depois) da confirmação. Agora o checkout não avisa nada enquanto o
 * pagamento está pendente; este job, chamado a cada minuto pelo pg_cron
 * (migration 046), avisa só quem continua pendente depois de 5 minutos.
 *
 * Antes de avisar, consulta o MP: pagamento aprovado ou recusado nesse meio
 * tempo não recebe "aguardando" — a confirmação vem pelo webhook.
 */

const MIN_AGE_MIN = 5;
// Pedido pendente mais velho que isso já não está "aguardando": não insiste
const MAX_AGE_MIN = 60;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

serve(async (req) => {
  const secret = Deno.env.get("PENDING_REMINDERS_SECRET");
  if (!secret || req.headers.get("x-cron-secret") !== secret) {
    return json({ ok: false, message: "Não autorizado." }, 401);
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );
    const mpAccessToken = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN") || Deno.env.get("MP_ACCESS_TOKEN");

    const now = Date.now();
    const { data: orders, error } = await supabase
      .from("app_event_orders")
      .select("*")
      .eq("status", "pending")
      .in("payment_method", ["pix", "credit_card"])
      .lte("created_at", new Date(now - MIN_AGE_MIN * 60_000).toISOString())
      .gte("created_at", new Date(now - MAX_AGE_MIN * 60_000).toISOString());

    if (error) throw error;
    if (!orders?.length) return json({ ok: true, checked: 0, sent: 0 });

    // Já avisados (aguardando ou confirmado) ficam de fora — mesma trava do notificador
    const lockKeys = orders.flatMap((o) => [`notif_lock_created_${o.id}`, `notif_lock_confirmed_${o.id}`]);
    const { data: locks } = await supabase.from("app_settings").select("key").in("key", lockKeys);
    const notified = new Set((locks || []).map((l: any) => String(l.key).replace(/^notif_lock_(created|confirmed)_/, "")));

    let sent = 0;
    const skipped: Record<string, string> = {};

    for (const order of orders) {
      if (notified.has(order.id)) continue;

      let paymentUrl: string | null = null;
      if (mpAccessToken && /^\d+$/.test(String(order.stripe_session_id || ""))) {
        const payment = await fetchMercadoPagoPayment(String(order.stripe_session_id), mpAccessToken);
        const mpStatus = payment?.status;
        if (mpStatus && !["pending", "in_process", "authorized"].includes(mpStatus)) {
          skipped[order.id] = `MP ${mpStatus}`;
          continue;
        }
        // Pix: o aviso leva o link para pagar, que só existe no MP
        paymentUrl = payment?.point_of_interaction?.transaction_data?.ticket_url || null;
      }

      const result = await sendOrderNotificationsFromBackend({
        supabase,
        orderId: order.id,
        orderData: paymentUrl ? { ...order, payment_url: paymentUrl } : order,
        type: "created",
      });
      if (result.whatsapp.success || result.email.success) sent++;
    }

    return json({ ok: true, checked: orders.length, sent, skipped });
  } catch (err) {
    console.error("send-pending-order-reminders:", err);
    return json({ ok: false, message: "Erro ao processar lembretes." }, 500);
  }
});
