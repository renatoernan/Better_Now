import React, { useState, useRef, useEffect } from 'react';
import { ImageIcon, AlertCircle } from 'lucide-react';
import { cacheSystem } from '../../utils/cacheSystem';
import { ActivityLogger } from '../../shared/utils/utils/activityLogger';

interface LazyImageProps {
  src: string;
  alt: string;
  className?: string;
  placeholder?: string;
  fallback?: string;
  onLoad?: () => void;
  onError?: (error: Error) => void;
  threshold?: number; // Threshold para Intersection Observer
  quality?: 'low' | 'medium' | 'high';
  sizes?: string;
  loading?: 'lazy' | 'eager';
  priority?: boolean; // Para imagens críticas
}

interface ImageState {
  isLoaded: boolean;
  isLoading: boolean;
  hasError: boolean;
  error?: Error;
}

const LazyImage: React.FC<LazyImageProps> = ({
  src,
  alt,
  className = '',
  placeholder,
  fallback,
  onLoad,
  onError,
  threshold = 0.1,
  quality = 'medium',
  sizes,
  loading = 'lazy',
  priority = false
}) => {
  const [state, setState] = useState<ImageState>({
    isLoaded: false,
    isLoading: false,
    hasError: false
  });
  const [isInView, setIsInView] = useState(priority || loading === 'eager');
  const imgRef = useRef<HTMLImageElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);


  // Gerar chave de cache baseada na URL e qualidade
  const cacheKey = `${src}_${quality}`;

  // Configurar Intersection Observer
  useEffect(() => {
    if (priority || loading === 'eager') {
      setIsInView(true);
      return;
    }

    if (!imgRef.current) return;

    observerRef.current = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observerRef.current?.disconnect();
        }
      },
      {
        threshold,
        rootMargin: '50px' // Começar a carregar 50px antes
      }
    );

    observerRef.current.observe(imgRef.current);

    return () => {
      observerRef.current?.disconnect();
    };
  }, [threshold, priority, loading]);

  // Carregar imagem quando estiver em vista
  useEffect(() => {
    if (!isInView || state.isLoaded || state.isLoading) return;

    loadImage();
  }, [isInView, src, quality]);

  const loadImage = async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, hasError: false }));

      // Verificar cache primeiro
      const cachedUrl = cacheSystem.get<string>(cacheKey);
      if (cachedUrl) {
        setState(prev => ({ 
          ...prev, 
          isLoaded: true, 
          isLoading: false 
        }));
        onLoad?.();
        return;
      }

      // Carregar imagem
      const img = new Image();
      
      img.onload = () => {
        // Armazenar no cache
        cacheSystem.set(cacheKey, src, 30 * 60 * 1000); // 30 minutos
        
        setState(prev => ({ 
          ...prev, 
          isLoaded: true, 
          isLoading: false 
        }));
        
        onLoad?.();
        
        ActivityLogger.logImage(
          'image_loaded',
          `Imagem carregada: ${alt}`,
          'info',
          { src, quality, cached: false }
        );
      };
      
      img.onerror = () => {
        const error = new Error(`Falha ao carregar imagem: ${src}`);
        setState(prev => ({ 
          ...prev, 
          isLoading: false, 
          hasError: true, 
          error 
        }));
        
        onError?.(error);
        
        ActivityLogger.logImage(
          'image_load_error',
          `Erro ao carregar imagem: ${alt}`,
          'error',
          { src, error: error.message }
        );
      };
      
      // Aplicar otimizações baseadas na qualidade
      img.src = optimizeImageUrl(src, quality);
      
    } catch (error: any) {
      setState(prev => ({ 
        ...prev, 
        isLoading: false, 
        hasError: true, 
        error 
      }));
      onError?.(error);
    }
  };

  const optimizeImageUrl = (url: string, quality: 'low' | 'medium' | 'high'): string => {
    // Se for uma URL do Supabase Storage, adicionar parâmetros de otimização
    if (url.includes('supabase')) {
      const qualityMap = {
        low: 60,
        medium: 80,
        high: 95
      };
      
      const separator = url.includes('?') ? '&' : '?';
      return `${url}${separator}quality=${qualityMap[quality]}&format=webp`;
    }
    
    return url;
  };

  const retry = () => {
    setState({
      isLoaded: false,
      isLoading: false,
      hasError: false
    });
    // Remover do cache para forçar reload
    cacheSystem.delete(cacheKey);
    loadImage();
  };

  // Renderizar placeholder enquanto carrega
  if (!isInView || (!state.isLoaded && !state.hasError)) {
    return (
      <div 
        ref={imgRef}
        className={`bg-gray-200 animate-pulse flex items-center justify-center ${className}`}
        style={{ minHeight: '200px' }}
      >
        {state.isLoading ? (
          <div className="flex flex-col items-center space-y-2">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-sm text-gray-500">Carregando...</span>
          </div>
        ) : (
          <div className="flex flex-col items-center space-y-2 text-gray-400">
            <ImageIcon className="w-12 h-12" />
            <span className="text-sm">Imagem</span>
          </div>
        )}
      </div>
    );
  }

  // Renderizar erro
  if (state.hasError) {
    return (
      <div 
        className={`bg-red-50 border border-red-200 rounded-lg flex flex-col items-center justify-center p-4 ${className}`}
        style={{ minHeight: '200px' }}
      >
        <AlertCircle className="w-12 h-12 text-red-400 mb-2" />
        <p className="text-red-600 text-sm text-center mb-3">
          Erro ao carregar imagem
        </p>
        <button
          onClick={retry}
          className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors"
        >
          Tentar novamente
        </button>
        {fallback && (
          <img
            src={fallback}
            alt={alt}
            className="mt-3 max-w-full h-auto opacity-50"
          />
        )}
      </div>
    );
  }

  // Renderizar imagem carregada
  return (
    <img
      ref={imgRef}
      src={optimizeImageUrl(src, quality)}
      alt={alt}
      className={`transition-opacity duration-300 ${state.isLoaded ? 'opacity-100' : 'opacity-0'} ${className}`}
      sizes={sizes}
      loading={loading}
      onLoad={() => {
        setState(prev => ({ ...prev, isLoaded: true }));
        onLoad?.();
      }}
      onError={(e) => {
        const error = new Error(`Falha ao carregar imagem: ${src}`);
        setState(prev => ({ 
          ...prev, 
          hasError: true, 
          error 
        }));
        onError?.(error);
      }}
    />
  );
};

