import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../services/lib/supabase';
import { ActivityLogger } from '../../utils/utils/activityLogger';
import { toast } from 'sonner';

export interface AppSettings {
  site_title: string;
  contact_email: string;
  phone: string;
  address: string;
  social_instagram: string;
  social_whatsapp: string;
  carousel_autoplay: boolean;
  carousel_interval: number;
  testimonial_carousel_interval: number;
  max_file_size: number;
  allowed_file_types: string[];
  backup_retention_days: number;
  notification_email: string;
  business_hours_weekdays: string;
  business_hours_weekend: string;
  business_hours_closed_days: string;
  waha_api_url: string;
  waha_session_name: string;
  waha_api_key: string;
  waha_enabled: boolean;
  waha_msg_order_created: string;
  waha_msg_order_confirmed: string;
  waha_msg_order_cancelled: string;
  email_smtp_user: string;
  email_smtp_password: string;
  email_incoming_host: string;
  email_imap_port: number;
  email_pop3_port: number;
  email_outgoing_host: string;
  email_smtp_port: number;
  email_from_name: string;
  email_from_address: string;
  email_security: 'ssl_tls' | 'starttls' | 'none';
  email_auth_required: boolean;
  email_enabled: boolean;
  email_msg_order_created_subject: string;
  email_msg_order_created_body: string;
  email_msg_order_confirmed_subject: string;
  email_msg_order_confirmed_body: string;
  email_msg_order_cancelled_subject: string;
  email_msg_order_cancelled_body: string;
}

export interface AppSettingsHook {
  settings: AppSettings | null;
  loading: boolean;
  saving: boolean;
  error: string | null;
  loadSettings: () => Promise<void>;
  updateSetting: (key: keyof AppSettings, value: any) => Promise<boolean>;
  updateMultipleSettings: (updates: Partial<AppSettings>) => Promise<boolean>;
}

const defaultSettings: AppSettings = {
  site_title: 'Better Now',
  contact_email: 'contato@betternow.com',
  phone: '+55 11 99999-9999',
  address: 'São Paulo, SP',
  social_instagram: '@betternow',
  social_whatsapp: '+5511999999999',
  carousel_autoplay: true,
  carousel_interval: 5000,
  testimonial_carousel_interval: 5000,
  max_file_size: 5242880,
  allowed_file_types: ['image/jpeg', 'image/png', 'image/webp'],
  backup_retention_days: 30,
  notification_email: 'admin@betternow.com',
  business_hours_weekdays: 'Segunda a Sexta: 08:00 - 18:00',
  business_hours_weekend: 'Sábado: 08:00 - 12:00',
  business_hours_closed_days: 'Domingo: Fechado',
  waha_api_url: '',
  waha_session_name: 'default',
  waha_api_key: '',
  waha_enabled: true,
  waha_msg_order_created: 'Olá, {cliente}! Recebemos seu pedido #{numero_pedido} para o evento *{evento}*.\n\n💰 *Total:* {total}\n⏳ *Status:* Aguardando Pagamento\n\n💳 *Link para Pagamento:* {link_pagamento}\n\nAssim que o pagamento for confirmado, você receberá seus ingressos por aqui!',
  waha_msg_order_confirmed: '🎉 Parabéns, {cliente}! Seu pagamento para o evento *{evento}* foi confirmado com sucesso!\n\n🎟️ *Quantidade de Ingressos:* {quantidade}\n📅 *Data:* {data_evento}\n📍 *Local:* {local_evento}\n\nVocê pode acessar seus ingressos a qualquer momento através do link: {link_acesso}',
  waha_msg_order_cancelled: 'Olá, {cliente}. Informamos que seu pedido #{numero_pedido} para o evento *{evento}* foi cancelado.\n\nSe você tiver alguma dúvida, entre em contato conosco.',
  email_smtp_user: 'betternow@cesire.com.br',
  email_smtp_password: '',
  email_incoming_host: 'mail.cesire.com.br',
  email_imap_port: 993,
  email_pop3_port: 995,
  email_outgoing_host: 'mail.cesire.com.br',
  email_smtp_port: 465,
  email_from_name: 'Better Now',
  email_from_address: 'betternow@cesire.com.br',
  email_security: 'ssl_tls',
  email_auth_required: true,
  email_enabled: true,
  email_msg_order_created_subject: 'Pedido Recebido #{numero_pedido} - {evento}',
  email_msg_order_created_body: 'Olá, {cliente}!\n\nRecebemos o seu pedido #{numero_pedido} para o evento {evento}.\n\nValor Total: {total}\nQuantidade de Ingressos: {quantidade}\n\nPara efetuar ou concluir o pagamento, acesse o link abaixo:\n{link_pagamento}\n\nAssim que o pagamento for confirmado, você receberá seus ingressos com QR Code por aqui!',
  email_msg_order_confirmed_subject: '🎉 Ingressos Confirmados! Pedido #{numero_pedido} - {evento}',
  email_msg_order_confirmed_body: 'Parabéns, {cliente}!\n\nSeu pagamento para o evento {evento} foi confirmado com sucesso!\n\nDetalhes do Evento:\n- Data: {data_evento}\n- Local: {local_evento}\n- Quantidade de Ingressos: {quantidade}\n\nVocê pode visualizar seus ingressos e QR Codes no link abaixo:\n{link_acesso}',
  email_msg_order_cancelled_subject: 'Pedido Cancelado #{numero_pedido} - {evento}',
  email_msg_order_cancelled_body: 'Olá, {cliente}.\n\nInformamos que seu pedido #{numero_pedido} para o evento {evento} foi cancelado.\n\nSe tiver alguma dúvida, entre em contato conosco.',
};

