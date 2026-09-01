import React, { useState, useMemo, useEffect } from 'react';
import { 
  Ticket, Plus, Search, Filter, Calendar, DollarSign, Percent, 
  Trash2, Edit, Eye, CheckCircle2, XCircle, Clock, AlertTriangle, 
  ArrowLeft, RefreshCw, Layers, ShieldCheck, UserCheck, HelpCircle, X,
  Copy, Check
} from 'lucide-react';
import { useEventCoupons } from '../../shared/hooks/hooks/useEventCoupons';
import { useSupabaseEvents } from '../../shared/hooks/hooks/useSupabaseEvents';
import { EventCoupon, EventCouponUsage, CreateCouponDTO, UpdateCouponDTO } from '../../shared/types/types/coupon';
import { Event, PriceBatch } from '../../shared/types/types/event';
import { formatPrice, toBrtDateTimeInput, fromBrtDateTimeInputToIso, formatBrtDateTime, formatBrazilDate } from '../../shared/utils/utils/eventUtils';
import { toast } from 'sonner';
import ConfirmModal from '../shared/ConfirmModal';
import Loading from '../ui/Loading';

interface AdminEventCouponsProps {
  onBack?: () => void;
  initialEventId?: string;
}

export const AdminEventCoupons: React.FC<AdminEventCouponsProps> = ({ onBack, initialEventId }) => {
  const { 
    coupons, 
    loading, 
    stats, 
    selectedEventId, 
    setSelectedEventId, 
    refetch, 
    createCoupon, 
    updateCoupon, 
    deleteCoupon, 
    toggleCouponActive, 
    fetchCouponUsages 
  } = useEventCoupons(initialEventId);

  const { events, fetchEvents } = useSupabaseEvents();

  // Estados de busca e filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'expired' | 'depleted'>('all');

  // Estados para modais de CRUD e detalhes
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<EventCoupon | null>(null);
  const [formSubmitting, setFormSubmitting] = useState(false);

  // Estados para modal de histórico de usos
  const [isUsagesModalOpen, setIsUsagesModalOpen] = useState(false);
  const [selectedCouponForUsages, setSelectedCouponForUsages] = useState<EventCoupon | null>(null);
  const [usagesList, setUsagesList] = useState<EventCouponUsage[]>([]);
  const [loadingUsages, setLoadingUsages] = useState(false);

  // Totais consolidados das utilizações do cupom selecionado
  const usagesSummary = useMemo(() => {
    const totalOriginal = usagesList.reduce((acc, u) => acc + (Number(u.original_amount) || 0), 0);
    const totalDiscount = usagesList.reduce((acc, u) => acc + (Number(u.discount_applied) || 0), 0);
    const totalFinal = usagesList.reduce((acc, u) => acc + (Number(u.final_amount) || 0), 0);
    return {
      totalOriginal,
      totalDiscount,
      totalFinal,
    };
  }, [usagesList]);

  // Estados para modais de confirmação
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [couponToDelete, setCouponToDelete] = useState<EventCoupon | null>(null);
  const [isToggleModalOpen, setIsToggleModalOpen] = useState(false);
  const [couponToToggle, setCouponToToggle] = useState<EventCoupon | null>(null);

  // Estado para feedback de cópia de cupom
  const [copiedCouponId, setCopiedCouponId] = useState<string | null>(null);

  // Copiar código do cupom para a área de transferência
  const handleCopyCode = async (code: string, couponId: string) => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(code);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = code;
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopiedCouponId(couponId);
      toast.success(`Código "${code}" copiado com sucesso!`);
      setTimeout(() => {
        setCopiedCouponId((prev) => (prev === couponId ? null : prev));
      }, 2000);
    } catch {
      toast.error('Não foi possível copiar o código.');
    }
  };

  // Estados do formulário de criação/edição
  const [formEventId, setFormEventId] = useState<string>('');
  const [formCode, setFormCode] = useState<string>('');
  const [formDescription, setFormDescription] = useState<string>('');
  const [formDiscountType, setFormDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [formDiscountValue, setFormDiscountValue] = useState<string>('');
  const [formMaxUses, setFormMaxUses] = useState<string>('100');
  const [formLimitOnePerCpf, setFormLimitOnePerCpf] = useState<boolean>(true);
  const [formApplyToAllBatches, setFormApplyToAllBatches] = useState<boolean>(true);
  const [formSelectedBatches, setFormSelectedBatches] = useState<number[]>([]);
  const [formValidFrom, setFormValidFrom] = useState<string>('');
  const [formValidUntil, setFormValidUntil] = useState<string>('');
  const [formMinOrderValue, setFormMinOrderValue] = useState<string>('');
  const [formIsActive, setFormIsActive] = useState<boolean>(true);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchEvents();
  }, []);

  // Evento selecionado no formulário para puxar os lotes
  const selectedFormEvent = useMemo(() => {
    return events.find(e => e.id === formEventId);
  }, [events, formEventId]);

  // Lotes do evento selecionado no formulário
  const eventBatches = useMemo((): PriceBatch[] => {
    if (!selectedFormEvent || !selectedFormEvent.price_batches) return [];
    if (typeof selectedFormEvent.price_batches === 'string') {
      try {
        return JSON.parse(selectedFormEvent.price_batches);
      } catch {
        return [];
      }
    }
    return selectedFormEvent.price_batches as PriceBatch[];
  }, [selectedFormEvent]);

  // Abrir modal de criação
  const handleOpenCreateModal = () => {
    setEditingCoupon(null);
    setFormEventId(selectedEventId !== 'all' ? selectedEventId : (events[0]?.id || ''));
    setFormCode('');
    setFormDescription('');
    setFormDiscountType('percentage');
    setFormDiscountValue('10');
    setFormMaxUses('50');
    setFormLimitOnePerCpf(true);
    setFormApplyToAllBatches(true);
    setFormSelectedBatches([]);
    
    // Datas padrão: de hoje até 30 dias (considerando UTC-3 Brasília)
    const now = new Date();
    const in30Days = new Date();
    in30Days.setDate(in30Days.getDate() + 30);
    
    setFormValidFrom(toBrtDateTimeInput(now));
    setFormValidUntil(toBrtDateTimeInput(in30Days));
    setFormMinOrderValue('');
    setFormIsActive(true);
    setFormErrors({});
    setIsFormModalOpen(true);
  };

  // Abrir modal de edição
  const handleOpenEditModal = (coupon: EventCoupon) => {
    setEditingCoupon(coupon);
    setFormEventId(coupon.event_id);
    setFormCode(coupon.code);
    setFormDescription(coupon.description || '');
    setFormDiscountType(coupon.discount_type);
    setFormDiscountValue(String(coupon.discount_value));
    setFormMaxUses(String(coupon.max_uses));
    setFormLimitOnePerCpf(coupon.limit_one_per_cpf ?? true);
    
    if (coupon.batch_indexes && coupon.batch_indexes.length > 0) {
      setFormApplyToAllBatches(false);
      setFormSelectedBatches(coupon.batch_indexes);
    } else {
      setFormApplyToAllBatches(true);
      setFormSelectedBatches([]);
    }

    setFormValidFrom(toBrtDateTimeInput(coupon.valid_from));
    setFormValidUntil(toBrtDateTimeInput(coupon.valid_until));
    setFormMinOrderValue(coupon.min_order_value ? String(coupon.min_order_value) : '');
    setFormIsActive(coupon.is_active);
    setFormErrors({});
    setIsFormModalOpen(true);
  };

  // Gerador de código aleatório amigável
  const generateRandomCode = () => {
    const prefixes = ['PROMO', 'DESCONTO', 'VIP', 'ESPECIAL', 'NOW', 'EVENTO'];
    const randomPrefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const randomNum = Math.floor(10 + Math.random() * 90);
    setFormCode(`${randomPrefix}${randomNum}`);
  };

  // Submissão do formulário
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};

    if (!formEventId) errors.event_id = 'Selecione o evento obrigatório.';
    if (!formCode.trim()) errors.code = 'Informe o código do cupom.';
    
    const cleanDiscStr = formDiscountValue.replace(',', '.').trim();
    const discVal = parseFloat(cleanDiscStr);
    if (isNaN(discVal) || discVal <= 0) {
      errors.discount_value = 'Informe um valor de desconto válido e maior que zero.';
    } else if (formDiscountType === 'percentage' && discVal > 100) {
      errors.discount_value = 'O desconto percentual não pode ultrapassar 100%.';
    }

    const maxU = parseInt(formMaxUses, 10);
    if (isNaN(maxU) || maxU <= 0) {
      errors.max_uses = 'Informe um limite de utilizações maior que zero.';
    }

    if (!formValidFrom) errors.valid_from = 'Informe a data de início da validade.';
    if (!formValidUntil) errors.valid_until = 'Informe a data final da validade.';
    if (formValidFrom && formValidUntil && new Date(fromBrtDateTimeInputToIso(formValidFrom)) >= new Date(fromBrtDateTimeInputToIso(formValidUntil))) {
      errors.valid_until = 'A data final deve ser posterior à data de início.';
    }

    if (!formApplyToAllBatches && formSelectedBatches.length === 0) {
      errors.batches = 'Selecione ao menos um lote ou marque "Todos os lotes".';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setFormSubmitting(true);
    try {
      const dto: CreateCouponDTO = {
        event_id: formEventId,
        code: formCode.trim().toUpperCase(),
        description: formDescription.trim() || undefined,
        discount_type: formDiscountType,
        discount_value: discVal,
        max_uses: maxU,
        limit_one_per_cpf: formLimitOnePerCpf,
        batch_indexes: formApplyToAllBatches ? null : formSelectedBatches,
        valid_from: fromBrtDateTimeInputToIso(formValidFrom),
        valid_until: fromBrtDateTimeInputToIso(formValidUntil),
        min_order_value: formMinOrderValue ? parseFloat(formMinOrderValue) : 0,
        is_active: formIsActive,
      };

      if (editingCoupon) {
        await updateCoupon(editingCoupon.id, dto as UpdateCouponDTO);
      } else {
        await createCoupon(dto);
      }

      setIsFormModalOpen(false);
    } catch {
      // Erro tratado no hook com toast
    } finally {
      setFormSubmitting(false);
    }
  };

  // Abrir histórico de utilizações
  const handleOpenUsagesModal = async (coupon: EventCoupon) => {
    setSelectedCouponForUsages(coupon);
    setIsUsagesModalOpen(true);
    setLoadingUsages(true);
    try {
      const data = await fetchCouponUsages(coupon.id);
      setUsagesList(data);
    } finally {
      setLoadingUsages(false);
    }
  };

  // Confirmação de exclusão
  const handleRequestDelete = (coupon: EventCoupon) => {
    setCouponToDelete(coupon);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!couponToDelete) return;
    await deleteCoupon(couponToDelete.id);
    setIsDeleteModalOpen(false);
    setCouponToDelete(null);
  };

  // Confirmação de alteração de status
  const handleRequestToggle = (coupon: EventCoupon) => {
    setCouponToToggle(coupon);
    setIsToggleModalOpen(true);
  };

  const handleConfirmToggle = async () => {
    if (!couponToToggle) return;
    await toggleCouponActive(couponToToggle.id, couponToToggle.is_active);
    setIsToggleModalOpen(false);
    setCouponToToggle(null);
  };

  // Determinar status dinâmico do cupom
  const getCouponStatusInfo = (coupon: EventCoupon) => {
    const now = new Date();
    const isExpired = new Date(coupon.valid_until) < now;
    const notStarted = new Date(coupon.valid_from) > now;
    const isDepleted = coupon.current_uses >= coupon.max_uses;

    if (!coupon.is_active) {
      return { label: 'Inativo', color: 'bg-gray-100 text-gray-700 border-gray-200', key: 'inactive' };
    }
    if (isDepleted) {
      return { label: 'Esgotado', color: 'bg-amber-100 text-amber-800 border-amber-200', key: 'depleted' };
    }
    if (isExpired) {
      return { label: 'Expirado', color: 'bg-red-100 text-red-700 border-red-200', key: 'expired' };
    }
    if (notStarted) {
      return { label: 'Agendado', color: 'bg-blue-100 text-blue-700 border-blue-200', key: 'scheduled' };
    }
    return { label: 'Ativo', color: 'bg-emerald-100 text-emerald-800 border-emerald-200', key: 'active' };
  };

  // Filtragem dos cupons
  const filteredCoupons = useMemo(() => {
    return coupons.filter(c => {
      const matchesSearch = 
        c.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.description && c.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (c.event?.title && c.event.title.toLowerCase().includes(searchTerm.toLowerCase()));

      if (!matchesSearch) return false;

      const statusInfo = getCouponStatusInfo(c);
      if (statusFilter === 'all') return true;
      if (statusFilter === 'active') return statusInfo.key === 'active';
      if (statusFilter === 'inactive') return statusInfo.key === 'inactive';
      if (statusFilter === 'expired') return statusInfo.key === 'expired';
      if (statusFilter === 'depleted') return statusInfo.key === 'depleted';

      return true;
    });
  }, [coupons, searchTerm, statusFilter]);

  // Formatação de data amigável considerando BRT (UTC-3)
  const formatDateTime = (dateStr: string) => {
    return formatBrtDateTime(dateStr);
  };

  return (
    <div className="space-y-6">
      {/* Header Principal */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            {onBack && (
              <button
                onClick={onBack}
                className="p-2 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                title="Voltar aos eventos"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
            )}
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Ticket className="h-6 w-6 sm:h-7 sm:w-7 text-indigo-600" />
                Gestão de Cupons de Desconto
              </h1>
              <p className="text-sm text-gray-500 mt-0.5">
                Crie e gerencie cupons promocionais vinculados aos eventos
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={async () => {
                await refetch();
                toast.success('Cupons e utilizações sincronizados!');
              }}
              disabled={loading}
              className="p-2.5 text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 border border-gray-200 rounded-lg transition-colors disabled:opacity-60 cursor-pointer"
              title="Recarregar e sincronizar cupons"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin text-indigo-600' : ''}`} />
            </button>
            <button
              onClick={handleOpenCreateModal}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-lg flex items-center gap-2 font-medium text-sm transition-colors shadow-sm"
            >
              <Plus className="h-4 w-4" />
              Novo Cupom
            </button>
          </div>
        </div>
      </div>

      {/* Cards de Métricas (KPIs) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 sm:p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total de Cupons</span>
            <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
              <Ticket className="h-5 w-5" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900 mt-2">{stats.totalCoupons}</p>
        </div>

        <div className="bg-white rounded-xl p-4 sm:p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Cupons Ativos</span>
            <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900 mt-2">{stats.activeCoupons}</p>
        </div>

        <div className="bg-white rounded-xl p-4 sm:p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total de Usos</span>
            <div className="p-2 bg-purple-50 rounded-lg text-purple-600">
              <UserCheck className="h-5 w-5" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900 mt-2">{stats.totalUsages}</p>
        </div>

        <div className="bg-white rounded-xl p-4 sm:p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Economia Concedida</span>
            <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
              <DollarSign className="h-5 w-5" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900 mt-2">{formatPrice(stats.totalDiscountGiven)}</p>
        </div>
      </div>

      {/* Barra de Filtros e Busca */}
      <div className="bg-white rounded-xl p-4 sm:p-5 border border-gray-100 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Busca por código / descrição */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Buscar por código, descrição ou evento..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          {/* Filtro por Evento Global */}
          <div className="w-full md:w-64">
            <select
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white text-gray-700"
            >
              <option value="all">Todos os Eventos</option>
              {events.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.title}
                </option>
              ))}
            </select>
          </div>

          {/* Filtro por Status */}
          <div className="w-full md:w-48">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white text-gray-700"
            >
              <option value="all">Todos os Status</option>
              <option value="active">Ativos</option>
              <option value="depleted">Esgotados</option>
              <option value="expired">Expirados</option>
              <option value="inactive">Inativos</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabela de Cupons */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <Loading variant="spinner" size="lg" text="Carregando cupons de desconto..." />
          </div>
        ) : filteredCoupons.length === 0 ? (
          <div className="p-12 text-center">
            <Ticket className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-gray-900 mb-1">
              {searchTerm || statusFilter !== 'all' || selectedEventId !== 'all'
                ? 'Nenhum cupom encontrado para estes filtros'
                : 'Nenhum cupom cadastrado'}
            </h3>
            <p className="text-sm text-gray-500 max-w-sm mx-auto mb-4">
              Crie cupons promocionais vinculados a eventos com limites de uso e validade controlados.
            </p>
            <button
              onClick={handleOpenCreateModal}
              className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              <Plus className="h-4 w-4" />
              Criar Primeiro Cupom
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3.5">Código / Evento</th>
                  <th className="px-5 py-3.5">Desconto</th>
                  <th className="px-5 py-3.5">Usos (Cota)</th>
                  <th className="px-5 py-3.5">Lotes</th>
                  <th className="px-5 py-3.5">Validade</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredCoupons.map((coupon) => {
                  const statusInfo = getCouponStatusInfo(coupon);
                  const usagePercentage = Math.min(100, Math.round((coupon.current_uses / coupon.max_uses) * 100));

                  return (
                    <tr key={coupon.id} className="hover:bg-gray-50/70 transition-colors">
                      {/* Código e Evento */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleCopyCode(coupon.code, coupon.id)}
                            className="group/copy inline-flex items-center gap-1.5 font-mono font-bold text-base text-indigo-700 bg-indigo-50 hover:bg-indigo-100/90 active:scale-95 px-2.5 py-1 rounded-md border border-indigo-200/80 transition-all cursor-pointer shadow-2xs"
                            title="Clique para copiar o código"
                          >
                            <span>{coupon.code}</span>
                            {copiedCouponId === coupon.id ? (
                              <Check className="h-3.5 w-3.5 text-emerald-600 animate-in zoom-in duration-200" />
                            ) : (
                              <Copy className="h-3.5 w-3.5 text-indigo-400 group-hover/copy:text-indigo-700 transition-colors" />
                            )}
                          </button>
                          {copiedCouponId === coupon.id && (
                            <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 animate-in fade-in">
                              Copiado!
                            </span>
                          )}
                          {coupon.limit_one_per_cpf && (
                            <span 
                              className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded flex items-center gap-1 border border-gray-200"
                              title="Limitado a 1 uso por CPF"
                            >
                              <ShieldCheck className="h-3 w-3 text-emerald-600" />
                              1/CPF
                            </span>
                          )}
                        </div>
                        <p className="text-xs font-medium text-gray-900 mt-1">
                          {coupon.event?.title || 'Evento vinculado'}
                        </p>
                        {coupon.description && (
                          <p className="text-xs text-gray-500 truncate max-w-xs">{coupon.description}</p>
                        )}
                      </td>

                      {/* Desconto */}
                      <td className="px-5 py-4">
                        <div className="font-bold text-gray-900 flex items-center gap-1">
                          {coupon.discount_type === 'percentage' ? (
                            <>
                              <Percent className="h-3.5 w-3.5 text-indigo-500" />
                              <span>{coupon.discount_value}% OFF</span>
                            </>
                          ) : (
                            <>
                              <DollarSign className="h-3.5 w-3.5 text-emerald-500" />
                              <span>{formatPrice(coupon.discount_value)} OFF</span>
                            </>
                          )}
                        </div>
                        {coupon.min_order_value ? (
                          <span className="text-[11px] text-gray-500">Mín: {formatPrice(coupon.min_order_value)}</span>
                        ) : (
                          <span className="text-[11px] text-gray-400">Sem pedido mín.</span>
                        )}
                      </td>

                      {/* Usos e Barra de Progresso */}
                      <td className="px-5 py-4 min-w-[140px]">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="font-semibold text-gray-900">
                            {coupon.current_uses} / {coupon.max_uses}
                          </span>
                          <span className="text-gray-500">{usagePercentage}%</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              usagePercentage >= 100
                                ? 'bg-amber-500'
                                : usagePercentage > 75
                                ? 'bg-indigo-500'
                                : 'bg-emerald-500'
                            }`}
                            style={{ width: `${usagePercentage}%` }}
                          />
                        </div>
                      </td>

                      {/* Lotes */}
                      <td className="px-5 py-4">
                        {coupon.batch_indexes && coupon.batch_indexes.length > 0 ? (
                          <span className="inline-flex items-center gap-1 text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full border border-purple-100 font-medium">
                            <Layers className="h-3 w-3" />
                            {coupon.batch_indexes.length} lote(s)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs bg-gray-50 text-gray-600 px-2 py-0.5 rounded-full border border-gray-200">
                            Todos os lotes
                          </span>
                        )}
                      </td>

                      {/* Validade */}
                      <td className="px-5 py-4 text-xs text-gray-600">
                        <div className="flex items-center gap-1 text-gray-800">
                          <Clock className="h-3 w-3 text-gray-400" />
                          <span>Até {formatDateTime(coupon.valid_until)}</span>
                        </div>
                        <span className="text-[11px] text-gray-400">Início: {formatDateTime(coupon.valid_from)}</span>
                      </td>

                      {/* Status */}
                      <td className="px-5 py-4">
                        <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold border ${statusInfo.color}`}>
                          {statusInfo.label}
                        </span>
                      </td>

                      {/* Ações */}
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Copiar Código */}
                          <button
                            onClick={() => handleCopyCode(coupon.code, coupon.id)}
                            className={`p-1.5 rounded-lg transition-colors ${
                              copiedCouponId === coupon.id
                                ? 'text-emerald-600 bg-emerald-50'
                                : 'text-gray-500 hover:text-indigo-600 hover:bg-indigo-50'
                            }`}
                            title="Copiar código do cupom"
                          >
                            {copiedCouponId === coupon.id ? (
                              <Check className="h-4 w-4 text-emerald-600 animate-in zoom-in duration-200" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </button>

                          {/* Histórico */}
                          <button
                            onClick={() => handleOpenUsagesModal(coupon)}
                            className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="Ver histórico de utilizações"
                          >
                            <Eye className="h-4 w-4" />
                          </button>

                          {/* Toggle Ativo */}
                          <button
                            onClick={() => handleRequestToggle(coupon)}
                            className={`p-1.5 rounded-lg transition-colors ${
                              coupon.is_active 
                                ? 'text-emerald-600 hover:bg-emerald-50' 
                                : 'text-gray-400 hover:text-emerald-600 hover:bg-gray-100'
                            }`}
                            title={coupon.is_active ? 'Desativar cupom' : 'Ativar cupom'}
                          >
                            {coupon.is_active ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                          </button>

                          {/* Editar */}
                          <button
                            onClick={() => handleOpenEditModal(coupon)}
                            className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Editar cupom"
                          >
                            <Edit className="h-4 w-4" />
                          </button>

                          {/* Excluir */}
                          <button
                            onClick={() => handleRequestDelete(coupon)}
                            className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Excluir cupom"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de Criação / Edição de Cupom */}
      {isFormModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl max-h-[90vh] flex flex-col overflow-hidden">
            {/* Header do Modal */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-100 text-indigo-700 rounded-lg">
                  <Ticket className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">
                    {editingCoupon ? 'Editar Cupom de Desconto' : 'Novo Cupom de Desconto'}
                  </h3>
                  <p className="text-xs text-gray-500">Configure as regras e vigência do cupom</p>
                </div>
              </div>
              <button
                onClick={() => setIsFormModalOpen(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Conteúdo do Formulário */}
            <form onSubmit={handleSubmitForm} className="flex-1 overflow-y-auto p-6 space-y-5">
              {/* Seleção do Evento (Obrigatório) */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                  Evento Vinculado <span className="text-red-500">*</span>
                </label>
                <select
                  value={formEventId}
                  onChange={(e) => {
                    setFormEventId(e.target.value);
                    setFormSelectedBatches([]);
                  }}
                  className={`w-full px-3.5 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white ${
                    formErrors.event_id ? 'border-red-300 ring-1 ring-red-300' : 'border-gray-300'
                  }`}
                >
                  <option value="">Selecione o evento...</option>
                  {events.map((ev) => (
                    <option key={ev.id} value={ev.id}>
                      {ev.title} {ev.event_date ? `(${formatBrazilDate(ev.event_date)})` : ''}
                    </option>
                  ))}
                </select>
                {formErrors.event_id && (
                  <p className="text-xs text-red-600 mt-1">{formErrors.event_id}</p>
                )}
              </div>

              {/* Código do Cupom & Descrição */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Código do Cupom <span className="text-red-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={generateRandomCode}
                      className="text-xs text-indigo-600 hover:text-indigo-800 font-medium underline"
                    >
                      Gerar código
                    </button>
                  </div>
                  <input
                    type="text"
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                    placeholder="EX: PROMO10"
                    className={`w-full px-3.5 py-2.5 text-sm font-mono font-bold tracking-wider border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 uppercase ${
                      formErrors.code ? 'border-red-300 ring-1 ring-red-300' : 'border-gray-300'
                    }`}
                  />
                  {formErrors.code && (
                    <p className="text-xs text-red-600 mt-1">{formErrors.code}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                    Descrição (Opcional)
                  </label>
                  <input
                    type="text"
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    placeholder="Ex: Parceria influencer / Desconto lançamento"
                    className="w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Tipo e Valor do Desconto */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-gray-50/70 p-4 rounded-xl border border-gray-100">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                    Tipo de Desconto
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setFormDiscountType('percentage')}
                      className={`py-2 px-3 text-xs font-medium rounded-lg border transition-all flex items-center justify-center gap-1 ${
                        formDiscountType === 'percentage'
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                          : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <Percent className="h-3 w-3" />
                      Porcentagem
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormDiscountType('fixed')}
                      className={`py-2 px-3 text-xs font-medium rounded-lg border transition-all flex items-center justify-center gap-1 ${
                        formDiscountType === 'fixed'
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                          : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <DollarSign className="h-3 w-3" />
                      Valor (R$)
                    </button>
                  </div>
                </div>

                  <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                    {formDiscountType === 'percentage' ? 'Percentual (%)' : 'Valor Fixo (R$)'} <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="any"
                      min="0.01"
                      max={formDiscountType === 'percentage' ? 100 : undefined}
                      value={formDiscountValue}
                      onChange={(e) => setFormDiscountValue(e.target.value)}
                      placeholder={formDiscountType === 'percentage' ? 'Ex: 5 ou 10.5' : 'Ex: 50 ou 50.00'}
                      className={`w-full px-3.5 py-2.5 text-sm font-semibold border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                        formErrors.discount_value ? 'border-red-300 ring-1 ring-red-300' : 'border-gray-300'
                      }`}
                    />
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">
                      {formDiscountType === 'percentage' ? '%' : 'R$'}
                    </span>
                  </div>
                  {formErrors.discount_value && (
                    <p className="text-xs text-red-600 mt-1">{formErrors.discount_value}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                    Limite de Usos (Total) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formMaxUses}
                    onChange={(e) => setFormMaxUses(e.target.value)}
                    placeholder="Ex: 100"
                    className={`w-full px-3.5 py-2.5 text-sm font-semibold border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                      formErrors.max_uses ? 'border-red-300 ring-1 ring-red-300' : 'border-gray-300'
                    }`}
                  />
                  {formErrors.max_uses && (
                    <p className="text-xs text-red-600 mt-1">{formErrors.max_uses}</p>
                  )}
                </div>
              </div>

              {/* Lotes Vinculados (Flexível) */}
              <div className="p-4 bg-gray-50/70 rounded-xl border border-gray-100">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Aplicabilidade por Lotes
                    </label>
                    <p className="text-xs text-gray-500">Defina se o cupom vale para todos ou lotes específicos</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="allBatchesCheckbox"
                      checked={formApplyToAllBatches}
                      onChange={(e) => {
                        setFormApplyToAllBatches(e.target.checked);
                        if (e.target.checked) setFormSelectedBatches([]);
                      }}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 rounded border-gray-300"
                    />
                    <label htmlFor="allBatchesCheckbox" className="text-xs font-semibold text-gray-800 cursor-pointer">
                      Todos os lotes
                    </label>
                  </div>
                </div>

                {!formApplyToAllBatches && (
                  <div className="space-y-2 pt-2 border-t border-gray-200">
                    <p className="text-xs font-medium text-gray-700">Selecione os lotes permitidos:</p>
                    {eventBatches.length === 0 ? (
                      <p className="text-xs text-amber-700 bg-amber-50 p-2.5 rounded-lg border border-amber-200">
                        Nenhum lote com preço cadastrado para este evento. O cupom será aplicado globalmente.
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {eventBatches.map((batch, index) => {
                          const isSelected = formSelectedBatches.includes(index);
                          return (
                            <label
                              key={index}
                              className={`flex items-center gap-2.5 p-2.5 rounded-lg border cursor-pointer text-xs font-medium transition-all ${
                                isSelected
                                  ? 'bg-indigo-50 border-indigo-300 text-indigo-900 font-semibold'
                                  : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setFormSelectedBatches(prev => [...prev, index]);
                                  } else {
                                    setFormSelectedBatches(prev => prev.filter(i => i !== index));
                                  }
                                }}
                                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 rounded border-gray-300"
                              />
                              <div className="flex-1 truncate">
                                <span>{batch.name || `Lote ${index + 1}`}</span>
                                <span className="text-gray-400 ml-1.5 font-normal">({formatPrice(batch.price)})</span>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    )}
                    {formErrors.batches && (
                      <p className="text-xs text-red-600 mt-1">{formErrors.batches}</p>
                    )}
                  </div>
                )}
              </div>

              {/* Datas de Validade */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Válido a partir de <span className="text-red-500">*</span>
                    </label>
                    <span className="text-[10px] font-semibold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">
                      Horário de Brasília (UTC-3)
                    </span>
                  </div>
                  <input
                    type="datetime-local"
                    value={formValidFrom}
                    onChange={(e) => setFormValidFrom(e.target.value)}
                    className={`w-full px-3.5 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                      formErrors.valid_from ? 'border-red-300 ring-1 ring-red-300' : 'border-gray-300'
                    }`}
                  />
                  {formErrors.valid_from && (
                    <p className="text-xs text-red-600 mt-1">{formErrors.valid_from}</p>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Válido até <span className="text-red-500">*</span>
                    </label>
                    <span className="text-[10px] font-semibold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">
                      Horário de Brasília (UTC-3)
                    </span>
                  </div>
                  <input
                    type="datetime-local"
                    value={formValidUntil}
                    onChange={(e) => setFormValidUntil(e.target.value)}
                    className={`w-full px-3.5 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                      formErrors.valid_until ? 'border-red-300 ring-1 ring-red-300' : 'border-gray-300'
                    }`}
                  />
                  {formErrors.valid_until && (
                    <p className="text-xs text-red-600 mt-1">{formErrors.valid_until}</p>
                  )}
                </div>
              </div>

              {/* Regras Adicionais e Switch 1/CPF */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                    Valor Mínimo do Pedido (R$)
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={formMinOrderValue}
                    onChange={(e) => setFormMinOrderValue(e.target.value)}
                    placeholder="Opcional (Ex: 100 ou 100.00)"
                    className="w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="flex flex-col justify-end space-y-2">
                  <label className="flex items-center gap-2.5 cursor-pointer bg-gray-50 p-2.5 rounded-lg border border-gray-200">
                    <input
                      type="checkbox"
                      checked={formLimitOnePerCpf}
                      onChange={(e) => setFormLimitOnePerCpf(e.target.checked)}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 rounded border-gray-300"
                    />
                    <div>
                      <span className="text-xs font-semibold text-gray-900 block">Limitar a 1 uso por CPF</span>
                      <span className="text-[11px] text-gray-500 block">Impede o mesmo comprador de reutilizar</span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Botões do Rodapé */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsFormModalOpen(false)}
                  className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="px-5 py-2.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2 shadow-sm"
                >
                  {formSubmitting ? (
                    <>
                      <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    editingCoupon ? 'Atualizar Cupom' : 'Criar Cupom'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Histórico de Utilização */}
      {isUsagesModalOpen && selectedCouponForUsages && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl max-h-[85vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <UserCheck className="h-5 w-5 text-indigo-600" />
                    Histórico de Usos:
                  </h3>
                  <button
                    type="button"
                    onClick={() => handleCopyCode(selectedCouponForUsages.code, selectedCouponForUsages.id)}
                    className="inline-flex items-center gap-1.5 font-mono font-bold text-sm bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-2.5 py-1 rounded-md border border-indigo-200 transition-all cursor-pointer"
                    title="Clique para copiar o código"
                  >
                    <span>{selectedCouponForUsages.code}</span>
                    {copiedCouponId === selectedCouponForUsages.id ? (
                      <Check className="h-3.5 w-3.5 text-emerald-600 animate-in zoom-in" />
                    ) : (
                      <Copy className="h-3.5 w-3.5 text-indigo-500" />
                    )}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  {selectedCouponForUsages.current_uses} de {selectedCouponForUsages.max_uses} utilizações registradas
                </p>
              </div>
              <button
                onClick={() => setIsUsagesModalOpen(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {loadingUsages ? (
                <div className="p-10 text-center">
                  <Loading variant="spinner" size="default" text="Carregando utilizações..." />
                </div>
              ) : usagesList.length === 0 ? (
                <div className="p-12 text-center">
                  <Ticket className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm font-medium text-gray-900">Nenhuma utilização registrada ainda</p>
                  <p className="text-xs text-gray-500 mt-0.5">Assim que clientes usarem este cupom no checkout, os dados aparecerão aqui.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Cards de Resumo dos Totais */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="bg-gray-50 rounded-xl p-3.5 border border-gray-200/80">
                      <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block">
                        Valor Original Total
                      </span>
                      <span className="text-lg font-bold text-gray-700 block mt-0.5">
                        {formatPrice(usagesSummary.totalOriginal)}
                      </span>
                    </div>

                    <div className="bg-emerald-50 rounded-xl p-3.5 border border-emerald-200/80">
                      <span className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider block">
                        Total em Descontos
                      </span>
                      <span className="text-lg font-bold text-emerald-600 block mt-0.5">
                        -{formatPrice(usagesSummary.totalDiscount)}
                      </span>
                    </div>

                    <div className="bg-indigo-50 rounded-xl p-3.5 border border-indigo-200/80">
                      <span className="text-[11px] font-semibold text-indigo-700 uppercase tracking-wider block">
                        Valor Final Recebido
                      </span>
                      <span className="text-lg font-bold text-indigo-700 block mt-0.5">
                        {formatPrice(usagesSummary.totalFinal)}
                      </span>
                    </div>
                  </div>

                  {/* Tabela de Histórico de Usos com Linha de Totais */}
                  <div className="overflow-x-auto rounded-xl border border-gray-100 shadow-2xs">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-gray-50 border-b border-gray-100 font-semibold text-gray-500 uppercase tracking-wider">
                        <tr>
                          <th className="px-4 py-3">Data</th>
                          <th className="px-4 py-3">Cliente</th>
                          <th className="px-4 py-3">Documento (CPF)</th>
                          <th className="px-4 py-3">Valor Original</th>
                          <th className="px-4 py-3">Desconto</th>
                          <th className="px-4 py-3">Valor Final</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {usagesList.map((usage) => (
                          <tr key={usage.id} className="hover:bg-gray-50/60 transition-colors">
                            <td className="px-4 py-3 text-gray-600">{formatDateTime(usage.used_at)}</td>
                            <td className="px-4 py-3 font-medium text-gray-900">{usage.client_name || 'Comprador'}</td>
                            <td className="px-4 py-3 font-mono text-gray-600">{usage.client_document || '-'}</td>
                            <td className="px-4 py-3 text-gray-500 line-through">{formatPrice(usage.original_amount)}</td>
                            <td className="px-4 py-3 font-bold text-emerald-600">-{formatPrice(usage.discount_applied)}</td>
                            <td className="px-4 py-3 font-bold text-gray-900">{formatPrice(usage.final_amount)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-gray-50/95 border-t-2 border-gray-200 font-bold text-xs">
                        <tr>
                          <td colSpan={3} className="px-4 py-3.5 text-right text-gray-700 uppercase tracking-wider font-semibold">
                            Totais ({usagesList.length} {usagesList.length === 1 ? 'uso' : 'usos'}):
                          </td>
                          <td className="px-4 py-3.5 font-bold text-gray-700">
                            {formatPrice(usagesSummary.totalOriginal)}
                          </td>
                          <td className="px-4 py-3.5 font-bold text-emerald-600">
                            -{formatPrice(usagesSummary.totalDiscount)}
                          </td>
                          <td className="px-4 py-3.5 font-bold text-indigo-700 text-sm">
                            {formatPrice(usagesSummary.totalFinal)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              )}
            </div>

            <div className="px-6 py-3.5 bg-gray-50 border-t border-gray-100 flex justify-end">
              <button
                type="button"
                onClick={() => setIsUsagesModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Exclusão (Padrão do Projeto) */}
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setCouponToDelete(null);
        }}
        onConfirm={handleConfirmDelete}
        title="Excluir Cupom de Desconto"
        message={couponToDelete ? `Tem certeza que deseja excluir o cupom "${couponToDelete.code}"? Ele deixará de ser aceito imediatamente.` : ''}
        confirmText="Excluir Cupom"
        cancelText="Cancelar"
        type="danger"
      />

      {/* Modal de Confirmação de Alteração de Status */}
      <ConfirmModal
        isOpen={isToggleModalOpen}
        onClose={() => {
          setIsToggleModalOpen(false);
          setCouponToToggle(null);
        }}
        onConfirm={handleConfirmToggle}
        title={couponToToggle?.is_active ? 'Desativar Cupom' : 'Ativar Cupom'}
        message={couponToToggle ? `Deseja realmente ${couponToToggle.is_active ? 'desativar' : 'reativar'} o cupom "${couponToToggle.code}"?` : ''}
        confirmText={couponToToggle?.is_active ? 'Desativar' : 'Ativar'}
        cancelText="Cancelar"
        type={couponToToggle?.is_active ? 'warning' : 'info'}
      />
    </div>
  );
};

export default AdminEventCoupons;
