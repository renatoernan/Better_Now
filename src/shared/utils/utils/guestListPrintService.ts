import { Event } from '../../types/types/event';
import { FlattenedTicketItem } from '../../../components/features/AdminEventOrders';
import { formatCPF } from './cpfUtils';
import { formatPhone } from './phoneUtils';
import { formatBrazilDate } from './eventUtils';

export interface GuestListPrintOptions {
  orientation: 'landscape' | 'portrait';
  density: 'comfortable' | 'compact';
  includeSignatureLine: boolean;
  includeInstructions: boolean;
  includeBatchColumn?: boolean;
  batchFilter?: string;
  statusFilter?: string;
  letterFilter?: string;
  titleCustom?: string;
}

export interface PreparedGuestItem {
  seq: number;
  sortKey: string;
  firstLetter: string;
  holderName: string;
  isVirtualOrGeneric: boolean;
  holderDoc: string;
  holderPhone: string;
  holderEmail: string;
  buyerName: string;
  buyerDoc: string;
  buyerPhone: string;
  orderId: string;
  ticketNumber: string;
  qrCodeShort: string;
  batchName: string;
  isComplimentary: boolean;
  unitPrice: number;
  ticketStatus: 'valid' | 'used' | 'cancelled' | 'pending';
  usedAt?: string;
  checkedInAt?: string;
}

/**
 * Normaliza um texto para ordenação alfabética ignorando acentuação e maiúsculas
 */
