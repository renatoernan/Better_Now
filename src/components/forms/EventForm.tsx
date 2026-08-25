import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { X, Save, Calendar, Clock, MapPin, Users, DollarSign, Tag, Mail, Phone, Info, Plus, Trash2, Video, AlertCircle, CreditCard, FileText, QrCode, Percent, Upload, Image as ImageIcon, UserCheck, ClipboardList, CheckSquare, GripVertical, ArrowUp, ArrowDown, MessageSquare, Copy, Check, Sparkles, RefreshCw, Ticket, Send } from 'lucide-react';
import { Event, PriceBatch, PaymentMethodFee, CheckoutFieldConfig } from '../../shared/types/types/event';
import { useSupabaseEventTypes } from '../../shared/hooks/hooks/useSupabaseEventTypes';
import ImageUpload from '../shared/ImageUpload';
import VideoUpload from '../shared/VideoUpload';
import EventWahaTestModal from '../shared/EventWahaTestModal';
import EventEmailTestModal from '../shared/EventEmailTestModal';
import { toast } from 'sonner';
import { PhoneInput } from '../ui/PhoneInput';

const DEFAULT_WAHA_MSG_CREATED = 'Olá, {cliente}! Recebemos seu pedido #{numero_pedido} para o evento *{evento}*.\n\n💰 *Total:* {total}\n⏳ *Status:* Aguardando Pagamento\n\nAssim que o pagamento for confirmado, você receberá seus ingressos por aqui!';
const DEFAULT_WAHA_MSG_CONFIRMED = '🎉 Parabéns, {cliente}! Seu pagamento para o evento *{evento}* foi confirmado com sucesso!\n\n🎟️ *Quantidade de Ingressos:* {quantidade}\n📅 *Data:* {data_evento}\n📍 *Local:* {local_evento}\n\nVocê pode acessar seus ingressos a qualquer momento através do link: {link_acesso}';
const DEFAULT_WAHA_MSG_CANCELLED = 'Olá, {cliente}. Informamos que seu pedido #{numero_pedido} para o evento *{evento}* foi cancelado.\n\nSe você tiver alguma dúvida, entre em contato conosco.';

const DEFAULT_EMAIL_MSG_CREATED_SUBJECT = 'Pedido Recebido #{numero_pedido} - {evento}';
const DEFAULT_EMAIL_MSG_CREATED_BODY = 'Olá, {cliente}!\n\nRecebemos o seu pedido #{numero_pedido} para o evento {evento}.\n\nValor Total: {total}\nQuantidade de Ingressos: {quantidade}\n\nAssim que o pagamento for confirmado, você receberá seus ingressos com QR Code por aqui!';

const DEFAULT_EMAIL_MSG_CONFIRMED_SUBJECT = '🎉 Ingressos Confirmados! Pedido #{numero_pedido} - {evento}';
const DEFAULT_EMAIL_MSG_CONFIRMED_BODY = 'Parabéns, {cliente}!\n\nSeu pagamento para o evento {evento} foi confirmado com sucesso!\n\nDetalhes do Evento:\n- Data: {data_evento}\n- Local: {local_evento}\n- Quantidade de Ingressos: {quantidade}\n\nVocê pode visualizar seus ingressos e QR Codes no link abaixo:\n{link_acesso}';

const DEFAULT_EMAIL_MSG_CANCELLED_SUBJECT = 'Pedido Cancelado #{numero_pedido} - {evento}';
const DEFAULT_EMAIL_MSG_CANCELLED_BODY = 'Olá, {cliente}.\n\nInformamos que seu pedido #{numero_pedido} para o evento {evento} foi cancelado.\n\nSe tiver alguma dúvida, entre em contato conosco.';

interface LocalPriceBatch {
  id: string;
  name: string;
  price: number;
  quantity?: number;
  sold_quantity?: number;
  start_date: string;
  end_date?: string;
  use_custom_payment_methods?: boolean;
  payment_methods?: PaymentMethodFee[];
}

const DEFAULT_PAYMENT_METHODS: PaymentMethodFee[] = [
  { method: 'boleto', label: 'Boleto Bancário', enabled: false, fee_percentage: 0 },
  { method: 'credit_card', label: 'Cartão de Crédito', enabled: false, fee_percentage: 0, max_installments: 12 },
  { method: 'pix_stripe', label: 'Pix', enabled: false, fee_percentage: 0 },
  { method: 'pix_chave', label: 'Pix (Chave / QR Code Próprio)', enabled: false, fee_percentage: 0, qr_code_url: '', pix_key: '' }
];

const DEFAULT_CHECKOUT_FIELDS: CheckoutFieldConfig[] = [
  { field: 'cpf', label: 'CPF / Documento', enabled: true, required: true, type: 'cpf' },
  { field: 'nome', label: 'Nome Completo', enabled: true, required: true, type: 'text' },
  { field: 'apelido', label: 'Apelido / Nome Social', enabled: false, required: false, type: 'text' },
  { field: 'whatsapp', label: 'WhatsApp', enabled: true, required: true, type: 'phone' },
  { field: 'telefone', label: 'Telefone', enabled: false, required: false, type: 'phone' },
  { field: 'email', label: 'E-mail', enabled: true, required: false, type: 'email' },
  { field: 'data_nascimento', label: 'Data de Nascimento', enabled: false, required: false, type: 'date' },
  { field: 'profissao', label: 'Profissão / Cargo', enabled: false, required: false, type: 'text' },
  { field: 'empresa', label: 'Empresa / Organização', enabled: false, required: false, type: 'text' },
  { field: 'cep', label: 'CEP', enabled: false, required: false, type: 'cep' },
  { field: 'logradouro', label: 'Endereço / Logradouro', enabled: false, required: false, type: 'text' },
  { field: 'numero', label: 'Número', enabled: false, required: false, type: 'text' },
  { field: 'complemento', label: 'Complemento', enabled: false, required: false, type: 'text' },
  { field: 'bairro', label: 'Bairro', enabled: false, required: false, type: 'text' },
  { field: 'cidade', label: 'Cidade', enabled: false, required: false, type: 'text' },
  { field: 'uf', label: 'Estado (UF)', enabled: false, required: false, type: 'select' },
  { field: 'notes', label: 'Observações / Como soube', enabled: false, required: false, type: 'textarea' },
];

interface EventFormProps {
  event?: Event | null;
  onSave: (eventData: Partial<Event>) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

const EventForm: React.FC<EventFormProps> = ({
  event,
  onSave,
  onCancel,
  loading = false
}) => {
  const { eventTypes, fetchEventTypes } = useSupabaseEventTypes();
  
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    clearErrors,
    trigger,
    formState: { errors, isSubmitting, isValid }
  } = useForm<Event>({
    mode: 'onChange',
    defaultValues: {
      title: '',
      description: '',
      event_type: '',
      event_date: '',
      event_time: '',
      end_date: '',
      end_time: '',
      location: '',
      location_link: '',
      max_guests: 0,
      status: 'draft',
      is_public: true,
      requires_approval: false,
      event_type_id: '',
      contact_email: '',
      contact_phone: '',
      additional_info: '',
      image_url: '',
      videos: [],
      waha_msg_order_created: DEFAULT_WAHA_MSG_CREATED,
      waha_msg_order_confirmed: DEFAULT_WAHA_MSG_CONFIRMED,
      waha_msg_order_cancelled: DEFAULT_WAHA_MSG_CANCELLED,
      email_msg_order_created_subject: DEFAULT_EMAIL_MSG_CREATED_SUBJECT,
      email_msg_order_created_body: DEFAULT_EMAIL_MSG_CREATED_BODY,
      email_msg_order_confirmed_subject: DEFAULT_EMAIL_MSG_CONFIRMED_SUBJECT,
      email_msg_order_confirmed_body: DEFAULT_EMAIL_MSG_CONFIRMED_BODY,
      email_msg_order_cancelled_subject: DEFAULT_EMAIL_MSG_CANCELLED_SUBJECT,
      email_msg_order_cancelled_body: DEFAULT_EMAIL_MSG_CANCELLED_BODY,
    }
  });

  type EventFormTab = 'details' | 'tickets' | 'media' | 'payments' | 'checkout' | 'whatsapp' | 'email';

