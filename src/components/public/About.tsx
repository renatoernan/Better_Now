import React from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { Heart, Target, Users, Award } from 'lucide-react';
// @ts-ignore
import robertaImage from '../../assets/roberta.png';

const About: React.FC = () => {
  const { translations } = useLanguage();
  return (
    <section id="about" className="py-20 bg-white">
      <div className="container mx-auto px-6">
        <div className="flex flex-col md:flex-row items-center gap-12">
          <div className="md:w-1/3">
            <img src={robertaImage} alt="Roberta Forte" className="rounded-full shadow-2xl mx-auto w-64 h-64 md:w-full md:h-auto object-cover border-8 border-blue-100" />
          </div>
          <div className="md:w-2/3 text-center md:text-left">
            <h2 className="text-4xl font-bold text-[#2c3e50] mb-4">{translations.aboutTitle}</h2>
            <p className="text-lg text-blue-600 font-semibold mb-6">{translations.aboutSubtitle}</p>
            <p className="text-gray-600 leading-relaxed mb-4">
              {translations.aboutParagraph1}
            </p>
            <p className="text-gray-600 leading-relaxed mb-8">
             {translations.aboutParagraph2}
            </p>
            
            {/* Nova seção com Nossa História, Missão e Visão */}
            <div className="mt-8 space-y-6">
              <div>
                <h3 className="text-xl font-bold text-[#2c3e50] mb-3">{translations.ourHistory}</h3>
                <p className="text-gray-600 leading-relaxed">
                  {translations.ourHistoryText}
                </p>
              </div>
              
              <div>
                <h3 className="text-xl font-bold text-[#2c3e50] mb-3">{translations.ourMission}</h3>
                <p className="text-gray-600 leading-relaxed">
                  {translations.ourMissionText}
                </p>
              </div>
              
              <div>
                <h3 className="text-xl font-bold text-[#2c3e50] mb-3">{translations.ourVision}</h3>
                <p className="text-gray-600 leading-relaxed">
                  {translations.ourVisionText}
                </p>
              </div>
            </div>
            
            {/* Cards com valores da empresa */}
            <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="bg-blue-50 p-3 rounded-lg shadow-sm hover:shadow-lg hover:bg-blue-100 transition-all duration-300 border border-blue-100">
                <div className="flex flex-col items-center text-center">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center mb-2">
                    <Heart className="w-4 h-4 text-white" />
                  </div>
                  <h4 className="text-sm font-semibold text-blue-600 mb-1">{translations.passionTitle}</h4>
                  <p className="text-gray-600 text-xs leading-relaxed">
                    {translations.passionText}
                  </p>
                </div>
              </div>
              
              <div className="bg-blue-50 p-3 rounded-lg shadow-sm hover:shadow-lg hover:bg-blue-100 transition-all duration-300 border border-blue-100">
                <div className="flex flex-col items-center text-center">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center mb-2">
                    <Target className="w-4 h-4 text-white" />
                  </div>
                  <h4 className="text-sm font-semibold text-blue-600 mb-1">{translations.excellenceTitle}</h4>
                  <p className="text-gray-600 text-xs leading-relaxed">
                    {translations.excellenceText}
                  </p>
                </div>
              </div>
              
              <div className="bg-blue-50 p-3 rounded-lg shadow-sm hover:shadow-lg hover:bg-blue-100 transition-all duration-300 border border-blue-100">
                <div className="flex flex-col items-center text-center">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center mb-2">
                    <Users className="w-4 h-4 text-white" />
                  </div>
                  <h4 className="text-sm font-semibold text-blue-600 mb-1">{translations.connectionTitle}</h4>
                  <p className="text-gray-600 text-xs leading-relaxed">
                    {translations.connectionText}
                  </p>
                </div>
              </div>
              
              <div className="bg-blue-50 p-3 rounded-lg shadow-sm hover:shadow-lg hover:bg-blue-100 transition-all duration-300 border border-blue-100">
                <div className="flex flex-col items-center text-center">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center mb-2">
                    <Award className="w-4 h-4 text-white" />
                  </div>
                  <h4 className="text-sm font-semibold text-blue-600 mb-1">{translations.qualityTitle}</h4>
                  <p className="text-gray-600 text-xs leading-relaxed">
                    {translations.qualityText}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default About;
