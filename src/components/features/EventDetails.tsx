import React, { useEffect, useState } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import Header from '../layout/Header';
import Footer from '../layout/Footer';
import EventImage from '../shared/EventImage';
import EventInfo from '../shared/EventInfo';
import EventDescription from '../shared/EventDescription';
import TicketCard from '../shared/TicketCard';
import { usePublicEvents } from '../../shared/hooks/hooks/usePublicEvents';
import { ArrowLeft } from 'lucide-react';
import { Event as EventType, PriceBatch, ScheduleItem, PaymentMethodFee } from '../../shared/types/types/event';
import { CouponValidationResult } from '../../shared/types/types/coupon';
import { processPriceBatches, getBatchStatus, formatPrice } from '../../shared/utils/utils/eventUtils';
import PhoneLoginModal from '../shared/PhoneLoginModal';
import TokenVerificationModal from '../shared/TokenVerificationModal';
import ClientRegistrationModal from '../shared/ClientRegistrationModal';
import SuccessModal from '../shared/SuccessModal';
import StripeCheckoutModal from '../shared/StripeCheckoutModal';
import PixChavePaymentModal from '../shared/PixChavePaymentModal';
import PaymentProofUploadModal from '../shared/PaymentProofUploadModal';
import PaymentSuccessModal from '../shared/PaymentSuccessModal';
import CheckoutClientModal, { CheckoutClientData } from '../shared/CheckoutClientModal';
import PriceUpdatedModal from '../shared/PriceUpdatedModal';
import PendingOrderRecoveryModal, { PendingOrderInfo } from '../shared/PendingOrderRecoveryModal';
import { createMercadoPagoCheckout, checkMercadoPagoPaymentStatus, findPendingOrderForClient, cancelPendingOrder } from '../../shared/services/mercadoPagoService';
import { createComplimentaryOrder } from '../../shared/services/complimentaryOrderService';
import { getClientIpAddress } from '../../shared/utils/utils/ipUtils';
import { supabase } from '../../shared/services/lib/supabase';
import { toast } from 'sonner';

