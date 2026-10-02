/**
 * Extrai do pagamento do Mercado Pago os valores que alimentam o controle de
 * repasses. Usado pelo webhook, pela confirmação de pagamento e pela
 * sincronização manual, para que os três gravem exatamente a mesma coisa.
 *
 * A taxa do MP vai para gateway_fee e nunca para convenience_fee: a
 * conveniência é receita da plataforma, definida no checkout; a taxa do MP é
 * custo. Misturar as duas foi o que impedia calcular o repasse.
 */

const round2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;

export interface GatewayFinancials {
  gateway_fee: number;
  gateway_financing_fee: number;
  gateway_net_amount: number | null;
  gateway_fee_details: unknown;
  money_release_date: string | null;
  money_release_status: string | null;
  installments: number | null;
  gateway_synced_at: string;
  // Espelho do pagamento no MP (migration 045)
  gateway_status: string | null;
  gateway_status_detail: string | null;
  gateway_gross_amount: number | null;
  gateway_total_paid_amount: number | null;
  gateway_refunded_amount: number;
  gateway_approved_at: string | null;
}

export const extractGatewayFinancials = (payment: any): GatewayFinancials | null => {
  if (!payment || typeof payment !== "object") return null;

  const details = Array.isArray(payment.fee_details) ? payment.fee_details : [];

  // Só o que é cobrado do vendedor é custo da plataforma. Tarifa com
  // fee_payer = 'payer' foi paga pelo comprador por fora do valor da transação.
  const collectorFees = details.filter((f: any) => !f?.fee_payer || f.fee_payer === "collector");

  let fee = collectorFees.reduce((acc: number, f: any) => acc + (Number(f?.amount) || 0), 0);
  const financing = collectorFees
    .filter((f: any) => f?.type === "financing_fee")
    .reduce((acc: number, f: any) => acc + (Number(f?.amount) || 0), 0);

  const td = payment.transaction_details || {};
  const net = td.net_received_amount != null ? Number(td.net_received_amount) : null;

  // A taxa real é o que o MP reteve: valor da transação − líquido recebido.
  // fee_details nem sempre traz todas as tarifas — no cartão à vista o extrato
  // mostra duas de R$ 8,24 e a API devolve só uma —, então ele serve apenas
  // para separar a parte de financiamento. Conferido contra o relatório de
  // vendas do MP de 02/10/2026.
  if (net != null && Number(payment.transaction_amount) > 0) {
    fee = Number(payment.transaction_amount) - net;
  }

  return {
    gateway_fee: round2(Math.max(0, fee)),
    gateway_financing_fee: round2(Math.max(0, financing)),
    gateway_net_amount: net != null ? round2(net) : null,
    gateway_fee_details: details.length ? details : null,
    money_release_date: payment.money_release_date || null,
    money_release_status: payment.money_release_status || null,
    installments: payment.installments != null ? Number(payment.installments) : null,
    gateway_synced_at: new Date().toISOString(),
    gateway_status: payment.status || null,
    gateway_status_detail: payment.status_detail || null,
    gateway_gross_amount: payment.transaction_amount != null ? round2(payment.transaction_amount) : null,
    gateway_total_paid_amount: td.total_paid_amount != null ? round2(td.total_paid_amount) : null,
    gateway_refunded_amount: round2(payment.transaction_amount_refunded || 0),
    gateway_approved_at: payment.date_approved || null,
  };
};

export const fetchMercadoPagoPayment = async (paymentId: string, accessToken: string): Promise<any | null> => {
  if (!paymentId || !/^\d+$/.test(String(paymentId))) return null;
  const res = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return null;
  return await res.json();
};
