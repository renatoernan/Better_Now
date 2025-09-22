import React from 'react';
import { Mail, Phone, MapPin } from 'lucide-react';
import { ContactInfoProps } from './types';
import { FOOTER_STYLES } from './constants';

/**
 * Componente para exibir informações de contato no footer
 * @param props - Propriedades do componente
 * @param props.contactEmail - Email de contato
 * @param props.phone - Número de telefone
 * @param props.address - Endereço da empresa
 * @param props.translations - Traduções para os textos
 * @returns Componente React com informações de contato
 */
const ContactInfo: React.FC<ContactInfoProps> = ({
  contactEmail,
  phone,
  address,
  translations,
}) => {
  /**
   * Formata o número de telefone para link tel:
   * @param phoneNumber - Número de telefone
   * @returns Número formatado para tel: link
   */
  const formatPhoneForTel = (phoneNumber: string): string => {
    return phoneNumber.replace(/\D/g, '');
  };

  return (
    <div className={FOOTER_STYLES.SECTION_CONTAINER}>
      <h3 className={FOOTER_STYLES.SECTION_TITLE}>
        {translations.contactInfo}
      </h3>
      
      {/* Email */}
      <div className={FOOTER_STYLES.CONTACT_ITEM}>
        <div className={FOOTER_STYLES.ICON_CONTAINER}>
          <Mail className={FOOTER_STYLES.ICON_SIZE} />
        </div>
        <a 
          href={`mailto:${contactEmail}`}
          className={FOOTER_STYLES.CONTACT_LINK}
          aria-label={`Enviar email para ${contactEmail}`}
        >
          {contactEmail}
        </a>
      </div>

      {/* Telefone */}
      <div className={FOOTER_STYLES.CONTACT_ITEM}>
        <div className={FOOTER_STYLES.ICON_CONTAINER}>
          <Phone className={FOOTER_STYLES.ICON_SIZE} />
        </div>
        <a 
          href={`tel:+55${formatPhoneForTel(phone)}`}
          className={FOOTER_STYLES.CONTACT_LINK}
          aria-label={`Ligar para ${phone}`}
        >
          {phone}
        </a>
      </div>

      {/* Endereço */}
      <div className={FOOTER_STYLES.CONTACT_ITEM}>
        <div className={FOOTER_STYLES.ICON_CONTAINER}>
          <MapPin className={FOOTER_STYLES.ICON_SIZE} />
        </div>
        <span className={FOOTER_STYLES.CONTACT_TEXT}>
          {address}
        </span>
      </div>
    </div>
  );
};

export default ContactInfo;