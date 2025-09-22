import React from 'react';
import { Clock } from 'lucide-react';
import { BusinessHoursProps } from './types';
import { FOOTER_STYLES, DEFAULT_BUSINESS_HOURS } from './constants';

/**
 * Componente para exibir horários de funcionamento no footer
 * @param props - Propriedades do componente
 * @param props.businessHoursWeekdays - Horário de funcionamento nos dias úteis
 * @param props.businessHoursWeekend - Horário de funcionamento no fim de semana
 * @param props.businessHoursClosedDays - Dias fechados
 * @param props.translations - Traduções para os textos
 * @returns Componente React com horários de funcionamento
 */
const BusinessHours: React.FC<BusinessHoursProps> = ({
  businessHoursWeekdays = DEFAULT_BUSINESS_HOURS.WEEKDAYS,
  businessHoursWeekend = DEFAULT_BUSINESS_HOURS.WEEKEND,
  businessHoursClosedDays,
  translations,
}) => {
  /**
   * Renderiza um item de horário com ícone
   * @param label - Rótulo do período
   * @param hours - Horário de funcionamento
   * @returns JSX Element com o item de horário
   */
  const renderHourItem = (label: string, hours: string) => (
    <div className={FOOTER_STYLES.CONTACT_ITEM}>
      <div className={FOOTER_STYLES.ICON_CONTAINER}>
        <Clock className={FOOTER_STYLES.ICON_SIZE} />
      </div>
      <div>
        <div className={FOOTER_STYLES.CONTACT_TEXT}>
          <strong>{label}:</strong> {hours}
        </div>
      </div>
    </div>
  );

  return (
    <div className={FOOTER_STYLES.SECTION_CONTAINER}>
      <h3 className={FOOTER_STYLES.SECTION_TITLE}>
        {translations.businessHours}
      </h3>
      
      {/* Horário de segunda a sexta */}
      {renderHourItem(translations.mondayToFriday, businessHoursWeekdays)}
      
      {/* Horário de sábado */}
      {renderHourItem(translations.saturday, businessHoursWeekend)}
      
      {/* Domingos e feriados */}
      {businessHoursClosedDays ? (
        renderHourItem(translations.sundaysAndHolidays, businessHoursClosedDays)
      ) : (
        <div className={FOOTER_STYLES.CONTACT_ITEM}>
          <div className={FOOTER_STYLES.ICON_CONTAINER}>
            <Clock className={FOOTER_STYLES.ICON_SIZE} />
          </div>
          <div>
            <div className={FOOTER_STYLES.CONTACT_TEXT}>
              <strong>{translations.sundaysAndHolidays}:</strong> Fechado
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BusinessHours;