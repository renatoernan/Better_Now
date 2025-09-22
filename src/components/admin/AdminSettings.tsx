import React, { useState, useRef } from 'react';
import { Settings, Save, Globe, Bell, Shield, Database, Palette, Mail, Loader2, RefreshCw, AlertCircle, Clock, Upload, Eye, EyeOff, Trash2, RotateCcw, Move, X, Image as ImageIcon, Plus } from 'lucide-react';
import { useAppSettings, AppSettings } from '../../hooks/useAppSettings';
import { validateSettingsByCategory, ValidationError } from '../../utils/settingsValidation';
import { useSupabaseImages } from '../../hooks/useSupabaseImages';
import { CarouselImage } from '../lib/supabase';

type SettingsCategory = 'site' | 'contact' | 'business_hours' | 'carousel' | 'system';

const AdminSettings: React.FC = () => {
  const { settings, loading, saving, error, updateSetting, updateMultipleSettings, loadSettings } = useAppSettings();
  const [activeCategory, setActiveCategory] = useState<SettingsCategory>('site');
  const [formData, setFormData] = useState<Partial<AppSettings>>({});
  const [hasChanges, setHasChanges] = useState(false);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);

  // Atualizar formData quando settings carregarem
  React.useEffect(() => {
    if (settings) {
      setFormData(settings);
    }
  }, [settings]);

  // Limpar erros de validação quando mudar de categoria
  React.useEffect(() => {
    setValidationErrors([]);
  }, [activeCategory]);

  // Função para obter erro de validação de um campo específico
  const getFieldError = (fieldName: string): string | undefined => {
    const error = validationErrors.find(err => err.field === fieldName);
    return error?.message;
  };

  // Função para verificar se um campo tem erro
  const hasFieldError = (fieldName: string): boolean => {
    return validationErrors.some(err => err.field === fieldName);
  };

  const handleInputChange = (key: keyof AppSettings, value: any) => {
    setFormData(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
    
    // Limpar erro de validação específico do campo quando o usuário começar a digitar
    if (validationErrors.length > 0) {
      setValidationErrors(prev => prev.filter(error => error.field !== key));
    }
  };

  const handleSaveCategory = async () => {
    if (!hasChanges || !formData) return;

    // Validar dados antes de salvar
    const categoryFields = getCategoryFields(activeCategory);
    const dataToValidate: any = {};
    
    categoryFields.forEach(field => {
      if (formData[field] !== undefined) {
        dataToValidate[field] = formData[field];
      }
    });

    const validation = validateSettingsByCategory(activeCategory, dataToValidate);
    
    if (!validation.isValid) {
      setValidationErrors(validation.errors);
      return;
    }

    // Limpar erros de validação se passou na validação
    setValidationErrors([]);

    const updates: Partial<AppSettings> = {};
    categoryFields.forEach(field => {
      if (formData[field] !== undefined) {
        (updates as any)[field] = formData[field];
      }
    });

    const success = await updateMultipleSettings(updates);
    if (success) {
      setHasChanges(false);
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
              onClick={handleSaveCategory}
              disabled={!hasChanges || saving}
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
                   value={formData.site_title || ''}
                   onChange={(e) => handleInputChange('site_title', e.target.value)}
                   className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                     hasFieldError('site_title') 
                       ? 'border-red-300 bg-red-50' 
                       : 'border-gray-300'
                   }`}
                   placeholder="Nome do seu site"
                 />
                 {hasFieldError('site_title') && (
                   <div className="flex items-center gap-1 mt-1 text-red-600 text-sm">
                     <AlertCircle className="h-4 w-4" />
                     <span>{getFieldError('site_title')}</span>
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
                     value={formData.contact_email || ''}
                     onChange={(e) => handleInputChange('contact_email', e.target.value)}
                     className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                       hasFieldError('contact_email') 
                         ? 'border-red-300 bg-red-50' 
                         : 'border-gray-300'
                     }`}
                     placeholder="contato@exemplo.com"
                   />
                   {hasFieldError('contact_email') && (
                     <div className="flex items-center gap-1 mt-1 text-red-600 text-sm">
                       <AlertCircle className="h-4 w-4" />
                       <span>{getFieldError('contact_email')}</span>
                     </div>
                   )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Telefone
                  </label>
                  <input
                     type="tel"
                     value={formData.phone || ''}
                     onChange={(e) => handleInputChange('phone', e.target.value)}
                     className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                       hasFieldError('phone') 
                         ? 'border-red-300 bg-red-50' 
                         : 'border-gray-300'
                     }`}
                     placeholder="+55 11 99999-9999"
                   />
                   {hasFieldError('phone') && (
                     <div className="flex items-center gap-1 mt-1 text-red-600 text-sm">
                       <AlertCircle className="h-4 w-4" />
                       <span>{getFieldError('phone')}</span>
                     </div>
                   )}
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Endereço
                  </label>
                  <input
                     type="text"
                     value={formData.address || ''}
                     onChange={(e) => handleInputChange('address', e.target.value)}
                     className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                       hasFieldError('address') 
                         ? 'border-red-300 bg-red-50' 
                         : 'border-gray-300'
                     }`}
                     placeholder="Cidade, Estado"
                   />
                   {hasFieldError('address') && (
                     <div className="flex items-center gap-1 mt-1 text-red-600 text-sm">
                       <AlertCircle className="h-4 w-4" />
                       <span>{getFieldError('address')}</span>
                     </div>
                   )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Instagram
                  </label>
                  <input
                     type="text"
                     value={formData.social_instagram || ''}
                     onChange={(e) => handleInputChange('social_instagram', e.target.value)}
                     className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                       hasFieldError('social_instagram') 
                         ? 'border-red-300 bg-red-50' 
                         : 'border-gray-300'
                     }`}
                     placeholder="@usuario"
                   />
                   {hasFieldError('social_instagram') && (
                     <div className="flex items-center gap-1 mt-1 text-red-600 text-sm">
                       <AlertCircle className="h-4 w-4" />
                       <span>{getFieldError('social_instagram')}</span>
                     </div>
                   )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    WhatsApp
                  </label>
                  <input
                     type="tel"
                     value={formData.social_whatsapp || ''}
                     onChange={(e) => handleInputChange('social_whatsapp', e.target.value)}
                     className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                       hasFieldError('social_whatsapp') 
                         ? 'border-red-300 bg-red-50' 
                         : 'border-gray-300'
                     }`}
                     placeholder="+5511999999999"
                   />
                   {hasFieldError('social_whatsapp') && (
                     <div className="flex items-center gap-1 mt-1 text-red-600 text-sm">
                       <AlertCircle className="h-4 w-4" />
                       <span>{getFieldError('social_whatsapp')}</span>
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
                  value={formData.business_hours_weekdays || ''}
                  onChange={(e) => handleInputChange('business_hours_weekdays', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                    hasFieldError('business_hours_weekdays') 
                      ? 'border-red-300 bg-red-50' 
                      : 'border-gray-300'
                  }`}
                  placeholder="08:00 às 18:00"
                />
                {hasFieldError('business_hours_weekdays') && (
                  <div className="flex items-center gap-1 mt-1 text-red-600 text-sm">
                    <AlertCircle className="h-4 w-4" />
                    <span>{getFieldError('business_hours_weekdays')}</span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Horário de Funcionamento (Sábado)
                </label>
                <input
                  type="text"
                  value={formData.business_hours_weekend || ''}
                  onChange={(e) => handleInputChange('business_hours_weekend', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                    hasFieldError('business_hours_weekend') 
                      ? 'border-red-300 bg-red-50' 
                      : 'border-gray-300'
                  }`}
                  placeholder="09:00 às 14:00"
                />
                {hasFieldError('business_hours_weekend') && (
                  <div className="flex items-center gap-1 mt-1 text-red-600 text-sm">
                    <AlertCircle className="h-4 w-4" />
                    <span>{getFieldError('business_hours_weekend')}</span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Dias Fechados
                </label>
                <input
                  type="text"
                  value={formData.business_hours_closed_days || ''}
                  onChange={(e) => handleInputChange('business_hours_closed_days', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                    hasFieldError('business_hours_closed_days') 
                      ? 'border-red-300 bg-red-50' 
                      : 'border-gray-300'
                  }`}
                  placeholder="Domingos e feriados"
                />
                {hasFieldError('business_hours_closed_days') && (
                  <div className="flex items-center gap-1 mt-1 text-red-600 text-sm">
                    <AlertCircle className="h-4 w-4" />
                    <span>{getFieldError('business_hours_closed_days')}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeCategory === 'carousel' && (
            <CarouselManagement 
              formData={formData}
              handleInputChange={handleInputChange}
              hasFieldError={hasFieldError}
              getFieldError={getFieldError}
            />
          )}

          {activeCategory === 'system' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Configurações do Sistema</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tamanho Máximo de Arquivo
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    step="0.1"
                    value={formData.max_file_size ? (formData.max_file_size / 1024 / 1024).toFixed(1) : '5.0'}
                    onChange={(e) => handleInputChange('max_file_size', parseFileSize(e.target.value))}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                      hasFieldError('max_file_size') 
                        ? 'border-red-300 bg-red-50' 
                        : 'border-gray-300'
                    }`}
                  />
                  {hasFieldError('max_file_size') && (
                    <div className="flex items-center gap-1 mt-1 text-red-600 text-sm">
                      <AlertCircle className="h-4 w-4" />
                      <span>{getFieldError('max_file_size')}</span>
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
                    min="1"
                    max="365"
                    value={formData.backup_retention_days || 30}
                    onChange={(e) => handleInputChange('backup_retention_days', parseInt(e.target.value))}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                      hasFieldError('backup_retention_days') 
                        ? 'border-red-300 bg-red-50' 
                        : 'border-gray-300'
                    }`}
                  />
                  {hasFieldError('backup_retention_days') && (
                    <div className="flex items-center gap-1 mt-1 text-red-600 text-sm">
                      <AlertCircle className="h-4 w-4" />
                      <span>{getFieldError('backup_retention_days')}</span>
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
                    value={formData.notification_email || ''}
                    onChange={(e) => handleInputChange('notification_email', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                      hasFieldError('notification_email') 
                        ? 'border-red-300 bg-red-50' 
                        : 'border-gray-300'
                    }`}
                    placeholder="admin@exemplo.com"
                  />
                  {hasFieldError('notification_email') && (
                    <div className="flex items-center gap-1 mt-1 text-red-600 text-sm">
                      <AlertCircle className="h-4 w-4" />
                      <span>{getFieldError('notification_email')}</span>
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
                  <div className="flex flex-wrap gap-2">
                    {['image/jpeg', 'image/png', 'image/webp', 'image/gif'].map((type) => (
                      <label key={type} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={formData.allowed_file_types?.includes(type) || false}
                          onChange={(e) => {
                            const currentTypes = formData.allowed_file_types || [];
                            if (e.target.checked) {
                              handleInputChange('allowed_file_types', [...currentTypes, type]);
                            } else {
                              handleInputChange('allowed_file_types', currentTypes.filter(t => t !== type));
                            }
                          }}
                          className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                        />
                        <span className="text-sm text-gray-700">
                          {type.split('/')[1].toUpperCase()}
                        </span>
                      </label>
                    ))}
                  </div>
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
      {hasChanges && (
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

// Componente de gerenciamento do carrossel
interface CarouselManagementProps {
  formData: AppSettings;
  handleInputChange: (key: string, value: any) => void;
  hasFieldError: (field: string) => boolean;
  getFieldError: (field: string) => string;
}

const CarouselManagement: React.FC<CarouselManagementProps> = ({
  formData,
  handleInputChange,
  hasFieldError,
  getFieldError
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const {
    images,
    loading,
    error,
    loadImages,
    addImage,
    updateImage,
    toggleImage,
    moveToTrash,
    restoreImage,
    permanentlyDeleteImage,
    reorderImages,
    getActiveImages,
    getDeletedImages
  } = useSupabaseImages();

  const [showTrash, setShowTrash] = useState(false);
  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  const [editingImage, setEditingImage] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [uploadProgress, setUploadProgress] = useState(false);

  React.useEffect(() => {
    loadImages();
  }, []);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setUploadProgress(true);
    try {
      for (const file of Array.from(files)) {
        if (file.type.startsWith('image/')) {
          await addImage(file);
        }
      }
      await loadImages();
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
    } finally {
      setUploadProgress(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDragStart = (e: React.DragEvent, imageId: string) => {
    setDraggedItem(imageId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedItem || draggedItem === targetId) return;

    // Usar mainImages para reordenação (inclui ativas e desativadas)
    const draggedIndex = mainImages.findIndex(img => img.id === draggedItem);
    const targetIndex = mainImages.findIndex(img => img.id === targetId);

    if (draggedIndex !== -1 && targetIndex !== -1) {
      const newOrder = [...mainImages];
      const [draggedImage] = newOrder.splice(draggedIndex, 1);
      newOrder.splice(targetIndex, 0, draggedImage);

      // Atualizar posições
      const updates = newOrder.map((img, index) => ({
        id: img.id,
        order_position: index + 1
      }));

      await reorderImages(updates);
      await loadImages();
    }

    setDraggedItem(null);
  };

  const handleEditImage = (image: CarouselImage) => {
    setEditingImage(image.id);
    setEditTitle(image.title || '');
  };

  const handleSaveEdit = async () => {
    if (!editingImage) return;

    await updateImage(editingImage, { title: editTitle });
    await loadImages();
    setEditingImage(null);
    setEditTitle('');
  };

  const handleCancelEdit = () => {
    setEditingImage(null);
    setEditTitle('');
  };

  // Modificar para incluir imagens ativas e desativadas (não deletadas)
  const mainImages = images.filter(img => !img.deleted)
    .sort((a, b) => a.order_position - b.order_position);
  const deletedImages = getDeletedImages();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Gerenciamento do Carrossel</h3>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowTrash(!showTrash)}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              showTrash
                ? 'bg-red-100 text-red-700 hover:bg-red-200'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Trash2 className="h-4 w-4 inline mr-2" />
            Lixeira ({deletedImages.length})
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadProgress}
            className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
          >
            {uploadProgress ? (
              <Loader2 className="h-4 w-4 inline mr-2 animate-spin" />
            ) : (
              <Plus className="h-4 w-4 inline mr-2" />
            )}
            Adicionar Imagens
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>
      </div>

      {/* Configurações Globais */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h4 className="text-md font-medium text-gray-900 mb-3">Configurações Globais</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={formData.carousel_autoplay || false}
                onChange={(e) => handleInputChange('carousel_autoplay', e.target.checked)}
                className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
              />
              <span className="text-sm font-medium text-gray-700">
                Autoplay do Carousel
              </span>
            </label>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Intervalo Imagens (segundos)
            </label>
            <input
              type="number"
              min="1"
              max="30"
              step="1"
              value={Math.round((formData.carousel_interval || 5000) / 1000)}
              onChange={(e) => handleInputChange('carousel_interval', parseInt(e.target.value) * 1000)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm ${
                hasFieldError('carousel_interval') 
                  ? 'border-red-300 bg-red-50' 
                  : 'border-gray-300'
              }`}
            />
            {hasFieldError('carousel_interval') && (
              <div className="flex items-center gap-1 mt-1 text-red-600 text-xs">
                <AlertCircle className="h-3 w-3" />
                <span>{getFieldError('carousel_interval')}</span>
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Intervalo Depoimentos (segundos)
            </label>
            <input
              type="number"
              min="1"
              max="30"
              step="1"
              value={Math.round((formData.testimonial_carousel_interval || 5000) / 1000)}
              onChange={(e) => handleInputChange('testimonial_carousel_interval', parseInt(e.target.value) * 1000)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm ${
                hasFieldError('testimonial_carousel_interval') 
                  ? 'border-red-300 bg-red-50' 
                  : 'border-gray-300'
              }`}
            />
            {hasFieldError('testimonial_carousel_interval') && (
              <div className="flex items-center gap-1 mt-1 text-red-600 text-xs">
                <AlertCircle className="h-3 w-3" />
                <span>{getFieldError('testimonial_carousel_interval')}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-red-700">
            <AlertCircle className="h-5 w-5" />
            <span className="font-medium">Erro:</span>
            <span>{error}</span>
          </div>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-purple-600" />
          <span className="ml-2 text-gray-600">Carregando imagens...</span>
        </div>
      )}

      {/* Lista de Imagens Principais (Ativas + Desativadas) */}
      {!showTrash && (
        <div>
          <h4 className="text-md font-medium text-gray-900 mb-3">
            Imagens do Carrossel ({mainImages.length})
          </h4>
          {mainImages.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
              <ImageIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 mb-2">Nenhuma imagem no carrossel</p>
              <p className="text-sm text-gray-400">Clique em "Adicionar Imagens" para começar</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {mainImages.map((image) => (
                <div
                  key={image.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, image.id)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, image.id)}
                  className={`bg-white border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow ${
                    draggedItem === image.id ? 'opacity-50' : ''
                  } ${!image.active ? 'opacity-60' : ''}`}
                >
                  <div className="relative">
                    <img
                      src={image.file_url}
                      alt={image.title || image.filename}
                      className={`w-full h-32 object-cover ${
                        !image.active ? 'grayscale opacity-75' : ''
                      }`}
                    />
                    {/* Overlay para imagens desativadas */}
                    {!image.active && (
                      <div className="absolute inset-0 bg-gray-900 bg-opacity-40 flex items-center justify-center">
                        <div className="bg-white bg-opacity-90 px-2 py-1 rounded text-xs font-medium text-gray-700">
                          DESATIVADA
                        </div>
                      </div>
                    )}
                    <div className="absolute top-2 right-2 flex gap-1">
                      <button
                        onClick={() => toggleImage(image.id)}
                        className={`p-1 rounded-full text-white shadow-lg ${
                          image.active ? 'bg-green-500 hover:bg-green-600' : 'bg-gray-500 hover:bg-gray-600'
                        }`}
                        title={image.active ? 'Desativar' : 'Ativar'}
                      >
                        {image.active ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                      </button>
                      <button
                        onClick={() => moveToTrash(image.id)}
                        className="p-1 rounded-full bg-red-500 hover:bg-red-600 text-white shadow-lg"
                        title="Mover para lixeira"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                    <div className="absolute top-2 left-2">
                      <span className="bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
                        #{image.order_position}
                      </span>
                    </div>
                  </div>
                  <div className="p-3">
                    {editingImage === image.id ? (
                      <div className="space-y-2">
                        <input
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          placeholder="Título da imagem"
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={handleSaveEdit}
                            className="flex-1 bg-green-600 text-white px-2 py-1 rounded text-xs hover:bg-green-700"
                          >
                            Salvar
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            className="flex-1 bg-gray-500 text-white px-2 py-1 rounded text-xs hover:bg-gray-600"
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <h5 className={`font-medium text-sm truncate ${
                            image.active ? 'text-gray-900' : 'text-gray-500'
                          }`}>
                            {image.title || image.filename}
                          </h5>
                          <button
                            onClick={() => handleEditImage(image)}
                            className="text-gray-400 hover:text-gray-600"
                            title="Editar título"
                          >
                            <Settings className="h-3 w-3" />
                          </button>
                        </div>
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <span className={`px-2 py-1 rounded-full ${
                            image.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                          }`}>
                            {image.active ? 'Ativa' : 'Desativada'}
                          </span>
                          <span className="flex items-center gap-1">
                            <Move className="h-3 w-3" />
                            Arrastar
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Lixeira */}
      {showTrash && (
        <div>
          <h4 className="text-md font-medium text-gray-900 mb-3">
            Lixeira ({deletedImages.length})
          </h4>
          {deletedImages.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <Trash2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">Lixeira vazia</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {deletedImages.map((image) => (
                <div key={image.id} className="bg-white border rounded-lg overflow-hidden shadow-sm opacity-75">
                  <div className="relative">
                    <img
                      src={image.file_url}
                      alt={image.title || image.filename}
                      className="w-full h-32 object-cover grayscale"
                    />
                    <div className="absolute top-2 right-2 flex gap-1">
                      <button
                        onClick={() => restoreImage(image.id)}
                        className="p-1 rounded-full bg-green-500 hover:bg-green-600 text-white shadow-lg"
                        title="Restaurar"
                      >
                        <RotateCcw className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('Tem certeza que deseja excluir permanentemente esta imagem?')) {
                            permanentlyDeleteImage(image.id);
                          }
                        }}
                        className="p-1 rounded-full bg-red-600 hover:bg-red-700 text-white shadow-lg"
                        title="Excluir permanentemente"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                  <div className="p-3">
                    <h5 className="font-medium text-sm text-gray-700 truncate mb-1">
                      {image.title || image.filename}
                    </h5>
                    <span className="text-xs text-red-600 bg-red-100 px-2 py-1 rounded-full">
                      Excluída
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminSettings;