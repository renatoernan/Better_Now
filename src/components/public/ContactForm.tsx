import React, { useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAppSettings } from '../../hooks/useAppSettings';
import { Mail, Phone, MapPin, Clock, Send } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import ActivityLogger from '../../utils/activityLogger';

const ContactForm: React.FC = () => {
    const { translations } = useLanguage();
    const { settings } = useAppSettings();
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        eventType: '',
        guests: '',
        date: '',
        message: ''
    });
    const [isLoading, setIsLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prevState => ({ ...prevState, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        
        // Validação básica
        if (!formData.name || !formData.email || !formData.phone) {
            alert('Por favor, preencha todos os campos obrigatórios.');
            return;
        }

        setIsLoading(true);
        
        try {
            ActivityLogger.logContact('form_submit_attempt', `Tentativa de envio de formulário por ${formData.name} (${formData.email}) - Notificação para: ${settings.notification_email || 'email não configurado'}`, 'info', {
                name: formData.name,
                email: formData.email,
                eventType: formData.eventType,
                guests: formData.guests,
                notificationEmail: settings.notification_email
            });

            // Inserir dados no Supabase
            const { data, error } = await supabase
                .from('contact_forms')
                .insert([
                    {
                        name: formData.name,
                        email: formData.email,
                        phone: formData.phone,
                        event_type: formData.eventType || 'Não especificado',
                        guests: formData.guests ? parseInt(formData.guests) : 1,
                        event_date: formData.date || new Date().toISOString().split('T')[0],
                        message: formData.message || null,
                        status: 'unread'
                    }
                ])
                .select();

            if (error) {
                throw error;
            }

            ActivityLogger.logContact('form_submit_success', `Formulário enviado com sucesso por ${formData.name} (${formData.email}) - Notificação enviada para: ${settings.notification_email || 'email não configurado'}`, 'success', {
                name: formData.name,
                email: formData.email,
                eventType: formData.eventType,
                contactId: data[0]?.id,
                notificationEmail: settings.notification_email
            });

            // Chamada webhook para n8n
            try {
                ActivityLogger.logContact('webhook_attempt', `Tentativa de envio webhook para n8n - Cliente: ${formData.name}`, 'info', {
                    name: formData.name,
                    email: formData.email,
                    webhookUrl: 'https://n8n.tradersbots.com.br/webhook/orcamento'
                });

                const webhookData = {
                    name: formData.name,
                    email: formData.email,
                    phone: formData.phone,
                    eventType: formData.eventType || 'Não especificado',
                    guests: formData.guests ? parseInt(formData.guests) : 1,
                    date: formData.date || new Date().toISOString().split('T')[0],
                    message: formData.message || '',
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
                    ActivityLogger.logContact('webhook_success', `Webhook enviado com sucesso para n8n - Cliente: ${formData.name}`, 'success', {
                        name: formData.name,
                        email: formData.email,
                        webhookStatus: webhookResponse.status
                    });
                } else {
                    throw new Error(`Webhook failed with status: ${webhookResponse.status}`);
                }
            } catch (webhookError) {
                // Log do erro do webhook, mas não impede o sucesso do formulário
                ActivityLogger.logContact('webhook_error', `Erro no webhook para n8n - Cliente: ${formData.name}: ${webhookError}`, 'error', {
                    name: formData.name,
                    email: formData.email,
                    error: webhookError.toString()
                });
                console.warn('Webhook failed, but form submission was successful:', webhookError);
            }

            // Limpar formulário após sucesso
            setFormData({
                name: '',
                email: '',
                phone: '',
                eventType: '',
                guests: '',
                date: '',
                message: ''
            });

            toast.success('Mensagem enviada!', {
                description: 'Obrigado pelo seu contato. Retornaremos em breve.',
                duration: 6000
            });
        } catch (error) {
            console.error('Erro ao salvar contato:', error);
            ActivityLogger.logContact('form_submit_error', `Erro ao enviar formulário por ${formData.name} (${formData.email}): ${error}`, 'error', {
                name: formData.name,
                email: formData.email,
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
        <section id="contact" className="py-20 bg-white">
            <div className="container mx-auto px-6">
                <div className="text-center mb-12">
                    <h2 className="text-4xl font-bold text-[#2c3e50] mb-4">{translations.contactTitle}</h2>
                    <p className="text-lg text-gray-600 max-w-2xl mx-auto">{translations.contactSubtitle}</p>
                </div>

                <div className="max-w-3xl mx-auto bg-gray-50 p-8 rounded-lg shadow-xl">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <input type="text" name="name" placeholder={translations.contactForm.name} value={formData.name} onChange={handleChange} className="w-full p-3 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-600" required />
                            <input type="email" name="email" placeholder={translations.contactForm.email} value={formData.email} onChange={handleChange} className="w-full p-3 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-600" required />
                        </div>
                        <input type="tel" name="phone" placeholder={translations.contactForm.phone} value={formData.phone} onChange={handleChange} className="w-full p-3 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-600" />
                        <select name="eventType" value={formData.eventType} onChange={handleChange} className="w-full p-3 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-600 text-gray-500" required>
                            <option value="" disabled>{translations.contactForm.eventType}</option>
                            {translations.contactForm.eventTypes.map(type => (
                                <option key={type} value={type}>{type}</option>
                            ))}
                        </select>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <input type="number" name="guests" placeholder={translations.contactForm.guests} value={formData.guests} onChange={handleChange} className="w-full p-3 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-600" />
                            <input type="date" name="date" aria-label={translations.contactForm.date} value={formData.date} onChange={handleChange} className="w-full p-3 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-600 text-gray-500" />
                        </div>
                        <textarea 
                            name="message" 
                            placeholder="Mensagem adicional (opcional)" 
                            value={formData.message} 
                            onChange={(e) => setFormData(prev => ({...prev, message: e.target.value}))}
                            rows={4}
                            className="w-full p-3 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-600 resize-vertical"
                        />
                        <button
                            type="submit"
                            disabled={isLoading}
                            className={`w-full font-bold py-4 px-8 rounded-full text-lg transition-all duration-300 transform shadow-lg ${
                                isLoading 
                                    ? 'bg-gray-400 cursor-not-allowed' 
                                    : 'bg-blue-600 hover:bg-blue-700 hover:scale-105'
                            } text-white`}
                        >
                            {isLoading ? (
                                <div className="flex items-center justify-center">
                                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                                    Enviando...
                                </div>
                            ) : (
                                translations.contactForm.submit
                            )}
                        </button>
                    </form>
                    
                    {/* Modal de Confirmação */}
                    {showModal && (
                        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 animate-fadeIn">
                            <div className="bg-white rounded-2xl p-8 max-w-md mx-4 transform shadow-2xl animate-scaleIn">
                                <div className="text-center">
                                    {/* Ícone de Sucesso Animado */}
                                    <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4 animate-bounce">
                                        <svg className="h-8 w-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                                        </svg>
                                    </div>
                                    
                                    <h3 className="text-2xl font-bold text-gray-900 mb-2">
                                        Solicitação Enviada!
                                    </h3>
                                    
                                    <p className="text-gray-600 mb-6">
                                        Obrigado pelo seu interesse! Nossa equipe entrará em contato em breve para criar seu evento inesquecível.
                                    </p>
                                    
                                    <button
                                        onClick={() => setShowModal(false)}
                                        className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition-all duration-300 hover:scale-105 font-semibold"
                                    >
                                        Fechar
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
};

export default ContactForm;
