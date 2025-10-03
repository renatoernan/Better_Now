import { useEffect, useRef } from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../../services/lib/supabase';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import { contactsCache } from '../utils/cacheSystem';
import { ActivityLogger } from '../../utils/utils/activityLogger';

interface ContactFormData {
  id: string;
  name: string;
  email: string;
  phone?: string;
  event_type: string;
  guests?: number;
  event_date?: string;
  message?: string;
  status: 'new' | 'read' | 'responded';
  created_at: string;
}

interface CarouselImageData {
  id: string;
  filename: string;
  title?: string;
  active: boolean;
  deleted: boolean;
  order_position: number;
  uploaded_at: string;
  file_url?: string;
}

export const useRealtimeNotifications = () => {
  const { isAuthenticated } = useAuth();
  const channelRef = useRef<RealtimeChannel | null>(null);


  useEffect(() => {
    if (!isAuthenticated) {
      // Limpar subscription se não estiver autenticado
      if (channelRef.current) {
        channelRef.current.unsubscribe();
        channelRef.current = null;
      }
      return;
    }

    // Criar canal de real-time
    const channel = supabase
      .channel('admin-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'contact_forms'
        },
        (payload) => {
          const newContact = payload.new as ContactFormData;
          
          // Invalidar cache de contatos
          contactsCache.invalidate('contacts-list');
          contactsCache.invalidate('contacts-stats');
          
          // Mostrar notificação
          toast.info('Novo Contato Recebido!', {
            description: `${newContact.name} enviou uma mensagem sobre ${newContact.event_type}`,
            duration: 8000,
            action: {
              label: 'Ver Contatos',
              onClick: () => {
                // Navegar para a aba de contatos se estivermos no painel admin
                const event = new CustomEvent('navigate-to-contacts');
                window.dispatchEvent(event);
              }
            }
          });

          // Log da atividade
          ActivityLogger.logContact(
            'contact_received',
            `Novo contato recebido de ${newContact.name}`,
            'info',
            { contactId: newContact.id, email: newContact.email }
          );
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'contact_forms'
        },
        (payload) => {
          const updatedContact = payload.new as ContactFormData;
          const oldContact = payload.old as ContactFormData;
          
          // Invalidar cache apenas se o status mudou
          if (updatedContact.status !== oldContact.status) {
            contactsCache.invalidate('contacts-list');
            contactsCache.invalidate('contacts-stats');
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'carousel_images'
        },
        (payload) => {
          const newImage = payload.new as CarouselImageData;
          
          // Invalidar cache de imagens
          contactsCache.invalidate('carousel-images');
          
          // Mostrar notificação
          toast.success('Nova Imagem Adicionada!', {
            description: `A imagem "${newImage.title || newImage.filename}" foi adicionada ao carrossel`,
            duration: 5000
          });

          // Log da atividade
          ActivityLogger.logImage(
            'image_uploaded',
            `Nova imagem adicionada: ${newImage.filename}`,
            'info',
            { imageId: newImage.id, filename: newImage.filename }
          );
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'carousel_images'
        },
        (payload) => {
          const updatedImage = payload.new as CarouselImageData;
          const oldImage = payload.old as CarouselImageData;
          
          // Invalidar cache de imagens
          contactsCache.invalidate('carousel-images');
          
          // Notificar sobre mudanças importantes
          if (updatedImage.active !== oldImage.active) {
            const status = updatedImage.active ? 'ativada' : 'desativada';
            toast.info('Status da Imagem Alterado', {
              description: `A imagem "${updatedImage.title || updatedImage.filename}" foi ${status}`,
              duration: 4000
            });
          }
          
          if (updatedImage.deleted !== oldImage.deleted && updatedImage.deleted) {
            toast.info('Imagem Removida', {
              description: `A imagem "${updatedImage.title || updatedImage.filename}" foi movida para a lixeira`,
              duration: 4000
            });
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('✅ Notificações em tempo real ativadas');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Erro no canal de notificações em tempo real');
        }
      });

    channelRef.current = channel;

    // Cleanup
    return () => {
      if (channelRef.current) {
        channelRef.current.unsubscribe();
        channelRef.current = null;
      }
    };
  }, [isAuthenticated]);

  // Função para desconectar manualmente
  const disconnect = () => {
    if (channelRef.current) {
      channelRef.current.unsubscribe();
      channelRef.current = null;
    }
  };

  // Função para reconectar
  const reconnect = () => {
    disconnect();
    // O useEffect será executado novamente devido às dependências
  };

  return {
    disconnect,
    reconnect,
    isConnected: channelRef.current !== null
  };
};