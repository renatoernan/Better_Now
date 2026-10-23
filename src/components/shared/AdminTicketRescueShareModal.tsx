import React, { useState } from 'react';
import {
  X,
  Share2,
  Copy,
  Check,
  ExternalLink,
  MessageSquare,
  QrCode,
  ShieldCheck,
  Sparkles,
  Ticket,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { toast } from 'sonner';

interface EventSummary {
  id: string;
  title: string;
  event_date?: string | null;
  location?: string | null;
}

interface AdminTicketRescueShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: EventSummary | null;
}

export const AdminTicketRescueShareModal: React.FC<AdminTicketRescueShareModalProps> = ({
  isOpen,
  onClose,
  event,
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedMsg, setCopiedMsg] = useState(false);

  if (!isOpen || !event) return null;

  const origin = window.location.origin;
  const rescueUrl = `${origin}/eventos/${event.id}/resgate`;

  const groupMessage =
    `🎫 *Perdeu seu ingresso ou QR Code do evento ${event.title}?*\n\n` +
    `Não se preocupe! Acesse o link oficial seguro do nosso evento, informe seu *CPF de comprador* e resgate todos os seus ingressos instantaneamente com QR Code para check-in na portaria:\n\n` +
    `👉 ${rescueUrl}\n\n` +
    `📲 Na tela de resgate, você também pode clicar em *"Enviar pro meu WhatsApp"* para receber tudo na sua conversa. Aproveite o evento! 🎉`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(rescueUrl);
    setCopiedLink(true);
    toast.success('Link de resgate copiado para a área de transferência!');
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleCopyGroupMessage = () => {
    navigator.clipboard.writeText(groupMessage);
    setCopiedMsg(true);
    toast.success('Mensagem formatada copiada! Cole no grupo de WhatsApp.');
    setTimeout(() => setCopiedMsg(false), 2500);
  };

  const handleOpenWhatsAppShare = () => {
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(groupMessage)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl border border-gray-100 flex flex-col max-h-[92vh]">
        {/* Header com identidade visual Better Now */}
        <div className="bg-gradient-to-r from-indigo-700 via-indigo-800 to-indigo-950 p-6 text-white relative">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-5 right-5 text-indigo-200 hover:text-white p-1.5 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 bg-white/20 rounded-2xl backdrop-blur-sm border border-white/20">
              <Ticket className="w-6 h-6 text-white" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-indigo-200 uppercase tracking-wider flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> Portal de Resgate
              </span>
              <h2 className="text-xl sm:text-2xl font-extrabold text-white">
                Link de Resgate de Ingressos
              </h2>
            </div>
          </div>

          <p className="text-xs sm:text-sm text-indigo-100 leading-relaxed mt-2">
            Compartilhe este link no grupo de WhatsApp do evento para que qualquer comprador que perdeu o
            QR Code possa consultar todos os ingressos pelo CPF e enviá-los ao próprio WhatsApp.
          </p>
        </div>

        {/* Conteúdo com abas / cards */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Card do Link Direto com QR Code */}
          <div className="bg-gray-50 rounded-2xl p-4 sm:p-5 border border-gray-200 space-y-3">
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
              Link Seguro do Evento:
            </label>

            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={rescueUrl}
                className="w-full bg-white text-gray-800 text-xs sm:text-sm font-mono px-3.5 py-2.5 rounded-xl border border-gray-300 select-all outline-none"
              />

              <button
                type="button"
                onClick={handleCopyLink}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors shrink-0 cursor-pointer"
              >
                {copiedLink ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-300" />
                    <span>Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Copiar</span>
                  </>
                )}
              </button>
            </div>

            {/* QR Code de teste rápido */}
            <div className="pt-2 flex items-center gap-3">
              <div className="p-1.5 bg-white rounded-xl border border-gray-200 shadow-2xs">
                <QRCodeSVG value={rescueUrl} size={64} level="M" />
              </div>
              <div className="text-[11px] text-gray-500 space-y-0.5">
                <p className="font-semibold text-gray-700">QR Code de Acesso Rápido</p>
                <p>Abra a câmera do celular para testar a página no smartphone.</p>
              </div>
            </div>
          </div>

          {/* Prévia da Mensagem para WhatsApp */}
          <div className="bg-emerald-50/60 rounded-2xl p-4 sm:p-5 border border-emerald-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-emerald-900 uppercase tracking-wider flex items-center gap-1.5">
                <MessageSquare className="w-4 h-4 text-emerald-600" />
                Mensagem Pronta para o Grupo de WhatsApp:
              </label>

              <button
                type="button"
                onClick={handleCopyGroupMessage}
                className="text-xs text-emerald-700 hover:text-emerald-900 font-bold inline-flex items-center gap-1 cursor-pointer"
              >
                {copiedMsg ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedMsg ? 'Copiada!' : 'Copiar Texto'}</span>
              </button>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-emerald-200 text-xs text-gray-700 font-sans whitespace-pre-wrap leading-relaxed shadow-2xs">
              {groupMessage}
            </div>

            <div className="pt-1 flex flex-wrap gap-2.5">
              <button
                type="button"
                onClick={handleOpenWhatsAppShare}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                <Share2 className="w-4 h-4" />
                <span>Enviar no WhatsApp</span>
              </button>

              <button
                type="button"
                onClick={() => window.open(rescueUrl, '_blank')}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-white hover:bg-gray-100 text-gray-700 border border-gray-300 font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Testar Link</span>
              </button>
            </div>
          </div>
        </div>

        {/* Rodapé do Modal */}
        <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminTicketRescueShareModal;
