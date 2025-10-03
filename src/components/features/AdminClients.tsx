import React, { useState, useEffect, Suspense } from 'react';
import { Users, Plus, Search, Filter, Edit, Trash2, History, Download, Phone, Mail, MapPin, Calendar, X, Save, FileText, ChevronDown, Eye, Link, Unlink, RotateCcw, RefreshCw, AlertCircle } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useSupabaseClients } from '../../shared/hooks/hooks/useSupabaseClients';
import { useSupabaseEvents } from '../../shared/hooks/hooks/useSupabaseEvents';
import { useClientInteractions } from '../../shared/hooks/hooks/useClientInteractions';
import { useLanguage } from '../../shared/contexts/contexts/LanguageContext';
import { clientFormDataSchema, type ClientFormData } from '../../shared/types/schemas/validationSchemas';
import { Client as BaseClient } from '../../shared/types/types/core';
import { ActivityLogger } from '../../shared/utils/utils/activityLogger';
import { toast } from 'sonner';
import Loading from '../ui/Loading';
import { PhoneInput } from '../ui/PhoneInput';

// Lazy loading para componentes modais
const ConfirmModal = React.lazy(() => import('../shared/ConfirmModal'));

// Interface estendida para incluir propriedades específicas do componente
interface Client extends BaseClient {
  apelido?: string;
  whatsapp?: string;
  cep?: string;
  logradouro?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  uf?: string;
  notes?: string;
  validated?: boolean;
}



