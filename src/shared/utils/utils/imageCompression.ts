import { ActivityLogger } from './activityLogger';

interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  maxSizeKB?: number;
  format?: 'jpeg' | 'webp' | 'png';
  maintainAspectRatio?: boolean;
  progressive?: boolean;
}

interface CompressionResult {
  compressedFile: File;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  dimensions: {
    original: { width: number; height: number };
    compressed: { width: number; height: number };
  };
  format: string;
  processingTime: number;
}

interface ImageMetadata {
  width: number;
  height: number;
  size: number;
  type: string;
  name: string;
  lastModified: number;
}

export class ImageCompressionSystem {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  constructor() {
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d')!;
  }

  /**
   * Comprimir imagem com opções personalizadas
   */
  async compressImage(
    file: File,
    options: CompressionOptions = {}
  ): Promise<CompressionResult> {
    const startTime = Date.now();
    
    const defaultOptions: Required<CompressionOptions> = {
      maxWidth: 1920,
      maxHeight: 1080,
      quality: 0.8,
      maxSizeKB: 500,
      format: 'jpeg',
      maintainAspectRatio: true,
      progressive: true
    };

    const config = { ...defaultOptions, ...options };

    try {
      // Validar arquivo
      this.validateImageFile(file);

      // Obter metadados da imagem original
      const originalMetadata = await this.getImageMetadata(file);
      
      // Carregar imagem
      const img = await this.loadImage(file);
      
      // Calcular dimensões otimizadas
      const dimensions = this.calculateOptimalDimensions(
        img.width,
        img.height,
        config
      );

      // Configurar canvas
      this.canvas.width = dimensions.width;
      this.canvas.height = dimensions.height;

      // Desenhar imagem redimensionada
      this.ctx.clearRect(0, 0, dimensions.width, dimensions.height);
      
      // Aplicar filtros de qualidade
      this.ctx.imageSmoothingEnabled = true;
      this.ctx.imageSmoothingQuality = 'high';
      
      this.ctx.drawImage(
        img,
        0, 0, img.width, img.height,
        0, 0, dimensions.width, dimensions.height
      );

      // Comprimir e converter
      let compressedFile = await this.canvasToFile(
        this.canvas,
        config.format,
        config.quality,
        file.name
      );

      // Verificar se precisa de compressão adicional
      if (compressedFile.size > config.maxSizeKB * 1024) {
        compressedFile = await this.additionalCompression(
          compressedFile,
          config
        );
      }

      const processingTime = Date.now() - startTime;
      const compressionRatio = (1 - compressedFile.size / file.size) * 100;

      const result: CompressionResult = {
        compressedFile,
        originalSize: file.size,
        compressedSize: compressedFile.size,
        compressionRatio,
        dimensions: {
          original: { width: img.width, height: img.height },
          compressed: { width: dimensions.width, height: dimensions.height }
        },
        format: config.format,
        processingTime
      };

      ActivityLogger.logImage(
        'image_compression_success',
        `Imagem comprimida: ${file.name}`,
        'success',
        {
          originalSize: this.formatFileSize(file.size),
          compressedSize: this.formatFileSize(compressedFile.size),
          compressionRatio: `${compressionRatio.toFixed(1)}%`,
          processingTime: `${processingTime}ms`,
          dimensions: result.dimensions
        }
      );

      return result;
    } catch (error) {
      ActivityLogger.logImage(
        'image_compression_error',
        `Erro na compressão: ${file.name}`,
        'error',
        { error: error.message }
      );
      throw error;
    }
  }

