import { OrderFinancial } from '../../hooks/hooks/useEventPayouts';
import { formatPrice } from './eventUtils';

/**
 * Conciliação com o Mercado Pago.
 *
 * Os valores do MP são exibidos como vieram da sincronização; nada aqui
 * recalcula tarifa, líquido ou status. Esta função só compara o registro do
 * sistema com o espelho do MP e explica, em linguagem de operação, o que foge
 * do padrão. Pedido sem observação = sistema e MP de acordo.
 */

export type NoticeLevel = 'error' | 'warn' | 'info';

export interface ReconciliationNotice {
  code: string;
  level: NoticeLevel;
  message: string;
}

const CENT = 0.01;

/** Pedidos que passam pelo MP. Pix por chave própria e cortesias não. */
export const isGatewayOrder = (o: OrderFinancial) =>
  o.payment_method !== 'pix_chave' && o.payment_method !== 'cortesia' && o.payment_method !== 'free';

const MP_STATUS_LABEL: Record<string, string> = {
  approved: 'aprovado',
  authorized: 'autorizado',
  in_process: 'em análise',
  pending: 'pendente',
  rejected: 'recusado',
  cancelled: 'cancelado',
  refunded: 'estornado',
  charged_back: 'contestado (chargeback)',
  in_mediation: 'em disputa',
};

export const mpStatusLabel = (s?: string | null) => (s ? MP_STATUS_LABEL[s] || s : '—');

export const explainOrder = (o: OrderFinancial): ReconciliationNotice[] => {
  if (!isGatewayOrder(o)) return [];

  const notices: ReconciliationNotice[] = [];

  if (!o.gateway_synced_at || !o.gateway_status) {
    notices.push({
      code: 'not_synced',
      level: 'warn',
      message: 'Ainda não sincronizado com o Mercado Pago — os valores do MP aparecerão após a sincronização.',
    });
    return notices;
  }

  const mp = o.gateway_status;
  const refundedMp = Number(o.gateway_refunded_amount || 0);
  const grossMp = Number(o.gateway_gross_amount || 0);

  // Status: o que o sistema diz × o que o MP diz
  if (o.is_refunded && mp === 'approved' && refundedMp < CENT) {
    notices.push({
      code: 'refund_missing_on_mp',
      level: 'error',
      message: 'No sistema o pedido está reembolsado, mas no Mercado Pago o pagamento segue aprovado e sem estorno. O estorno precisa ser feito no painel do MP.',
    });
  } else if (!o.is_refunded && (mp === 'refunded' || (refundedMp > 0 && refundedMp >= grossMp - CENT))) {
    notices.push({
      code: 'refunded_on_mp',
      level: 'error',
      message: `O Mercado Pago estornou ${formatPrice(refundedMp)} deste pagamento, mas no sistema ele continua pago. Marque o pedido como reembolsado.`,
    });
  } else if (mp === 'charged_back') {
    notices.push({
      code: 'chargeback',
      level: 'error',
      message: 'Chargeback: o comprador contestou a compra junto ao cartão e o MP reverteu o valor.',
    });
  } else if (mp === 'in_mediation') {
    notices.push({
      code: 'mediation',
      level: 'warn',
      message: 'Pagamento em disputa no Mercado Pago. O valor pode ser revertido conforme o resultado.',
    });
  } else if (o.is_paid && mp !== 'approved' && mp !== 'authorized') {
    notices.push({
      code: 'status_mismatch',
      level: 'error',
      message: `No sistema o pedido está pago, mas no Mercado Pago o pagamento está ${mpStatusLabel(mp)}.`,
    });
  }

  if (refundedMp > CENT && refundedMp < grossMp - CENT) {
    notices.push({
      code: 'partial_refund',
      level: 'warn',
      message: `Estorno parcial no Mercado Pago: ${formatPrice(refundedMp)} de ${formatPrice(grossMp)}.`,
    });
  }

  // Valor: venda registrada no sistema × valor da transação no MP
  if (o.gateway_gross_amount !== null && Math.abs(o.gross_amount - grossMp) > CENT) {
    notices.push({
      code: 'amount_mismatch',
      level: 'warn',
      message: `Valor do pedido no sistema (${formatPrice(o.gross_amount)}) difere do valor da venda no Mercado Pago (${formatPrice(grossMp)}).`,
    });
  }

  // Tarifa fora do padrão: financiamento de parcelamento cobrado do vendedor
  const financing = Number(o.gateway_financing_fee || 0);
  if (financing > CENT) {
    notices.push({
      code: 'seller_financing',
      level: 'warn',
      message: `Parcelado em ${o.installments || '?'}x com juros assumidos pelo vendedor: o MP cobrou ${formatPrice(financing)} de financiamento, já incluído na tarifa de ${formatPrice(o.gateway_fee)}.`,
    });
  }

  // Juros pagos pelo comprador direto ao MP — informativo
  const totalPaid = Number(o.gateway_total_paid_amount || 0);
  if (o.gateway_total_paid_amount !== null && totalPaid > grossMp + CENT) {
    notices.push({
      code: 'buyer_interest',
      level: 'info',
      message: `O comprador pagou ${formatPrice(totalPaid - grossMp)} de juros de parcelamento diretamente ao MP (total de ${formatPrice(totalPaid)} em ${o.installments || '?'}x). Não afeta repasse nem lucro.`,
    });
  }

  if (o.is_paid && !o.is_refunded && o.net_profit < -CENT) {
    notices.push({
      code: 'negative_profit',
      level: 'warn',
      message: `Prejuízo nesta venda: a tarifa do MP (${formatPrice(o.gateway_fee)}) foi maior que a conveniência (${formatPrice(o.convenience_fee)}).`,
    });
  }

  return notices;
};

export const worstLevel = (notices: ReconciliationNotice[]): NoticeLevel | null =>
  notices.some(n => n.level === 'error') ? 'error'
    : notices.some(n => n.level === 'warn') ? 'warn'
    : notices.length ? 'info' : null;
