import React, { useState, useEffect } from 'react';
import { Camera, Upload, X, Download, Eye, Trash2, Grid, List, Search, Filter, Image as ImageIcon, Plus, Video, Play, Pause, Volume2 } from 'lucide-react';
import { useSupabaseEvents } from '../../hooks/useSupabaseEvents';
import { toast } from 'sonner';

interface EventGalleryProps {
  eventId: string;
  isAdmin?: boolean;
  showUpload?: boolean;
}

interface MediaItem {
  id: string;
  url: string;
  type: 'photo' | 'video';
  caption?: string;
  uploaded_at: string;
  uploaded_by?: string;
}

interface MediaViewerProps {
  mediaItems: MediaItem[];
  currentIndex: number;
  onClose: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onDelete?: (itemId: string, type: 'photo' | 'video') => void;
  isAdmin?: boolean;
}

const MediaViewer: React.FC<MediaViewerProps> = ({
  mediaItems,
  currentIndex,
  onClose,
  onNext,
  onPrevious,
  onDelete,
  isAdmin
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [volume, setVolume] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const controlsTimeoutRef = React.useRef<NodeJS.Timeout>();
  const currentMedia = mediaItems[currentIndex];
  
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') onPrevious();
      if (e.key === 'ArrowRight') onNext();
      if (e.key === ' ' && currentMedia.type === 'video') {
        e.preventDefault();
        togglePlayPause();
      }
    };
    
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [onClose, onNext, onPrevious, currentMedia.type]);

  useEffect(() => {
    // Reset video state when media changes
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setIsLoading(false);
    
    // Clear controls timeout
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
  }, [currentIndex]);

  useEffect(() => {
    // Auto-hide controls after 3 seconds of inactivity
    if (showControls && currentMedia.type === 'video' && isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }
    
    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [showControls, isPlaying, currentMedia.type]);

  const togglePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
    }
  };

  const handleVideoTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleVideoLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
      setIsLoading(false);
    }
  };

  const handleVideoLoadStart = () => {
    setIsLoading(true);
  };

  const handleSeek = (time: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const handleVolumeChange = (newVolume: number) => {
    if (videoRef.current) {
      videoRef.current.volume = newVolume;
      setVolume(newVolume);
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
  };
  
  if (!currentMedia) return null;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center">
      <div className="relative w-full h-full flex items-center justify-center p-4">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 bg-black bg-opacity-50 text-white rounded-full hover:bg-opacity-70 transition-all"
        >
          <X className="w-6 h-6" />
        </button>
        
        {/* Navigation */}
        {mediaItems.length > 1 && (
          <>
            <button
              onClick={onPrevious}
              className="absolute left-4 top-1/2 transform -translate-y-1/2 z-10 p-3 bg-black bg-opacity-50 text-white rounded-full hover:bg-opacity-70 transition-all"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            
            <button
              onClick={onNext}
              className="absolute right-4 top-1/2 transform -translate-y-1/2 z-10 p-3 bg-black bg-opacity-50 text-white rounded-full hover:bg-opacity-70 transition-all"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </>
        )}
        
        {/* Media Content */}
        <div className="relative max-w-full max-h-full flex items-center justify-center">
          {currentMedia.type === 'photo' ? (
            <img
              src={currentMedia.url}
              alt={currentMedia.caption || 'Foto do evento'}
              className="max-w-full max-h-full object-contain"
            />
          ) : (
            <div 
              className="relative"
              onMouseMove={handleMouseMove}
              onMouseLeave={() => setShowControls(false)}
            >
              {/* Loading indicator */}
              {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 z-20">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
                </div>
              )}
              
              <video
                ref={videoRef}
                src={currentMedia.url}
                className="max-w-full max-h-full object-contain"
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onEnded={() => setIsPlaying(false)}
                onTimeUpdate={handleVideoTimeUpdate}
                onLoadedMetadata={handleVideoLoadedMetadata}
                onLoadStart={handleVideoLoadStart}
                onVolumeChange={(e) => setVolume((e.target as HTMLVideoElement).volume)}
                preload="metadata"
                controls
              />
              
              {/* Custom video controls */}
              {showControls && (
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-4 z-10">
                  {/* Progress bar */}
                  <div className="mb-3">
                    <div className="w-full bg-gray-600 rounded-full h-1 cursor-pointer"
                         onClick={(e) => {
                           const rect = e.currentTarget.getBoundingClientRect();
                           const percent = (e.clientX - rect.left) / rect.width;
                           handleSeek(percent * duration);
                         }}>
                      <div 
                        className="bg-blue-500 h-1 rounded-full transition-all"
                        style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
                      ></div>
                    </div>
                  </div>
                  
                  {/* Control buttons */}
                  <div className="flex items-center justify-between text-white">
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={togglePlayPause}
                        className="hover:text-blue-400 transition-colors"
                      >
                        {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
                      </button>
                      
                      {/* Volume control */}
                       <div className="flex items-center space-x-2">
                         <Volume2 className="w-4 h-4" />
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.1"
                          value={volume}
                          onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                          className="w-16 h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                        />
                      </div>
                    </div>
                    
                    {/* Time display */}
                    <div className="text-sm">
                      {formatTime(currentTime)} / {formatTime(duration)}
                    </div>
                  </div>
                </div>
              )}
              
              {/* Play button overlay */}
              {!isPlaying && !isLoading && (
                <button
                  onClick={togglePlayPause}
                  className="absolute inset-0 flex items-center justify-center hover:bg-black hover:bg-opacity-20 transition-colors"
                >
                  <Play className="w-16 h-16 text-white opacity-80 hover:opacity-100 transition-opacity" />
                </button>
              )}
            </div>
          )}
        </div>
        
        {/* Info Bar */}
        <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-70 text-white p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  {currentMedia.type === 'video' ? (
                    <Video className="w-4 h-4" />
                  ) : (
                    <ImageIcon className="w-4 h-4" />
                  )}
                  {currentMedia.caption && (
                    <p className="text-lg font-medium">{currentMedia.caption}</p>
                  )}
                </div>
                <p className="text-sm text-gray-300">
                  {new Date(currentMedia.uploaded_at).toLocaleDateString('pt-BR')} às {new Date(currentMedia.uploaded_at).toLocaleTimeString('pt-BR')}
                  {currentMedia.uploaded_by && ` • Por ${currentMedia.uploaded_by}`}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {currentIndex + 1} de {mediaItems.length} • {currentMedia.type === 'video' ? 'Vídeo' : 'Foto'}
                </p>
              </div>
            
            <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const link = document.createElement('a');
                    link.href = currentMedia.url;
                    const extension = currentMedia.type === 'video' ? 'mp4' : 'jpg';
                    link.download = `evento_${currentMedia.type}_${currentMedia.id}.${extension}`;
                    link.click();
                  }}
                  className="p-2 bg-white bg-opacity-20 rounded-lg hover:bg-opacity-30 transition-all"
                  title={`Baixar ${currentMedia.type === 'video' ? 'vídeo' : 'foto'}`}
                >
                  <Download className="w-4 h-4" />
                </button>
                
                {isAdmin && onDelete && (
                  <button
                    onClick={() => {
                      const mediaType = currentMedia.type === 'video' ? 'vídeo' : 'foto';
                      if (window.confirm(`Tem certeza que deseja excluir este ${mediaType}?`)) {
                        onDelete(currentMedia.id, currentMedia.type);
                      }
                    }}
                    className="p-2 bg-red-500 bg-opacity-70 rounded-lg hover:bg-opacity-90 transition-all"
                    title={`Excluir ${currentMedia.type === 'video' ? 'vídeo' : 'foto'}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const EventGallery: React.FC<EventGalleryProps> = ({ eventId, isAdmin = false, showUpload = false }) => {
  const { eventPhotos, fetchEventPhotos, uploadEventPhoto, deleteEventPhoto } = useSupabaseEvents();
  
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPhoto, setSelectedPhoto] = useState<number | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [uploadCaptions, setUploadCaptions] = useState<Record<string, string>>({});
  const [sortBy, setSortBy] = useState<'date' | 'name'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [acceptedTypes, setAcceptedTypes] = useState('image/*,video/*');

  useEffect(() => {
    loadMedia();
  }, [eventId]);

  useEffect(() => {
    if (eventPhotos) {
      // Convert photos to media items format with proper type detection
      const mediaData = eventPhotos.filter(photo => photo.event_id === eventId).map(photo => ({
        id: photo.id,
        url: photo.photo_url,
        type: getMediaType(photo.photo_url),
        caption: photo.caption,
        uploaded_at: photo.uploaded_at,
        uploaded_by: photo.uploaded_by
      }));
      setMediaItems(mediaData);
    } else {
      loadMedia();
    }
  }, [eventPhotos, eventId]);

  const getMediaType = (url: string): 'photo' | 'video' => {
    const extension = url.split('.').pop()?.toLowerCase();
    const videoExtensions = ['mp4', 'webm', 'avi', 'mov', 'wmv', 'flv', 'mkv', 'm4v'];
    return videoExtensions.includes(extension || '') ? 'video' : 'photo';
  };

  const loadMedia = async () => {
    try {
      setLoading(true);
      const data = await fetchEventPhotos(eventId);
      // Convert photos to media items format with proper type detection
      const mediaData = (data || []).map(photo => ({
        id: photo.id,
        url: photo.photo_url,
        type: getMediaType(photo.photo_url),
        caption: photo.caption,
        uploaded_at: photo.uploaded_at,
        uploaded_by: photo.uploaded_by
      }));
      setMediaItems(mediaData);
    } catch (error) {
      console.error('Erro ao carregar mídia:', error);
      toast.error('Erro ao carregar mídia do evento');
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter(file => {
      if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
        toast.error(`${file.name} não é um arquivo de mídia válido`);
        return false;
      }
      if (file.size > 10 * 1024 * 1024) { // 10MB
        toast.error(`${file.name} é muito grande (máximo 10MB)`);
        return false;
      }
      return true;
    });
    
    setUploadFiles(prev => [...prev, ...validFiles]);
    
    // Initialize captions
    const newCaptions: Record<string, string> = {};
    validFiles.forEach(file => {
      newCaptions[file.name] = '';
    });
    setUploadCaptions(prev => ({ ...prev, ...newCaptions }));
  };

  const handleUpload = async () => {
    if (uploadFiles.length === 0) {
      toast.error('Selecione pelo menos uma foto');
      return;
    }

    setUploading(true);
    try {
      for (const file of uploadFiles) {
        await uploadEventPhoto(eventId, file, uploadCaptions[file.name] || '');
      }
      
      toast.success(`${uploadFiles.length} foto(s) enviada(s) com sucesso!`);
      setShowUploadModal(false);
      setUploadFiles([]);
      setUploadCaptions({});
      await loadMedia();
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
      toast.error('Erro ao enviar fotos');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteMedia = async (mediaId: string, mediaType: 'photo' | 'video') => {
    try {
      if (mediaType === 'photo') {
        await deleteEventPhoto(mediaId);
        toast.success('Foto excluída com sucesso!');
      } else {
        // TODO: Implement video deletion when backend supports it
        toast.error('Exclusão de vídeos ainda não implementada');
        return;
      }
      await loadMedia();
      setSelectedPhoto(null);
    } catch (error) {
      console.error('Erro ao excluir mídia:', error);
      toast.error('Erro ao excluir mídia');
    }
  };

  const removeUploadFile = (fileName: string) => {
    setUploadFiles(prev => prev.filter(file => file.name !== fileName));
    setUploadCaptions(prev => {
      const newCaptions = { ...prev };
      delete newCaptions[fileName];
      return newCaptions;
    });
  };

  const filteredMedia = mediaItems
    .filter(media => {
      if (!searchTerm) return true;
      return media.caption?.toLowerCase().includes(searchTerm.toLowerCase()) ||
             media.uploaded_by?.toLowerCase().includes(searchTerm.toLowerCase()) ||
             media.type.toLowerCase().includes(searchTerm.toLowerCase());
    })
    .sort((a, b) => {
      const aValue = sortBy === 'date' ? new Date(a.uploaded_at).getTime() : (a.caption || '');
      const bValue = sortBy === 'date' ? new Date(b.uploaded_at).getTime() : (b.caption || '');
      
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

  return (
    <div className="bg-white rounded-lg shadow-sm">
      {/* Header */}
      <div className="p-6 border-b">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Camera className="w-6 h-6 text-purple-600" />
            <h2 className="text-xl font-bold text-gray-900">Galeria do Evento</h2>
            <span className="px-2 py-1 bg-gray-100 text-gray-600 text-sm rounded-full">
              {mediaItems.length} item{mediaItems.length !== 1 ? 's' : ''} 
              ({mediaItems.filter(m => m.type === 'photo').length} foto{mediaItems.filter(m => m.type === 'photo').length !== 1 ? 's' : ''}, 
              {mediaItems.filter(m => m.type === 'video').length} vídeo{mediaItems.filter(m => m.type === 'video').length !== 1 ? 's' : ''})
            </span>
          </div>
          
          <div className="flex items-center gap-3">
            {(isAdmin || showUpload) && (
              <button
                onClick={() => setShowUploadModal(true)}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Adicionar Mídia
              </button>
            )}
            
            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded ${viewMode === 'grid' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'} transition-colors`}
                title="Visualização em grade"
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded ${viewMode === 'list' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'} transition-colors`}
                title="Visualização em lista"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por legenda, autor ou tipo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
          
          <select
            value={`${sortBy}-${sortOrder}`}
            onChange={(e) => {
              const [newSortBy, newSortOrder] = e.target.value.split('-') as [typeof sortBy, typeof sortOrder];
              setSortBy(newSortBy);
              setSortOrder(newSortOrder);
            }}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          >
            <option value="date-desc">Mais recentes</option>
            <option value="date-asc">Mais antigas</option>
            <option value="name-asc">A-Z</option>
            <option value="name-desc">Z-A</option>
          </select>
        </div>
      </div>

      <div className="p-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
            <span className="ml-2 text-gray-600">Carregando fotos...</span>
          </div>
        ) : filteredMedia.length === 0 ? (
          <div className="text-center py-12">
            <ImageIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {mediaItems.length === 0 ? 'Nenhuma Mídia' : 'Nenhuma mídia encontrada'}
            </h3>
            <p className="text-gray-600 mb-4">
              {mediaItems.length === 0 
                ? 'Este evento ainda não possui mídia na galeria' 
                : 'Tente ajustar os filtros de busca'
              }
            </p>
            {(isAdmin || showUpload) && mediaItems.length === 0 && (
              <button
                onClick={() => setShowUploadModal(true)}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
              >
                Adicionar Primeira Mídia
              </button>
            )}
          </div>
        ) : (
          <div className={viewMode === 'grid' 
            ? 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4'
            : 'space-y-4'
          }>
            {filteredMedia.map((media, index) => (
              <div
                key={media.id}
                className={viewMode === 'grid'
                  ? 'group relative aspect-square bg-gray-100 rounded-lg overflow-hidden cursor-pointer hover:shadow-lg transition-all'
                  : 'flex items-center gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer'
                }
                onClick={() => setSelectedPhoto(mediaItems.findIndex(item => item.id === media.id))}
              >
                {media.type === 'photo' ? (
                  <img
                    src={media.url}
                    alt={media.caption || 'Foto do evento'}
                    className={viewMode === 'grid'
                      ? 'w-full h-full object-cover group-hover:scale-105 transition-transform duration-300'
                      : 'w-16 h-16 object-cover rounded-lg'
                    }
                  />
                ) : (
                  <div className={viewMode === 'grid'
                    ? 'relative w-full h-full bg-black flex items-center justify-center'
                    : 'relative w-16 h-16 bg-black rounded-lg flex items-center justify-center'
                  }>
                    <video
                      src={media.url}
                      className={viewMode === 'grid'
                        ? 'w-full h-full object-cover'
                        : 'w-16 h-16 object-cover rounded-lg'
                      }
                      preload="metadata"
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Play className="w-8 h-8 text-white opacity-80" />
                    </div>
                  </div>
                )}
                
                {/* Media type indicator */}
                <div className="absolute top-2 right-2">
                  {media.type === 'photo' ? (
                    <ImageIcon className="w-4 h-4 text-white bg-black bg-opacity-50 rounded p-0.5" />
                  ) : (
                    <Video className="w-4 h-4 text-white bg-black bg-opacity-50 rounded p-0.5" />
                  )}
                </div>
                
                {viewMode === 'grid' ? (
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all duration-300 flex items-center justify-center">
                    <Eye className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                ) : (
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">
                      {media.caption || 'Sem legenda'}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {new Date(media.uploaded_at).toLocaleDateString('pt-BR')}
                      {media.uploaded_by && ` • ${media.uploaded_by}`}
                      <span className="ml-2 px-2 py-0.5 bg-gray-200 text-xs rounded">
                        {media.type === 'photo' ? 'Foto' : 'Vídeo'}
                      </span>
                    </p>
                  </div>
                )}
                
                {viewMode === 'grid' && media.caption && (
                  <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-70 text-white p-2">
                    <p className="text-sm truncate">{media.caption}</p>
                  </div>
                )}
                
                {/* Admin delete button */}
                {isAdmin && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteMedia(media.id, media.type);
                    }}
                    className="absolute top-2 left-2 p-1 bg-red-600 hover:bg-red-700 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Media Viewer */}
      {selectedPhoto !== null && (
        <MediaViewer
          mediaItems={mediaItems}
          currentIndex={selectedPhoto}
          onClose={() => setSelectedPhoto(null)}
          onNext={() => setSelectedPhoto((selectedPhoto + 1) % mediaItems.length)}
          onPrevious={() => setSelectedPhoto(selectedPhoto === 0 ? mediaItems.length - 1 : selectedPhoto - 1)}
          onDelete={isAdmin ? handleDeleteMedia : undefined}
          isAdmin={isAdmin}
        />
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">Adicionar Mídia</h3>
                <button
                  onClick={() => {
                    setShowUploadModal(false);
                    setUploadFiles([]);
                    setUploadCaptions({});
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            <div className="p-6 max-h-[60vh] overflow-y-auto">
              {/* File Input */}
              <div className="mb-6">
                <label className="block w-full">
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-purple-400 transition-colors cursor-pointer">
                    <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-lg font-medium text-gray-700 mb-2">Clique para selecionar mídia</p>
                    <p className="text-sm text-gray-500">ou arraste e solte aqui</p>
                    <p className="text-xs text-gray-400 mt-2">Imagens: PNG, JPG, JPEG | Vídeos: MP4, WEBM até 50MB cada</p>
                  </div>
                  <input
                    type="file"
                    multiple
                    accept={acceptedTypes}
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </label>
              </div>
              
              {/* Selected Files */}
              {uploadFiles.length > 0 && (
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900">Arquivos Selecionados ({uploadFiles.length})</h4>
                  
                  {uploadFiles.map((file, index) => (
                    <div key={index} className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
                      {file.type.startsWith('image/') ? (
                        <img
                          src={URL.createObjectURL(file)}
                          alt={file.name}
                          className="w-16 h-16 object-cover rounded-lg"
                        />
                      ) : (
                        <div className="relative w-16 h-16 bg-black rounded-lg flex items-center justify-center">
                          <video
                            src={URL.createObjectURL(file)}
                            className="w-16 h-16 object-cover rounded-lg"
                            preload="metadata"
                          />
                          <div className="absolute inset-0 flex items-center justify-center">
                            <Play className="w-6 h-6 text-white opacity-80" />
                          </div>
                        </div>
                      )}
                      
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 mb-1">{file.name}</p>
                        <p className="text-sm text-gray-500 mb-2">
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                        
                        <input
                          type="text"
                          placeholder="Legenda (opcional)"
                          value={uploadCaptions[file.name] || ''}
                          onChange={(e) => setUploadCaptions(prev => ({
                            ...prev,
                            [file.name]: e.target.value
                          }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        />
                      </div>
                      
                      <button
                        onClick={() => removeUploadFile(file.name)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="p-6 border-t bg-gray-50">
              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={() => {
                    setShowUploadModal(false);
                    setUploadFiles([]);
                    setUploadCaptions({});
                  }}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                
                <button
                  onClick={handleUpload}
                  disabled={uploading || uploadFiles.length === 0}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {uploading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      Enviar {uploadFiles.length} Arquivo{uploadFiles.length !== 1 ? 's' : ''}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EventGallery;