const AdminClients: React.FC = () => {
  const { clients, deletedClients, loading, createClient: addClient, updateClient, deleteClient, searchClients, restoreClient, permanentDeleteClient, fetchClients, fetchDeletedClients } = useSupabaseClients();
  const { interactions, getClientInteractions, addInteraction } = useClientInteractions();
  const { events, fetchEvents,  linkClientToEvent, unlinkClientFromEvent } = useSupabaseEvents() as any;
  const { translations } = useLanguage();
  
  // Lista das UFs do Brasil
  const brasilUFs = [
    'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
    'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
    'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
  ];
  
  const [showModal, setShowModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showEventsModal, setShowEventsModal] = useState(false);
  const [showLinkEventModal, setShowLinkEventModal] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [relationshipType, setRelationshipType] = useState<'participant' | 'organizer' | 'vendor' | 'guest'>('participant');
  const [eventNotes, setEventNotes] = useState('');
  const [newInteraction, setNewInteraction] = useState('');
  const [activeTab, setActiveTab] = useState<'active' | 'trash'>('active');
  
  // Estados para o modal de confirmação
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState<() => void>(() => {});
  const [confirmTitle, setConfirmTitle] = useState('');
  const [confirmMessage, setConfirmMessage] = useState('');
  const [confirmType, setConfirmType] = useState<'danger' | 'warning' | 'info'>('danger');
  const [confirmButtonText, setConfirmButtonText] = useState('Confirmar');
  
  // Estado para o campo WhatsApp
  const [whatsappValue, setWhatsappValue] = useState('');
  
  // React Hook Form setup
  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    setValue,
    watch,
    reset
  } = useForm<ClientFormData>({
    resolver: zodResolver(clientFormDataSchema) as any,
    defaultValues: {
      name: '',
      apelido: '',
      whatsapp: '',
      email: '',
      cep: '',
      logradouro: '',
      numero: '',
      complemento: '',
      bairro: '',
      cidade: '',
      uf: '',
      notes: '',
      validated: true
    }
  });

  const [loadingCep, setLoadingCep] = useState(false);
  const watchedCep = watch('cep');

  // Função para buscar dados do CEP via ViaCEP
  const fetchAddressByCep = async (cep: string) => {
    if (cep.length !== 8) return;
    
    setLoadingCep(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await response.json();
      
      if (data.erro) {
        toast.error('CEP não encontrado');
        return;
      }
      
      setValue('logradouro', data.logradouro || '');
      setValue('bairro', data.bairro || '');
      setValue('cidade', data.localidade || '');
      setValue('uf', data.uf || '');
      
      toast.success('Endereço preenchido automaticamente!');
    } catch (error) {
      toast.error('Erro ao buscar CEP');
    } finally {
      setLoadingCep(false);
    }
  };

  // Effect para buscar CEP quando alterado
  useEffect(() => {
    if (watchedCep && watchedCep.length === 8) {
      fetchAddressByCep(watchedCep);
    }
  }, [watchedCep]);

  const [filters, setFilters] = useState({
    dateFrom: '',
    dateTo: '',
    hasEmail: '',
    hasWhatsapp: ''
  });

  useEffect(() => {
    if (searchTerm || Object.values(filters).some(f => f)) {
      searchClients(searchTerm, filters);
    }
  }, [searchTerm, filters]);

  useEffect(() => {
    if (activeTab === 'trash') {
      loadTrashClients();
    }
  }, [activeTab]);

  // Carregar clientes inicialmente
  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  // Fechar menu de exportação ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showExportMenu && !(event.target as Element).closest('.relative')) {
        setShowExportMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showExportMenu]);

  const onSubmit = async (data: ClientFormData) => {
    try {
      if (editingClient) {
        await updateClient(editingClient.id, data);
      } else {
        await addClient(data);
      }
      
      setShowModal(false);
      setEditingClient(null);
      reset();
    } catch (error) {
      toast.error('Erro ao salvar cliente');
    }
  };

  const handleEdit = (client: Client) => {
    setEditingClient(client);
    setWhatsappValue(client.whatsapp || '');
    reset({
      name: client.name,
      apelido: client.apelido || '',
      whatsapp: client.whatsapp || '',
      email: client.email || '',
      cep: client.cep || '',
      logradouro: client.logradouro || '',
      numero: client.numero || '',
      complemento: client.complemento || '',
      bairro: client.bairro || '',
      cidade: client.cidade || '',
      uf: client.uf || '',
      notes: client.notes || '',
      validated: client.validated || false
    });
    setShowModal(true);
  };

  // Função helper para abrir modal de confirmação
  const openConfirmModal = (
    title: string,
    message: string,
    action: () => void,
    type: 'danger' | 'warning' | 'info' = 'danger',
    buttonText: string = 'Confirmar'
  ) => {
    setConfirmTitle(title);
    setConfirmMessage(message);
    setConfirmAction(() => action);
    setConfirmType(type);
    setConfirmButtonText(buttonText);
    setShowConfirmModal(true);
  };

  const handleConfirm = () => {
    confirmAction();
    setShowConfirmModal(false);
  };

  const handleDelete = async (clientId: string) => {
    const deleteAction = async () => {
      try {
        await deleteClient(clientId);
        // Recarregar a lista de clientes deletados se estivermos na aba trash
        if (activeTab === 'trash') {
          loadTrashClients();
        }
      } catch (error) {
        console.error('Erro ao mover cliente para lixeira:', error);
        toast.error('Erro ao mover cliente para lixeira');
      }
    };

    openConfirmModal(
      'Mover para lixeira',
      'Tem certeza que deseja mover este cliente para a lixeira? Você poderá restaurá-lo posteriormente.',
      deleteAction,
      'warning',
      'Mover para lixeira'
    );
  };

  const handleRestore = async (clientId: string) => {
    const restoreAction = async () => {
      try {
        await restoreClient(clientId);
        loadTrashClients();
      } catch (error) {
        console.error('Erro ao restaurar cliente:', error);
        toast.error('Erro ao restaurar cliente');
      }
    };

    openConfirmModal(
      'Restaurar cliente',
      translations.confirmRestore,
      restoreAction,
      'info',
      'Restaurar'
    );
  };

  const handlePermanentDelete = async (clientId: string) => {
    const permanentDeleteAction = async () => {
      try {
        await permanentDeleteClient(clientId);
        loadTrashClients();
      } catch (error) {
        console.error('Erro ao excluir permanentemente:', error);
        toast.error('Erro ao excluir permanentemente');
      }
    };

    openConfirmModal(
      'Exclusão permanente',
      translations.confirmPermanentDelete,
      permanentDeleteAction,
      'danger',
      'Excluir permanentemente'
    );
  };

  const loadTrashClients = async () => {
    try {
      await fetchDeletedClients();
    } catch (error) {
      console.error('Erro ao carregar clientes excluídos:', error);
    }
  };

  const handleShowHistory = async (client: Client) => {
    setSelectedClient(client);
    await getClientInteractions(client.id);
    setShowHistoryModal(true);
  };

  const handleAddInteraction = async () => {
    if (!selectedClient || !newInteraction.trim()) return;
    
    try {
      await addInteraction({
        client_id: selectedClient.id,
        type: 'note',
        description: newInteraction,
        date: new Date().toISOString()
      });
      setNewInteraction('');
    } catch (error) {
      toast.error('Erro ao adicionar interação');
    }
  };

  const handleShowEvents = async (client: Client) => {
    setSelectedClient(client);
    setShowEventsModal(true);
    await fetchClientEvents(client.id);
  };

  const handleLinkEvent = async () => {
    if (!selectedClient || !selectedEventId) return;
    
    try {
      await linkClientToEvent(selectedClient.id, selectedEventId, relationshipType, eventNotes);
      setShowLinkEventModal(false);
      setSelectedEventId('');
      setEventNotes('');
      setRelationshipType('participant');
      // Refresh client events
      await fetchClientEvents(selectedClient.id);
    } catch (error) {
      console.error('Error linking client to event:', error);
    }
  };

  const handleUnlinkEvent = async (clientEventId: string) => {
    try {
      await unlinkClientFromEvent(clientEventId);
      if (selectedClient) {
        await fetchClientEvents(selectedClient.id);
      }
    } catch (error) {
      console.error('Error unlinking client from event:', error);
    }
  };

  // Função para enviar webhook
  const sendWebhook = async (url: string, data: any): Promise<boolean> => {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
      });
      
      return response.ok;
    } catch (error) {
      console.error('Erro ao enviar webhook:', error);
      return false;
    }
  };

  // Função para atualizar apenas o campo validated
  const handleValidatedToggle = async (clientId: string, validated: boolean) => {
    try {
      // Atualizar o cliente no banco de dados
      const updatedClient = await updateClient(clientId, { validated });
      toast.success(`Cliente ${validated ? 'validado' : 'invalidado'} com sucesso!`);
      
      // Se o cliente foi validado (validated=true), enviar webhook
      if (validated) {
        try {
          // Buscar dados completos do cliente
          const client = clients.find(c => c.id === clientId);
          
          if (client) {
            // Preparar dados para o webhook
            const webhookData = {
              ...client,
              tipo_mensagem: 'cliente_validado'
            };
            
            // Enviar webhook
            const webhookSuccess = await sendWebhook(
              'https://n8n.tradersbots.com.br/webhook/login',
              webhookData
            );
            
            if (webhookSuccess) {
              console.log('Webhook enviado com sucesso para cliente validado:', client.name);
              ActivityLogger.log('client_validated_webhook_success', 'Webhook enviado com sucesso para cliente validado', 'system', 'success', {
                clientId: client.id,
                name: client.name,
                webhookUrl: 'https://n8n.tradersbots.com.br/webhook/login'
              });
            } else {
              console.error('Erro ao enviar webhook para cliente validado:', client.name);
              ActivityLogger.log('client_validated_webhook_error', 'Erro ao enviar webhook para cliente validado', 'system', 'error', {
                clientId: client.id,
                name: client.name,
                webhookUrl: 'https://n8n.tradersbots.com.br/webhook/login'
              });
            }
          }
        } catch (webhookError) {
          console.error('Erro no processo de webhook:', webhookError);
          ActivityLogger.log('client_validated_webhook_process_error', 'Erro no processo de webhook para cliente validado', 'system', 'error', {
            clientId,
            error: webhookError.toString()
          });
        }
      }
    } catch (error) {
      console.error('Erro ao atualizar status de validação:', error);
      toast.error('Erro ao atualizar status de validação');
    }
  };

  const openLinkEventModal = () => {
    setShowLinkEventModal(true);
    fetchEvents(); // Load available events
  };

  const exportToCSV = (data: any[], filename: string) => {
    const headers = Object.keys(data[0] || {});
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(header => `"${row[header] || ''}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExport = async (type: 'all' | 'filtered' | 'summary') => {
    try {
      setShowExportMenu(false);
      
      switch (type) {
        case 'all':
          exportToCSV(clients, 'todos_clientes.csv');
          toast.success('Todos os clientes exportados com sucesso!');
          break;
        case 'filtered':
          const filteredClients = clients.filter(client => {
            const matchesSearch = client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                (client.phone && client.phone.includes(searchTerm)) ||
                                (client.email && client.email.toLowerCase().includes(searchTerm.toLowerCase()));
            
            const matchesDateFrom = !filters.dateFrom || 
                                  new Date(client.created_at) >= new Date(filters.dateFrom);
            const matchesDateTo = !filters.dateTo || 
                                new Date(client.created_at) <= new Date(filters.dateTo);
            const matchesEmail = filters.hasEmail === undefined || 
                               (filters.hasEmail === 'true' ? !!client.email : !client.email);
            const matchesWhatsapp = filters.hasWhatsapp === undefined || 
                                  (filters.hasWhatsapp === 'true' ? !!client.whatsapp : !client.whatsapp);
            
            return matchesSearch && matchesDateFrom && matchesDateTo && matchesEmail && matchesWhatsapp;
          });
          
          exportToCSV(filteredClients, 'clientes_filtrados.csv');
          toast.success('Clientes filtrados exportados com sucesso!');
          break;
        case 'summary':
          const summaryData = [{
            total_clientes: clients.length,
            com_whatsapp: clients.filter(c => c.whatsapp).length,
            com_email: clients.filter(c => c.email).length,
            validados: clients.filter(c => c.validated).length,
            data_exportacao: new Date().toLocaleDateString('pt-BR')
          }];
          exportToCSV(summaryData, 'resumo_clientes.csv');
          toast.success('Resumo exportado com sucesso!');
          break;
      }
    } catch (error) {
      console.error('Erro ao exportar:', error);
      toast.error('Erro ao exportar dados');
    }
  };

  const openNewClientModal = () => {
    setEditingClient(null);
    setWhatsappValue('');
    reset();
    setShowModal(true);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      // Recarregar clientes ativos com filtros atuais
      await searchClients(searchTerm, filters);
      
      // Recarregar clientes deletados se estivermos na aba trash
      if (activeTab === 'trash') {
        await fetchDeletedClients();
      }
      
      toast.success('Lista de clientes atualizada!');
    } catch (error) {
      console.error('Erro ao atualizar:', error);
      toast.error('Erro ao atualizar lista');
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              {translations.clientsTitle}
            </h1>
            <p className="text-gray-600">
              Gerencie todos os clientes cadastrados no sistema
            </p>
          </div>
          <div className="mt-4 sm:mt-0 flex gap-2">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
              title="Atualizar lista de clientes"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              Atualizar
            </button>
            <div className="relative">
              <button
                onClick={() => setShowExportMenu(!showExportMenu)}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
              >
                <Download className="h-4 w-4" />
                Exportar
                <ChevronDown className="h-4 w-4" />
              </button>
              
              {showExportMenu && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                  <div className="py-1">
                    <button
                      onClick={() => handleExport('all')}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                    >
                      <Download className="h-4 w-4" />
                      {translations.exportAll}
                    </button>
                    <button
                      onClick={() => handleExport('filtered')}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                    >
                      <Filter className="h-4 w-4" />
                      {translations.exportFiltered}
                    </button>
                    <button
                      onClick={() => handleExport('summary')}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                    >
                      <FileText className="h-4 w-4" />
                      {translations.exportSummary}
                    </button>
                  </div>
                </div>
              )}
            </div>
            <button 
              onClick={openNewClientModal}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
            >
              <Plus className="h-4 w-4" />
              {translations.addClient}
            </button>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder={translations.searchClients}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2 border rounded-lg transition-colors ${
              showFilters ? 'bg-blue-50 border-blue-300 text-blue-700' : 'border-gray-300 hover:bg-gray-50'
            }`}
          >
            <Filter className="h-4 w-4" />
            Filtros
          </button>
        </div>
        
        {/* Advanced Filters */}
        {showFilters && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg border">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Data de cadastro (de)</label>
                <input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => setFilters({...filters, dateFrom: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Data de cadastro (até)</label>
                <input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => setFilters({...filters, dateTo: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tem email</label>
                <select
                  value={filters.hasEmail}
                  onChange={(e) => setFilters({...filters, hasEmail: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Todos</option>
                  <option value="true">Sim</option>
                  <option value="false">Não</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tem WhatsApp</label>
                <select
                  value={filters.hasWhatsapp}
                  onChange={(e) => setFilters({...filters, hasWhatsapp: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Todos</option>
                  <option value="true">Sim</option>
                  <option value="false">Não</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6">
            <button
              onClick={() => setActiveTab('active')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'active'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {translations.activeClients} ({clients.length})
            </button>
            <button
              onClick={() => setActiveTab('trash')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'trash'
                  ? 'border-red-500 text-red-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {translations.trash} ({deletedClients?.length || 0})
            </button>
          </nav>
        </div>
      </div>

      {/* Clients List */}
      <div className="bg-white rounded-lg shadow-sm">
        {loading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-500">Carregando clientes...</p>
          </div>
        ) : (activeTab === 'active' ? clients : deletedClients || []).length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-gray-400 mb-4">
              <Users className="h-16 w-16 mx-auto" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {activeTab === 'trash' ? 'Nenhum cliente na lixeira' : 'Nenhum cliente encontrado'}
            </h3>
            <p className="text-gray-500 mb-6 max-w-md mx-auto">
              {activeTab === 'trash' 
                ? 'A lixeira está vazia. Clientes excluídos aparecerão aqui.'
                : searchTerm || Object.values(filters).some(f => f) 
                  ? 'Nenhum cliente corresponde aos critérios de busca.' 
                  : 'Comece adicionando o primeiro cliente ao sistema.'}
            </p>
            {activeTab === 'active' && (
              <button 
                onClick={openNewClientModal}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg flex items-center gap-2 mx-auto transition-colors"
              >
                <Plus className="h-4 w-4" />
                Adicionar Primeiro Cliente
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {translations.clientName}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {translations.contact}
                  </th>
                  {activeTab === 'active' && (
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Validado
                    </th>
                  )}
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {activeTab === 'trash' ? translations.deletedAt : translations.createdAt}
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {translations.actions}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {(activeTab === 'active' ? clients : deletedClients || []).map((client) => (
                  <tr key={client.id} className={`hover:bg-gray-50 ${activeTab === 'trash' ? 'opacity-75' : ''}`}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{client.name}</div>
                        {client.notes && (
                          <div className="text-sm text-gray-500 truncate max-w-xs">{client.notes}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="space-y-1">
                        {client.whatsapp && (
                          <div className="flex items-center text-sm text-gray-900">
                            <span className="text-green-500 mr-2">📱</span>
                            {client.whatsapp}
                          </div>
                        )}
                        {client.email && (
                          <div className="flex items-center text-sm text-gray-500">
                            <Mail className="h-4 w-4 mr-2 text-gray-400" />
                            {client.email}
                          </div>
                        )}
                        {client.address && (
                          <div className="flex items-center text-sm text-gray-500">
                            <MapPin className="h-4 w-4 mr-2 text-gray-400" />
                            <span className="truncate max-w-xs">{client.address}</span>
                          </div>
                        )}
                      </div>
                    </td>
                    {activeTab === 'active' && (
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={client.validated || false}
                            onChange={(e) => handleValidatedToggle(client.id, e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </td>
                    )}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-500">
                        <Calendar className="h-4 w-4 mr-2" />
                        {activeTab === 'trash' && client.deleted_at
                          ? new Date(client.deleted_at).toLocaleDateString('pt-BR')
                          : new Date(client.created_at).toLocaleDateString('pt-BR')}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        {activeTab === 'active' ? (
                          <>
                            <button
                              onClick={() => handleShowHistory(client)}
                              className="text-blue-600 hover:text-blue-900 p-1 rounded"
                              title={translations.clientHistory}
                            >
                              <History className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleShowEvents(client)}
                              className="text-purple-600 hover:text-purple-900 p-1 rounded"
                              title={translations.viewEvents}
                            >
                              <Calendar className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleEdit(client)}
                              className="text-indigo-600 hover:text-indigo-900 p-1 rounded"
                              title={translations.editClient}
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(client.id)}
                              className="text-red-600 hover:text-red-900 p-1 rounded"
                              title={translations.delete}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => handleRestore(client.id)}
                              className="text-green-600 hover:text-green-900 p-1 rounded"
                              title={translations.restore}
                            >
                              <RotateCcw className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handlePermanentDelete(client.id)}
                              className="text-red-600 hover:text-red-900 p-1 rounded"
                              title={translations.permanentDelete}
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Client Form Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-3 sm:p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto mx-3 sm:mx-0">
            <div className="p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900">
                  {editingClient ? 'Editar Cliente' : 'Novo Cliente'}
                </h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-gray-600 p-1"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Cliente Validado
                    </label>
                    <p className="text-xs text-gray-500 mt-1">
                      Indica se o cliente foi validado no sistema
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      {...register('validated')}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nome *
                  </label>
                  <input
                    type="text"
                    {...register('name')}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.name ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Nome completo do cliente"
                  />
                  {errors.name && (
                    <div className="flex items-center gap-1 mt-1 text-red-600 text-sm">
                      <AlertCircle className="h-4 w-4" />
                      {errors.name.message}
                    </div>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Apelido
                  </label>
                  <input
                    type="text"
                    {...register('apelido')}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.apelido ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Nome informal ou apelido"
                  />
                  {errors.apelido && (
                    <div className="flex items-center gap-1 mt-1 text-red-600 text-sm">
                      <AlertCircle className="h-4 w-4" />
                      {errors.apelido.message}
                    </div>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    WhatsApp
                  </label>
                  <PhoneInput
                    value={whatsappValue}
                    onChange={(value) => {
                      setWhatsappValue(value);
                      setValue('whatsapp', value);
                    }}
                    placeholder="Ex: (11) 99999-9999"
                    defaultCountry="+55"
                    disabled={loading}
                    className="w-full"
                  />
                  {errors.whatsapp && (
                    <div className="flex items-center gap-1 mt-1 text-red-600 text-sm">
                      <AlertCircle className="h-4 w-4" />
                      {errors.whatsapp.message}
                    </div>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    {...register('email')}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.email ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="cliente@email.com"
                  />
                  {errors.email && (
                    <div className="flex items-center gap-1 mt-1 text-red-600 text-sm">
                      <AlertCircle className="h-4 w-4" />
                      {errors.email.message}
                    </div>
                  )}
                </div>
                
                {/* Campos de Endereço */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    CEP
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      {...register('cep')}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        errors.cep ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="00000-000"
                      maxLength={8}
                    />
                    {loadingCep && (
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                      </div>
                    )}
                  </div>
                  {errors.cep && (
                    <div className="flex items-center gap-1 mt-1 text-red-600 text-sm">
                      <AlertCircle className="h-4 w-4" />
                      {errors.cep.message}
                    </div>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Logradouro
                  </label>
                  <input
                    type="text"
                    {...register('logradouro')}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.logradouro ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Rua, Avenida, etc."
                  />
                  {errors.logradouro && (
                    <div className="flex items-center gap-1 mt-1 text-red-600 text-sm">
                      <AlertCircle className="h-4 w-4" />
                      {errors.logradouro.message}
                    </div>
                  )}
                </div>
                
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Número
                    </label>
                    <input
                      type="text"
                      {...register('numero')}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        errors.numero ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Número do endereço"
                    />
                    {errors.numero && (
                      <div className="flex items-center gap-1 mt-1 text-red-600 text-sm">
                        <AlertCircle className="h-4 w-4" />
                        {errors.numero.message}
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Complemento
                    </label>
                    <input
                      type="text"
                      {...register('complemento')}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        errors.complemento ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Apartamento, casa, etc."
                    />
                    {errors.complemento && (
                      <div className="flex items-center gap-1 mt-1 text-red-600 text-sm">
                        <AlertCircle className="h-4 w-4" />
                        {errors.complemento.message}
                      </div>
                    )}
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Bairro
                  </label>
                  <input
                    type="text"
                    {...register('bairro')}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.bairro ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Nome do bairro"
                  />
                  {errors.bairro && (
                    <div className="flex items-center gap-1 mt-1 text-red-600 text-sm">
                      <AlertCircle className="h-4 w-4" />
                      {errors.bairro.message}
                    </div>
                  )}
                </div>
                
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Cidade
                    </label>
                    <input
                      type="text"
                      {...register('cidade')}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        errors.cidade ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Nome da cidade"
                    />
                    {errors.cidade && (
                      <div className="flex items-center gap-1 mt-1 text-red-600 text-sm">
                        <AlertCircle className="h-4 w-4" />
                        {errors.cidade.message}
                      </div>
                    )}
                  </div>
                  <div className="w-2/5">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      UF
                    </label>
                    <select
                      {...register('uf')}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white ${
                        errors.uf ? 'border-red-500' : 'border-gray-300'
                      }`}
                    >
                      <option value="">Selecione UF</option>
                      {brasilUFs.map(uf => (
                        <option key={uf} value={uf}>{uf}</option>
                      ))}
                    </select>
                    {errors.uf && (
                      <div className="flex items-center gap-1 mt-1 text-red-600 text-sm">
                        <AlertCircle className="h-4 w-4" />
                        {errors.uf.message}
                      </div>
                    )}
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Observações
                  </label>
                  <textarea
                    {...register('notes')}
                    rows={3}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.notes ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Observações sobre o cliente"
                  />
                  {errors.notes && (
                    <div className="flex items-center gap-1 mt-1 text-red-600 text-sm">
                      <AlertCircle className="h-4 w-4" />
                      {errors.notes.message}
                    </div>
                  )}
                </div>
                
                
                
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <Save className="h-4 w-4" />
                    {editingClient ? 'Atualizar' : 'Cadastrar'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* History Modal */}
      {showHistoryModal && selectedClient && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    Histórico de Interações
                  </h2>
                  <p className="text-gray-600">{selectedClient.name}</p>
                </div>
                <button
                  onClick={() => setShowHistoryModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              
              {/* Add New Interaction */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Nova Interação</h3>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newInteraction}
                    onChange={(e) => setNewInteraction(e.target.value)}
                    placeholder="Descreva a interação..."
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <button
                    onClick={handleAddInteraction}
                    disabled={!newInteraction.trim()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Adicionar
                  </button>
                </div>
              </div>
              
              {/* Interactions Timeline */}
              <div className="space-y-4">
                {interactions.length === 0 ? (
                  <div className="text-center py-8">
                    <FileText className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-500">Nenhuma interação registrada</p>
                  </div>
                ) : (
                  interactions.map((interaction) => (
                    <div key={interaction.id} className="flex gap-3">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <FileText className="h-4 w-4 text-blue-600" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-gray-900">{interaction.description}</div>
                        <div className="text-xs text-gray-500 mt-1">
                          {new Date(interaction.date).toLocaleString('pt-BR')}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Events Modal */}
      {showEventsModal && selectedClient && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    Eventos
                  </h2>
                  <p className="text-gray-600">{selectedClient.name}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={openLinkEventModal}
                    className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded-lg flex items-center gap-1 text-sm transition-colors"
                  >
                    <Link className="h-4 w-4" />
                    Vincular Evento
                  </button>
                  <button
                    onClick={() => setShowEventsModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>
              </div>
              
              {/* Events List */}
              <div className="space-y-4">
                {clientEvents.length === 0 ? (
                  <div className="text-center py-8">
                    <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-500">Nenhum evento vinculado a este cliente</p>
                  </div>
                ) : (
                  clientEvents.map((clientEvent) => (
                    <div key={clientEvent.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">
                            {clientEvent.event?.title}
                          </h4>
                          <p className="text-sm text-gray-600 mt-1">
                            {clientEvent.event?.description}
                          </p>
                          <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              {clientEvent.event?.event_date && 
                                new Date(clientEvent.event.event_date).toLocaleDateString('pt-BR')
                              }
                            </span>
                            <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs capitalize">
                              {clientEvent.relationship_type}
                            </span>
                            <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs capitalize">
                              {clientEvent.event?.status}
                            </span>
                          </div>
                          {clientEvent.notes && (
                            <p className="text-sm text-gray-600 mt-2 italic">
                              Observações: {clientEvent.notes}
                            </p>
                          )}
                        </div>
                        <button
                          onClick={() => handleUnlinkEvent(clientEvent.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors ml-4"
                          title="Desvincular evento"
                        >
                          <Unlink className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Link Event Modal */}
      {showLinkEventModal && selectedClient && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">
                  Vincular Evento
                </h2>
                <button
                  onClick={() => setShowLinkEventModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Evento
                  </label>
                  <select
                    value={selectedEventId}
                    onChange={(e) => setSelectedEventId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="">Selecione um evento</option>
                    {events.map((event) => (
                      <option key={event.id} value={event.id}>
                        {event.title} - {new Date(event.event_date).toLocaleDateString('pt-BR')}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tipo de Relacionamento
                  </label>
                  <select
                    value={relationshipType}
                    onChange={(e) => setRelationshipType(e.target.value as any)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="participant">Participante</option>
                    <option value="organizer">Organizador</option>
                    <option value="vendor">Fornecedor</option>
                    <option value="guest">Convidado</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Observações (opcional)
                  </label>
                  <textarea
                    value={eventNotes}
                    onChange={(e) => setEventNotes(e.target.value)}
                    placeholder="Observações sobre a participação..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    rows={3}
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setShowLinkEventModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleLinkEvent}
                    disabled={!selectedEventId}
                    className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Vincular
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Modal */}
     
      
      <Suspense fallback={null}>
        <ConfirmModal
          isOpen={showConfirmModal}
          onClose={() => setShowConfirmModal(false)}
          onConfirm={handleConfirm}
          title={confirmTitle}
          message={confirmMessage}
          confirmText={confirmButtonText}
          cancelText="Cancelar"
          type={confirmType}
        />
      </Suspense>
    </div>
  );
};

export default AdminClients;