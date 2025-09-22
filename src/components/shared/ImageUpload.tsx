import React, { useState, useRef } from 'react';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';

interface ImageUploadProps {
  onImageUpload: (file: File) => Promise<string>;
  currentImage?: string;
  onImageRemove?: () => void;
  className?: string;
  accept?: string;
  maxSize?: number; // in MB
  placeholder?: string;
}

const ImageUpload: React.FC<ImageUploadProps> = ({
  onImageUpload,
  currentImage,
  onImageRemove,
  className = '',
  accept = 'image/*',
  maxSize = 5,
  placeholder = 'Clique para fazer upload de uma imagem'
}) => {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (file: File) => {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Por favor, selecione apenas arquivos de imagem');
      return;
    }

    // Validate file size
    if (file.size > maxSize * 1024 * 1024) {
      toast.error(`O arquivo deve ter no máximo ${maxSize}MB`);
      return;
    }

    setUploading(true);
    try {
      await onImageUpload(file);
      toast.success('Imagem enviada com sucesso!');
    } catch (error) {
      console.error('Erro ao fazer upload da imagem:', error);
      toast.error('Erro ao fazer upload da imagem');
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

  const handleRemoveImage = () => {
    if (onImageRemove) {
      onImageRemove();
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
      
      {currentImage ? (
        <div className="relative group">
          <img
            src={currentImage}
            alt="Preview"
            className="w-full h-48 object-cover rounded-lg border-2 border-gray-200"
          />
          <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
            <div className="flex gap-2">
              <button
                onClick={handleClick}
                className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-full transition-colors"
                title="Alterar imagem"
              >
                <Upload className="w-4 h-4" />
              </button>
              {onImageRemove && (
                <button
                  onClick={handleRemoveImage}
                  className="bg-red-600 hover:bg-red-700 text-white p-2 rounded-full transition-colors"
                  title="Remover imagem"
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
              <p className="text-sm text-gray-600">Enviando imagem...</p>
            </>
          ) : (
            <>
              <div className="p-3 bg-gray-100 rounded-full">
                <ImageIcon className="w-6 h-6 text-gray-600" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-gray-900">{placeholder}</p>
                <p className="text-xs text-gray-500 mt-1">
                  Arraste e solte ou clique para selecionar
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  PNG, JPG, GIF até {maxSize}MB
                </p>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default ImageUpload;