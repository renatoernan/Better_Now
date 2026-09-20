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
 * Taxas fixas definidas pela organização para eventos específicos, diferentes
 * das tarifas que o gateway devolve e do que está gravado em convenience_fee.
 *
 * Valem apenas neste relatório de consulta: a tela administrativa mantém o
 * cálculo dela, por decisão do cliente, então os dois lugares podem divergir
 * nos pedidos Pix antigos gravados a 0,99%.
 *
 * Exceção deliberada e pontual. Se um segundo evento precisar disso, o certo é
 * virar campo no cadastro do evento em vez de crescer este mapa.
 */
const FEE_OVERRIDES: Record<string, { pix: number; card: number }> = {
  // Halloween 2026
  "5bb8a2d1-ff90-4b8f-9045-b483bba72588": { pix: 3, card: 7.5 },
};

const isFreeOrder = (method: string) => method === "cortesia" || method === "free";

const applyOverride = (
  order: Record<string, any>,
  rates: { pix: number; card: number }
): { fee: number; percentage: number } | null => {
  const total = Number(order.amount_total || 0);
  const method = String(order.payment_method || "").toLowerCase().trim();

  if (isFreeOrder(method) || total <= 0) return { fee: 0, percentage: 0 };

  const rate = method === "credit_card" ? rates.card
    : (method === "pix" || method === "pix_stripe") ? rates.pix
    : null;

  // Forma de pagamento fora da regra combinada cai no cálculo padrão
  if (rate === null) return null;

  return { fee: Number((total * (rate / 100)).toFixed(2)), percentage: rate };
};

/**
 * Repete a derivação de taxa da tela administrativa. Lá ela também regrava o
 * valor no banco; aqui não, porque esta é uma visão estritamente de leitura.
 */
const resolveFee = (
  order: Record<string, any>,
  overrides?: { pix: number; card: number }
): { fee: number; percentage: number } => {
  if (overrides) {
    const forced = applyOverride(order, overrides);
    if (forced) return forced;
  }

  const total = Number(order.amount_total || 0);
  let fee = Number(order.convenience_fee || 0);
  let percentage = Number(order.convenience_fee_percentage || 0);

  if (fee > 0) {
    if (!percentage && total > 0) percentage = Number(((fee / total) * 100).toFixed(2));
    return { fee, percentage };
  }

  if (percentage > 0 && total > 0) {
    return { fee: Number((total * (percentage / 100)).toFixed(2)), percentage };
  }

  if (total > 0) {
    const method = String(order.payment_method || "").toLowerCase().trim();
    if (isFreeOrder(method)) return { fee: 0, percentage: 0 };

    const viaGateway = !!order.stripe_session_id
      || method === "pix" || method === "pix_stripe" || method === "credit_card";

    if (viaGateway) {
      const rate = (method === "pix" || method === "pix_stripe") ? 0.99 : 4.99;
      return { fee: Number((total * (rate / 100)).toFixed(2)), percentage: rate };
    }
  }

  return { fee: 0, percentage: 0 };
};

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

    const [{ data: event }, { data: orders }] = await Promise.all([
      supabase.from("app_events").select("title, event_date").eq("id", eventId).maybeSingle(),
      supabase
        .from("app_event_orders")
        .select("id, client_name, quantity, batch_name, batch_index, payment_method, amount_total, convenience_fee, convenience_fee_percentage, stripe_session_id, status, refunded_at, created_at")
        .eq("event_id", eventId)
        .order("created_at", { ascending: false }),
    ]);

    // Projeção deliberada: e-mail, telefone, CPF e IP existem na linha lida
    // acima, mas nunca saem daqui. A resposta carrega só as colunas da tela.
    const overrides = FEE_OVERRIDES[eventId];

    const rows = (orders ?? []).map((o) => {
      const gross = Number(o.amount_total || 0);
      const { fee, percentage } = resolveFee(o, overrides);
      const isRefunded = o.status === "refunded" || !!o.refunded_at;

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
