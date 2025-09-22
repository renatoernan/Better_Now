import React, { useState } from 'react';
import { DeveloperInfoProps } from './types';
import { FOOTER_STYLES, COMPANY_URLS } from './constants';

/**
 * Componente para exibir informações do desenvolvedor no footer
 * @param props - Propriedades do componente
 * @param props.logoSrc - Caminho para o logo da CESIRE
 * @returns Componente React com informações do desenvolvedor
 */
const DeveloperInfo: React.FC<DeveloperInfoProps> = ({ logoSrc }) => {
  const [imageError, setImageError] = useState(false);

  /**
   * Manipula erro no carregamento da imagem
   */
  const handleImageError = () => {
    console.warn('Erro ao carregar logo da CESIRE, usando fallback de texto');
    setImageError(true);
  };

  /**
   * Abre o link da CESIRE em nova aba com segurança
   */
  const handleCesireClick = () => {
    try {
      window.open(COMPANY_URLS.CESIRE, '_blank', 'noopener,noreferrer');
    } catch (error) {
      console.error('Erro ao abrir link da CESIRE:', error);
      // Fallback: tentar navegar diretamente
      window.location.href = COMPANY_URLS.CESIRE;
    }
  };

  /**
   * Renderiza o conteúdo do logo ou fallback de texto
   * @returns JSX Element com logo ou texto
   */
  const renderLogoContent = () => {
    if (imageError) {
      return (
        <div className="text-center">
          <div className={FOOTER_STYLES.DEVELOPER_TEXT}>
            CESIRE
          </div>
          <div className={FOOTER_STYLES.DEVELOPER_SUBTITLE}>
            Tecnologia
          </div>
        </div>
      );
    }

    return (
      <img
        src={logoSrc}
        alt="CESIRE Tecnologia"
        className={FOOTER_STYLES.DEVELOPER_LOGO}
        onError={handleImageError}
        loading="lazy"
      />
    );
  };

  return (
    <div className={FOOTER_STYLES.SECTION_CONTAINER}>
      <div className="text-center">
        <p className={FOOTER_STYLES.DEVELOPER_TEXT}>
          Desenvolvido por:
        </p>
        
        <button
          onClick={handleCesireClick}
          className={FOOTER_STYLES.DEVELOPER_LINK}
          aria-label="Visitar site da CESIRE Tecnologia"
          type="button"
        >
          {renderLogoContent()}
        </button>
      </div>
    </div>
  );
};

export default DeveloperInfo;