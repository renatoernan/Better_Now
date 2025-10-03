import React, { useState, useEffect } from 'react';
import { BarChart3, Download, FileText, Users, Calendar, TrendingUp, PieChart, Filter, RefreshCw } from 'lucide-react';
import { useSupabaseEvents } from '../../shared/hooks/hooks/useSupabaseEvents';
import { useSupabaseClients } from '../../shared/hooks/hooks/useSupabaseClients';
import { toast } from 'sonner';

interface EventReportsProps {
  eventId?: string;
}

interface ReportData {
  totalParticipants: number;
  checkedInParticipants: number;
  confirmedParticipants: number;
  pendingParticipants: number;
  cancelledParticipants: number;
  checkInRate: number;
  confirmationRate: number;
  averageAge?: number;
  genderDistribution: { male: number; female: number; other: number };
  locationDistribution: Record<string, number>;
  registrationTrend: Array<{ date: string; count: number }>;
  checkInTrend: Array<{ hour: string; count: number }>;
  notificationStats: {
    sent: number;
    opened: number;
    clicked: number;
  };
}

const EventReports: React.FC<EventReportsProps> = ({ eventId }) => {
  const {
    events,
    participants,
    eventNotifications,
    fetchEvents,
    fetchEventParticipants,
    fetchEventNotifications,
    generateEventReport
  } = useSupabaseEvents();
  
  const { clients } = useSupabaseClients();
  
  const [selectedEvent, setSelectedEvent] = useState(eventId || '');
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [reportType, setReportType] = useState<'summary' | 'detailed' | 'analytics'>('summary');
  const [exportFormat, setExportFormat] = useState<'pdf' | 'excel' | 'csv'>('pdf');

  useEffect(() => {
    fetchEvents();
    if (eventId) {
      loadEventData(eventId);
    }
  }, [eventId]);

  useEffect(() => {
    if (selectedEvent) {
      loadEventData(selectedEvent);
    }
  }, [selectedEvent]);

  const loadEventData = async (eventId: string) => {
    setLoading(true);
    try {
      await Promise.all([
        fetchEventParticipants(eventId),
        fetchEventNotifications(eventId)
      ]);
      generateReportData(eventId);
    } catch (error) {
      console.error('Erro ao carregar dados do evento:', error);
      toast.error('Erro ao carregar dados do evento');
    } finally {
      setLoading(false);
    }
  };

  const generateReportData = (eventId: string) => {
    const eventParticipants = participants.filter(p => p.event_id === eventId);
    const notifications = eventNotifications.filter(n => n.event_id === eventId);
    
    const totalParticipants = eventParticipants.length;
    const checkedInParticipants = eventParticipants.filter(p => p.checked_in_at).length;
    const confirmedParticipants = eventParticipants.filter(p => p.status === 'confirmed').length;
    const pendingParticipants = eventParticipants.filter(p => p.status === 'pending').length;
    const cancelledParticipants = eventParticipants.filter(p => p.status === 'cancelled').length;
    
    const checkInRate = totalParticipants > 0 ? (checkedInParticipants / totalParticipants) * 100 : 0;
    const confirmationRate = totalParticipants > 0 ? (confirmedParticipants / totalParticipants) * 100 : 0;
    
    // Gender distribution - placeholder (campo não disponível)
    const genderDistribution = {
      male: 0,
      female: 0,
      other: 0
    };
    
    // Location distribution - placeholder (campo não disponível)
    const locationDistribution = {
      'Não informado': eventParticipants.length
    };
    
    // Registration trend (últimos 30 dias)
    const registrationTrend: Array<{ date: string; count: number }> = [];
    const last30Days = Array.from({ length: 30 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (29 - i));
      return date.toISOString().split('T')[0];
    });
    
    last30Days.forEach(date => {
      const count = eventParticipants.filter(p => 
        p.created_at && p.created_at.startsWith(date)
      ).length;
      registrationTrend.push({ date, count });
    });
    
    // Check-in trend (por hora do dia)
    const checkInTrend: Array<{ hour: string; count: number }> = [];
    for (let hour = 0; hour < 24; hour++) {
      const hourStr = hour.toString().padStart(2, '0') + ':00';
      const count = eventParticipants.filter(p => {
        if (!p.checked_in_at) return false;
        const checkInHour = new Date(p.checked_in_at).getHours();
        return checkInHour === hour;
      }).length;
      checkInTrend.push({ hour: hourStr, count });
    }
    
    // Notification stats
    // Placeholder para tracking de abertura e cliques (não implementado)
    const openedNotifications: any[] = [];
    const clickedNotifications: any[] = [];
    
    const notificationStats = {
      sent: notifications.filter(n => n.status === 'sent').length,
      opened: 0, // Placeholder - tracking não implementado
      clicked: 0 // Placeholder - tracking não implementado
    };
    
    setReportData({
      totalParticipants,
      checkedInParticipants,
      confirmedParticipants,
      pendingParticipants,
      cancelledParticipants,
      checkInRate,
      confirmationRate,
      genderDistribution,
      locationDistribution,
      registrationTrend,
      checkInTrend,
      notificationStats
    });
  };

  const handleExportReport = async () => {
    if (!selectedEvent || !reportData) {
      toast.error('Selecione um evento e gere o relatório primeiro');
      return;
    }

    setLoading(true);
    try {
      const reportBlob = await generateEventReport(selectedEvent);
      
      // Create download link
      const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      const event = events.find(e => e.id === selectedEvent);
      const fileName = `relatorio_${event?.title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.${exportFormat}`;
      link.download = fileName;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success('Relatório exportado com sucesso!');
    } catch (error) {
      console.error('Erro ao exportar relatório:', error);
      toast.error('Erro ao exportar relatório');
    } finally {
      setLoading(false);
    }
  };

  const currentEvent = events.find(e => e.id === selectedEvent);

  return (
    <div className="bg-white rounded-lg shadow-sm">
      {/* Header */}
      <div className="p-6 border-b">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <BarChart3 className="w-6 h-6 text-purple-600" />
            <h2 className="text-xl font-bold text-gray-900">Relatórios de Eventos</h2>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={() => selectedEvent && loadEventData(selectedEvent)}
              disabled={loading || !selectedEvent}
              className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
              title="Atualizar dados"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            
            <button
              onClick={handleExportReport}
              disabled={loading || !reportData}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Exportar
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Calendar className="w-4 h-4 inline mr-1" />
              Evento
            </label>
            <select
              value={selectedEvent}
              onChange={(e) => setSelectedEvent(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="">Selecione um evento</option>
              {events.map(event => (
                <option key={event.id} value={event.id}>
                  {event.title} - {new Date(event.event_date).toLocaleDateString('pt-BR')}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <FileText className="w-4 h-4 inline mr-1" />
              Tipo de Relatório
            </label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value as typeof reportType)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="summary">Resumo</option>
              <option value="detailed">Detalhado</option>
              <option value="analytics">Analytics</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Download className="w-4 h-4 inline mr-1" />
              Formato
            </label>
            <select
              value={exportFormat}
              onChange={(e) => setExportFormat(e.target.value as typeof exportFormat)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="pdf">PDF</option>
              <option value="excel">Excel</option>
              <option value="csv">CSV</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Filter className="w-4 h-4 inline mr-1" />
              Período
            </label>
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      <div className="p-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-8 h-8 text-purple-600 animate-spin" />
            <span className="ml-2 text-gray-600">Carregando dados...</span>
          </div>
        ) : !selectedEvent ? (
          <div className="text-center py-12">
            <BarChart3 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Selecione um Evento</h3>
            <p className="text-gray-600">Escolha um evento para visualizar os relatórios e estatísticas</p>
          </div>
        ) : !reportData ? (
          <div className="text-center py-12">
            <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum Dado Encontrado</h3>
            <p className="text-gray-600">Não há dados suficientes para gerar o relatório</p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Event Info */}
            {currentEvent && (
              <div className="bg-gradient-to-r from-purple-500 to-purple-600 p-6 rounded-lg text-white">
                <h3 className="text-xl font-bold mb-2">{currentEvent.title}</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-purple-100">
                  <div>
                    <p className="text-sm">Data do Evento</p>
                    <p className="font-medium">{new Date(currentEvent.event_date).toLocaleDateString('pt-BR')}</p>
                  </div>
                  <div>
                    <p className="text-sm">Local</p>
                    <p className="font-medium">{currentEvent.location || 'Não informado'}</p>
                  </div>
                  <div>
                    <p className="text-sm">Capacidade</p>
                    <p className="font-medium">{currentEvent.max_guests || 'Ilimitada'}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-blue-50 p-6 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-600 text-sm font-medium">Total de Participantes</p>
                    <p className="text-3xl font-bold text-blue-700">{reportData.totalParticipants}</p>
                  </div>
                  <Users className="w-12 h-12 text-blue-400" />
                </div>
              </div>
              
              <div className="bg-green-50 p-6 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-green-600 text-sm font-medium">Taxa de Check-in</p>
                    <p className="text-3xl font-bold text-green-700">{reportData.checkInRate.toFixed(1)}%</p>
                  </div>
                  <TrendingUp className="w-12 h-12 text-green-400" />
                </div>
              </div>
              
              <div className="bg-yellow-50 p-6 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-yellow-600 text-sm font-medium">Taxa de Confirmação</p>
                    <p className="text-3xl font-bold text-yellow-700">{reportData.confirmationRate.toFixed(1)}%</p>
                  </div>
                  <PieChart className="w-12 h-12 text-yellow-400" />
                </div>
              </div>
              
              <div className="bg-purple-50 p-6 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-purple-600 text-sm font-medium">Check-ins Realizados</p>
                    <p className="text-3xl font-bold text-purple-700">{reportData.checkedInParticipants}</p>
                  </div>
                  <BarChart3 className="w-12 h-12 text-purple-400" />
                </div>
              </div>
            </div>

            {/* Status Distribution */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gray-50 p-6 rounded-lg">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Distribuição por Status</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Confirmados</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full" 
                          style={{ width: `${reportData.totalParticipants > 0 ? (reportData.confirmedParticipants / reportData.totalParticipants) * 100 : 0}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium w-12 text-right">{reportData.confirmedParticipants}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Pendentes</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-yellow-600 h-2 rounded-full" 
                          style={{ width: `${reportData.totalParticipants > 0 ? (reportData.pendingParticipants / reportData.totalParticipants) * 100 : 0}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium w-12 text-right">{reportData.pendingParticipants}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Cancelados</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-red-600 h-2 rounded-full" 
                          style={{ width: `${reportData.totalParticipants > 0 ? (reportData.cancelledParticipants / reportData.totalParticipants) * 100 : 0}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium w-12 text-right">{reportData.cancelledParticipants}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Check-in Feito</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-green-600 h-2 rounded-full" 
                          style={{ width: `${reportData.totalParticipants > 0 ? (reportData.checkedInParticipants / reportData.totalParticipants) * 100 : 0}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium w-12 text-right">{reportData.checkedInParticipants}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="bg-gray-50 p-6 rounded-lg">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Distribuição Geográfica</h3>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {Object.entries(reportData.locationDistribution)
                    .sort(([,a], [,b]) => b - a)
                    .slice(0, 10)
                    .map(([location, count]) => (
                      <div key={location} className="flex items-center justify-between text-sm">
                        <span className="text-gray-700 truncate">{location}</span>
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-gray-200 rounded-full h-1.5">
                            <div 
                              className="bg-purple-600 h-1.5 rounded-full" 
                              style={{ width: `${reportData.totalParticipants > 0 ? (count / reportData.totalParticipants) * 100 : 0}%` }}
                            ></div>
                          </div>
                          <span className="font-medium w-8 text-right">{count}</span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>

            {/* Trends */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gray-50 p-6 rounded-lg">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Tendência de Inscrições (Últimos 30 dias)</h3>
                <div className="h-48 flex items-end justify-between gap-1">
                  {reportData.registrationTrend.slice(-14).map((item, index) => {
                    const maxCount = Math.max(...reportData.registrationTrend.map(i => i.count));
                    const height = maxCount > 0 ? (item.count / maxCount) * 100 : 0;
                    
                    return (
                      <div key={index} className="flex flex-col items-center flex-1">
                        <div 
                          className="bg-blue-500 rounded-t w-full min-h-[2px] transition-all duration-300 hover:bg-blue-600"
                          style={{ height: `${height}%` }}
                          title={`${new Date(item.date).toLocaleDateString('pt-BR')}: ${item.count} inscrições`}
                        ></div>
                        <span className="text-xs text-gray-500 mt-1 transform rotate-45 origin-left">
                          {new Date(item.date).getDate()}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
              
              <div className="bg-gray-50 p-6 rounded-lg">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Check-ins por Horário</h3>
                <div className="h-48 flex items-end justify-between gap-1">
                  {reportData.checkInTrend.filter((_, index) => index % 2 === 0).map((item, index) => {
                    const maxCount = Math.max(...reportData.checkInTrend.map(i => i.count));
                    const height = maxCount > 0 ? (item.count / maxCount) * 100 : 0;
                    
                    return (
                      <div key={index} className="flex flex-col items-center flex-1">
                        <div 
                          className="bg-green-500 rounded-t w-full min-h-[2px] transition-all duration-300 hover:bg-green-600"
                          style={{ height: `${height}%` }}
                          title={`${item.hour}: ${item.count} check-ins`}
                        ></div>
                        <span className="text-xs text-gray-500 mt-1">
                          {item.hour.split(':')[0]}h
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Notification Stats */}
            <div className="bg-gray-50 p-6 rounded-lg">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Estatísticas de Notificações</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
                    <span className="text-2xl font-bold text-blue-600">{reportData.notificationStats.sent}</span>
                  </div>
                  <p className="text-sm text-gray-600">Notificações Enviadas</p>
                </div>
                
                <div className="text-center">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                    <span className="text-2xl font-bold text-green-600">{reportData.notificationStats.opened}</span>
                  </div>
                  <p className="text-sm text-gray-600">Notificações Abertas</p>
                </div>
                
                <div className="text-center">
                  <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-2">
                    <span className="text-2xl font-bold text-purple-600">{reportData.notificationStats.clicked}</span>
                  </div>
                  <p className="text-sm text-gray-600">Links Clicados</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EventReports;