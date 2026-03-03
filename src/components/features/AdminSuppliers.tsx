import React, { useState, useEffect } from 'react';
import { 
  Truck, 
  Plus, 
  Users, 
  FileText, 
  Star, 
  TrendingUp, 
  AlertTriangle, 
  Calendar,
  BarChart3,
  Eye,
  Edit,
  Search,
  Filter,
  RefreshCw
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSuppliers } from '../../shared/hooks/useSuppliers';
import { useSupplierCategories } from '../../shared/hooks/useSupplierCategories';
import { useSupplierDocuments } from '../../shared/hooks/useSupplierDocuments';
import { SupplierStats } from '../../shared/types/suppliers';
import { toast } from 'sonner';
import Loading from '../ui/Loading';

const AdminSuppliers: React.FC = () => {
  const navigate = useNavigate();
  const { suppliers, loading, error, fetchSuppliers, fetchSupplierStats } = useSuppliers();
  const { categories, fetchCategories } = useSupplierCategories();
  const { fetchExpiringDocuments } = useSupplierDocuments();
  
  const [stats, setStats] = useState<SupplierStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Carregar dados iniciais
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setLoadingStats(true);
        await Promise.all([
          fetchSuppliers(),
          fetchCategories(),
          loadStats()
        ]);
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
        toast.error('Erro ao carregar dados do dashboard');
      } finally {
        setLoadingStats(false);
      }
    };

    loadInitialData();
  }, []);

  const loadStats = async () => {
    try {
      const statsData = await fetchSupplierStats();
      if (statsData) {
        setStats(statsData);
      }
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        fetchSuppliers(),
        fetchCategories(),
        loadStats()
      ]);
      toast.success('Dados atualizados com sucesso!');
    } catch (error) {
      toast.error('Erro ao atualizar dados');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleSearch = async () => {
    if (searchTerm.trim()) {
      await fetchSuppliers({ query: searchTerm });
    } else {
      await fetchSuppliers();
    }
  };

  if (loading || loadingStats) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loading variant="pulse" size="lg" text="Carregando dashboard de fornecedores..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Erro ao carregar dados</h3>
          <p className="text-gray-500 mb-4">{error}</p>
          <button
            onClick={handleRefresh}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestão de Fornecedores</h1>
          <p className="text-gray-500 mt-1">Gerencie fornecedores, categorias e documentos</p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center px-3 py-2 text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Atualizar
          </button>
          
          <button
            onClick={() => navigate('/admin/fornecedores/cadastro')}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4 mr-2" />
            Novo Fornecedor
          </button>
        </div>
      </div>

      {/* Estatísticas Principais */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total de Fornecedores</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total_suppliers}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <Truck className="h-6 w-6 text-blue-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className="text-green-600 font-medium">{stats.active_suppliers} ativos</span>
              <span className="text-gray-500 ml-2">• {stats.inactive_suppliers} inativos</span>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Categorias</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total_categories}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <BarChart3 className="h-6 w-6 text-green-600" />
              </div>
            </div>
            <div className="mt-4">
              <button
                onClick={() => navigate('/admin/fornecedores/categorias')}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                Gerenciar categorias →
              </button>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avaliação Média</p>
                <div className="flex items-center mt-1">
                  <p className="text-2xl font-bold text-gray-900">{stats.average_rating.toFixed(1)}</p>
                  <Star className="h-5 w-5 text-yellow-400 ml-1 fill-current" />
                </div>
              </div>
              <div className="p-3 bg-yellow-100 rounded-full">
                <Star className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
            <div className="mt-4">
              <div className="flex items-center text-sm text-gray-500">
                <TrendingUp className="h-4 w-4 mr-1" />
                Baseado em avaliações
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Docs. Vencendo</p>
                <p className="text-2xl font-bold text-gray-900">{stats.expiring_documents.length}</p>
              </div>
              <div className="p-3 bg-red-100 rounded-full">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
            </div>
            <div className="mt-4">
              <button
                onClick={() => navigate('/admin/fornecedores/documentos')}
                className="text-sm text-red-600 hover:text-red-700 font-medium"
              >
                Ver documentos →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Busca Rápida */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Busca Rápida</h2>
        <div className="flex gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Buscar fornecedores..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <button
            onClick={handleSearch}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Buscar
          </button>
          <button
            onClick={() => navigate('/admin/fornecedores/lista')}
            className="flex items-center px-4 py-2 text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Filter className="h-4 w-4 mr-2" />
            Busca Avançada
          </button>
        </div>
      </div>

      {/* Ações Rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <button
          onClick={() => navigate('/admin/fornecedores/lista')}
          className="bg-white rounded-lg shadow-sm p-6 border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all text-left group"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-blue-100 rounded-full group-hover:bg-blue-200 transition-colors">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <span className="text-sm text-gray-500">Ver todos</span>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Lista de Fornecedores</h3>
          <p className="text-gray-600 text-sm">Visualize e gerencie todos os fornecedores cadastrados</p>
        </button>

        <button
          onClick={() => navigate('/admin/fornecedores/categorias')}
          className="bg-white rounded-lg shadow-sm p-6 border border-gray-200 hover:border-green-300 hover:shadow-md transition-all text-left group"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-green-100 rounded-full group-hover:bg-green-200 transition-colors">
              <BarChart3 className="h-6 w-6 text-green-600" />
            </div>
            <span className="text-sm text-gray-500">Gerenciar</span>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Categorias</h3>
          <p className="text-gray-600 text-sm">Organize fornecedores por categorias de serviços</p>
        </button>

        <button
          onClick={() => navigate('/admin/fornecedores/documentos')}
          className="bg-white rounded-lg shadow-sm p-6 border border-gray-200 hover:border-yellow-300 hover:shadow-md transition-all text-left group"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-yellow-100 rounded-full group-hover:bg-yellow-200 transition-colors">
              <FileText className="h-6 w-6 text-yellow-600" />
            </div>
            <span className="text-sm text-gray-500">Biblioteca</span>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Documentos</h3>
          <p className="text-gray-600 text-sm">Gerencie documentos e certificações</p>
        </button>
      </div>

      {/* Fornecedores Recentes */}
      {stats && stats.recent_suppliers.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Fornecedores Recentes</h2>
            <button
              onClick={() => navigate('/admin/fornecedores/lista')}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Ver todos →
            </button>
          </div>
          
          <div className="space-y-3">
            {stats.recent_suppliers.slice(0, 5).map((supplier) => (
              <div key={supplier.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-gray-100 rounded-full">
                    <Truck className="h-4 w-4 text-gray-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{supplier.name}</p>
                    <p className="text-sm text-gray-500">{supplier.trade_name}</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    supplier.status === 'active' 
                      ? 'bg-green-100 text-green-800' 
                      : supplier.status === 'inactive'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {supplier.status === 'active' ? 'Ativo' : supplier.status === 'inactive' ? 'Inativo' : 'Bloqueado'}
                  </span>
                  
                  <button
                    onClick={() => navigate(`/admin/fornecedores/${supplier.id}`)}
                    className="p-1 text-gray-400 hover:text-gray-600"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Documentos Próximos ao Vencimento */}
      {stats && stats.expiring_documents.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Documentos Próximos ao Vencimento</h2>
            <button
              onClick={() => navigate('/admin/fornecedores/documentos')}
              className="text-sm text-red-600 hover:text-red-700 font-medium"
            >
              Ver todos →
            </button>
          </div>
          
          <div className="space-y-3">
            {stats.expiring_documents.slice(0, 5).map((doc, index) => (
              <div key={index} className="flex items-center justify-between p-3 border border-red-200 rounded-lg bg-red-50">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-red-100 rounded-full">
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{doc.document_title}</p>
                    <p className="text-sm text-gray-600">{doc.supplier_name}</p>
                  </div>
                </div>
                
                <div className="text-right">
                  <p className="text-sm font-medium text-red-600">
                    {doc.days_until_expiry === 0 ? 'Vence hoje' : 
                     doc.days_until_expiry === 1 ? 'Vence amanhã' : 
                     `${doc.days_until_expiry} dias`}
                  </p>
                  <p className="text-xs text-gray-500">
                    {new Date(doc.expiry_date).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Fornecedores por Categoria */}
      {stats && stats.suppliers_by_category.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Fornecedores por Categoria</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {stats.suppliers_by_category.map((category) => (
              <div key={category.category_name} className="p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: category.category_color }}
                    />
                    <span className="font-medium text-gray-900">{category.category_name}</span>
                  </div>
                  <span className="text-sm font-medium text-gray-600">{category.count}</span>
                </div>
                
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="h-2 rounded-full"
                    style={{ 
                      backgroundColor: category.category_color,
                      width: `${(category.count / stats.total_suppliers) * 100}%`
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminSuppliers;