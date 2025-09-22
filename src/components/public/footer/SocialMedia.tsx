import React from 'react';
import { SocialMediaProps } from './types';
import { FOOTER_STYLES, SOCIAL_MEDIA_URLS, INSTAGRAM_SVG_PATH } from './constants';

/**
 * Componente para exibir links de redes sociais no footer
 * @param props - Propriedades do componente
 * @param props.translations - Traduções para os textos
 * @returns Componente React com links das redes sociais
 */
const SocialMedia: React.FC<SocialMediaProps> = ({ translations }) => {
  /**
   * Componente do ícone do Instagram
   * @returns JSX Element com o ícone SVG do Instagram
   */
  const InstagramIcon: React.FC = () => (
    <svg
      className={FOOTER_STYLES.SOCIAL_ICON}
      fill="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path d={INSTAGRAM_SVG_PATH} />
    </svg>
  );

  /**
   * Abre o link em uma nova aba com segurança
   * @param url - URL para abrir
   */
  const handleSocialClick = (url: string) => {
    try {
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (error) {
      console.error('Erro ao abrir link das redes sociais:', error);
      // Fallback: tentar navegar diretamente
      window.location.href = url;
    }
  };

  return (
    <div className={FOOTER_STYLES.SECTION_CONTAINER}>
      <h3 className={FOOTER_STYLES.SECTION_TITLE_CENTERED}>
        {translations.followUs}
      </h3>
      
      <div className="flex justify-center">
        <button
          onClick={() => handleSocialClick(SOCIAL_MEDIA_URLS.INSTAGRAM)}
          className={FOOTER_STYLES.SOCIAL_BUTTON}
          aria-label={translations.followUsInstagram}
          type="button"
        >
          <InstagramIcon />
        </button>
      </div>
      
      <p className="text-center text-xs text-gray-400 mt-2">
        {translations.followUsInstagram}
      </p>
    </div>
  );
};

export default SocialMedia;