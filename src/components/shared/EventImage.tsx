import React from 'react';
import { Share2 } from 'lucide-react';
import { EventImageProps } from '../../types/event';

const EventImage: React.FC<EventImageProps> = ({ imageUrl, title, onShare }) => {
  if (!imageUrl) return null;

  return (
    <div className="w-full h-48 md:h-64 bg-gradient-to-r from-blue-600 to-purple-600 relative">
      <img 
        src={imageUrl} 
        alt={title}
        className="w-full h-full object-fill"
      />
      <div className="absolute inset-0 bg-black bg-opacity-30"></div>
      <button 
        onClick={onShare}
        className="absolute top-4 right-4 bg-white bg-opacity-20 backdrop-blur-sm text-white p-3 rounded-full hover:bg-opacity-30 transition-all"
        aria-label="Compartilhar evento"
      >
        <Share2 className="w-5 h-5" />
      </button>
    </div>
  );
};

export default EventImage;