export const normalizeSortString = (str: string): string => {
  return (str || '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase();
};

/**
 * Formata data e hora para carimbo de emissão
 */
const formatDateTimeBR = (date: Date): string => {
  return date.toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
};

/**
 * Formata horário de entrada (check-in prévio)
 */
const formatTimeBR = (dateStr?: string | null): string => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/**
 * Prepara e ordena os ingressos alfabeticamente para a lista de contingência
 */
export const prepareGuestListItems = (
  rawTickets: FlattenedTicketItem[],
  options: Partial<GuestListPrintOptions> = {}
): PreparedGuestItem[] => {
  const { batchFilter = 'all', statusFilter = 'valid_only', letterFilter = 'all' } = options;

  // 1. Filtragem prévia
  const filtered = rawTickets.filter((item) => {
    // Filtro por Lote
    if (batchFilter !== 'all') {
      const bName = item.order.batch_name || `Lote ${item.order.batch_index || 1}`;
      if (bName !== batchFilter && String(item.order.batch_index) !== batchFilter) {
        return false;
      }
    }

    // Filtro por Status
    if (statusFilter === 'valid_only') {
      // Válidos ou Usados (exclui cancelados/reembolsados e pendentes de pagamento)
      const isValid = item.ticketStatus === 'valid' || item.ticketStatus === 'used';
      const orderOk = item.order.status === 'paid' || (item.order.status as string) === 'approved';
      if (!isValid && !orderOk) return false;
      if (item.ticketStatus === 'cancelled' || item.order.status === 'cancelled' || item.order.status === 'refunded') {
        return false;
      }
    } else if (statusFilter === 'valid_and_pending') {
      if (item.ticketStatus === 'cancelled' || item.order.status === 'cancelled' || item.order.status === 'refunded') {
        return false;
      }
    }

    return true;
  });

  // 2. Mapeamento e normalização dos nomes para ordenação
  const prepared: PreparedGuestItem[] = filtered.map((item) => {
    const isVirtual = !item.hasNamedHolder;
    // Se não tiver nome nominal preenchido, usa o comprador como âncora alfabética
    const rawDisplayName = item.hasNamedHolder && item.holderName?.trim()
      ? item.holderName.trim()
      : (item.buyerName?.trim() ? `${item.buyerName.trim()} (Ingresso #${item.ticketNumber})` : item.holderName || 'Convidado');

    const sortKey = normalizeSortString(rawDisplayName);
    let firstLetter = sortKey.charAt(0);
    if (!firstLetter || !/[A-Z]/.test(firstLetter)) {
      firstLetter = '#';
    }

    const isComp =
      item.order.payment_method === 'complimentary' ||
      item.order.payment_method === 'cortesia' ||
      item.unitPrice === 0 ||
      (item.order.batch_name && item.order.batch_name.toLowerCase().includes('cortesia'));

    const qrShort = item.qrCodeHash
      ? item.qrCodeHash.replace(/-/g, '').substring(0, 8).toUpperCase()
      : '';

    const usedTimestamp = item.ticket?.used_at || item.ticket?.checked_in_at;

    return {
      seq: 0,
      sortKey,
      firstLetter,
      holderName: rawDisplayName,
      isVirtualOrGeneric: isVirtual,
      holderDoc: item.holderDoc || (isVirtual ? item.buyerDoc || '' : ''),
      holderPhone: item.holderPhone || (isVirtual ? item.buyerPhone || '' : ''),
      holderEmail: item.holderEmail || (isVirtual ? item.buyerEmail || '' : ''),
      buyerName: item.buyerName || 'Anônimo',
      buyerDoc: item.buyerDoc || '',
      buyerPhone: item.buyerPhone || '',
      orderId: item.order.id,
      ticketNumber: String(item.ticketNumber || item.ticketIndex || 1),
      qrCodeShort: qrShort,
      batchName: item.order.batch_name || `Lote ${item.order.batch_index || 1}`,
      isComplimentary: !!isComp,
      unitPrice: item.unitPrice || 0,
      ticketStatus: item.ticketStatus,
      usedAt: usedTimestamp,
      checkedInAt: usedTimestamp,
    };
  });

  // 3. Ordenação Alfabética Estrita (A-Z)
  prepared.sort((a, b) => {
    const comp = a.sortKey.localeCompare(b.sortKey, 'pt-BR', { sensitivity: 'base' });
    if (comp !== 0) return comp;
    return Number(a.ticketNumber || 0) - Number(b.ticketNumber || 0);
  });

  // 4. Filtro por letra se solicitado
  const finalFiltered = letterFilter && letterFilter !== 'all'
    ? prepared.filter((item) => {
        if (letterFilter.includes('-')) {
          const [start, end] = letterFilter.split('-');
          return item.firstLetter >= start && item.firstLetter <= end;
        }
        return item.firstLetter === letterFilter;
      })
    : prepared;

  // 5. Atribuição de sequência numérica contínua (1, 2, 3...)
  finalFiltered.forEach((item, index) => {
    item.seq = index + 1;
  });

  return finalFiltered;
};

/**
 * Escapa HTML para prevenir injeção
 */
const esc = (text?: string | null): string => {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

/**
 * Renderiza o documento HTML completo com CSS de alta precisão para impressão
 */
export const renderGuestListPrintHtml = (
  event: Event,
  items: PreparedGuestItem[],
  options: GuestListPrintOptions
): string => {
  const emissionDate = formatDateTimeBR(new Date());
  const isLandscape = options.orientation === 'landscape';
  const isCompact = options.density === 'compact';
  const includeBatch = options.includeBatchColumn !== false;

  // Métricas para o Resumo Executivo
  const totalCount = items.length;
  const complimentaryCount = items.filter((i) => i.isComplimentary).length;
  const paidCount = totalCount - complimentaryCount;
  const usedCount = items.filter((i) => i.ticketStatus === 'used' || !!i.usedAt).length;
  const remainingCount = totalCount - usedCount;

  // Agrupamento por letras para divisores
  const letterGroups: Record<string, PreparedGuestItem[]> = {};
  items.forEach((item) => {
    if (!letterGroups[item.firstLetter]) {
      letterGroups[item.firstLetter] = [];
    }
    letterGroups[item.firstLetter].push(item);
  });
  const letters = Object.keys(letterGroups).sort();

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <title>Lista de Portaria (Plano B) - ${esc(event.title)}</title>
  <style>
    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    
    html, body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      color: #0f172a;
      background: #f8fafc;
      font-size: ${isCompact ? '9.5px' : '11px'};
      line-height: 1.25;
      -webkit-font-smoothing: antialiased;
    }

    /* Barra de Ações Superior (Apenas Tela) */
    .screen-toolbar {
      position: sticky;
      top: 0;
      z-index: 9999;
      background: #1e1b4b;
      color: #fff;
      padding: 10px 20px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    }
    .screen-toolbar .title {
      font-weight: 700;
      font-size: 13px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .screen-toolbar .actions {
      display: flex;
      gap: 10px;
    }
    .btn {
      cursor: pointer;
      border: none;
      border-radius: 6px;
      padding: 6px 14px;
      font-size: 12px;
      font-weight: 600;
      transition: all 0.15s ease;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .btn-primary {
      background: #4f46e5;
      color: #fff;
    }
    .btn-primary:hover {
      background: #4338ca;
    }
    .btn-secondary {
      background: rgba(255,255,255,0.15);
      color: #fff;
    }
    .btn-secondary:hover {
      background: rgba(255,255,255,0.25);
    }

    /* Container de Impressão */
    .print-container {
      max-width: ${isLandscape ? '1080px' : '820px'};
      margin: 20px auto;
      background: #ffffff;
      padding: ${isLandscape ? '16px 20px' : '20px 24px'};
      box-shadow: 0 4px 20px rgba(0,0,0,0.06);
      border-radius: 8px;
    }

    /* Cabeçalho do Relatório */
    .doc-header {
      border-bottom: 2px solid #0f172a;
      padding-bottom: 10px;
      margin-bottom: 12px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 16px;
    }
    .brand-section h1 {
      font-size: ${isCompact ? '16px' : '18px'};
      font-weight: 900;
      color: #0f172a;
      letter-spacing: -0.02em;
      text-transform: uppercase;
      margin-bottom: 2px;
    }
    .brand-section .contingency-badge {
      display: inline-block;
      background: #dc2626;
      color: #ffffff;
      font-size: 9px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      padding: 2px 7px;
      border-radius: 4px;
      margin-bottom: 4px;
    }
    .event-meta {
      font-size: 10.5px;
      color: #334155;
      margin-top: 2px;
    }
    .event-meta strong {
      color: #0f172a;
    }
    .header-right {
      text-align: right;
      font-size: 9.5px;
      color: #475569;
      line-height: 1.4;
    }
    .header-right .logo {
      font-size: 14px;
      font-weight: 900;
      color: #4338ca;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    /* Caixa de Instruções Operacionais */
    .instructions-box {
      background: #f1f5f9;
      border-left: 3px solid #4338ca;
      padding: 6px 10px;
      margin-bottom: 10px;
      font-size: 9.5px;
      color: #1e293b;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }
    .instructions-box ul {
      list-style: none;
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
    }
    .instructions-box li strong {
      color: #0f172a;
    }

    /* Cards de Resumo */
    .kpi-row {
      display: grid;
      grid-template-columns: repeat(${includeBatch ? 5 : 3}, 1fr);
      gap: 8px;
      margin-bottom: 12px;
    }
    .kpi-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 6px 8px;
      text-align: center;
    }
    .kpi-card .num {
      font-size: 14px;
      font-weight: 800;
      color: #0f172a;
      line-height: 1.1;
    }
    .kpi-card .label {
      font-size: 8.5px;
      font-weight: 600;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }

    /* Tabela da Portaria */
    table.guest-table {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
    }
    
    /* Cabeçalho da Tabela */
    table.guest-table thead {
      display: table-header-group;
    }
    table.guest-table thead th {
      background: #0f172a;
      color: #ffffff;
      font-size: ${isCompact ? '8.5px' : '9.5px'};
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      padding: ${isCompact ? '4px 6px' : '6px 8px'};
      text-align: left;
      border: 1px solid #0f172a;
    }
    table.guest-table thead th.center {
      text-align: center;
    }

    /* Linhas e Células */
    table.guest-table tbody tr {
      page-break-inside: avoid;
      break-inside: avoid;
    }
    table.guest-table tbody tr:nth-child(even) {
      background: #f8fafc;
    }
    table.guest-table tbody tr:hover {
      background: #f1f5f9;
    }
    table.guest-table td {
      padding: ${isCompact ? '3.5px 5px' : '5px 7px'};
      border: 1px solid #cbd5e1;
      vertical-align: middle;
      font-size: ${isCompact ? '9px' : '10px'};
      color: #1e293b;
    }
    table.guest-table td.center {
      text-align: center;
    }

    /* Divisor Alfabético de Letras */
    tr.letter-row td {
      background: #e2e8f0 !important;
      font-weight: 800;
      color: #0f172a;
      font-size: 10.5px;
      padding: 3px 8px;
      border: 1px solid #94a3b8;
      page-break-after: avoid;
      break-after: avoid;
    }

    /* Estilos dos Dados */
    .holder-name {
      font-weight: 700;
      color: #0f172a;
      font-size: ${isCompact ? '9.5px' : '11px'};
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .buyer-sub {
      font-size: 8px;
      color: #64748b;
      margin-top: 1px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .doc-num, .phone-num {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: ${isCompact ? '8.5px' : '9.5px'};
      color: #334155;
      white-space: nowrap;
    }
    .badge-batch {
      display: inline-block;
      padding: 1.5px 5px;
      border-radius: 3px;
      font-size: 8.5px;
      font-weight: 700;
      background: #e0e7ff;
      color: #3730a3;
      white-space: nowrap;
    }
    .badge-comp {
      background: #dcfce7;
      color: #166534;
    }
    .ticket-code {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-weight: 600;
      font-size: 8.5px;
      color: #475569;
    }

    /* Área de Check-in Manual */
    .checkin-cell {
      padding: 2px 4px !important;
    }
    .manual-checkin-box {
      display: flex;
      align-items: center;
      gap: 6px;
      width: 100%;
    }
    .check-square {
      width: 13px;
      height: 13px;
      border: 1.5px solid #0f172a;
      border-radius: 2px;
      display: inline-block;
      flex-shrink: 0;
    }
    .check-time {
      font-size: 8px;
      color: #64748b;
      white-space: nowrap;
      flex-shrink: 0;
    }
    .sign-line {
      flex: 1;
      border-bottom: 1px dotted #94a3b8;
      height: 10px;
    }
    .used-stamp {
      display: inline-flex;
      align-items: center;
      gap: 3px;
      background: #dcfce7;
      border: 1px solid #86efac;
      color: #15803d;
      font-size: 8.5px;
      font-weight: 700;
      padding: 2px 6px;
      border-radius: 3px;
      white-space: nowrap;
    }

    /* Rodapé Documento */
    .doc-footer {
      margin-top: 14px;
      border-top: 1px solid #cbd5e1;
      padding-top: 6px;
      display: flex;
      justify-content: space-between;
      font-size: 8.5px;
      color: #64748b;
    }

    /* Otimizações Específicas de Impressão @media print */
    @media print {
      @page {
        size: A4 ${isLandscape ? 'landscape' : 'portrait'};
        margin: 6mm 8mm;
      }
      body {
        background: #ffffff !important;
        font-size: ${isCompact ? '9px' : '10px'} !important;
      }
      .screen-toolbar {
        display: none !important;
      }
      .print-container {
        box-shadow: none !important;
        border: none !important;
        padding: 0 !important;
        margin: 0 !important;
        max-width: 100% !important;
      }
      table.guest-table thead {
        display: table-header-group !important;
      }
      table.guest-table tbody tr {
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }
      tr.letter-row {
        page-break-after: avoid !important;
        break-after: avoid !important;
      }
      .check-square {
        border-color: #000000 !important;
      }
      thead th {
        background: #0f172a !important;
        color: #ffffff !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      .badge-batch, .badge-comp, .used-stamp, tr.letter-row td {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
    }
  </style>
</head>
<body>

  <!-- Barra de Controle na Tela -->
  <div class="screen-toolbar no-print">
    <div class="title">
      <span>📋 Relatório de Portaria (Plano B de Contingência)</span>
      <span style="opacity:0.7; font-weight:normal;">• ${totalCount} convidados em ordem alfabética</span>
    </div>
    <div class="actions">
      <button class="btn btn-secondary" onclick="window.close()">✕ Fechar Janela</button>
      <button class="btn btn-primary" onclick="window.print()">🖨️ Imprimir / Salvar PDF</button>
    </div>
  </div>

  <div class="print-container">
    <!-- Cabeçalho -->
    <header class="doc-header">
      <div class="brand-section">
        <span class="contingency-badge">Plano B • Contingência Portaria</span>
        <h1>Lista Alfabética de Convidados</h1>
        <div class="event-meta">
          <strong>Evento:</strong> ${esc(event.title)} 
          ${event.event_date ? ` • <strong>Data:</strong> ${formatBrazilDate(event.event_date)}` : ''}
          ${event.location ? ` • <strong>Local:</strong> ${esc(event.location)}` : ''}
        </div>
      </div>
      <div class="header-right">
        <div class="logo">Better Now</div>
        <div><strong>Emissão:</strong> ${emissionDate}</div>
        <div><strong>Ordenação:</strong> Alfabética Estrita (A-Z)</div>
      </div>
    </header>

    ${options.includeInstructions ? `
    <!-- Instruções para os Porteiros -->
    <div class="instructions-box">
      <ul>
        <li><strong>1. Conferência:</strong> Solicite documento oficial com foto (RG ou CNH).</li>
        <li><strong>2. Check-in Manual:</strong> Assinale a caixa [X], anote a hora e colha a rubrica.</li>
        <li><strong>3. Ingressos Já Utilizados:</strong> Atenção aos registros prévios para evitar entradas duplicadas.</li>
      </ul>
      <span style="font-weight:700; color:#dc2626;">USO EXCLUSIVO DA PORTARIA</span>
    </div>
    ` : ''}

    <!-- Cards de Totais -->
    <div class="kpi-row">
      <div class="kpi-card">
        <div class="num">${totalCount}</div>
        <div class="label">Total na Lista</div>
      </div>
      ${includeBatch ? `
      <div class="kpi-card">
        <div class="num" style="color:#2563eb;">${paidCount}</div>
        <div class="label">Pagantes</div>
      </div>
      <div class="kpi-card">
        <div class="num" style="color:#059669;">${complimentaryCount}</div>
        <div class="label">Cortesias</div>
      </div>
      ` : ''}
      <div class="kpi-card">
        <div class="num" style="color:#d97706;">${usedCount}</div>
        <div class="label">Já Entraram</div>
      </div>
      <div class="kpi-card">
        <div class="num" style="color:#7c3aed;">${remainingCount}</div>
        <div class="label">Aguardados</div>
      </div>
    </div>

    <!-- Tabela Principal -->
    <table class="guest-table">
      <thead>
        <tr>
          <th style="width: ${isLandscape ? '38px' : '30px'};" class="center">#</th>
          <th style="width: ${isLandscape ? (includeBatch ? '28%' : '32%') : (includeBatch ? '27%' : '30%')};">Titular do Ingresso / Convidado</th>
          <th style="width: ${isLandscape ? (includeBatch ? '14%' : '16%') : (includeBatch ? '14%' : '16%')};">Documento</th>
          <th style="width: ${isLandscape ? (includeBatch ? '14%' : '15%') : (includeBatch ? '13%' : '14%')};">WhatsApp / Tel</th>
          ${includeBatch ? `<th style="width: ${isLandscape ? '14%' : '13%'};">Lote / Ingresso</th>` : ''}
          <th style="width: ${isLandscape ? (includeBatch ? '11%' : '13%') : (includeBatch ? '11%' : '13%')};">Identificador</th>
          <th style="width: ${isLandscape ? (includeBatch ? '19%' : '24%') : (includeBatch ? '22%' : '27%')};">Validação Portaria</th>
        </tr>
      </thead>
      <tbody>
        ${letters.map((letter) => {
          const group = letterGroups[letter];
          const colSpan = includeBatch ? 7 : 6;
          const letterHeader = `
            <tr class="letter-row">
              <td colspan="${colSpan}">
                LETRA ${letter} &nbsp;—&nbsp; <span style="font-size:9px; font-weight:normal; opacity:0.85;">${group.length} ${group.length === 1 ? 'convidado' : 'convidados'}</span>
              </td>
            </tr>
          `;

          const rows = group.map((item) => {
            const hasCheckin = item.ticketStatus === 'used' || !!item.usedAt;
            const isComp = item.isComplimentary;
            const batchLabel = isComp ? 'Cortesia' : item.batchName;

            let checkinContent = '';
            if (hasCheckin) {
              const timeFormatted = formatTimeBR(item.usedAt);
              checkinContent = `
                <div class="used-stamp">
                  ✓ JÁ ENTROU ${timeFormatted ? `(${timeFormatted})` : ''}
                </div>
              `;
            } else if (item.ticketStatus === 'pending') {
              checkinContent = `
                <span style="color:#dc2626; font-size:8.5px; font-weight:700;">⚠️ PAGTO PENDENTE</span>
              `;
            } else {
              checkinContent = `
                <div class="manual-checkin-box">
                  <div class="check-square"></div>
                  <span class="check-time">___:___</span>
                  ${options.includeSignatureLine ? '<div class="sign-line" title="Rubrica"></div>' : ''}
                </div>
              `;
            }

            return `
              <tr>
                <td class="center" style="font-weight:700; color:#64748b;">${item.seq}</td>
                <td>
                  <div class="holder-name" title="${esc(item.holderName)}">${esc(item.holderName)}</div>
                  ${(!item.isVirtualOrGeneric && item.buyerName && item.buyerName !== item.holderName) 
                    ? `<div class="buyer-sub">Comprador: ${esc(item.buyerName)}</div>` 
                    : (item.isVirtualOrGeneric ? `<div class="buyer-sub" style="color:#d97706;">Cota do Comprador</div>` : '')}
                </td>
                <td>
                  <div class="doc-num">${esc(formatCPF(item.holderDoc) || '-')}</div>
                </td>
                <td>
                  <div class="phone-num">${esc(formatPhone(item.holderPhone) || '-')}</div>
                </td>
                ${includeBatch ? `
                <td>
                  <span class="badge-batch ${isComp ? 'badge-comp' : ''}">${esc(batchLabel)}</span>
                </td>
                ` : ''}
                <td>
                  <div class="ticket-code">#${esc(item.orderId.substring(0, 8).toUpperCase())}</div>
                  <div style="font-size:7.5px; color:#94a3b8;">Ing. #${esc(item.ticketNumber)} ${item.qrCodeShort ? `• ${esc(item.qrCodeShort)}` : ''}</div>
                </td>
                <td class="checkin-cell">
                  ${checkinContent}
                </td>
              </tr>
            `;
          }).join('');

          return letterHeader + rows;
        }).join('')}
      </tbody>
    </table>

    <!-- Rodapé -->
    <footer class="doc-footer">
      <div>Better Now &bull; Sistema de Gestão de Eventos e Contingência de Portaria</div>
      <div>Documento de uso restrito e confidencial para credenciamento &bull; Página Gerada em ${emissionDate}</div>
    </footer>
  </div>

  <script>
    // Dispara a caixa de impressão automaticamente com delay suave para renderizar fontes e CSS
    window.addEventListener('load', () => {
      setTimeout(() => {
        window.print();
      }, 350);
    });
  </script>
</body>
</html>`;
};

/**
 * Abre a janela de impressão do navegador com o relatório formatado
 */
export const openGuestListPrintWindow = (
  event: Event,
  items: FlattenedTicketItem[],
  options: GuestListPrintOptions
): boolean => {
  const preparedItems = prepareGuestListItems(items, options);

  const win = window.open('', '_blank');
  if (!win) return false;

  const html = renderGuestListPrintHtml(event, preparedItems, options);
  win.document.open();
  win.document.write(html);
  win.document.close();

  return true;
};
