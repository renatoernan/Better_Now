import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useLanguage } from '../../shared/contexts/contexts/LanguageContext';
import { useAppSettings } from '../../shared/hooks/hooks/useAppSettings';
import { useSupabaseEventTypes } from '../../shared/hooks/hooks/useSupabaseEventTypes';
import { Mail, Phone, MapPin, Clock, Send, AlertCircle } from 'lucide-react';
import { supabase } from '../../shared/services/lib/supabase';
import { ActivityLogger } from '../../shared/utils/utils/activityLogger';
import { contactFormDataSchema, type ContactFormData } from '../../shared/types/schemas/validationSchemas';
import { toast } from 'sonner';
import { PhoneInput } from '../ui/PhoneInput';

const ContactForm: React.FC = () => {
    const { translations } = useLanguage();
    const { settings } = useAppSettings();
    const { eventTypes, fetchEventTypes, loading: loadingEventTypes } = useSupabaseEventTypes();
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        fetchEventTypes(true);
    }, []);

    const {
        register,
        handleSubmit,
        reset,
        watch,
        setValue,
        trigger,
        formState: { errors, isValid }
    } = useForm<ContactFormData>({
        resolver: zodResolver(contactFormDataSchema),
        mode: 'onChange',
        defaultValues: {
            name: '',
            email: '',
            phone: '',
            event_type: '',
            guests: 1,
            event_date: '',
            message: ''
        }
    });

    const onSubmit = async (data: ContactFormData) => {
        setIsLoading(true);
        
        try {
            ActivityLogger.logContact('form_submit_attempt', `Tentativa de envio de formulário por ${data.name} (${data.email}) - Notificação para: ${settings.notification_email || 'email não configurado'}`, 'info', {
                name: data.name,
                email: data.email,
                eventType: data.event_type,
                guests: data.guests,
                notificationEmail: settings.notification_email
            });

            // Inserir dados no Supabase
            const { data: insertData, error } = await supabase
                .from('app_contact_forms')
                .insert([
                    {
                        name: data.name,
                        email: data.email,
                        phone: data.phone || null,
                        event_type: data.event_type || 'Não especificado',
                        guests: data.guests || 1,
                        event_date: data.event_date || new Date().toISOString().split('T')[0],
                        message: data.message || null,
                        status: 'unread'
                    }
                ])
                .select();

            if (error) {
                throw error;
            }

            ActivityLogger.logContact('form_submit_success', `Formulário enviado com sucesso por ${data.name} (${data.email}) - Notificação enviada para: ${settings.notification_email || 'email não configurado'}`, 'success', {
                name: data.name,
                email: data.email,
                eventType: data.event_type,
                contactId: insertData[0]?.id,
                notificationEmail: settings.notification_email
            });

            // Chamada webhook para n8n
            try {
                ActivityLogger.logContact('webhook_attempt', `Tentativa de envio webhook para n8n - Cliente: ${data.name}`, 'info', {
                    name: data.name,
                    email: data.email,
                    webhookUrl: 'https://n8n.tradersbots.com.br/webhook/orcamento'
                });

                const webhookData = {
                    name: data.name,
                    email: data.email,
                    phone: data.phone || '',
                    eventType: data.event_type || 'Não especificado',
                    guests: data.guests || 1,
                    date: data.event_date || new Date().toISOString().split('T')[0],
                    message: data.message || '',
                    timestamp: new Date().toISOString()
                };

                const webhookController = new AbortController();
                const webhookTimeout = setTimeout(() => webhookController.abort(), 5000);

                const webhookResponse = await fetch('https://n8n.tradersbots.com.br/webhook/orcamento', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(webhookData),
                    signal: webhookController.signal
                });

                clearTimeout(webhookTimeout);

                if (webhookResponse.ok) {
                    ActivityLogger.logContact('webhook_success', `Webhook enviado com sucesso para n8n - Cliente: ${data.name}`, 'success', {
                        name: data.name,
                        email: data.email,
                        webhookStatus: webhookResponse.status
                    });
                } else {
                    throw new Error(`Webhook failed with status: ${webhookResponse.status}`);
                }
            } catch (webhookError) {
                // Log do erro do webhook, mas não impede o sucesso do formulário
                ActivityLogger.logContact('webhook_error', `Erro no webhook para n8n - Cliente: ${data.name}: ${webhookError}`, 'error', {
                    name: data.name,
                    email: data.email,
                    error: webhookError.toString()
                });
                console.warn('Webhook failed, but form submission was successful:', webhookError);
            }

            // Limpar formulário após sucesso
            reset();

            toast.success('Mensagem enviada!', {
                description: 'Obrigado pelo seu contato. Retornaremos em breve.',
                duration: 6000
            });
        } catch (error) {
            console.error('Erro ao salvar contato:', error);
            ActivityLogger.logContact('form_submit_error', `Erro ao enviar formulário por ${data.name} (${data.email}): ${error}`, 'error', {
                name: data.name,
                email: data.email,
                error: error.toString()
            });
            toast.error('Erro ao enviar mensagem', {
                description: 'Ocorreu um erro ao processar sua solicitação. Tente novamente.',
                duration: 8000
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <section 
            id="contact" 
            className="py-12 sm:py-16 lg:py-20 xl:py-24 
                       bg-white"
        >
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                {/* Cabeçalho da seção - Mobile First */}
                <div className="text-center mb-8 sm:mb-12 lg:mb-16">
                    <h2 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl 
                                   font-bold text-[#2c3e50] 
                                   mb-3 sm:mb-4 lg:mb-6 
                                   leading-tight">
                        {translations.contactTitle}
                    </h2>
                    <p className="text-sm sm:text-base lg:text-lg xl:text-xl 
                                  text-gray-600 
                                  max-w-xl sm:max-w-2xl lg:max-w-3xl 
                                  mx-auto 
                                  leading-relaxed 
                                  px-2 sm:px-4">
                        {translations.contactSubtitle}
                    </p>
                </div>

                {/* Formulário - Mobile First */}
                <div className="max-w-4xl mx-auto 
                                bg-gray-50 
                                p-4 sm:p-6 lg:p-8 xl:p-10 
                                rounded-lg shadow-xl">
                    <form 
                        onSubmit={handleSubmit(onSubmit)} 
                        className="space-y-4 sm:space-y-6"
                        role="form"
                        aria-labelledby="contact-form-title"
                        noValidate
                    >
                        <h3 id="contact-form-title" className="sr-only">Formulário de Contato</h3>
                        
                        {/* Nome e Email */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                            <div>
                                <label htmlFor="contact-name" className="block text-xs sm:text-sm font-semibold text-[#2c3e50] mb-1.5">
                                    {translations.contactForm.name} <span className="text-red-500" title="Campo obrigatório">*</span>
                                </label>
                                <input 
                                    {...register('name')}
                                    id="contact-name"
                                    type="text" 
                                    placeholder="Digite seu nome completo"
                                    aria-label={translations.contactForm.name}
                                    aria-invalid={errors.name ? 'true' : 'false'}
                                    aria-describedby={errors.name ? 'name-error' : undefined}
                                    className={`w-full p-3 sm:p-4 
                                               text-sm sm:text-base 
                                               rounded-md border 
                                               ${errors.name ? 'border-red-500 bg-red-50' : 'border-gray-300'} 
                                               focus:outline-none focus:ring-2 
                                               ${errors.name ? 'focus:ring-red-500' : 'focus:ring-blue-600'}
                                               transition-colors duration-200`}
                                />
                                {errors.name && (
                                    <div 
                                        id="name-error"
                                        className="flex items-center gap-1 mt-1 text-red-600"
                                        role="alert"
                                        aria-live="polite"
                                    >
                                        <AlertCircle className="w-4 h-4" />
                                        <span className="text-xs sm:text-sm">{errors.name.message}</span>
                                    </div>
                                )}
                            </div>
                            
                            <div>
                                <label htmlFor="contact-email" className="block text-xs sm:text-sm font-semibold text-[#2c3e50] mb-1.5">
                                    {translations.contactForm.email} <span className="text-red-500" title="Campo obrigatório">*</span>
                                </label>
                                <input 
                                    {...register('email')}
                                    id="contact-email"
                                    type="email" 
                                    placeholder="seu.email@exemplo.com"
                                    aria-label={translations.contactForm.email}
                                    aria-invalid={errors.email ? 'true' : 'false'}
                                    aria-describedby={errors.email ? 'email-error' : undefined}
                                    className={`w-full p-3 sm:p-4 
                                               text-sm sm:text-base 
                                               rounded-md border 
                                               ${errors.email ? 'border-red-500 bg-red-50' : 'border-gray-300'} 
                                               focus:outline-none focus:ring-2 
                                               ${errors.email ? 'focus:ring-red-500' : 'focus:ring-blue-600'}
                                               transition-colors duration-200`}
                                />
                                {errors.email && (
                                    <div 
                                        id="email-error"
                                        className="flex items-center gap-1 mt-1 text-red-600"
                                        role="alert"
                                        aria-live="polite"
                                    >
                                        <AlertCircle className="w-4 h-4" />
                                        <span className="text-xs sm:text-sm">{errors.email.message}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Telefone */}
                        <div>
                            <label htmlFor="contact-phone" className="block text-xs sm:text-sm font-semibold text-[#2c3e50] mb-1.5">
                                {translations.contactForm.phone} <span className="text-gray-400 font-normal text-xs">(opcional)</span>
                            </label>
                            <PhoneInput
                                id="contact-phone"
                                value={watch('phone')}
                                onChange={(value) => setValue('phone', value)}
                                onBlur={() => trigger('phone')}
                                placeholder={translations.contactForm.phone}
                                error={!!errors.phone}
                                className="w-full"
                            />
                            {errors.phone && (
                                <div className="flex items-center gap-1 mt-1 text-red-600">
                                    <AlertCircle className="w-4 h-4" />
                                    <span className="text-xs sm:text-sm">{errors.phone.message}</span>
                                </div>
                            )}
                        </div>

                        {/* Tipo de Evento */}
                        <div>
                            <label htmlFor="contact-event-type" className="block text-xs sm:text-sm font-semibold text-[#2c3e50] mb-1.5">
                                {translations.contactForm.eventType} <span className="text-red-500" title="Campo obrigatório">*</span>
                            </label>
                            <select 
                                {...register('event_type')}
                                id="contact-event-type"
                                className={`w-full p-3 sm:p-4 
                                           text-sm sm:text-base 
                                           rounded-md border 
                                           ${errors.event_type ? 'border-red-500 bg-red-50' : 'border-gray-300'} 
                                           focus:outline-none focus:ring-2 
                                           ${errors.event_type ? 'focus:ring-red-500' : 'focus:ring-blue-600'}
                                           transition-colors duration-200 text-gray-700 bg-white`}
                            >
                                <option value="" disabled>
                                    {loadingEventTypes ? 'Carregando tipos de eventos...' : translations.contactForm.eventType}
                                </option>
                                {eventTypes.length > 0 ? (
                                    eventTypes.map(type => (
                                        <option key={type.id} value={type.name}>{type.name}</option>
                                    ))
                                ) : (
                                    translations.contactForm.eventTypes.map(type => (
                                        <option key={type} value={type}>{type}</option>
                                    ))
                                )}
                            </select>
                            {errors.event_type && (
                                <div className="flex items-center gap-1 mt-1 text-red-600">
                                    <AlertCircle className="w-4 h-4" />
                                    <span className="text-xs sm:text-sm">{errors.event_type.message}</span>
                                </div>
                            )}
                        </div>

                        {/* Convidados e Data */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                            <div>
                                <label htmlFor="contact-guests" className="block text-xs sm:text-sm font-semibold text-[#2c3e50] mb-1.5">
                                    {translations.contactForm.guests} <span className="text-red-500" title="Campo obrigatório">*</span>
                                </label>
                                <input 
                                    {...register('guests', { valueAsNumber: true })}
                                    id="contact-guests"
                                    type="number" 
                                    min="1"
                                    placeholder={translations.contactForm.guests}
                                    className={`w-full p-3 sm:p-4 
                                               text-sm sm:text-base 
                                               rounded-md border 
                                               ${errors.guests ? 'border-red-500 bg-red-50' : 'border-gray-300'} 
                                               focus:outline-none focus:ring-2 
                                               ${errors.guests ? 'focus:ring-red-500' : 'focus:ring-blue-600'}
                                               transition-colors duration-200`}
                                />
                                {errors.guests && (
                                    <div className="flex items-center gap-1 mt-1 text-red-600">
                                        <AlertCircle className="w-4 h-4" />
                                        <span className="text-xs sm:text-sm">{errors.guests.message}</span>
                                    </div>
                                )}
                            </div>
                            
                            <div>
                                <label htmlFor="contact-event-date" className="block text-xs sm:text-sm font-semibold text-[#2c3e50] mb-1.5">
                                    {translations.contactForm.date} <span className="text-red-500" title="Campo obrigatório">*</span>
                                </label>
                                <input 
                                    {...register('event_date')}
                                    id="contact-event-date"
                                    type="date" 
                                    aria-label={translations.contactForm.date}
                                    className={`w-full p-3 sm:p-4 
                                               text-sm sm:text-base 
                                               rounded-md border 
                                               ${errors.event_date ? 'border-red-500 bg-red-50' : 'border-gray-300'} 
                                               focus:outline-none focus:ring-2 
                                               ${errors.event_date ? 'focus:ring-red-500' : 'focus:ring-blue-600'}
                                               transition-colors duration-200 text-gray-700 bg-white`}
                                />
                                {errors.event_date && (
                                    <div className="flex items-center gap-1 mt-1 text-red-600">
                                        <AlertCircle className="w-4 h-4" />
                                        <span className="text-xs sm:text-sm">{errors.event_date.message}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Mensagem */}
                        <div>
                            <label htmlFor="contact-message" className="block text-xs sm:text-sm font-semibold text-[#2c3e50] mb-1.5">
                                {translations.contactForm.message} <span className="text-gray-400 font-normal text-xs">(opcional)</span>
                            </label>
                            <textarea 
                                {...register('message')}
                                id="contact-message"
                                placeholder="Conte-nos mais sobre como imagina o seu evento..." 
                                rows={4}
                                className={`w-full p-3 sm:p-4 
                                           text-sm sm:text-base 
                                           rounded-md border 
                                           ${errors.message ? 'border-red-500 bg-red-50' : 'border-gray-300'} 
                                           focus:outline-none focus:ring-2 
                                           ${errors.message ? 'focus:ring-red-500' : 'focus:ring-blue-600'}
                                           transition-colors duration-200 resize-vertical`}
                            />
                            {errors.message && (
                                <div className="flex items-center gap-1 mt-1 text-red-600">
                                    <AlertCircle className="w-4 h-4" />
                                    <span className="text-xs sm:text-sm">{errors.message.message}</span>
                                </div>
                            )}
                        </div>

                        {/* Botão de envio */}
                        <button
                            type="submit"
                            disabled={isLoading || !isValid}
                            aria-describedby={isLoading ? 'submit-loading' : undefined}
                            className={`w-full font-bold 
                                       py-3 sm:py-4 lg:py-5 
                                       px-6 sm:px-8 lg:px-10 
                                       rounded-full 
                                       text-sm sm:text-base lg:text-lg xl:text-xl 
                                       transition-all duration-300 transform shadow-lg 
                                       focus:outline-none focus:ring-4 focus:ring-blue-300/50
                                       ${isLoading || !isValid
                                           ? 'bg-gray-400 cursor-not-allowed' 
                                           : 'bg-blue-600 hover:bg-blue-700 hover:scale-105 hover:shadow-xl'
                                       } text-white`}
                        >
                            {isLoading ? (
                                <div className="flex items-center justify-center gap-2">
                                    <div 
                                        className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"
                                        aria-hidden="true"
                                    ></div>
                                    <span aria-hidden="true">Enviando...</span>
                                    <span id="submit-loading" className="sr-only">
                                        Processando envio do formulário, aguarde
                                    </span>
                                </div>
                            ) : (
                                <div className="flex items-center justify-center gap-2">
                                    <Send className="w-4 h-4 sm:w-5 sm:h-5" aria-hidden="true" />
                                    <span>{translations.contactForm.submit}</span>
                                </div>
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </section>
    );
};

export default ContactForm;
