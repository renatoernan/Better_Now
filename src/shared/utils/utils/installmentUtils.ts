import { formatPrice } from './eventUtils';

/**
 * Tabela Oficial de Taxas de Parcelamento do Mercado Pago (Brasil).
 * Aplicada quando o parcelamento é por conta do cliente (comprador assume as tarifas financeiras).
 * Coeficientes obtidos diretamente da API oficial de custos ao pagador (payer_costs) do Mercado Pago.
 */
export const MERCADO_PAGO_BUYER_INSTALLMENT_RATES: Record<number, number> = {
  1: 0,       // 1x: À vista (sem juros)
  2: 9.64,    // 2x: 9,64%
  3: 11.23,   // 3x: 11,23%
  4: 11.36,   // 4x: 11,36%
  5: 14.31,   // 5x: 14,31%
  6: 14.32,   // 6x: 14,32%
  7: 16.72,   // 7x: 16,72%
  8: 16.73,   // 8x: 16,73%
  9: 19.69,   // 9x: 19,69%
  10: 20.65,  // 10x: 20,65%
  11: 20.66,  // 11x: 20,66%
  12: 22.11,  // 12x: 22,11%
};

export interface InstallmentPlanOption {
  count: number;
  rate: number;
  installmentAmount: number;
  total: number;
  interestAmount: number;
  label: string;
}

/**
 * Calcula as opções de parcelamento com juros repassados ao cliente (comprador).
 * Prioriza os dados reais retornados pela API do Mercado Pago (se disponíveis para o BIN do cartão)
 * ou aplica a tabela oficial do Mercado Pago Brasil com precisão decimal exata.
 */
export function calculateInstallmentOptions(
  baseAmount: number,
  maxInstallments: number = 12,
  payerCostsFromApi?: any[]
): InstallmentPlanOption[] {
  const max = Math.min(12, Math.max(1, maxInstallments));
  const options: InstallmentPlanOption[] = [];

  for (let i = 1; i <= max; i++) {
    // 1. Tentar localizar opção real retornada pela API do Mercado Pago para este número de parcelas
    const apiMatch = payerCostsFromApi?.find((c: any) => Number(c.installments) === i);

    if (apiMatch && apiMatch.installment_amount && apiMatch.total_amount) {
      const total = Number(Number(apiMatch.total_amount).toFixed(2));
      const installmentAmount = Number(Number(apiMatch.installment_amount).toFixed(2));
      const interestAmount = Math.max(0, Number((total - baseAmount).toFixed(2)));
      const rate = Number(apiMatch.installment_rate || 0);

      const label = i === 1
        ? `1x de ${formatPrice(installmentAmount)} à vista (sem juros)`
        : `${i}x de ${formatPrice(installmentAmount)} com juros (Total: ${formatPrice(total)})`;

      options.push({
        count: i,
        rate,
        installmentAmount,
        total,
        interestAmount,
        label,
      });
      continue;
    }

    // 2. Fallback determinístico com a tabela oficial de juros ao comprador do Mercado Pago
    if (i === 1) {
      options.push({
        count: 1,
        rate: 0,
        installmentAmount: Number(baseAmount.toFixed(2)),
        total: Number(baseAmount.toFixed(2)),
        interestAmount: 0,
        label: `1x de ${formatPrice(baseAmount)} à vista (sem juros)`,
      });
    } else {
      const rate = MERCADO_PAGO_BUYER_INSTALLMENT_RATES[i] || 0;
      const total = Number((baseAmount * (1 + rate / 100)).toFixed(2));
      const installmentAmount = Number((total / i).toFixed(2));
      const interestAmount = Number((total - baseAmount).toFixed(2));

      options.push({
        count: i,
        rate,
        installmentAmount,
        total,
        interestAmount,
        label: `${i}x de ${formatPrice(installmentAmount)} com juros (Total: ${formatPrice(total)})`,
      });
    }
  }

  return options;
}

/**
 * Consulta a API de parcelamento do Mercado Pago para o BIN do cartão (primeiros 6 a 8 dígitos)
 */
export async function fetchMercadoPagoInstallments(
  amount: number,
  bin: string,
  publicKey: string
): Promise<any[] | null> {
  const cleanBin = bin.replace(/\D/g, '').slice(0, 8);
  if (cleanBin.length < 6 || !publicKey || amount <= 0) {
    return null;
  }

  try {
    const res = await fetch(
      `https://api.mercadopago.com/v1/payment_methods/installments?public_key=${encodeURIComponent(
        publicKey
      )}&amount=${encodeURIComponent(amount.toFixed(2))}&bin=${encodeURIComponent(cleanBin)}`
    );

    if (!res.ok) return null;

    const data = await res.json();
    if (Array.isArray(data) && data[0]?.payer_costs) {
      return data[0].payer_costs;
    }
    return null;
  } catch (err) {
    console.warn('Aviso ao consultar parcelamento dinâmico no Mercado Pago:', err);
    return null;
  }
}
