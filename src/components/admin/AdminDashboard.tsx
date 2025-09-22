import React from 'react';
import { BarChart3, Users, Calendar, Settings } from 'lucide-react';

const AdminDashboard: React.FC = () => {
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
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Clientes</p>
              <p className="text-2xl font-bold text-gray-900">-</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <Calendar className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Eventos Ativos</p>
              <p className="text-2xl font-bold text-gray-900">-</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <BarChart3 className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Relatórios</p>
              <p className="text-2xl font-bold text-gray-900">-</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Settings className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Configurações</p>
              <p className="text-2xl font-bold text-gray-900">-</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Atividade Recente
          </h2>
          <div className="text-center py-8">
            <div className="text-gray-400 mb-2">
              <BarChart3 className="h-12 w-12 mx-auto" />
            </div>
            <p className="text-gray-500">Nenhuma atividade recente</p>
            <p className="text-sm text-gray-400 mt-1">
              As atividades aparecerão aqui quando houver dados
            </p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Ações Rápidas
          </h2>
          <div className="space-y-3">
            <button className="w-full text-left p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
              <div className="flex items-center">
                <Users className="h-5 w-5 text-blue-600 mr-3" />
                <div>
                  <p className="font-medium text-gray-900">Gerenciar Clientes</p>
                  <p className="text-sm text-gray-500">Adicionar, editar ou remover clientes</p>
                </div>
              </div>
            </button>

            <button className="w-full text-left p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
              <div className="flex items-center">
                <Calendar className="h-5 w-5 text-green-600 mr-3" />
                <div>
                  <p className="font-medium text-gray-900">Criar Evento</p>
                  <p className="text-sm text-gray-500">Adicionar novo evento ao sistema</p>
                </div>
              </div>
            </button>

            <button className="w-full text-left p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
              <div className="flex items-center">
                <Settings className="h-5 w-5 text-purple-600 mr-3" />
                <div>
                  <p className="font-medium text-gray-900">Configurações</p>
                  <p className="text-sm text-gray-500">Ajustar configurações do sistema</p>
                </div>
              </div>
            </button>
          </div>
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