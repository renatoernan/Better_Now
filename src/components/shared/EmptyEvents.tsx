import React, { useEffect, useState } from 'react';
import Header from '../layout/Header';
import Footer from '../layout/Footer';
import { Calendar, Bell, Heart, Sparkles, Users, MapPin, Clock, Mail, Phone } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useSupabaseEvents } from '../../shared/hooks/hooks/useSupabaseEvents';

const EmptyEvents: React.FC = () => {
  const navigate = useNavigate();
  // Removido useSupabaseEvents para evitar chamadas duplicadas e toast de erro
  // O componente PublicEvents já gerencia o carregamento dos eventos
  const [activeEvents, setActiveEvents] = useState<any[]>([]);

  // Função para formatar data
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  };

  // Função para formatar horário
  const formatTime = (timeString: string) => {
    if (!timeString) return '';
    return timeString.slice(0, 5);
  };

  // Componente do Card do Evento
  const EventCard = ({ event }: { event: any }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
      className="bg-white rounded-xl shadow-lg overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-xl"
      onClick={() => navigate(`/eventos/${event.id}`)}
    >
      {/* Imagem do evento */}
      <div className="h-48 bg-gradient-to-r from-purple-400 to-pink-400 relative overflow-hidden">
        {event.image_url ? (
          <img 
            src={event.image_url} 
            alt={event.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <Calendar className="h-16 w-16 text-white opacity-80" />
          </div>
        )}
        <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm rounded-full px-3 py-1">
          <span className="text-sm font-medium text-purple-600">{event.event_type}</span>
        </div>
      </div>

      {/* Conteúdo do card */}
      <div className="p-6">
        <h3 className="text-xl font-bold text-gray-800 mb-2 line-clamp-2">{event.title}</h3>
        
        {event.description && (
          <p className="text-gray-600 mb-4 line-clamp-3">{event.description}</p>
        )}

        <div className="space-y-2 text-sm text-gray-500">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span>{formatDate(event.event_date)}</span>
            {event.event_time && (
              <>
                <Clock className="h-4 w-4 ml-2" />
                <span>{formatTime(event.event_time)}</span>
              </>
            )}
          </div>
          
          {event.location && (
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              <span className="line-clamp-1">{event.location}</span>
            </div>
          )}
          

          
          {event.price && (
            <div className="flex items-center gap-2">
              <span className="font-semibold text-green-600">
                R$ {parseFloat(event.price).toFixed(2)}
              </span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      <Header />
      
      <main className="container mx-auto px-4 py-16">
        {/* Seção de eventos ativos removida para evitar duplicação */}
        {/* O componente PublicEvents já gerencia a exibição dos eventos */}
        <>
          {/* Main Content */}
            <section className="pt-32 pb-16 min-h-screen flex items-center">
              <div className="container mx-auto px-6">
                <div className="max-w-4xl mx-auto text-center">
                  
                  {/* Animated Icons */}
                  <div className="relative mb-12">
                    <div className="flex justify-center items-center space-x-8">
                      <div className="animate-bounce delay-0">
                        <Calendar className="w-16 h-16 text-blue-500" />
                      </div>
                      <div className="animate-bounce delay-150">
                        <Sparkles className="w-20 h-20 text-purple-500" />
                      </div>
                      <div className="animate-bounce delay-300">
                        <Heart className="w-16 h-16 text-pink-500" />
                      </div>
                    </div>
                    
                    {/* Floating Elements */}
                    <div className="absolute -top-4 -left-4 w-8 h-8 bg-yellow-300 rounded-full animate-pulse opacity-70"></div>
                    <div className="absolute -bottom-4 -right-4 w-6 h-6 bg-green-300 rounded-full animate-pulse delay-500 opacity-70"></div>
                    <div className="absolute top-8 -right-8 w-4 h-4 bg-blue-300 rounded-full animate-pulse delay-1000 opacity-70"></div>
                  </div>

                  {/* Main Message */}
                  <h1 className="text-4xl md:text-6xl font-bold text-gray-800 mb-6">
                    <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                      Aguarde
                    </span>
                    <br />
                    <span className="text-gray-700">Próximos Eventos!</span>
                  </h1>
                  
                  <p className="text-xl md:text-2xl text-gray-600 mb-8 max-w-2xl mx-auto leading-relaxed">
                    Estamos preparando experiências incríveis para você! 
                    <br className="hidden md:block" />
                    Em breve teremos novidades emocionantes.
                  </p>

                  {/* Fun Stats */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
                    <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                      <div className="text-3xl font-bold text-blue-600 mb-2">🎉</div>
                      <h3 className="text-lg font-semibold text-gray-800 mb-1">Eventos Únicos</h3>
                      <p className="text-gray-600 text-sm">Experiências personalizadas e inesquecíveis</p>
                    </div>
                    
                    <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                      <div className="text-3xl font-bold text-purple-600 mb-2">✨</div>
                      <h3 className="text-lg font-semibold text-gray-800 mb-1">Momentos Especiais</h3>
                      <p className="text-gray-600 text-sm">Criamos memórias que duram para sempre</p>
                    </div>
                    
                    <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                      <div className="text-3xl font-bold text-pink-600 mb-2">💝</div>
                      <h3 className="text-lg font-semibold text-gray-800 mb-1">Feito com Amor</h3>
                      <p className="text-gray-600 text-sm">Cada detalhe pensado especialmente para você</p>
                    </div>
                  </div>

                  {/* Call to Action */}
                  <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-8 shadow-xl max-w-2xl mx-auto">
                    <div className="flex items-center justify-center mb-4">
                      <Bell className="w-8 h-8 text-blue-600 mr-3" />
                      <h2 className="text-2xl font-bold text-gray-800">Seja o primeiro a saber!</h2>
                    </div>
                    
                    <p className="text-gray-600 mb-6">
                      Cadastre-se para receber notificações sobre nossos próximos eventos
                    </p>
                    
                    <div className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
                      <input 
                        type="email" 
                        placeholder="Seu melhor e-mail"
                        className="flex-1 px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <button className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700 transition-all duration-300 transform hover:scale-105 shadow-lg">
                        Notificar-me
                      </button>
                    </div>
                  </div>

                  {/* Social Media */}
                  {/*<div className="mt-12">
                    <p className="text-gray-600 mb-4">Ou nos siga nas redes sociais:</p>
                    <div className="flex justify-center space-x-6">
                      <a 
                        href="#" 
                        className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center hover:bg-blue-700 transition-colors transform hover:scale-110"
                      >
                        <span className="text-xl font-bold">f</span>
                      </a>
                      <a 
                        href="#" 
                        className="w-12 h-12 bg-pink-600 text-white rounded-full flex items-center justify-center hover:bg-pink-700 transition-colors transform hover:scale-110"
                      >
                        <span className="text-xl font-bold">@</span>
                      </a>
                      <a 
                        href="#" 
                        className="w-12 h-12 bg-blue-400 text-white rounded-full flex items-center justify-center hover:bg-blue-500 transition-colors transform hover:scale-110"
                      >
                        <span className="text-xl font-bold">t</span>
                      </a>
                    </div>
                  </div>*/}

                  {/* Contact Info */}
                  <div className="mt-12 text-center">
                    <p className="text-gray-600 mb-2">Tem alguma dúvida ou sugestão?</p>
                    <a 
                      href="#contact" 
                      className="text-blue-600 hover:text-blue-700 font-semibold underline decoration-2 underline-offset-4"
                    >
                      Entre em contato conosco
                    </a>
                  </div>
                </div>
              </div>
            </section>
          </>
        </main>

      <Footer />
    </div>
  );
};

export default EmptyEvents;