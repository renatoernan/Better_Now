import React, { useEffect, useState, useCallback, memo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { usePublicEvents } from '../../shared/hooks/hooks/usePublicEvents';
import { Event } from '../../shared/hooks/hooks/useSupabaseEvents';
import Header from '../layout/Header';
import Footer from '../layout/Footer';
import EventDetails from './EventDetails';
import EmptyEvents from '../shared/EmptyEvents';
import { Calendar, MapPin, Clock, Users, Tag } from 'lucide-react';

// Constantes
const TIMEZONE_OFFSET_HOURS = 3; // UTC-3 (Brasil)
const MILLISECONDS_PER_HOUR = 60 * 60 * 1000;
const CARD_HEIGHT = 580;
const IMAGE_HEIGHT = 192; // h-48 = 12rem = 192px

// Tipos
interface PriceBatch {
  price: number;
  end_date: string;
}

type PriceBatchesData = string | PriceBatch[] | PriceBatch | null;

// Funções utilitárias
/**
 * Formata preço para moeda brasileira
 */
const formatPrice = (price: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(price);
};

/**
 * Formata data considerando timezone UTC-3 (Brasil)
 * @param dateString - String da data no formato ISO
 * @param options - Opções de formatação
 */
const formatDateWithTimezone = (
  dateString: string, 
  options: Intl.DateTimeFormatOptions
): string => {
  const date = new Date(dateString);
  // Ajustar para UTC-3 (Brasil)
  const utcDate = new Date(date.getTime() + (date.getTimezoneOffset() * 60000));
  const brazilDate = new Date(utcDate.getTime() + (TIMEZONE_OFFSET_HOURS * MILLISECONDS_PER_HOUR));
  
  return brazilDate.toLocaleDateString('pt-BR', options);
};

/**
 * Formata data completa (dia da semana, dia, mês, ano)
 */
const formatDate = (dateString: string): string => {
  return formatDateWithTimezone(dateString, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

/**
 * Formata data simples (dd/mm/aaaa)
 */
const formatSimpleDate = (dateString: string): string => {
  return formatDateWithTimezone(dateString, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

/**
 * Formata horário (HH:MM)
 */
const formatTime = (timeString?: string): string => {
  if (!timeString) return '';
  return timeString.substring(0, 5);
};

/**
 * Obtém o menor preço dos lotes disponíveis
 */
const getLowestPrice = (priceBatches: PriceBatchesData): number | null => {
  if (!priceBatches) {
    return null;
  }
  
  let batches: PriceBatch[] = [];
  try {
    if (typeof priceBatches === 'string') {
      batches = JSON.parse(priceBatches);
    } else if (Array.isArray(priceBatches)) {
      batches = priceBatches;
    } else if (typeof priceBatches === 'object') {
      batches = [priceBatches];
    }
  } catch (error) {
    console.error('Erro ao processar price batches:', error);
    return null;
  }

  if (!Array.isArray(batches) || batches.length === 0) {
    return null;
  }

  const now = new Date();
  const nowUTC3 = new Date(now.getTime() - TIMEZONE_OFFSET_HOURS * MILLISECONDS_PER_HOUR);
  
  const activeBatches = batches.filter(batch => {
    const endDate = new Date(batch.end_date);
    return nowUTC3 <= endDate;
  });

  if (activeBatches.length === 0) {
    return null;
  }
  
  return Math.min(...activeBatches.map(batch => batch.price));
};

/**
 * Formata o preço de exibição do evento
 */
const formatEventPrice = (priceBatches: PriceBatchesData): string => {
  const lowestPrice = getLowestPrice(priceBatches);
  
  if (lowestPrice) {
    return `A partir de ${formatPrice(lowestPrice)}`;
  }
  
  return 'Consulte valores';
};

const PublicEvents: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { events, loading, error, fetchEventById, fetchPublicEvents } = usePublicEvents();
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);

  useEffect(() => {
    if (id) {
      console.log('🔗 ID do evento recebido:', id);
      const loadEvent = async () => {
        const eventData = await fetchEventById(id);
        console.log('📋 Dados do evento carregado:', eventData);
        console.log('🔍 Price batches do evento:', {
          raw: eventData?.price_batches,
          type: typeof eventData?.price_batches,
          isArray: Array.isArray(eventData?.price_batches),
          content: eventData?.price_batches
        });
        setSelectedEvent(eventData);
      };
      loadEvent();
    } else {
      console.log('📅 Carregando lista de eventos públicos');
      fetchPublicEvents();
    }
  }, [id]);

  // Se estamos visualizando um evento específico
  if (id && selectedEvent) {
    return <EventDetails />;
  }

  // Se estamos visualizando um evento específico mas ainda carregando
  if (id && loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="pt-48 pb-20">
          <div className="container mx-auto px-6">
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // Se não há eventos, mostrar página de aguarde
  if (!loading && events.length === 0) {
    return <EmptyEvents />;
  }



  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      {/* Hero Section */}
      <section className="pt-40 pb-5 bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700">
        <div className="container mx-auto px-6">
          <div className="text-center text-white">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Nossos Eventos
            </h1>
            <p className="text-xl md:text-2xl opacity-90 max-w-3xl mx-auto">
              Descubra experiências únicas e momentos inesquecíveis
            </p>
          </div>
        </div>
      </section>

      {/* Events Grid */}
      <section className="py-20">
        <div className="container mx-auto  px-6">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : error ? (
            <div className="text-center py-16">
              <p className="text-red-600 text-lg">Erro ao carregar eventos: {error}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {events.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
};

// Componente do Card do Evento
interface EventCardProps {
  event: Event;
}

const EventCard: React.FC<EventCardProps> = memo(({ event }) => {
  const navigate = useNavigate();

  // Log de renderização do componente
  console.log('🎯 EventCard renderizando:', {
    eventId: event.id,
    eventTitle: event.title,
    eventDate: event.event_date,
    eventTime: event.event_time,
    eventLocation: event.location,
    eventType: event.event_type,
    imageUrl: event.image_url,
    description: event.description,
    priceBatches: event.price_batches,

  });

  const handleCardClick = useCallback(() => {
    console.log('🔗 Clicando no evento:', event.id, event.title);
    console.log('🚀 Navegando para:', `/eventos/${event.id}`);
    navigate(`/eventos/${event.id}`);
  }, [event.id, event.title, navigate]);

  console.log('📦 EventCard pronto para renderizar JSX');

  return (
    <div 
      onClick={handleCardClick}
      className={`bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer transform hover:-translate-y-2 overflow-hidden flex flex-col`}
      style={{ height: CARD_HEIGHT }}
      onMouseEnter={() => console.log('🖱️ Mouse entrou no card:', event.id)}
      onMouseLeave={() => console.log('🖱️ Mouse saiu do card:', event.id)}
    >
      {/* Event Image */}
      <div 
        className="bg-gradient-to-br from-blue-500 to-purple-600 relative overflow-hidden flex-shrink-0"
        style={{ height: 'clamp(128px, 20vw, 192px)' }}
      >
        {(() => {
          console.log('🖼️ Renderizando imagem do evento:', {
            eventId: event.id,
            hasImageUrl: !!event.image_url,
            imageUrl: event.image_url
          });
          return event.image_url ? (
            <img 
              src={event.image_url} 
              alt={event.title}
              className="w-full h-full object-cover"
              loading="lazy"
              onLoad={() => console.log('✅ Imagem carregada:', event.id)}
              onError={() => console.log('❌ Erro ao carregar imagem:', event.id, event.image_url)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Calendar className="w-16 h-16 text-white opacity-50" />
            </div>
          );
        })()}
        
        {/* Event Type Badge */}
        {(() => {
          console.log('🏷️ Renderizando badge do tipo:', {
            eventId: event.id,
            eventType: event.event_type,
            hasEventType: !!event.event_type
          });
          return event.event_type && (
            <div className="absolute top-4 left-4">
              <span className="bg-white/90 text-gray-800 px-3 py-1 rounded-full text-sm font-medium">
                {event.event_type}
              </span>
            </div>
          );
        })()}
      </div>

      {/* Event Content */}
      <div className="p-3 sm:p-6 flex-1 flex flex-col">
        {(() => {
          console.log('📝 Renderizando conteúdo do evento:', {
            eventId: event.id,
            title: event.title,
            hasDescription: !!event.description,
            description: event.description
          });
          return null;
        })()}
        <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2 sm:mb-3 line-clamp-2">
          {event.title}
        </h3>
        
        

        {/* Event Details */}
        <div className="space-y-3 mb-6 flex-shrink-0">
          {(() => {
            const formattedDate = formatSimpleDate(event.event_date);
            const formattedTime = formatTime(event.event_time);
            console.log('📅 Renderizando detalhes do evento:', {
              eventId: event.id,
              rawDate: event.event_date,
              formattedDate: formattedDate,
              rawTime: event.event_time,
              formattedTime: formattedTime,
              location: event.location
            });
            return null;
          })()}
          <div className="flex items-center text-gray-600">
            <Calendar className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 flex-shrink-0" />
            <span className="text-xs sm:text-sm font-bold truncate">
              {formatSimpleDate(event.event_date)}
              {event.event_time && ` às ${formatTime(event.event_time)}`}
            </span>
          </div>
          
          {event.location && (
            <div className="flex text-gray-600">
              <MapPin className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 mt-0.5 flex-shrink-0" />
              <div 
                className="text-xs sm:text-sm leading-tight overflow-hidden"
                style={{
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  minHeight: '2.4em',
                  lineHeight: '1.2em',
                  whiteSpace: 'pre-line'
                }}
              >
                {event.location}
              </div>
            </div>
          )}
        </div>

        {/* Price Section - Aligned to bottom */}
        <div className="mt-auto">
          {(() => {
            const formattedPrice = formatEventPrice(event.price_batches);
            console.log('💰 Renderizando seção de preços:', {
              eventId: event.id,
              rawPriceBatches: event.price_batches,
              formattedPrice: formattedPrice
            });
            return null;
          })()}
          <div className="space-y-2 sm:space-y-3">
            <div className="flex items-center justify-center bg-gray-50 rounded-lg p-2 sm:p-3 mb-1 sm:mb-2">
              <Tag className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2 text-blue-600" />
              <span className="text-sm sm:text-lg font-semibold text-gray-700">
                Ingressos disponíveis
              </span>
            </div>
            <div className="text-center">
              <span className="text-lg sm:text-2xl font-bold text-blue-600 block">
                {formatEventPrice(event.price_batches)}
              </span>
            </div>
            <button 
              className="w-full bg-blue-600 text-white py-2 sm:py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm sm:text-base"
              onClick={(e) => {
                e.stopPropagation();
                console.log('🔘 Botão Ver Detalhes clicado:', event.id);
                handleCardClick();
              }}
            >
              Ver Detalhes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

// Definir displayName para melhor debugging
EventCard.displayName = 'EventCard';

export default PublicEvents;