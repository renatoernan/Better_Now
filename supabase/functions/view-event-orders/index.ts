import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const MESSAGES: Record<string, string> = {
  NOT_FOUND: "Link inválido ou inexistente.",
  REVOKED: "Este link foi revogado.",
  EXPIRED: "Este link expirou.",
  LOCKED: "Muitas tentativas incorretas. Tente novamente em 15 minutos.",
  BAD_PASSWORD: "Senha incorreta.",
};

/**
 * Taxa e líquido de cada pedido vêm da mesma fonte do controle de repasses
 * (view app_event_order_financials, migration 044), para que o relatório que o
 * organizador recebe nunca divirja do que é efetivamente repassado.
 *
 * Taxa = conveniência total (cobrada do cliente ou assumida pelo organizador,
 * como os 3% da Pré-Venda do Halloween 2026) + juros de parcelamento.
 * Líquido = bruto − taxa = valor repassado ao organizador.
 */
const round2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { token, password } = await req.json();
    if (!token || !password) {
      return json({ ok: false, code: "INVALID_INPUT", message: "Informe o link e a senha." }, 400);
    }

    const { data: checks, error: verifyError } = await supabase
      .rpc("verify_event_order_share", { p_token: token, p_password: password });

    if (verifyError) throw verifyError;

    const check = Array.isArray(checks) ? checks[0] : checks;
    if (!check || check.reason !== "OK") {
      const code = check?.reason ?? "NOT_FOUND";
      // 404 e senha errada respondem igual para não confirmar a existência do link
      const status = code === "LOCKED" ? 429 : 401;
      return json({ ok: false, code, message: MESSAGES[code] ?? "Acesso negado." }, status);
    }

    const eventId = check.event_id;

    const [{ data: event }, { data: orders }, { data: financials }, { data: payouts }] = await Promise.all([
      supabase.from("app_events").select("title, event_date").eq("id", eventId).maybeSingle(),
      supabase
        .from("app_event_orders")
        .select("id, client_name, quantity, batch_name, payment_method, amount_total, convenience_fee, convenience_fee_percentage, status, refunded_at, created_at")
        .eq("event_id", eventId)
        .order("created_at", { ascending: false }),
      supabase
        .from("app_event_order_financials")
        .select("order_id, convenience_fee, installment_interest, fee_percentage_total, payout_id, payout_status")
        .eq("event_id", eventId),
      // Só o que interessa ao organizador: observações internas e quem
      // registrou o repasse ficam de fora
      supabase
        .from("app_event_payouts")
        .select("id, paid_at, created_at, method, reference, proof_url")
        .eq("event_id", eventId)
        .eq("kind", "payout")
        .is("voided_at", null),
    ]);

    const finById = new Map((financials ?? []).map((f) => [f.order_id, f]));
    const payoutById = new Map((payouts ?? []).map((p) => [p.id, p]));

    // Projeção deliberada: e-mail, telefone, CPF e IP existem na linha lida
    // acima, mas nunca saem daqui. A resposta carrega só as colunas da tela.
    const rows = (orders ?? []).map((o) => {
      const gross = Number(o.amount_total || 0);
      const fin = finById.get(o.id);
      // Pedidos fora da apuração (pendentes, falhos) mostram a conveniência gravada
      const fee = round2(fin
        ? Number(fin.convenience_fee || 0) + Number(fin.installment_interest || 0)
        : Number(o.convenience_fee || 0));
      const percentage = fin
        ? Number(fin.fee_percentage_total || 0)
        : Number(o.convenience_fee_percentage || 0);
      const isRefunded = o.status === "refunded" || !!o.refunded_at;
      const payout = fin?.payout_id ? payoutById.get(fin.payout_id) : null;

      return {
        code: `#${String(o.id).substring(0, 8).toUpperCase()}`,
        buyer: o.client_name || "—",
        batch: o.batch_name || "Lote Padrão",
        quantity: Number(o.quantity || 1),
        method: o.payment_method || null,
        gross,
        fee,
        fee_percentage: percentage,
        net: Number((gross - fee).toFixed(2)),
        status: isRefunded ? "refunded" : o.status,
        created_at: o.created_at,
        // Repasse só existe para pedido pago; os demais vêm sem
        payout: fin
          ? {
              status: fin.payout_status,
              paid_at: payout?.paid_at ?? null,
              registered_at: payout?.created_at ?? null,
              method: payout?.method ?? null,
              reference: payout?.reference ?? null,
              proof_url: payout?.proof_url ?? null,
            }
          : null,
      };
    });

    const paid = rows.filter(r => r.status === "paid" || r.status === "approved");
    const totals = {
      gross: Number(paid.reduce((s, r) => s + r.gross, 0).toFixed(2)),
      fee: Number(paid.reduce((s, r) => s + r.fee, 0).toFixed(2)),
      net: Number(paid.reduce((s, r) => s + r.net, 0).toFixed(2)),
      paid_orders: paid.length,
      total_orders: rows.length,
      tickets: paid.reduce((s, r) => s + r.quantity, 0),
    };

    return json({
      ok: true,
      event: { title: event?.title ?? "Evento", date: event?.event_date ?? null },
      label: check.label ?? null,
      orders: rows,
      totals,
    });
  } catch (err) {
    console.error("view-event-orders:", err);
    return json({ ok: false, code: "INTERNAL", message: "Erro ao carregar os pedidos." }, 500);
  }
});
