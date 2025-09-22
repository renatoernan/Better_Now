import React, { useState, useRef } from 'react';
import { Upload, X, Video, Play } from 'lucide-react';
import { toast } from 'sonner';

interface VideoUploadProps {
  onVideoUpload: (file: File) => Promise<string>;
  currentVideo?: string;
  onVideoRemove?: () => void;
  className?: string;
  accept?: string;
  maxSize?: number; // in MB
  placeholder?: string;
}

const VideoUpload: React.FC<VideoUploadProps> = ({
  onVideoUpload,
  currentVideo,
  onVideoRemove,
  className = '',
  accept = 'video/*',
  maxSize = 50, // Vídeos geralmente são maiores
  placeholder = 'Clique para fazer upload de um vídeo'
}) => {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const validateVideoFile = (file: File): boolean => {
    // Validar tipo de arquivo
    const allowedTypes = ['video/mp4', 'video/webm', 'video/ogg', 'video/avi', 'video/mov'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Formato de vídeo não suportado. Use MP4, WebM, OGG, AVI ou MOV');
      return false;
    }

    // Validar tamanho do arquivo
    if (file.size > maxSize * 1024 * 1024) {
      toast.error(`O vídeo deve ter no máximo ${maxSize}MB`);
      return false;
    }

    return true;
  };

  const handleFileSelect = async (file: File) => {
    if (!validateVideoFile(file)) {
      return;
    }

    setUploading(true);
    try {
      await onVideoUpload(file);
      toast.success('Vídeo enviado com sucesso!');
    } catch (error) {
      console.error('Erro ao fazer upload do vídeo:', error);
      toast.error('Erro ao fazer upload do vídeo');
    } finally {
      setUploading(false);
    }
  };

  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragOver(false);
    
    const file = event.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragOver(false);
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleRemoveVideo = () => {
    if (onVideoRemove) {
      onVideoRemove();
    }
  };

  const handleVideoPlay = () => {
    if (videoRef.current) {
      videoRef.current.play();
    }
  };

  return (
    <div className={`relative ${className}`}>
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileInputChange}
        className="hidden"
      />
      
      {currentVideo ? (
        <div className="relative group">
          <video
            ref={videoRef}
            src={currentVideo}
            className="w-full h-48 object-cover rounded-lg border-2 border-gray-200"
            controls={false}
            muted
            preload="metadata"
          />
          <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
            <div className="flex gap-2">
              <button
                onClick={handleVideoPlay}
                className="bg-green-600 hover:bg-green-700 text-white p-2 rounded-full transition-colors"
                title="Reproduzir vídeo"
              >
                <Play className="w-4 h-4" />
              </button>
              <button
                onClick={handleClick}
                className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-full transition-colors"
                title="Alterar vídeo"
              >
                <Upload className="w-4 h-4" />
              </button>
              {onVideoRemove && (
                <button
                  onClick={handleRemoveVideo}
                  className="bg-red-600 hover:bg-red-700 text-white p-2 rounded-full transition-colors"
                  title="Remover vídeo"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
          {uploading && (
            <div className="absolute inset-0 bg-white bg-opacity-75 rounded-lg flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          )}
        </div>
      ) : (
        <div
          onClick={handleClick}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`
            w-full h-48 border-2 border-dashed rounded-lg cursor-pointer transition-colors
            flex flex-col items-center justify-center gap-3
            ${dragOver 
              ? 'border-blue-500 bg-blue-50' 
              : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
            }
            ${uploading ? 'pointer-events-none opacity-50' : ''}
          `}
        >
          {uploading ? (
            <>
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="text-sm text-gray-600">Enviando vídeo...</p>
            </>
          ) : (
            <>
              <div className="p-3 bg-gray-100 rounded-full">
                <Video className="w-6 h-6 text-gray-600" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-gray-900">{placeholder}</p>
                <p className="text-xs text-gray-500 mt-1">
                  Arraste e solte ou clique para selecionar
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  MP4, WebM, OGG, AVI, MOV até {maxSize}MB
                </p>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default VideoUpload;