import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../../services/lib/supabase';
import { toast } from 'sonner';

interface ContactSettings {
  email: string;
  phone: string;
  address: string;
  mondayToFriday: string;
  saturday: string;
}

interface SettingsContextType {
  contactSettings: ContactSettings;
  updateContactSettings: (settings: ContactSettings) => Promise<boolean>;
  isLoading: boolean;
  refreshSettings: () => Promise<void>;
}

const defaultContactSettings: ContactSettings = {
  email: 'contato@betternow.com.br',
  phone: '(11) 9999-9999',
  address: 'São Paulo, SP, Brasil',
  mondayToFriday: 'Segunda a Sexta: 9h às 18h',
  saturday: 'Sábado: 9h às 13h'
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};

interface SettingsProviderProps {
  children: ReactNode;
}

export const SettingsProvider: React.FC<SettingsProviderProps> = ({ children }) => {
  const [contactSettings, setContactSettings] = useState<ContactSettings>(defaultContactSettings);
  const [isLoading, setIsLoading] = useState(false);


  const loadSettings = async () => {
    try {
      setIsLoading(true);
      
      const { data, error } = await supabase
        .from('app_settings')
        .select('key, value')
        .in('key', ['contact_email', 'contact_phone', 'contact_address', 'business_hours_weekdays', 'business_hours_saturday']);

      if (error) {
        console.error('Erro ao carregar configurações:', error);
        return;
      }

      if (data && data.length > 0) {
        const settings = { ...defaultContactSettings };
        
        data.forEach((item) => {
          switch (item.key) {
            case 'contact_email':
              settings.email = item.value || defaultContactSettings.email;
              break;
            case 'contact_phone':
              settings.phone = item.value || defaultContactSettings.phone;
              break;
            case 'contact_address':
              settings.address = item.value || defaultContactSettings.address;
              break;
            case 'business_hours_weekdays':
              settings.mondayToFriday = item.value || defaultContactSettings.mondayToFriday;
              break;
            case 'business_hours_saturday':
              settings.saturday = item.value || defaultContactSettings.saturday;
              break;
          }
        });
        
        setContactSettings(settings);
      }
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateContactSettings = async (settings: ContactSettings): Promise<boolean> => {
    try {
      setIsLoading(true);

      const settingsToUpdate = [
        { key: 'contact_email', value: settings.email, description: 'Email de contato da empresa' },
        { key: 'contact_phone', value: settings.phone, description: 'Telefone de contato da empresa' },
        { key: 'contact_address', value: settings.address, description: 'Endereço da empresa' },
        { key: 'business_hours_weekdays', value: settings.mondayToFriday, description: 'Horário de funcionamento de segunda a sexta' },
        { key: 'business_hours_saturday', value: settings.saturday, description: 'Horário de funcionamento no sábado' }
      ];

      for (const setting of settingsToUpdate) {
        const { error } = await supabase
          .from('app_settings')
          .upsert({
            key: setting.key,
            value: setting.value,
            description: setting.description,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'key'
          });

        if (error) {
          console.error(`Erro ao salvar configuração ${setting.key}:`, error);
          toast.error('Erro ao salvar configurações');
          return false;
        }
      }

      setContactSettings(settings);
      toast.success('Configurações salvas com sucesso!');
      return true;
    } catch (error) {
      console.error('Erro ao atualizar configurações:', error);
      toast.error('Erro ao salvar configurações');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const refreshSettings = async () => {
    await loadSettings();
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const value: SettingsContextType = {
    contactSettings,
    updateContactSettings,
    isLoading,
    refreshSettings
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};