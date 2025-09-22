import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, Eye, EyeOff, Calendar, RotateCcw, X } from 'lucide-react';
import { useSupabaseEventTypes } from '../hooks/useSupabaseEventTypes';
import { EventType, EventTypeFormData } from '../types';
import { toast } from 'sonner';

interface EventTypeModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventType?: EventType | null;
  onSave: (data: EventTypeFormData) => Promise<void>;
}

const EventTypeModal: React.FC<EventTypeModalProps> = ({ isOpen, onClose, eventType, onSave }) => {
  const [formData, setFormData] = useState<EventTypeFormData>({
    name: '',
    description: '',
    color: '#3B82F6',
    icon: 'Calendar',
    active: true
  });
  const [loading, setLoading] = useState(false);

  const iconOptions = [
    { value: 'Calendar', label: 'Calendário' },
    { value: 'Users', label: 'Usuários' },
    { value: 'PartyPopper', label: 'Festa' },
    { value: 'Trophy', label: 'Troféu' },
    { value: 'Building', label: 'Prédio' },
    { value: 'Palette', label: 'Paleta' },
    { value: 'GraduationCap', label: 'Formatura' },
    { value: 'Music', label: 'Música' },
    { value: 'Camera', label: 'Câmera' },
    { value: 'Heart', label: 'Coração' }
  ];

  useEffect(() => {
    if (eventType) {
      setFormData({
        name: eventType.name,
        description: eventType.description || '',
        color: eventType.color,
        icon: eventType.icon,
        active: eventType.active
      });
    } else {
      setFormData({
        name: '',
        description: '',
        color: '#3B82F6',
        icon: 'Calendar',
        active: true
      });
    }
  }, [eventType, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Nome é obrigatório');
      return;
    }

    setLoading(true);
    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      console.error('Erro ao salvar tipo de evento:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">
          {eventType ? 'Editar Tipo de Evento' : 'Novo Tipo de Evento'}
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Nome *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Nome do tipo de evento"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Descrição</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Descrição do tipo de evento"
              rows={3}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Cor</label>
            <div className="flex items-center space-x-2">
              <input
                type="color"
                value={formData.color}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                className="w-12 h-10 border rounded-md cursor-pointer"
              />
              <input
                type="text"
                value={formData.color}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                className="flex-1 p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="#3B82F6"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Ícone</label>
            <select
              value={formData.icon}
              onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
              className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {iconOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="active"
              checked={formData.active}
              onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
              className="mr-2"
            />
            <label htmlFor="active" className="text-sm font-medium">
              Ativo
            </label>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              disabled={loading}
            >
              {loading ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  eventTypeName: string;
}

const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({ isOpen, onClose, onConfirm, eventTypeName }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4 text-red-600">Confirmar Exclusão</h2>
        <p className="mb-6">
          Tem certeza que deseja excluir o tipo de evento <strong>{eventTypeName}</strong>?
          Esta ação poderá ser desfeita.
        </p>
        <div className="flex justify-end space-x-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
          >
            Excluir
          </button>
        </div>
      </div>
    </div>
  );
};

const AdminEventTypes: React.FC = () => {
  const {
    eventTypes,
    loading,
    fetchEventTypes,
    createEventType,
    updateEventType,
    deleteEventType,
    toggleEventTypeStatus,
    fetchDeletedEventTypes,
    restoreEventType,
    permanentDeleteEventType
  } = useSupabaseEventTypes();

  const [searchTerm, setSearchTerm] = useState('');
  const [showActiveOnly, setShowActiveOnly] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEventType, setSelectedEventType] = useState<EventType | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [eventTypeToDelete, setEventTypeToDelete] = useState<EventType | null>(null);
  const [activeTab, setActiveTab] = useState<'active' | 'trash'>('active');
  const [deletedEventTypes, setDeletedEventTypes] = useState<EventType[]>([]);
  const [loadingDeleted, setLoadingDeleted] = useState(false);
  const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false);
  const [isPermanentDeleteModalOpen, setIsPermanentDeleteModalOpen] = useState(false);
  const [eventTypeToRestore, setEventTypeToRestore] = useState<EventType | null>(null);
  const [eventTypeToPermanentDelete, setEventTypeToPermanentDelete] = useState<EventType | null>(null);

  useEffect(() => {
    fetchEventTypes();
  }, []);

  useEffect(() => {
    if (activeTab === 'trash') {
      loadDeletedEventTypes();
    }
  }, [activeTab]);

  const loadDeletedEventTypes = async () => {
    setLoadingDeleted(true);
    try {
      const deleted = await fetchDeletedEventTypes();
      setDeletedEventTypes(deleted);
    } catch (error) {
      console.error('Erro ao carregar tipos excluídos:', error);
    } finally {
      setLoadingDeleted(false);
    }
  };

  const filteredEventTypes = eventTypes.filter(eventType => {
    const matchesSearch = eventType.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (eventType.description && eventType.description.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesActive = !showActiveOnly || eventType.active;
    return matchesSearch && matchesActive;
  });

  const handleCreateEventType = () => {
    setSelectedEventType(null);
    setIsModalOpen(true);
  };

  const handleEditEventType = (eventType: EventType) => {
    setSelectedEventType(eventType);
    setIsModalOpen(true);
  };

  const handleSaveEventType = async (data: EventTypeFormData) => {
    if (selectedEventType) {
      await updateEventType(selectedEventType.id, data);
    } else {
      await createEventType(data);
    }
  };

  const handleDeleteClick = (eventType: EventType) => {
    setEventTypeToDelete(eventType);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (eventTypeToDelete) {
      await deleteEventType(eventTypeToDelete.id);
      setIsDeleteModalOpen(false);
      setEventTypeToDelete(null);
    }
  };

  const handleToggleStatus = async (eventType: EventType) => {
    await toggleEventTypeStatus(eventType.id, !eventType.active);
  };

  const handleRestoreClick = (eventType: EventType) => {
    setEventTypeToRestore(eventType);
    setIsRestoreModalOpen(true);
  };

  const handleConfirmRestore = async () => {
    if (eventTypeToRestore) {
      await restoreEventType(eventTypeToRestore.id);
      setIsRestoreModalOpen(false);
      setEventTypeToRestore(null);
      loadDeletedEventTypes();
    }
  };

  const handlePermanentDeleteClick = (eventType: EventType) => {
    setEventTypeToPermanentDelete(eventType);
    setIsPermanentDeleteModalOpen(true);
  };

  const handleConfirmPermanentDelete = async () => {
    if (eventTypeToPermanentDelete) {
      await permanentDeleteEventType(eventTypeToPermanentDelete.id);
      setIsPermanentDeleteModalOpen(false);
      setEventTypeToPermanentDelete(null);
      loadDeletedEventTypes();
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Tipos de Eventos</h1>
        <button
          onClick={handleCreateEventType}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center space-x-2"
        >
          <Plus size={20} />
          <span>Novo Tipo</span>
        </button>
      </div>

      {/* Abas */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('active')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'active'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Tipos Ativos ({eventTypes.length})
            </button>
            <button
              onClick={() => setActiveTab('trash')}
              className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                activeTab === 'trash'
                  ? 'border-red-500 text-red-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Trash2 size={16} />
              <span>Lixeira ({deletedEventTypes.length})</span>
            </button>
          </nav>
        </div>
      </div>

      {/* Filtros - apenas para aba ativa */}
      {activeTab === 'active' && (
        <div className="bg-white p-4 rounded-lg shadow-sm mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Buscar tipos de eventos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                id="activeOnly"
                checked={showActiveOnly}
                onChange={(e) => setShowActiveOnly(e.target.checked)}
                className="mr-2"
              />
              <label htmlFor="activeOnly" className="text-sm font-medium">
                Apenas ativos
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Lista de tipos de eventos */}
      <div className="bg-white rounded-lg shadow-sm">
        {activeTab === 'active' ? (
          // Conteúdo da aba ativa
          loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Carregando tipos de eventos...</p>
            </div>
          ) : filteredEventTypes.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <Calendar size={48} className="mx-auto mb-4 text-gray-300" />
              <p>Nenhum tipo de evento encontrado</p>
              {searchTerm && (
                <p className="text-sm mt-2">Tente ajustar os filtros de busca</p>
              )}
            </div>
          ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tipo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Descrição
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredEventTypes.map((eventType) => (
                  <tr key={eventType.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div
                          className="w-4 h-4 rounded-full mr-3"
                          style={{ backgroundColor: eventType.color }}
                        ></div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {eventType.name}
                          </div>
                          <div className="text-sm text-gray-500">
                            Ícone: {eventType.icon}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        {eventType.description || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          eventType.active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {eventType.active ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleToggleStatus(eventType)}
                          className={`p-1 rounded hover:bg-gray-100 ${
                            eventType.active ? 'text-red-600' : 'text-green-600'
                          }`}
                          title={eventType.active ? 'Desativar' : 'Ativar'}
                        >
                          {eventType.active ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                        <button
                          onClick={() => handleEditEventType(eventType)}
                          className="p-1 text-blue-600 hover:bg-blue-100 rounded"
                          title="Editar"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteClick(eventType)}
                          className="p-1 text-red-600 hover:bg-red-100 rounded"
                          title="Excluir"
                        >
                          <Trash2 size={16} />
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
          // Conteúdo da aba lixeira
          loadingDeleted ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Carregando itens excluídos...</p>
            </div>
          ) : deletedEventTypes.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <Trash2 size={48} className="mx-auto mb-4 text-gray-300" />
              <p>Nenhum item na lixeira</p>
              <p className="text-sm mt-2">Tipos de eventos excluídos aparecerão aqui</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tipo
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Descrição
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Excluído em
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {deletedEventTypes.map((eventType) => (
                    <tr key={eventType.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div
                            className="w-4 h-4 rounded-full mr-3 opacity-50"
                            style={{ backgroundColor: eventType.color }}
                          ></div>
                          <div>
                            <div className="text-sm font-medium text-gray-900 opacity-75">
                              {eventType.name}
                            </div>
                            <div className="text-sm text-gray-500">
                              Ícone: {eventType.icon}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900 opacity-75">
                          {eventType.description || '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">
                          {eventType.deleted_at ? new Date(eventType.deleted_at).toLocaleString('pt-BR') : '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleRestoreClick(eventType)}
                            className="p-1 text-green-600 hover:bg-green-100 rounded"
                            title="Restaurar"
                          >
                            <RotateCcw size={16} />
                          </button>
                          <button
                            onClick={() => handlePermanentDeleteClick(eventType)}
                            className="p-1 text-red-600 hover:bg-red-100 rounded"
                            title="Excluir Permanentemente"
                          >
                            <X size={16} />
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

      {/* Modais */}
      <EventTypeModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        eventType={selectedEventType}
        onSave={handleSaveEventType}
      />

      <DeleteConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        eventTypeName={eventTypeToDelete?.name || ''}
      />

      {/* Modal de confirmação de restauração */}
      {isRestoreModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Confirmar Restauração</h3>
            <p className="text-gray-600 mb-6">
              Tem certeza que deseja restaurar o tipo de evento <strong>{eventTypeToRestore?.name}</strong>?
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setIsRestoreModalOpen(false)}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmRestore}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                Restaurar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmação de exclusão permanente */}
      {isPermanentDeleteModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4 text-red-600">Confirmar Exclusão Permanente</h3>
            <p className="text-gray-600 mb-6">
              <strong>ATENÇÃO:</strong> Esta ação não pode ser desfeita. Tem certeza que deseja excluir permanentemente o tipo de evento <strong>{eventTypeToPermanentDelete?.name}</strong>?
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setIsPermanentDeleteModalOpen(false)}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmPermanentDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Excluir Permanentemente
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminEventTypes;