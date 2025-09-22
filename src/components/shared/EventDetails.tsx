import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import Header from '../public/Header';
import Footer from '../public/Footer';
import EventImage from './EventImage';
import EventInfo from './EventInfo';
import EventDescription from './EventDescription';
import TicketCard from './TicketCard';
import { usePublicEvents } from '../../hooks/usePublicEvents';
import { ArrowLeft } from 'lucide-react';
import { Event as EventType, PriceBatch, ScheduleItem } from '../../types/event';
import { processPriceBatches, getBatchStatus, formatPrice } from '../../utils/eventUtils';

const EventDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { fetchEventById } = usePublicEvents();
  const [event, setEvent] = useState<EventType | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedBatch, setSelectedBatch] = useState<number>(0);
  const [quantity, setQuantity] = useState<number>(1);
  const [priceBatches, setPriceBatches] = useState<PriceBatch[]>([]);

  useEffect(() => {
    const loadEvent = async () => {
      if (id) {
        setLoading(true);
        const eventData = await fetchEventById(id);
        setEvent(eventData as EventType);
        
        // Processar price_batches - agora apenas batches são suportados
        if (eventData?.price_batches) {
          const processedBatches = processPriceBatches(eventData.price_batches);
          setPriceBatches(processedBatches);
        } else {
          // Se não há price_batches, definir array vazio
          setPriceBatches([]);
        }
        
        setLoading(false);
      }
    };

    loadEvent();
  }, [id, fetchEventById]);

  // Funções de manipulação de eventos específicas do componente

  const handleQuantityChange = (increment: boolean) => {
    if (increment) {
      setQuantity(prev => prev + 1);
    } else {
      setQuantity(prev => prev > 1 ? prev - 1 : 1);
    }
  };

  const handlePurchase = () => {
    const selectedBatchData = priceBatches[selectedBatch];
    const status = getBatchStatus(selectedBatchData);
    if (selectedBatchData && status === 'active') {
      alert(`Comprando ${quantity} ingresso(s) do lote "${selectedBatchData.name}" por ${formatPrice(selectedBatchData.price * quantity)}`);
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: event?.title,
        text: event?.description,
        url: window.location.href
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('Link copiado para a área de transferência!');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="pt-32 pb-16">
          <div className="container mx-auto px-6">
            <div className="max-w-4xl mx-auto">
              <div className="animate-pulse">
                <div className="h-8 bg-gray-300 rounded w-1/4 mb-8"></div>
                <div className="h-64 bg-gray-300 rounded-lg mb-8"></div>
                <div className="h-12 bg-gray-300 rounded w-3/4 mb-4"></div>
                <div className="h-4 bg-gray-300 rounded w-1/2 mb-8"></div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="h-48 bg-gray-300 rounded-lg"></div>
                  <div className="h-48 bg-gray-300 rounded-lg"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="pt-32 pb-16">
          <div className="container mx-auto px-6">
            <div className="max-w-4xl mx-auto text-center">
              <h1 className="text-3xl font-bold text-gray-800 mb-4">Evento não encontrado</h1>
              <p className="text-gray-600 mb-8">O evento que você está procurando não existe ou não está mais disponível.</p>
              <Link 
                to="/eventos" 
                className="inline-flex items-center bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
              >
                <ArrowLeft className="w-5 h-5 mr-2" />
                Voltar aos Eventos
              </Link>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // O processamento de priceBatches já é feito no useEffect

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="pt-32 pb-16">
        <div className="container mx-auto px-6">
          <div className="max-w-6xl mx-auto">
            
            {/* Breadcrumb */}
            <div className="mb-8">
              <Link 
                to="/eventos" 
                className="inline-flex items-center text-blue-600 hover:text-blue-700 transition-colors"
              >
                <ArrowLeft className="w-5 h-5 mr-2" />
                Voltar aos Eventos
              </Link>
            </div>

            {/* LAYOUT PRINCIPAL EM DUAS COLUNAS */}
            <div className="flex flex-col lg:flex-row gap-8">
              
              {/* CONTAINER ESQUERDO - 70% - IMAGEM E DESCRIÇÃO */}
              <div className="w-full lg:w-[70%]">
                <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                  
                  {/* Componente de Imagem */}
                  <EventImage
                    imageUrl={event.image_url}
                    title={event.title}
                    onShare={handleShare}
                  />
                  
                  {/* CONTEÚDO DA DESCRIÇÃO */}
                  <div className="p-8">
                    <div className="flex flex-wrap items-center gap-2 mb-4">
                      <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                        {event.event_type}
                      </span>
                      <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                        Ativo
                      </span>
                    </div>
                    
                    {/* Componente de Informações */}
                    <EventInfo
                      title={event.title}
                      date={event.event_date}
                      time={event.event_time}
                      endTime={event.end_time}
                      location={event.location}
                      locationLink={event.location_link}
                      maxParticipants={event.max_participants}
                      eventType={event.event_type}
                      description={event.description}
                    />

                    {/* Componente de Descrição */}
                    <EventDescription
                      basicDescription={event.basic_description}
                      detailedDescription={event.detailed_description}
                      schedule={typeof event.schedule === 'string' ? JSON.parse(event.schedule) : event.schedule}
                    />
                  </div>
                </div>
              </div>

              {/* CONTAINER DIREITO - 30% - CARD DOS INGRESSOS FLUTUANTE */}
              <div className="w-full lg:w-[30%]">
                <div className="lg:sticky lg:top-32 lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto">
                  {/* Componente do Card de Ingressos */}
                  <TicketCard
                    priceBatches={priceBatches}
                    selectedBatch={selectedBatch}
                    quantity={quantity}
                    onBatchSelect={setSelectedBatch}
                    onQuantityChange={handleQuantityChange}
                    onPurchase={handlePurchase}
                    registrationDeadline={event.registration_deadline}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default EventDetails;