  const [activeTab, setActiveTab] = useState<EventFormTab>('details');
  const [priceBatches, setPriceBatches] = useState<LocalPriceBatch[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodFee[]>(DEFAULT_PAYMENT_METHODS);
  const [checkoutFields, setCheckoutFields] = useState<CheckoutFieldConfig[]>(DEFAULT_CHECKOUT_FIELDS);
  const [draggedFieldIndex, setDraggedFieldIndex] = useState<number | null>(null);
  const [copiedTag, setCopiedTag] = useState<string | null>(null);
  const [showWahaTestModal, setShowWahaTestModal] = useState(false);
  const [showEmailTestModal, setShowEmailTestModal] = useState(false);

  useEffect(() => {
    if (event) {
      setValue('title', event.title || '', { shouldValidate: true });
      setValue('description', event.description || '', { shouldValidate: true });
      setValue('event_type', event.event_type || event.event_type_id || '', { shouldValidate: true });
      setValue('event_date', event.event_date || '', { shouldValidate: true });
      setValue('event_time', event.event_time || '', { shouldValidate: true });
      setValue('end_date', event.end_date || '', { shouldValidate: true });
      setValue('end_time', event.end_time || '', { shouldValidate: true });
      setValue('location', event.location || '', { shouldValidate: true });
      setValue('location_link', event.location_link || '', { shouldValidate: true });
      setValue('max_guests', event.max_guests || 0, { shouldValidate: true });
      setValue('status', event.status || 'draft', { shouldValidate: true });
      setValue('is_public', event.is_public ?? true, { shouldValidate: true });
      setValue('requires_approval', event.requires_approval ?? false, { shouldValidate: true });
      setValue('event_type_id', event.event_type_id || event.event_type || '', { shouldValidate: true });
      setValue('contact_email', event.contact_email || '', { shouldValidate: true });
      setValue('contact_phone', event.contact_phone || '', { shouldValidate: true });
      setValue('additional_info', event.additional_info || '', { shouldValidate: true });
      setValue('image_url', event.image_url || '', { shouldValidate: true });
      setValue('videos', event.videos || [], { shouldValidate: true });
      setValue('waha_msg_order_created', event.waha_msg_order_created || DEFAULT_WAHA_MSG_CREATED, { shouldValidate: true });
      setValue('waha_msg_order_confirmed', event.waha_msg_order_confirmed || DEFAULT_WAHA_MSG_CONFIRMED, { shouldValidate: true });
      setValue('waha_msg_order_cancelled', event.waha_msg_order_cancelled || DEFAULT_WAHA_MSG_CANCELLED, { shouldValidate: true });
      setValue('email_msg_order_created_subject', event.email_msg_order_created_subject || DEFAULT_EMAIL_MSG_CREATED_SUBJECT, { shouldValidate: true });
      setValue('email_msg_order_created_body', event.email_msg_order_created_body || DEFAULT_EMAIL_MSG_CREATED_BODY, { shouldValidate: true });
      setValue('email_msg_order_confirmed_subject', event.email_msg_order_confirmed_subject || DEFAULT_EMAIL_MSG_CONFIRMED_SUBJECT, { shouldValidate: true });
      setValue('email_msg_order_confirmed_body', event.email_msg_order_confirmed_body || DEFAULT_EMAIL_MSG_CONFIRMED_BODY, { shouldValidate: true });
      setValue('email_msg_order_cancelled_subject', event.email_msg_order_cancelled_subject || DEFAULT_EMAIL_MSG_CANCELLED_SUBJECT, { shouldValidate: true });
      setValue('email_msg_order_cancelled_body', event.email_msg_order_cancelled_body || DEFAULT_EMAIL_MSG_CANCELLED_BODY, { shouldValidate: true });
      
      if (event.price_batches && Array.isArray(event.price_batches)) {
        setPriceBatches(event.price_batches.map((b, idx) => {
          const isCustom = Boolean(b.use_custom_payment_methods);
          return {
            id: b.id || `batch-${idx}-${Date.now()}`,
            name: b.name || `Lote ${idx + 1}`,
            price: Number(b.price) || 0,
            quantity: b.quantity,
            sold_quantity: b.sold_quantity,
            start_date: b.start_date || '',
            end_date: b.end_date || '',
            use_custom_payment_methods: isCustom,
            payment_methods: isCustom && b.payment_methods && Array.isArray(b.payment_methods)
              ? DEFAULT_PAYMENT_METHODS.map(defaultPm => {
                  const found = b.payment_methods?.find(pm => pm.method === defaultPm.method);
                  return found ? { ...defaultPm, ...found } : defaultPm;
                })
              : undefined
          };
        }));
      }

      if (event.payment_methods && Array.isArray(event.payment_methods)) {
        const merged = DEFAULT_PAYMENT_METHODS.map(defaultPm => {
          const found = event.payment_methods?.find(pm => pm.method === defaultPm.method);
          return found ? { ...defaultPm, ...found } : defaultPm;
        });
        setPaymentMethods(merged);
      } else {
        setPaymentMethods(DEFAULT_PAYMENT_METHODS);
      }

      if (event.checkout_fields && Array.isArray(event.checkout_fields) && event.checkout_fields.length > 0) {
        const canonicalKey = (k: string) => {
          if (k === 'documento') return 'cpf';
          if (k === 'observacoes') return 'notes';
          return k;
        };

        const seenKeys = new Set<string>();
        const savedFields: CheckoutFieldConfig[] = [];

        event.checkout_fields.forEach(savedField => {
          const key = canonicalKey(savedField.field);
          if (!seenKeys.has(key)) {
            seenKeys.add(key);
            const defaultDef = DEFAULT_CHECKOUT_FIELDS.find(df => df.field === key);
            savedFields.push({
              ...(defaultDef || { type: 'text' as const, label: savedField.label || key }),
              ...savedField,
              field: key,
              label: defaultDef ? defaultDef.label : (savedField.label || key)
            });
          }
        });

        const missingFields = DEFAULT_CHECKOUT_FIELDS.filter(
          df => !seenKeys.has(df.field)
        );

        setCheckoutFields([...savedFields, ...missingFields]);
      } else {
        setCheckoutFields(DEFAULT_CHECKOUT_FIELDS);
      }

      trigger();
    }
  }, [event, setValue, trigger]);

  const addPriceBatch = () => {
    const currentBatches = [...priceBatches];
    
    if (currentBatches.length === 0) {
      const newBatch: LocalPriceBatch = {
        id: Date.now().toString(),
        name: 'Lote Único',
        price: 0,
        start_date: '',
        end_date: ''
      };
      setPriceBatches([newBatch]);
    } else {
      // Se já existe um lote e é "Lote Único", renomeia para "Lote 1"
      if (currentBatches.length === 1 && currentBatches[0].name === 'Lote Único') {
        currentBatches[0].name = 'Lote 1';
      }
      
      // Adiciona o novo lote com numeração sequencial
      const newBatch: LocalPriceBatch = {
        id: Date.now().toString(),
        name: `Lote ${currentBatches.length + 1}`,
        price: 0,
        start_date: '',
        end_date: ''
      };
      setPriceBatches([...currentBatches, newBatch]);
    }
  };

  const removePriceBatch = (id: string) => {
    const updatedBatches = priceBatches.filter(batch => batch.id !== id);
    
    // Se sobrou apenas um lote e não é "Lote Único", renomeia para "Lote Único"
    if (updatedBatches.length === 1 && updatedBatches[0].name !== 'Lote Único') {
      updatedBatches[0].name = 'Lote Único';
    }
    
    setPriceBatches(updatedBatches);
  };

  const updatePriceBatch = (id: string, field: keyof PriceBatch, value: any) => {
    setPriceBatches(priceBatches.map(batch => 
      batch.id === id ? { ...batch, [field]: value } : batch
    ));
  };

  const updateBatchPaymentMethodFee = (batchId: string, method: 'boleto' | 'credit_card' | 'pix_stripe' | 'pix_chave', fee: number) => {
    setPriceBatches(prev => prev.map(b => {
      if (b.id !== batchId) return b;
      const currentMethods = b.payment_methods || DEFAULT_PAYMENT_METHODS;
      const updated = currentMethods.map(pm => pm.method === method ? { ...pm, fee_percentage: fee } : pm);
      return { ...b, payment_methods: updated };
    }));
  };

  const toggleBatchPaymentMethod = (batchId: string, method: 'boleto' | 'credit_card', enabled: boolean) => {
    setPriceBatches(prev => prev.map(b => {
      if (b.id !== batchId) return b;
      const currentMethods = b.payment_methods || DEFAULT_PAYMENT_METHODS;
      const updated = currentMethods.map(pm => pm.method === method ? { ...pm, enabled } : pm);
      return { ...b, payment_methods: updated };
    }));
  };

  const setBatchPixOption = (batchId: string, option: 'none' | 'pix_stripe' | 'pix_chave') => {
    setPriceBatches(prev => prev.map(b => {
      if (b.id !== batchId) return b;
      const currentMethods = b.payment_methods || DEFAULT_PAYMENT_METHODS;
      const updated = currentMethods.map(pm => {
        if (pm.method === 'pix_stripe') return { ...pm, enabled: option === 'pix_stripe' };
        if (pm.method === 'pix_chave') return { ...pm, enabled: option === 'pix_chave' };
        return pm;
      });
      return { ...b, payment_methods: updated };
    }));
  };

  const toggleBatchCustomPaymentMethods = (batchId: string, enabled: boolean) => {
    setPriceBatches(prev => prev.map(b => {
      if (b.id !== batchId) return b;
      return {
        ...b,
        use_custom_payment_methods: enabled,
        payment_methods: enabled ? (b.payment_methods || paymentMethods || DEFAULT_PAYMENT_METHODS) : undefined
      };
    }));
  };

  const updatePaymentMethodFee = (method: 'boleto' | 'credit_card' | 'pix_stripe' | 'pix_chave', fee: number) => {
    setPaymentMethods(prev => prev.map(pm => pm.method === method ? { ...pm, fee_percentage: fee } : pm));
  };

  const togglePaymentMethod = (method: 'boleto' | 'credit_card', enabled: boolean) => {
    setPaymentMethods(prev => prev.map(pm => pm.method === method ? { ...pm, enabled } : pm));
  };

  const setPixOption = (option: 'none' | 'pix_stripe' | 'pix_chave') => {
    setPaymentMethods(prev => prev.map(pm => {
      if (pm.method === 'pix_stripe') {
        return { ...pm, enabled: option === 'pix_stripe' };
      }
      if (pm.method === 'pix_chave') {
        return { ...pm, enabled: option === 'pix_chave' };
      }
      return pm;
    }));
  };

  const handleQrCodeUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const qrUrl = reader.result as string;
      setPaymentMethods(prev => prev.map(pm => pm.method === 'pix_chave' ? { ...pm, qr_code_url: qrUrl } : pm));
    };
    reader.readAsDataURL(file);
  };

  const handleQrCodeRemove = () => {
    setPaymentMethods(prev => prev.map(pm => pm.method === 'pix_chave' ? { ...pm, qr_code_url: '' } : pm));
  };

  const updatePixKey = (key: string) => {
    setPaymentMethods(prev => prev.map(pm => pm.method === 'pix_chave' ? { ...pm, pix_key: key } : pm));
  };

  const updateCardMaxInstallments = (maxInstallments: number) => {
    setPaymentMethods(prev => prev.map(pm => pm.method === 'credit_card' ? { ...pm, max_installments: maxInstallments } : pm));
  };

  const toggleCheckoutField = (fieldName: string, enabled: boolean) => {
    if (fieldName === 'nome' || fieldName === 'whatsapp') return; // Campos fixos
    setCheckoutFields(prev => prev.map(f => {
      if (f.field === fieldName) {
        return {
          ...f,
          enabled,
          required: enabled ? f.required : false
        };
      }
      return f;
    }));
  };

  const toggleCheckoutFieldRequired = (fieldName: string, required: boolean) => {
    if (fieldName === 'nome' || fieldName === 'whatsapp') return; // Campos fixos
    setCheckoutFields(prev => prev.map(f => {
      if (f.field === fieldName) {
        return { ...f, required };
      }
      return f;
    }));
  };

  const handleDragStart = (index: number) => {
    setDraggedFieldIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedFieldIndex === null || draggedFieldIndex === index) return;
    
    // Reordenar a lista em tempo real
    setCheckoutFields(prev => {
      const items = [...prev];
      const [draggedItem] = items.splice(draggedFieldIndex, 1);
      items.splice(index, 0, draggedItem);
      return items;
    });
    setDraggedFieldIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedFieldIndex(null);
  };

  const moveField = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= checkoutFields.length) return;

    setCheckoutFields(prev => {
      const items = [...prev];
      const [item] = items.splice(index, 1);
      items.splice(targetIndex, 0, item);
      return items;
    });
  };

  const onSubmit = async (data: Event) => {
    try {
      const sanitizedPriceBatches = priceBatches.map(batch => {
        if (!batch.use_custom_payment_methods) {
          return {
            id: batch.id,
            name: batch.name,
            price: batch.price,
            quantity: batch.quantity,
            sold_quantity: batch.sold_quantity,
            start_date: batch.start_date,
            end_date: batch.end_date,
            use_custom_payment_methods: false,
            payment_methods: undefined
          };
        }
        return {
          id: batch.id,
          name: batch.name,
          price: batch.price,
          quantity: batch.quantity,
          sold_quantity: batch.sold_quantity,
          start_date: batch.start_date,
          end_date: batch.end_date,
          use_custom_payment_methods: true,
          payment_methods: batch.payment_methods || paymentMethods || DEFAULT_PAYMENT_METHODS
        };
      });

      const eventData: Partial<Event> = {
        ...data,
        price_batches: sanitizedPriceBatches as PriceBatch[],
        payment_methods: paymentMethods,
        checkout_fields: checkoutFields
      };
      await onSave(eventData);
    } catch (error) {
      console.error('Erro ao salvar evento:', error);
      toast.error('Erro ao salvar evento');
    }
  };

  const formatPhoneNumber = (value: string): string => {
    // Remove todos os caracteres não numéricos
    const numbers = value.replace(/\D/g, '');
    
    // Limita a 11 dígitos
    const limitedNumbers = numbers.slice(0, 11);
    
    // Aplica a máscara baseada no número de dígitos
    if (limitedNumbers.length <= 10) {
      // Formato para telefone fixo: (XX) XXXX-XXXX
      return limitedNumbers.replace(/(\d{2})(\d{4})(\d{0,4})/, (match, p1, p2, p3) => {
        if (p3) return `(${p1}) ${p2}-${p3}`;
        if (p2) return `(${p1}) ${p2}`;
        if (p1) return `(${p1}`;
        return match;
      });
    } else {
      // Formato para celular: (XX) XXXXX-XXXX
      return limitedNumbers.replace(/(\d{2})(\d{5})(\d{0,4})/, (match, p1, p2, p3) => {
        if (p3) return `(${p1}) ${p2}-${p3}`;
        if (p2) return `(${p1}) ${p2}`;
        if (p1) return `(${p1}`;
        return match;
      });
    }
  };

  const handleInputChange = (field: keyof Event, value: any) => {
    setValue(field, value, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
  };

  const handlePhoneChange = (value: string) => {
    const formattedPhone = formatPhoneNumber(value);
    handleInputChange('contact_phone', formattedPhone);
  };

  const handleImageUpload = async (file: File): Promise<string> => {
    // Simular upload de imagem - aqui você implementaria a lógica real de upload
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        const imageUrl = reader.result as string;
        setValue('image_url', imageUrl, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
        trigger();
        resolve(imageUrl);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleImageRemove = () => {
    setValue('image_url', '', { shouldValidate: true, shouldDirty: true, shouldTouch: true });
    trigger();
  };

  const handleVideoUpload = async (file: File): Promise<string> => {
    // Simular upload de vídeo - aqui você implementaria a lógica real de upload
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        const videoUrl = reader.result as string;
        const currentVideos = watch('videos') || [];
        setValue('videos', [...currentVideos, videoUrl], { shouldValidate: true, shouldDirty: true, shouldTouch: true });
        trigger();
        resolve(videoUrl);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleVideoRemove = () => {
    setValue('videos', [], { shouldValidate: true, shouldDirty: true, shouldTouch: true });
    trigger();
  };

  // Carregar tipos de eventos ativos ao montar o componente
  useEffect(() => {
    fetchEventTypes(true); // Buscar apenas tipos ativos
  }, []);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4">
      <div className="bg-white rounded-2xl max-w-5xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-gray-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <form id="event-form" onSubmit={handleSubmit(onSubmit)} className="flex flex-col h-full max-h-[92vh]">
          {/* Header fixo */}
          <div className="px-6 py-5 border-b border-gray-200 flex-shrink-0 bg-white flex justify-between items-center">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
                {event ? 'Editar Evento' : 'Novo Evento'}
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Configure os dados, pagamentos, checkout e mensagens de WhatsApp do evento
              </p>
            </div>
            <button
              type="button"
              onClick={onCancel}
              className="text-gray-400 hover:text-gray-600 p-2 rounded-xl hover:bg-gray-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navegação por Abas (Wrap Responsivo sem Barra de Rolagem) */}
          <div className="border-b border-gray-200 bg-slate-50/80 px-4 sm:px-6 py-2.5 flex-shrink-0">
            <nav className="flex flex-wrap items-center gap-1.5 sm:gap-2" aria-label="Tabs">
              {[
                {
                  id: 'details',
                  name: 'Dados Evento',
                  icon: Calendar,
                  hasError: !!(errors.title || errors.description || errors.event_date || errors.event_time || errors.location)
                },
                {
                  id: 'tickets',
                  name: 'Lotes de Ingressos',
                  icon: Ticket,
                  hasError: false
                },
                {
                  id: 'media',
                  name: 'Mídias',
                  icon: ImageIcon,
                  hasError: false
                },
                {
                  id: 'payments',
                  name: 'Formas Pagamento',
                  icon: CreditCard,
                  hasError: false
                },
                {
                  id: 'checkout',
                  name: 'Formulário Comprador',
                  icon: UserCheck,
                  hasError: false
                },
                {
                  id: 'whatsapp',
                  name: 'Mensagens WhatsApp',
                  icon: MessageSquare,
                  hasError: false
                },
                {
                  id: 'email',
                  name: 'Mensagens E-mail',
                  icon: Mail,
                  hasError: false
                }
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id as EventFormTab)}
                    className={`py-2 px-3 sm:px-3.5 rounded-xl font-medium text-xs sm:text-sm flex items-center gap-1.5 sm:gap-2 transition-all cursor-pointer select-none ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-xs font-semibold'
                        : 'bg-white text-gray-600 hover:text-gray-900 hover:bg-gray-100 border border-gray-200/80'
                    }`}
                  >
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-gray-500'}`} />
                    <span>{tab.name}</span>
                    {tab.hasError && (
                      <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" title="Campos obrigatórios pendentes nesta aba" />
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Conteúdo scrollável */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 min-h-0 bg-slate-50/30">

            {/* ABA 1: DADOS DO EVENTO (Layout em Uma Coluna) */}
            {activeTab === 'details' && (
              <div className="max-w-4xl mx-auto space-y-6">
                {/* 1. Informações Básicas */}
                <div className="bg-white p-5 sm:p-6 rounded-2xl border border-gray-200/80 shadow-2xs space-y-4">
                  <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2 border-b border-gray-100 pb-3">
                    <Info className="w-4 h-4 text-blue-600" />
                    Informações Básicas
                  </h3>

                  {/* Nome do Evento */}
                  <div>
                    <label htmlFor="title" className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                      Nome do Evento *
                    </label>
                    <input
                      {...register('title', { required: 'Nome do evento é obrigatório' })}
                      type="text"
                      id="title"
                      className={`w-full px-4 py-2.5 border rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                        errors.title ? 'border-red-500 bg-red-50' : 'border-gray-300'
                      }`}
                      placeholder="Digite o nome do evento"
                      disabled={isSubmitting}
                    />
                    {errors.title && (
                      <div className="flex items-center gap-1 mt-1 text-red-600">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span className="text-xs">{errors.title.message}</span>
                      </div>
                    )}
                  </div>

                  {/* Descrição */}
                  <div>
                    <label htmlFor="description" className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                      Descrição do Evento *
                    </label>
                    <textarea
                      {...register('description', { required: 'Descrição é obrigatória' })}
                      id="description"
                      rows={4}
                      className={`w-full px-4 py-2.5 border rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors resize-none ${
                        errors.description ? 'border-red-500 bg-red-50' : 'border-gray-300'
                      }`}
                      placeholder="Descrição detalhada do evento"
                      disabled={isSubmitting}
                    />
                    {errors.description && (
                      <div className="flex items-center gap-1 mt-1 text-red-600">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span className="text-xs">{errors.description.message}</span>
                      </div>
                    )}
                  </div>

                  {/* Tipo Evento */}
                  <div>
                    <label htmlFor="event_type_id" className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                      Tipo de Evento
                    </label>
                    <select
                      {...register('event_type_id')}
                      id="event_type_id"
                      value={watch('event_type_id') || watch('event_type') || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        setValue('event_type_id', val, { shouldValidate: true, shouldDirty: true });
                        setValue('event_type', val, { shouldValidate: true, shouldDirty: true });
                        trigger();
                      }}
                      className={`w-full px-4 py-2.5 border rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                        errors.event_type_id ? 'border-red-500 bg-red-50' : 'border-gray-300'
                      }`}
                      disabled={isSubmitting}
                    >
                      <option value="">Selecione um tipo de evento</option>
                      {eventTypes.map((eventType) => (
                        <option key={eventType.id} value={eventType.id}>
                          {eventType.name}
                        </option>
                      ))}
                    </select>
                    {errors.event_type_id && (
                      <div className="flex items-center gap-1 mt-1 text-red-600">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span className="text-xs">{errors.event_type_id.message}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* 2. Data e Horário */}
                <div className="bg-white p-5 sm:p-6 rounded-2xl border border-gray-200/80 shadow-2xs space-y-4">
                  <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2 border-b border-gray-100 pb-3">
                    <Calendar className="w-4 h-4 text-blue-600" />
                    Data e Horário
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Data de Início */}
                    <div>
                      <label htmlFor="event_date" className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                        Data de Início *
                      </label>
                      <input
                        {...register('event_date', { required: 'Data de início é obrigatória' })}
                        type="date"
                        id="event_date"
                        className={`w-full px-3.5 py-2.5 border rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                          errors.event_date ? 'border-red-500 bg-red-50' : 'border-gray-300'
                        }`}
                        disabled={isSubmitting}
                      />
                      {errors.event_date && (
                        <div className="flex items-center gap-1 mt-1 text-red-600">
                          <AlertCircle className="w-3.5 h-3.5" />
                          <span className="text-xs">{errors.event_date.message}</span>
                        </div>
                      )}
                    </div>

                    {/* Horário de Início */}
                    <div>
                      <label htmlFor="event_time" className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                        Horário de Início *
                      </label>
                      <input
                        {...register('event_time', { required: 'Horário de início é obrigatório' })}
                        type="time"
                        id="event_time"
                        className={`w-full px-3.5 py-2.5 border rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                          errors.event_time ? 'border-red-500 bg-red-50' : 'border-gray-300'
                        }`}
                        disabled={isSubmitting}
                      />
                      {errors.event_time && (
                        <div className="flex items-center gap-1 mt-1 text-red-600">
                          <AlertCircle className="w-3.5 h-3.5" />
                          <span className="text-xs">{errors.event_time.message}</span>
                        </div>
                      )}
                    </div>

                    {/* Data de Término */}
                    <div>
                      <label htmlFor="end_date" className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                        Data de Término
                      </label>
                      <input
                        {...register('end_date')}
                        type="date"
                        id="end_date"
                        className={`w-full px-3.5 py-2.5 border rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                          errors.end_date ? 'border-red-500 bg-red-50' : 'border-gray-300'
                        }`}
                        disabled={isSubmitting}
                      />
                    </div>

                    {/* Horário de Término */}
                    <div>
                      <label htmlFor="end_time" className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                        Horário de Término
                      </label>
                      <input
                        {...register('end_time')}
                        type="time"
                        id="end_time"
                        className={`w-full px-3.5 py-2.5 border rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                          errors.end_time ? 'border-red-500 bg-red-50' : 'border-gray-300'
                        }`}
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>
                </div>

                {/* 3. Localização */}
                <div className="bg-white p-5 sm:p-6 rounded-2xl border border-gray-200/80 shadow-2xs space-y-4">
                  <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2 border-b border-gray-100 pb-3">
                    <MapPin className="w-4 h-4 text-blue-600" />
                    Localização
                  </h3>

                  <div>
                    <label htmlFor="location" className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                      Endereço / Local *
                    </label>
                    <input
                      {...register('location', { required: 'Local é obrigatório' })}
                      type="text"
                      id="location"
                      className={`w-full px-4 py-2.5 border rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                        errors.location ? 'border-red-500 bg-red-50' : 'border-gray-300'
                      }`}
                      placeholder="Endereço completo do evento"
                      disabled={isSubmitting}
                    />
                    {errors.location && (
                      <div className="flex items-center gap-1 mt-1 text-red-600">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span className="text-xs">{errors.location.message}</span>
                      </div>
                    )}
                  </div>

                  <div>
                    <label htmlFor="location_link" className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                      Link do Local (Google Maps, Waze, etc.)
                    </label>
                    <input
                      {...register('location_link')}
                      type="url"
                      id="location_link"
                      className={`w-full px-4 py-2.5 border rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                        errors.location_link ? 'border-red-500 bg-red-50' : 'border-gray-300'
                      }`}
                      placeholder="https://maps.google.com/..."
                      disabled={isSubmitting}
                    />
                  </div>
                </div>

                {/* 4. Capacidade & Participantes */}
                <div className="bg-white p-5 sm:p-6 rounded-2xl border border-gray-200/80 shadow-2xs space-y-4">
                  <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2 border-b border-gray-100 pb-3">
                    <Users className="w-4 h-4 text-blue-600" />
                    Capacidade de Participantes
                  </h3>

                  <div>
                    <label htmlFor="max_guests" className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                      Máximo de Participantes (0 = Ilimitado)
                    </label>
                    <input
                      {...register('max_guests', { valueAsNumber: true })}
                      type="number"
                      id="max_guests"
                      min="0"
                      className={`w-full px-4 py-2.5 border rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                        errors.max_guests ? 'border-red-500 bg-red-50' : 'border-gray-300'
                      }`}
                      placeholder="0 = ilimitado"
                      disabled={isSubmitting}
                    />
                  </div>
                </div>

                {/* 5. Status & Visibilidade */}
                <div className="bg-white p-5 sm:p-6 rounded-2xl border border-gray-200/80 shadow-2xs space-y-4">
                  <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2 border-b border-gray-100 pb-3">
                    <Tag className="w-4 h-4 text-blue-600" />
                    Status e Visibilidade
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="status" className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                        Status do Evento
                      </label>
                      <select
                        {...register('status')}
                        id="status"
                        className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                        disabled={isSubmitting}
                      >
                        <option value="draft">Rascunho</option>
                        <option value="active">Ativo</option>
                        <option value="cancelled">Cancelado</option>
                        <option value="completed">Finalizado</option>
                      </select>
                    </div>

                    <div className="flex flex-col justify-center space-y-2 pt-2">
                      <label className="flex items-center gap-2.5 cursor-pointer">
                        <input
                          {...register('is_public')}
                          type="checkbox"
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          disabled={isSubmitting}
                        />
                        <span className="text-xs font-medium text-gray-700">
                          Evento público (visível no site)
                        </span>
                      </label>

                      <label className="flex items-center gap-2.5 cursor-pointer">
                        <input
                          {...register('requires_approval')}
                          type="checkbox"
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          disabled={isSubmitting}
                        />
                        <span className="text-xs font-medium text-gray-700">
                          Requer aprovação de cadastro
                        </span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* 6. Contato & Informações Extras */}
                <div className="bg-white p-5 sm:p-6 rounded-2xl border border-gray-200/80 shadow-2xs space-y-4">
                  <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2 border-b border-gray-100 pb-3">
                    <Mail className="w-4 h-4 text-blue-600" />
                    Contato e Informações Extras
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="contact_email" className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                        Email de Contato
                      </label>
                      <input
                        {...register('contact_email')}
                        type="email"
                        id="contact_email"
                        className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500"
                        placeholder="contato@exemplo.com"
                        disabled={isSubmitting}
                      />
                    </div>

                    <div>
                      <label htmlFor="contact_phone" className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                        Telefone de Contato
                      </label>
                      <PhoneInput
                        value={watch('contact_phone')}
                        onChange={(value) => setValue('contact_phone', value, { shouldDirty: true })}
                        placeholder="(11) 99999-9999"
                        error={!!errors.contact_phone}
                        disabled={isSubmitting}
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label htmlFor="additional_info" className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                        Informações Extras
                      </label>
                      <textarea
                        {...register('additional_info')}
                        id="additional_info"
                        rows={3}
                        className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 resize-none"
                        placeholder="Regras, observações, dress code, etc."
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ABA 2: LOTES DE INGRESSOS (Nova Aba Dedicada) */}
            {activeTab === 'tickets' && (
              <div className="max-w-4xl mx-auto space-y-6">
                <div className="bg-white p-5 sm:p-6 rounded-2xl border border-gray-200/80 shadow-2xs space-y-5">
                  <div className="flex items-center justify-between border-b border-gray-100 pb-4 flex-wrap gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                        <Ticket className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-gray-900">
                          Lotes de Ingressos
                        </h3>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Cadastre os lotes, preços, vigência, limites e formas de pagamento aceitas
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={addPriceBatch}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-xs hover:shadow-md transition-all cursor-pointer"
                      disabled={isSubmitting}
                    >
                      <Plus className="w-4 h-4" />
                      Adicionar Lote
                    </button>
                  </div>

                  {/* Lista de Lotes */}
                  <div className="space-y-4">
                    {priceBatches.map((batch) => (
                      <div
                        key={batch.id}
                        className="p-4 sm:p-5 border border-gray-200 rounded-2xl bg-white hover:border-indigo-300 transition-all shadow-2xs space-y-4"
                      >
                        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                          <div className="flex items-center gap-2 flex-1 mr-3">
                            <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 shrink-0" />
                            <input
                              type="text"
                              value={batch.name}
                              onChange={(e) => updatePriceBatch(batch.id, 'name', e.target.value)}
                              className="font-bold text-sm text-gray-900 px-2.5 py-1 border border-gray-200 rounded-lg hover:border-gray-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 w-full max-w-xs"
                              placeholder="Nome do Lote (Ex: Lote 1, Pré-Venda)"
                              disabled={isSubmitting}
                            />
                          </div>
                          {priceBatches.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removePriceBatch(batch.id)}
                              className="text-red-500 hover:text-red-700 p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                              title="Remover este lote"
                              disabled={isSubmitting}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                          {/* Preço */}
                          <div>
                            <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-wider mb-1">
                              Valor (R$) *
                            </label>
                            <div className="relative">
                              <span className="absolute left-3 top-2.5 text-xs text-gray-500 font-semibold">R$</span>
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={batch.price}
                                onChange={(e) => updatePriceBatch(batch.id, 'price', parseFloat(e.target.value) || 0)}
                                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-xl text-sm font-bold text-gray-900 bg-white focus:ring-2 focus:ring-indigo-500"
                                placeholder="0,00"
                                disabled={isSubmitting}
                              />
                            </div>
                          </div>

                          {/* Quantidade Limite */}
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-wider">
                                Quantidade (Limite)
                              </label>
                            </div>
                            <input
                              type="number"
                              min="0"
                              step="1"
                              value={batch.quantity !== undefined && batch.quantity !== null && batch.quantity > 0 ? batch.quantity : ''}
                              onChange={(e) => {
                                const val = e.target.value === '' ? undefined : parseInt(e.target.value, 10);
                                updatePriceBatch(batch.id, 'quantity', isNaN(val as number) ? undefined : val);
                              }}
                              className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm font-semibold bg-white focus:ring-2 focus:ring-indigo-500"
                              placeholder="Ilimitado"
                              disabled={isSubmitting}
                            />
                            {Boolean(batch.sold_quantity && batch.sold_quantity > 0) && (
                              <span className="text-[10px] font-bold text-indigo-700 mt-1 block">
                                {batch.sold_quantity} {batch.sold_quantity === 1 ? 'ingresso vendido' : 'ingressos vendidos'}
                              </span>
                            )}
                          </div>

                          {/* Início Vigência */}
                          <div>
                            <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-wider mb-1">
                              Início da Vigência
                            </label>
                            <input
                              type="datetime-local"
                              value={batch.start_date}
                              onChange={(e) => updatePriceBatch(batch.id, 'start_date', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs bg-white focus:ring-2 focus:ring-indigo-500"
                              disabled={isSubmitting}
                            />
                          </div>

                          {/* Fim Vigência */}
                          <div>
                            <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-wider mb-1">
                              Fim da Vigência
                            </label>
                            <input
                              type="datetime-local"
                              value={batch.end_date || ''}
                              onChange={(e) => updatePriceBatch(batch.id, 'end_date', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs bg-white focus:ring-2 focus:ring-indigo-500"
                              disabled={isSubmitting}
                            />
                          </div>
                        </div>

                        {/* Formas de Pagamento Específicas deste Lote */}
                        <div className="pt-3 border-t border-gray-100">
                          <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-gray-200/80">
                            <div className="flex items-center gap-2">
                              <CreditCard className="w-4 h-4 text-indigo-600" />
                              <div>
                                <span className="text-xs font-bold text-gray-900 block">
                                  Personalizar Formas de Pagamento deste Lote
                                </span>
                                <span className="text-[11px] text-gray-500">
                                  Defina métodos exclusivos (ex: apenas Pix com 0% de taxa na Pré-Venda)
                                </span>
                              </div>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer ml-3">
                              <input
                                type="checkbox"
                                checked={Boolean(batch.use_custom_payment_methods)}
                                onChange={(e) => toggleBatchCustomPaymentMethods(batch.id, e.target.checked)}
                                className="sr-only peer"
                                disabled={isSubmitting}
                              />
                              <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                            </label>
                          </div>

                          {Boolean(batch.use_custom_payment_methods) ? (
                            <div className="mt-3 p-3.5 bg-indigo-50/40 rounded-xl border border-indigo-100 space-y-3 animate-in fade-in">
                              <p className="text-xs text-indigo-950 font-medium">
                                Formas de pagamento e taxas de conveniência aceitas no <strong>{batch.name}</strong>:
                              </p>

                              {/* Pix do Lote */}
                              {(() => {
                                const batchMethods = batch.payment_methods || paymentMethods || DEFAULT_PAYMENT_METHODS;
                                const pixStripe = batchMethods.find(pm => pm.method === 'pix_stripe');
                                const pixChave = batchMethods.find(pm => pm.method === 'pix_chave');
                                const activePix = pixStripe?.enabled ? 'pix_stripe' : pixChave?.enabled ? 'pix_chave' : 'none';

                                return (
                                  <div className="p-3 bg-white rounded-xl border border-gray-200 flex items-center justify-between flex-wrap gap-2 shadow-2xs">
                                    <span className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                                      <QrCode className="w-4 h-4 text-emerald-600" /> Pix:
                                    </span>
                                    <div className="flex items-center gap-2">
                                      <select
                                        value={activePix}
                                        onChange={(e) => setBatchPixOption(batch.id, e.target.value as any)}
                                        className="px-2.5 py-1.5 text-xs font-semibold border border-gray-300 rounded-lg bg-white"
                                        disabled={isSubmitting}
                                      >
                                        <option value="none">Desabilitado</option>
                                        <option value="pix_stripe">Pix (Online)</option>
                                        <option value="pix_chave">Pix Chave / Próprio</option>
                                      </select>
                                      {activePix !== 'none' && (
                                        <div className="flex items-center gap-1">
                                          <span className="text-xs text-gray-500">Taxa:</span>
                                          <input
                                            type="number"
                                            min="0"
                                            max="100"
                                            step="0.1"
                                            value={activePix === 'pix_stripe' ? (pixStripe?.fee_percentage ?? 0) : (pixChave?.fee_percentage ?? 0)}
                                            onChange={(e) => updateBatchPaymentMethodFee(batch.id, activePix, parseFloat(e.target.value) || 0)}
                                            className="w-16 px-2 py-1 text-xs text-right font-bold border border-gray-300 rounded-lg bg-white"
                                            disabled={isSubmitting}
                                          />
                                          <span className="text-xs text-gray-400">%</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );
                              })()}

                              {/* Cartão de Crédito do Lote */}
                              {(() => {
                                const batchMethods = batch.payment_methods || paymentMethods || DEFAULT_PAYMENT_METHODS;
                                const card = batchMethods.find(pm => pm.method === 'credit_card') || { method: 'credit_card', label: 'Cartão de Crédito', enabled: false, fee_percentage: 0 };

                                return (
                                  <div className="p-3 bg-white rounded-xl border border-gray-200 flex items-center justify-between flex-wrap gap-2 shadow-2xs">
                                    <label className="flex items-center gap-2 cursor-pointer select-none">
                                      <input
                                        type="checkbox"
                                        checked={card.enabled}
                                        onChange={(e) => toggleBatchPaymentMethod(batch.id, 'credit_card', e.target.checked)}
                                        className="w-4 h-4 text-indigo-600 rounded"
                                        disabled={isSubmitting}
                                      />
                                      <span className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                                        <CreditCard className="w-4 h-4 text-blue-600" /> Cartão de Crédito
                                      </span>
                                    </label>
                                    {card.enabled && (
                                      <div className="flex items-center gap-1.5">
                                        <span className="text-xs text-gray-500">Taxa:</span>
                                        <input
                                          type="number"
                                          min="0"
                                          max="100"
                                          step="0.1"
                                          value={card.fee_percentage ?? 0}
                                          onChange={(e) => updateBatchPaymentMethodFee(batch.id, 'credit_card', parseFloat(e.target.value) || 0)}
                                          className="w-16 px-2 py-1 text-xs text-right font-bold border border-gray-300 rounded-lg bg-white"
                                          disabled={isSubmitting}
                                        />
                                        <span className="text-xs text-gray-400">%</span>
                                      </div>
                                    )}
                                  </div>
                                );
                              })()}

                              {/* Boleto Bancário do Lote */}
                              {(() => {
                                const batchMethods = batch.payment_methods || paymentMethods || DEFAULT_PAYMENT_METHODS;
                                const boleto = batchMethods.find(pm => pm.method === 'boleto') || { method: 'boleto', label: 'Boleto Bancário', enabled: false, fee_percentage: 0 };

                                return (
                                  <div className="p-3 bg-white rounded-xl border border-gray-200 flex items-center justify-between flex-wrap gap-2 shadow-2xs">
                                    <label className="flex items-center gap-2 cursor-pointer select-none">
                                      <input
                                        type="checkbox"
                                        checked={boleto.enabled}
                                        onChange={(e) => toggleBatchPaymentMethod(batch.id, 'boleto', e.target.checked)}
                                        className="w-4 h-4 text-indigo-600 rounded"
                                        disabled={isSubmitting}
                                      />
                                      <span className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                                        <FileText className="w-4 h-4 text-amber-600" /> Boleto Bancário
                                      </span>
                                    </label>
                                    {boleto.enabled && (
                                      <div className="flex items-center gap-1.5">
                                        <span className="text-xs text-gray-500">Taxa:</span>
                                        <input
                                          type="number"
                                          min="0"
                                          max="100"
                                          step="0.1"
                                          value={boleto.fee_percentage ?? 0}
                                          onChange={(e) => updateBatchPaymentMethodFee(batch.id, 'boleto', parseFloat(e.target.value) || 0)}
                                          className="w-16 px-2 py-1 text-xs text-right font-bold border border-gray-300 rounded-lg bg-white"
                                          disabled={isSubmitting}
                                        />
                                        <span className="text-xs text-gray-400">%</span>
                                      </div>
                                    )}
                                  </div>
                                );
                              })()}
                            </div>
                          ) : (
                            <p className="text-[11px] text-gray-500 mt-2 pl-1 font-medium">
                              ✨ Utilizando as formas de pagamento e taxas padrão configuradas na aba "Formas Pagamento e Taxas".
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {priceBatches.length === 0 && (
                    <div className="text-center py-10 text-gray-400 bg-slate-50 rounded-2xl border border-dashed border-gray-300 space-y-3">
                      <Ticket className="w-10 h-10 mx-auto text-gray-300" />
                      <div>
                        <p className="text-sm font-semibold text-gray-700">Nenhum lote de ingresso adicionado</p>
                        <p className="text-xs text-gray-400 mt-0.5">Clique no botão acima para cadastrar o primeiro lote de ingressos do evento</p>
                      </div>
                      <button
                        type="button"
                        onClick={addPriceBatch}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-all cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                        Adicionar Primeiro Lote
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ABA 2: MÍDIAS DO EVENTO */}
            {activeTab === 'media' && (
              <div className="max-w-4xl mx-auto space-y-6">
                <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs space-y-5">
                  <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                      <ImageIcon className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-gray-900">
                        Mídia do Evento (Imagens e Vídeos)
                      </h3>
                      <p className="text-xs text-gray-500">
                        Faça o upload do banner principal e vídeos promocionais que serão exibidos na página do evento
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <ImageIcon className="w-3.5 h-3.5 text-gray-400" />
                        IMAGEM PRINCIPAL DE CAPA
                      </label>
                      <ImageUpload
                        onImageUpload={handleImageUpload}
                        currentImage={watch('image_url')}
                        onImageRemove={handleImageRemove}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <Video className="w-3.5 h-3.5 text-gray-400" />
                        VÍDEOS PROMOCIONAIS DO EVENTO
                      </label>
                      <VideoUpload
                        onVideoUpload={handleVideoUpload}
                        currentVideo={watch('videos')?.[0]}
                        onVideoRemove={handleVideoRemove}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ABA 3: FORMAS DE PAGAMENTO E TAXAS */}
            {activeTab === 'payments' && (
              <div className="max-w-3xl mx-auto space-y-6">
                <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs space-y-5">
                  <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center">
                      <CreditCard className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-gray-900">
                        Formas de Pagamento e Taxas de Conveniência
                      </h3>
                      <p className="text-xs text-gray-500">
                        Defina quais métodos de pagamento serão aceitos e a taxa percentual repassada ao comprador
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {/* Boleto Bancário */}
                    {(() => {
                      const boleto = paymentMethods.find(pm => pm.method === 'boleto') || { method: 'boleto', label: 'Boleto Bancário', enabled: false, fee_percentage: 0 };
                      return (
                        <div className={`p-4 rounded-xl border transition-all ${boleto.enabled ? 'bg-indigo-50/20 border-indigo-200 shadow-2xs' : 'bg-gray-50/70 border-gray-200 opacity-80'}`}>
                          <div className="flex items-center justify-between">
                            <label className="flex items-center gap-3 cursor-pointer select-none">
                              <input
                                type="checkbox"
                                checked={boleto.enabled}
                                onChange={(e) => togglePaymentMethod('boleto', e.target.checked)}
                                disabled={isSubmitting}
                                className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                              />
                              <div className="flex items-center gap-2">
                                <FileText className="w-4 h-4 text-gray-600" />
                                <span className="text-sm font-semibold text-gray-800">Boleto Bancário</span>
                              </div>
                            </label>
                            {boleto.enabled && (
                              <div className="flex items-center gap-2">
                                <label className="text-xs text-gray-500 font-medium">Taxa:</label>
                                <div className="relative w-24">
                                  <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    step="0.1"
                                    value={boleto.fee_percentage || ''}
                                    onChange={(e) => updatePaymentMethodFee('boleto', parseFloat(e.target.value) || 0)}
                                    placeholder="0.0"
                                    disabled={isSubmitting}
                                    className="w-full pl-2 pr-6 py-1.5 text-xs font-semibold border border-gray-300 rounded-lg focus:ring-1 focus:ring-indigo-500 text-right bg-white"
                                  />
                                  <span className="absolute right-2 top-2 text-xs text-gray-400 font-bold">%</span>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })()}

                    {/* Cartão de Crédito */}
                    {(() => {
                      const card = paymentMethods.find(pm => pm.method === 'credit_card') || { method: 'credit_card', label: 'Cartão de Crédito', enabled: false, fee_percentage: 0 };
                      return (
                        <div className={`p-4 rounded-xl border transition-all ${card.enabled ? 'bg-indigo-50/20 border-indigo-200 shadow-2xs' : 'bg-gray-50/70 border-gray-200 opacity-80'}`}>
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                            <label className="flex items-center gap-3 cursor-pointer select-none">
                              <input
                                type="checkbox"
                                checked={card.enabled}
                                onChange={(e) => togglePaymentMethod('credit_card', e.target.checked)}
                                disabled={isSubmitting}
                                className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                              />
                              <div className="flex items-center gap-2">
                                <CreditCard className="w-4 h-4 text-gray-600" />
                                <span className="text-sm font-semibold text-gray-800">Cartão de Crédito</span>
                              </div>
                            </label>
                            {card.enabled && (
                              <div className="flex flex-wrap items-center gap-3 pl-7 sm:pl-0">
                                <div className="flex items-center gap-2">
                                  <label className="text-xs text-gray-500 font-medium">Taxa:</label>
                                  <div className="relative w-24">
                                    <input
                                      type="number"
                                      min="0"
                                      max="100"
                                      step="0.1"
                                      value={card.fee_percentage || ''}
                                      onChange={(e) => updatePaymentMethodFee('credit_card', parseFloat(e.target.value) || 0)}
                                      placeholder="0.0"
                                      disabled={isSubmitting}
                                      className="w-full pl-2 pr-6 py-1.5 text-xs font-semibold border border-gray-300 rounded-lg focus:ring-1 focus:ring-indigo-500 text-right bg-white"
                                    />
                                    <span className="absolute right-2 top-2 text-xs text-gray-400 font-bold">%</span>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2">
                                  <label className="text-xs text-gray-500 font-medium">Máx. Parcelas:</label>
                                  <select
                                    value={card.max_installments || 12}
                                    onChange={(e) => updateCardMaxInstallments(Number(e.target.value))}
                                    disabled={isSubmitting}
                                    className="px-2.5 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-1 focus:ring-indigo-500 bg-white font-medium text-gray-700"
                                  >
                                    <option value={1}>1x (À vista)</option>
                                    <option value={2}>Até 2x</option>
                                    <option value={3}>Até 3x</option>
                                    <option value={4}>Até 4x</option>
                                    <option value={5}>Até 5x</option>
                                    <option value={6}>Até 6x</option>
                                    <option value={10}>Até 10x</option>
                                    <option value={12}>Até 12x</option>
                                  </select>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })()}

                    {/* Pix Options */}
                    {(() => {
                      const pixStripe = paymentMethods.find(pm => pm.method === 'pix_stripe');
                      const pixChave = paymentMethods.find(pm => pm.method === 'pix_chave');
                      const activePix = pixStripe?.enabled ? 'pix_stripe' : pixChave?.enabled ? 'pix_chave' : 'none';

                      return (
                        <div className="p-4 rounded-xl border border-gray-200 bg-white space-y-4 shadow-2xs">
                          <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                            <QrCode className="w-4 h-4 text-emerald-600" />
                            <span className="text-sm font-semibold text-gray-800">Opções de Pagamento via Pix</span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                            <label className={`flex items-center gap-2.5 p-3 rounded-xl border text-xs cursor-pointer transition-colors ${activePix === 'none' ? 'border-gray-400 bg-gray-100 text-gray-800 font-semibold' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                              <input
                                type="radio"
                                name="pix_option"
                                checked={activePix === 'none'}
                                onChange={() => setPixOption('none')}
                                disabled={isSubmitting}
                                className="text-emerald-600 focus:ring-emerald-500"
                              />
                              <span>Desabilitado</span>
                            </label>

                            <label className={`flex items-center gap-2.5 p-3 rounded-xl border text-xs cursor-pointer transition-colors ${activePix === 'pix_stripe' ? 'border-emerald-500 bg-emerald-50 text-emerald-900 font-semibold' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                              <input
                                type="radio"
                                name="pix_option"
                                checked={activePix === 'pix_stripe'}
                                onChange={() => setPixOption('pix_stripe')}
                                disabled={isSubmitting}
                                className="text-emerald-600 focus:ring-emerald-500"
                              />
                              <span>Pix (Online / Gateway)</span>
                            </label>

                            <label className={`flex items-center gap-2.5 p-3 rounded-xl border text-xs cursor-pointer transition-colors ${activePix === 'pix_chave' ? 'border-emerald-500 bg-emerald-50 text-emerald-900 font-semibold' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                              <input
                                type="radio"
                                name="pix_option"
                                checked={activePix === 'pix_chave'}
                                onChange={() => setPixOption('pix_chave')}
                                disabled={isSubmitting}
                                className="text-emerald-600 focus:ring-emerald-500"
                              />
                              <span>Pix Chave / QR Próprio</span>
                            </label>
                          </div>

                          {/* Se Pix Online estiver ativo */}
                          {activePix === 'pix_stripe' && (
                            <div className="pt-2 flex items-center justify-between bg-emerald-50/50 p-3 rounded-xl border border-emerald-100">
                              <span className="text-xs text-emerald-800">
                                Pagamento Pix automático processado online no checkout.
                              </span>
                              <div className="flex items-center gap-2">
                                <label className="text-xs text-gray-600 font-medium">Taxa:</label>
                                <div className="relative w-24">
                                  <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    step="0.1"
                                    value={pixStripe?.fee_percentage || ''}
                                    onChange={(e) => updatePaymentMethodFee('pix_stripe', parseFloat(e.target.value) || 0)}
                                    placeholder="0.0"
                                    disabled={isSubmitting}
                                    className="w-full pl-2 pr-6 py-1.5 text-xs font-semibold border border-gray-300 rounded-lg focus:ring-1 focus:ring-emerald-500 text-right bg-white"
                                  />
                                  <span className="absolute right-2 top-2 text-xs text-gray-400 font-bold">%</span>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Se Pix Chave estiver ativo */}
                          {activePix === 'pix_chave' && (
                            <div className="pt-2 space-y-4 bg-emerald-50/40 p-4 rounded-xl border border-emerald-100">
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-gray-700 font-semibold">
                                  Taxa de conveniência Pix Chave:
                                </span>
                                <div className="flex items-center gap-2">
                                  <label className="text-xs text-gray-600 font-medium">Taxa:</label>
                                  <div className="relative w-24">
                                    <input
                                      type="number"
                                      min="0"
                                      max="100"
                                      step="0.1"
                                      value={pixChave?.fee_percentage || ''}
                                      onChange={(e) => updatePaymentMethodFee('pix_chave', parseFloat(e.target.value) || 0)}
                                      placeholder="0.0"
                                      disabled={isSubmitting}
                                      className="w-full pl-2 pr-6 py-1.5 text-xs font-semibold border border-gray-300 rounded-lg focus:ring-1 focus:ring-emerald-500 text-right bg-white"
                                    />
                                    <span className="absolute right-2 top-2 text-xs text-gray-400 font-bold">%</span>
                                  </div>
                                </div>
                              </div>

                              {/* Upload de QR Code próprio */}
                              <div className="border-t border-emerald-100/80 pt-3">
                                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                                  QR Code do Pix (Imagem) *
                                </label>
                                {pixChave?.qr_code_url ? (
                                  <div className="flex items-center gap-4 bg-white p-3 rounded-xl border border-gray-200">
                                    <img
                                      src={pixChave.qr_code_url}
                                      alt="QR Code Pix"
                                      className="w-20 h-20 object-contain rounded-lg border border-gray-100 p-1 bg-white"
                                    />
                                    <div className="flex-1 space-y-1">
                                      <p className="text-xs font-semibold text-gray-800">QR Code carregado</p>
                                      <p className="text-xs text-gray-500">Este QR Code será exibido ao comprador na conclusão do pedido.</p>
                                      <button
                                        type="button"
                                        onClick={handleQrCodeRemove}
                                        disabled={isSubmitting}
                                        className="text-xs text-red-600 hover:text-red-800 font-medium inline-flex items-center gap-1 mt-1 cursor-pointer"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                        Remover QR Code
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <label className="border-2 border-dashed border-emerald-300 hover:border-emerald-500 bg-white rounded-xl p-5 flex flex-col items-center justify-center cursor-pointer transition-colors group">
                                    <QrCode className="w-8 h-8 text-emerald-500 mb-1.5 group-hover:scale-105 transition-transform" />
                                    <span className="text-xs font-semibold text-gray-700">Clique para enviar a imagem do QR Code</span>
                                    <span className="text-[11px] text-gray-400 mt-0.5">PNG, JPG ou WEBP</span>
                                    <input
                                      type="file"
                                      accept="image/*"
                                      className="hidden"
                                      disabled={isSubmitting}
                                      onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) handleQrCodeUpload(file);
                                      }}
                                    />
                                  </label>
                                )}
                              </div>

                              {/* Campo de Chave Pix / Copia e Cola */}
                              <div className="border-t border-emerald-100/80 pt-3">
                                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                                  Chave Pix ou Código Copia e Cola (opcional)
                                </label>
                                <input
                                  type="text"
                                  value={pixChave?.pix_key || ''}
                                  onChange={(e) => updatePixKey(e.target.value)}
                                  disabled={isSubmitting}
                                  placeholder="Ex: financeiro@betternow.com.br ou 00020126580014br.gov.bcb.pix..."
                                  className="w-full px-3.5 py-2 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-colors bg-white font-mono"
                                />
                                <p className="text-[11px] text-gray-500 mt-1">
                                  Permite ao comprador copiar a chave com um clique pelo botão "Copiar código do QR Code".
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>
            )}

            {/* ABA 3: FORMULÁRIO COMPRADOR (CHECKOUT) */}
            {activeTab === 'checkout' && (
              <div className="max-w-3xl mx-auto space-y-6">
                <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs space-y-5">
                  <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center">
                        <UserCheck className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-gray-900">
                          Dados do Comprador no Checkout
                        </h3>
                        <p className="text-xs text-gray-500">
                          Selecione os dados que o comprador preencherá e <strong>arraste os campos</strong> para definir a ordem de exibição
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-2xs">
                    <div className="grid grid-cols-12 bg-gray-50 px-3 sm:px-4 py-2.5 text-[11px] sm:text-xs font-bold text-gray-600 uppercase tracking-wider border-b border-gray-200">
                      <div className="col-span-2 sm:col-span-1 text-center" title="Reordenar">Pos.</div>
                      <div className="col-span-5 sm:col-span-6 pl-2">Campo de Cadastro</div>
                      <div className="col-span-2 sm:col-span-2 text-center">Exibir</div>
                      <div className="col-span-3 sm:col-span-3 text-center">Obrigatório</div>
                    </div>

                    <div className="divide-y divide-gray-100">
                      {checkoutFields.map((fieldConfig, index) => {
                        const isFixed = fieldConfig.field === 'nome' || fieldConfig.field === 'whatsapp';
                        const isDragging = draggedFieldIndex === index;

                        return (
                          <div 
                            key={fieldConfig.field}
                            draggable={!isSubmitting}
                            onDragStart={() => handleDragStart(index)}
                            onDragOver={(e) => handleDragOver(e, index)}
                            onDragEnd={handleDragEnd}
                            className={`grid grid-cols-12 px-3 sm:px-4 py-2.5 items-center transition-all ${
                              isDragging 
                                ? 'bg-indigo-50 border-2 border-dashed border-indigo-400 opacity-60 scale-[0.99]' 
                                : fieldConfig.enabled 
                                  ? 'bg-white hover:bg-indigo-50/40' 
                                  : 'bg-gray-50/60 opacity-60'
                            }`}
                          >
                            {/* Alça de Arraste & Botões de Ordem */}
                            <div className="col-span-2 sm:col-span-1 flex items-center justify-center gap-0.5">
                              <div 
                                className="cursor-grab active:cursor-grabbing p-1 text-gray-400 hover:text-indigo-600 rounded transition-colors"
                                title="Clique e arraste para reordenar"
                              >
                                <GripVertical className="w-4 h-4" />
                              </div>
                              <div className="hidden sm:flex flex-col gap-0.5">
                                <button
                                  type="button"
                                  onClick={() => moveField(index, 'up')}
                                  disabled={index === 0 || isSubmitting}
                                  className="text-gray-400 hover:text-indigo-600 disabled:opacity-20 disabled:hover:text-gray-400 p-0.5"
                                  title="Mover para cima"
                                >
                                  <ArrowUp className="w-3 h-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => moveField(index, 'down')}
                                  disabled={index === checkoutFields.length - 1 || isSubmitting}
                                  className="text-gray-400 hover:text-indigo-600 disabled:opacity-20 disabled:hover:text-gray-400 p-0.5"
                                  title="Mover para baixo"
                                >
                                  <ArrowDown className="w-3 h-3" />
                                </button>
                              </div>
                            </div>

                            {/* Nome do Campo */}
                            <div className="col-span-5 sm:col-span-6 flex items-center gap-2 pl-2">
                              <span className="text-xs font-semibold text-gray-800">
                                {fieldConfig.label}
                              </span>
                              {isFixed && (
                                <span className="text-[10px] bg-indigo-50 text-indigo-700 font-bold px-1.5 py-0.5 rounded border border-indigo-200 shrink-0">
                                  Padrão
                                </span>
                              )}
                            </div>

                            {/* Checkbox Exibir */}
                            <div className="col-span-2 sm:col-span-2 flex justify-center">
                              {isFixed ? (
                                <input
                                  type="checkbox"
                                  checked={true}
                                  disabled={true}
                                  className="w-4 h-4 text-indigo-600 rounded border-gray-300 opacity-60 cursor-not-allowed"
                                />
                              ) : (
                                <input
                                  type="checkbox"
                                  checked={fieldConfig.enabled}
                                  onChange={(e) => toggleCheckoutField(fieldConfig.field, e.target.checked)}
                                  disabled={isSubmitting}
                                  className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500 cursor-pointer"
                                />
                              )}
                            </div>

                            {/* Checkbox Obrigatório */}
                            <div className="col-span-3 sm:col-span-3 flex justify-center">
                              {isFixed ? (
                                <span className="text-[11px] text-red-600 font-bold">Sim (Fixo)</span>
                              ) : (
                                <input
                                  type="checkbox"
                                  checked={fieldConfig.required}
                                  onChange={(e) => toggleCheckoutFieldRequired(fieldConfig.field, e.target.checked)}
                                  disabled={!fieldConfig.enabled || isSubmitting}
                                  className={`w-4 h-4 rounded border-gray-300 focus:ring-indigo-500 ${
                                    fieldConfig.enabled 
                                      ? 'text-indigo-600 cursor-pointer' 
                                      : 'opacity-30 cursor-not-allowed'
                                  }`}
                                />
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <p className="text-xs text-gray-500 flex items-center gap-1.5 bg-gray-50 p-3 rounded-xl border border-gray-200/60">
                    <span>💡</span>
                    <span><strong>Dica:</strong> Arraste as linhas ou use as setas para cima/baixo para organizar a ordem em que os campos aparecerão na tela de compra.</span>
                  </p>
                </div>
              </div>
            )}

            {/* ABA 4: MENSAGENS WHATSAPP */}
            {activeTab === 'whatsapp' && (
              <div className="max-w-3xl mx-auto space-y-6">
                <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs space-y-5">
                  <div className="flex items-center justify-between border-b border-gray-100 pb-4 flex-wrap gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                        <MessageSquare className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-gray-900">
                          Comunicação WhatsApp (WAHA) dos Ingressos
                        </h3>
                        <p className="text-xs text-gray-500">
                          Personalize as mensagens automáticas enviadas aos compradores deste evento
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowWahaTestModal(true)}
                      className="inline-flex items-center gap-2 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-xs hover:shadow-md transition-all cursor-pointer select-none"
                    >
                      <Send className="w-3.5 h-3.5" />
                      Testar Envio de Mensagem
                    </button>
                  </div>

                  {/* Card de Tags Dinâmicas */}
                  <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-xl p-4 shadow-2xs">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-900 mb-2">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                      Tags Dinâmicas (clique para copiar):
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {[
                        '{cliente}',
                        '{evento}',
                        '{total}',
                        '{quantidade}',
                        '{data_evento}',
                        '{local_evento}',
                        '{numero_pedido}',
                        '{link_acesso}'
                      ].map((tag) => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(tag);
                            setCopiedTag(tag);
                            setTimeout(() => setCopiedTag(null), 2000);
                            toast.success(`Tag ${tag} copiada!`);
                          }}
                          className="bg-white hover:bg-emerald-100 border border-emerald-300 text-emerald-800 text-xs px-2.5 py-1 rounded-lg font-mono flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          {copiedTag === tag ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3 text-emerald-500" />}
                          {tag}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    {/* Mensagem de Pedido Criado */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label htmlFor="waha_msg_order_created" className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                          1. Pedido Criado (Aguardando Pagamento)
                        </label>
                        <button
                          type="button"
                          onClick={() => setValue('waha_msg_order_created', DEFAULT_WAHA_MSG_CREATED, { shouldDirty: true })}
                          className="text-xs text-emerald-700 hover:text-emerald-800 font-medium flex items-center gap-1 cursor-pointer"
                        >
                          <RefreshCw className="w-3 h-3" /> Restaurar Padrão
                        </button>
                      </div>
                      <textarea
                        {...register('waha_msg_order_created')}
                        id="waha_msg_order_created"
                        rows={3}
                        className="w-full px-4 py-3 bg-slate-50/70 border border-gray-300 rounded-xl text-gray-800 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-xs leading-relaxed"
                        placeholder="Mensagem de pedido criado..."
                      />
                    </div>

                    {/* Mensagem de Pagamento Confirmado */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label htmlFor="waha_msg_order_confirmed" className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                          2. Pagamento Confirmado (Ingressos Emitidos)
                        </label>
                        <button
                          type="button"
                          onClick={() => setValue('waha_msg_order_confirmed', DEFAULT_WAHA_MSG_CONFIRMED, { shouldDirty: true })}
                          className="text-xs text-emerald-700 hover:text-emerald-800 font-medium flex items-center gap-1 cursor-pointer"
                        >
                          <RefreshCw className="w-3 h-3" /> Restaurar Padrão
                        </button>
                      </div>
                      <textarea
                        {...register('waha_msg_order_confirmed')}
                        id="waha_msg_order_confirmed"
                        rows={3}
                        className="w-full px-4 py-3 bg-slate-50/70 border border-gray-300 rounded-xl text-gray-800 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-xs leading-relaxed"
                        placeholder="Mensagem de pagamento confirmado..."
                      />
                    </div>

                    {/* Mensagem de Cancelamento */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label htmlFor="waha_msg_order_cancelled" className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                          3. Pedido Cancelado / Recusado
                        </label>
                        <button
                          type="button"
                          onClick={() => setValue('waha_msg_order_cancelled', DEFAULT_WAHA_MSG_CANCELLED, { shouldDirty: true })}
                          className="text-xs text-emerald-700 hover:text-emerald-800 font-medium flex items-center gap-1 cursor-pointer"
                        >
                          <RefreshCw className="w-3 h-3" /> Restaurar Padrão
                        </button>
                      </div>
                      <textarea
                        {...register('waha_msg_order_cancelled')}
                        id="waha_msg_order_cancelled"
                        rows={2}
                        className="w-full px-4 py-3 bg-slate-50/70 border border-gray-300 rounded-xl text-gray-800 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-xs leading-relaxed"
                        placeholder="Mensagem de cancelamento..."
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ABA 5: MENSAGENS E-MAIL */}
            {activeTab === 'email' && (
              <div className="max-w-3xl mx-auto space-y-6">
                <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs space-y-5">
                  <div className="flex items-center justify-between border-b border-gray-100 pb-4 flex-wrap gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center">
                        <Mail className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-gray-900">
                          Comunicação por E-mail dos Ingressos
                        </h3>
                        <p className="text-xs text-gray-500">
                          Personalize os assuntos e conteúdos dos e-mails automáticos enviados aos compradores
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const wCreated = watch('waha_msg_order_created') || DEFAULT_WAHA_MSG_CREATED;
                          const wConfirmed = watch('waha_msg_order_confirmed') || DEFAULT_WAHA_MSG_CONFIRMED;
                          const wCancelled = watch('waha_msg_order_cancelled') || DEFAULT_WAHA_MSG_CANCELLED;
                          setValue('email_msg_order_created_body', wCreated, { shouldDirty: true });
                          setValue('email_msg_order_confirmed_body', wConfirmed, { shouldDirty: true });
                          setValue('email_msg_order_cancelled_body', wCancelled, { shouldDirty: true });
                          toast.success('Todas as 3 mensagens do WhatsApp foram copiadas para os e-mails!');
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-2 bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 text-xs font-semibold rounded-xl transition-all cursor-pointer"
                        title="Copia os textos das mensagens configuradas no WhatsApp para os 3 modelos de e-mail"
                      >
                        <Copy className="w-3.5 h-3.5 text-sky-600" />
                        Copiar Todas do WhatsApp
                      </button>

                      <button
                        type="button"
                        onClick={() => setShowEmailTestModal(true)}
                        className="inline-flex items-center gap-2 px-3.5 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold rounded-xl shadow-xs hover:shadow-md transition-all cursor-pointer select-none"
                      >
                        <Send className="w-3.5 h-3.5" />
                        Testar Envio de E-mail
                      </button>
                    </div>
                  </div>

                  {/* Card de Tags Dinâmicas */}
                  <div className="bg-sky-50/60 border border-sky-200/80 rounded-xl p-4 shadow-2xs">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-sky-900 mb-2">
                      <Sparkles className="w-3.5 h-3.5 text-sky-600" />
                      Tags Dinâmicas (clique para copiar):
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {[
                        '{cliente}',
                        '{evento}',
                        '{total}',
                        '{quantidade}',
                        '{data_evento}',
                        '{local_evento}',
                        '{numero_pedido}',
                        '{link_acesso}'
                      ].map((tag) => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(tag);
                            setCopiedTag(tag);
                            setTimeout(() => setCopiedTag(null), 2000);
                            toast.success(`Tag ${tag} copiada!`);
                          }}
                          className="bg-white hover:bg-sky-100 border border-sky-300 text-sky-800 text-xs px-2.5 py-1 rounded-lg font-mono flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          {copiedTag === tag ? <Check className="w-3 h-3 text-sky-600" /> : <Copy className="w-3 h-3 text-sky-500" />}
                          {tag}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-5">
                    {/* Modelo 1: Pedido Criado */}
                    <div className="bg-slate-50/50 border border-gray-200 rounded-xl p-4 space-y-3">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <span className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                          1. Pedido Criado (Aguardando Pagamento)
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              const wMsg = watch('waha_msg_order_created') || DEFAULT_WAHA_MSG_CREATED;
                              setValue('email_msg_order_created_body', wMsg, { shouldDirty: true });
                              toast.success('Mensagem do WhatsApp copiada para o corpo do e-mail!');
                            }}
                            className="text-xs bg-white hover:bg-sky-50 text-sky-700 border border-sky-200 px-2.5 py-1 rounded-lg font-medium flex items-center gap-1 cursor-pointer transition-colors"
                          >
                            <Copy className="w-3 h-3 text-sky-600" /> Copiar do WhatsApp
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setValue('email_msg_order_created_subject', DEFAULT_EMAIL_MSG_CREATED_SUBJECT, { shouldDirty: true });
                              setValue('email_msg_order_created_body', DEFAULT_EMAIL_MSG_CREATED_BODY, { shouldDirty: true });
                            }}
                            className="text-xs text-gray-500 hover:text-gray-700 font-medium flex items-center gap-1 cursor-pointer"
                          >
                            <RefreshCw className="w-3 h-3" /> Restaurar Padrão
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Assunto do E-mail:
                        </label>
                        <input
                          type="text"
                          {...register('email_msg_order_created_subject')}
                          placeholder="Pedido Recebido #{numero_pedido} - {evento}"
                          className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-gray-800 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 text-xs font-semibold"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Corpo do E-mail (Texto da Mensagem):
                        </label>
                        <textarea
                          {...register('email_msg_order_created_body')}
                          rows={3}
                          className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-gray-800 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 text-xs leading-relaxed"
                          placeholder="Olá, {cliente}! Recebemos o seu pedido..."
                        />
                      </div>
                    </div>

                    {/* Modelo 2: Pagamento Confirmado */}
                    <div className="bg-slate-50/50 border border-gray-200 rounded-xl p-4 space-y-3">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <span className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                          2. Pagamento Confirmado (Ingressos Emitidos)
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              const wMsg = watch('waha_msg_order_confirmed') || DEFAULT_WAHA_MSG_CONFIRMED;
                              setValue('email_msg_order_confirmed_body', wMsg, { shouldDirty: true });
                              toast.success('Mensagem do WhatsApp copiada para o corpo do e-mail!');
                            }}
                            className="text-xs bg-white hover:bg-sky-50 text-sky-700 border border-sky-200 px-2.5 py-1 rounded-lg font-medium flex items-center gap-1 cursor-pointer transition-colors"
                          >
                            <Copy className="w-3 h-3 text-sky-600" /> Copiar do WhatsApp
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setValue('email_msg_order_confirmed_subject', DEFAULT_EMAIL_MSG_CONFIRMED_SUBJECT, { shouldDirty: true });
                              setValue('email_msg_order_confirmed_body', DEFAULT_EMAIL_MSG_CONFIRMED_BODY, { shouldDirty: true });
                            }}
                            className="text-xs text-gray-500 hover:text-gray-700 font-medium flex items-center gap-1 cursor-pointer"
                          >
                            <RefreshCw className="w-3 h-3" /> Restaurar Padrão
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Assunto do E-mail:
                        </label>
                        <input
                          type="text"
                          {...register('email_msg_order_confirmed_subject')}
                          placeholder="🎉 Ingressos Confirmados! Pedido #{numero_pedido} - {evento}"
                          className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-gray-800 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 text-xs font-semibold"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Corpo do E-mail (Texto da Mensagem):
                        </label>
                        <textarea
                          {...register('email_msg_order_confirmed_body')}
                          rows={4}
                          className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-gray-800 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 text-xs leading-relaxed"
                          placeholder="Parabéns, {cliente}! Seu pagamento..."
                        />
                      </div>
                    </div>

                    {/* Modelo 3: Cancelamento */}
                    <div className="bg-slate-50/50 border border-gray-200 rounded-xl p-4 space-y-3">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <span className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                          3. Pedido Cancelado / Recusado
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              const wMsg = watch('waha_msg_order_cancelled') || DEFAULT_WAHA_MSG_CANCELLED;
                              setValue('email_msg_order_cancelled_body', wMsg, { shouldDirty: true });
                              toast.success('Mensagem do WhatsApp copiada para o corpo do e-mail!');
                            }}
                            className="text-xs bg-white hover:bg-sky-50 text-sky-700 border border-sky-200 px-2.5 py-1 rounded-lg font-medium flex items-center gap-1 cursor-pointer transition-colors"
                          >
                            <Copy className="w-3 h-3 text-sky-600" /> Copiar do WhatsApp
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setValue('email_msg_order_cancelled_subject', DEFAULT_EMAIL_MSG_CANCELLED_SUBJECT, { shouldDirty: true });
                              setValue('email_msg_order_cancelled_body', DEFAULT_EMAIL_MSG_CANCELLED_BODY, { shouldDirty: true });
                            }}
                            className="text-xs text-gray-500 hover:text-gray-700 font-medium flex items-center gap-1 cursor-pointer"
                          >
                            <RefreshCw className="w-3 h-3" /> Restaurar Padrão
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Assunto do E-mail:
                        </label>
                        <input
                          type="text"
                          {...register('email_msg_order_cancelled_subject')}
                          placeholder="Pedido Cancelado #{numero_pedido} - {evento}"
                          className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-gray-800 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 text-xs font-semibold"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Corpo do E-mail (Texto da Mensagem):
                        </label>
                        <textarea
                          {...register('email_msg_order_cancelled_body')}
                          rows={2}
                          className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-gray-800 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 text-xs leading-relaxed"
                          placeholder="Olá, {cliente}. Informamos que seu pedido..."
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

          </div>

          {/* Botões flutuantes fixos na parte inferior */}
          <div className="flex-shrink-0 bg-white border-t border-gray-200 px-6 py-4">
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={onCancel}
                disabled={isSubmitting}
                className="px-6 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50 text-sm cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                form="event-form"
                disabled={isSubmitting || !isValid}
                className={`px-6 py-2.5 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2 text-sm shadow-sm cursor-pointer ${
                  isSubmitting || !isValid
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    {event ? 'Atualizar Evento' : 'Criar Evento'}
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Modal de Teste de Envio de Mensagem WhatsApp */}
      {showWahaTestModal && (
        <EventWahaTestModal
          isOpen={showWahaTestModal}
          onClose={() => setShowWahaTestModal(false)}
          eventTitle={watch('title')}
          eventDate={watch('event_date')}
          eventLocation={watch('location')}
          wahaMsgCreated={watch('waha_msg_order_created')}
          wahaMsgConfirmed={watch('waha_msg_order_confirmed')}
          wahaMsgCancelled={watch('waha_msg_order_cancelled')}
        />
      )}

      {/* Modal de Teste de Envio de E-mail */}
      {showEmailTestModal && (
        <EventEmailTestModal
          isOpen={showEmailTestModal}
          onClose={() => setShowEmailTestModal(false)}
          eventTitle={watch('title')}
          eventDate={watch('event_date')}
          eventLocation={watch('location')}
          emailMsgCreatedSubj={watch('email_msg_order_created_subject')}
          emailMsgCreatedBody={watch('email_msg_order_created_body')}
          emailMsgConfirmedSubj={watch('email_msg_order_confirmed_subject')}
          emailMsgConfirmedBody={watch('email_msg_order_confirmed_body')}
          emailMsgCancelledSubj={watch('email_msg_order_cancelled_subject')}
          emailMsgCancelledBody={watch('email_msg_order_cancelled_body')}
        />
      )}
    </div>
  );
};

export default EventForm;