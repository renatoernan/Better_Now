import React from 'react';
import { useLanguage } from '../../shared/contexts/contexts/LanguageContext';
import { Heart, Target, Users, Award } from 'lucide-react';
import robertaImage from '../../assets/roberta.png';

const About: React.FC = () => {
  const { translations } = useLanguage();
  
  return (
    <section 
      id="about" 
      className="py-12 sm:py-16 lg:py-20 xl:py-24 
                 bg-white"
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Layout principal - Mobile First */}
        <div className="flex flex-col lg:flex-row items-center gap-8 sm:gap-12 lg:gap-16">
          
          {/* Imagem da Roberta - Mobile First */}
          <div className="w-full lg:w-1/3 flex justify-center">
            <img 
              src={robertaImage} 
              alt="Roberta Forte" 
              className="rounded-full shadow-2xl 
                         w-48 h-48 sm:w-56 sm:h-56 md:w-64 md:h-64 lg:w-full lg:h-auto 
                         object-cover 
                         border-4 sm:border-6 lg:border-8 
                         border-blue-100
                         max-w-sm lg:max-w-none" 
            />
          </div>
          
          {/* Conteúdo textual - Mobile First */}
          <div className="w-full lg:w-2/3 text-center lg:text-left">
            {/* Título principal */}
            <h2 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl 
                           font-bold text-[#2c3e50] 
                           mb-3 sm:mb-4 lg:mb-6 
                           leading-tight">
              {translations.aboutTitle}
            </h2>
            
            {/* Subtítulo */}
            <p className="text-base sm:text-lg lg:text-xl 
                          text-blue-600 font-semibold 
                          mb-4 sm:mb-6 lg:mb-8">
              {translations.aboutSubtitle}
            </p>
            
            {/* Parágrafos principais */}
            <div className="space-y-3 sm:space-y-4 lg:space-y-6 mb-6 sm:mb-8 lg:mb-10">
              <p className="text-sm sm:text-base lg:text-lg 
                            text-gray-600 leading-relaxed">
                {translations.aboutParagraph1}
              </p>
              <p className="text-sm sm:text-base lg:text-lg 
                            text-gray-600 leading-relaxed">
                {translations.aboutParagraph2}
              </p>
            </div>
            
            {/* Seção História, Missão e Visão - Mobile First */}
            <div className="space-y-4 sm:space-y-6 lg:space-y-8 mb-8 sm:mb-10 lg:mb-12">
              <div>
                <h3 className="text-lg sm:text-xl lg:text-2xl 
                               font-bold text-[#2c3e50] 
                               mb-2 sm:mb-3 
                               leading-tight">
                  {translations.ourHistory}
                </h3>
                <p className="text-sm sm:text-base lg:text-lg 
                              text-gray-600 leading-relaxed">
                  {translations.ourHistoryText}
                </p>
              </div>
              
              <div>
                <h3 className="text-lg sm:text-xl lg:text-2xl 
                               font-bold text-[#2c3e50] 
                               mb-2 sm:mb-3 
                               leading-tight">
                  {translations.ourMission}
                </h3>
                <p className="text-sm sm:text-base lg:text-lg 
                              text-gray-600 leading-relaxed">
                  {translations.ourMissionText}
                </p>
              </div>
              
              <div>
                <h3 className="text-lg sm:text-xl lg:text-2xl 
                               font-bold text-[#2c3e50] 
                               mb-2 sm:mb-3 
                               leading-tight">
                  {translations.ourVision}
                </h3>
                <p className="text-sm sm:text-base lg:text-lg 
                              text-gray-600 leading-relaxed">
                  {translations.ourVisionText}
                </p>
              </div>
            </div>
            
            {/* Cards com valores da empresa - Mobile First */}
            <div className="grid grid-cols-1 
                            sm:grid-cols-2 
                            lg:grid-cols-4 
                            gap-3 sm:gap-4 lg:gap-6">
              
              {/* Card Paixão */}
              <div className="bg-blue-50 
                              p-3 sm:p-4 lg:p-5 
                              rounded-lg shadow-sm 
                              hover:shadow-lg hover:bg-blue-100 
                              transition-all duration-300 
                              border border-blue-100
                              focus-within:ring-2 focus-within:ring-blue-300/50">
                <div className="flex flex-col items-center text-center">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 
                                  bg-gradient-to-br from-blue-500 to-blue-600 
                                  rounded-full flex items-center justify-center 
                                  mb-2 sm:mb-3">
                    <Heart className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-white" />
                  </div>
                  <h4 className="text-sm sm:text-base lg:text-lg 
                                 font-semibold text-blue-600 
                                 mb-1 sm:mb-2 
                                 leading-tight">
                    {translations.passionTitle}
                  </h4>
                  <p className="text-xs sm:text-sm lg:text-base 
                                text-gray-600 leading-relaxed">
                    {translations.passionText}
                  </p>
                </div>
              </div>
              
              {/* Card Excelência */}
              <div className="bg-blue-50 
                              p-3 sm:p-4 lg:p-5 
                              rounded-lg shadow-sm 
                              hover:shadow-lg hover:bg-blue-100 
                              transition-all duration-300 
                              border border-blue-100
                              focus-within:ring-2 focus-within:ring-blue-300/50">
                <div className="flex flex-col items-center text-center">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 
                                  bg-gradient-to-br from-blue-500 to-blue-600 
                                  rounded-full flex items-center justify-center 
                                  mb-2 sm:mb-3">
                    <Target className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-white" />
                  </div>
                  <h4 className="text-sm sm:text-base lg:text-lg 
                                 font-semibold text-blue-600 
                                 mb-1 sm:mb-2 
                                 leading-tight">
                    {translations.excellenceTitle}
                  </h4>
                  <p className="text-xs sm:text-sm lg:text-base 
                                text-gray-600 leading-relaxed">
                    {translations.excellenceText}
                  </p>
                </div>
              </div>
              
              {/* Card Conexão */}
              <div className="bg-blue-50 
                              p-3 sm:p-4 lg:p-5 
                              rounded-lg shadow-sm 
                              hover:shadow-lg hover:bg-blue-100 
                              transition-all duration-300 
                              border border-blue-100
                              focus-within:ring-2 focus-within:ring-blue-300/50">
                <div className="flex flex-col items-center text-center">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 
                                  bg-gradient-to-br from-blue-500 to-blue-600 
                                  rounded-full flex items-center justify-center 
                                  mb-2 sm:mb-3">
                    <Users className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-white" />
                  </div>
                  <h4 className="text-sm sm:text-base lg:text-lg 
                                 font-semibold text-blue-600 
                                 mb-1 sm:mb-2 
                                 leading-tight">
                    {translations.connectionTitle}
                  </h4>
                  <p className="text-xs sm:text-sm lg:text-base 
                                text-gray-600 leading-relaxed">
                    {translations.connectionText}
                  </p>
                </div>
              </div>
              
              {/* Card Qualidade */}
              <div className="bg-blue-50 
                              p-3 sm:p-4 lg:p-5 
                              rounded-lg shadow-sm 
                              hover:shadow-lg hover:bg-blue-100 
                              transition-all duration-300 
                              border border-blue-100
                              focus-within:ring-2 focus-within:ring-blue-300/50">
                <div className="flex flex-col items-center text-center">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 
                                  bg-gradient-to-br from-blue-500 to-blue-600 
                                  rounded-full flex items-center justify-center 
                                  mb-2 sm:mb-3">
                    <Award className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-white" />
                  </div>
                  <h4 className="text-sm sm:text-base lg:text-lg 
                                 font-semibold text-blue-600 
                                 mb-1 sm:mb-2 
                                 leading-tight">
                    {translations.qualityTitle}
                  </h4>
                  <p className="text-xs sm:text-sm lg:text-base 
                                text-gray-600 leading-relaxed">
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
