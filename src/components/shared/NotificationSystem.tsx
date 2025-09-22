import React, { useState, useEffect } from 'react';
import { Bell, Send, Eye, Trash2, Users, Calendar, Mail, MessageSquare, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { useSupabaseEvents, EventNotification } from '../../hooks/useSupabaseEvents';
import { useSupabaseClients } from '../../hooks/useSupabaseClients';
import { toast } from 'sonner';

interface NotificationSystemProps {
  eventId?: string;
}

const NotificationSystem: React.FC<NotificationSystemProps> = ({ eventId }) => {
  const {
    events,
    participants,
    eventNotifications,
    fetchEventNotifications,
    createEventNotification,
    sendEventNotification
  } = useSupabaseEvents();

  const { clients } = useSupabaseClients();
  
  const [selectedEvent, setSelectedEvent] = useState(eventId || '');
  const [notificationType, setNotificationType] = useState<'reminder' | 'confirmation' | 'cancellation' | 'update' | 'checkin'>('reminder');
  const [notificationTitle, setNotificationTitle] = useState('');
  const [notificationMessage, setNotificationMessage] = useState('');
  const [targetAudience, setTargetAudience] = useState<'all_participants' | 'confirmed_participants' | 'pending_participants' | 'all_clients' | 'specific_clients'>('confirmed_participants');
  const [selectedClients, setSelectedClients] = useState<string[]>([]);
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'create' | 'history'>('create');

  useEffect(() => {
    // Dados já carregados pelos hooks
    if (eventId) {
      fetchEventNotifications(eventId);
    }
  }, [eventId]);

  useEffect(() => {
    if (selectedEvent) {
      fetchEventNotifications(selectedEvent);
    }
  }, [selectedEvent]);

  const getEventParticipants = (eventId: string, status?: string) => {
    return participants.filter(p => {
      if (p.event_id !== eventId) return false;
      if (status) return p.status === status;
      return true;
    });
  };

  const getTargetCount = () => {
    if (!selectedEvent) return 0;
    
    switch (targetAudience) {
      case 'all_participants':
        return getEventParticipants(selectedEvent).length;
      case 'confirmed_participants':
        return getEventParticipants(selectedEvent, 'confirmed').length;
      case 'pending_participants':
        return getEventParticipants(selectedEvent, 'pending').length;
      case 'all_clients':
        return clients.length;
      case 'specific_clients':
        return selectedClients.length;
      default:
        return 0;
    }
  };

  const handleSendNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedEvent || !notificationTitle.trim() || !notificationMessage.trim()) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    if (getTargetCount() === 0) {
      toast.error('Nenhum destinatário selecionado');
      return;
    }

    setLoading(true);

    try {
      // Create notification record
      const notification = await createEventNotification({
        event_id: selectedEvent,
        notification_type: notificationType,
        title: notificationTitle,
        message: notificationMessage,
        // target_audience removido - não existe na interface
        // scheduled_date e scheduled_time removidos - não existem na interface
        status: scheduledDate ? 'pending' : 'sent',
      });

      // Send notification immediately if not scheduled
      if (!scheduledDate) {
        await sendEventNotification(notification.id);
        toast.success(`Notificação enviada para ${getTargetCount()} destinatário(s)`);
      } else {
        toast.success('Notificação agendada com sucesso');
      }

      // Reset form
      setNotificationTitle('');
      setNotificationMessage('');
      setScheduledDate('');
      setScheduledTime('');
      setSelectedClients([]);
      
      // Refresh notifications
      fetchEventNotifications(selectedEvent);
      
    } catch (error) {
      console.error('Erro ao enviar notificação:', error);
      toast.error('Erro ao enviar notificação');
    } finally {
      setLoading(false);
    }
  };

  const handleResendNotification = async (notificationId: string) => {
    try {
      await sendEventNotification(notificationId);
      toast.success('Notificação reenviada com sucesso');
      fetchEventNotifications(selectedEvent);
    } catch (error) {
      console.error('Erro ao reenviar notificação:', error);
      toast.error('Erro ao reenviar notificação');
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'email': return <Mail className="w-4 h-4" />;
      case 'sms': return <MessageSquare className="w-4 h-4" />;
      case 'push': return <Bell className="w-4 h-4" />;
      default: return <Bell className="w-4 h-4" />;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'scheduled': return <Clock className="w-4 h-4 text-blue-500" />;
      case 'failed': return <AlertCircle className="w-4 h-4 text-red-500" />;
      default: return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'sent': return 'Enviada';
      case 'scheduled': return 'Agendada';
      case 'failed': return 'Falhou';
      default: return 'Pendente';
    }
  };

  const notificationTemplates = {
    event_reminder: {
      title: 'Lembrete: {event_title}',
      message: 'Olá! Este é um lembrete sobre o evento "{event_title}" que acontecerá em {event_date} às {event_time}. Local: {event_location}. Não esqueça de comparecer!'
    },
    event_update: {
      title: 'Atualização: {event_title}',
      message: 'Houve uma atualização no evento "{event_title}". Por favor, verifique os detalhes atualizados em nossa plataforma.'
    },
    event_cancellation: {
      title: 'Cancelamento: {event_title}',
      message: 'Infelizmente, o evento "{event_title}" foi cancelado. Entraremos em contato em breve com mais informações.'
    },
    registration_confirmation: {
      title: 'Inscrição confirmada: {event_title}',
      message: 'Sua inscrição no evento "{event_title}" foi confirmada! Data: {event_date}, Horário: {event_time}, Local: {event_location}.'
    }
  };

  const applyTemplate = (templateKey: keyof typeof notificationTemplates) => {
    const template = notificationTemplates[templateKey];
    const selectedEventData = events.find(e => e.id === selectedEvent);
    
    if (selectedEventData) {
      const title = template.title
        .replace('{event_title}', selectedEventData.title)
        .replace('{event_date}', new Date(selectedEventData.event_date).toLocaleDateString('pt-BR'))
        .replace('{event_time}', selectedEventData.event_time || '')
        .replace('{event_location}', selectedEventData.location || '');
      
      const message = template.message
        .replace('{event_title}', selectedEventData.title)
        .replace('{event_date}', new Date(selectedEventData.event_date).toLocaleDateString('pt-BR'))
        .replace('{event_time}', selectedEventData.event_time || '')
        .replace('{event_location}', selectedEventData.location || '');
      
      setNotificationTitle(title);
      setNotificationMessage(message);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm">
      {/* Header */}
      <div className="p-6 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Bell className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-bold text-gray-900">Sistema de Notificações</h2>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('create')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                activeTab === 'create'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Criar Notificação
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                activeTab === 'history'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Histórico
            </button>
          </div>
        </div>
      </div>

      <div className="p-6">
        {activeTab === 'create' ? (
          <form onSubmit={handleSendNotification} className="space-y-6">
            {/* Event Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar className="w-4 h-4 inline mr-1" />
                Evento *
              </label>
              <select
                value={selectedEvent}
                onChange={(e) => setSelectedEvent(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                <option value="">Selecione um evento</option>
                {events.map(event => (
                  <option key={event.id} value={event.id}>
                    {event.title} - {new Date(event.event_date).toLocaleDateString('pt-BR')}
                  </option>
                ))}
              </select>
            </div>

            {/* Templates */}
            {selectedEvent && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Templates Rápidos
                </label>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(notificationTemplates).map(([key, template]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => applyTemplate(key as keyof typeof notificationTemplates)}
                      className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full transition-colors"
                    >
                      {key.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column */}
              <div className="space-y-4">
                {/* Notification Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tipo de Notificação *
                  </label>
                  <div className="flex gap-3">
                    {(['email', 'sms'] as const).map(type => (
                      <label key={type} className="flex items-center">
                        <input
                          type="radio"
                          name="notificationType"
                          value={type}
                          checked={notificationType === type}
                          onChange={(e) => setNotificationType(e.target.value as typeof notificationType)}
                          className="mr-2"
                        />
                        <span className="flex items-center gap-1 text-sm">
                          {getNotificationIcon(type)}
                          {type.toUpperCase()}
                        </span>
                      </label>
                    ))}
                    {false && ( // Desabilitado temporariamente
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="notificationType"
                          value="push"
                          checked={notificationType === 'push'}
                          onChange={(e) => setNotificationType(e.target.value as typeof notificationType)}
                          className="mr-2"
                        />
                        <span className="flex items-center gap-1 text-sm">
                          {getNotificationIcon('push')}
                          PUSH
                        </span>
                      </label>
                    )}
                  </div>
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <h4 className="font-medium text-blue-900 mb-2">📧 Notificação do tipo: {notificationType}</h4>
                    <p className="text-blue-700 text-sm">Configurações específicas do tipo de notificação.</p>
                  </div>
                </div>

                {/* Target Audience */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Users className="w-4 h-4 inline mr-1" />
                    Destinatários *
                  </label>
                  <select
                    value={targetAudience}
                    onChange={(e) => setTargetAudience(e.target.value as typeof targetAudience)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="confirmed_participants">Participantes Confirmados</option>
                    <option value="all_participants">Todos os Participantes</option>
                    <option value="pending_participants">Participantes Pendentes</option>
                    <option value="all_clients">Todos os Clientes</option>
                    <option value="specific_clients">Clientes Específicos</option>
                  </select>
                  
                  {selectedEvent && (
                    <p className="text-sm text-gray-600 mt-1">
                      {getTargetCount()} destinatário(s) selecionado(s)
                    </p>
                  )}
                </div>

                {/* Specific Clients Selection */}
                {targetAudience === 'specific_clients' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Selecionar Clientes
                    </label>
                    <div className="max-h-40 overflow-y-auto border border-gray-300 rounded-lg p-2">
                      {clients.map(client => (
                        <label key={client.id} className="flex items-center p-2 hover:bg-gray-50 rounded">
                          <input
                            type="checkbox"
                            checked={selectedClients.includes(client.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedClients(prev => [...prev, client.id]);
                              } else {
                                setSelectedClients(prev => prev.filter(id => id !== client.id));
                              }
                            }}
                            className="mr-2"
                          />
                          <span className="text-sm">{client.name} - {client.email}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* Scheduling */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Agendamento (Opcional)
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="date"
                      value={scheduledDate}
                      onChange={(e) => setScheduledDate(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      min={new Date().toISOString().split('T')[0]}
                    />
                    <input
                      type="time"
                      value={scheduledTime}
                      onChange={(e) => setScheduledTime(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Deixe em branco para enviar imediatamente
                  </p>
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-4">
                {/* Title */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Título *
                  </label>
                  <input
                    type="text"
                    value={notificationTitle}
                    onChange={(e) => setNotificationTitle(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Título da notificação"
                    required
                  />
                </div>

                {/* Message */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Mensagem *
                  </label>
                  <textarea
                    value={notificationMessage}
                    onChange={(e) => setNotificationMessage(e.target.value)}
                    rows={8}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Conteúdo da notificação..."
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {notificationMessage.length}/500 caracteres
                  </p>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={loading || !selectedEvent || !notificationTitle.trim() || !notificationMessage.trim()}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Send className="w-4 h-4" />
                {loading ? 'Enviando...' : scheduledDate ? 'Agendar Notificação' : 'Enviar Notificação'}
              </button>
            </div>
          </form>
        ) : (
          /* Notifications History */
          <div className="space-y-4">
            {/* Event Filter */}
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <select
                  value={selectedEvent}
                  onChange={(e) => setSelectedEvent(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Todos os eventos</option>
                  {events.map(event => (
                    <option key={event.id} value={event.id}>
                      {event.title} - {new Date(event.event_date).toLocaleDateString('pt-BR')}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Notifications List */}
            <div className="space-y-3">
              {eventNotifications.length === 0 ? (
                <div className="text-center py-8">
                  <Bell className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600">Nenhuma notificação encontrada</p>
                </div>
              ) : (
                eventNotifications.map(notification => (
                  <div key={notification.id} className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          {getNotificationIcon(notification.notification_type)}
                          <h3 className="font-medium text-gray-900">{notification.title}</h3>
                          <div className="flex items-center gap-1">
                            {getStatusIcon(notification.status)}
                            <span className="text-sm text-gray-600">{getStatusText(notification.status)}</span>
                          </div>
                        </div>
                        
                        <p className="text-gray-600 text-sm mb-2">{notification.message}</p>
                        
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span>Tipo: {notification.notification_type.toUpperCase()}</span>
                          <span>Público: Todos os participantes</span>
                          <span>Criado: {new Date(notification.created_at).toLocaleString('pt-BR')}</span>
                          {notification.sent_at && (
                            <span>Enviado: {new Date(notification.sent_at).toLocaleString('pt-BR')}</span>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 ml-4">
                        {notification.status === 'failed' && (
                          <button
                            onClick={() => handleResendNotification(notification.id)}
                            className="p-1 text-blue-600 hover:text-blue-800 transition-colors"
                            title="Reenviar notificação"
                          >
                            <Send className="w-4 h-4" />
                          </button>
                        )}
                        
                        <button
                          className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                          title="Ver detalhes"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationSystem;