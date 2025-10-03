import React, { useState, useRef } from 'react';
import { Settings, Save, Globe, Bell, Shield, Database, Palette, Mail, Loader2, RefreshCw, AlertCircle, Clock, Upload, Eye, EyeOff, Trash2, RotateCcw, Move, X, Image as ImageIcon, Plus } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAppSettings, AppSettings } from '../../shared/hooks/hooks/useAppSettings';
import { 
  siteSettingsSchema, 
  contactSettingsSchema, 
  businessHoursSettingsSchema, 
  carouselSettingsSchema, 
  systemSettingsSchema,
  SiteSettings,
  ContactSettings,
  BusinessHoursSettings,
  CarouselSettings,
  SystemSettings
} from '../../shared/types/schemas/validationSchemas';
import { useSupabaseImages } from '../../shared/hooks/hooks/useSupabaseImages';
import { CarouselImage } from '../../shared/services/lib/supabase';
import { PhoneInput } from '../ui/PhoneInput';

type SettingsCategory = 'site' | 'contact' | 'business_hours' | 'carousel' | 'system';

const AdminSettings: React.FC = () => {
  const { settings, loading, saving, error, updateSetting, updateMultipleSettings, loadSettings } = useAppSettings();
  const [activeCategory, setActiveCategory] = useState<SettingsCategory>('site');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const {
    images,
    loading: imagesLoading,
    error: imagesError,
    loadImages,
    addImage,
    updateImage,
    toggleImage,
    moveToTrash,
    restoreImage,
    permanentlyDelete,
    reorderImages,
    getActiveImages,
    getDeletedImages
  } = useSupabaseImages();

  // Função para obter o schema correto baseado na categoria
  const getSchemaForCategory = (category: SettingsCategory) => {
    switch (category) {
      case 'site':
        return siteSettingsSchema;
      case 'contact':
        return contactSettingsSchema;
      case 'business_hours':
        return businessHoursSettingsSchema;
      case 'carousel':
        return carouselSettingsSchema;
      case 'system':
        return systemSettingsSchema;
      default:
        return siteSettingsSchema;
    }
  };

  // Função para obter valores padrão baseado na categoria
  const getDefaultValues = (category: SettingsCategory) => {
    if (!settings) return {};
    
    switch (category) {
      case 'site':
        return { site_title: settings.site_title || '' };
      case 'contact':
        return {
          contact_email: settings.contact_email || '',
          phone: settings.phone || '',
          address: settings.address || '',
          social_instagram: settings.social_instagram || '',
          social_whatsapp: settings.social_whatsapp || '',
        };
      case 'business_hours':
        return {
          business_hours_weekdays: settings.business_hours_weekdays || '',
          business_hours_weekend: settings.business_hours_weekend || '',
          business_hours_closed_days: settings.business_hours_closed_days || '',
        };
      case 'carousel':
        return {
          carousel_autoplay: settings.carousel_autoplay ?? true,
          carousel_interval: Math.round((settings.carousel_interval || 5000) / 1000), // Converter ms para s
          testimonial_carousel_interval: Math.round((settings.testimonial_carousel_interval || 8000) / 1000), // Converter ms para s
        };
      case 'system':
        return {
          max_file_size: settings.max_file_size || 5242880, // 5MB
          allowed_file_types: settings.allowed_file_types || ['image/jpeg', 'image/png', 'image/webp'],
          backup_retention_days: settings.backup_retention_days || 30,
          notification_email: settings.notification_email || '',
        };
      default:
        return {};
    }
  };

  // Configurar react-hook-form com schema dinâmico
  const form = useForm({
    resolver: zodResolver(getSchemaForCategory(activeCategory)),
    defaultValues: getDefaultValues(activeCategory),
    mode: 'onChange',
  });

  const { register, handleSubmit, formState: { errors, isDirty }, reset, watch } = form;

  // Resetar form quando categoria ou settings mudarem
  React.useEffect(() => {
    reset(getDefaultValues(activeCategory));
  }, [activeCategory, settings, reset]);

  // Função para salvar configurações da categoria
  const onSubmit = async (data: any) => {
    // Converter segundos para milissegundos antes de salvar (apenas para campos de carrossel)
    if (activeCategory === 'carousel') {
      const processedData = {
        ...data,
        carousel_interval: data.carousel_interval * 1000, // Converter s para ms
        testimonial_carousel_interval: data.testimonial_carousel_interval * 1000, // Converter s para ms
      };
      const success = await updateMultipleSettings(processedData);
      if (success) {
        reset(data); // Reset com valores em segundos para manter a interface
      }
    } else {
      const success = await updateMultipleSettings(data);
      if (success) {
        reset(data); // Reset para limpar isDirty
      }
    }
  };

  const getCategoryFields = (category: SettingsCategory): (keyof AppSettings)[] => {
    switch (category) {
      case 'site':
        return ['site_title'];
      case 'contact':
        return ['contact_email', 'phone', 'address', 'social_instagram', 'social_whatsapp'];
      case 'business_hours':
        return ['business_hours_weekdays', 'business_hours_weekend', 'business_hours_closed_days'];
      case 'carousel':
        return ['carousel_autoplay', 'carousel_interval', 'testimonial_carousel_interval'];
      case 'system':
        return ['max_file_size', 'allowed_file_types', 'backup_retention_days', 'notification_email'];
      default:
        return [];
    }
  };

  const formatFileSize = (bytes: number): string => {
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  const parseFileSize = (sizeStr: string): number => {
    const size = parseFloat(sizeStr);
    return size * 1024 * 1024;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-2 text-gray-600">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Carregando configurações...</span>
        </div>
      </div>
    );
  }

  if (error && !settings) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-center gap-2 text-red-800 mb-2">
          <Shield className="h-5 w-5" />
          <span className="font-semibold">Erro ao carregar configurações</span>
        </div>
        <p className="text-red-700 mb-4">{error}</p>
        <button
          onClick={loadSettings}
          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <RefreshCw className="h-4 w-4" />
          Tentar Novamente
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Configurações do Sistema
            </h1>
            <p className="text-gray-600">
              Gerencie as configurações gerais da aplicação
            </p>
          </div>
          <div className="mt-4 sm:mt-0 flex gap-2">
            <button
              onClick={loadSettings}
              disabled={loading}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Recarregar
            </button>
            <button
              onClick={handleSubmit(onSubmit)}
              disabled={!isDirty || saving}
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {saving ? 'Salvando...' : 'Salvar Alterações'}
            </button>
          </div>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6" aria-label="Tabs">
            {[
              { id: 'site', name: 'Site', icon: Globe },
              { id: 'contact', name: 'Contato', icon: Mail },
              { id: 'business_hours', name: 'Horários', icon: Clock },
              { id: 'carousel', name: 'Carrossel', icon: Palette },
              { id: 'system', name: 'Sistema', icon: Database }
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveCategory(tab.id as SettingsCategory)}
                  className={`${
                    activeCategory === tab.id
                      ? 'border-purple-500 text-purple-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.name}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Category Content */}
        <div className="p-6">
          {activeCategory === 'site' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Configurações do Site</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Título do Site
                </label>
                <input
                   type="text"
                   {...register('site_title')}
                   className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                     errors.site_title 
                       ? 'border-red-300 bg-red-50' 
                       : 'border-gray-300'
                   }`}
                   placeholder="Nome do seu site"
                 />
                 {errors.site_title && (
                   <div className="flex items-center gap-1 mt-1 text-red-600 text-sm">
                     <AlertCircle className="h-4 w-4" />
                     <span>{errors.site_title.message}</span>
                   </div>
                 )}
                <p className="text-sm text-gray-500 mt-1">
                  Este será o título principal exibido no site
                </p>
              </div>
            </div>
          )}

          {activeCategory === 'contact' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Informações de Contato</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email de Contato
                  </label>
                  <input
                     type="email"
                     {...register('contact_email')}
                     className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                       errors.contact_email 
                         ? 'border-red-300 bg-red-50' 
                         : 'border-gray-300'
                     }`}
                     placeholder="contato@exemplo.com"
                   />
                   {errors.contact_email && (
                     <div className="flex items-center gap-1 mt-1 text-red-600 text-sm">
                       <AlertCircle className="h-4 w-4" />
                       <span>{errors.contact_email.message}</span>
                     </div>
                   )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Telefone
                  </label>
                  <PhoneInput
                     {...register('phone')}
                     placeholder="+55 11 99999-9999"
                     error={!!errors.phone}
                     name="phone"
                   />
                   {errors.phone && (
                     <div className="flex items-center gap-1 mt-1 text-red-600 text-sm">
                       <AlertCircle className="h-4 w-4" />
                       <span>{errors.phone.message}</span>
                     </div>
                   )}
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Endereço
                  </label>
                  <input
                     type="text"
                     {...register('address')}
                     className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                       errors.address 
                         ? 'border-red-300 bg-red-50' 
                         : 'border-gray-300'
                     }`}
                     placeholder="Cidade, Estado"
                   />
                   {errors.address && (
                     <div className="flex items-center gap-1 mt-1 text-red-600 text-sm">
                       <AlertCircle className="h-4 w-4" />
                       <span>{errors.address.message}</span>
                     </div>
                   )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Instagram
                  </label>
                  <input
                     type="text"
                     {...register('social_instagram')}
                     className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                       errors.social_instagram 
                         ? 'border-red-300 bg-red-50' 
                         : 'border-gray-300'
                     }`}
                     placeholder="@usuario"
                   />
                   {errors.social_instagram && (
                     <div className="flex items-center gap-1 mt-1 text-red-600 text-sm">
                       <AlertCircle className="h-4 w-4" />
                       <span>{errors.social_instagram.message}</span>
                     </div>
                   )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    WhatsApp
                  </label>
                  <input
                     type="tel"
                     {...register('social_whatsapp')}
                     className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                       errors.social_whatsapp 
                         ? 'border-red-300 bg-red-50' 
                         : 'border-gray-300'
                     }`}
                     placeholder="+5511999999999"
                   />
                   {errors.social_whatsapp && (
                     <div className="flex items-center gap-1 mt-1 text-red-600 text-sm">
                       <AlertCircle className="h-4 w-4" />
                       <span>{errors.social_whatsapp.message}</span>
                     </div>
                   )}
                </div>
              </div>
            </div>
          )}

          {activeCategory === 'business_hours' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Horários de Funcionamento</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Horário de Funcionamento (Segunda a Sexta)
                </label>
                <input
                  type="text"
                  {...register('business_hours_weekdays')}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                    errors.business_hours_weekdays 
                      ? 'border-red-300 bg-red-50' 
                      : 'border-gray-300'
                  }`}
                  placeholder="08:00 às 18:00"
                />
                {errors.business_hours_weekdays && (
                  <div className="flex items-center gap-1 mt-1 text-red-600 text-sm">
                    <AlertCircle className="h-4 w-4" />
                    <span>{errors.business_hours_weekdays.message}</span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Horário de Funcionamento (Sábado)
                </label>
                <input
                  type="text"
                  {...register('business_hours_weekend')}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                    errors.business_hours_weekend 
                      ? 'border-red-300 bg-red-50' 
                      : 'border-gray-300'
                  }`}
                  placeholder="09:00 às 14:00"
                />
                {errors.business_hours_weekend && (
                  <div className="flex items-center gap-1 mt-1 text-red-600 text-sm">
                    <AlertCircle className="h-4 w-4" />
                    <span>{errors.business_hours_weekend.message}</span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Dias Fechados
                </label>
                <input
                  type="text"
                  {...register('business_hours_closed_days')}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                    errors.business_hours_closed_days 
                      ? 'border-red-300 bg-red-50' 
                      : 'border-gray-300'
                  }`}
                  placeholder="Domingos e feriados"
                />
                {errors.business_hours_closed_days && (
                  <div className="flex items-center gap-1 mt-1 text-red-600 text-sm">
                    <AlertCircle className="h-4 w-4" />
                    <span>{errors.business_hours_closed_days.message}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeCategory === 'carousel' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Configurações do Carrossel</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      {...register('carousel_autoplay')}
                      className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                    />
                    <span className="text-sm font-medium text-gray-700">
                      Autoplay do Carrossel
                    </span>
                  </label>
                  {errors.carousel_autoplay && (
                    <div className="flex items-center gap-1 mt-1 text-red-600 text-sm">
                      <AlertCircle className="h-4 w-4" />
                      <span>{errors.carousel_autoplay.message}</span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Intervalo do Carrossel (s)
                  </label>
                  <input
                    type="number"
                    {...register('carousel_interval', { valueAsNumber: true })}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                      errors.carousel_interval 
                        ? 'border-red-300 bg-red-50' 
                        : 'border-gray-300'
                    }`}
                    min="1"
                    max="30"
                    step="1"
                  />
                  {errors.carousel_interval && (
                    <div className="flex items-center gap-1 mt-1 text-red-600 text-sm">
                      <AlertCircle className="h-4 w-4" />
                      <span>{errors.carousel_interval.message}</span>
                    </div>
                  )}
                  <p className="text-sm text-gray-500 mt-1">
                    Tempo entre transições das imagens em segundos
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Intervalo dos Depoimentos (s)
                  </label>
                  <input
                    type="number"
                    {...register('testimonial_carousel_interval', { valueAsNumber: true })}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                      errors.testimonial_carousel_interval 
                        ? 'border-red-300 bg-red-50' 
                        : 'border-gray-300'
                    }`}
                    min="1"
                    max="30"
                    step="1"
                  />
                  {errors.testimonial_carousel_interval && (
                    <div className="flex items-center gap-1 mt-1 text-red-600 text-sm">
                      <AlertCircle className="h-4 w-4" />
                      <span>{errors.testimonial_carousel_interval.message}</span>
                    </div>
                  )}
                  <p className="text-sm text-gray-500 mt-1">
                    Tempo entre transições dos depoimentos em segundos
                  </p>
                </div>
              </div>

              {/* Seção de Gerenciamento de Imagens do Carrossel */}
              <div className="border-t pt-6">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-md font-semibold text-gray-900">Imagens do Carrossel</h4>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar Imagem
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={async (e) => {
                      const files = Array.from(e.target.files || []);
                      for (const file of files) {
                        await addImage(file, file.name.split('.')[0], '');
                      }
                      e.target.value = '';
                    }}
                  />
                </div>

                {imagesError && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                    <div className="flex items-center">
                      <AlertCircle className="h-4 w-4 text-red-400 mr-2" />
                      <span className="text-sm text-red-700">{imagesError}</span>
                    </div>
                  </div>
                )}

                {imagesLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-purple-600" />
                    <span className="ml-2 text-sm text-gray-600">Carregando imagens...</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {images.filter(img => !img.deleted).map((image) => (
                      <div key={image.id} className="relative group bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                        <div className="aspect-video bg-gray-100">
                          <img
                            src={image.file_url}
                            alt={image.title}
                            className={`w-full h-full object-cover transition-all duration-300 ${
                              !image.active ? 'filter grayscale opacity-60' : ''
                            }`}
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjI0IiBoZWlnaHQ9IjI0IiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0xMiA5VjEzTTEyIDE3SDE2TTE2IDlIMTJNMTIgOUg4VjEzSDEyVjlaTTggMTNWMTdIMTJWMTNIOFoiIHN0cm9rZT0iIzlDQTNBRiIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiLz4KPC9zdmc+';
                            }}
                          />
                        </div>
                        
                        <div className="p-3">
                          <h5 className="font-medium text-gray-900 text-sm truncate">{image.title}</h5>
                          <p className="text-xs text-gray-500 mt-1">
                            Ordem: {image.order_position} | {image.active ? 'Ativo' : 'Inativo'}
                          </p>
                        </div>

                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="flex space-x-1">
                            <button
                              type="button"
                              onClick={() => toggleImage(image.id)}
                              className={`p-1 rounded-full ${
                                image.active 
                                  ? 'bg-green-100 text-green-600 hover:bg-green-200' 
                                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                              }`}
                              title={image.active ? 'Desativar' : 'Ativar'}
                            >
                              {image.active ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                            </button>
                            <button
                              type="button"
                              onClick={() => moveToTrash(image.id)}
                              className="p-1 rounded-full bg-red-100 text-red-600 hover:bg-red-200"
                              title="Mover para lixeira"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {images.filter(img => !img.deleted).length === 0 && !imagesLoading && (
                  <div className="text-center py-8">
                    <ImageIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">Nenhuma imagem do carrossel encontrada</p>
                    <p className="text-sm text-gray-400 mt-1">Clique em "Adicionar Imagem" para começar</p>
                  </div>
                )}

                {/* Lixeira */}
                {getDeletedImages().length > 0 && (
                  <div className="border-t pt-6 mt-6">
                    <h5 className="text-sm font-medium text-gray-900 mb-3">Lixeira</h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {getDeletedImages().map((image) => (
                        <div key={image.id} className="relative group bg-gray-50 border border-gray-200 rounded-lg overflow-hidden opacity-60">
                          <div className="aspect-video bg-gray-100">
                            <img
                              src={image.url}
                              alt={image.title}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          
                          <div className="p-3">
                            <h5 className="font-medium text-gray-700 text-sm truncate">{image.title}</h5>
                            <p className="text-xs text-gray-500 mt-1">Na lixeira</p>
                          </div>

                          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="flex space-x-1">
                              <button
                                type="button"
                                onClick={() => restoreImage(image.id)}
                                className="p-1 rounded-full bg-blue-100 text-blue-600 hover:bg-blue-200"
                                title="Restaurar"
                              >
                                <RotateCcw className="h-3 w-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => permanentlyDelete(image.id)}
                                className="p-1 rounded-full bg-red-100 text-red-600 hover:bg-red-200"
                                title="Excluir permanentemente"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeCategory === 'system' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Configurações do Sistema</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tamanho Máximo de Arquivo (MB)
                  </label>
                  <input
                    type="number"
                    {...register('max_file_size', { valueAsNumber: true })}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                      errors.max_file_size 
                        ? 'border-red-300 bg-red-50' 
                        : 'border-gray-300'
                    }`}
                    min="1"
                    max="100"
                  />
                  {errors.max_file_size && (
                    <div className="flex items-center gap-1 mt-1 text-red-600 text-sm">
                      <AlertCircle className="h-4 w-4" />
                      <span>{errors.max_file_size.message}</span>
                    </div>
                  )}
                  <p className="text-sm text-gray-500 mt-1">
                    Tamanho máximo em MB para upload de arquivos
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Retenção de Backup (dias)
                  </label>
                  <input
                    type="number"
                    {...register('backup_retention_days', { valueAsNumber: true })}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                      errors.backup_retention_days 
                        ? 'border-red-300 bg-red-50' 
                        : 'border-gray-300'
                    }`}
                    min="1"
                    max="365"
                  />
                  {errors.backup_retention_days && (
                    <div className="flex items-center gap-1 mt-1 text-red-600 text-sm">
                      <AlertCircle className="h-4 w-4" />
                      <span>{errors.backup_retention_days.message}</span>
                    </div>
                  )}
                  <p className="text-sm text-gray-500 mt-1">
                    Quantos dias manter os backups
                  </p>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email para Notificações
                  </label>
                  <input
                    type="email"
                    {...register('notification_email')}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                      errors.notification_email 
                        ? 'border-red-300 bg-red-50' 
                        : 'border-gray-300'
                    }`}
                    placeholder="admin@exemplo.com"
                  />
                  {errors.notification_email && (
                    <div className="flex items-center gap-1 mt-1 text-red-600 text-sm">
                      <AlertCircle className="h-4 w-4" />
                      <span>{errors.notification_email.message}</span>
                    </div>
                  )}
                  <p className="text-sm text-gray-500 mt-1">
                    Email para receber notificações do sistema
                  </p>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tipos de Arquivo Permitidos
                  </label>
                  <input
                    type="text"
                    {...register('allowed_file_types')}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                      errors.allowed_file_types 
                        ? 'border-red-300 bg-red-50' 
                        : 'border-gray-300'
                    }`}
                    placeholder="jpg,png,pdf,doc"
                  />
                  {errors.allowed_file_types && (
                    <div className="flex items-center gap-1 mt-1 text-red-600 text-sm">
                      <AlertCircle className="h-4 w-4" />
                      <span>{errors.allowed_file_types.message}</span>
                    </div>
                  )}
                  <p className="text-sm text-gray-500 mt-1">
                    Selecione os tipos de arquivo permitidos para upload
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Status Information */}
      {isDirty && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-yellow-800">
            <Bell className="h-5 w-5" />
            <span className="font-medium">Alterações não salvas</span>
          </div>
          <p className="text-yellow-700 mt-1">
            Você tem alterações não salvas. Clique em "Salvar Alterações" para aplicá-las.
          </p>
        </div>
      )}
    </div>
  );
};

export default AdminSettings;