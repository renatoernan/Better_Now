import React, { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import { Users, Plus, Search, Filter, Edit, Trash2, History, Download, Phone, Mail, MapPin, Calendar, X, Save, FileText, ChevronDown, Eye, Link, Unlink, RotateCcw, RefreshCw, AlertCircle, ArrowUpDown, ArrowUp, ArrowDown, Baby, User, UserPlus, UserPen, Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useSupabaseClients } from '../../shared/hooks/hooks/useSupabaseClients';
import { useSupabaseEvents } from '../../shared/hooks/hooks/useSupabaseEvents';
import { useClientInteractions } from '../../shared/hooks/hooks/useClientInteractions';
import { useLanguage } from '../../shared/contexts/contexts/LanguageContext';
import { clientFormDataSchema, type ClientFormData } from '../../shared/types/schemas/validationSchemas';
import { Client as BaseClient } from '../../shared/types/types/core';
import { ActivityLogger } from '../../shared/utils/utils/activityLogger';
import { formatBrazilDate } from '../../shared/utils/utils/eventUtils';
import { formatCPF } from '../../shared/utils/utils/cpfUtils';
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
  tipo?: string;
}

// Helper para identificar registro de criança
const isChild = (tipo?: string): boolean => {
  if (!tipo) return false;
  const t = tipo.toLowerCase().trim();
  return (
    t === 'crianca' ||
    t === 'criança' ||
    t === 'infantil' ||
    t === 'child' ||
    t === 'kids' ||
    t.includes('cria') ||
    t.includes('infan')
  );
};

// Helper para formatar endereço completo
const formatFullAddress = (client: Client): string => {
  const parts: string[] = [];

  // Logradouro e Número
  const street = client.logradouro || client.endereco || client.address || '';
  if (street) {
    if (client.numero) {
      parts.push(`${street}, ${client.numero}`);
    } else {
      parts.push(street);
    }
  }

  // Complemento
  if (client.complemento) {
    parts.push(client.complemento);
  }

  // Bairro
  if (client.bairro) {
    parts.push(client.bairro);
  }

  // Cidade e UF
  const city = client.cidade || client.city || '';
  const uf = client.uf || client.estado || client.state || '';
  if (city && uf) {
    parts.push(`${city}/${uf}`);
  } else if (city) {
    parts.push(city);
  } else if (uf) {
    parts.push(uf);
  }

  // CEP
  const cep = client.cep || client.zip_code;
  if (cep) {
    parts.push(`CEP: ${cep}`);
  }

  return parts.join(' - ');
};

// Valores do formulário em branco. O reset() sem argumentos voltaria aos
// valores do último cliente editado, pois reset(valores) os torna o novo padrão
const emptyClientForm: ClientFormData = {
  name: '',
  apelido: '',
  documento: '',
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
};

const inputClass = (hasError: boolean) =>
  `w-full px-3 py-2 text-sm text-slate-900 bg-white border rounded-lg placeholder:text-slate-400 transition focus:outline-none focus:ring-4 ${hasError
    ? 'border-red-400 focus:border-red-500 focus:ring-red-500/10'
    : 'border-slate-200 hover:border-slate-300 focus:border-blue-500 focus:ring-blue-500/10'
  }`;

const FormSection: React.FC<{
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  className?: string;
  children: React.ReactNode;
}> = ({ icon: Icon, title, description, className = '', children }) => (
  <section className={className}>
    <div className="flex items-center gap-2.5 mb-4">
      <span className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
        <Icon className="h-4 w-4" />
      </span>
      <div>
        <h3 className="text-sm font-semibold text-slate-900 leading-tight">{title}</h3>
        {description && <p className="text-xs text-slate-500">{description}</p>}
      </div>
    </div>
    {children}
  </section>
);

