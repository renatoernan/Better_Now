import React from 'react';
import { useAppSettings } from '../../hooks/useAppSettings';
import { MessageCircle } from 'lucide-react';

const WhatsAppButton: React.FC = () => {
  const { settings } = useAppSettings();

  // Formatar número do WhatsApp removendo caracteres especiais
  const formatWhatsAppNumber = (number: string): string => {
    return number.replace(/[^0-9]/g, '');
  };

  // Verificar se existe número do WhatsApp configurado
  if (!settings.social_whatsapp || settings.social_whatsapp.trim() === '') {
    return null;
  }

  const handleWhatsAppClick = () => {
    const formattedNumber = formatWhatsAppNumber(settings.social_whatsapp);
    const message = encodeURIComponent('Olá! Gostaria de mais informações.');
    const whatsappUrl = `https://wa.me/${formattedNumber}?text=${message}`;
    
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <button
      onClick={handleWhatsAppClick}
      className="fixed bottom-6 right-6 z-50 bg-green-500 hover:bg-green-600 text-white rounded-full p-4 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-110 animate-pulse"
      title="Fale conosco no WhatsApp"
      aria-label="Abrir conversa no WhatsApp"
    >
      <MessageCircle size={24} className="fill-current" />
    </button>
  );
};

export default WhatsAppButton;