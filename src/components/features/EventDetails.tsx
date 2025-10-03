import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import Header from '../layout/Header';
import Footer from '../layout/Footer';
import EventImage from '../shared/EventImage';
import EventInfo from '../shared/EventInfo';
import EventDescription from '../shared/EventDescription';
import TicketCard from '../shared/TicketCard';
import { usePublicEvents } from '../../shared/hooks/hooks/usePublicEvents';
import { ArrowLeft } from 'lucide-react';
import { Event as EventType, PriceBatch, ScheduleItem } from '../../types/event';
import { processPriceBatches, getBatchStatus, formatPrice } from '../../shared/utils/utils/eventUtils';
import PhoneLoginModal from '../shared/PhoneLoginModal';
import TokenVerificationModal from '../shared/TokenVerificationModal';
import ClientRegistrationModal from '../shared/ClientRegistrationModal';
import SuccessModal from '../shared/SuccessModal';
import { supabase } from '../../shared/services/lib/supabase';
import { toast } from 'sonner';

const EventDetails: React.FC = () => {
  // Constante para tempo de expiração do token em segundos
  const TOKEN_EXPIRATION_TIME = 59;
  
  const { id } = useParams<{ id: string }>();
  const { fetchEventById } = usePublicEvents();
  const [event, setEvent] = useState<EventType | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedBatch, setSelectedBatch] = useState<number>(0);
  const [quantity, setQuantity] = useState<number>(1);
  const [priceBatches, setPriceBatches] = useState<PriceBatch[]>([]);
  
  // Estados para autenticação
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [showRegistrationModal, setShowRegistrationModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showPendingValidationModal, setShowPendingValidationModal] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [currentPhone, setCurrentPhone] = useState('');
  const [currentClientName, setCurrentClientName] = useState('');
  const [generatedToken, setGeneratedToken] = useState('');
  const [tokenError, setTokenError] = useState('');
  const [tokenTimestamp, setTokenTimestamp] = useState<number>(0);
  const [timeRemaining, setTimeRemaining] = useState<number>(30);

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

  // Função para gerar token de 6 dígitos
  const generateToken = (): string => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  };

  // Função para verificar se cliente existe
  const checkClientExists = async (phone: string): Promise<{exists: boolean, name?: string, validated?: boolean}> => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('id, name, validated')
        .eq('whatsapp', phone)
        .single();
      
      if (error && error.code !== 'PGRST116') {
        throw error;
      }
      
      if (data) {
        return {
          exists: true,
          name: data.name,
          validated: data.validated
        };
      }
      
      return { exists: false };
    } catch (error) {
      console.error('Erro ao verificar cliente:', error);
      return { exists: false };
    }
  };

  // Função para enviar webhook
  const sendWebhook = async (url: string, data: any): Promise<boolean> => {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
      });
      
      return response.ok;
    } catch (error) {
      console.error('Erro ao enviar webhook:', error);
      return false;
    }
  };

  // Handler para login com telefone
  const handlePhoneLogin = async (phone: string) => {
    setAuthLoading(true);
    setCurrentPhone(phone);
    
    try {
      const clientData = await checkClientExists(phone);
      
      if (clientData.exists) {
        // Cliente existe - verificar se está validado
        if (clientData.validated === false) {
          // Cliente existe mas não está validado - mostrar modal específico
          setCurrentClientName(clientData.name || '');
          
          // Enviar webhook para cliente pendente de validação
          const webhookSuccess = await sendWebhook(
            'https://n8n.tradersbots.com.br/webhook/login',
            {
              nome_evento: event?.title || 'Evento não identificado',
              telefone: phone,
              name: clientData.name,
              tipo_mensagem: 'pendente_validacao'
            }
          );
          
          setShowPhoneModal(false);
          setShowPendingValidationModal(true);
          
          if (!webhookSuccess) {
            console.error('Erro ao enviar webhook de pendente validação');
          }
        } else {
          // Cliente validado - gerar token e enviar webhook
          const token = generateToken();
          setGeneratedToken(token);
          const timestamp = Date.now();
          setTokenTimestamp(timestamp);
          
          const webhookSuccess = await sendWebhook(
            'https://n8n.tradersbots.com.br/webhook/login',
            { 
              telefone: phone, 
              token,
              titulo_evento: event?.title || 'Evento não identificado',
              tipo_mensagem: 'cliente_existente'
            }
          );
          
          if (webhookSuccess) {
            setShowPhoneModal(false);
            setShowTokenModal(true);
          } else {
            toast.error('Erro ao enviar código de verificação. Tente novamente.');
          }
        }
      } else {
        // Cliente não existe - mostrar formulário de cadastro
        setShowPhoneModal(false);
        setShowRegistrationModal(true);
      }
    } catch (error) {
      console.error('Erro no login:', error);
      toast.error('Erro ao processar login. Tente novamente.');
    } finally {
      setAuthLoading(false);
    }
  };

  // Handler para verificação de token
  const handleTokenVerification = async (token: string) => {
    setAuthLoading(true);
    setTokenError('');
    
    // Verificar se o token ainda é válido
    const currentTime = Date.now();
    const tokenAge = (currentTime - tokenTimestamp) / 1000;
    
    if (tokenAge > TOKEN_EXPIRATION_TIME) {
      setTokenError('Código expirado. Solicite um novo código.');
      setAuthLoading(false);
      return;
    }
    
    if (token === generatedToken) {
      // Atualizar cliente como validado
      try {
        const { error: updateError } = await supabase
          .from('clients')
          .update({ validated: true })
          .eq('whatsapp', currentPhone);
        
        if (updateError) {
          console.error('Erro ao validar cliente:', updateError);
        }
      } catch (error) {
        console.error('Erro ao atualizar validação:', error);
      }
      
      setShowTokenModal(false);
      setShowSuccessModal(true);
    } else {
      setTokenError('Código inválido. Verifique e tente novamente.');
    }
    
    setAuthLoading(false);
  };
  
  // Handler para reenvio de token
  const handleResendToken = async () => {
    setAuthLoading(true);
    // Limpar qualquer erro existente imediatamente
    setTokenError('');
    
    try {
      // Gerar novo token
      const token = generateToken();
      setGeneratedToken(token);
      const timestamp = Date.now();
      setTokenTimestamp(timestamp);
      
      // Enviar webhook com novo token
      const webhookSuccess = await sendWebhook(
        'https://n8n.tradersbots.com.br/webhook/login',
        { 
          telefone: currentPhone, 
          token,
          titulo_evento: event?.title || 'Evento não identificado',
          tipo_mensagem: 'cliente_existente'
        }
      );
      
      if (webhookSuccess) {
        toast.success('Novo código enviado!');
      } else {
        toast.error('Erro ao reenviar código. Tente novamente.');
      }
    } catch (error) {
      console.error('Erro ao reenviar token:', error);
      toast.error('Erro ao reenviar código. Tente novamente.');
    } finally {
      setAuthLoading(false);
    }
  };

  // Handler para cadastro de novo cliente
  const handleClientRegistration = async (data: { nome: string; telefone: string; comoSoube: string }) => {
    setAuthLoading(true);
    
    try {
      // Verificar se o telefone já existe na tabela clients
      const clientData = await checkClientExists(data.telefone);
      
      if (clientData.exists) {
        // Cliente já existe - não inserir novamente
        if (clientData.validated === false) {
          // Cliente existe mas não está validado - mostrar modal de pendência
          setCurrentClientName(clientData.name || '');
          
          // Enviar webhook para cliente pendente de validação
          const webhookSuccess = await sendWebhook(
            'https://n8n.tradersbots.com.br/webhook/login',
            {
              nome_evento: event?.title || 'Evento não identificado',
              telefone: data.telefone,
              name: clientData.name,
              tipo_mensagem: 'pendente_validacao'
            }
          );
          
          setShowRegistrationModal(false);
          setShowPendingValidationModal(true);
          
          if (!webhookSuccess) {
            console.error('Erro ao enviar webhook de pendente validação');
          }
        } else {
          // Cliente existe e está validado - tratar como cliente existente
          setShowRegistrationModal(false);
          toast.info('Este número já está cadastrado e validado.');
        }
        return;
      }
      
      // Cliente não existe - inserir na tabela clients
      const { error: supabaseError } = await supabase
        .from('clients')
        .insert({
          name: data.nome,
          whatsapp: data.telefone,
          notes: data.comoSoube,
          validated: false
        });
      
      if (supabaseError) {
        console.error('Erro ao salvar no Supabase:', supabaseError);
        toast.error('Erro ao salvar dados. Tente novamente.');
        return;
      }
      
      // Enviar webhook para cliente inexistente
      const webhookSuccess = await sendWebhook(
        'https://n8n.tradersbots.com.br/webhook/login',
        {
          ...data,
          tipo_mensagem: 'cliente_inexistente'
        }
      );
      
      if (webhookSuccess) {
        setShowRegistrationModal(false);
        toast.success('Cadastro realizado com sucesso!');
        // Aqui você pode prosseguir com a compra ou mostrar próximos passos
      } else {
        toast.error('Erro ao enviar notificação. Cadastro foi salvo, mas tente novamente.');
      }
    } catch (error) {
      console.error('Erro no cadastro:', error);
      toast.error('Erro ao realizar cadastro. Tente novamente.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handlePurchase = () => {
    if (!event || !priceBatches[selectedBatch]) return;
    
    // Verificar se é evento privado
    if (!event.is_public) {
      setShowPhoneModal(true);
      return;
    }
    
    // Lógica normal de compra para eventos públicos
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
      {/* Modais de autenticação */}
      <PhoneLoginModal
        isOpen={showPhoneModal}
        onClose={() => setShowPhoneModal(false)}
        onSubmit={handlePhoneLogin}
        loading={authLoading}
      />
      
      <TokenVerificationModal
        isOpen={showTokenModal}
        onClose={() => {
          setShowTokenModal(false);
          setTokenError('');
        }}
        onSubmit={handleTokenVerification}
        onResend={handleResendToken}
        phone={currentPhone}
        loading={authLoading}
        error={tokenError}
        timeRemaining={timeRemaining}
        tokenTimestamp={tokenTimestamp}
      />
      
      <ClientRegistrationModal
        isOpen={showRegistrationModal}
        onClose={() => setShowRegistrationModal(false)}
        onSubmit={handleClientRegistration}
        loading={authLoading}
        prefilledPhone={currentPhone}
      />
      
      <SuccessModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        title="Cliente Existente!"
        message="Verificação realizada com sucesso. Você pode prosseguir com a compra."
        buttonText="Continuar Compra"
      />
      
      <SuccessModal
        isOpen={showPendingValidationModal}
        onClose={() => setShowPendingValidationModal(false)}
        title="Validação Pendente"
        message={`Olá, ${currentClientName}, seu número já está cadastrado e está pendente de validação. Aguarde que entraremos em contato via WhatsApp.`}
        buttonText="Entendi"
      />
      
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