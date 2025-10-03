import React, { useState, useEffect, Suspense } from 'react';
import { useSupabaseContacts, ContactForm } from '../../shared/hooks/hooks/useSupabaseContacts';
import { Eye, Trash2, Filter, Search, Mail, Phone, Calendar, Users, MessageSquare, CheckCircle, XCircle, Clock, RotateCcw, Trash, Check } from 'lucide-react';
import { toast } from 'sonner';
import Loading from '../ui/Loading';

// Lazy load modal
const ContactConfirmModal = React.lazy(() => import('../../components/ContactConfirmModal'));

const AdminSolicitations: React.FC = () => {
  const {
    contacts,
    loading,
    error,
    stats,
    updateContactStatus,
    softDeleteContact,
    restoreContact,
    permanentDeleteContact,
    getContactsByStatus,
    searchContacts
  } = useSupabaseContacts();
  
  const [selectedContact, setSelectedContact] = useState<ContactForm | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [showTrash, setShowTrash] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    type: 'soft_delete' | 'restore' | 'hard_delete' | 'bulk_delete' | 'bulk_restore' | 'bulk_hard_delete' | 'mark_responded';
    contactName?: string;
    count?: number;
    onConfirm: () => void;
  }>({ isOpen: false, type: 'soft_delete', onConfirm: () => {} });
  const itemsPerPage = 10;

  // Função para formatar data
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleDeleteContact = async (id: string) => {
    const contact = contacts.find(c => c.id === id);
    const contactName = contact?.name || 'este contato';
    
    if (showTrash) {
      // Se estamos na lixeira, excluir permanentemente
      setConfirmModal({
        isOpen: true,
        type: 'hard_delete',
        contactName,
        onConfirm: async () => {
          const success = await permanentDeleteContact(id);
          if (success) {
            setSelectedContact(null);
            toast.success('Contato excluído permanentemente!');
          }
        }
      });
    } else {
      // Se estamos na lista principal, fazer soft delete
      setConfirmModal({
        isOpen: true,
        type: 'soft_delete',
        contactName,
        onConfirm: async () => {
          const success = await softDeleteContact(id);
          if (success) {
            setSelectedContact(null);
            toast.success('Contato movido para a lixeira!');
          }
        }
      });
    }
  };

  const handleRestoreContact = async (id: string) => {
    const contact = contacts.find(c => c.id === id);
    const contactName = contact?.name || 'este contato';
    
    setConfirmModal({
      isOpen: true,
      type: 'restore',
      contactName,
      onConfirm: async () => {
        const success = await restoreContact(id);
        if (success) {
          setSelectedContact(null);
          toast.success('Contato restaurado com sucesso!');
          // Recarregar a lista de mensagens
          window.location.reload();
        }
      }
    });
  };

  const handleUpdateStatus = async (id: string, status: ContactForm['status']) => {
    const success = await updateContactStatus(id, status);
    if (success && selectedContact?.id === id) {
      setSelectedContact({ ...selectedContact, status });
    }
  };

  const handleMarkAsResponded = async (id: string) => {
    const contact = contacts.find(c => c.id === id);
    const contactName = contact?.name || 'este contato';
    
    setConfirmModal({
      isOpen: true,
      type: 'mark_responded',
      contactName,
      onConfirm: async () => {
        const success = await updateContactStatus(id, 'responded');
        if (success) {
          if (selectedContact?.id === id) {
            setSelectedContact({ ...selectedContact, status: 'responded' });
          }
          // Forçar atualização da lista
          window.location.reload();
          toast.success('Mensagem marcada como respondida!');
        }
      }
    });
  };

  // Filtrar contatos baseado no status selecionado, termo de busca e visibilidade da lixeira
  const filteredContacts = contacts.filter(contact => {
    // Filtrar por deleted_at baseado na visibilidade da lixeira
    const isDeleted = contact.deleted_at !== null;
    const shouldShow = showTrash ? isDeleted : !isDeleted;
    
    if (!shouldShow) return false;
    
    const matchesStatus = statusFilter === 'all' || contact.status === statusFilter;
    const matchesSearch = !searchTerm || 
      contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contact.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contact.message.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesStatus && matchesSearch;
  });

  // Contar mensagens excluídas
  const deletedCount = contacts.filter(contact => contact.deleted_at !== null).length;

  const paginatedContacts = filteredContacts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalPages = Math.ceil(filteredContacts.length / itemsPerPage);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return 'bg-yellow-100 text-yellow-800';
      case 'unread': return 'bg-orange-100 text-orange-800';
      case 'read': return 'bg-blue-100 text-blue-800';
      case 'responded': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'new': return 'Novo';
      case 'unread': return 'Não Lido';
      case 'read': return 'Lido';
      case 'responded': return 'Respondido';
      default: return 'Desconhecido';
    }
  };

  const handleContactClick = async (contact: ContactForm) => {
    setSelectedContact(contact);
    // Auto-atualizar status de unread para read
    if (contact.status === 'unread') {
      await handleUpdateStatus(contact.id, 'read');
    }
  };

  const handleSelectContact = (contactId: string) => {
    setSelectedContacts(prev => 
      prev.includes(contactId) 
        ? prev.filter(id => id !== contactId)
        : [...prev, contactId]
    );
  };

  const handleSelectAll = () => {
    if (selectedContacts.length === paginatedContacts.length) {
      setSelectedContacts([]);
    } else {
      setSelectedContacts(paginatedContacts.map(contact => contact.id));
    }
  };

  const handleBulkAction = async (action: string) => {
    if (selectedContacts.length === 0) return;
    
    switch (action) {
      case 'mark_read':
        for (const id of selectedContacts) {
          await handleUpdateStatus(id, 'read');
        }
        break;
      case 'mark_unread':
        for (const id of selectedContacts) {
          await handleUpdateStatus(id, 'unread');
        }
        break;
      case 'delete':
        setConfirmModal({
          isOpen: true,
          type: 'bulk_delete',
          count: selectedContacts.length,
          onConfirm: async () => {
            for (const id of selectedContacts) {
              await softDeleteContact(id);
            }
            setSelectedContacts([]);
            toast.success(`${selectedContacts.length} contatos movidos para a lixeira!`);
          }
        });
        return;
    }
    setSelectedContacts([]);
  };

  const handleBulkDelete = async () => {
    const action = showTrash ? 'excluir permanentemente' : 'mover para a lixeira';
    if (!confirm(`Tem certeza que deseja ${action} ${selectedContacts.length} contatos?`)) return;
    
    for (const contactId of selectedContacts) {
      if (showTrash) {
        await permanentDeleteContact(contactId);
      } else {
        await softDeleteContact(contactId);
      }
    }
    
    setSelectedContacts([]);
    const message = showTrash 
      ? `${selectedContacts.length} contatos excluídos permanentemente!`
      : `${selectedContacts.length} contatos movidos para a lixeira!`;
    toast.success(message);
  };

  const handleBulkRestore = async () => {
    if (!confirm(`Tem certeza que deseja restaurar ${selectedContacts.length} contatos?`)) return;
    
    for (const contactId of selectedContacts) {
      await restoreContact(contactId);
    }
    
    setSelectedContacts([]);
    toast.success(`${selectedContacts.length} contatos restaurados com sucesso!`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Solicitações</h1>
        <div className="text-sm text-gray-500">
          {filteredContacts.length} solicitação(ões) encontrada(s)
        </div>
      </div>

      {/* Filtros e Busca */}
      <div className="bg-white p-4 rounded-lg shadow-sm border">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Buscar por nome, email ou tipo de evento..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">Todos</option>
              <option value="unread">Não Lido</option>
              <option value="read">Lido</option>
              <option value="responded">Respondido</option>
            </select>
            <button
              onClick={() => setShowTrash(!showTrash)}
              className={`relative px-3 py-2 border rounded-lg transition-colors ${
                showTrash 
                  ? 'bg-red-100 border-red-300 text-red-700' 
                  : 'border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Trash className="w-4 h-4" />
              {deletedCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
                  {deletedCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Barra de ações em massa */}
      {selectedContacts.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <span className="text-sm text-blue-700">
              {selectedContacts.length} item(ns) selecionado(s)
            </span>
            <div className="flex items-center gap-2">
              {!showTrash && (
                <>
                  <button
                    onClick={() => handleBulkAction('mark_read')}
                    className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors"
                  >
                    <Check className="w-4 h-4 inline mr-1" />
                    Marcar como Lido
                  </button>
                  <button
                    onClick={() => handleBulkAction('mark_unread')}
                    className="px-3 py-1 bg-orange-600 text-white rounded text-sm hover:bg-orange-700 transition-colors"
                  >
                    <XCircle className="w-4 h-4 inline mr-1" />
                    Marcar como Não Lido
                  </button>
                  <button
                    onClick={() => handleBulkAction('delete')}
                    className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 transition-colors"
                  >
                    <Trash2 className="w-4 h-4 inline mr-1" />
                    Mover para Lixeira
                  </button>
                </>
              )}
              {showTrash && (
                <>
                  <button
                    onClick={handleBulkRestore}
                    className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 transition-colors"
                  >
                    <RotateCcw className="w-4 h-4 inline mr-1" />
                    Restaurar
                  </button>
                  <button
                    onClick={handleBulkDelete}
                    className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 transition-colors"
                  >
                    <Trash className="w-4 h-4 inline mr-1" />
                    Excluir Permanentemente
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lista de Contatos */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <input
                        type="checkbox"
                        checked={selectedContacts.length === paginatedContacts.length && paginatedContacts.length > 0}
                        onChange={handleSelectAll}
                        className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                      />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contato
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Evento
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Data
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedContacts.map((contact) => (
                    <tr
                      key={contact.id}
                      className={`hover:bg-gray-50 cursor-pointer transition-colors ${
                        selectedContact?.id === contact.id ? 'bg-purple-50' : 
                        contact.status === 'unread' ? 'bg-yellow-50' : ''
                      }`}
                      onClick={() => handleContactClick(contact)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={selectedContacts.includes(contact.id)}
                          onChange={(e) => {
                            e.stopPropagation();
                            handleSelectContact(contact.id);
                          }}
                          className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{contact.name}</div>
                          <div className="text-sm text-gray-500">{contact.email}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{contact.event_type}</div>
                        <div className="text-sm text-gray-500">{contact.guests} convidados</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          getStatusColor(contact.status)
                        }`}>
                          {getStatusText(contact.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(contact.created_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleContactClick(contact);
                            }}
                            className="text-purple-600 hover:text-purple-900"
                            title="Ver detalhes"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {showTrash ? (
                            <>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRestoreContact(contact.id);
                                }}
                                className="text-green-600 hover:text-green-900"
                                title="Recuperar"
                              >
                                <RotateCcw className="w-4 h-4" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteContact(contact.id);
                                }}
                                className="text-red-600 hover:text-red-900"
                                title="Excluir permanentemente"
                              >
                                <Trash className="w-4 h-4" />
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteContact(contact.id);
                              }}
                              className="text-red-600 hover:text-red-900"
                              title="Mover para lixeira"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Paginação */}
            {totalPages > 1 && (
              <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200">
                <div className="flex-1 flex justify-between sm:hidden">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                  >
                    Anterior
                  </button>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                  >
                    Próximo
                  </button>
                </div>
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-700">
                      Mostrando <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> a{' '}
                      <span className="font-medium">
                        {Math.min(currentPage * itemsPerPage, filteredContacts.length)}
                      </span>{' '}
                      de <span className="font-medium">{filteredContacts.length}</span> resultados
                    </p>
                  </div>
                  <div>
                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                            page === currentPage
                              ? 'z-10 bg-purple-50 border-purple-500 text-purple-600'
                              : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                          }`}
                        >
                          {page}
                        </button>
                      ))}
                    </nav>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Detalhes do Contato */}
        <div className="lg:col-span-1">
          {selectedContact ? (
            <div className="bg-white rounded-lg shadow-sm border p-6 sticky top-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Detalhes do Contato</h3>
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                  getStatusColor(selectedContact.status)
                }`}>
                  {getStatusText(selectedContact.status)}
                </span>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                    <span className="text-purple-600 font-semibold text-sm">
                      {selectedContact.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">{selectedContact.name}</div>
                    <div className="text-sm text-gray-500">Nome completo</div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Mail className="w-5 h-5 text-gray-400" />
                  <div>
                    <div className="font-medium text-gray-900">{selectedContact.email}</div>
                    <div className="text-sm text-gray-500">Email</div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Phone className="w-5 h-5 text-gray-400" />
                  <div>
                    <div className="font-medium text-gray-900">{selectedContact.phone}</div>
                    <div className="text-sm text-gray-500">Telefone</div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-gray-400" />
                  <div>
                    <div className="font-medium text-gray-900">{formatDate(selectedContact.event_date)}</div>
                    <div className="text-sm text-gray-500">Data do evento</div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Users className="w-5 h-5 text-gray-400" />
                  <div>
                    <div className="font-medium text-gray-900">{selectedContact.guests} convidados</div>
                    <div className="text-sm text-gray-500">Número de convidados</div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <div className="flex items-start gap-3">
                    <MessageSquare className="w-5 h-5 text-gray-400 mt-1" />
                    <div className="flex-1">
                      <div className="text-sm text-gray-500 mb-1">Mensagem</div>
                      <div className="text-gray-900 text-sm leading-relaxed">
                        {selectedContact.message}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <div className="text-sm text-gray-500 mb-2">Tipo de evento</div>
                  <div className="font-medium text-gray-900">{selectedContact.event_type}</div>
                </div>

                <div className="border-t pt-4">
                  <div className="text-sm text-gray-500 mb-2">Recebido em</div>
                  <div className="font-medium text-gray-900">{formatDate(selectedContact.created_at)}</div>
                </div>

                {/* Ações */}
                <div className="border-t pt-4 space-y-2">
                  {!showTrash && (
                    <>
                      {(selectedContact.status === 'new' || selectedContact.status === 'unread') && (
                        <button
                          onClick={() => handleUpdateStatus(selectedContact.id, 'read')}
                          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          <CheckCircle className="w-4 h-4" />
                          Marcar como Lido
                        </button>
                      )}
                      
                      {selectedContact.status === 'read' && (
                        <>
                          <button
                            onClick={() => handleMarkAsResponded(selectedContact.id)}
                            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                          >
                            <CheckCircle className="w-4 h-4" />
                            Marcar como Respondido
                          </button>
                          <button
                            onClick={() => handleUpdateStatus(selectedContact.id, 'unread')}
                            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                          >
                            <XCircle className="w-4 h-4" />
                            Marcar como Não Lida
                          </button>
                        </>
                      )}

                      {selectedContact.status === 'responded' && (
                        <button
                          onClick={() => handleUpdateStatus(selectedContact.id, 'unread')}
                          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                        >
                          <XCircle className="w-4 h-4" />
                          Marcar como Não Lida
                        </button>
                      )}

                      <button
                        onClick={() => handleDeleteContact(selectedContact.id)}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                        Mover para Lixeira
                      </button>
                    </>
                  )}
                  
                  {showTrash && (
                    <>
                      <button
                        onClick={() => handleRestoreContact(selectedContact.id)}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                      >
                        <RotateCcw className="w-4 h-4" />
                        Restaurar
                      </button>
                      
                      <button
                        onClick={() => handleDeleteContact(selectedContact.id)}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                        Excluir Permanentemente
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-sm border p-6 text-center text-gray-500">
              <MessageSquare className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>Selecione um contato para ver os detalhes</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal de Confirmação */}
      <Suspense fallback={null}>
        <ContactConfirmModal
          isOpen={confirmModal.isOpen}
          onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
          onConfirm={() => {
            confirmModal.onConfirm();
            setConfirmModal({ ...confirmModal, isOpen: false });
          }}
          type={confirmModal.type}
          contactName={confirmModal.contactName}
          count={confirmModal.count}
        />
      </Suspense>
    </div>
  );
};

export default AdminSolicitations;