// Hook para pré-carregar imagens
export const useImagePreloader = () => {
  const preloadImage = (src: string, quality: 'low' | 'medium' | 'high' = 'medium'): Promise<void> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve();
      img.onerror = reject;
      img.src = src;
    });
  };

  const preloadImages = async (urls: string[], quality: 'low' | 'medium' | 'high' = 'medium'): Promise<void> => {
    try {
      await Promise.all(urls.map(url => preloadImage(url, quality)));
    } catch (error) {
      console.warn('Erro ao pré-carregar algumas imagens:', error);
    }
  };

  return { preloadImage, preloadImages };
};

// Componente para imagens do carrossel com otimizações específicas
export const CarouselImage: React.FC<LazyImageProps & {
  index: number;
  isActive: boolean;
}> = ({ index, isActive, ...props }) => {
  return (
    <LazyImage
      {...props}
      priority={index === 0} // Primeira imagem tem prioridade
      quality={isActive ? 'high' : 'medium'} // Imagem ativa em alta qualidade
      loading={index < 3 ? 'eager' : 'lazy'} // Primeiras 3 imagens carregam imediatamente
    />
  );
};

// Componente para thumbnails
export const ThumbnailImage: React.FC<LazyImageProps> = (props) => {
  return (
    <LazyImage
      {...props}
      quality="low" // Thumbnails em baixa qualidade
      threshold={0.5} // Carregar quando 50% visível
    />
  );
};

export default LazyImage;