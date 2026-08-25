import React, { useState, useEffect, Suspense } from 'react';
import { Calendar, Plus, Search, Filter, Clock, Users, Eye, Edit, Trash2, Settings, BarChart3, Camera, QrCode, Bell, Tag, RotateCcw, X, Receipt, Ticket, MapPin, ArrowLeft, Globe, Link2, Copy } from 'lucide-react';
import { useSupabaseEvents } from '../../shared/hooks/hooks/useSupabaseEvents';
import { Event } from '../../shared/types/types/event';
import { toast } from 'sonner';
import Loading from '../ui/Loading';

// Lazy loading para componentes secundários
const EventForm = React.lazy(() => import('../forms/EventForm'));
const EventGallery = React.lazy(() => import('./EventGallery'));
const DigitalCheckIn = React.lazy(() => import('./DigitalCheckIn'));
const EventReports = React.lazy(() => import('./EventReports'));
const AdminEventTypes = React.lazy(() => import('../AdminEventTypes'));
const AdminEventOrders = React.lazy(() => import('./AdminEventOrders'));
const AdminEventCoupons = React.lazy(() => import('./AdminEventCoupons'));
const ConfirmModal = React.lazy(() => import('../shared/ConfirmModal'));

type ViewMode = 'list' | 'form' | 'gallery' | 'checkin' | 'reports' | 'event-types' | 'orders' | 'coupons';

