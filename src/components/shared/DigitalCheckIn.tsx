import React, { useState, useEffect } from 'react';
import { QrCode, UserCheck, UserX, Search, Clock, Users, CheckCircle, AlertCircle, Camera, Smartphone } from 'lucide-react';
import { useSupabaseEvents, EventParticipant } from '../../hooks/useSupabaseEvents';
import { useSupabaseClients } from '../../hooks/useSupabaseClients';
import { toast } from 'sonner';

interface DigitalCheckInProps {
  eventId: string;
}

const DigitalCheckIn: React.FC<DigitalCheckInProps> = ({ eventId }) => {
  const {
    events,
    participants,
    checkInParticipant,
    undoCheckIn,
    fetchEvents,
    fetchEventParticipants
  } = useSupabaseEvents();
  
  const { clients, fetchClients } = useSupabaseClients();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedParticipant, setSelectedParticipant] = useState<EventParticipant | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'checkin' | 'list' | 'stats'>('checkin');
  const [qrScannerActive, setQrScannerActive] = useState(false);
  const [manualCheckIn, setManualCheckIn] = useState(false);

  useEffect(() => {
    fetchEvents();
    fetchClients();
    fetchEventParticipants(eventId);
  }, [eventId]);

  const currentEvent = events.find(e => e.id === eventId);
  const eventParticipants = participants.filter(p => p.event_id === eventId);
  
  const filteredParticipants = eventParticipants.filter(participant => {
    const client = clients.find(c => c.id === participant.client_id);
    if (!client) return false;
    
    const searchLower = searchTerm.toLowerCase();
    return (
      client.name.toLowerCase().includes(searchLower) ||
      client.email.toLowerCase().includes(searchLower) ||
      client.phone?.toLowerCase().includes(searchLower) ||
      participant.status.toLowerCase().includes(searchLower)
    );
  });

  const checkedInCount = eventParticipants.filter(p => p.checked_in_at).length;
  const confirmedCount = eventParticipants.filter(p => p.status === 'confirmed').length;
  const pendingCount = eventParticipants.filter(p => p.status === 'pending').length;
  const checkInRate = eventParticipants.length > 0 ? (checkedInCount / eventParticipants.length) * 100 : 0;

  const handleCheckIn = async (participantId: string) => {
    setLoading(true);
    try {
      await checkInParticipant(participantId);
      toast.success('Check-in realizado com sucesso!');
      fetchEventParticipants(eventId);
      setSelectedParticipant(null);
    } catch (error) {
      console.error('Erro no check-in:', error);
      toast.error('Erro ao realizar check-in');
    } finally {
      setLoading(false);
    }
  };

  const handleUndoCheckIn = async (participantId: string) => {
    setLoading(true);
    try {
      await undoCheckIn(participantId);
      toast.success('Check-in desfeito com sucesso!');
      fetchEventParticipants(eventId);
    } catch (error) {
      console.error('Erro ao desfazer check-in:', error);
      toast.error('Erro ao desfazer check-in');
    } finally {
      setLoading(false);
    }
  };

  const handleQRScan = (data: string) => {
    // Assumindo que o QR code contém o ID do participante
    const participant = eventParticipants.find(p => p.id === data);
    if (participant) {
      setSelectedParticipant(participant);
      setQrScannerActive(false);
    } else {
      toast.error('Participante não encontrado');
    }
  };

  const getStatusColor = (status: string, checkedIn: boolean) => {
    if (checkedIn) return 'text-green-600 bg-green-100';
    
    switch (status) {
      case 'confirmed': return 'text-blue-600 bg-blue-100';
      case 'pending': return 'text-yellow-600 bg-yellow-100';
      case 'cancelled': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusText = (status: string, checkedIn: boolean) => {
    if (checkedIn) return 'Check-in Realizado';
    
    switch (status) {
      case 'confirmed': return 'Confirmado';
      case 'pending': return 'Pendente';
      case 'cancelled': return 'Cancelado';
      default: return status;
    }
  };

  const generateQRCode = (participantId: string) => {
    // URL para gerar QR code (usando um serviço gratuito)
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${participantId}`;
  };

  return (
    <div className="bg-white rounded-lg shadow-sm">
      {/* Header */}
      <div className="p-6 border-b">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <UserCheck className="w-6 h-6 text-green-600" />
            <div>
              <h2 className="text-xl font-bold text-gray-900">Check-in Digital</h2>
              {currentEvent && (
                <p className="text-sm text-gray-600">{currentEvent.title}</p>
              )}
            </div>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('checkin')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                activeTab === 'checkin'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Check-in
            </button>
            <button
              onClick={() => setActiveTab('list')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                activeTab === 'list'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Lista
            </button>
            <button
              onClick={() => setActiveTab('stats')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                activeTab === 'stats'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Estatísticas
            </button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-green-50 p-3 rounded-lg">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span className="text-sm font-medium text-green-800">Check-ins</span>
            </div>
            <p className="text-2xl font-bold text-green-600">{checkedInCount}</p>
          </div>
          
          <div className="bg-blue-50 p-3 rounded-lg">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" />
              <span className="text-sm font-medium text-blue-800">Confirmados</span>
            </div>
            <p className="text-2xl font-bold text-blue-600">{confirmedCount}</p>
          </div>
          
          <div className="bg-yellow-50 p-3 rounded-lg">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-yellow-600" />
              <span className="text-sm font-medium text-yellow-800">Pendentes</span>
            </div>
            <p className="text-2xl font-bold text-yellow-600">{pendingCount}</p>
          </div>
          
          <div className="bg-purple-50 p-3 rounded-lg">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-purple-600" />
              <span className="text-sm font-medium text-purple-800">Taxa</span>
            </div>
            <p className="text-2xl font-bold text-purple-600">{checkInRate.toFixed(1)}%</p>
          </div>
        </div>
      </div>

      <div className="p-6">
        {activeTab === 'checkin' && (
          <div className="space-y-6">
            {/* Check-in Methods */}
            <div className="flex flex-wrap gap-4">
              <button
                onClick={() => {
                  setQrScannerActive(!qrScannerActive);
                  setManualCheckIn(false);
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  qrScannerActive
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <QrCode className="w-4 h-4" />
                Scanner QR Code
              </button>
              
              <button
                onClick={() => {
                  setManualCheckIn(!manualCheckIn);
                  setQrScannerActive(false);
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  manualCheckIn
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Smartphone className="w-4 h-4" />
                Check-in Manual
              </button>
            </div>

            {/* QR Scanner */}
            {qrScannerActive && (
              <div className="bg-gray-50 p-6 rounded-lg text-center">
                <Camera className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Scanner QR Code</h3>
                <p className="text-gray-600 mb-4">
                  Posicione o QR code do participante na frente da câmera
                </p>
                <div className="bg-white p-4 rounded-lg border-2 border-dashed border-gray-300 max-w-sm mx-auto">
                  <div className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center">
                    <p className="text-gray-500">Área de escaneamento</p>
                  </div>
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  Funcionalidade de câmera seria implementada aqui
                </p>
              </div>
            )}

            {/* Manual Check-in */}
            {manualCheckIn && (
              <div className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Buscar participante por nome, email ou telefone..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>

                <div className="grid gap-3 max-h-96 overflow-y-auto">
                  {filteredParticipants.map(participant => {
                    const client = clients.find(c => c.id === participant.client_id);
                    if (!client) return null;

                    return (
                      <div
                        key={participant.id}
                        className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                              <span className="text-sm font-medium text-gray-700">
                                {client.name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            
                            <div>
                              <h3 className="font-medium text-gray-900">{client.name}</h3>
                              <p className="text-sm text-gray-600">{client.email}</p>
                              {client.phone && (
                                <p className="text-sm text-gray-600">{client.phone}</p>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            getStatusColor(participant.status, !!participant.checked_in_at)
                          }`}>
                            {getStatusText(participant.status, !!participant.checked_in_at)}
                          </span>
                          
                          {participant.checked_in_at ? (
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-500">
                                {new Date(participant.checked_in_at).toLocaleString('pt-BR')}
                              </span>
                              <button
                                onClick={() => handleUndoCheckIn(participant.id)}
                                disabled={loading}
                                className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
                                title="Desfazer check-in"
                              >
                                <UserX className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => handleCheckIn(participant.id)}
                              disabled={loading || participant.status !== 'confirmed'}
                              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                              <UserCheck className="w-4 h-4" />
                              Check-in
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Selected Participant for QR */}
            {selectedParticipant && (
              <div className="bg-blue-50 p-6 rounded-lg">
                <h3 className="text-lg font-medium text-blue-900 mb-4">Participante Selecionado</h3>
                {(() => {
                  const client = clients.find(c => c.id === selectedParticipant.client_id);
                  return client ? (
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-gray-900">{client.name}</h4>
                        <p className="text-sm text-gray-600">{client.email}</p>
                        <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium mt-2 ${
                          getStatusColor(selectedParticipant.status, !!selectedParticipant.checked_in_at)
                        }`}>
                          {getStatusText(selectedParticipant.status, !!selectedParticipant.checked_in_at)}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        {selectedParticipant.checked_in_at ? (
                          <div className="text-center">
                            <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
                            <p className="text-sm text-green-600 font-medium">Check-in Realizado</p>
                            <p className="text-xs text-gray-500">
                              {new Date(selectedParticipant.checked_in_at).toLocaleString('pt-BR')}
                            </p>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleCheckIn(selectedParticipant.id)}
                            disabled={loading || selectedParticipant.status !== 'confirmed'}
                            className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                          >
                            <UserCheck className="w-5 h-5" />
                            Confirmar Check-in
                          </button>
                        )}
                      </div>
                    </div>
                  ) : null;
                })()}
              </div>
            )}
          </div>
        )}

        {activeTab === 'list' && (
          <div className="space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Buscar participante..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>

            {/* Participants Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Participante</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Status</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Check-in</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">QR Code</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredParticipants.map(participant => {
                    const client = clients.find(c => c.id === participant.client_id);
                    if (!client) return null;

                    return (
                      <tr key={participant.id} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                              <span className="text-xs font-medium text-gray-700">
                                {client.name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{client.name}</p>
                              <p className="text-sm text-gray-600">{client.email}</p>
                            </div>
                          </div>
                        </td>
                        
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            getStatusColor(participant.status, !!participant.checked_in_at)
                          }`}>
                            {getStatusText(participant.status, !!participant.checked_in_at)}
                          </span>
                        </td>
                        
                        <td className="py-3 px-4">
                          {participant.checked_in_at ? (
                            <div>
                              <CheckCircle className="w-5 h-5 text-green-600 mb-1" />
                              <p className="text-xs text-gray-500">
                                {new Date(participant.checked_in_at).toLocaleString('pt-BR')}
                              </p>
                            </div>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        
                        <td className="py-3 px-4">
                          <img
                            src={generateQRCode(participant.id)}
                            alt="QR Code"
                            className="w-12 h-12 border rounded"
                          />
                        </td>
                        
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            {participant.checked_in_at ? (
                              <button
                                onClick={() => handleUndoCheckIn(participant.id)}
                                disabled={loading}
                                className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
                                title="Desfazer check-in"
                              >
                                <UserX className="w-4 h-4" />
                              </button>
                            ) : (
                              <button
                                onClick={() => handleCheckIn(participant.id)}
                                disabled={loading || participant.status !== 'confirmed'}
                                className="p-1 text-green-600 hover:text-green-800 hover:bg-green-50 rounded transition-colors disabled:opacity-50"
                                title="Fazer check-in"
                              >
                                <UserCheck className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'stats' && (
          <div className="space-y-6">
            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-gradient-to-r from-green-500 to-green-600 p-6 rounded-lg text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-green-100">Taxa de Check-in</p>
                    <p className="text-3xl font-bold">{checkInRate.toFixed(1)}%</p>
                  </div>
                  <CheckCircle className="w-12 h-12 text-green-200" />
                </div>
              </div>
              
              <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-6 rounded-lg text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-100">Total de Participantes</p>
                    <p className="text-3xl font-bold">{participants.length}</p>
                  </div>
                  <Users className="w-12 h-12 text-blue-200" />
                </div>
              </div>
              
              <div className="bg-gradient-to-r from-purple-500 to-purple-600 p-6 rounded-lg text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-purple-100">Check-ins Realizados</p>
                    <p className="text-3xl font-bold">{checkedInCount}</p>
                  </div>
                  <UserCheck className="w-12 h-12 text-purple-200" />
                </div>
              </div>
            </div>

            {/* Detailed Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gray-50 p-6 rounded-lg">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Status dos Participantes</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Confirmados</span>
                    <div className="flex items-center gap-2">
                      <div className="w-20 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full" 
                          style={{ width: `${participants.length > 0 ? (confirmedCount / participants.length) * 100 : 0}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium">{confirmedCount}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Pendentes</span>
                    <div className="flex items-center gap-2">
                      <div className="w-20 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-yellow-600 h-2 rounded-full" 
                          style={{ width: `${participants.length > 0 ? (pendingCount / participants.length) * 100 : 0}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium">{pendingCount}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Check-in Feito</span>
                    <div className="flex items-center gap-2">
                      <div className="w-20 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-green-600 h-2 rounded-full" 
                          style={{ width: `${participants.length > 0 ? (checkedInCount / participants.length) * 100 : 0}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium">{checkedInCount}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="bg-gray-50 p-6 rounded-lg">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Horários de Check-in</h3>
                <div className="space-y-2">
                  {participants
                    .filter(p => p.checked_in_at)
                    .sort((a, b) => new Date(b.checked_in_at!).getTime() - new Date(a.checked_in_at!).getTime())
                    .slice(0, 5)
                    .map(participant => {
                      const client = clients.find(c => c.id === participant.client_id);
                      return client ? (
                        <div key={participant.id} className="flex items-center justify-between text-sm">
                          <span className="text-gray-900">{client.name}</span>
                          <span className="text-gray-600">
                            {new Date(participant.checked_in_at!).toLocaleTimeString('pt-BR', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                      ) : null;
                    })}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DigitalCheckIn;