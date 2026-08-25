import React, { useState, useEffect, useCallback } from 'react';
import {
  BarChart3,
  Download,
  FileText,
  Users,
  Calendar,
  TrendingUp,
  PieChart,
  Filter,
  RefreshCw,
  DollarSign,
  Ticket,
  CheckCircle2,
  Clock,
  XCircle,
  CreditCard,
  QrCode,
  MapPin,
  Tag,
  Printer,
  ChevronRight,
  ShieldCheck,
  UserCheck
} from 'lucide-react';
import { supabase } from '../../shared/services/lib/supabase';
import { useSupabaseEvents } from '../../shared/hooks/hooks/useSupabaseEvents';
import { formatBrazilDate, formatPrice } from '../../shared/utils/utils/eventUtils';
import { toast } from 'sonner';

interface EventReportsProps {
  eventId?: string;
}

interface OrderRecord {
  id: string;
  event_id: string;
  client_name?: string;
  client_email?: string;
  client_phone?: string;
  client_document?: string;
  amount_total?: number;
  quantity?: number;
  batch_index?: number;
  batch_name?: string;
  status: string;
  payment_method?: string;
  convenience_fee?: number;
  discount_amount?: number;
  coupon_code?: string;
  created_at: string;
  updated_at?: string;
}

interface TicketRecord {
  id: string;
  order_id: string;
  event_id: string;
  ticket_number: string | number;
  status: string;
  used_at?: string;
  created_at: string;
}

interface ReportData {
  totalParticipants: number;
  checkedInParticipants: number;
  confirmedParticipants: number;
  pendingParticipants: number;
  cancelledParticipants: number;
  totalOrdersCount: number;
  confirmedOrdersCount: number;
  totalRevenue: number;
  totalDiscount: number;
  checkInRate: number;
  confirmationRate: number;
  paymentMethodDistribution: Record<string, { count: number; total: number }>;
  batchDistribution: Record<string, { count: number; total: number; name: string }>;
  locationDistribution: Record<string, number>;
  registrationTrend: Array<{ date: string; displayDate: string; count: number; amount: number }>;
  checkInTrend: Array<{ hour: string; count: number }>;
  recentOrders: OrderRecord[];
}

/**
 * Mapeamento inteligente de DDD para Regiões / Estados brasileiros
 */
const getRegionFromPhone = (phone?: string | null): string => {
  if (!phone) return 'Não informado';
  const clean = phone.replace(/\D/g, '');
  const local = clean.startsWith('55') && clean.length > 9 ? clean.substring(2) : clean;
  if (local.length < 2) return 'Não informado';
  
  const ddd = local.substring(0, 2);
  const dddMap: Record<string, string> = {
    '11': 'São Paulo (Capital/Grande SP)',
    '12': 'Vale do Paraíba / Litoral Norte (SP)',
    '13': 'Baixada Santista (SP)',
    '14': 'Bauru / Marília / Jaú (SP)',
    '15': 'Sorocaba / Itapetininga (SP)',
    '16': 'Ribeirão Preto / Franca (SP)',
    '17': 'São José do Rio Preto (SP)',
    '18': 'Presidente Prudente / Araçatuba (SP)',
    '19': 'Campinas e Região (SP)',
    '21': 'Rio de Janeiro (Capital/Metropolitana)',
    '22': 'Região dos Lagos / Norte Fluminense (RJ)',
    '24': 'Região Serrana / Sul Fluminense (RJ)',
    '27': 'Vitória / Metropolitana (ES)',
    '28': 'Sul do Espírito Santo (ES)',
    '31': 'Belo Horizonte / Metropolitana (MG)',
    '32': 'Juiz de Fora / Zona da Mata (MG)',
    '33': 'Governador Valadares / Leste (MG)',
    '34': 'Uberlândia / Triângulo Mineiro (MG)',
    '35': 'Poços de Caldas / Sul de Minas (MG)',
    '37': 'Divinópolis / Centro-Oeste (MG)',
    '38': 'Montes Claros / Norte (MG)',
    '41': 'Curitiba / Metropolitana (PR)',
    '42': 'Ponta Grossa / Campos Gerais (PR)',
    '43': 'Londrina / Norte do Paraná (PR)',
    '44': 'Maringá / Noroeste do Paraná (PR)',
    '45': 'Foz do Iguaçu / Cascavel (PR)',
    '46': 'Francisco Beltrão / Sudoeste (PR)',
    '47': 'Joinville / Blumenau / Litoral (SC)',
    '48': 'Florianópolis / Litoral Sul (SC)',
    '49': 'Chapecó / Oeste Catarinense (SC)',
    '51': 'Porto Alegre / Metropolitana (RS)',
    '53': 'Pelotas / Rio Grande (RS)',
    '54': 'Caxias do Sul / Serra Gaúcha (RS)',
    '55': 'Santa Maria / Centro-Oeste (RS)',
    '61': 'Brasília / Distrito Federal',
    '62': 'Goiânia / Metropolitana (GO)',
    '63': 'Palmas / Tocantins',
    '64': 'Rio Verde / Sul Goiano (GO)',
    '65': 'Cuiabá / Metropolitana (MT)',
    '66': 'Rondonópolis / Sinop (MT)',
    '67': 'Campo Grande / Mato Grosso do Sul',
    '68': 'Rio Branco / Acre',
    '69': 'Porto Velho / Rondônia',
    '71': 'Salvador / Metropolitana (BA)',
    '73': 'Ilhéus / Itabuna (BA)',
    '74': 'Juazeiro / Sertão Baiano (BA)',
    '75': 'Feira de Santana (BA)',
    '77': 'Vitória da Conquista (BA)',
    '79': 'Aracaju / Sergipe',
    '81': 'Recife / Metropolitana (PE)',
    '82': 'Maceió / Alagoas',
    '83': 'João Pessoa / Paraíba',
    '84': 'Natal / Rio Grande do Norte',
    '85': 'Fortaleza / Metropolitana (CE)',
    '86': 'Teresina / Piauí',
    '87': 'Petrolina / Sertão Pernambucano (PE)',
    '88': 'Juazeiro do Norte / Cariri (CE)',
    '89': 'Picos / Floriano (PI)',
    '91': 'Belém / Metropolitana (PA)',
    '92': 'Manaus / Amazonas',
    '93': 'Santarém / Oeste do Pará',
    '94': 'Marabá / Sul do Pará',
    '95': 'Boa Vista / Roraima',
    '96': 'Macapá / Amapá',
    '97': 'Interior do Amazonas',
    '98': 'São Luís / Metropolitana (MA)',
    '99': 'Imperatriz / Sul do Maranhão',
  };

  return dddMap[ddd] || `DDD (${ddd})`;
};

