import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { X, Save, Calendar, Clock, MapPin, Users, DollarSign, Tag, Mail, Phone, Info, Plus, Trash2, Video, AlertCircle } from 'lucide-react';
import { Event, PriceBatch } from '../../shared/types/types/event';
import { useSupabaseEventTypes } from '../../shared/hooks/hooks/useSupabaseEventTypes';
import ImageUpload from '../shared/ImageUpload';
import VideoUpload from '../shared/VideoUpload';
import { toast } from 'sonner';
import { PhoneInput } from '../ui/PhoneInput';

interface LocalPriceBatch {
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
  
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    clearErrors,
    formState: { errors, isSubmitting, isValid }
  } = useForm<Event>({
    defaultValues: {
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
      event_type_id: '',
      contact_email: '',
      contact_phone: '',
      additional_info: '',
      image_url: '',
      videos: []
    }
  });

  const [priceBatches, setPriceBatches] = useState<LocalPriceBatch[]>([]);

  useEffect(() => {
    if (event) {
      setValue('title', event.title || '');
      setValue('description', event.description || '');
      setValue('event_type', event.event_type || '');
      setValue('event_date', event.event_date || '');
      setValue('event_time', event.event_time || '');
      setValue('end_date', event.end_date || '');
      setValue('end_time', event.end_time || '');
      setValue('location', event.location || '');
      setValue('location_link', event.location_link || '');
      setValue('max_guests', event.max_guests || 0);
      setValue('status', event.status || 'draft');
      setValue('is_public', event.is_public ?? true);
      setValue('requires_approval', event.requires_approval ?? false);
      setValue('event_type_id', event.event_type_id || '');
      setValue('contact_email', event.contact_email || '');
      setValue('contact_phone', event.contact_phone || '');
      setValue('additional_info', event.additional_info || '');
      setValue('image_url', event.image_url || '');
      setValue('videos', event.videos || []);
      
      // Load price batches if available
      if (event.price_batches && Array.isArray(event.price_batches)) {
        setPriceBatches(event.price_batches);
      }
    }
  }, [event, setValue]);

  const addPriceBatch = () => {
    const currentBatches = [...priceBatches];
    
    // Se é o primeiro lote, nomeia como "Lote Único"
    if (currentBatches.length === 0) {
      const newBatch: LocalPriceBatch = {
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
      const newBatch: LocalPriceBatch = {
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



  const onSubmit = async (data: Event) => {
    try {
      const eventData: Partial<Event> = {
        ...data,
        price_batches: priceBatches as PriceBatch[]
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
    setValue(field, value);
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
        setValue('image_url', imageUrl);
        resolve(imageUrl);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleImageRemove = () => {
    setValue('image_url', '');
  };

  const handleVideoUpload = async (file: File): Promise<string> => {
    // Simular upload de vídeo - aqui você implementaria a lógica real de upload
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        const videoUrl = reader.result as string;
        const currentVideos = watch('videos') || [];
        setValue('videos', [...currentVideos, videoUrl]);
        resolve(videoUrl);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleVideoRemove = () => {
    setValue('videos', []);
  };

  // Carregar tipos de eventos ativos ao montar o componente
  useEffect(() => {
    fetchEventTypes(true); // Buscar apenas tipos ativos
  }, []);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] flex flex-col">
        <form id="event-form" onSubmit={handleSubmit(onSubmit)} className="flex flex-col max-h-[90vh]">
          {/* Header fixo */}
          <div className="p-6 border-b border-gray-200 flex-shrink-0">
            <div className="flex justify-between items-center">
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
          </div>

          {/* Conteúdo scrollável */}
          <div className="flex-1 overflow-y-auto p-6 min-h-0">

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Coluna Esquerda */}
              <div className="space-y-6">
                {/* Informações Básicas */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Info className="w-5 h-5" />
                    Informações Básicas
                  </h3>

                  {/* Nome do Evento */}
                  <div className="mb-4">
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                      Nome do Evento *
                    </label>
                    <input
                      {...register('title', { required: 'Nome do evento é obrigatório' })}
                      type="text"
                      id="title"
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                        errors.title ? 'border-red-500 bg-red-50' : 'border-gray-300'
                      }`}
                      placeholder="Digite o nome do evento"
                      disabled={isSubmitting}
                    />
                    {errors.title && (
                      <div className="flex items-center gap-1 mt-1 text-red-600">
                        <AlertCircle className="w-4 h-4" />
                        <span className="text-sm">{errors.title.message}</span>
                      </div>
                    )}
                  </div>

                  {/* Descrição */}
                  <div className="mb-4">
                    <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                      Descrição do Evento *
                    </label>
                    <textarea
                      {...register('description', { required: 'Descrição é obrigatória' })}
                      id="description"
                      rows={6}
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors resize-none ${
                        errors.description ? 'border-red-500 bg-red-50' : 'border-gray-300'
                      }`}
                      placeholder="Descrição detalhada do evento"
                      disabled={isSubmitting}
                    />
                    {errors.description && (
                      <div className="flex items-center gap-1 mt-1 text-red-600">
                        <AlertCircle className="w-4 h-4" />
                        <span className="text-sm">{errors.description.message}</span>
                      </div>
                    )}
                  </div>

                  {/* Tipo Evento */}
                  <div className="mb-4">
                    <label htmlFor="event_type_id" className="block text-sm font-medium text-gray-700 mb-2">
                      Tipo Evento
                    </label>
                    <select
                      {...register('event_type_id')}
                      id="event_type_id"
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                        errors.event_type_id ? 'border-red-500 bg-red-50' : 'border-gray-300'
                      }`}
                      disabled={isSubmitting}
                    >
                      <option value="">Selecione um tipo de evento</option>
                      {eventTypes.map((eventType) => (
                        <option key={eventType.id} value={eventType.id}>
                          {eventType.name}
                        </option>
                      ))}
                    </select>
                    {errors.event_type_id && (
                      <div className="flex items-center gap-1 mt-1 text-red-600">
                        <AlertCircle className="w-4 h-4" />
                        <span className="text-sm">{errors.event_type_id.message}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Data e Hora */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Calendar className="w-5 h-5" />
                    Data e Hora
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Data de Início */}
                    <div>
                      <label htmlFor="event_date" className="block text-sm font-medium text-gray-700 mb-2">
                        Data de Início *
                      </label>
                      <input
                        {...register('event_date', { required: 'Data de início é obrigatória' })}
                        type="date"
                        id="event_date"
                        className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                          errors.event_date ? 'border-red-500 bg-red-50' : 'border-gray-300'
                        }`}
                        disabled={isSubmitting}
                      />
                      {errors.event_date && (
                        <div className="flex items-center gap-1 mt-1 text-red-600">
                          <AlertCircle className="w-4 h-4" />
                          <span className="text-sm">{errors.event_date.message}</span>
                        </div>
                      )}
                    </div>

                    {/* Horário de Início */}
                    <div>
                      <label htmlFor="event_time" className="block text-sm font-medium text-gray-700 mb-2">
                        Horário de Início *
                      </label>
                      <input
                        {...register('event_time', { required: 'Horário de início é obrigatório' })}
                        type="time"
                        id="event_time"
                        className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                          errors.event_time ? 'border-red-500 bg-red-50' : 'border-gray-300'
                        }`}
                        disabled={isSubmitting}
                      />
                      {errors.event_time && (
                        <div className="flex items-center gap-1 mt-1 text-red-600">
                          <AlertCircle className="w-4 h-4" />
                          <span className="text-sm">{errors.event_time.message}</span>
                        </div>
                      )}
                    </div>

                    {/* Data de Término */}
                    <div>
                      <label htmlFor="end_date" className="block text-sm font-medium text-gray-700 mb-2">
                        Data de Término
                      </label>
                      <input
                        {...register('end_date')}
                        type="date"
                        id="end_date"
                        className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                          errors.end_date ? 'border-red-500 bg-red-50' : 'border-gray-300'
                        }`}
                        disabled={isSubmitting}
                      />
                      {errors.end_date && (
                        <div className="flex items-center gap-1 mt-1 text-red-600">
                          <AlertCircle className="w-4 h-4" />
                          <span className="text-sm">{errors.end_date.message}</span>
                        </div>
                      )}
                    </div>

                    {/* Horário de Término */}
                    <div>
                      <label htmlFor="end_time" className="block text-sm font-medium text-gray-700 mb-2">
                        Horário de Término
                      </label>
                      <input
                        {...register('end_time')}
                        type="time"
                        id="end_time"
                        className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                          errors.end_time ? 'border-red-500 bg-red-50' : 'border-gray-300'
                        }`}
                        disabled={isSubmitting}
                      />
                      {errors.end_time && (
                        <div className="flex items-center gap-1 mt-1 text-red-600">
                          <AlertCircle className="w-4 h-4" />
                          <span className="text-sm">{errors.end_time.message}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Local */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <MapPin className="w-5 h-5" />
                    Local
                  </h3>

                  {/* Endereço */}
                  <div className="mb-4">
                    <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-2">
                      Endereço *
                    </label>
                    <input
                      {...register('location', { required: 'Local é obrigatório' })}
                      type="text"
                      id="location"
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                        errors.location ? 'border-red-500 bg-red-50' : 'border-gray-300'
                      }`}
                      placeholder="Endereço completo do evento"
                      disabled={isSubmitting}
                    />
                    {errors.location && (
                      <div className="flex items-center gap-1 mt-1 text-red-600">
                        <AlertCircle className="w-4 h-4" />
                        <span className="text-sm">{errors.location.message}</span>
                      </div>
                    )}
                  </div>

                  {/* Link do Local */}
                  <div>
                    <label htmlFor="location_link" className="block text-sm font-medium text-gray-700 mb-2">
                      Link do Local (Google Maps, etc.)
                    </label>
                    <input
                      {...register('location_link')}
                      type="url"
                      id="location_link"
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                        errors.location_link ? 'border-red-500 bg-red-50' : 'border-gray-300'
                      }`}
                      placeholder="https://maps.google.com/..."
                      disabled={isSubmitting}
                    />
                    {errors.location_link && (
                      <div className="flex items-center gap-1 mt-1 text-red-600">
                        <AlertCircle className="w-4 h-4" />
                        <span className="text-sm">{errors.location_link.message}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Coluna Direita */}
              <div className="space-y-6">
                {/* Participantes */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Participantes
                  </h3>

                  <div>
                      <label htmlFor="max_guests" className="block text-sm font-medium text-gray-700 mb-2">
                        Máximo de Participantes
                      </label>
                    <input
                        {...register('max_guests', { valueAsNumber: true })}
                        type="number"
                        id="max_guests"
                        min="0"
                        className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                          errors.max_guests ? 'border-red-500 bg-red-50' : 'border-gray-300'
                        }`}
                        placeholder="0 = ilimitado"
                        disabled={isSubmitting}
                      />
                      {errors.max_guests && (
                        <div className="flex items-center gap-1 mt-1 text-red-600">
                          <AlertCircle className="w-4 h-4" />
                          <span className="text-sm">{errors.max_guests.message}</span>
                        </div>
                      )}
                  </div>
                </div>

                {/* Lotes de Preços */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                      <DollarSign className="w-5 h-5" />
                      Lotes de Preços
                    </h3>
                    <button
                      type="button"
                      onClick={addPriceBatch}
                      disabled={isSubmitting}
                      className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                    >
                      <Plus className="w-4 h-4" />
                      Adicionar Lote
                    </button>
                  </div>

                  <div className="space-y-4">
                    {priceBatches.map((batch, index) => (
                      <div key={batch.id} className="border border-gray-200 rounded-lg p-4 bg-white">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-medium text-gray-900">{batch.name}</h4>
                          {priceBatches.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removePriceBatch(batch.id)}
                              disabled={isSubmitting}
                              className="text-red-600 hover:text-red-800 transition-colors disabled:opacity-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {/* Nome do Lote */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Nome do Lote *
                            </label>
                            <input
                              type="text"
                              value={batch.name}
                              onChange={(e) => updatePriceBatch(batch.id, 'name', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                              placeholder="Ex: Lote Promocional"
                              disabled={isSubmitting}
                            />
                          </div>

                          {/* Preço */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Preço (R$) *
                            </label>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={batch.price}
                              onChange={(e) => updatePriceBatch(batch.id, 'price', parseFloat(e.target.value) || 0)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                              placeholder="0.00"
                              disabled={isSubmitting}
                            />
                          </div>

                          {/* Data de Início */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Início da Vigência *
                            </label>
                            <input
                              type="datetime-local"
                              value={batch.start_date}
                              onChange={(e) => updatePriceBatch(batch.id, 'start_date', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                              disabled={isSubmitting}
                            />
                          </div>

                          {/* Data de Fim */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Fim da Vigência
                            </label>
                            <input
                              type="datetime-local"
                              value={batch.end_date || ''}
                              onChange={(e) => updatePriceBatch(batch.id, 'end_date', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                              disabled={isSubmitting}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {priceBatches.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <DollarSign className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>Nenhum lote de preço adicionado</p>
                      <p className="text-sm">Clique em "Adicionar Lote" para começar</p>
                    </div>
                  )}
                </div>

                {/* Contato */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Mail className="w-5 h-5" />
                    Contato
                  </h3>

                  <div className="space-y-4">
                    {/* Email */}
                    <div>
                      <label htmlFor="contact_email" className="block text-sm font-medium text-gray-700 mb-2">
                        Email de Contato
                      </label>
                      <input
                        {...register('contact_email')}
                        type="email"
                        id="contact_email"
                        className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                          errors.contact_email ? 'border-red-500 bg-red-50' : 'border-gray-300'
                        }`}
                        placeholder="contato@exemplo.com"
                        disabled={isSubmitting}
                      />
                      {errors.contact_email && (
                        <div className="flex items-center gap-1 mt-1 text-red-600">
                          <AlertCircle className="w-4 h-4" />
                          <span className="text-sm">{errors.contact_email.message}</span>
                        </div>
                      )}
                    </div>

                    {/* Telefone */}
                    <div>
                      <label htmlFor="contact_phone" className="block text-sm font-medium text-gray-700 mb-2">
                        Telefone de Contato
                      </label>
                      <PhoneInput
                        value={watch('contact_phone')}
                        onChange={(value) => setValue('contact_phone', value)}
                        placeholder="(11) 99999-9999"
                        error={!!errors.contact_phone}
                        disabled={isSubmitting}
                      />
                      {errors.contact_phone && (
                        <div className="flex items-center gap-1 mt-1 text-red-600">
                          <AlertCircle className="w-4 h-4" />
                          <span className="text-sm">{errors.contact_phone.message}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Configurações */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Tag className="w-5 h-5" />
                    Configurações
                  </h3>

                  <div className="space-y-4">
                    {/* Status */}
                    <div>
                      <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-2">
                        Status
                      </label>
                      <select
                        {...register('status')}
                        id="status"
                        className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                          errors.status ? 'border-red-500 bg-red-50' : 'border-gray-300'
                        }`}
                        disabled={isSubmitting}
                      >
                        <option value="draft">Rascunho</option>
                        <option value="active">Ativo</option>
                        <option value="cancelled">Cancelado</option>
                        <option value="completed">Finalizado</option>
                      </select>
                      {errors.status && (
                        <div className="flex items-center gap-1 mt-1 text-red-600">
                          <AlertCircle className="w-4 h-4" />
                          <span className="text-sm">{errors.status.message}</span>
                        </div>
                      )}
                    </div>

                    {/* Checkboxes */}
                    <div className="space-y-3">
                      <label className="flex items-center gap-3">
                        <input
                          {...register('is_public')}
                          type="checkbox"
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          disabled={isSubmitting}
                        />
                        <span className="text-sm font-medium text-gray-700">
                          Evento público (visível para todos)
                        </span>
                      </label>

                      <label className="flex items-center gap-3">
                        <input
                          {...register('requires_approval')}
                          type="checkbox"
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          disabled={isSubmitting}
                        />
                        <span className="text-sm font-medium text-gray-700">
                          Requer aprovação para participar
                        </span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Informações Adicionais */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Informações Adicionais
                  </h3>

                  <div>
                    <label htmlFor="additional_info" className="block text-sm font-medium text-gray-700 mb-2">
                      Informações Extras
                    </label>
                    <textarea
                      {...register('additional_info')}
                      id="additional_info"
                      rows={4}
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors resize-none ${
                        errors.additional_info ? 'border-red-500 bg-red-50' : 'border-gray-300'
                      }`}
                      placeholder="Informações adicionais sobre o evento"
                      disabled={isSubmitting}
                    />
                    {errors.additional_info && (
                      <div className="flex items-center gap-1 mt-1 text-red-600">
                        <AlertCircle className="w-4 h-4" />
                        <span className="text-sm">{errors.additional_info.message}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Mídia */}
            <div className="mt-6 bg-gray-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Mídia do Evento
              </h3>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Upload de Imagem */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Imagem Principal
                  </label>
                  <ImageUpload
              onImageUpload={handleImageUpload}
              currentImage={watch('image_url')}
              onImageRemove={handleImageRemove}
            />
                </div>

                {/* Upload de Vídeos */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Vídeos do Evento
                  </label>
                  <VideoUpload
                    onVideoUpload={handleVideoUpload}
                    currentVideo={watch('videos')?.[0]}
                    onVideoRemove={handleVideoRemove}
                  />
                </div>
              </div>
            </div>

          </div>

          {/* Botões flutuantes fixos na parte inferior */}
          <div className="flex-shrink-0 bg-white border-t border-gray-200 p-6">
            <div className="flex gap-4">
              <button
                type="button"
                onClick={onCancel}
                disabled={isSubmitting}
                className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancelar
              </button>
              <button
                type="submit"
                form="event-form"
                disabled={isSubmitting || !isValid}
                className={`flex-1 px-6 py-3 rounded-lg transition-colors flex items-center justify-center gap-2 ${
                  isSubmitting || !isValid
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700'
                } text-white`}
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    {event ? 'Atualizar Evento' : 'Criar Evento'}
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EventForm;