const FormField: React.FC<{
  label: string;
  htmlFor: string;
  required?: boolean;
  error?: string;
  className?: string;
  children: React.ReactNode;
}> = ({ label, htmlFor, required, error, className = '', children }) => (
  <div className={className}>
    <label htmlFor={htmlFor} className="block text-sm font-medium text-slate-700 mb-1.5">
      {label}
      {required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
    {children}
    {error && (
      <p className="flex items-center gap-1 mt-1.5 text-xs text-red-600">
        <AlertCircle className="h-3.5 w-3.5 shrink-0" />
        {error}
      </p>
    )}
  </div>
);

const AdminClients: React.FC = () => {
  const { clients, deletedClients, loading, createClient: addClient, updateClient, deleteClient, searchClients, restoreClient, permanentDeleteClient, fetchClients, fetchDeletedClients, fetchClientEvents, linkClientToEvent, unlinkClientFromEvent } = useSupabaseClients();
  const { interactions, getClientInteractions, addInteraction } = useClientInteractions();
  const { events, fetchEvents } = useSupabaseEvents();
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
  const [clientEvents, setClientEvents] = useState<any[]>([]);

  // Estados de ordenação da tabela
  type SortField = 'nome' | 'contato' | 'validated' | 'created_at';
  const [sortField, setSortField] = useState<SortField>('nome');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection(field === 'created_at' ? 'desc' : 'asc');
    }
  };

  const [filters, setFilters] = useState({
    dateFrom: '',
    dateTo: '',
    hasEmail: '',
    hasWhatsapp: '',
    personType: 'all', // 'all' | 'child' | 'adult'
    validated: 'all' // 'all' | 'validated' | 'unvalidated'
  });

  const clearFilters = () => {
    setFilters({
      dateFrom: '',
      dateTo: '',
      hasEmail: '',
      hasWhatsapp: '',
      personType: 'all',
      validated: 'all'
    });
    setSearchTerm('');
  };

  const hasActiveFilters = Boolean(
    searchTerm ||
    filters.dateFrom ||
    filters.dateTo ||
    filters.hasEmail ||
    filters.hasWhatsapp ||
    filters.personType !== 'all' ||
    filters.validated !== 'all'
  );

  const sortedClients = useMemo(() => {
    let list = activeTab === 'active' ? [...clients] : [...(deletedClients || [])];

    // Aplicar filtros
    list = list.filter((client) => {
      // Busca geral
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase().trim();
        const matchesSearch =
          (client.name || client.nome || '').toLowerCase().includes(searchLower) ||
          (client.apelido || '').toLowerCase().includes(searchLower) ||
          (client.whatsapp || client.telefone || '').includes(searchLower) ||
          (client.email || '').toLowerCase().includes(searchLower) ||
          (client.documento || client.cpf || '').includes(searchLower) ||
          (client.cidade || client.city || '').toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }

      // Data de cadastro (de)
      if (filters.dateFrom) {
        const itemDate = new Date(client.created_at || 0).toISOString().split('T')[0];
        if (itemDate < filters.dateFrom) return false;
      }

      // Data de cadastro (até)
      if (filters.dateTo) {
        const itemDate = new Date(client.created_at || 0).toISOString().split('T')[0];
        if (itemDate > filters.dateTo) return false;
      }

      // Tem email
      if (filters.hasEmail === 'true' && !client.email) return false;
      if (filters.hasEmail === 'false' && client.email) return false;

      // Tem WhatsApp
      if (filters.hasWhatsapp === 'true' && !client.whatsapp && !client.phone) return false;
      if (filters.hasWhatsapp === 'false' && (client.whatsapp || client.phone)) return false;

      // Filtro: Crianças / Adultos / Todos
      if (filters.personType === 'child' && !isChild(client.tipo)) return false;
      if (filters.personType === 'adult' && isChild(client.tipo)) return false;

      // Filtro: Válidos / Não Validados / Todos
      if (filters.validated === 'validated' && !client.validated) return false;
      if (filters.validated === 'unvalidated' && client.validated) return false;

      return true;
    });

    return list.sort((a, b) => {
      let comparison = 0;

      if (sortField === 'nome') {
        const nameA = (a.name || a.nome || '').trim().toLowerCase();
        const nameB = (b.name || b.nome || '').trim().toLowerCase();
        comparison = nameA.localeCompare(nameB, 'pt-BR', { sensitivity: 'base' });
      } else if (sortField === 'contato') {
        const contactA = (a.whatsapp || a.telefone || a.email || '').trim().toLowerCase();
        const contactB = (b.whatsapp || b.telefone || b.email || '').trim().toLowerCase();
        comparison = contactA.localeCompare(contactB, 'pt-BR', { sensitivity: 'base' });
      } else if (sortField === 'validated') {
        const valA = a.validated ? 1 : 0;
        const valB = b.validated ? 1 : 0;
        comparison = valA - valB;
      } else if (sortField === 'created_at') {
        const dateA = new Date(activeTab === 'trash' && a.deleted_at ? a.deleted_at : (a.created_at || 0)).getTime();
        const dateB = new Date(activeTab === 'trash' && b.deleted_at ? b.deleted_at : (b.created_at || 0)).getTime();
        comparison = dateA - dateB;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [clients, deletedClients, activeTab, sortField, sortDirection, searchTerm, filters]);

  // Estados para o modal de confirmação
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState<() => void>(() => { });
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
    formState: { errors, isSubmitting },
    setValue,
    reset
  } = useForm<ClientFormData>({
    resolver: zodResolver(clientFormDataSchema) as any,
    defaultValues: emptyClientForm
  });

  const documentoField = register('documento');
  const cepField = register('cep');

  const [loadingCep, setLoadingCep] = useState(false);

  // Função para buscar dados do CEP via ViaCEP
  const fetchAddressByCep = useCallback(async (cep: string) => {
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
  }, [setValue]);

  // Função para carregar clientes excluídos
  const loadTrashClients = useCallback(async () => {
    try {
      await fetchDeletedClients();
    } catch (error) {
      console.error('Erro ao carregar clientes excluídos:', error);
    }
  }, [fetchDeletedClients]);

  // Carregar clientes ativos e da lixeira na montagem inicial
  useEffect(() => {
    fetchClients();
    fetchDeletedClients();
  }, [fetchClients, fetchDeletedClients]);

  useEffect(() => {
    if (activeTab === 'trash') {
      loadTrashClients();
    }
  }, [activeTab, loadTrashClients]);

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
        await addClient({ ...data, is_active: true } as any);
      }

      setShowModal(false);
      setEditingClient(null);
      reset(emptyClientForm);
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
      documento: formatCPF(client.documento || client.cpf || ''),
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

  const handleShowHistory = async (client: Client) => {
    setSelectedClient(client);
    await getClientInteractions(client.id);
    setShowHistoryModal(true);
  };

  const handleAddInteraction = async () => {
    if (!selectedClient || !newInteraction.trim()) return;

    try {
      await addInteraction(selectedClient.id, {
        type: 'note',
        description: newInteraction,
        interaction_date: new Date().toISOString()
      });
      setNewInteraction('');
    } catch (error) {
      toast.error('Erro ao adicionar interação');
    }
  };

  const handleShowEvents = async (client: Client) => {
    setSelectedClient(client);
    setShowEventsModal(true);
    const events = await fetchClientEvents(client.id);
    setClientEvents(events);
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
      const events = await fetchClientEvents(selectedClient.id);
      setClientEvents(events);
    } catch (error) {
      console.error('Error linking client to event:', error);
    }
  };

  const handleUnlinkEvent = async (clientEventId: string) => {
    try {
      await unlinkClientFromEvent(clientEventId);
      if (selectedClient) {
        const events = await fetchClientEvents(selectedClient.id);
        setClientEvents(events);
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
              (client.whatsapp && client.whatsapp.includes(searchTerm)) ||
              (client.email && client.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
              (client.apelido && client.apelido.toLowerCase().includes(searchTerm.toLowerCase()));

            const filters: any = {}; // Omitindo filtros de data por agora ou tratando como any
            const matchesDateFrom = true;
            const matchesDateTo = true;
            const matchesEmail = true;
            const matchesWhatsapp = true;

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
    reset(emptyClientForm);
    setShowModal(true);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const filters: any = {
        dateFrom: '',
        dateTo: '',
        hasEmail: 'all',
        hasWhatsapp: 'all'
      };

      // Recarregar clientes ativos e da lixeira
      await Promise.all([
        searchClients(searchTerm, filters),
        fetchDeletedClients()
      ]);

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
            className={`flex items-center gap-2 px-4 py-2 border rounded-lg transition-colors font-medium text-sm ${showFilters || hasActiveFilters
              ? 'bg-blue-50 border-blue-300 text-blue-700 shadow-xs'
              : 'border-gray-300 hover:bg-gray-50 text-gray-700'
              }`}
          >
            <Filter className="h-4 w-4" />
            <span>Filtros</span>
            {hasActiveFilters && (
              <span className="w-2 h-2 rounded-full bg-blue-600"></span>
            )}
          </button>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 hover:bg-gray-100 text-gray-600 rounded-lg text-sm transition-colors"
              title="Limpar todos os filtros"
            >
              <X className="h-4 w-4" />
              <span>Limpar</span>
            </button>
          )}
        </div>

        {/* Advanced Filters */}
        {showFilters && (
          <div className="mt-4 p-4 bg-gray-50/80 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-200">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Filtrar Clientes</span>
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="text-xs text-blue-600 hover:text-blue-800 font-medium hover:underline flex items-center gap-1"
                >
                  <X className="h-3 w-3" />
                  Limpar filtros
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Tipo de Cadastro</label>
                <select
                  value={filters.personType}
                  onChange={(e) => setFilters({ ...filters, personType: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white"
                >
                  <option value="all">Todos</option>
                  <option value="child">👶 Crianças</option>
                  <option value="adult">👤 Adultos</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Status de Validação</label>
                <select
                  value={filters.validated}
                  onChange={(e) => setFilters({ ...filters, validated: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white"
                >
                  <option value="all">Todos</option>
                  <option value="validated">✅ Validados</option>
                  <option value="unvalidated">⏳ Não Validados</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Data de cadastro (de)</label>
                <input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Data de cadastro (até)</label>
                <input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Tem email</label>
                <select
                  value={filters.hasEmail}
                  onChange={(e) => setFilters({ ...filters, hasEmail: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white"
                >
                  <option value="">Todos</option>
                  <option value="true">Sim</option>
                  <option value="false">Não</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Tem WhatsApp</label>
                <select
                  value={filters.hasWhatsapp}
                  onChange={(e) => setFilters({ ...filters, hasWhatsapp: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white"
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
              className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'active'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
            >
              {translations.activeClients} ({activeTab === 'active' ? sortedClients.length : clients.length}{hasActiveFilters && activeTab === 'active' && sortedClients.length !== clients.length ? ` de ${clients.length}` : ''})
            </button>
            <button
              onClick={() => setActiveTab('trash')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'trash'
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
                  <th
                    onClick={() => handleSort('nome')}
                    className="px-6 py-3.5 text-left text-xs font-bold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100 hover:text-blue-600 transition-colors select-none group"
                    title="Clique para ordenar por Nome"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>{translations.clientName}</span>
                      {sortField === 'nome' ? (
                        sortDirection === 'asc' ? (
                          <ArrowUp className="w-3.5 h-3.5 text-blue-600 font-bold" />
                        ) : (
                          <ArrowDown className="w-3.5 h-3.5 text-blue-600 font-bold" />
                        )
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                      )}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('contato')}
                    className="px-6 py-3.5 text-left text-xs font-bold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100 hover:text-blue-600 transition-colors select-none group"
                    title="Clique para ordenar por Contato"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>{translations.contact}</span>
                      {sortField === 'contato' ? (
                        sortDirection === 'asc' ? (
                          <ArrowUp className="w-3.5 h-3.5 text-blue-600 font-bold" />
                        ) : (
                          <ArrowDown className="w-3.5 h-3.5 text-blue-600 font-bold" />
                        )
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                      )}
                    </div>
                  </th>
                  {activeTab === 'active' && (
                    <th
                      onClick={() => handleSort('validated')}
                      className="px-6 py-3.5 text-center text-xs font-bold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100 hover:text-blue-600 transition-colors select-none group"
                      title="Clique para ordenar por Status de Validação"
                    >
                      <div className="flex items-center justify-center gap-1.5">
                        <span>Validado</span>
                        {sortField === 'validated' ? (
                          sortDirection === 'asc' ? (
                            <ArrowUp className="w-3.5 h-3.5 text-blue-600 font-bold" />
                          ) : (
                            <ArrowDown className="w-3.5 h-3.5 text-blue-600 font-bold" />
                          )
                        ) : (
                          <ArrowUpDown className="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                        )}
                      </div>
                    </th>
                  )}
                  <th
                    onClick={() => handleSort('created_at')}
                    className="px-6 py-3.5 text-left text-xs font-bold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100 hover:text-blue-600 transition-colors select-none group"
                    title="Clique para ordenar por Data"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>{activeTab === 'trash' ? translations.deletedAt : translations.createdAt}</span>
                      {sortField === 'created_at' ? (
                        sortDirection === 'asc' ? (
                          <ArrowUp className="w-3.5 h-3.5 text-blue-600 font-bold" />
                        ) : (
                          <ArrowDown className="w-3.5 h-3.5 text-blue-600 font-bold" />
                        )
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                      )}
                    </div>
                  </th>
                  <th className="px-6 py-3.5 text-right text-xs font-bold text-gray-600 uppercase tracking-wider">
                    {translations.actions}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sortedClients.map((client) => (
                  <tr key={client.id} className={`hover:bg-gray-50/80 transition-colors ${activeTab === 'trash' ? 'opacity-75' : ''}`}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900 flex items-center gap-2 flex-wrap">
                          <span className="font-semibold">{client.name || client.nome}</span>
                          {client.apelido ? (
                            <span className="text-gray-500 font-normal text-xs">
                              ({client.apelido})
                            </span>
                          ) : null}
                          {isChild(client.tipo) ? (
                            <span
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 shadow-xs"
                              title="Criança / Infantil"
                            >
                              <Baby className="w-3.5 h-3.5 text-amber-600" />
                              <span>Criança</span>
                            </span>
                          ) : (
                            <span
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200"
                              title="Adulto"
                            >
                              <User className="w-3.5 h-3.5 text-blue-600" />
                              <span>Adulto</span>
                            </span>
                          )}
                        </div>
                        {client.notes && (
                          <div className="text-xs text-gray-500 truncate max-w-xs mt-0.5">{client.notes}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1.5 max-w-sm">
                        {client.whatsapp && (
                          <div className="flex items-center text-sm text-gray-900 font-medium">
                            <span className="text-green-500 mr-2 shrink-0">📱</span>
                            <span>{client.whatsapp}</span>
                          </div>
                        )}
                        {client.email && (
                          <div className="flex items-center text-sm text-gray-600">
                            <Mail className="h-4 w-4 mr-2 text-gray-400 shrink-0" />
                            <span className="truncate">{client.email}</span>
                          </div>
                        )}
                        {(() => {
                          const fullAddress = formatFullAddress(client);
                          if (!fullAddress) return null;
                          return (
                            <div className="flex items-start text-xs text-gray-600 leading-snug" title={fullAddress}>
                              <MapPin className="h-3.5 w-3.5 mr-1.5 text-gray-400 shrink-0 mt-0.5" />
                              <span className="break-words">{fullAddress}</span>
                            </div>
                          );
                        })()}
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
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 z-50 animate-fadeIn">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="client-modal-title"
            className="bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-xl lg:max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-scaleIn"
          >
            {/* Cabeçalho */}
            <div className="flex items-center gap-3 sm:gap-4 px-5 sm:px-7 py-4 sm:py-5 bg-gradient-to-r from-blue-50 via-indigo-50/40 to-white border-b border-slate-100 flex-shrink-0">
              <div className="hidden sm:flex w-11 h-11 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white items-center justify-center shadow-md shadow-blue-600/20 shrink-0">
                {editingClient ? <UserPen className="h-5 w-5" /> : <UserPlus className="h-5 w-5" />}
              </div>
              <div className="min-w-0 flex-1">
                <h2 id="client-modal-title" className="text-lg font-semibold text-slate-900 leading-tight">
                  {editingClient ? 'Editar Cliente' : 'Novo Cliente'}
                </h2>
                <p className="hidden sm:block text-sm text-slate-500 truncate">
                  {editingClient
                    ? `Atualize os dados de ${editingClient.name}`
                    : 'Preencha os dados para cadastrar um novo cliente'}
                </p>
              </div>
              <label
                title="Indica se o cliente foi validado no sistema"
                className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-white border border-slate-200 shadow-sm cursor-pointer select-none shrink-0 hover:border-slate-300 transition-colors"
              >
                <input type="checkbox" {...register('validated')} className="sr-only peer" />
                <span className="relative w-9 h-5 rounded-full bg-slate-200 transition-colors peer-checked:bg-blue-600 peer-focus-visible:ring-4 peer-focus-visible:ring-blue-500/20 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:h-4 after:w-4 after:rounded-full after:bg-white after:shadow after:transition-transform peer-checked:after:translate-x-4" />
                <span className="text-sm font-medium text-slate-700">Validado</span>
              </label>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                aria-label="Fechar"
                className="p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-white transition-colors shrink-0"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Conteúdo (rola apenas em telas baixas) */}
            <form
              id="client-form"
              onSubmit={handleSubmit(onSubmit)}
              className="flex-1 overflow-y-auto px-5 sm:px-7 py-5 sm:py-6"
            >
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-6">
                <FormSection icon={User} title="Dados pessoais">
                  <div className="grid grid-cols-2 gap-x-3 gap-y-4">
                    <FormField label="Nome" htmlFor="client-name" required error={errors.name?.message} className="col-span-2">
                      <input
                        id="client-name"
                        type="text"
                        autoFocus
                        {...register('name')}
                        className={inputClass(!!errors.name)}
                        placeholder="Nome completo do cliente"
                      />
                    </FormField>

                    <FormField label="Apelido" htmlFor="client-apelido" error={errors.apelido?.message} className="col-span-2 sm:col-span-1">
                      <input
                        id="client-apelido"
                        type="text"
                        {...register('apelido')}
                        className={inputClass(!!errors.apelido)}
                        placeholder="Como prefere ser chamado"
                      />
                    </FormField>

                    <FormField label="CPF" htmlFor="client-documento" error={errors.documento?.message} className="col-span-2 sm:col-span-1">
                      <input
                        id="client-documento"
                        type="text"
                        inputMode="numeric"
                        {...documentoField}
                        onChange={(e) => {
                          e.target.value = formatCPF(e.target.value);
                          documentoField.onChange(e);
                        }}
                        className={inputClass(!!errors.documento)}
                        placeholder="000.000.000-00"
                        maxLength={14}
                      />
                    </FormField>

                    <FormField label="WhatsApp" htmlFor="client-whatsapp" error={errors.whatsapp?.message} className="col-span-2">
                      <PhoneInput
                        id="client-whatsapp"
                        value={whatsappValue}
                        onChange={(value) => {
                          setWhatsappValue(value);
                          setValue('whatsapp', value);
                        }}
                        placeholder="(11) 99999-9999"
                        error={!!errors.whatsapp}
                        disabled={loading}
                        className="w-full"
                      />
                    </FormField>

                    <FormField label="Email" htmlFor="client-email" error={errors.email?.message} className="col-span-2">
                      <input
                        id="client-email"
                        type="email"
                        {...register('email')}
                        className={inputClass(!!errors.email)}
                        placeholder="cliente@email.com"
                      />
                    </FormField>
                  </div>
                </FormSection>

                <FormSection
                  icon={MapPin}
                  title="Endereço"
                  description="Informe o CEP para preencher automaticamente"
                  className="lg:border-l lg:border-slate-100 lg:pl-8"
                >
                  <div className="grid grid-cols-6 gap-x-3 gap-y-4">
                    <FormField label="CEP" htmlFor="client-cep" error={errors.cep?.message} className="col-span-6 sm:col-span-2">
                      <div className="relative">
                        <input
                          id="client-cep"
                          type="text"
                          inputMode="numeric"
                          {...cepField}
                          onChange={(e) => {
                            e.target.value = e.target.value.replace(/\D/g, '').slice(0, 8);
                            cepField.onChange(e);
                            if (e.target.value.length === 8) fetchAddressByCep(e.target.value);
                          }}
                          className={`${inputClass(!!errors.cep)} pr-9`}
                          placeholder="00000-000"
                        />
                        {loadingCep && (
                          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-blue-600" />
                        )}
                      </div>
                    </FormField>

                    <FormField label="Logradouro" htmlFor="client-logradouro" error={errors.logradouro?.message} className="col-span-6 sm:col-span-4">
                      <input
                        id="client-logradouro"
                        type="text"
                        {...register('logradouro')}
                        className={inputClass(!!errors.logradouro)}
                        placeholder="Rua, Avenida, etc."
                      />
                    </FormField>

                    <FormField label="Número" htmlFor="client-numero" error={errors.numero?.message} className="col-span-2">
                      <input
                        id="client-numero"
                        type="text"
                        {...register('numero')}
                        className={inputClass(!!errors.numero)}
                        placeholder="Nº"
                      />
                    </FormField>

                    <FormField label="Complemento" htmlFor="client-complemento" error={errors.complemento?.message} className="col-span-4">
                      <input
                        id="client-complemento"
                        type="text"
                        {...register('complemento')}
                        className={inputClass(!!errors.complemento)}
                        placeholder="Apartamento, casa, etc."
                      />
                    </FormField>

                    <FormField label="Bairro" htmlFor="client-bairro" error={errors.bairro?.message} className="col-span-6">
                      <input
                        id="client-bairro"
                        type="text"
                        {...register('bairro')}
                        className={inputClass(!!errors.bairro)}
                        placeholder="Nome do bairro"
                      />
                    </FormField>

                    <FormField label="Cidade" htmlFor="client-cidade" error={errors.cidade?.message} className="col-span-4">
                      <input
                        id="client-cidade"
                        type="text"
                        {...register('cidade')}
                        className={inputClass(!!errors.cidade)}
                        placeholder="Nome da cidade"
                      />
                    </FormField>

                    <FormField label="UF" htmlFor="client-uf" error={errors.uf?.message} className="col-span-2">
                      <select
                        id="client-uf"
                        {...register('uf')}
                        className={inputClass(!!errors.uf)}
                      >
                        <option value="">UF</option>
                        {brasilUFs.map(uf => (
                          <option key={uf} value={uf}>{uf}</option>
                        ))}
                      </select>
                    </FormField>
                  </div>
                </FormSection>

                <FormField
                  label="Observações"
                  htmlFor="client-notes"
                  error={errors.notes?.message}
                  className="lg:col-span-2 pt-5 border-t border-slate-100"
                >
                  <textarea
                    id="client-notes"
                    {...register('notes')}
                    rows={2}
                    className={`${inputClass(!!errors.notes)} resize-none`}
                    placeholder="Informações adicionais sobre o cliente"
                  />
                </FormField>
              </div>
            </form>

            {/* Rodapé */}
            <div className="flex items-center justify-between gap-3 px-5 sm:px-7 py-4 border-t border-slate-100 bg-slate-50/70 flex-shrink-0">
              <p className="hidden sm:block text-xs text-slate-400">
                <span className="text-red-500">*</span> Campo obrigatório
              </p>
              <div className="flex gap-3 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  disabled={isSubmitting}
                  className="flex-1 sm:flex-none px-5 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:border-slate-300 transition-colors disabled:opacity-60"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  form="client-form"
                  disabled={isSubmitting}
                  className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold text-white rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 shadow-md shadow-blue-600/20 hover:from-blue-700 hover:to-indigo-700 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {isSubmitting ? 'Salvando...' : editingClient ? 'Salvar alterações' : 'Cadastrar cliente'}
                </button>
              </div>
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
                          {new Date(interaction.created_at).toLocaleString('pt-BR')}
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
                                formatBrazilDate(clientEvent.event.event_date)
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
                        {event.title} - {formatBrazilDate(event.event_date)}
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