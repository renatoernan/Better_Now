import React, { useState, useEffect } from 'react';
import { X, Save, Calendar, Clock, MapPin, Users, DollarSign, Tag, Mail, Phone, Info, Plus, Trash2, Video } from 'lucide-react';
import { Event } from '../../hooks/useSupabaseEvents';
import { useSupabaseEventTypes } from '../../hooks/useSupabaseEventTypes';
import ImageUpload from './ImageUpload';
import VideoUpload from './VideoUpload';
import { toast } from 'sonner';

interface PriceBatch {
  id: string;
  name: string;
  price: number;
  start_date: string;
  end_date?: string;
}

interface EventFormProps {
  event?: Event | null;
  onSave: (eventData: Partial<Event>) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

const EventForm: React.FC<EventFormProps> = ({
  event,
  onSave,
  onCancel,
  loading = false
}) => {
  const { eventTypes, fetchEventTypes } = useSupabaseEventTypes();
  const [formData, setFormData] = useState<Partial<Event>>({
    title: '',
    description: '',
    event_type: '',
    event_date: '',
    event_time: '',
    end_date: '',
    end_time: '',
    location: '',
    location_link: '',
    max_guests: 0,
    status: 'draft',
    is_public: true,
    requires_approval: false,
    category: '',
    contact_email: '',
    contact_phone: '',
    additional_info: '',
    image_url: '',
    videos: []
  });

  const [priceBatches, setPriceBatches] = useState<PriceBatch[]>([]);


  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (event) {
      setFormData({
        title: event.title || '',
        description: event.description || '',
        event_type: event.event_type || '',
        event_date: event.event_date || '',
        event_time: event.event_time || '',
        end_date: event.end_date || '',
        end_time: event.end_time || '',
        location: event.location || '',
        location_link: event.location_link || '',
        max_guests: event.max_guests || 0,
        status: event.status || 'draft',
        is_public: event.is_public ?? true,
        requires_approval: event.requires_approval ?? false,
        category: event.category || '',
        contact_email: event.contact_email || '',
        contact_phone: event.contact_phone || '',
        additional_info: event.additional_info || '',
        image_url: event.image_url || '',
        videos: event.videos || []
      });
      
      // Load price batches if available
      if (event.price_batches && Array.isArray(event.price_batches)) {
        setPriceBatches(event.price_batches);
  
      }
    }
  }, [event]);

  const addPriceBatch = () => {
    const currentBatches = [...priceBatches];
    
    // Se é o primeiro lote, nomeia como "Lote Único"
    if (currentBatches.length === 0) {
      const newBatch: PriceBatch = {
        id: Date.now().toString(),
        name: 'Lote Único',
        price: 0,
        start_date: '',
        end_date: ''
      };
      setPriceBatches([newBatch]);
    } else {
      // Se já existe um lote e é "Lote Único", renomeia para "Lote 1"
      if (currentBatches.length === 1 && currentBatches[0].name === 'Lote Único') {
        currentBatches[0].name = 'Lote 1';
      }
      
      // Adiciona o novo lote com numeração sequencial
      const newBatch: PriceBatch = {
        id: Date.now().toString(),
        name: `Lote ${currentBatches.length + 1}`,
        price: 0,
        start_date: '',
        end_date: ''
      };
      setPriceBatches([...currentBatches, newBatch]);
    }
  };

  const removePriceBatch = (id: string) => {
    const updatedBatches = priceBatches.filter(batch => batch.id !== id);
    
    // Se sobrou apenas um lote e não é "Lote Único", renomeia para "Lote Único"
    if (updatedBatches.length === 1 && updatedBatches[0].name !== 'Lote Único') {
      updatedBatches[0].name = 'Lote Único';
    }
    
    setPriceBatches(updatedBatches);
  };

  const updatePriceBatch = (id: string, field: keyof PriceBatch, value: any) => {
    setPriceBatches(priceBatches.map(batch => 
      batch.id === id ? { ...batch, [field]: value } : batch
    ));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title?.trim()) {
      newErrors.title = 'Título é obrigatório';
    }

    if (!formData.event_date) {
      newErrors.event_date = 'Data de início é obrigatória';
    } else {
      const eventDate = new Date(formData.event_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (eventDate < today) {
        newErrors.event_date = 'Data de início não pode ser no passado';
      }
    }

    if (formData.end_date) {
      const startDate = new Date(formData.event_date || '');
      const endDate = new Date(formData.end_date);
      
      if (endDate < startDate) {
        newErrors.end_date = 'Data de término deve ser posterior à data de início';
      }
    }

    if (formData.event_time && formData.end_time && formData.event_date === formData.end_date) {
      const startTime = formData.event_time;
      const endTime = formData.end_time;
      
      if (endTime <= startTime) {
        newErrors.end_time = 'Hora de término deve ser posterior à hora de início';
      }
    }

    if (priceBatches.length === 0) {
      newErrors.price_batches = 'Adicione pelo menos um lote de preços';
    } else {
      priceBatches.forEach((batch, index) => {
        if (!batch.name.trim()) {
          newErrors[`batch_name_${index}`] = 'Nome do lote é obrigatório';
        }
        if (batch.price < 0) {
          newErrors[`batch_price_${index}`] = 'Preço deve ser positivo';
        }
        if (!batch.start_date) {
          newErrors[`batch_start_date_${index}`] = 'Data de início da vigência é obrigatória';
        }
      });
    }

    if (!formData.event_type?.trim()) {
      newErrors.event_type = 'Tipo de evento é obrigatório';
    }

    if (!formData.location?.trim()) {
      newErrors.location = 'Local é obrigatório';
    }

    if (formData.max_guests && formData.max_guests < 0) {
      newErrors.max_guests = 'Número máximo de participantes deve ser positivo';
    }



    if (formData.contact_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.contact_email)) {
      newErrors.contact_email = 'Email inválido';
    }

    if (formData.location_link && formData.location_link.trim()) {
      try {
        new URL(formData.location_link);
      } catch {
        newErrors.location_link = 'URL inválida';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Por favor, corrija os erros no formulário');
      return;
    }

    try {
      const eventData = {
        ...formData,
        price_batches: priceBatches
      };
      await onSave(eventData);
    } catch (error) {
      console.error('Erro ao salvar evento:', error);
      toast.error('Erro ao salvar evento');
    }
  };

  const formatPhoneNumber = (value: string): string => {
    // Remove todos os caracteres não numéricos
    const numbers = value.replace(/\D/g, '');
    
    // Limita a 11 dígitos
    const limitedNumbers = numbers.slice(0, 11);
    
    // Aplica a máscara baseada no número de dígitos
    if (limitedNumbers.length <= 10) {
      // Formato para telefone fixo: (XX) XXXX-XXXX
      return limitedNumbers.replace(/(\d{2})(\d{4})(\d{0,4})/, (match, p1, p2, p3) => {
        if (p3) return `(${p1}) ${p2}-${p3}`;
        if (p2) return `(${p1}) ${p2}`;
        if (p1) return `(${p1}`;
        return match;
      });
    } else {
      // Formato para celular: (XX) XXXXX-XXXX
      return limitedNumbers.replace(/(\d{2})(\d{5})(\d{0,4})/, (match, p1, p2, p3) => {
        if (p3) return `(${p1}) ${p2}-${p3}`;
        if (p2) return `(${p1}) ${p2}`;
        if (p1) return `(${p1}`;
        return match;
      });
    }
  };

  const handleInputChange = (field: keyof Event, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handlePhoneChange = (value: string) => {
    const formattedPhone = formatPhoneNumber(value);
    handleInputChange('contact_phone', formattedPhone);
  };

  const handleImageUpload = async (file: File): Promise<string> => {
    // Simular upload de imagem - aqui você implementaria a lógica real de upload
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        const imageUrl = reader.result as string;
        setFormData(prev => ({ ...prev, image_url: imageUrl }));
        resolve(imageUrl);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleImageRemove = () => {
    setFormData(prev => ({ ...prev, image_url: '' }));
  };

  const handleVideoUpload = async (file: File): Promise<string> => {
    // Simular upload de vídeo - aqui você implementaria a lógica real de upload
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        const videoUrl = reader.result as string;
        setFormData(prev => ({ 
          ...prev, 
          videos: [...(prev.videos || []), videoUrl] 
        }));
        resolve(videoUrl);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleVideoRemove = (videoUrl: string) => {
    setFormData(prev => ({ 
      ...prev, 
      videos: (prev.videos || []).filter(url => url !== videoUrl) 
    }));
  };

  // Carregar tipos de eventos ativos ao montar o componente
  useEffect(() => {
    fetchEventTypes(true); // Buscar apenas tipos ativos
  }, []);

  const categories = [
    'Tecnologia',
    'Negócios',
    'Saúde',
    'Educação',
    'Arte e Cultura',
    'Esportes',
    'Entretenimento',
    'Ciência',
    'Meio Ambiente',
    'Outro'
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[95vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <div className="p-6">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                {event ? 'Editar Evento' : 'Novo Evento'}
              </h2>
              <button
                type="button"
                onClick={onCancel}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column - Basic Info */}
              <div className="lg:col-span-2 space-y-6">
                {/* Title and Type */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Tag className="w-4 h-4 inline mr-1" />
                      Título *
                    </label>
                    <input
                      type="text"
                      value={formData.title || ''}
                      onChange={(e) => handleInputChange('title', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                        errors.title ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Nome do evento"
                    />
                    {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tipo de Evento *
                    </label>
                    <select
                      value={formData.event_type || ''}
                      onChange={(e) => handleInputChange('event_type', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                        errors.event_type ? 'border-red-500' : 'border-gray-300'
                      }`}
                    >
                      <option value="">Selecione o tipo</option>
                      {eventTypes.filter(type => type.active).map(type => (
                        <option key={type.id} value={type.name}>
                          {type.name}
                        </option>
                      ))}
                    </select>
                    {errors.event_type && <p className="text-red-500 text-xs mt-1">{errors.event_type}</p>}
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Descrição
                  </label>
                  <textarea
                    value={formData.description || ''}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    placeholder="Descreva o evento, objetivos, público-alvo, etc."
                  />
                </div>

                {/* Date and Time */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Calendar className="w-4 h-4 inline mr-1" />
                      Data de Início *
                    </label>
                    <input
                      type="date"
                      value={formData.event_date || ''}
                      onChange={(e) => handleInputChange('event_date', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                        errors.event_date ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                    {errors.event_date && <p className="text-red-500 text-xs mt-1">{errors.event_date}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Data de Término
                    </label>
                    <input
                      type="date"
                      value={formData.end_date || ''}
                      onChange={(e) => handleInputChange('end_date', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                        errors.end_date ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                    {errors.end_date && <p className="text-red-500 text-xs mt-1">{errors.end_date}</p>}
                  </div>
                </div>

                {/* Time */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Clock className="w-4 h-4 inline mr-1" />
                      Hora de Início
                    </label>
                    <input
                      type="time"
                      value={formData.event_time || ''}
                      onChange={(e) => handleInputChange('event_time', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Hora de Término
                    </label>
                    <input
                      type="time"
                      value={formData.end_time || ''}
                      onChange={(e) => handleInputChange('end_time', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                        errors.end_time ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                    {errors.end_time && <p className="text-red-500 text-xs mt-1">{errors.end_time}</p>}
                  </div>
                </div>

                {/* Location */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <MapPin className="w-4 h-4 inline mr-1" />
                    Local *
                  </label>
                  <textarea
                    value={formData.location || ''}
                    onChange={(e) => handleInputChange('location', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors resize-vertical ${
                      errors.location ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Endereço completo ou nome do local"
                    rows={3}
                  />
                  {errors.location && <p className="text-red-500 text-xs mt-1">{errors.location}</p>}
                </div>

                {/* Location Link */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <MapPin className="w-4 h-4 inline mr-1" />
                    Link do Endereço (Mapa)
                  </label>
                  <input
                    type="url"
                    value={formData.location_link || ''}
                    onChange={(e) => handleInputChange('location_link', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                      errors.location_link ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="https://maps.google.com/... ou outro link de mapa"
                  />
                  {errors.location_link && <p className="text-red-500 text-xs mt-1">{errors.location_link}</p>}
                </div>

                {/* Capacity */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Users className="w-4 h-4 inline mr-1" />
                      Máx. Participantes
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.max_guests || ''}
                      onChange={(e) => handleInputChange('max_guests', parseInt(e.target.value) || 0)}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                        errors.max_guests ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="0 = ilimitado"
                    />
                    {errors.max_guests && <p className="text-red-500 text-xs mt-1">{errors.max_guests}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Status
                    </label>
                    <select
                      value={formData.status || 'draft'}
                      onChange={(e) => handleInputChange('status', e.target.value as Event['status'])}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    >
                      <option value="draft">Rascunho</option>
                      <option value="active">Ativo</option>
                      <option value="cancelled">Cancelado</option>
                      <option value="completed">Concluído</option>
                    </select>
                  </div>
                </div>

                {/* Sistema de Preços */}
                <div className="space-y-4">
                  <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium text-gray-700">Lotes de Preços</h4>
                        <button
                          type="button"
                          onClick={addPriceBatch}
                          className="flex items-center px-3 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          <Plus className="w-4 h-4 mr-1" />
                          Adicionar Lote
                        </button>
                      </div>

                      {errors.price_batches && (
                        <p className="text-red-600 text-sm">{errors.price_batches}</p>
                      )}

                      <div className="space-y-3">
                        {priceBatches.map((batch, index) => (
                          <div key={batch.id} className="p-4 border border-gray-200 rounded-lg bg-gray-50">
                            <div className="flex items-center justify-between mb-3">
                              <h5 className="font-medium text-gray-700">Lote {index + 1}</h5>
                              <button
                                type="button"
                                onClick={() => removePriceBatch(batch.id)}
                                className="text-red-600 hover:text-red-800 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">
                                  Nome do Lote
                                </label>
                                <input
                                  type="text"
                                  value={batch.name}
                                  onChange={(e) => updatePriceBatch(batch.id, 'name', e.target.value)}
                                  className={`w-full px-2 py-1 text-sm border rounded focus:ring-1 focus:ring-blue-500 ${
                                    errors[`batch_name_${index}`] ? 'border-red-500' : 'border-gray-300'
                                  }`}
                                  placeholder="Ex: 1º Lote"
                                />
                                {errors[`batch_name_${index}`] && (
                                  <p className="text-red-500 text-xs mt-1">{errors[`batch_name_${index}`]}</p>
                                )}
                              </div>
                              
                              <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">
                                  Preço (R$)
                                </label>
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={batch.price}
                                  onChange={(e) => updatePriceBatch(batch.id, 'price', parseFloat(e.target.value) || 0)}
                                  className={`w-full px-2 py-1 text-sm border rounded focus:ring-1 focus:ring-blue-500 ${
                                    errors[`batch_price_${index}`] ? 'border-red-500' : 'border-gray-300'
                                  }`}
                                />
                                {errors[`batch_price_${index}`] && (
                                  <p className="text-red-500 text-xs mt-1">{errors[`batch_price_${index}`]}</p>
                                )}
                              </div>
                              
                              <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">
                                  Data de Início da Vigência
                                </label>
                                <input
                                  type="date"
                                  value={batch.start_date}
                                  onChange={(e) => updatePriceBatch(batch.id, 'start_date', e.target.value)}
                                  className={`w-full px-2 py-1 text-sm border rounded focus:ring-1 focus:ring-blue-500 ${
                                    errors[`batch_start_date_${index}`] ? 'border-red-500' : 'border-gray-300'
                                  }`}
                                />
                                {errors[`batch_start_date_${index}`] && (
                                  <p className="text-red-500 text-xs mt-1">{errors[`batch_start_date_${index}`]}</p>
                                )}
                              </div>
                              
                              <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">
                                  Data de Fim da Vigência
                                </label>
                                <input
                                  type="date"
                                  value={batch.end_date}
                                  onChange={(e) => updatePriceBatch(batch.id, 'end_date', e.target.value)}
                                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                  </div>
                </div>

                {/* Category */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Categoria
                  </label>
                  <select
                    value={formData.category || ''}
                    onChange={(e) => handleInputChange('category', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  >
                    <option value="">Selecione uma categoria</option>
                    {categories.map(category => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </div>

                {/* Contact Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Mail className="w-4 h-4 inline mr-1" />
                      Email de Contato
                    </label>
                    <input
                      type="email"
                      value={formData.contact_email || ''}
                      onChange={(e) => handleInputChange('contact_email', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                        errors.contact_email ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="contato@exemplo.com"
                    />
                    {errors.contact_email && <p className="text-red-500 text-xs mt-1">{errors.contact_email}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Phone className="w-4 h-4 inline mr-1" />
                      Telefone de Contato
                    </label>
                    <input
                      type="tel"
                      value={formData.contact_phone || ''}
                      onChange={(e) => handlePhoneChange(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                      placeholder="(11) 99999-9999"
                      maxLength={15}
                    />
                  </div>
                </div>

                {/* Additional Info */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Info className="w-4 h-4 inline mr-1" />
                    Informações Adicionais
                  </label>
                  <textarea
                    value={formData.additional_info || ''}
                    onChange={(e) => handleInputChange('additional_info', e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    placeholder="Informações extras, requisitos, materiais necessários, etc."
                  />
                </div>

                {/* Options */}
                <div className="flex flex-wrap gap-6">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.is_public || false}
                      onChange={(e) => handleInputChange('is_public', e.target.checked)}
                      className="mr-2 rounded"
                    />
                    <span className="text-sm text-gray-700">Evento público</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.requires_approval || false}
                      onChange={(e) => handleInputChange('requires_approval', e.target.checked)}
                      className="mr-2 rounded"
                    />
                    <span className="text-sm text-gray-700">Requer aprovação para inscrição</span>
                  </label>
                </div>
              </div>

              {/* Right Column - Image Upload */}
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Imagem do Evento
                  </label>
                  <ImageUpload
                    onImageUpload={handleImageUpload}
                    currentImage={formData.image_url}
                    onImageRemove={handleImageRemove}
                    placeholder="Adicionar imagem do evento"
                    maxSize={5}
                  />
                </div>

                {/* Video Upload Section */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Video className="w-4 h-4 inline mr-1" />
                    Vídeos do Evento
                  </label>
                  <div className="space-y-3">
                    {/* Existing Videos */}
                    {formData.videos && formData.videos.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs text-gray-600">Vídeos adicionados:</p>
                        {formData.videos.map((videoUrl, index) => (
                          <VideoUpload
                            key={index}
                            onVideoUpload={handleVideoUpload}
                            currentVideo={videoUrl}
                            onVideoRemove={() => handleVideoRemove(videoUrl)}
                            placeholder={`Vídeo ${index + 1}`}
                            maxSize={50}
                          />
                        ))}
                      </div>
                    )}
                    
                    {/* Add New Video */}
                    <VideoUpload
                      onVideoUpload={handleVideoUpload}
                      placeholder="Adicionar novo vídeo"
                      maxSize={50}
                    />
                  </div>
                </div>

                {/* Event Preview */}
                {formData.title && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="text-sm font-medium text-gray-900 mb-2">Preview</h3>
                    <div className="space-y-2 text-xs text-gray-600">
                      <p><strong>Título:</strong> {formData.title}</p>
                      {formData.event_type && <p><strong>Tipo:</strong> {formData.event_type}</p>}
                      {formData.event_date && <p><strong>Data:</strong> {new Date(formData.event_date).toLocaleDateString('pt-BR')}</p>}
                      {formData.event_time && <p><strong>Horário:</strong> {formData.event_time}</p>}
                      {formData.location && <p><strong>Local:</strong> {formData.location}</p>}
                      {formData.max_guests && formData.max_guests > 0 && <p><strong>Máx. Participantes:</strong> {formData.max_guests}</p>}

                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 px-6 py-4 bg-gray-50 border-t">
            <button
              type="button"
              onClick={onCancel}
              className="px-6 py-2 text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {loading ? 'Salvando...' : event ? 'Atualizar Evento' : 'Criar Evento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EventForm;