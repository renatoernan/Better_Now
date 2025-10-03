import { useState, useEffect } from 'react';
import { supabase, uploadImage, getPublicUrl, deleteImage as deleteStorageImage } from '../../services/lib/supabase';
import type { CarouselImage } from '../../services/lib/supabase';
import { ActivityLogger } from '../../utils/utils/activityLogger';

export const useSupabaseImages = () => {
  const [images, setImages] = useState<CarouselImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Carregar imagens do Supabase
  const loadImages = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('carousel_images')
        .select('*')
        .order('order_position', { ascending: true });

      if (error) throw error;

      setImages(data || []);
    } catch (err) {
      console.error('Erro ao carregar imagens:', err);
      setError('Erro ao carregar imagens');
    } finally {
      setLoading(false);
    }
  };

  // Adicionar nova imagem
  const addImage = async (file: File, title?: string): Promise<boolean> => {
    try {
      setError(null);
      
      ActivityLogger.logImage('supabase_upload_start', `Iniciando upload da imagem ${file.name} para Supabase`, 'info', {
        fileName: file.name,
        title: title || file.name.replace(/\.[^/.]+$/, ''),
        fileSize: file.size
      });
      
      // Upload da imagem para o Storage
      const uploadResult = await uploadImage(file);
      if (!uploadResult.success || !uploadResult.path) {
        ActivityLogger.logImage('supabase_upload_storage_error', `Erro no upload para storage: ${uploadResult.error}`, 'error', {
          fileName: file.name,
          title: title || file.name.replace(/\.[^/.]+$/, ''),
          error: uploadResult.error
        });
        throw new Error(uploadResult.error || 'Erro no upload');
      }

      // Obter URL pública
      const publicUrl = getPublicUrl(uploadResult.path);

      // Obter próxima posição
      const maxOrder = Math.max(...images.map(img => img.order_position), -1);

      // Inserir registro na tabela
      const { error } = await supabase
        .from('carousel_images')
        .insert([
          {
            filename: file.name,
            title: title || file.name.replace(/\.[^/.]+$/, ''),
            file_url: publicUrl,
            storage_path: uploadResult.path,
            file_size: file.size,
            mime_type: file.type,
            active: true,
            deleted: false,
            order_position: maxOrder + 1
          }
        ]);

      if (error) {
        ActivityLogger.logImage('supabase_upload_db_error', `Erro ao inserir no banco: ${error.message}`, 'error', {
          fileName: file.name,
          title: title || file.name.replace(/\.[^/.]+$/, ''),
          error: error.message
        });
        throw error;
      }

      ActivityLogger.logImage('supabase_upload_success', `Upload da imagem ${file.name} concluído com sucesso`, 'success', {
        fileName: file.name,
        title: title || file.name.replace(/\.[^/.]+$/, ''),
        storedPath: uploadResult.path,
        publicUrl
      });

      // Recarregar imagens
      await loadImages();
      return true;
    } catch (err) {
      console.error('Erro ao adicionar imagem:', err);
      ActivityLogger.logImage('supabase_upload_error', `Erro inesperado no upload: ${err}`, 'error', {
        fileName: file.name,
        title: title || file.name.replace(/\.[^/.]+$/, ''),
        error: err.toString()
      });
      setError('Erro ao adicionar imagem');
      return false;
    }
  };

  // Atualizar imagem
  const updateImage = async (id: string, updates: Partial<CarouselImage>): Promise<boolean> => {
    try {
      setError(null);
      
      const { error } = await supabase
        .from('carousel_images')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      // Atualizar estado local
      setImages(prev => prev.map(img => 
        img.id === id ? { ...img, ...updates } : img
      ));
      
      return true;
    } catch (err) {
      console.error('Erro ao atualizar imagem:', err);
      setError('Erro ao atualizar imagem');
      return false;
    }
  };

  // Alternar status ativo/inativo
  const toggleImage = async (id: string): Promise<boolean> => {
    const image = images.find(img => img.id === id);
    if (!image) {
      ActivityLogger.logImage('supabase_toggle_not_found', `Imagem com ID ${id} não encontrada`, 'error', {
        imageId: id
      });
      return false;
    }
    
    const newStatus = !image.active;
    ActivityLogger.logImage('supabase_toggle_start', `Iniciando alteração de status da imagem ${image.title}`, 'info', {
      imageId: id,
      imageTitle: image.title,
      oldStatus: image.active,
      newStatus
    });
    
    const result = await updateImage(id, { active: newStatus });
    
    if (result) {
      ActivityLogger.logImage('supabase_toggle_success', `Status da imagem ${image.title} alterado com sucesso`, 'success', {
        imageId: id,
        imageTitle: image.title,
        newStatus
      });
    } else {
      ActivityLogger.logImage('supabase_toggle_error', `Erro ao alterar status da imagem ${image.title}`, 'error', {
        imageId: id,
        imageTitle: image.title
      });
    }
    
    return result;
  };

  // Mover para lixeira (soft delete)
  const moveToTrash = async (id: string): Promise<boolean> => {
    return await updateImage(id, { deleted: true, active: false });
  };

  // Restaurar da lixeira
  const restoreImage = async (id: string): Promise<boolean> => {
    return await updateImage(id, { deleted: false });
  };

  // Deletar permanentemente
  const permanentlyDelete = async (id: string): Promise<boolean> => {
    try {
      setError(null);
      
      const image = images.find(img => img.id === id);
      if (!image) {
        ActivityLogger.logImage('supabase_delete_not_found', `Imagem com ID ${id} não encontrada`, 'error', {
          imageId: id
        });
        return false;
      }

      ActivityLogger.logImage('supabase_delete_start', `Iniciando exclusão da imagem ${image.title}`, 'info', {
        imageId: id,
        imageTitle: image.title,
        fileName: image.filename
      });

      // Deletar arquivo do Storage se existir
      if (image.storage_path) {
        await deleteStorageImage(image.storage_path);
      }

      // Deletar registro da tabela
      const { error } = await supabase
        .from('carousel_images')
        .delete()
        .eq('id', id);

      if (error) {
        ActivityLogger.logImage('supabase_delete_db_error', `Erro ao excluir do banco: ${error.message}`, 'error', {
          imageId: id,
          imageTitle: image.title,
          error: error.message
        });
        throw error;
      }

      ActivityLogger.logImage('supabase_delete_success', `Imagem ${image.title} excluída com sucesso`, 'success', {
        imageId: id,
        imageTitle: image.title,
        fileName: image.filename
      });

      // Remover do estado local
      setImages(prev => prev.filter(img => img.id !== id));
      
      return true;
    } catch (err) {
      console.error('Erro ao deletar imagem permanentemente:', err);
      ActivityLogger.logImage('supabase_delete_error', `Erro inesperado na exclusão: ${err}`, 'error', {
        imageId: id,
        error: err.toString()
      });
      setError('Erro ao deletar imagem');
      return false;
    }
  };

  // Reordenar imagens
  const reorderImages = async (imageIds: string[]): Promise<boolean> => {
    try {
      setError(null);
      
      // Atualizar ordem no banco
      const updates = imageIds.map((id, index) => 
        supabase
          .from('carousel_images')
          .update({ order_position: index })
          .eq('id', id)
      );

      await Promise.all(updates);

      // Recarregar imagens
      await loadImages();
      
      return true;
    } catch (err) {
      console.error('Erro ao reordenar imagens:', err);
      setError('Erro ao reordenar imagens');
      return false;
    }
  };

  // Obter imagens ativas
  const getActiveImages = () => {
    return images.filter(img => img.active && !img.deleted)
      .sort((a, b) => a.order_position - b.order_position);
  };

  // Obter imagens na lixeira
  const getDeletedImages = () => {
    return images.filter(img => img.deleted)
      .sort((a, b) => new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime());
  };

  // Carregar imagens na inicialização
  useEffect(() => {
    loadImages();
  }, []);

  return {
    images,
    loading,
    error,
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
  };
};

export default useSupabaseImages;