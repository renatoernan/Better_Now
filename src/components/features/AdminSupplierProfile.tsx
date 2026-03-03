import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Edit, 
  Star, 
  MapPin, 
  Phone, 
  Mail, 
  Globe, 
  Building, 
  CreditCard,
  FileText,
  Calendar,
  Users,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Download,
  Upload,
  Trash2,
  Plus,
  Eye
} from 'lucide-react';
import { useSuppliers } from '../../shared/hooks/useSuppliers';
import { useSupplierDocuments } from '../../shared/hooks/useSupplierDocuments';
import { useSupplierServices } from '../../shared/hooks/useSupplierServices';
import { useSupplierEvaluations } from '../../shared/hooks/useSupplierEvaluations';
import { SupplierWithDetails } from '../../shared/types/suppliers';
import { toast } from 'sonner';
import Loading from '../ui/Loading';

type TabType = 'overview' | 'documents' | 'services' | 'evaluations' | 'history';

const AdminSupplierProfile: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const { fetchSupplierById, updateSupplierStatus, loading } = useSuppliers();
  const { documents, fetchDocumentsBySupplier, uploadDocument, deleteDocument } = useSupplierDocuments();
  const { services, fetchServicesBySupplier } = useSupplierServices();
  const { evaluations, fetchEvaluationsBySupplier, fetchEvaluationStats } = useSupplierEvaluations();
  
  const [supplier, setSupplier] = useState<SupplierWithDetails | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [evaluationStats, setEvaluationStats] = useState<any>(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (id) {
      loadSupplierData();
    }
  }, [id]);

  const loadSupplierData = async () => {
    if (!id) return;
    
    try {
      const supplierData = await fetchSupplierById(id);
      if (supplierData) {
        setSupplier(supplierData);
        
        // Carregar dados relacionados
        await Promise.all([
          fetchDocumentsBySupplier(id),
          fetchServicesBySupplier(id),
          fetchEvaluationsBySupplier(id),
          loadEvaluationStats(id)
        ]);
      }
    } catch (error) {
      console.error('Erro ao carregar fornecedor:', error);
      toast.error('Erro ao carregar dados do fornecedor');
    }
  };

  const loadEvaluationStats = async (supplierId: string) => {
    try {
      const stats = await fetchEvaluationStats({ supplier_id: supplierId });
      setEvaluationStats(stats);
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
    }
  };

  const handleStatusChange = async (newStatus: 'active' | 'inactive' | 'blocked') => {
    if (!supplier) return;
    
    try {
      await updateSupplierStatus(supplier.id, newStatus);
      setSupplier(prev => prev ? { ...prev, status: newStatus } : null);
      toast.success('Status atualizado com sucesso!');
    } catch (error) {
      toast.error('Erro ao atualizar status');
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !supplier) return;

    setIsUploading(true);
    try {
      await uploadDocument({
        supplier_id: supplier.id,
        title: file.name,
        type: 'certificate',
        file
      });
      
      await fetchDocumentsBySupplier(supplier.id);
      toast.success('Documento enviado com sucesso!');
    } catch (error) {
      toast.error('Erro ao enviar documento');
    } finally {
      setIsUploading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'inactive':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'blocked':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'inactive':
        return 'bg-yellow-100 text-yellow-800';
      case 'blocked':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const tabs = [
    { id: 'overview', label: 'Visão Geral', icon: Building },
    { id: 'documents', label: 'Documentos', icon: FileText },
    { id: 'services', label: 'Serviços', icon: Users },
    { id: 'evaluations', label: 'Avaliações', icon: Star },
    { id: 'history', label: 'Histórico', icon: Calendar }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loading variant="pulse" size="lg" text="Carregando perfil do fornecedor..." />
      </div>
    );
  }

  if (!supplier) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Fornecedor não encontrado</h3>
          <p className="text-gray-500 mb-4">O fornecedor solicitado não existe ou foi removido.</p>
          <button
            onClick={() => navigate('/admin/fornecedores')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Voltar à lista
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/admin/fornecedores')}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{supplier.name}</h1>
            {supplier.trade_name && (
              <p className="text-gray-500">{supplier.trade_name}</p>
            )}
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            {getStatusIcon(supplier.status)}
            <select
              value={supplier.status}
              onChange={(e) => handleStatusChange(e.target.value as any)}
              className={`text-sm font-medium px-3 py-1 rounded-full border-0 focus:ring-2 focus:ring-blue-500 ${getStatusColor(supplier.status)}`}
            >
              <option value="active">Ativo</option>
              <option value="inactive">Inativo</option>
              <option value="blocked">Bloqueado</option>
            </select>
          </div>
          
          <button
            onClick={() => navigate(`/admin/fornecedores/${supplier.id}/editar`)}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Edit className="h-4 w-4 mr-2" />
            Editar
          </button>
        </div>
      </div>

      {/* Supplier Info Card */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Basic Info */}
          <div className="lg:col-span-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-3">Informações Básicas</h3>
                <div className="space-y-2">
                  <div className="flex items-center text-sm">
                    <Building className="h-4 w-4 text-gray-400 mr-2" />
                    <span className="font-medium">{supplier.document_number}</span>
                  </div>
                  <div className="flex items-center text-sm">
                    <Mail className="h-4 w-4 text-gray-400 mr-2" />
                    <a href={`mailto:${supplier.email}`} className="text-blue-600 hover:text-blue-700">
                      {supplier.email}
                    </a>
                  </div>
                  <div className="flex items-center text-sm">
                    <Phone className="h-4 w-4 text-gray-400 mr-2" />
                    <a href={`tel:${supplier.phone}`} className="text-blue-600 hover:text-blue-700">
                      {supplier.phone}
                    </a>
                  </div>
                  {supplier.website && (
                    <div className="flex items-center text-sm">
                      <Globe className="h-4 w-4 text-gray-400 mr-2" />
                      <a 
                        href={supplier.website} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-700"
                      >
                        Website
                      </a>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-3">Localização</h3>
                <div className="space-y-2">
                  <div className="flex items-start text-sm">
                    <MapPin className="h-4 w-4 text-gray-400 mr-2 mt-0.5" />
                    <div>
                      <div>{supplier.address}</div>
                      <div className="text-gray-500">
                        {supplier.city}, {supplier.state} - {supplier.zip_code}
                      </div>
                      <div className="text-gray-500">{supplier.country}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Categories */}
            {supplier.categories && supplier.categories.length > 0 && (
              <div className="mt-6">
                <h3 className="text-sm font-medium text-gray-500 mb-3">Categorias</h3>
                <div className="flex flex-wrap gap-2">
                  {supplier.categories.map((category) => (
                    <span 
                      key={category.id}
                      className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800"
                    >
                      <div 
                        className="w-2 h-2 rounded-full mr-2"
                        style={{ backgroundColor: category.color }}
                      />
                      {category.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Stats */}
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-3">Estatísticas</h3>
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Avaliação</span>
                  <div className="flex items-center">
                    <Star className="h-4 w-4 text-yellow-400 fill-current" />
                    <span className="ml-1 text-sm font-medium">
                      {supplier.rating ? supplier.rating.toFixed(1) : 'N/A'}
                    </span>
                  </div>
                </div>
                {evaluationStats && (
                  <div className="text-xs text-gray-500">
                    {evaluationStats.total_evaluations} avaliação{evaluationStats.total_evaluations !== 1 ? 'ões' : ''}
                  </div>
                )}
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Documentos</span>
                  <span className="text-sm font-medium">{documents.length}</span>
                </div>
                <div className="text-xs text-gray-500">
                  {documents.filter(d => new Date(d.expiry_date) < new Date()).length} vencido{documents.filter(d => new Date(d.expiry_date) < new Date()).length !== 1 ? 's' : ''}
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Serviços</span>
                  <span className="text-sm font-medium">{services.length}</span>
                </div>
                <div className="text-xs text-gray-500">
                  {services.filter(s => s.status === 'completed').length} concluído{services.filter(s => s.status === 'completed').length !== 1 ? 's' : ''}
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Cadastro</span>
                  <Calendar className="h-4 w-4 text-gray-400" />
                </div>
                <div className="text-xs text-gray-500">
                  {new Date(supplier.created_at).toLocaleDateString('pt-BR')}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Banking Info */}
        {(supplier.bank_name || supplier.pix_key) && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h3 className="text-sm font-medium text-gray-500 mb-3">Dados Bancários</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {supplier.bank_name && (
                <div className="flex items-center text-sm">
                  <CreditCard className="h-4 w-4 text-gray-400 mr-2" />
                  <span>{supplier.bank_name}</span>
                </div>
              )}
              {supplier.bank_agency && (
                <div className="text-sm">
                  <span className="text-gray-500">Agência:</span> {supplier.bank_agency}
                </div>
              )}
              {supplier.bank_account && (
                <div className="text-sm">
                  <span className="text-gray-500">Conta:</span> {supplier.bank_account}
                </div>
              )}
              {supplier.pix_key && (
                <div className="text-sm">
                  <span className="text-gray-500">PIX:</span> {supplier.pix_key}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Notes */}
        {supplier.notes && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h3 className="text-sm font-medium text-gray-500 mb-3">Observações</h3>
            <p className="text-sm text-gray-700">{supplier.notes}</p>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as TabType)}
                  className={`flex items-center py-4 px-1 border-b-2 font-medium text-sm ${
                    isActive
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="h-4 w-4 mr-2" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-blue-900">Serviços Ativos</p>
                      <p className="text-2xl font-bold text-blue-900">
                        {services.filter(s => s.status === 'active').length}
                      </p>
                    </div>
                    <Users className="h-8 w-8 text-blue-600" />
                  </div>
                </div>

                <div className="bg-green-50 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-green-900">Docs. Válidos</p>
                      <p className="text-2xl font-bold text-green-900">
                        {documents.filter(d => new Date(d.expiry_date) > new Date()).length}
                      </p>
                    </div>
                    <FileText className="h-8 w-8 text-green-600" />
                  </div>
                </div>

                <div className="bg-yellow-50 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-yellow-900">Avaliação Média</p>
                      <p className="text-2xl font-bold text-yellow-900">
                        {supplier.rating ? supplier.rating.toFixed(1) : 'N/A'}
                      </p>
                    </div>
                    <Star className="h-8 w-8 text-yellow-600" />
                  </div>
                </div>
              </div>

              {/* Recent Activity */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Atividade Recente</h3>
                <div className="space-y-3">
                  {services.slice(0, 3).map((service) => (
                    <div key={service.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900">{service.description}</p>
                        <p className="text-sm text-gray-500">
                          {new Date(service.service_date).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        service.status === 'completed' ? 'bg-green-100 text-green-800' :
                        service.status === 'active' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {service.status === 'completed' ? 'Concluído' :
                         service.status === 'active' ? 'Ativo' : 'Cancelado'}
                      </span>
                    </div>
                  ))}
                  
                  {services.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p>Nenhum serviço registrado</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'documents' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900">Documentos</h3>
                <div className="flex space-x-2">
                  <input
                    type="file"
                    id="file-upload"
                    className="hidden"
                    onChange={handleFileUpload}
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  />
                  <label
                    htmlFor="file-upload"
                    className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer"
                  >
                    {isUploading ? (
                      <>
                        <Loading variant="spinner" size="sm" className="mr-2" />
                        Enviando...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        Enviar Documento
                      </>
                    )}
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {documents.map((document) => {
                  const isExpired = new Date(document.expiry_date) < new Date();
                  const isExpiringSoon = new Date(document.expiry_date) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
                  
                  return (
                    <div 
                      key={document.id} 
                      className={`border rounded-lg p-4 ${
                        isExpired ? 'border-red-200 bg-red-50' :
                        isExpiringSoon ? 'border-yellow-200 bg-yellow-50' :
                        'border-gray-200 bg-white'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center">
                          <FileText className={`h-5 w-5 mr-2 ${
                            isExpired ? 'text-red-500' :
                            isExpiringSoon ? 'text-yellow-500' :
                            'text-gray-500'
                          }`} />
                          <div>
                            <h4 className="font-medium text-gray-900">{document.title}</h4>
                            <p className="text-sm text-gray-500">{document.type}</p>
                          </div>
                        </div>
                        
                        <div className="flex space-x-1">
                          <button
                            onClick={() => window.open(document.file_url, '_blank')}
                            className="p-1 text-gray-400 hover:text-gray-600"
                            title="Visualizar"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => deleteDocument(document.id)}
                            className="p-1 text-red-400 hover:text-red-600"
                            title="Excluir"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      
                      <div className="text-sm">
                        <p className={`font-medium ${
                          isExpired ? 'text-red-600' :
                          isExpiringSoon ? 'text-yellow-600' :
                          'text-gray-600'
                        }`}>
                          {isExpired ? 'Vencido' :
                           isExpiringSoon ? 'Vence em breve' :
                           'Válido'}
                        </p>
                        <p className="text-gray-500">
                          Vencimento: {new Date(document.expiry_date).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {documents.length === 0 && (
                <div className="text-center py-12">
                  <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum documento</h3>
                  <p className="text-gray-500 mb-4">Envie documentos e certificações do fornecedor</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'services' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900">Serviços</h3>
                <button className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Serviço
                </button>
              </div>

              <div className="space-y-4">
                {services.map((service) => (
                  <div key={service.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{service.description}</h4>
                        <div className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-500">
                          <div>
                            <span className="font-medium">Data:</span> {new Date(service.service_date).toLocaleDateString('pt-BR')}
                          </div>
                          <div>
                            <span className="font-medium">Valor:</span> R$ {service.cost?.toFixed(2) || 'N/A'}
                          </div>
                          <div>
                            <span className="font-medium">Evento:</span> {service.event_id || 'N/A'}
                          </div>
                        </div>
                        {service.notes && (
                          <p className="mt-2 text-sm text-gray-600">{service.notes}</p>
                        )}
                      </div>
                      
                      <span className={`ml-4 px-2 py-1 text-xs font-medium rounded-full ${
                        service.status === 'completed' ? 'bg-green-100 text-green-800' :
                        service.status === 'active' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {service.status === 'completed' ? 'Concluído' :
                         service.status === 'active' ? 'Ativo' : 'Cancelado'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {services.length === 0 && (
                <div className="text-center py-12">
                  <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum serviço</h3>
                  <p className="text-gray-500 mb-4">Registre os serviços prestados por este fornecedor</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'evaluations' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900">Avaliações</h3>
                <button className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                  <Plus className="h-4 w-4 mr-2" />
                  Nova Avaliação
                </button>
              </div>

              {evaluationStats && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-900">{evaluationStats.average_overall.toFixed(1)}</div>
                      <div className="text-sm text-gray-500">Geral</div>
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-900">{evaluationStats.average_quality.toFixed(1)}</div>
                      <div className="text-sm text-gray-500">Qualidade</div>
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-900">{evaluationStats.average_punctuality.toFixed(1)}</div>
                      <div className="text-sm text-gray-500">Pontualidade</div>
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-900">{evaluationStats.average_communication.toFixed(1)}</div>
                      <div className="text-sm text-gray-500">Comunicação</div>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                {evaluations.map((evaluation) => (
                  <div key={evaluation.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center">
                          <Star className="h-4 w-4 text-yellow-400 fill-current mr-1" />
                          <span className="font-medium">{evaluation.overall_rating.toFixed(1)}</span>
                        </div>
                        <p className="text-sm text-gray-500">
                          {new Date(evaluation.evaluation_date).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                      <div className="text-right text-sm text-gray-500">
                        Evento: {evaluation.event_id || 'N/A'}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3 text-sm">
                      <div>
                        <span className="text-gray-500">Qualidade:</span> {evaluation.quality_rating}
                      </div>
                      <div>
                        <span className="text-gray-500">Pontualidade:</span> {evaluation.punctuality_rating}
                      </div>
                      <div>
                        <span className="text-gray-500">Comunicação:</span> {evaluation.communication_rating}
                      </div>
                      <div>
                        <span className="text-gray-500">Custo-Benefício:</span> {evaluation.cost_benefit_rating}
                      </div>
                    </div>
                    
                    {evaluation.comments && (
                      <p className="text-sm text-gray-700 bg-gray-50 rounded p-3">
                        {evaluation.comments}
                      </p>
                    )}
                  </div>
                ))}
              </div>

              {evaluations.length === 0 && (
                <div className="text-center py-12">
                  <Star className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma avaliação</h3>
                  <p className="text-gray-500 mb-4">Avalie os serviços prestados por este fornecedor</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'history' && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900">Histórico de Atividades</h3>
              
              <div className="space-y-4">
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">Fornecedor cadastrado</p>
                      <p className="text-sm text-gray-500">
                        {new Date(supplier.created_at).toLocaleDateString('pt-BR')} às {new Date(supplier.created_at).toLocaleTimeString('pt-BR')}
                      </p>
                    </div>
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  </div>
                </div>

                {supplier.updated_at !== supplier.created_at && (
                  <div className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">Dados atualizados</p>
                        <p className="text-sm text-gray-500">
                          {new Date(supplier.updated_at).toLocaleDateString('pt-BR')} às {new Date(supplier.updated_at).toLocaleTimeString('pt-BR')}
                        </p>
                      </div>
                      <Edit className="h-5 w-5 text-blue-500" />
                    </div>
                  </div>
                )}

                {/* Adicionar mais eventos do histórico conforme necessário */}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminSupplierProfile;