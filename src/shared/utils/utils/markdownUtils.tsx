import React from 'react';

/**
 * Utilitário para processar markdown básico
 * Suporta *itálico* e **negrito**
 */

export const parseBasicMarkdown = (text: string): string => {
  if (!text) return '';
  
  // Processar **negrito** primeiro (para evitar conflito com *itálico*)
  let processed = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  
  // Processar *itálico*
  processed = processed.replace(/\*(.*?)\*/g, '<em>$1</em>');
  
  return processed;
};

/**
 * Componente React para renderizar texto com markdown básico
 */
export const MarkdownText: React.FC<{ children: string; className?: string }> = ({ 
  children, 
  className = '' 
}) => {
  const processedText = parseBasicMarkdown(children);
  
  return (
    <div 
      className={`whitespace-pre-line ${className}`}
      dangerouslySetInnerHTML={{ __html: processedText }}
    />
  );
};