const AdminEvents: React.FC = () => {
  console.log('🚀 AdminEvents component loaded');
  
  const {
    events,
    deletedEvents,
    loading,
    createEvent,
    updateEvent,
    deleteEvent,
    restoreEvent,
    permanentDeleteEvent,
    fetchEvents,
    fetchDeletedEvents
  } = useSupabaseEvents();

  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [activeTab, setActiveTab] = useState<'active' | 'trash'>('active');
  
  // Estados para modais de confirmação
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false);
  const [isPermanentDeleteModalOpen, setIsPermanentDeleteModalOpen] = useState(false);
  const [eventToDelete, setEventToDelete] = useState<string | null>(null);
  const [eventToRestore, setEventToRestore] = useState<string | null>(null);
  const [eventToPermanentDelete, setEventToPermanentDelete] = useState<string | null>(null);

  useEffect(() => {
    fetchEvents();
  }, []);





  useEffect(() => {
    if (activeTab === 'trash') {
      fetchDeletedEvents();
    }
  }, [activeTab]);

  const filteredEvents = events.filter(event => {
    const matchesSearch = event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         event.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         event.location?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || event.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const handleCreateEvent = async (eventData: Omit<Event, 'id' | 'created_at' | 'updated_at' | 'current_guests'>) => {
    try {
      await createEvent(eventData);
      toast.success('Evento criado com sucesso!');
      setViewMode('list');
      setSelectedEvent(null);
    } catch (error) {
      console.error('Erro ao criar evento:', error);
      toast.error('Erro ao criar evento');
    }
  };

  const handleUpdateEvent = async (eventData: Partial<Event>) => {
    if (!selectedEvent) return;
    
    try {
      await updateEvent(selectedEvent.id, eventData);
      toast.success('Evento atualizado com sucesso!');
      setViewMode('list');
      setSelectedEvent(null);
    } catch (error) {
      console.error('Erro ao atualizar evento:', error);
      toast.error('Erro ao atualizar evento');
    }
  };

  const handleDeleteEvent = (eventId: string) => {
    setEventToDelete(eventId);
    setIsDeleteModalOpen(true);
  };

  const confirmDeleteEvent = async () => {
    if (!eventToDelete) return;
    
    try {
      await deleteEvent(eventToDelete);
      toast.success('Evento movido para a lixeira!');
      if (activeTab === 'trash') {
        fetchDeletedEvents();
      }
    } catch (error) {
      console.error('Erro ao mover evento para lixeira:', error);
      toast.error('Erro ao mover evento para lixeira');
    } finally {
      setIsDeleteModalOpen(false);
      setEventToDelete(null);
    }
  };

  const cancelDeleteEvent = () => {
    setIsDeleteModalOpen(false);
    setEventToDelete(null);
  };

  const handleRestoreEvent = (eventId: string) => {
    setEventToRestore(eventId);
    setIsRestoreModalOpen(true);
  };

  const confirmRestoreEvent = async () => {
    if (!eventToRestore) return;
    
    try {
      await restoreEvent(eventToRestore);
      toast.success('Evento restaurado com sucesso!');
      fetchDeletedEvents();
    } catch (error) {
      console.error('Erro ao restaurar evento:', error);
      toast.error('Erro ao restaurar evento');
    } finally {
      setIsRestoreModalOpen(false);
      setEventToRestore(null);
    }
  };

  const cancelRestoreEvent = () => {
    setIsRestoreModalOpen(false);
    setEventToRestore(null);
  };

  const handlePermanentDeleteEvent = (eventId: string) => {
    setEventToPermanentDelete(eventId);
    setIsPermanentDeleteModalOpen(true);
  };

  const confirmPermanentDeleteEvent = async () => {
    if (!eventToPermanentDelete) return;
    
    try {
      await permanentDeleteEvent(eventToPermanentDelete);
      toast.success('Evento excluído permanentemente!');
      fetchDeletedEvents();
    } catch (error) {
      console.error('Erro ao excluir evento permanentemente:', error);
      toast.error('Erro ao excluir evento permanentemente');
    } finally {
      setIsPermanentDeleteModalOpen(false);
      setEventToPermanentDelete(null);
    }
  };

  const cancelPermanentDeleteEvent = () => {
    setIsPermanentDeleteModalOpen(false);
    setEventToPermanentDelete(null);
  };

  const getEventStats = () => {
    const activeEvents = events.filter(e => e.status === 'active').length;
    const upcomingEvents = events.filter(e => {
      const eventDate = new Date(e.event_date);
      const today = new Date();
      return eventDate > today && e.status === 'active';
    }).length;
    const totalEvents = events.length;
    
    return { activeEvents, upcomingEvents, totalEvents };
  };

  const stats = getEventStats();

  // Função para formatar data considerando UTC-3 (Brasil)
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    // Ajustar para UTC-3 (Brasil) - adicionar 3 horas para compensar o fuso
    const utcDate = new Date(date.getTime() + (date.getTimezoneOffset() * 60000));
    const brazilDate = new Date(utcDate.getTime() + (3 * 60 * 60 * 1000));
    
    return brazilDate.toLocaleDateString('pt-BR', {
      weekday: 'long',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'published': return 'bg-green-100 text-green-800';
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return 'Ativo';
      case 'published': return 'Publicado';
      case 'draft': return 'Rascunho';
      case 'cancelled': return 'Cancelado';
      case 'completed': return 'Finalizado';
      default: return status;
    }
  };

  if (viewMode === 'form') {
    return (
      <EventForm
        event={selectedEvent}
        onSave={selectedEvent ? handleUpdateEvent : handleCreateEvent}
        onCancel={() => {
          setViewMode('list');
          setSelectedEvent(null);
        }}
        loading={loading}
      />
    );
  }

  if (viewMode === 'gallery' && selectedEvent) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Galeria - {selectedEvent.title}</h2>
            <p className="text-gray-600">Gerencie fotos e mídia do evento</p>
          </div>
          <button
            onClick={() => setViewMode('list')}
            className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Voltar
          </button>
        </div>
        <EventGallery eventId={selectedEvent.id} isAdmin={true} />
      </div>
    );
  }

  if (viewMode === 'checkin' && selectedEvent) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-2xl border border-gray-100 shadow-xs">
          <div>
            <h2 className="text-lg sm:text-2xl font-bold text-gray-900 leading-tight">Check-in - {selectedEvent.title}</h2>
            <p className="text-xs sm:text-sm text-gray-500">Gerencie a entrada e validação dos participantes</p>
          </div>
          <button
            onClick={() => setViewMode('list')}
            className="self-start sm:self-auto bg-gray-800 hover:bg-black text-white px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-colors cursor-pointer shrink-0 shadow-xs"
          >
            ← Voltar
          </button>
        </div>
        <DigitalCheckIn eventId={selectedEvent.id} />
      </div>
    );
  }

  if (viewMode === 'orders' && selectedEvent) {
    return (
      <AdminEventOrders
        event={selectedEvent}
        onBack={() => {
          setViewMode('list');
          setSelectedEvent(null);
        }}
      />
    );
  }

  if (viewMode === 'reports' && selectedEvent) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-gray-100">
          <div>
            <button
              onClick={() => setViewMode('list')}
              className="inline-flex items-center text-xs font-semibold text-gray-500 hover:text-indigo-600 transition-colors mb-2 gap-1 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Voltar para Lista de Eventos</span>
            </button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/20 shrink-0">
                <BarChart3 className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 leading-tight">{selectedEvent.title}</h1>
                <p className="text-xs text-gray-500">Relatórios, métricas de vendas e engajamento do evento</p>
              </div>
            </div>
          </div>
          <button
            onClick={() => setViewMode('list')}
            className="w-full sm:w-auto px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Voltar aos Eventos</span>
          </button>
        </div>
        <EventReports eventId={selectedEvent.id} />
      </div>
    );
  }

  if (viewMode === 'event-types') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Gerenciar Tipos de Eventos</h2>
            <p className="text-gray-600">Configure os tipos de eventos disponíveis no sistema</p>
          </div>
          <button
            onClick={() => setViewMode('list')}
            className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Voltar
          </button>
        </div>
        <AdminEventTypes />
      </div>
    );
  }

  if (viewMode === 'coupons') {
    return (
      <AdminEventCoupons
        onBack={() => {
          setViewMode('list');
          setSelectedEvent(null);
        }}
        initialEventId={selectedEvent?.id}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-sm p-4 sm:p-6 border border-gray-100">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1 flex items-center gap-2">
              <Calendar className="h-6 w-6 sm:h-7 sm:w-7 text-blue-600 shrink-0" />
              <span>Gerenciamento de Eventos</span>
            </h1>
            <p className="text-xs sm:text-sm text-gray-600">
              Organize e gerencie todos os eventos da Better Now
            </p>
          </div>
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
            <button 
              onClick={() => {
                setSelectedEvent(null);
                setViewMode('coupons');
              }}
              className="flex-1 sm:flex-initial bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition-colors text-xs sm:text-sm font-semibold shadow-xs cursor-pointer"
            >
              <Ticket className="h-4 w-4 shrink-0" />
              <span>Cupons</span>
            </button>
            <button 
              onClick={() => setViewMode('event-types')}
              className="flex-1 sm:flex-initial bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition-colors text-xs sm:text-sm font-semibold shadow-xs cursor-pointer"
            >
              <Tag className="h-4 w-4 shrink-0" />
              <span>Tipos</span>
            </button>
            <button 
              onClick={() => {
                setSelectedEvent(null);
                setViewMode('form');
              }}
              className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white px-4 py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition-colors text-xs sm:text-sm font-bold shadow-xs cursor-pointer"
            >
              <Plus className="h-4 w-4 shrink-0" />
              <span>Novo Evento</span>
            </button>
          </div>
        </div>
      </div>

      {/* Quick Stats - Responsivo para Telas Pequenas */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4 md:gap-6">
        <div className="bg-white rounded-2xl shadow-xs p-3 sm:p-5 border border-gray-100 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
          <div className="p-2 sm:p-2.5 bg-green-100 text-green-700 rounded-xl w-fit">
            <Calendar className="h-5 w-5 sm:h-6 sm:w-6" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] sm:text-xs font-semibold text-gray-500 truncate">Ativos</p>
            <p className="text-lg sm:text-2xl font-extrabold text-gray-900 mt-0.5">{stats.activeEvents}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-xs p-3 sm:p-5 border border-gray-100 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
          <div className="p-2 sm:p-2.5 bg-blue-100 text-blue-700 rounded-xl w-fit">
            <Clock className="h-5 w-5 sm:h-6 sm:w-6" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] sm:text-xs font-semibold text-gray-500 truncate">Próximos</p>
            <p className="text-lg sm:text-2xl font-extrabold text-gray-900 mt-0.5">{stats.upcomingEvents}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-xs p-3 sm:p-5 border border-gray-100 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
          <div className="p-2 sm:p-2.5 bg-purple-100 text-purple-700 rounded-xl w-fit">
            <Calendar className="h-5 w-5 sm:h-6 sm:w-6" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] sm:text-xs font-semibold text-gray-500 truncate">Total</p>
            <p className="text-lg sm:text-2xl font-extrabold text-gray-900 mt-0.5">{stats.totalEvents}</p>
          </div>
        </div>
      </div>

      {/* Navegação das abas */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-6">
          <button
            onClick={() => setActiveTab('active')}
            className={`py-3 px-1 border-b-2 font-bold text-xs sm:text-sm cursor-pointer transition-colors ${
              activeTab === 'active'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Ativos ({events.length})
          </button>
          <button
            onClick={() => setActiveTab('trash')}
            className={`py-3 px-1 border-b-2 font-bold text-xs sm:text-sm cursor-pointer transition-colors ${
              activeTab === 'trash'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Lixeira ({deletedEvents.length})
          </button>
        </nav>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-2xl shadow-sm p-4 sm:p-5 border border-gray-100">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Buscar eventos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="flex-1 sm:flex-initial px-3.5 py-2.5 border border-gray-300 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white"
            >
              <option value="all">Todos os Status</option>
              <option value="published">Publicado</option>
              <option value="draft">Rascunho</option>
              <option value="cancelled">Cancelado</option>
            </select>
            <button 
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-1.5 px-3.5 py-2.5 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors text-xs sm:text-sm font-semibold text-gray-700"
            >
              <Filter className="h-4 w-4" />
              <span>Filtros</span>
            </button>
          </div>
        </div>
      </div>

      {/* Events List & Cards */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
            <p className="text-gray-500 mt-2 text-xs sm:text-sm font-medium">Carregando eventos...</p>
          </div>
        ) : activeTab === 'active' ? (
          // Lista de eventos ativos
          filteredEvents.length === 0 ? (
            <div className="p-8 sm:p-12 text-center">
              <Calendar className="h-14 w-14 text-gray-400 mx-auto mb-3" />
              <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-1">
                {searchTerm || statusFilter !== 'all' ? 'Nenhum evento encontrado' : 'Nenhum evento cadastrado'}
              </h3>
              <p className="text-xs sm:text-sm text-gray-500 mb-5 max-w-md mx-auto">
                {searchTerm || statusFilter !== 'all' 
                  ? 'Tente ajustar os filtros de busca para encontrar eventos.'
                  : 'Comece criando o primeiro evento. Você poderá gerenciar datas, participantes, locais e muito mais.'
                }
              </p>
              {!searchTerm && statusFilter === 'all' && (
                <button 
                  onClick={() => {
                    setSelectedEvent(null);
                    setViewMode('form');
                  }}
                  className="bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-xl flex items-center gap-2 mx-auto transition-colors text-xs sm:text-sm font-bold shadow-xs cursor-pointer"
                >
                  <Plus className="h-4 w-4" />
                  Criar Primeiro Evento
                </button>
              )}
            </div>
          ) : (
            <>
              {/* 1. VISUALIZAÇÃO EM CARDS PARA DISPOSITIVOS DE TELAS MENORES (MOBILE/TABLET) */}
              <div className="grid grid-cols-1 gap-4 p-4 lg:hidden">
                {filteredEvents.map((event) => (
                  <div
                    key={event.id}
                    className="bg-white border border-gray-200/90 rounded-2xl p-4 shadow-xs space-y-3.5 hover:border-indigo-300 transition-all"
                  >
                    {/* Topo do Card */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider bg-indigo-50 px-2 py-0.5 rounded-md inline-block">
                            {event.event_type || 'Geral'}
                          </span>
                          {event.is_public === false ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-purple-50 text-purple-700 px-2 py-0.5 rounded-md border border-purple-200">
                              <Link2 className="w-3 h-3" />
                              Apenas Link
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md border border-blue-200">
                              <Globe className="w-3 h-3" />
                              Público
                            </span>
                          )}
                        </div>
                        <h3 className="font-bold text-gray-900 text-base leading-snug break-words">
                          {event.title}
                        </h3>
                      </div>
                      <span className={`inline-flex px-2.5 py-1 text-[10px] font-bold uppercase rounded-full shrink-0 ${getStatusColor(event.status)}`}>
                        {getStatusText(event.status)}
                      </span>
                    </div>

                    {/* Detalhes do Evento */}
                    <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-3 rounded-xl border border-gray-100">
                      <div className="flex items-center gap-1.5 text-gray-700">
                        <Calendar className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        <span className="truncate">{formatDate(event.event_date)} {event.event_time ? `• ${event.event_time}` : ''}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-gray-700">
                        <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span className="truncate">{event.location || 'Local a definir'}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-gray-700 col-span-2">
                        <Users className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                        <span>Capacidade: <strong>{event.max_guests ? `${event.max_guests} convidados` : 'Ilimitado'}</strong></span>
                      </div>
                    </div>

                    {/* Ações Rápidas em Grid com Ícone e Rótulo */}
                    <div className="pt-2 border-t border-gray-100 grid grid-cols-4 gap-1.5 text-[11px] font-semibold text-center">
                      <button
                        type="button"
                        onClick={() => {
                          const link = `${window.location.origin}/eventos/${event.id}`;
                          navigator.clipboard.writeText(link);
                          toast.success('Link do evento copiado com sucesso!');
                        }}
                        className="flex flex-col items-center justify-center p-2 rounded-xl bg-purple-50 text-purple-700 hover:bg-purple-100 transition-colors"
                        title="Copiar Link do Evento"
                      >
                        <Link2 className="w-4 h-4 mb-1" />
                        <span>Link</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedEvent(event);
                          setViewMode('orders');
                        }}
                        className="flex flex-col items-center justify-center p-2 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors"
                      >
                        <Receipt className="w-4 h-4 mb-1" />
                        <span>Pedidos</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedEvent(event);
                          setViewMode('checkin');
                        }}
                        className="flex flex-col items-center justify-center p-2 rounded-xl bg-green-50 text-green-700 hover:bg-green-100 transition-colors"
                      >
                        <QrCode className="w-4 h-4 mb-1" />
                        <span>Portaria</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedEvent(event);
                          setViewMode('coupons');
                        }}
                        className="flex flex-col items-center justify-center p-2 rounded-xl bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors"
                      >
                        <Ticket className="w-4 h-4 mb-1" />
                        <span>Cupons</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedEvent(event);
                          setViewMode('reports');
                        }}
                        className="flex flex-col items-center justify-center p-2 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
                      >
                        <BarChart3 className="w-4 h-4 mb-1" />
                        <span>Relatórios</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedEvent(event);
                          setViewMode('gallery');
                        }}
                        className="flex flex-col items-center justify-center p-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
                      >
                        <Camera className="w-4 h-4 mb-1" />
                        <span>Galeria</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedEvent(event);
                          setViewMode('form');
                        }}
                        className="flex flex-col items-center justify-center p-2 rounded-xl bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors"
                      >
                        <Edit className="w-4 h-4 mb-1" />
                        <span>Editar</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteEvent(event.id)}
                        className="flex flex-col items-center justify-center p-2 rounded-xl bg-red-50 text-red-700 hover:bg-red-100 transition-colors"
                      >
                        <Trash2 className="w-4 h-4 mb-1" />
                        <span>Lixeira</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* 2. VISUALIZAÇÃO EM TABELA PARA TELAS MAIORES (DESKTOP) */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                        Evento
                      </th>
                      <th className="px-6 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                        Data
                      </th>
                      <th className="px-6 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                        Local
                      </th>
                      <th className="px-6 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                        Status & Visibilidade
                      </th>
                      <th className="px-6 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                        Participantes
                      </th>
                      <th className="px-6 py-3.5 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredEvents.map((event) => (
                      <tr key={event.id} className="hover:bg-gray-50/80 transition-colors">
                        <td className="px-6 py-4">
                          <div>
                            <div className="text-sm font-bold text-gray-900">
                              {event.title}
                            </div>
                            <div className="text-xs text-gray-500 mt-0.5">
                              {event.event_type}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {formatDate(event.event_date)}
                          {event.event_time && (
                            <div className="text-xs text-gray-500">
                              {event.event_time}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {event.location || '-'}
                        </td>
                        <td className="px-6 py-4 space-y-1">
                          <div>
                            <span className={`inline-flex px-2.5 py-1 text-xs font-bold rounded-full ${getStatusColor(event.status)}`}>
                              {getStatusText(event.status)}
                            </span>
                          </div>
                          <div>
                            {event.is_public === false ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full border border-purple-200" title="Apenas acessível via link direto">
                                <Link2 className="w-3 h-3" />
                                Apenas Link
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full border border-blue-200" title="Visível no site">
                                <Globe className="w-3 h-3" />
                                Público no Site
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          <div className="flex items-center gap-1.5">
                            <Users className="h-4 w-4 text-gray-400" />
                            <span>{event.max_guests || 'Ilimitado'}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => {
                                const link = `${window.location.origin}/eventos/${event.id}`;
                                navigator.clipboard.writeText(link);
                                toast.success('Link do evento copiado com sucesso!');
                              }}
                              className="text-purple-600 hover:text-purple-800 p-1.5 rounded-lg hover:bg-purple-50 transition-colors cursor-pointer"
                              title="Copiar Link do Evento"
                            >
                              <Link2 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => {
                                setSelectedEvent(event);
                                setViewMode('coupons');
                              }}
                              className="text-indigo-600 hover:text-indigo-800 p-1.5 rounded-lg hover:bg-indigo-50 transition-colors cursor-pointer"
                              title="Cupons de Desconto"
                            >
                              <Ticket className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => {
                                setSelectedEvent(event);
                                setViewMode('orders');
                              }}
                              className="text-emerald-600 hover:text-emerald-800 p-1.5 rounded-lg hover:bg-emerald-50 transition-colors cursor-pointer"
                              title="Ordens & Ingressos"
                            >
                              <Receipt className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => {
                                setSelectedEvent(event);
                                setViewMode('checkin');
                              }}
                              className="text-green-600 hover:text-green-800 p-1.5 rounded-lg hover:bg-green-50 transition-colors cursor-pointer"
                              title="Portaria & Check-in"
                            >
                              <QrCode className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => {
                                setSelectedEvent(event);
                                setViewMode('reports');
                              }}
                              className="text-blue-600 hover:text-blue-800 p-1.5 rounded-lg hover:bg-blue-50 transition-colors cursor-pointer"
                              title="Relatórios"
                            >
                              <BarChart3 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => {
                                setSelectedEvent(event);
                                setViewMode('gallery');
                              }}
                              className="text-purple-600 hover:text-purple-800 p-1.5 rounded-lg hover:bg-purple-50 transition-colors cursor-pointer"
                              title="Galeria"
                            >
                              <Camera className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => {
                                setSelectedEvent(event);
                                setViewMode('form');
                              }}
                              className="text-amber-600 hover:text-amber-800 p-1.5 rounded-lg hover:bg-amber-50 transition-colors cursor-pointer"
                              title="Editar"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteEvent(event.id)}
                              className="text-red-600 hover:text-red-800 p-1.5 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                              title="Mover para Lixeira"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )
        ) : (
          // Lista de eventos na lixeira
          deletedEvents.length === 0 ? (
            <div className="p-8 sm:p-12 text-center">
              <Trash2 className="h-14 w-14 text-gray-400 mx-auto mb-3" />
              <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-1">Lixeira vazia</h3>
              <p className="text-xs sm:text-sm text-gray-500 max-w-md mx-auto">
                Nenhum evento foi movido para a lixeira
              </p>
            </div>
          ) : (
            <>
              {/* Cards de Lixeira para Telas Pequenas */}
              <div className="grid grid-cols-1 gap-4 p-4 lg:hidden">
                {deletedEvents.map((event) => (
                  <div
                    key={event.id}
                    className="bg-white border border-red-100 rounded-2xl p-4 shadow-xs space-y-3 opacity-80"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-gray-900 text-sm">{event.title}</h4>
                        <p className="text-xs text-gray-500">{event.location}</p>
                      </div>
                      <span className="text-[10px] text-red-600 bg-red-50 px-2 py-0.5 rounded-md font-bold">
                        Na Lixeira
                      </span>
                    </div>

                    <div className="text-xs text-gray-600 flex justify-between">
                      <span>Excluído em: <strong>{event.deleted_at ? formatDate(event.deleted_at) : '-'}</strong></span>
                      <span>Data do evento: <strong>{formatDate(event.event_date)}</strong></span>
                    </div>

                    <div className="flex gap-2 pt-2 border-t border-gray-100">
                      <button
                        type="button"
                        onClick={() => handleRestoreEvent(event.id)}
                        className="flex-1 py-2 bg-green-50 text-green-700 hover:bg-green-100 rounded-xl text-xs font-bold flex items-center justify-center gap-1"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Restaurar
                      </button>
                      <button
                        type="button"
                        onClick={() => handlePermanentDeleteEvent(event.id)}
                        className="flex-1 py-2 bg-red-50 text-red-700 hover:bg-red-100 rounded-xl text-xs font-bold flex items-center justify-center gap-1"
                      >
                        <X className="w-3.5 h-3.5" />
                        Excluir Definitivo
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Tabela de Lixeira para Telas Grandes */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                        Evento
                      </th>
                      <th className="px-6 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                        Data de Exclusão
                      </th>
                      <th className="px-6 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                        Data do Evento
                      </th>
                      <th className="px-6 py-3.5 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {deletedEvents.map((event) => (
                      <tr key={event.id} className="hover:bg-gray-50 opacity-75">
                        <td className="px-6 py-4">
                          <div>
                            <div className="text-sm font-bold text-gray-900">
                              {event.title}
                            </div>
                            <div className="text-xs text-gray-500">
                              {event.location}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {event.deleted_at ? formatDate(event.deleted_at) : '-'}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {formatDate(event.event_date)}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleRestoreEvent(event.id)}
                              className="text-green-600 hover:text-green-800 p-1.5 rounded-lg hover:bg-green-50 transition-colors"
                              title="Restaurar evento"
                            >
                              <RotateCcw className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handlePermanentDeleteEvent(event.id)}
                              className="text-red-600 hover:text-red-800 p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                              title="Excluir permanentemente"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )
        )}
      </div>

      {/* Modais de Confirmação */}
      <Suspense fallback={null}>
        <ConfirmModal
          isOpen={isDeleteModalOpen}
          onClose={cancelDeleteEvent}
          onConfirm={confirmDeleteEvent}
          title="Mover para Lixeira"
          message="Tem certeza que deseja mover este evento para a lixeira? Você poderá restaurá-lo posteriormente."
          confirmText="Mover para Lixeira"
          cancelText="Cancelar"
          type="danger"
        />
      
        <ConfirmModal
          isOpen={isRestoreModalOpen}
          onClose={cancelRestoreEvent}
          onConfirm={confirmRestoreEvent}
          title="Restaurar Evento"
          message="Tem certeza que deseja restaurar este evento?"
          confirmText="Restaurar"
          cancelText="Cancelar"
          type="info"
        />
      
        <ConfirmModal
          isOpen={isPermanentDeleteModalOpen}
          onClose={cancelPermanentDeleteEvent}
          onConfirm={confirmPermanentDeleteEvent}
          title="Excluir Permanentemente"
          message="Tem certeza que deseja excluir este evento permanentemente? Esta ação não pode ser desfeita."
          confirmText="Excluir Permanentemente"
          cancelText="Cancelar"
          type="danger"
        />
      </Suspense>
    </div>
  );
};

export default AdminEvents;