import React from 'react';
import { Calendar, Clock, MapPin, Users } from 'lucide-react';
import { EventInfoProps } from '../../shared/types';
import { formatDate, formatTime, formatTimeFromString } from '../../shared/utils/utils/eventUtils';
import { MarkdownText } from '../../shared/utils/utils/markdownUtils';

const EventInfo: React.FC<EventInfoProps> = ({ 
  title, 
  date, 
  time, 
  endTime, 
  location, 
  locationLink, 
  maxParticipants, 
  eventType, 
  description 
}) => {
  return (
    <>
      <h1 className="text-3xl font-bold text-gray-800 mb-4">{title}</h1>
      <MarkdownText className="text-gray-600 mb-6">{description}</MarkdownText>
      
      <div className="space-y-6 mb-8">
        {/* Data e Horário na mesma linha */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex items-center">
            <Calendar className="w-6 h-6 text-blue-600 mr-3" />
            <div>
              <p className="text-sm text-gray-500">Data</p>
              <p className="font-semibold text-gray-800">
                {formatDate(date)}
              </p>
            </div>
          </div>
          
          <div className="flex items-center">
            <Clock className="w-6 h-6 text-blue-600 mr-3" />
            <div>
              <p className="text-sm text-gray-500">Horário</p>
              <p className="font-semibold text-gray-800">
                {time ? formatTimeFromString(time) : formatTime(date)}
                {endTime && ` - ${formatTimeFromString(endTime)}`}
              </p>
            </div>
          </div>
        </div>
        
        {/* Local ocupando toda a largura */}
        {location && (
          <div className="flex items-start">
            <MapPin className="w-6 h-6 text-blue-600 mr-3 mt-1" />
            <div className="flex-1">
              <p className="text-sm text-gray-500">Local</p>
              <p className="font-semibold text-gray-800 whitespace-pre-line">
                {location}
              </p>
              {locationLink && (
                <a
                  href={locationLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center mt-2 px-3 py-1 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
                >
                  <MapPin className="w-4 h-4 mr-1" />
                  Ver no mapa
                </a>
              )}
            </div>
          </div>
        )}
        
        {/* Vagas */}
        {maxParticipants && (
          <div className="flex items-center">
            <Users className="w-6 h-6 text-blue-600 mr-3" />
            <div>
              <p className="text-sm text-gray-500">Vagas</p>
              <p className="font-semibold text-gray-800">
                {maxParticipants} pessoas
              </p>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default EventInfo;