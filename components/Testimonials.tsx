import React from 'react';
import { testimonialKeys } from '../constants';
import type { Testimonial } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

const QuoteIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={`h-12 w-12 text-blue-200 ${className}`} fill="currentColor" viewBox="0 0 32 32">
        <path d="M9.333 22.667h-6.667v-8h6.667v-2.667c0-3.68 2.987-6.667 6.667-6.667h2.667v6.667h-2.667c-0.733 0-1.333 0.6-1.333 1.333v1.333h4l-1.333 8h-2.667v10.667h-6.667v-10.667zM29.333 22.667h-6.667v-8h6.667v-2.667c0-3.68 2.987-6.667 6.667-6.667h2.667v6.667h-2.667c-0.733 0-1.333 0.6-1.333 1.333v1.333h4l-1.333 8h-2.667v10.667h-6.667v-10.667z"></path>
    </svg>
);

const TestimonialCard: React.FC<{ item: Testimonial }> = ({ item }) => (
    <div className="bg-white rounded-lg shadow-lg p-8 relative overflow-hidden">
        <QuoteIcon className="absolute -top-2 -left-2" />
        <p className="text-gray-600 italic mb-6 z-10 relative">"{item.quote}"</p>
        <div className="text-right">
            <p className="font-bold text-[#2c3e50]">{item.name}</p>
            <p className="text-sm text-blue-600">{item.event}</p>
        </div>
    </div>
);

const Testimonials: React.FC = () => {
  const { translations } = useLanguage();
  return (
    <section id="testimonials" className="py-20 bg-gray-100">
      <div className="container mx-auto px-6">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-[#2c3e50] mb-4">{translations.testimonialsTitle}</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {testimonialKeys.map((key) => <TestimonialCard key={key} item={translations.testimonials[key]} />)}
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
