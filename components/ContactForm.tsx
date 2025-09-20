import React, { useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';

const ContactForm: React.FC = () => {
    const { translations } = useLanguage();
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        eventType: '',
        guests: '',
        date: ''
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prevState => ({ ...prevState, [name]: value }));
    };

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        console.log("Form Submitted:", formData);
        alert("Thank you for your request! We will be in touch shortly.");
        setFormData({ name: '', email: '', phone: '', eventType: '', guests: '', date: '' });
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
                        <button type="submit" className="w-full bg-blue-600 text-white font-bold py-4 px-8 rounded-full text-lg hover:bg-blue-700 transition-all duration-300 transform hover:scale-105 shadow-lg">
                            {translations.contactForm.submit}
                        </button>
                    </form>
                </div>
            </div>
        </section>
    );
};

export default ContactForm;
