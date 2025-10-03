import React from 'react';
import { EventDescriptionProps, ScheduleItem } from '../../shared/types';

const EventDescription: React.FC<EventDescriptionProps> = ({ 
  basicDescription, 
  detailedDescription, 
  schedule 
}) => {
  return (
    <>
      {/* Descrição básica */}
      {basicDescription && (
        <div className="text-sm text-gray-600 mb-6 leading-relaxed whitespace-pre-line">
          {basicDescription}
        </div>
      )}

      {/* Descrição detalhada */}
      {detailedDescription && (
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Sobre o Evento</h2>
          <div className="prose prose-lg max-w-none text-gray-600 whitespace-pre-line">
            {detailedDescription}
          </div>
        </div>
      )}

      {/* Programação do evento */}
      {schedule && schedule.length > 0 && (
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Programação</h2>
          <div className="space-y-4">
            {schedule.map((item: ScheduleItem, index: number) => (
              <div key={index} className="flex items-start border-l-4 border-blue-600 pl-4">
                <div className="flex-1">
                  <p className="font-semibold text-gray-800">{item.time}</p>
                  <p className="text-gray-600">{item.activity}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
};

export default EventDescription;