export const useAppSettings = (): AppSettingsHook => {
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSettings = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('app_settings')
        .select('key, value')
        .in('key', Object.keys(defaultSettings));

      if (fetchError) {
        throw fetchError;
      }

      // Converter os dados do Supabase para o formato do hook
      const settingsData: Partial<AppSettings> = {};
      
      data?.forEach((item) => {
        const key = item.key as keyof AppSettings;
        let value = item.value;
        
        // Parse JSON values
        if (typeof value === 'string') {
          try {
            value = JSON.parse(value);
          } catch {
            // Se não conseguir fazer parse, manter como string
          }
        }
        
        (settingsData as any)[key] = value;
      });

      // Mesclar com configurações padrão
      const finalSettings = { ...defaultSettings, ...settingsData };
      setSettings(finalSettings);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao carregar configurações';
      setError(errorMessage);
      toast.error('Erro ao carregar configurações', {
        description: errorMessage
      });
      
      // Em caso de erro, usar configurações padrão
      setSettings(defaultSettings);
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = async (key: keyof AppSettings, value: any): Promise<boolean> => {
    try {
      setSaving(true);
      setError(null);

      // Preparar valor para salvar
      let valueToSave = value;
      if (typeof value === 'object' || typeof value === 'boolean' || typeof value === 'number') {
        valueToSave = JSON.stringify(value);
      }

      const { error: updateError } = await supabase
        .from('app_settings')
        .upsert({
          key,
          value: valueToSave,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'key',
          ignoreDuplicates: false
        });

      if (updateError) {
        throw updateError;
      }

      // Atualizar estado local
      setSettings(prev => prev ? { ...prev, [key]: value } : null);
      
      // Log da atividade
      ActivityLogger.logSystem(
        'settings_update',
        `Configuração '${key}' atualizada`,
        'info',
        { key, oldValue: settings?.[key], newValue: value }
      );

      toast.success('Configuração atualizada com sucesso!');
      return true;
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao atualizar configuração';
      setError(errorMessage);
      toast.error('Erro ao atualizar configuração', {
        description: errorMessage
      });
      return false;
    } finally {
      setSaving(false);
    }
  };

  const updateMultipleSettings = async (updates: Partial<AppSettings>): Promise<boolean> => {
    try {
      setSaving(true);
      setError(null);

      // Preparar dados para upsert com ON CONFLICT
      const upsertData = Object.entries(updates).map(([key, value]) => {
        let valueToSave = value;
        if (typeof value === 'object' || typeof value === 'boolean' || typeof value === 'number') {
          valueToSave = JSON.stringify(value);
        }
        
        return {
          key,
          value: valueToSave,
          updated_at: new Date().toISOString()
        };
      });

      const { error: updateError } = await supabase
        .from('app_settings')
        .upsert(upsertData, {
          onConflict: 'key',
          ignoreDuplicates: false
        });

      if (updateError) {
        throw updateError;
      }

      // Atualizar estado local
      setSettings(prev => prev ? { ...prev, ...updates } : null);
      
      // Log da atividade
      ActivityLogger.logSystem(
        'settings_bulk_update',
        `${Object.keys(updates).length} configurações atualizadas`,
        'info',
        { updatedKeys: Object.keys(updates), updates }
      );

      toast.success(`${Object.keys(updates).length} configurações atualizadas com sucesso!`);
      return true;
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao atualizar configurações';
      setError(errorMessage);
      toast.error('Erro ao atualizar configurações', {
        description: errorMessage
      });
      return false;
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  return {
    settings,
    loading,
    saving,
    error,
    loadSettings,
    updateSetting,
    updateMultipleSettings
  };
};