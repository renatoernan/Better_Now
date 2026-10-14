/**
 * Reembolso parcial e comprovante de reembolso para o comprador.
 *
 * Parcial = pedido segue pago, com refunded_at e refund_amount abaixo do bruto
 * (mesma regra da view app_event_order_financials, migration 048).
 */

const CENT = 0.01;
const TZ = 'America/Sao_Paulo';

export const isPartialRefund = (order: {
  status: string;
  refunded_at?: string | null;
  refund_amount?: number | null;
  amount_total?: number | null;
}) => {
  if (order.status === 'refunded' || !order.refunded_at) return false;
  const refunded = Number(order.refund_amount || 0);
  return refunded > 0 && refunded < Number(order.amount_total || 0) - CENT;
};

export interface RefundReceiptData {
  orderId: string;
  eventTitle: string;
  eventDate?: string | null;
  buyerName: string;
  buyerDocument?: string | null;
  paymentMethod?: string | null;
  quantity: number;
  amountPaid: number;
  amountRefunded: number;
  refundedAt: string;
  reason?: string | null;
  /** Estorno feito pelo Mercado Pago (volta pelo mesmo meio de pagamento). */
  viaMercadoPago: boolean;
}

const METHOD_LABEL: Record<string, string> = {
  credit_card: 'Cartão de crédito',
  pix: 'Pix',
  pix_stripe: 'Pix',
  pix_chave: 'Pix',
  boleto: 'Boleto',
};

const brl = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

// CPF parcialmente oculto: o comprovante sai da plataforma
const maskDocument = (doc?: string | null) => {
  const d = (doc || '').replace(/\D/g, '');
  if (d.length !== 11) return null;
  return `***.${d.slice(3, 6)}.${d.slice(6, 9)}-**`;
};

const fmtDateTime = (iso: string) =>
  new Date(iso).toLocaleString('pt-BR', {
    timeZone: TZ, day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });

const fmtDate = (d: string) =>
  new Date(d.length === 10 ? `${d}T12:00:00-03:00` : d).toLocaleDateString('pt-BR', { timeZone: TZ });

export const buildRefundReceiptHtml = (r: RefundReceiptData): string => {
  const partial = r.amountRefunded < r.amountPaid - CENT;
  const code = `#${r.orderId.substring(0, 8).toUpperCase()}`;
  const method = METHOD_LABEL[r.paymentMethod || ''] || r.paymentMethod || '—';
  const doc = maskDocument(r.buyerDocument);
  const isCard = r.paymentMethod === 'credit_card';

  const how = r.viaMercadoPago
    ? isCard
      ? 'Estorno no cartão de crédito usado na compra, pelo Mercado Pago. Conforme a operadora, o valor aparece na fatura atual ou na seguinte.'
      : 'Estorno pelo Mercado Pago para a mesma conta de origem do pagamento.'
    : 'Devolução feita diretamente ao comprador.';

  const rows: [string, string][] = [
    ['Pedido', code],
    ['Evento', r.eventTitle + (r.eventDate ? ` · ${fmtDate(r.eventDate)}` : '')],
    ['Comprador', r.buyerName + (doc ? ` · CPF ${doc}` : '')],
    ['Forma de pagamento', method],
    ['Ingressos do pedido', String(r.quantity)],
    ['Data do reembolso', fmtDateTime(r.refundedAt)],
  ];
  if (r.reason?.trim()) rows.push(['Motivo', r.reason.trim()]);

  return `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8">
<title>Comprovante de reembolso ${esc(code)}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, 'Segoe UI', Roboto, Arial, sans-serif; color: #1f2937; margin: 0; padding: 32px; background: #fff; }
  .doc { max-width: 640px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 16px; overflow: hidden; }
  header { background: #4c1d95; color: #fff; padding: 24px 28px; }
  header .brand { font-size: 13px; letter-spacing: .08em; text-transform: uppercase; opacity: .8; }
  header h1 { margin: 6px 0 0; font-size: 22px; }
  .tag { display: inline-block; margin-top: 10px; padding: 3px 10px; border-radius: 999px; font-size: 12px; font-weight: 700;
         background: ${partial ? '#fae8ff' : '#ede9fe'}; color: ${partial ? '#86198f' : '#5b21b6'}; }
  section { padding: 22px 28px; }
  table { width: 100%; border-collapse: collapse; font-size: 14px; }
  td { padding: 7px 0; vertical-align: top; }
  td:first-child { color: #6b7280; width: 42%; }
  .amounts { margin-top: 6px; border-top: 1px solid #e5e7eb; padding-top: 14px; }
  .amounts td:last-child { text-align: right; font-variant-numeric: tabular-nums; }
  .refund td { font-size: 18px; font-weight: 800; color: #5b21b6; }
  .note { margin-top: 16px; padding: 12px 14px; background: #f9fafb; border-radius: 10px; font-size: 13px; line-height: 1.5; color: #374151; }
  footer { padding: 14px 28px 22px; font-size: 11px; color: #9ca3af; }
  @media print { body { padding: 0; } .doc { border: none; } }
</style></head>
<body><div class="doc">
  <header>
    <div class="brand">Better Now</div>
    <h1>Comprovante de reembolso</h1>
    <span class="tag">${partial ? 'Reembolso parcial' : 'Reembolso total'}</span>
  </header>
  <section>
    <table>${rows.map(([k, v]) => `<tr><td>${esc(k)}</td><td>${esc(v)}</td></tr>`).join('')}</table>
    <table class="amounts">
      <tr><td>Valor pago</td><td>${brl(r.amountPaid)}</td></tr>
      <tr class="refund"><td>Valor reembolsado</td><td>${brl(r.amountRefunded)}</td></tr>
      ${partial ? `<tr><td>Valor mantido no pedido</td><td>${brl(r.amountPaid - r.amountRefunded)}</td></tr>` : ''}
    </table>
    <div class="note">
      ${esc(how)}<br>
      ${partial
        ? 'Os ingressos deste pedido continuam válidos para o evento.'
        : 'Os ingressos deste pedido foram cancelados e não dão mais acesso ao evento.'}
    </div>
  </section>
  <footer>Emitido em ${fmtDateTime(new Date().toISOString())} (horário de Brasília).</footer>
</div>
<script>window.addEventListener('load', () => setTimeout(() => window.print(), 300));</script>
</body></html>`;
};

/**
 * Abre o comprovante numa janela pronta para imprimir ou "Salvar como PDF".
 * Retorna false quando o navegador bloqueia a janela.
 */
export const openRefundReceipt = (r: RefundReceiptData): boolean => {
  const win = window.open('', '_blank');
  if (!win) return false;
  win.document.open();
  win.document.write(buildRefundReceiptHtml(r));
  win.document.close();
  return true;
};
