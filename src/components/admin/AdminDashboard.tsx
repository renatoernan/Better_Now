import React from 'react';
import { BarChart3, Users, Calendar, Settings, MessageSquare, RefreshCw, Clock, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useDashboardData } from '../../hooks/useDashboardData';

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { stats, recentActivity, eventStats, loading, error, refetch } = useDashboardData();

  if (error) {
    return (
      <div className="space-y-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="text-red-600 mr-3">
                <BarChart3 className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-red-800 font-medium">Erro ao carregar dados</h3>
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            </div>
            <button
              onClick={refetch}
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors flex items-center"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Tentar Novamente
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Dashboard Administrativo
        </h1>
        <p className="text-gray-600">
          Bem-vindo ao painel de controle da Better Now
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Clientes</p>
                <p className="text-2xl font-bold text-gray-900">
                  {loading ? '...' : stats.totalClients}
                </p>
              </div>
            </div>
            {!loading && (
              <div className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
                <TrendingUp className="h-3 w-3 inline mr-1" />
                Ativo
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <Calendar className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Eventos Ativos</p>
                <p className="text-2xl font-bold text-gray-900">
                  {loading ? '...' : stats.activeEvents}
                </p>
              </div>
            </div>
            {!loading && (
              <div className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                Futuros
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <MessageSquare className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Depoimentos</p>
                <p className="text-2xl font-bold text-gray-900">
                  {loading ? '...' : stats.totalTestimonials}
                </p>
              </div>
            </div>
            {!loading && (
              <div className="text-xs text-yellow-600 bg-yellow-50 px-2 py-1 rounded">
                Total
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Settings className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Contatos</p>
                <p className="text-2xl font-bold text-gray-900">
                  {loading ? '...' : stats.totalContacts}
                </p>
              </div>
            </div>
            {!loading && (
              <div className="text-xs text-purple-600 bg-purple-50 px-2 py-1 rounded">
                Recebidos
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Atividade Recente</h3>
            <button
              onClick={refetch}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
          
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center p-3 bg-gray-50 rounded-lg animate-pulse">
                  <div className="w-2 h-2 bg-gray-300 rounded-full mr-3"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-gray-300 rounded w-3/4 mb-1"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {recentActivity.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Nenhuma atividade recente</p>
                </div>
              ) : (
                recentActivity.map((activity, index) => {
                  const getActivityColor = (type: string) => {
                    switch (type) {
                      case 'event': return 'bg-blue-500';
                      case 'contact': return 'bg-green-500';
                      case 'testimonial': return 'bg-yellow-500';
                      default: return 'bg-gray-500';
                    }
                  };
                  
                  const formatTimeAgo = (date: string) => {
                    const now = new Date();
                    const activityDate = new Date(date);
                    const diffInHours = Math.floor((now.getTime() - activityDate.getTime()) / (1000 * 60 * 60));
                    
                    if (diffInHours < 1) return 'Há poucos minutos';
                    if (diffInHours === 1) return 'Há 1 hora';
                    if (diffInHours < 24) return `Há ${diffInHours} horas`;
                    
                    const diffInDays = Math.floor(diffInHours / 24);
                    if (diffInDays === 1) return 'Há 1 dia';
                    return `Há ${diffInDays} dias`;
                  };
                  
                  return (
                    <div key={index} className="flex items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                      <div className={`w-2 h-2 ${getActivityColor(activity.type)} rounded-full mr-3`}></div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{activity.description}</p>
                        <p className="text-xs text-gray-500">{formatTimeAgo(activity.created_at)}</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* Event Statistics */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Estatísticas de Eventos</h3>
          
          {loading ? (
            <div className="space-y-4">
              <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
              <div className="h-20 bg-gray-100 rounded animate-pulse"></div>
              <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-gray-900 mb-1">
                  {eventStats.totalEvents}
                </div>
                <div className="text-sm text-gray-500">Total de Eventos</div>
              </div>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Futuros</span>
                  <div className="flex items-center">
                    <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                      <div 
                        className="bg-green-500 h-2 rounded-full" 
                        style={{ width: `${eventStats.totalEvents > 0 ? (eventStats.futureEvents / eventStats.totalEvents) * 100 : 0}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium">{eventStats.futureEvents}</span>
                  </div>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Passados</span>
                  <div className="flex items-center">
                    <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                      <div 
                        className="bg-blue-500 h-2 rounded-full" 
                        style={{ width: `${eventStats.totalEvents > 0 ? (eventStats.pastEvents / eventStats.totalEvents) * 100 : 0}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium">{eventStats.pastEvents}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Ações Rápidas</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button 
            onClick={() => navigate('/admin/clients')}
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-blue-300 transition-all group"
          >
            <Users className="h-6 w-6 text-blue-600 mx-auto mb-2 group-hover:scale-110 transition-transform" />
            <p className="text-sm font-medium text-gray-900">Gerenciar Clientes</p>
          </button>
          <button 
            onClick={() => navigate('/admin/events')}
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-green-300 transition-all group"
          >
            <Calendar className="h-6 w-6 text-green-600 mx-auto mb-2 group-hover:scale-110 transition-transform" />
            <p className="text-sm font-medium text-gray-900">Gerenciar Eventos</p>
          </button>
          <button 
            onClick={() => navigate('/admin/testimonials')}
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-yellow-300 transition-all group"
          >
            <MessageSquare className="h-6 w-6 text-yellow-600 mx-auto mb-2 group-hover:scale-110 transition-transform" />
            <p className="text-sm font-medium text-gray-900">Ver Depoimentos</p>
          </button>
          <button 
            onClick={() => navigate('/admin/settings')}
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-purple-300 transition-all group"
          >
            <Settings className="h-6 w-6 text-purple-600 mx-auto mb-2 group-hover:scale-110 transition-transform" />
            <p className="text-sm font-medium text-gray-900">Configurações</p>
          </button>
        </div>
      </div>

      {/* Welcome Message */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-100">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">
            🚀 Área Administrativa Renovada
          </h3>
          <p className="text-blue-700 mb-4">
            Esta é a nova versão da área administrativa. Use a sidebar para navegar entre as seções.
          </p>
          <div className="flex flex-wrap justify-center gap-2 text-sm">
            <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full">
              ✅ Login Funcional
            </span>
            <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full">
              ✅ Layout Responsivo
            </span>
            <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full">
              🔄 Em Desenvolvimento
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;