const EventDetails: React.FC = () => {
  // Constante para tempo de expiração do token em segundos
  const TOKEN_EXPIRATION_TIME = 59;
  
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const { fetchEventById } = usePublicEvents();
  const [event, setEvent] = useState<EventType | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedBatch, setSelectedBatch] = useState<number>(0);
  const [quantity, setQuantity] = useState<number>(1);
  const [priceBatches, setPriceBatches] = useState<PriceBatch[]>([]);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('');
  const [selectedInstallments, setSelectedInstallments] = useState<number | null>(null);
  const [appliedCoupon, setAppliedCoupon] = useState<CouponValidationResult | null>(null);
  
  // Estados para autenticação e captura de dados do comprador
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [showRegistrationModal, setShowRegistrationModal] = useState(false);
  const [showCheckoutClientModal, setShowCheckoutClientModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showPendingValidationModal, setShowPendingValidationModal] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [currentPhone, setCurrentPhone] = useState('');
  const [currentClientName, setCurrentClientName] = useState('');
  const [currentClientEmail, setCurrentClientEmail] = useState('');
  const [currentClientCpf, setCurrentClientCpf] = useState('');
  const [generatedToken, setGeneratedToken] = useState('');
  const [tokenError, setTokenError] = useState('');
  const [tokenTimestamp, setTokenTimestamp] = useState<number>(0);
  const [timeRemaining, setTimeRemaining] = useState<number>(30);

  // Estados para o Checkout do Stripe e Pix Chave
  const [showStripeCheckoutModal, setShowStripeCheckoutModal] = useState(false);
  const [showPixChaveModal, setShowPixChaveModal] = useState(false);
  const [showPaymentProofModal, setShowPaymentProofModal] = useState(false);
  const [showPaymentSuccessModal, setShowPaymentSuccessModal] = useState(false);
  const [stripeCheckoutLoading, setStripeCheckoutLoading] = useState(false);
  const [stripeErrorMessage, setStripeErrorMessage] = useState<string | null>(null);
  const [stripeSessionId, setStripeSessionId] = useState<string>('');

  // Efeito para verificar parâmetros de retorno de pagamento (?payment=success&order_id=... ou &session_id=...)
  useEffect(() => {
    const paymentStatus = searchParams.get('payment');
    const sessionId = searchParams.get('session_id') || searchParams.get('order_id');

    if (paymentStatus === 'success' && sessionId) {
      setStripeSessionId(sessionId);
      setShowPaymentSuccessModal(true);
      
      // Limpar parâmetros da URL sem recarregar a página
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('payment');
      newParams.delete('session_id');
      newParams.delete('order_id');
      setSearchParams(newParams, { replace: true });
    } else if (paymentStatus === 'cancel' || paymentStatus === 'failure') {
      toast.info('Pagamento não concluído ou cancelado.');
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('payment');
      newParams.delete('session_id');
      newParams.delete('order_id');
      setSearchParams(newParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

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

        // Deixar a seleção da forma de pagamento para o comprador no card
        setSelectedPaymentMethod('');
        
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

  // Obter configurações do método de pagamento ativo baseado no lote selecionado
  const selectedBatchData = priceBatches[selectedBatch];
  const effectivePaymentMethods = (selectedBatchData?.use_custom_payment_methods && selectedBatchData?.payment_methods && selectedBatchData.payment_methods.length > 0)
    ? selectedBatchData.payment_methods
    : (event?.payment_methods || []);

  const currentPaymentMethodConfig = effectivePaymentMethods.find(pm => pm.method === selectedPaymentMethod);
  const currentFeePercentage = currentPaymentMethodConfig?.fee_percentage || 0;
  const currentUnitPrice = selectedBatchData?.price || 0;
  const currentSubtotal = currentUnitPrice * quantity;

  // Cálculo de desconto do cupom
  let currentDiscountAmount = 0;
  if (appliedCoupon && appliedCoupon.valid) {
    if (appliedCoupon.discount_type === 'percentage') {
      const pct = Math.min(appliedCoupon.discount_value || 0, 100);
      currentDiscountAmount = Number(((currentSubtotal * pct) / 100).toFixed(2));
    } else {
      currentDiscountAmount = Math.min(Number(appliedCoupon.discount_value || 0), currentSubtotal);
    }
  }

  const currentSubtotalAfterDiscount = Math.max(0, Number((currentSubtotal - currentDiscountAmount).toFixed(2)));
  const currentFeeAmount = currentSubtotalAfterDiscount * (currentFeePercentage / 100);

  const getPaymentMethodLabel = (methodKey?: string) => {
    if (methodKey === 'boleto') return 'Boleto Bancário';
    if (methodKey === 'credit_card') return 'Cartão de Crédito';
    if (methodKey === 'pix' || methodKey === 'pix_stripe') return 'Pix';
    if (methodKey === 'pix_chave') return 'Pix (Chave / QR Code)';
    return undefined;
  };

  // Função para gerar token de 6 dígitos
  const generateToken = (): string => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  };

  // Função para verificar se cliente existe
  const checkClientExists = async (phone: string): Promise<{exists: boolean, name?: string, validated?: boolean}> => {
    try {
      const { data, error } = await supabase
        .from('app_people')
        .select('id, nome, validated')
        .eq('whatsapp', phone)
        .single();
      
      if (error && error.code !== 'PGRST116') {
        throw error;
      }
      
      if (data) {
        return {
          exists: true,
          name: data.nome,
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
          .from('app_people')
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
      // Verificar se o telefone já existe na tabela app_people
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
      
      // Cliente não existe - inserir na tabela app_people
      const { error: supabaseError } = await supabase
        .from('app_people')
        .insert({
          nome: data.nome,
          whatsapp: data.telefone,
          notes: data.comoSoube,
          validated: false,
          is_active: true
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

  const [awaitingPaymentOrderId, setAwaitingPaymentOrderId] = useState<string | null>(null);
  const [paymentWindowRef, setPaymentWindowRef] = useState<Window | null>(null);

  // Estados para o Modal de Preço Atualizado
  const [showPriceUpdatedModal, setShowPriceUpdatedModal] = useState(false);
  const [priceMismatchDetails, setPriceMismatchDetails] = useState<{
    oldPrice: number;
    newPrice: number;
    batchName: string;
    reason: 'price_changed' | 'batch_expired' | 'batch_sold_out' | 'fee_changed';
  }>({
    oldPrice: 0,
    newPrice: 0,
    batchName: 'Lote',
    reason: 'price_changed',
  });

  // Estados para Recuperação de Pedidos Pendentes Duplicados
  const [showPendingRecoveryModal, setShowPendingRecoveryModal] = useState(false);
  const [pendingOrderFound, setPendingOrderFound] = useState<PendingOrderInfo | null>(null);
  const [reusableOrderId, setReusableOrderId] = useState<string | null>(null);

  // Valida e sincroniza os dados do evento em tempo real direto do banco antes de qualquer avanço financeiro
  const verifyAndSyncEventData = async (): Promise<boolean> => {
    if (!id) return false;

    try {
      const freshEvent = await fetchEventById(id);
      if (!freshEvent) {
        toast.error('Este evento não está mais disponível.');
        return false;
      }

      const freshBatches = freshEvent.price_batches ? processPriceBatches(freshEvent.price_batches) : [];
      const currentBatchData = priceBatches[selectedBatch];
      const freshBatchData = freshBatches[selectedBatch] || freshBatches[0];

      // Atualizar o evento e os lotes no estado local
      setEvent(freshEvent as EventType);
      setPriceBatches(freshBatches);

      if (!freshBatchData) {
        toast.error('Lote de ingressos indisponível.');
        return false;
      }

      // 1. Checar se o status do lote mudou (expirado ou esgotado)
      const freshBatchStatus = getBatchStatus(freshBatchData);
      if (freshBatchStatus !== 'active') {
        setPriceMismatchDetails({
          oldPrice: Number(currentBatchData?.price || 0),
          newPrice: Number(freshBatchData.price || 0),
          batchName: freshBatchData.name || `Lote ${selectedBatch + 1}`,
          reason: freshBatchStatus === 'expired' ? 'batch_expired' : 'batch_sold_out',
        });
        setShowPriceUpdatedModal(true);
        setShowCheckoutClientModal(false);
        setShowStripeCheckoutModal(false);
        return false;
      }

      // 2. Checar se a quantidade solicitada excede o estoque restante do lote
      if (freshBatchData.quantity && freshBatchData.quantity > 0) {
        const remaining = Math.max(0, freshBatchData.quantity - (freshBatchData.sold_quantity || 0));
        if (remaining === 0) {
          setPriceMismatchDetails({
            oldPrice: Number(currentBatchData?.price || 0),
            newPrice: Number(freshBatchData.price || 0),
            batchName: freshBatchData.name || `Lote ${selectedBatch + 1}`,
            reason: 'batch_sold_out',
          });
          setShowPriceUpdatedModal(true);
          setShowCheckoutClientModal(false);
          setShowStripeCheckoutModal(false);
          return false;
        }

        if (quantity > remaining) {
          toast.error(`Restam apenas ${remaining} ingressos disponíveis para o lote "${freshBatchData.name}". Ajustamos a quantidade para você.`);
          setQuantity(remaining);
          return false;
        }
      }

      // 3. Checar se o valor do lote foi alterado no admin
      const oldPrice = Number(currentBatchData?.price || 0);
      const newPrice = Number(freshBatchData.price || 0);

      if (Math.abs(oldPrice - newPrice) > 0.001) {
        setPriceMismatchDetails({
          oldPrice,
          newPrice,
          batchName: freshBatchData.name || `Lote ${selectedBatch + 1}`,
          reason: 'price_changed',
        });
        setShowPriceUpdatedModal(true);
        setShowCheckoutClientModal(false);
        setShowStripeCheckoutModal(false);
        return false;
      }

      return true;
    } catch (err) {
      console.warn('Erro ao validar dados do evento em tempo real:', err);
      return true;
    }
  };

  const handleConfirmStripeCheckout = async () => {
    if (!id || !priceBatches[selectedBatch]) return;

    // Validar preço em tempo real antes de gerar o checkout
    const isUpToDate = await verifyAndSyncEventData();
    if (!isUpToDate) return;

    setStripeCheckoutLoading(true);
    setStripeErrorMessage(null);

    const cardConfig = (event?.payment_methods || []).find(pm => pm.method === 'credit_card');

    try {
      const res = await createMercadoPagoCheckout({
        event_id: id,
        batch_index: selectedBatch,
        batch_name: priceBatches[selectedBatch]?.name || `Lote ${selectedBatch + 1}`,
        unit_price: currentUnitPrice,
        quantity: quantity,
        client_name: currentClientName,
        client_phone: currentPhone,
        client_email: currentClientEmail,
        client_document: currentClientCpf || undefined,
        existing_order_id: reusableOrderId || undefined,
        payment_method: selectedPaymentMethod || undefined,
        installments: selectedInstallments || 1,
        max_installments: cardConfig?.max_installments || 12,
        convenience_fee: currentFeeAmount,
        convenience_fee_percentage: currentFeePercentage,
        coupon_id: appliedCoupon?.coupon_id || undefined,
        coupon_code: appliedCoupon?.code || undefined,
        discount_amount: currentDiscountAmount,
      });

      if (res.error) {
        setStripeErrorMessage(res.error);
        setStripeCheckoutLoading(false);
        return;
      }

      if (res.checkoutUrl) {
        // Abrir checkout do Mercado Pago em nova aba
        const paymentWin = window.open(res.checkoutUrl, '_blank');
        setPaymentWindowRef(paymentWin);

        // Armazenar o orderId para polling de status
        if (res.orderId) {
          setAwaitingPaymentOrderId(res.orderId);
        }

        setStripeCheckoutLoading(false);
      } else {
        setStripeErrorMessage('Não foi possível obter o link de pagamento.');
        setStripeCheckoutLoading(false);
      }
    } catch (err: any) {
      console.error('Erro ao iniciar checkout do Mercado Pago:', err);
      setStripeErrorMessage(err.message || 'Erro ao processar checkout.');
      setStripeCheckoutLoading(false);
    }
  };

  // Polling de status do pedido para detectar pagamento aprovado
  useEffect(() => {
    if (!awaitingPaymentOrderId) return;

    const checkStatus = async () => {
      try {
        const result = await checkMercadoPagoPaymentStatus(awaitingPaymentOrderId);
        if (result.paid) {
          setStripeSessionId(result.paymentId || awaitingPaymentOrderId);
          setAwaitingPaymentOrderId(null);
          setShowStripeCheckoutModal(false);
          setShowPaymentSuccessModal(true);
          toast.success('Pagamento aprovado com sucesso! Seus ingressos foram emitidos! 🎉');
        }
      } catch (err) {
        // Silencioso - continua polling
      }
    };

    // Executar imediatamente e depois a cada 4 segundos
    checkStatus();
    const pollInterval = setInterval(checkStatus, 4000);

    return () => clearInterval(pollInterval);
  }, [awaitingPaymentOrderId]);

  // Verificar retorno via query params (quando o Mercado Pago redireciona de volta)
  useEffect(() => {
    const paymentStatus = searchParams.get('payment');
    const orderId = searchParams.get('order_id');

    if (paymentStatus === 'success' && orderId) {
      setAwaitingPaymentOrderId(null);
      setShowStripeCheckoutModal(false);
      setShowPaymentSuccessModal(true);

      const newParams = new URLSearchParams(searchParams);
      newParams.delete('payment');
      newParams.delete('order_id');
      setSearchParams(newParams, { replace: true });
    }
  }, [searchParams]);

  const [attendeesList, setAttendeesList] = useState<CheckoutClientData[]>([]);

  const handleCheckoutClientSubmit = async (buyerData: CheckoutClientData, allAttendees: CheckoutClientData[]) => {
    // Validar preço em tempo real antes de avançar para pagamento
    const isUpToDate = await verifyAndSyncEventData();
    if (!isUpToDate) return;

    setCurrentClientName(buyerData.nome);
    setCurrentPhone(buyerData.whatsapp);
    if (buyerData.email) setCurrentClientEmail(buyerData.email);
    const doc = buyerData.cpf || buyerData.documento || '';
    if (doc) setCurrentClientCpf(doc);
    setAttendeesList(allAttendees);

    setShowCheckoutClientModal(false);

    // Se o valor for R$ 0,00 (Cortesia por Cupom de 100% ou Lote Gratuito), emite diretamente
    if (currentSubtotalAfterDiscount === 0) {
      try {
        toast.info('Processando sua inscrição cortesia...');
        const result = await createComplimentaryOrder({
          event_id: id || '',
          batch_index: selectedBatch,
          batch_name: priceBatches[selectedBatch]?.name || 'Cortesia',
          unit_price: currentUnitPrice,
          quantity: quantity,
          client_name: buyerData.nome,
          client_phone: buyerData.whatsapp,
          client_email: buyerData.email || undefined,
          client_document: doc || undefined,
          coupon_id: appliedCoupon?.coupon_id || undefined,
          coupon_code: appliedCoupon?.code || undefined,
          discount_amount: currentDiscountAmount || (currentUnitPrice * quantity),
          attendees: allAttendees,
          send_whatsapp: true,
        });

        if (result.success && result.orderId) {
          setStripeSessionId(result.orderId);
          setShowPaymentSuccessModal(true);
          toast.success('Inscrição cortesia confirmada! Ingressos emitidos e enviados no seu WhatsApp! 🎉');
        } else {
          toast.error(result.error || 'Erro ao emitir inscrição cortesia.');
        }
      } catch (err: any) {
        toast.error(err.message || 'Erro inesperado ao emitir cortesia.');
      }
      return;
    }

    // Verificar se já existe uma ordem pendente para o comprador/IP
    try {
      const clientIp = await getClientIpAddress();
      const existingPending = await findPendingOrderForClient({
        event_id: id || '',
        client_document: doc,
        client_phone: buyerData.whatsapp,
        ip_address: clientIp,
      });

      if (existingPending) {
        if (Number(existingPending.quantity) === quantity) {
          // Quantidade é igual: abre o modal para o usuário escolher continuar ou desconsiderar
          setPendingOrderFound(existingPending);
          setShowPendingRecoveryModal(true);
          return;
        } else {
          // Quantidade é diferente: cancela automaticamente a ordem anterior
          await cancelPendingOrder(existingPending.id, 'quantidade_alterada');
          setReusableOrderId(null);
        }
      } else {
        setReusableOrderId(null);
      }
    } catch (err) {
      console.warn('Erro ao verificar ordem pendente existente:', err);
    }

    // Se a forma selecionada for Pix Chave
    if (selectedPaymentMethod === 'pix_chave') {
      setShowPixChaveModal(true);
      return;
    }

    // Para Boleto, Cartão de Crédito ou Pix
    setStripeErrorMessage(null);
    setShowStripeCheckoutModal(true);
  };

  const handleContinueExistingOrder = () => {
    if (pendingOrderFound) {
      setReusableOrderId(pendingOrderFound.id);
    }
    setShowPendingRecoveryModal(false);

    if (selectedPaymentMethod === 'pix_chave') {
      setShowPixChaveModal(true);
    } else {
      setStripeErrorMessage(null);
      setShowStripeCheckoutModal(true);
    }
  };

  const handleDiscardAndCreateNewOrder = async () => {
    if (pendingOrderFound) {
      await cancelPendingOrder(pendingOrderFound.id, 'cancelado_pelo_usuario_novo_pedido');
    }
    setReusableOrderId(null);
    setShowPendingRecoveryModal(false);

    if (selectedPaymentMethod === 'pix_chave') {
      setShowPixChaveModal(true);
    } else {
      setStripeErrorMessage(null);
      setShowStripeCheckoutModal(true);
    }
  };

  const handlePurchase = async () => {
    if (!event || !priceBatches[selectedBatch]) return;
    
    // Verificar se é evento privado
    if (!event.is_public) {
      setShowPhoneModal(true);
      return;
    }

    // Validar preço em tempo real antes de abrir o modal do comprador
    const isUpToDate = await verifyAndSyncEventData();
    if (!isUpToDate) return;
    
    const selectedBatchData = priceBatches[selectedBatch];
    const status = getBatchStatus(selectedBatchData);
    if (!selectedBatchData || status !== 'active') return;

    // Abrir modal de identificação e preenchimento dos dados do comprador
    setShowCheckoutClientModal(true);
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
      toast.success('Link copiado para a área de transferência!');
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

  const pixChaveConfig = (event.payment_methods || []).find(pm => pm.method === 'pix_chave');

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
        onClose={() => {
          setShowSuccessModal(false);
          if (selectedPaymentMethod === 'pix_chave') {
            setShowPixChaveModal(true);
          } else {
            setShowStripeCheckoutModal(true);
          }
        }}
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

      {/* Modal de Identificação e Dados dos Participantes (Campos dinâmicos por evento e múltiplos ingressos) */}
      <CheckoutClientModal
        isOpen={showCheckoutClientModal}
        onClose={() => setShowCheckoutClientModal(false)}
        onSubmit={handleCheckoutClientSubmit}
        checkoutFields={event?.checkout_fields || []}
        quantity={quantity}
        initialPhone={currentPhone}
        initialName={currentClientName}
        eventTitle={event?.title}
      />

      {/* Modal de Pagamento do Stripe / Mercado Pago (Boleto, Cartão, Pix) */}
      <StripeCheckoutModal
        isOpen={showStripeCheckoutModal}
        onClose={() => {
          setShowStripeCheckoutModal(false);
          setStripeErrorMessage(null);
          setAwaitingPaymentOrderId(null);
        }}
        eventTitle={event?.title || 'Evento'}
        batchName={priceBatches[selectedBatch]?.name || `Lote ${selectedBatch + 1}`}
        unitPrice={currentUnitPrice}
        quantity={quantity}
        paymentMethod={selectedPaymentMethod}
        paymentMethodLabel={getPaymentMethodLabel(selectedPaymentMethod)}
        feePercentage={currentFeePercentage}
        appliedCoupon={appliedCoupon}
        discountAmount={currentDiscountAmount}
        clientName={currentClientName}
        clientPhone={currentPhone}
        clientEmail={currentClientEmail}
        onConfirmCheckout={handleConfirmStripeCheckout}
        loading={stripeCheckoutLoading}
        errorMessage={stripeErrorMessage}
        awaitingPayment={!!awaitingPaymentOrderId}
      />

      {/* Modal de Pagamento Pix Chave (QR Code Próprio) */}
      <PixChavePaymentModal
        isOpen={showPixChaveModal}
        onClose={() => setShowPixChaveModal(false)}
        eventTitle={event?.title || 'Evento'}
        batchName={priceBatches[selectedBatch]?.name || `Lote ${selectedBatch + 1}`}
        unitPrice={currentUnitPrice}
        quantity={quantity}
        feePercentage={currentFeePercentage}
        appliedCoupon={appliedCoupon}
        discountAmount={currentDiscountAmount}
        qrCodeUrl={pixChaveConfig?.qr_code_url}
        pixKey={pixChaveConfig?.pix_key}
        clientName={currentClientName}
        clientPhone={currentPhone}
        onProceedToProofUpload={() => {
          setShowPixChaveModal(false);
          setShowPaymentProofModal(true);
        }}
      />

      {/* Modal de Upload de Comprovante de Pagamento */}
      <PaymentProofUploadModal
        isOpen={showPaymentProofModal}
        onClose={() => setShowPaymentProofModal(false)}
        eventId={id || ''}
        eventTitle={event?.title || 'Evento'}
        batchIndex={selectedBatch}
        batchName={priceBatches[selectedBatch]?.name || `Lote ${selectedBatch + 1}`}
        unitPrice={currentUnitPrice}
        quantity={quantity}
        feePercentage={currentFeePercentage}
        appliedCoupon={appliedCoupon}
        discountAmount={currentDiscountAmount}
        clientName={currentClientName}
        clientPhone={currentPhone}
        clientEmail={currentClientEmail}
        clientDocument={currentClientCpf}
        onSuccess={() => {
          setShowPaymentProofModal(false);
          toast.success('Comprovante enviado com sucesso! Aguarde a validação.');
        }}
      />

      <PaymentSuccessModal
        isOpen={showPaymentSuccessModal}
        onClose={() => setShowPaymentSuccessModal(false)}
        sessionId={stripeSessionId}
        eventTitle={event?.title}
      />

      {/* Modal de Alerta de Preço Atualizado em Tempo Real */}
      <PriceUpdatedModal
        isOpen={showPriceUpdatedModal}
        onClose={() => setShowPriceUpdatedModal(false)}
        onConfirm={() => setShowPriceUpdatedModal(false)}
        oldUnitPrice={priceMismatchDetails.oldPrice}
        newUnitPrice={priceMismatchDetails.newPrice}
        batchName={priceMismatchDetails.batchName}
        reason={priceMismatchDetails.reason}
      />

      {/* Modal de Recuperação de Pedidos Pendentes Duplicados */}
      <PendingOrderRecoveryModal
        isOpen={showPendingRecoveryModal}
        onClose={() => setShowPendingRecoveryModal(false)}
        pendingOrder={pendingOrderFound}
        onContinueExisting={handleContinueExistingOrder}
        onDiscardAndCreateNew={handleDiscardAndCreateNewOrder}
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
                      {event.event_type && !/^[0-9a-fA-F-]{36}$/.test(event.event_type) && (
                        <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                          {event.event_type}
                        </span>
                      )}
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
                    paymentMethods={event?.payment_methods || []}
                    selectedPaymentMethod={selectedPaymentMethod}
                    onPaymentMethodSelect={(method) => {
                      setSelectedPaymentMethod(method);
                      if (method !== 'credit_card') {
                        setSelectedInstallments(null);
                      }
                    }}
                    selectedInstallments={selectedInstallments || undefined}
                    onInstallmentsSelect={(inst) => setSelectedInstallments(inst)}
                    onBatchSelect={setSelectedBatch}
                    onQuantityChange={handleQuantityChange}
                    onPurchase={handlePurchase}
                    registrationDeadline={event.registration_deadline}
                    eventId={id}
                    appliedCoupon={appliedCoupon}
                    onCouponApply={setAppliedCoupon}
                    clientDocument={currentClientCpf}
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