  /**
   * Comprimir múltiplas imagens em lote
   */
  async compressBatch(
    files: File[],
    options: CompressionOptions = {},
    onProgress?: (progress: number, current: number, total: number) => void
  ): Promise<CompressionResult[]> {
    const results: CompressionResult[] = [];
    const total = files.length;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      try {
        const result = await this.compressImage(file, options);
        results.push(result);
        
        if (onProgress) {
          onProgress(((i + 1) / total) * 100, i + 1, total);
        }
      } catch (error) {
        // Continuar com as outras imagens mesmo se uma falhar
        ActivityLogger.logImage(
          'batch_compression_item_error',
          `Erro na compressão em lote: ${file.name}`,
          'error',
          { error: error.message, index: i }
        );
      }
    }

    ActivityLogger.logImage(
      'batch_compression_completed',
      `Compressão em lote concluída: ${results.length}/${total} sucessos`,
      'info',
      {
        successful: results.length,
        total,
        totalOriginalSize: this.formatFileSize(
          files.reduce((sum, f) => sum + f.size, 0)
        ),
        totalCompressedSize: this.formatFileSize(
          results.reduce((sum, r) => sum + r.compressedSize, 0)
        )
      }
    );

    return results;
  }

  /**
   * Validar arquivo de imagem
   */
  private validateImageFile(file: File): void {
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    
    if (!validTypes.includes(file.type)) {
      throw new Error(`Tipo de arquivo não suportado: ${file.type}`);
    }

    // Limite de 50MB para arquivo original
    if (file.size > 50 * 1024 * 1024) {
      throw new Error('Arquivo muito grande (máximo 50MB)');
    }
  }

  /**
   * Obter metadados da imagem
   */
  private async getImageMetadata(file: File): Promise<ImageMetadata> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      
      img.onload = () => {
        resolve({
          width: img.width,
          height: img.height,
          size: file.size,
          type: file.type,
          name: file.name,
          lastModified: file.lastModified
        });
      };
      
      img.onerror = () => {
        reject(new Error('Não foi possível carregar a imagem'));
      };
      
      img.src = URL.createObjectURL(file);
    });
  }

  /**
   * Carregar imagem como HTMLImageElement
   */
  private async loadImage(file: File): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      
      img.onload = () => {
        URL.revokeObjectURL(img.src);
        resolve(img);
      };
      
      img.onerror = () => {
        URL.revokeObjectURL(img.src);
        reject(new Error('Erro ao carregar imagem'));
      };
      
      img.src = URL.createObjectURL(file);
    });
  }

  /**
   * Calcular dimensões otimizadas
   */
  private calculateOptimalDimensions(
    originalWidth: number,
    originalHeight: number,
    options: Required<CompressionOptions>
  ): { width: number; height: number } {
    let { width, height } = { width: originalWidth, height: originalHeight };

    // Se a imagem já é menor que os limites, manter tamanho original
    if (width <= options.maxWidth && height <= options.maxHeight) {
      return { width, height };
    }

    if (options.maintainAspectRatio) {
      const aspectRatio = width / height;
      
      if (width > options.maxWidth) {
        width = options.maxWidth;
        height = width / aspectRatio;
      }
      
      if (height > options.maxHeight) {
        height = options.maxHeight;
        width = height * aspectRatio;
      }
    } else {
      width = Math.min(width, options.maxWidth);
      height = Math.min(height, options.maxHeight);
    }

    return {
      width: Math.round(width),
      height: Math.round(height)
    };
  }

  /**
   * Converter canvas para arquivo
   */
  private async canvasToFile(
    canvas: HTMLCanvasElement,
    format: string,
    quality: number,
    originalName: string
  ): Promise<File> {
    return new Promise((resolve, reject) => {
      const mimeType = `image/${format}`;
      
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Erro na conversão do canvas'));
            return;
          }
          
          const extension = format === 'jpeg' ? 'jpg' : format;
          const name = originalName.replace(/\.[^/.]+$/, `.${extension}`);
          
          const file = new File([blob], name, {
            type: mimeType,
            lastModified: Date.now()
          });
          
          resolve(file);
        },
        mimeType,
        quality
      );
    });
  }

  /**
   * Compressão adicional se necessário
   */
  private async additionalCompression(
    file: File,
    options: Required<CompressionOptions>
  ): Promise<File> {
    let currentQuality = options.quality;
    let compressedFile = file;
    const minQuality = 0.3;
    const qualityStep = 0.1;

    while (
      compressedFile.size > options.maxSizeKB * 1024 &&
      currentQuality > minQuality
    ) {
      currentQuality -= qualityStep;
      
      // Recomprimir com qualidade menor
      const img = await this.loadImage(compressedFile);
      
      this.canvas.width = img.width;
      this.canvas.height = img.height;
      
      this.ctx.clearRect(0, 0, img.width, img.height);
      this.ctx.drawImage(img, 0, 0);
      
      compressedFile = await this.canvasToFile(
        this.canvas,
        options.format,
        currentQuality,
        file.name
      );
    }

    return compressedFile;
  }

  /**
   * Formatar tamanho de arquivo
   */
  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Gerar thumbnail
   */
  async generateThumbnail(
    file: File,
    size: number = 150
  ): Promise<File> {
    const result = await this.compressImage(file, {
      maxWidth: size,
      maxHeight: size,
      quality: 0.7,
      format: 'jpeg',
      maintainAspectRatio: true
    });

    return result.compressedFile;
  }

  /**
   * Otimizar para web
   */
  async optimizeForWeb(file: File): Promise<CompressionResult> {
    return this.compressImage(file, {
      maxWidth: 1920,
      maxHeight: 1080,
      quality: 0.85,
      maxSizeKB: 800,
      format: 'webp',
      progressive: true
    });
  }

  /**
   * Otimizar para mobile
   */
  async optimizeForMobile(file: File): Promise<CompressionResult> {
    return this.compressImage(file, {
      maxWidth: 1080,
      maxHeight: 720,
      quality: 0.75,
      maxSizeKB: 300,
      format: 'jpeg',
      progressive: true
    });
  }

  /**
   * Obter estatísticas de compressão
   */
  getCompressionStats(): {
    totalCompressions: number;
    totalOriginalSize: number;
    totalCompressedSize: number;
    averageCompressionRatio: number;
    averageProcessingTime: number;
  } {
    const activities = ActivityLogger.getLogs().slice(-1000);
    
    const compressionActivities = activities.filter(a => 
      a.action === 'image_compression_success'
    );

    if (compressionActivities.length === 0) {
      return {
        totalCompressions: 0,
        totalOriginalSize: 0,
        totalCompressedSize: 0,
        averageCompressionRatio: 0,
        averageProcessingTime: 0
      };
    }

    const totalOriginalSize = compressionActivities.reduce(
      (sum, activity) => sum + (activity.metadata?.originalSize || 0), 0
    );
    
    const totalCompressedSize = compressionActivities.reduce(
      (sum, activity) => sum + (activity.metadata?.compressedSize || 0), 0
    );
    
    const totalProcessingTime = compressionActivities.reduce(
      (sum, activity) => sum + (activity.metadata?.processingTime || 0), 0
    );

    const averageCompressionRatio = totalOriginalSize > 0 
      ? ((totalOriginalSize - totalCompressedSize) / totalOriginalSize) * 100
      : 0;

    return {
      totalCompressions: compressionActivities.length,
      totalOriginalSize,
      totalCompressedSize,
      averageCompressionRatio,
      averageProcessingTime: totalProcessingTime / compressionActivities.length
    };
  }
}

// Instância global do sistema de compressão
export const imageCompression = new ImageCompressionSystem();

// Helpers para uso comum
export const compressImage = imageCompression.compressImage.bind(imageCompression);
export const compressBatch = imageCompression.compressBatch.bind(imageCompression);
export const generateThumbnail = imageCompression.generateThumbnail.bind(imageCompression);
export const optimizeForWeb = imageCompression.optimizeForWeb.bind(imageCompression);
export const optimizeForMobile = imageCompression.optimizeForMobile.bind(imageCompression);