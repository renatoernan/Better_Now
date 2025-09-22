/**
 * Constantes para o componente Footer
 */

// URLs
export const SOCIAL_MEDIA_URLS = {
  INSTAGRAM: 'https://www.instagram.com/betternow_eventos/',
} as const;

export const COMPANY_URLS = {
  CESIRE: 'https://www.cesire.com.br',
} as const;

// Estilos CSS reutilizáveis
export const FOOTER_STYLES = {
  // Container principal
  FOOTER_CONTAINER: 'bg-[#2c3e50] text-white py-6',
  CONTENT_WRAPPER: 'container mx-auto px-6',
  GRID_LAYOUT: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-4',
  
  // Seções
  SECTION_CONTAINER: 'space-y-2',
  SECTION_TITLE: 'text-lg font-bold text-blue-300 mb-2',
  SECTION_TITLE_CENTERED: 'text-lg flex justify-center font-bold text-blue-300 mb-2',
  
  // Ícones e botões
  ICON_CONTAINER: 'w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0',
  ICON_SIZE: 'w-3 h-3',
  
  // Links e textos
  CONTACT_ITEM: 'flex items-center space-x-2 hover:text-blue-300 transition-colors duration-300',
  CONTACT_LINK: 'text-sm hover:text-blue-300 transition-colors',
  CONTACT_TEXT: 'text-sm',
  
  // Redes sociais
  SOCIAL_BUTTON: 'inline-flex items-center justify-center w-10 h-10 bg-gradient-to-r from-purple-500 via-pink-500 to-orange-400 rounded-full hover:scale-110 transition-transform duration-300 group',
  SOCIAL_ICON: 'w-5 h-5 text-white group-hover:text-gray-100 transition-colors duration-300',
  
  // Developer info
  DEVELOPER_LINK: 'flex items-center space-x-2 hover:opacity-80 transition-opacity duration-300 group',
  DEVELOPER_LOGO: 'h-12 w-auto object-contain group-hover:scale-105 transition-transform duration-300',
  DEVELOPER_TEXT: 'text-sm text-blue-300 hover:text-blue-200 transition-colors font-medium',
  DEVELOPER_SUBTITLE: 'text-xs text-gray-400',
  
  // Copyright
  COPYRIGHT_CONTAINER: 'border-t border-gray-600 pt-3 text-center',
  COPYRIGHT_TEXT: 'text-sm',
  COPYRIGHT_TAGLINE: 'text-xs text-gray-400 mt-1',
} as const;

// Horários padrão
export const DEFAULT_BUSINESS_HOURS = {
  WEEKDAYS: '8h às 18h',
  WEEKEND: '8h às 12h',
} as const;

// SVG do Instagram
export const INSTAGRAM_SVG_PATH = 'M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z';