const formatPaymentMethodName = (method?: string): string => {
  if (!method) return 'Não informado';
  const m = method.toLowerCase();
  if (m === 'credit_card' || m === 'cartao' || m === 'card') return 'Cartão de Crédito';
  if (m === 'pix' || m === 'pix_chave' || m === 'pix_stripe') return 'Pix';
  if (m === 'boleto') return 'Boleto Bancário';
  if (m === 'cortesia') return 'Cortesia (Cupom 100%)';
  if (m === 'mercadopago') return 'Mercado Pago';
  return method;
};

const EventReports: React.FC<EventReportsProps> = ({ eventId }) => {
  const { events, fetchEvents } = useSupabaseEvents();

  const [selectedEvent, setSelectedEvent] = useState(eventId || '');
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [reportType, setReportType] = useState<'summary' | 'detailed' | 'analytics'>('summary');
  const [exportFormat, setExportFormat] = useState<'csv' | 'excel' | 'pdf' | 'json'>('csv');

  useEffect(() => {
    fetchEvents();
    if (eventId) {
      setSelectedEvent(eventId);
    }
  }, [eventId]);

  const loadEventData = useCallback(async (targetEventId: string) => {
    if (!targetEventId) return;
    setLoading(true);

    try {
      // 1. Buscar todos os pedidos do evento no Supabase
      let ordersQuery = supabase
        .from('app_event_orders')
        .select('*')
        .eq('event_id', targetEventId)
        .order('created_at', { ascending: false });

      if (dateRange.start) {
        ordersQuery = ordersQuery.gte('created_at', `${dateRange.start}T00:00:00.000Z`);
      }
      if (dateRange.end) {
        ordersQuery = ordersQuery.lte('created_at', `${dateRange.end}T23:59:59.999Z`);
      }

      const { data: ordersData, error: ordersErr } = await ordersQuery;
      if (ordersErr) {
        console.error('Erro ao buscar pedidos para relatório:', ordersErr);
        throw ordersErr;
      }

      const orders: OrderRecord[] = ordersData || [];

      // 2. Buscar todos os ingressos emitidos do evento
      const { data: ticketsData, error: ticketsErr } = await supabase
        .from('app_event_tickets')
        .select('*')
        .eq('event_id', targetEventId);

      if (ticketsErr) {
        console.error('Erro ao buscar ingressos para relatório:', ticketsErr);
      }

      const tickets: TicketRecord[] = ticketsData || [];

      // 3. Processar métricas e cálculos reais
      const totalOrdersCount = orders.length;
      const confirmedOrders = orders.filter(o => ['paid', 'approved', 'completed'].includes(o.status));
      const pendingOrders = orders.filter(o => ['pending', 'pending_proof'].includes(o.status));
      const cancelledOrders = orders.filter(o => o.status === 'cancelled');

      // Quantidades de ingressos por status
      const confirmedParticipants = confirmedOrders.reduce((sum, o) => sum + (Number(o.quantity) || 1), 0);
      const pendingParticipants = pendingOrders.reduce((sum, o) => sum + (Number(o.quantity) || 1), 0);
      const cancelledParticipants = cancelledOrders.reduce((sum, o) => sum + (Number(o.quantity) || 1), 0);
      const totalParticipants = confirmedParticipants; // Participantes confirmados com ingresso

      // Check-ins reais realizados
      const checkedInTickets = tickets.filter(t => t.status === 'used' || Boolean(t.used_at));
      const checkedInParticipants = checkedInTickets.length;

      // Valores financeiros
      const totalRevenue = confirmedOrders.reduce((sum, o) => sum + (Number(o.amount_total) || 0), 0);
      const totalDiscount = confirmedOrders.reduce((sum, o) => sum + (Number(o.discount_amount) || 0), 0);

      // Taxas
      const checkInRate = confirmedParticipants > 0 ? (checkedInParticipants / confirmedParticipants) * 100 : 0;
      const confirmationRate = totalOrdersCount > 0 ? (confirmedOrders.length / totalOrdersCount) * 100 : 0;

      // Distribuição por Forma de Pagamento
      const paymentMethodDistribution: Record<string, { count: number; total: number }> = {};
      confirmedOrders.forEach(o => {
        const methodKey = formatPaymentMethodName(o.payment_method);
        if (!paymentMethodDistribution[methodKey]) {
          paymentMethodDistribution[methodKey] = { count: 0, total: 0 };
        }
        paymentMethodDistribution[methodKey].count += (Number(o.quantity) || 1);
        paymentMethodDistribution[methodKey].total += (Number(o.amount_total) || 0);
      });

      // Distribuição por Lotes de Ingressos
      const batchDistribution: Record<string, { count: number; total: number; name: string }> = {};
      confirmedOrders.forEach(o => {
        const batchName = o.batch_name || `Lote ${(Number(o.batch_index) || 0) + 1}`;
        if (!batchDistribution[batchName]) {
          batchDistribution[batchName] = { count: 0, total: 0, name: batchName };
        }
        batchDistribution[batchName].count += (Number(o.quantity) || 1);
        batchDistribution[batchName].total += (Number(o.amount_total) || 0);
      });

      // Distribuição Geográfica (Baseada no DDD do WhatsApp/Telefone)
      const locationDistribution: Record<string, number> = {};
      confirmedOrders.forEach(o => {
        const region = getRegionFromPhone(o.client_phone);
        locationDistribution[region] = (locationDistribution[region] || 0) + (Number(o.quantity) || 1);
      });

      // Tendência de Inscrições / Vendas nos últimos 30 dias
      const registrationTrend: Array<{ date: string; displayDate: string; count: number; amount: number }> = [];
      const daysCount = 14; // Últimos 14 dias para visualização otimizada
      for (let i = daysCount - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        const displayDate = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

        const ordersOnDay = confirmedOrders.filter(o => o.created_at && o.created_at.startsWith(dateStr));
        const countOnDay = ordersOnDay.reduce((sum, o) => sum + (Number(o.quantity) || 1), 0);
        const amountOnDay = ordersOnDay.reduce((sum, o) => sum + (Number(o.amount_total) || 0), 0);

        registrationTrend.push({
          date: dateStr,
          displayDate,
          count: countOnDay,
          amount: amountOnDay,
        });
      }

      // Tendência de Check-in por Horário (00h às 23h)
      const checkInTrend: Array<{ hour: string; count: number }> = [];
      for (let hour = 0; hour < 24; hour++) {
        const hourStr = hour.toString().padStart(2, '0') + ':00';
        const count = checkedInTickets.filter(t => {
          if (!t.used_at) return false;
          try {
            const h = new Date(t.used_at).getHours();
            return h === hour;
          } catch {
            return false;
          }
        }).length;
        checkInTrend.push({ hour: hourStr, count });
      }

      setReportData({
        totalParticipants,
        checkedInParticipants,
        confirmedParticipants,
        pendingParticipants,
        cancelledParticipants,
        totalOrdersCount,
        confirmedOrdersCount: confirmedOrders.length,
        totalRevenue,
        totalDiscount,
        checkInRate,
        confirmationRate,
        paymentMethodDistribution,
        batchDistribution,
        locationDistribution,
        registrationTrend,
        checkInTrend,
        recentOrders: orders.slice(0, 50),
      });
    } catch (err: any) {
      console.error('Erro ao gerar relatório do evento:', err);
      toast.error('Erro ao carregar dados do evento para o relatório.');
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    if (selectedEvent) {
      loadEventData(selectedEvent);
    }
  }, [selectedEvent, loadEventData]);

  const currentEvent = events.find(e => e.id === selectedEvent);

  /**
   * Exportar relatório completo em CSV (formatado com UTF-8 BOM para Excel) ou JSON
   */
  const handleExportReport = async () => {
    if (!selectedEvent || !reportData || !currentEvent) {
      toast.error('Selecione um evento para exportar o relatório.');
      return;
    }

    if (exportFormat === 'pdf') {
      window.print();
      return;
    }

    if (exportFormat === 'json') {
      const exportObject = {
        evento: {
          id: currentEvent.id,
          titulo: currentEvent.title,
          data: currentEvent.event_date,
          local: currentEvent.location,
          capacidade: currentEvent.max_guests || currentEvent.capacity,
        },
        metricas: {
          totalParticipantes: reportData.totalParticipants,
          checkInsRealizados: reportData.checkedInParticipants,
          taxaCheckIn: `${reportData.checkInRate.toFixed(1)}%`,
          taxaConfirmacao: `${reportData.confirmationRate.toFixed(1)}%`,
          receitaTotal: reportData.totalRevenue,
          descontosConcedidos: reportData.totalDiscount,
        },
        pedidos: reportData.recentOrders,
      };

      const blob = new Blob([JSON.stringify(exportObject, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `relatorio_${currentEvent.title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success('Relatório JSON exportado com sucesso!');
      return;
    }

    // Exportação em CSV formatado com cabeçalhos e BOM
    const lines: string[] = [];

    // Cabeçalho do Relatório
    lines.push(`"RELATÓRIO DO EVENTO: ${currentEvent.title.toUpperCase()}"`);
    lines.push(`"Data do Evento";"${formatBrazilDate(currentEvent.event_date)}"`);
    lines.push(`"Local";"${currentEvent.location || 'Não informado'}"`);
    lines.push(`"Capacidade Total";"${currentEvent.max_guests || currentEvent.capacity || 'Ilimitada'}"`);
    lines.push(`"Data de Extração";"${new Date().toLocaleString('pt-BR')}"`);
    lines.push('');

    // Resumo de KPIs
    lines.push('"RESUMO EXECUTIVO"');
    lines.push(`"Total de Ingressos Confirmados";"${reportData.totalParticipants}"`);
    lines.push(`"Check-ins Realizados";"${reportData.checkedInParticipants}"`);
    lines.push(`"Taxa de Presença / Check-in";"${reportData.checkInRate.toFixed(1)}%"`);
    lines.push(`"Receita Total Arrecadada (R$)";"${reportData.totalRevenue.toFixed(2).replace('.', ',')}"`);
    lines.push(`"Total de Descontos Concedidos (R$)";"${reportData.totalDiscount.toFixed(2).replace('.', ',')}"`);
    lines.push(`"Total de Pedidos Gerados";"${reportData.totalOrdersCount}"`);
    lines.push(`"Pedidos Confirmados";"${reportData.confirmedOrdersCount}"`);
    lines.push(`"Taxa de Confirmação";"${reportData.confirmationRate.toFixed(1)}%"`);
    lines.push('');

    // Tabela detalhada de Pedidos / Compradores
    lines.push('"LISTA DETALHADA DE PEDIDOS E PARTICIPANTES"');
    lines.push('"ID Pedido";"Data/Hora";"Nome do Comprador";"Documento/CPF";"WhatsApp / Telefone";"E-mail";"Lote";"Qtd";"Valor Total (R$)";"Forma de Pagamento";"Status";"Cupom"');

    reportData.recentOrders.forEach(o => {
      const orderIdShort = o.id ? o.id.substring(0, 8).toUpperCase() : '-';
      const orderDate = o.created_at ? new Date(o.created_at).toLocaleString('pt-BR') : '-';
      const name = (o.client_name || 'Não informado').replace(/"/g, '""');
      const doc = o.client_document || '-';
      const phone = o.client_phone || '-';
      const email = o.client_email || '-';
      const batch = (o.batch_name || `Lote ${(Number(o.batch_index) || 0) + 1}`).replace(/"/g, '""');
      const qty = o.quantity || 1;
      const amount = Number(o.amount_total || 0).toFixed(2).replace('.', ',');
      const method = formatPaymentMethodName(o.payment_method);
      const statusLabel = o.status === 'paid' ? 'Pago / Confirmado' : o.status === 'pending' ? 'Pendente' : o.status === 'pending_proof' ? 'Aguardando Comprovante' : o.status === 'cancelled' ? 'Cancelado' : o.status;
      const coupon = o.coupon_code || '-';

      lines.push(`"${orderIdShort}";"${orderDate}";"${name}";"${doc}";"${phone}";"${email}";"${batch}";"${qty}";"${amount}";"${method}";"${statusLabel}";"${coupon}"`);
    });

    const csvContent = '\uFEFF' + lines.join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `relatorio_${currentEvent.title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    toast.success('Relatório CSV para Excel exportado com sucesso!');
  };

  const capacityNumber = Number(currentEvent?.max_guests || currentEvent?.capacity || 0);
  const occupancyPercentage = capacityNumber > 0 && reportData
    ? Math.min(100, Math.round((reportData.totalParticipants / capacityNumber) * 100))
    : 0;

  return (
    <div className="bg-white rounded-2xl shadow-xs border border-gray-100 overflow-hidden space-y-6 print:border-none print:shadow-none">
      {/* Barra de Filtros e Controles de Exportação */}
      <div className="p-5 sm:p-6 border-b border-gray-100 bg-gray-50/50 space-y-4 print:hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 leading-tight">Relatórios de Eventos</h2>
              <p className="text-xs text-gray-500">Métricas financeiras, presença e dados consolidados em tempo real</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => selectedEvent && loadEventData(selectedEvent)}
              disabled={loading || !selectedEvent}
              className="p-2.5 text-gray-600 hover:text-gray-900 bg-white border border-gray-200 hover:bg-gray-100 rounded-xl transition-all disabled:opacity-50 shadow-2xs cursor-pointer"
              title="Atualizar dados"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-600' : ''}`} />
            </button>

            <button
              type="button"
              onClick={handleExportReport}
              disabled={loading || !reportData}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-xl font-semibold text-xs sm:text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm shadow-indigo-600/20 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Exportar</span>
            </button>
          </div>
        </div>

        {/* Linha de Filtros */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">
              <Calendar className="w-3.5 h-3.5 inline mr-1 text-indigo-500" />
              Selecionar Evento
            </label>
            <select
              value={selectedEvent}
              onChange={(e) => setSelectedEvent(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-800"
            >
              <option value="">Selecione um evento</option>
              {events.map(event => (
                <option key={event.id} value={event.id}>
                  {event.title} - {formatBrazilDate(event.event_date)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">
              <FileText className="w-3.5 h-3.5 inline mr-1 text-indigo-500" />
              Tipo de Visualização
            </label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value as typeof reportType)}
              className="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-800"
            >
              <option value="summary">Resumo Executivo & Vendas</option>
              <option value="detailed">Participantes & Ingressos</option>
              <option value="analytics">Analytics & Comportamento</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">
              <Download className="w-3.5 h-3.5 inline mr-1 text-indigo-500" />
              Formato de Exportação
            </label>
            <select
              value={exportFormat}
              onChange={(e) => setExportFormat(e.target.value as typeof exportFormat)}
              className="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-800"
            >
              <option value="csv">CSV (Excel com Acentos)</option>
              <option value="excel">Excel (CSV Estruturado)</option>
              <option value="pdf">Imprimir / Salvar PDF</option>
              <option value="json">JSON (Dados Brutos)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">
              <Filter className="w-3.5 h-3.5 inline mr-1 text-indigo-500" />
              Data Inicial
            </label>
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
              className="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-800"
            />
          </div>
        </div>
      </div>

      {/* Conteúdo Principal */}
      <div className="p-5 sm:p-6 space-y-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-3">
            <RefreshCw className="w-10 h-10 text-indigo-600 animate-spin" />
            <span className="text-sm font-medium text-gray-600">Carregando dados consolidados do evento...</span>
          </div>
        ) : !selectedEvent ? (
          <div className="text-center py-16">
            <BarChart3 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-gray-900 mb-1">Selecione um Evento</h3>
            <p className="text-sm text-gray-500">Escolha um evento na barra acima para visualizar as análises e estatísticas em tempo real.</p>
          </div>
        ) : !reportData ? (
          <div className="text-center py-16">
            <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-gray-900 mb-1">Nenhum dado encontrado</h3>
            <p className="text-sm text-gray-500">Não há dados registrados para o período ou evento selecionado.</p>
          </div>
        ) : (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Banner de Informações do Evento */}
            {currentEvent && (
              <div className="relative overflow-hidden bg-gradient-to-r from-indigo-700 via-indigo-800 to-purple-800 rounded-2xl p-5 sm:p-6 text-white shadow-md">
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold uppercase tracking-wider bg-white/20 px-2.5 py-0.5 rounded-full backdrop-blur-xs">
                        {currentEvent.status === 'active' ? 'Evento Ativo' : currentEvent.status === 'completed' ? 'Finalizado' : 'Publicado'}
                      </span>
                    </div>
                    <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight">{currentEvent.title}</h3>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs sm:text-sm bg-white/10 p-3.5 rounded-xl backdrop-blur-xs border border-white/10">
                    <div>
                      <p className="text-indigo-200 font-medium">Data do Evento</p>
                      <p className="font-bold text-white mt-0.5">{formatBrazilDate(currentEvent.event_date)}</p>
                    </div>
                    <div>
                      <p className="text-indigo-200 font-medium">Local</p>
                      <p className="font-bold text-white mt-0.5 truncate max-w-[150px]" title={currentEvent.location || 'Não informado'}>
                        {currentEvent.location || 'Não informado'}
                      </p>
                    </div>
                    <div>
                      <p className="text-indigo-200 font-medium">Capacidade</p>
                      <p className="font-bold text-white mt-0.5">
                        {capacityNumber > 0 ? `${capacityNumber} lugares (${occupancyPercentage}%)` : 'Ilimitada'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Cards de Métricas Principais (KPIs) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Total de Participantes / Ingressos */}
              <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-xs flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Ingressos Confirmados</p>
                  <p className="text-2xl sm:text-3xl font-black text-gray-900 mt-1">{reportData.totalParticipants}</p>
                  <span className="text-xs text-gray-400 mt-0.5 block">
                    {reportData.confirmedOrdersCount} pedidos pagos
                  </span>
                </div>
                <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                  <Ticket className="w-6 h-6" />
                </div>
              </div>

              {/* Receita Total Arrecadada */}
              <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-xs flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Arrecadação Total</p>
                  <p className="text-2xl sm:text-3xl font-black text-emerald-600 mt-1">
                    {formatPrice(reportData.totalRevenue)}
                  </p>
                  <span className="text-xs text-emerald-700/80 mt-0.5 block">
                    {reportData.totalDiscount > 0 ? `Economia: ${formatPrice(reportData.totalDiscount)}` : 'Sem descontos'}
                  </span>
                </div>
                <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                  <DollarSign className="w-6 h-6" />
                </div>
              </div>

              {/* Taxa de Confirmação */}
              <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-xs flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Taxa de Conversão</p>
                  <p className="text-2xl sm:text-3xl font-black text-indigo-600 mt-1">
                    {reportData.confirmationRate.toFixed(1)}%
                  </p>
                  <span className="text-xs text-gray-400 mt-0.5 block">
                    {reportData.totalOrdersCount} intenções de compra
                  </span>
                </div>
                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                  <TrendingUp className="w-6 h-6" />
                </div>
              </div>

              {/* Check-ins Realizados */}
              <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-xs flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Check-in Realizado</p>
                  <p className="text-2xl sm:text-3xl font-black text-purple-600 mt-1">
                    {reportData.checkedInParticipants}
                  </p>
                  <span className="text-xs text-purple-600/80 font-medium mt-0.5 block">
                    Taxa de presença: {reportData.checkInRate.toFixed(1)}%
                  </span>
                </div>
                <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
                  <UserCheck className="w-6 h-6" />
                </div>
              </div>
            </div>

            {/* Painéis de Distribuição (Status, Formas de Pagamento e Lotes) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Distribuição por Status */}
              <div className="bg-white p-5 sm:p-6 rounded-2xl border border-gray-100 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Distribuição por Status</h3>
                  <PieChart className="w-4 h-4 text-gray-400" />
                </div>

                <div className="space-y-3.5">
                  {/* Confirmados */}
                  <div>
                    <div className="flex items-center justify-between text-xs font-semibold mb-1">
                      <span className="text-emerald-700 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        Confirmados / Pagos
                      </span>
                      <span className="text-gray-900">{reportData.confirmedParticipants} ingressos</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-emerald-500 h-full rounded-full transition-all"
                        style={{
                          width: `${(reportData.confirmedParticipants + reportData.pendingParticipants + reportData.cancelledParticipants) > 0
                            ? (reportData.confirmedParticipants / (reportData.confirmedParticipants + reportData.pendingParticipants + reportData.cancelledParticipants)) * 100
                            : 0}%`
                        }}
                      ></div>
                    </div>
                  </div>

                  {/* Pendentes */}
                  <div>
                    <div className="flex items-center justify-between text-xs font-semibold mb-1">
                      <span className="text-amber-700 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-amber-600" />
                        Aguardando Pagamento
                      </span>
                      <span className="text-gray-900">{reportData.pendingParticipants} ingressos</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-amber-500 h-full rounded-full transition-all"
                        style={{
                          width: `${(reportData.confirmedParticipants + reportData.pendingParticipants + reportData.cancelledParticipants) > 0
                            ? (reportData.pendingParticipants / (reportData.confirmedParticipants + reportData.pendingParticipants + reportData.cancelledParticipants)) * 100
                            : 0}%`
                        }}
                      ></div>
                    </div>
                  </div>

                  {/* Cancelados */}
                  <div>
                    <div className="flex items-center justify-between text-xs font-semibold mb-1">
                      <span className="text-red-700 flex items-center gap-1.5">
                        <XCircle className="w-3.5 h-3.5 text-red-600" />
                        Cancelados / Recusados
                      </span>
                      <span className="text-gray-900">{reportData.cancelledParticipants} ingressos</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-red-500 h-full rounded-full transition-all"
                        style={{
                          width: `${(reportData.confirmedParticipants + reportData.pendingParticipants + reportData.cancelledParticipants) > 0
                            ? (reportData.cancelledParticipants / (reportData.confirmedParticipants + reportData.pendingParticipants + reportData.cancelledParticipants)) * 100
                            : 0}%`
                        }}
                      ></div>
                    </div>
                  </div>

                  {/* Check-in Feito */}
                  <div className="pt-2 border-t border-gray-100">
                    <div className="flex items-center justify-between text-xs font-semibold mb-1">
                      <span className="text-purple-700 flex items-center gap-1.5">
                        <UserCheck className="w-3.5 h-3.5 text-purple-600" />
                        Check-in Feito (Presença)
                      </span>
                      <span className="text-gray-900">{reportData.checkedInParticipants} de {reportData.totalParticipants}</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-purple-600 h-full rounded-full transition-all"
                        style={{ width: `${reportData.checkInRate}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Formas de Pagamento */}
              <div className="bg-white p-5 sm:p-6 rounded-2xl border border-gray-100 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Formas de Pagamento</h3>
                  <CreditCard className="w-4 h-4 text-gray-400" />
                </div>

                {Object.keys(reportData.paymentMethodDistribution).length === 0 ? (
                  <p className="text-xs text-gray-400 py-6 text-center">Nenhum pagamento confirmado ainda.</p>
                ) : (
                  <div className="space-y-3">
                    {(Object.entries(reportData.paymentMethodDistribution) as [string, { count: number; total: number }][]).map(([method, data]) => {
                      const percentage = reportData.totalParticipants > 0
                        ? Math.round((Number(data.count) / reportData.totalParticipants) * 100)
                        : 0;
                      return (
                        <div key={method} className="p-3 bg-gray-50 rounded-xl space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-gray-800">{method}</span>
                            <span className="font-mono font-bold text-emerald-600">{formatPrice(data.total)}</span>
                          </div>
                          <div className="flex items-center justify-between text-[11px] text-gray-500">
                            <span>{data.count} ingressos</span>
                            <span>{percentage}% do total</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                            <div className="bg-indigo-600 h-full rounded-full" style={{ width: `${percentage}%` }}></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Vendas por Lote */}
              <div className="bg-white p-5 sm:p-6 rounded-2xl border border-gray-100 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Vendas por Lote</h3>
                  <Tag className="w-4 h-4 text-gray-400" />
                </div>

                {Object.keys(reportData.batchDistribution).length === 0 ? (
                  <p className="text-xs text-gray-400 py-6 text-center">Nenhum lote vendido ainda.</p>
                ) : (
                  <div className="space-y-3">
                    {(Object.entries(reportData.batchDistribution) as [string, { count: number; total: number; name: string }][]).map(([batch, data]) => {
                      const percentage = reportData.totalParticipants > 0
                        ? Math.round((Number(data.count) / reportData.totalParticipants) * 100)
                        : 0;
                      return (
                        <div key={batch} className="p-3 bg-gray-50 rounded-xl space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-gray-800">{data.name}</span>
                            <span className="font-mono font-bold text-indigo-700">{formatPrice(data.total)}</span>
                          </div>
                          <div className="flex items-center justify-between text-[11px] text-gray-500">
                            <span>{data.count} vendidos</span>
                            <span>{percentage}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                            <div className="bg-purple-600 h-full rounded-full" style={{ width: `${percentage}%` }}></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Tendência de Inscrições e Distribuição Geográfica */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Tendência de Inscrições / Vendas (Linha do Tempo) */}
              <div className="bg-white p-5 sm:p-6 rounded-2xl border border-gray-100 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Tendência de Inscrições</h3>
                    <p className="text-xs text-gray-400">Ingressos emitidos nos últimos 14 dias</p>
                  </div>
                  <TrendingUp className="w-4 h-4 text-indigo-500" />
                </div>

                <div className="h-44 flex items-end justify-between gap-1.5 pt-4">
                  {reportData.registrationTrend.map((item, index) => {
                    const maxCount = Math.max(...reportData.registrationTrend.map(i => i.count), 1);
                    const height = (item.count / maxCount) * 100;

                    return (
                      <div key={index} className="flex flex-col items-center flex-1 h-full justify-end group/bar relative">
                        {/* Tooltip ao passar o mouse */}
                        <div className="opacity-0 group-hover/bar:opacity-100 absolute bottom-full mb-1.5 pointer-events-none transition-opacity bg-gray-900 text-white text-[10px] rounded-md px-2 py-1 z-20 whitespace-nowrap shadow-lg">
                          <p className="font-bold">{item.displayDate}: {item.count} ingressos</p>
                          <p className="text-emerald-300 font-mono">{formatPrice(item.amount)}</p>
                        </div>

                        <div
                          className={`w-full rounded-t-md transition-all duration-300 ${
                            item.count > 0 ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-gray-100'
                          }`}
                          style={{ height: `${Math.max(height, 4)}%` }}
                        ></div>
                        <span className="text-[10px] text-gray-400 mt-2 transform -rotate-45 origin-left">
                          {item.displayDate}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Origem dos Participantes (Distribuição Geográfica por DDD) */}
              <div className="bg-white p-5 sm:p-6 rounded-2xl border border-gray-100 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Origem dos Participantes</h3>
                    <p className="text-xs text-gray-400">Mapeamento regional pelo DDD do WhatsApp</p>
                  </div>
                  <MapPin className="w-4 h-4 text-purple-500" />
                </div>

                <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                  {Object.keys(reportData.locationDistribution).length === 0 ? (
                    <p className="text-xs text-gray-400 py-6 text-center">Nenhuma localização identificada.</p>
                  ) : (
                    (Object.entries(reportData.locationDistribution) as [string, number][])
                      .sort(([, a], [, b]) => Number(b) - Number(a))
                      .map(([location, count]) => {
                        const pct = reportData.totalParticipants > 0
                          ? Math.round((Number(count) / reportData.totalParticipants) * 100)
                          : 0;
                        return (
                          <div key={location} className="flex items-center justify-between text-xs py-1 border-b border-gray-50 last:border-0">
                            <span className="text-gray-700 font-medium truncate max-w-[200px]">{location}</span>
                            <div className="flex items-center gap-2">
                              <div className="w-20 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                                <div className="bg-purple-600 h-full rounded-full" style={{ width: `${pct}%` }}></div>
                              </div>
                              <span className="font-bold text-gray-900 w-12 text-right">{count} ({pct}%)</span>
                            </div>
                          </div>
                        );
                      })
                  )}
                </div>
              </div>
            </div>

            {/* Check-ins por Horário */}
            <div className="bg-white p-5 sm:p-6 rounded-2xl border border-gray-100 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Fluxo de Entrada / Check-in por Horário</h3>
                  <p className="text-xs text-gray-400">Distribuição das validações de QR Code pelas 24 horas</p>
                </div>
                <UserCheck className="w-4 h-4 text-emerald-500" />
              </div>

              <div className="h-36 flex items-end justify-between gap-1 pt-2">
                {reportData.checkInTrend.filter((_, index) => index % 2 === 0).map((item, index) => {
                  const maxCount = Math.max(...reportData.checkInTrend.map(i => i.count), 1);
                  const height = (item.count / maxCount) * 100;

                  return (
                    <div key={index} className="flex flex-col items-center flex-1 h-full justify-end group/bar relative">
                      <div className="opacity-0 group-hover/bar:opacity-100 absolute bottom-full mb-1 pointer-events-none transition-opacity bg-gray-900 text-white text-[10px] rounded-md px-1.5 py-0.5 z-20 whitespace-nowrap">
                        {item.hour}: {item.count} check-ins
                      </div>
                      <div
                        className={`w-full rounded-t-sm transition-all duration-300 ${
                          item.count > 0 ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-gray-100'
                        }`}
                        style={{ height: `${Math.max(height, 3)}%` }}
                      ></div>
                      <span className="text-[10px] text-gray-400 mt-1.5">
                        {item.hour.split(':')[0]}h
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Lista dos Últimos Pedidos do Evento */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
              <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Últimos Pedidos / Inscrições</h3>
                  <p className="text-xs text-gray-400">Registros em tempo real vinculados a este evento</p>
                </div>
                <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2.5 py-1 rounded-lg">
                  {reportData.recentOrders.length} registros
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50/70 text-gray-500 font-semibold uppercase tracking-wider border-b border-gray-100">
                    <tr>
                      <th className="px-5 py-3">Comprador</th>
                      <th className="px-5 py-3">Contato</th>
                      <th className="px-5 py-3">Lote</th>
                      <th className="px-5 py-3">Qtd</th>
                      <th className="px-5 py-3">Valor</th>
                      <th className="px-5 py-3">Pagamento</th>
                      <th className="px-5 py-3">Status</th>
                      <th className="px-5 py-3">Data</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-gray-700">
                    {reportData.recentOrders.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-5 py-8 text-center text-gray-400">
                          Nenhum pedido encontrado para este evento.
                        </td>
                      </tr>
                    ) : (
                      reportData.recentOrders.slice(0, 15).map(order => (
                        <tr key={order.id} className="hover:bg-gray-50/60 transition-colors">
                          <td className="px-5 py-3.5">
                            <p className="font-bold text-gray-900">{order.client_name || 'Comprador'}</p>
                            {order.client_document && (
                              <p className="text-[11px] text-gray-400 font-mono">{order.client_document}</p>
                            )}
                          </td>
                          <td className="px-5 py-3.5">
                            <p className="font-medium text-gray-800">{order.client_phone || '-'}</p>
                            {order.client_email && (
                              <p className="text-[11px] text-gray-400 truncate max-w-[140px]">{order.client_email}</p>
                            )}
                          </td>
                          <td className="px-5 py-3.5 font-medium text-gray-800">
                            {order.batch_name || `Lote ${(Number(order.batch_index) || 0) + 1}`}
                          </td>
                          <td className="px-5 py-3.5 font-bold text-gray-900">
                            {order.quantity || 1}
                          </td>
                          <td className="px-5 py-3.5 font-mono font-bold text-gray-900">
                            {formatPrice(order.amount_total || 0)}
                          </td>
                          <td className="px-5 py-3.5">
                            <span className="text-[11px] bg-gray-100 text-gray-700 font-medium px-2 py-0.5 rounded">
                              {formatPaymentMethodName(order.payment_method)}
                            </span>
                          </td>
                          <td className="px-5 py-3.5">
                            {order.status === 'paid' ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                Pago
                              </span>
                            ) : order.status === 'pending' || order.status === 'pending_proof' ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                                <Clock className="w-3 h-3 text-amber-600" />
                                Pendente
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded border border-red-200">
                                <XCircle className="w-3 h-3 text-red-600" />
                                Cancelado
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-3.5 text-gray-500 whitespace-nowrap text-[11px]">
                            {order.created_at ? new Date(order.created_at).toLocaleDateString('pt-BR') : '-'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EventReports;