import React, { useState, useEffect, Suspense } from 'react';
import { Calendar, Plus, Search, Filter, Clock, Users, Eye, Edit, Trash2, Settings, BarChart3, Camera, QrCode, Bell, Tag, RotateCcw, X } from 'lucide-react';
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
const ConfirmModal = React.lazy(() => import('../shared/ConfirmModal'));

type ViewMode = 'list' | 'form' | 'gallery' | 'checkin' | 'reports' | 'event-types';

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
      case 'published': return 'bg-green-100 text-green-800';
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
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
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Check-in - {selectedEvent.title}</h2>
            <p className="text-gray-600">Gerencie check-in dos participantes</p>
          </div>
          <button
            onClick={() => setViewMode('list')}
            className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Voltar
          </button>
        </div>
        <DigitalCheckIn eventId={selectedEvent.id} />
      </div>
    );
  }

  if (viewMode === 'reports' && selectedEvent) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Relatórios - {selectedEvent.title}</h2>
            <p className="text-gray-600">Análises e estatísticas do evento</p>
          </div>
          <button
            onClick={() => setViewMode('list')}
            className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Voltar
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6">
        <div className="flex flex-col gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2 flex items-center gap-2">
              <Calendar className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600" />
              Gerenciamento de Eventos
            </h1>
            <p className="text-sm sm:text-base text-gray-600">
              Organize e gerencie todos os eventos da Better Now
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <button 
              onClick={() => setViewMode('event-types')}
              className="bg-blue-600 hover:bg-blue-700 text-white px-3 sm:px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors text-sm"
            >
              <Tag className="h-4 w-4" />
              <span className="hidden sm:inline">Tipos de Eventos</span>
              <span className="sm:hidden">Tipos</span>
            </button>
            <button 
              onClick={() => {
                setSelectedEvent(null);
                setViewMode('form');
              }}
              className="bg-green-600 hover:bg-green-700 text-white px-3 sm:px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors text-sm"
            >
              <Plus className="h-4 w-4" />
              Novo Evento
            </button>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <Calendar className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Eventos Ativos</p>
              <p className="text-2xl font-bold text-gray-900">{stats.activeEvents}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Clock className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Próximos Eventos</p>
              <p className="text-2xl font-bold text-gray-900">{stats.upcomingEvents}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Calendar className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total de Eventos</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalEvents}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Navegação das abas */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('active')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'active'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Ativos ({events.length})
          </button>
          <button
            onClick={() => setActiveTab('trash')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'trash'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Lixeira ({deletedEvents.length})
          </button>
        </nav>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Buscar eventos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="all">Todos os Status</option>
              <option value="published">Publicado</option>
              <option value="draft">Rascunho</option>
              <option value="cancelled">Cancelado</option>
            </select>
            <button 
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Filter className="h-4 w-4" />
              Filtros
            </button>
          </div>
        </div>
      </div>

      {/* Events List */}
      <div className="bg-white rounded-lg shadow-sm">
        {loading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
            <p className="text-gray-500 mt-2">Carregando eventos...</p>
          </div>
        ) : activeTab === 'active' ? (
          // Lista de eventos ativos
          filteredEvents.length === 0 ? (
            <div className="p-12 text-center">
              <Calendar className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {searchTerm || statusFilter !== 'all' ? 'Nenhum evento encontrado' : 'Nenhum evento cadastrado'}
              </h3>
              <p className="text-gray-500 mb-6 max-w-md mx-auto">
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
                  className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg flex items-center gap-2 mx-auto transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  Criar Primeiro Evento
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Evento
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Data
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Local
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Participantes
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredEvents.map((event) => (
                    <tr key={event.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {event.title}
                          </div>
                          <div className="text-sm text-gray-500">
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
                        {event.location}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(event.status)}`}>
                          {getStatusText(event.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        <div className="flex items-center gap-1">
                          <Users className="h-4 w-4 text-gray-400" />
                          {event.max_guests || 'Ilimitado'}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              setSelectedEvent(event);
                              setViewMode('reports');
                            }}
                            className="text-blue-600 hover:text-blue-800 p-1 rounded transition-colors"
                            title="Relatórios"
                          >
                            <BarChart3 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedEvent(event);
                              setViewMode('gallery');
                            }}
                            className="text-purple-600 hover:text-purple-800 p-1 rounded transition-colors"
                            title="Galeria"
                          >
                            <Camera className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedEvent(event);
                              setViewMode('checkin');
                            }}
                            className="text-green-600 hover:text-green-800 p-1 rounded transition-colors"
                            title="Check-in"
                          >
                            <QrCode className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedEvent(event);
                              setViewMode('form');
                            }}
                            className="text-indigo-600 hover:text-indigo-800 p-1 rounded transition-colors"
                            title="Editar"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteEvent(event.id)}
                            className="text-red-600 hover:text-red-800 p-1 rounded transition-colors"
                            title="Excluir"
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
          )
        ) : (
          // Lista de eventos na lixeira
          deletedEvents.length === 0 ? (
            <div className="p-12 text-center">
              <Trash2 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Lixeira vazia</h3>
              <p className="text-gray-500 mb-6 max-w-md mx-auto">
                Nenhum evento foi movido para a lixeira
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Evento
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Data de Exclusão
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Data do Evento
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {deletedEvents.map((event) => (
                    <tr key={event.id} className="hover:bg-gray-50 opacity-75">
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {event.title}
                          </div>
                          <div className="text-sm text-gray-500">
                            {event.location}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {event.deleted_at ? formatDate(event.deleted_at) : '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {formatDate(event.event_date)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleRestoreEvent(event.id)}
                            className="text-green-600 hover:text-green-800 p-1 rounded transition-colors"
                            title="Restaurar evento"
                          >
                            <RotateCcw className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handlePermanentDeleteEvent(event.id)}
                            className="text-red-600 hover:text-red-800 p-1 rounded transition-colors"
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