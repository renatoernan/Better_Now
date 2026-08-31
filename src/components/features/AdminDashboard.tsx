import React from 'react';
import { 
  BarChart3, 
  Users, 
  Calendar, 
  Settings, 
  MessageSquare, 
  RefreshCw, 
  Clock, 
  TrendingUp, 
  DollarSign, 
  Ticket, 
  Building2, 
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Mail,
  Gift
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useDashboardData } from '../../shared/hooks/hooks/useDashboardData';

const formatPrice = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
};

const formatTimeAgo = (date: string) => {
  if (!date) return 'Recentemente';
  const now = new Date();
  const activityDate = new Date(date);
  const diffInMinutes = Math.floor((now.getTime() - activityDate.getTime()) / (1000 * 60));
  
  if (diffInMinutes < 1) return 'Agora mesmo';
  if (diffInMinutes < 60) return `Há ${diffInMinutes} min`;
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours === 1) return 'Há 1 hora';
  if (diffInHours < 24) return `Há ${diffInHours} horas`;
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays === 1) return 'Ontem';
  if (diffInDays < 30) return `Há ${diffInDays} dias`;
  
  return activityDate.toLocaleDateString('pt-BR');
};

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { stats, recentActivities, eventStats, loading, error, refetch } = useDashboardData();

  if (error) {
    return (
      <div className="space-y-6">
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-red-100 text-red-600 rounded-xl">
                <BarChart3 className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-red-900 font-bold text-base">Erro ao carregar dados do dashboard</h3>
                <p className="text-red-600 text-xs mt-0.5">{error}</p>
              </div>
            </div>
            <button
              onClick={refetch}
              className="bg-red-600 text-white px-4 py-2.5 rounded-xl hover:bg-red-700 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-sm shadow-red-600/20"
            >
              <RefreshCw className="h-4 w-4" />
              Tentar Novamente
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Header com boas-vindas e botão de atualizar */}
      <div className="bg-white rounded-2xl shadow-xs border border-gray-100 p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/20 shrink-0">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-gray-900 leading-tight">
              Dashboard Administrativo
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">
              Visão geral consolidada em tempo real da Better Now
            </p>
          </div>
        </div>

        <button
          onClick={refetch}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-50 hover:bg-gray-100 active:scale-95 text-gray-700 border border-gray-200 rounded-xl text-xs font-bold transition-all disabled:opacity-50 cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 text-indigo-600 ${loading ? 'animate-spin' : ''}`} />
          <span>{loading ? 'Atualizando...' : 'Atualizar Dados'}</span>
        </button>
      </div>

      {/* Cards de Métricas Principais (4 KPIs com Dados Reais do Banco) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
        {/* Total de Clientes Cadastrados (app_people) */}
        <div 
          onClick={() => navigate('/admin/clients')}
          className="bg-white rounded-2xl shadow-xs border border-gray-100 p-4 sm:p-5 hover:shadow-md hover:border-indigo-200 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-wider truncate">Clientes / Pessoas</p>
              <p className="text-xl sm:text-3xl font-black text-gray-900 mt-1">
                {loading ? '...' : stats.totalClients}
              </p>
              <span className="text-[10px] sm:text-xs text-indigo-600 font-semibold mt-0.5 block truncate">
                Base ativa de contatos
              </span>
            </div>
            <div className="p-2.5 sm:p-3 bg-blue-50 text-blue-600 rounded-2xl group-hover:scale-105 transition-transform shrink-0">
              <Users className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
          </div>
        </div>

        {/* Eventos Ativos / Publicados (app_events) */}
        <div 
          onClick={() => navigate('/admin/events')}
          className="bg-white rounded-2xl shadow-xs border border-gray-100 p-4 sm:p-5 hover:shadow-md hover:border-indigo-200 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-wider truncate">Eventos Ativos</p>
              <p className="text-xl sm:text-3xl font-black text-indigo-600 mt-1">
                {loading ? '...' : stats.activeEvents}
              </p>
              <span className="text-[10px] sm:text-xs text-gray-400 mt-0.5 block truncate">
                {stats.totalEvents} evento(s) no total
              </span>
            </div>
            <div className="p-2.5 sm:p-3 bg-indigo-50 text-indigo-600 rounded-2xl group-hover:scale-105 transition-transform shrink-0">
              <Calendar className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
          </div>
        </div>

        {/* Ingressos Vendidos & Receita (app_event_orders) */}
        <div 
          onClick={() => navigate('/admin/events')}
          className="bg-white rounded-2xl shadow-xs border border-gray-100 p-4 sm:p-5 hover:shadow-md hover:border-emerald-200 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-wider truncate">Vendas de Ingressos</p>
              <p className="text-xl sm:text-3xl font-black text-emerald-600 mt-1 truncate">
                {loading ? '...' : formatPrice(stats.totalRevenue)}
              </p>
              <span className="text-[10px] sm:text-xs text-emerald-700/80 font-semibold mt-0.5 block truncate">
                {stats.totalOrders} ingresso(s) emitidos
              </span>
            </div>
            <div className="p-2.5 sm:p-3 bg-emerald-50 text-emerald-600 rounded-2xl group-hover:scale-105 transition-transform shrink-0">
              <Ticket className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
          </div>
        </div>

        {/* Depoimentos & Avaliações (app_testimonials) */}
        <div 
          onClick={() => navigate('/admin/testimonials')}
          className="bg-white rounded-2xl shadow-xs border border-gray-100 p-4 sm:p-5 hover:shadow-md hover:border-amber-200 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-wider truncate">Depoimentos</p>
              <p className="text-xl sm:text-3xl font-black text-amber-600 mt-1">
                {loading ? '...' : stats.totalTestimonials}
              </p>
              <span className="text-[10px] sm:text-xs text-gray-400 mt-0.5 block truncate">
                {stats.totalContacts} contatos recebidos
              </span>
            </div>
            <div className="p-2.5 sm:p-3 bg-amber-50 text-amber-600 rounded-2xl group-hover:scale-105 transition-transform shrink-0">
              <MessageSquare className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
          </div>
        </div>
      </div>

      {/* Conteúdo Principal: Atividade Recente e Painel de Eventos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-6">
        {/* Feed de Atividades Recentes em Tempo Real */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-xs border border-gray-100 p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm sm:text-base font-bold text-gray-900">Atividade Recente em Tempo Real</h3>
              <p className="text-[11px] sm:text-xs text-gray-400">Vendas de ingressos, eventos e contatos mais recentes</p>
            </div>
            <span className="text-[10px] sm:text-xs font-semibold bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-full">
              {recentActivities.length} eventos
            </span>
          </div>
          
          {loading ? (
            <div className="space-y-3 py-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center p-3.5 bg-gray-50 rounded-xl animate-pulse gap-3">
                  <div className="w-8 h-8 bg-gray-200 rounded-xl shrink-0"></div>
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3.5 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-2.5 bg-gray-200 rounded w-1/2"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : recentActivities.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Clock className="h-10 w-10 mx-auto mb-2 opacity-40" />
              <p className="text-xs font-medium">Nenhuma atividade recente registrada.</p>
            </div>
          ) : (
            <div className="space-y-2.5 divide-y divide-gray-50">
              {recentActivities.map((activity) => {
                const getIconAndBadge = () => {
                  switch (activity.type) {
                    case 'order':
                      return {
                        icon: <Ticket className="w-4 h-4 text-emerald-600" />,
                        bg: 'bg-emerald-50 border-emerald-100',
                        tagBg: 'bg-emerald-50 text-emerald-700'
                      };
                    case 'event':
                      return {
                        icon: <Calendar className="w-4 h-4 text-indigo-600" />,
                        bg: 'bg-indigo-50 border-indigo-100',
                        tagBg: 'bg-indigo-50 text-indigo-700'
                      };
                    case 'testimonial':
                      return {
                        icon: <MessageSquare className="w-4 h-4 text-amber-600" />,
                        bg: 'bg-amber-50 border-amber-100',
                        tagBg: 'bg-amber-50 text-amber-700'
                      };
                    case 'contact':
                      return {
                        icon: <Mail className="w-4 h-4 text-purple-600" />,
                        bg: 'bg-purple-50 border-purple-100',
                        tagBg: 'bg-purple-50 text-purple-700'
                      };
                    default:
                      return {
                        icon: <Users className="w-4 h-4 text-blue-600" />,
                        bg: 'bg-blue-50 border-blue-100',
                        tagBg: 'bg-blue-50 text-blue-700'
                      };
                  }
                };

                const { icon, bg, tagBg } = getIconAndBadge();

                return (
                  <div 
                    key={activity.id} 
                    className="flex items-center justify-between p-3 sm:p-3.5 hover:bg-gray-50/80 rounded-xl transition-colors gap-3 pt-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-9 h-9 rounded-xl ${bg} border flex items-center justify-center shrink-0`}>
                        {icon}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${tagBg}`}>
                            {activity.title}
                          </span>
                          {activity.type === 'order' ? (
                            activity.amount && activity.amount > 0 ? (
                              <span className="text-[11px] font-bold text-emerald-600 font-mono">
                                {formatPrice(activity.amount)}
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200 uppercase tracking-wider font-sans inline-flex items-center gap-1 shadow-2xs">
                                <Gift className="w-2.5 h-2.5 text-purple-600" />
                                CORTESIA
                              </span>
                            )
                          ) : (
                            Boolean(activity.amount && activity.amount > 0) && (
                              <span className="text-[11px] font-bold text-emerald-600 font-mono">
                                {formatPrice(activity.amount!)}
                              </span>
                            )
                          )}
                        </div>
                        <p className="text-xs font-semibold text-gray-800 truncate mt-0.5">
                          {activity.description}
                        </p>
                      </div>
                    </div>
                    
                    <span className="text-[10px] text-gray-400 font-medium whitespace-nowrap shrink-0">
                      {formatTimeAgo(activity.created_at)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Estatísticas de Eventos & Status */}
        <div className="bg-white rounded-2xl shadow-xs border border-gray-100 p-5 sm:p-6 flex flex-col justify-between space-y-4">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-gray-900 mb-1">Estatísticas de Eventos</h3>
            <p className="text-[11px] sm:text-xs text-gray-400">Distribuição temporal dos eventos cadastrados</p>
          </div>

          <div className="p-5 bg-gradient-to-br from-indigo-50/60 to-purple-50/60 rounded-2xl border border-indigo-100/60 text-center">
            <p className="text-3xl sm:text-4xl font-black text-indigo-700 font-mono">
              {eventStats.totalEvents}
            </p>
            <p className="text-xs font-bold text-indigo-900/80 uppercase tracking-wider mt-1">Total de Eventos</p>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-gray-600 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                Eventos Futuros / Ativos
              </span>
              <span className="font-bold text-gray-900">{eventStats.futureEvents}</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
              <div 
                className="bg-emerald-500 h-full rounded-full transition-all"
                style={{ width: `${eventStats.totalEvents > 0 ? (eventStats.futureEvents / eventStats.totalEvents) * 100 : 0}%` }}
              ></div>
            </div>

            <div className="flex items-center justify-between text-xs pt-1">
              <span className="font-semibold text-gray-600 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-gray-400"></span>
                Eventos Concluídos
              </span>
              <span className="font-bold text-gray-900">{eventStats.pastEvents}</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
              <div 
                className="bg-gray-400 h-full rounded-full transition-all"
                style={{ width: `${eventStats.totalEvents > 0 ? (eventStats.pastEvents / eventStats.totalEvents) * 100 : 0}%` }}
              ></div>
            </div>
          </div>

          <button
            onClick={() => navigate('/admin/events')}
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm shadow-indigo-600/20"
          >
            <span>Ver Todos os Eventos</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      
      {/* Ações Rápidas */}
      <div className="bg-white rounded-2xl shadow-xs border border-gray-100 p-5 sm:p-6 space-y-4">
        <h3 className="text-sm sm:text-base font-bold text-gray-900">Ações Rápidas</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <button 
            onClick={() => navigate('/admin/clients')}
            className="p-4 bg-gray-50/70 hover:bg-blue-50/60 border border-gray-200/80 hover:border-blue-300 rounded-2xl transition-all group text-left cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
              <Users className="h-5 w-5" />
            </div>
            <p className="text-xs sm:text-sm font-bold text-gray-900 leading-tight">Gerenciar Clientes</p>
            <p className="text-[10px] text-gray-500 mt-0.5">Base com {stats.totalClients} pessoas</p>
          </button>

          <button 
            onClick={() => navigate('/admin/events')}
            className="p-4 bg-gray-50/70 hover:bg-indigo-50/60 border border-gray-200/80 hover:border-indigo-300 rounded-2xl transition-all group text-left cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
              <Calendar className="h-5 w-5" />
            </div>
            <p className="text-xs sm:text-sm font-bold text-gray-900 leading-tight">Gerenciar Eventos</p>
            <p className="text-[10px] text-gray-500 mt-0.5">Ingressos, lotes e vendas</p>
          </button>

          <button 
            onClick={() => navigate('/admin/testimonials')}
            className="p-4 bg-gray-50/70 hover:bg-amber-50/60 border border-gray-200/80 hover:border-amber-300 rounded-2xl transition-all group text-left cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
              <MessageSquare className="h-5 w-5" />
            </div>
            <p className="text-xs sm:text-sm font-bold text-gray-900 leading-tight">Depoimentos</p>
            <p className="text-[10px] text-gray-500 mt-0.5">{stats.totalTestimonials} avaliações</p>
          </button>

          <button 
            onClick={() => navigate('/admin/suppliers')}
            className="p-4 bg-gray-50/70 hover:bg-purple-50/60 border border-gray-200/80 hover:border-purple-300 rounded-2xl transition-all group text-left cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
              <Building2 className="h-5 w-5" />
            </div>
            <p className="text-xs sm:text-sm font-bold text-gray-900 leading-tight">Fornecedores</p>
            <p className="text-[10px] text-gray-500 mt-0.5">Parceiros e serviços</p>
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;