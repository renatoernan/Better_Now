import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Camera, ImagePlus, X, Loader2, CheckCircle2, Clock, Play } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../../shared/services/lib/supabase';
import { useEventMural, isAcceptedMedia } from '../../shared/hooks/hooks/useEventMural';

const AUTHOR_STORAGE_KEY = 'mural_author_name';

const EventMural: React.FC = () => {
  const { id: eventId } = useParams<{ id: string }>();
  const { items, loading, submitMedia } = useEventMural(eventId || '', 'approved');

  const [eventTitle, setEventTitle] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [authorName, setAuthorName] = useState('');
  const [caption, setCaption] = useState('');
  const [consent, setConsent] = useState(false);
  const [sending, setSending] = useState(false);
  const [justSent, setJustSent] = useState(false);
  const [lightbox, setLightbox] = useState<number | null>(null);

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Quem já enviou uma foto não deve redigitar o nome a cada envio
    const saved = localStorage.getItem(AUTHOR_STORAGE_KEY);
    if (saved) setAuthorName(saved);
  }, []);

  useEffect(() => {
    if (!eventId) return;
    supabase
      .from('app_events')
      .select('title')
      .eq('id', eventId)
      .single()
      .then(({ data }) => { if (data?.title) setEventTitle(data.title); });
  }, [eventId]);

  useEffect(() => {
    if (!file) { setPreviewUrl(null); return; }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const handlePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = e.target.files?.[0];
    e.target.value = '';
    if (!picked) return;

    if (!isAcceptedMedia(picked)) {
      toast.error('Formato não suportado. Envie uma foto (JPG, PNG, WEBP) ou vídeo (MP4, WEBM).');
      return;
    }
    setFile(picked);
    setJustSent(false);
  };

  const resetForm = () => {
    setFile(null);
    setCaption('');
    setConsent(false);
  };

  const handleSubmit = async () => {
    if (!file) return;
    if (!authorName.trim()) {
      toast.error('Informe seu nome para identificar a foto.');
      return;
    }
    if (!consent) {
      toast.error('É preciso autorizar o uso da imagem para enviar.');
      return;
    }

    setSending(true);
    try {
      await submitMedia(file, { caption, authorName });
      localStorage.setItem(AUTHOR_STORAGE_KEY, authorName.trim());
      resetForm();
      setJustSent(true);
      toast.success('Enviado! Sua foto aparece no mural assim que for aprovada.');
    } catch (err: any) {
      toast.error(err.message || 'Não foi possível enviar. Tente novamente.');
    } finally {
      setSending(false);
    }
  };

  const isVideo = file?.type.startsWith('video/');

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-20 bg-white border-b border-gray-200 px-4 py-3">
        <h1 className="text-lg font-bold text-gray-900 leading-tight">Mural do Evento</h1>
        {eventTitle && <p className="text-sm text-gray-500 truncate">{eventTitle}</p>}
      </header>

      <main className="max-w-2xl mx-auto px-4 py-5 space-y-6">
        {/* Envio */}
        <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          {!file ? (
            <>
              <h2 className="font-semibold text-gray-900 mb-1">Compartilhe seu momento</h2>
              <p className="text-sm text-gray-500 mb-4">
                Sua foto entra no mural depois de aprovada pela organização.
              </p>

              {justSent && (
                <div className="flex items-center gap-2 mb-4 p-3 bg-green-50 text-green-800 rounded-lg text-sm">
                  <Clock className="w-4 h-4 flex-shrink-0" />
                  Recebemos seu envio, ele está aguardando aprovação.
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => cameraInputRef.current?.click()}
                  className="flex flex-col items-center justify-center gap-2 py-6 bg-purple-600 hover:bg-purple-700 text-white rounded-xl transition-colors"
                >
                  <Camera className="w-7 h-7" />
                  <span className="font-medium">Tirar foto</span>
                </button>
                <button
                  onClick={() => galleryInputRef.current?.click()}
                  className="flex flex-col items-center justify-center gap-2 py-6 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl transition-colors"
                >
                  <ImagePlus className="w-7 h-7" />
                  <span className="font-medium">Da galeria</span>
                </button>
              </div>

              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handlePick}
                className="hidden"
              />
              <input
                ref={galleryInputRef}
                type="file"
                accept="image/*,video/mp4,video/webm"
                onChange={handlePick}
                className="hidden"
              />
            </>
          ) : (
            <div className="space-y-4">
              <div className="relative rounded-lg overflow-hidden bg-black">
                {isVideo ? (
                  <video src={previewUrl || ''} className="w-full max-h-72 object-contain" controls />
                ) : (
                  <img src={previewUrl || ''} alt="Pré-visualização" className="w-full max-h-72 object-contain" />
                )}
                <button
                  onClick={resetForm}
                  disabled={sending}
                  className="absolute top-2 right-2 p-2 bg-black/60 text-white rounded-full hover:bg-black/80 transition-colors"
                  aria-label="Remover arquivo selecionado"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div>
                <label htmlFor="mural-author" className="block text-sm font-medium text-gray-700 mb-1">
                  Seu nome
                </label>
                <input
                  id="mural-author"
                  type="text"
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                  placeholder="Como quer ser identificado"
                  maxLength={80}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              <div>
                <label htmlFor="mural-caption" className="block text-sm font-medium text-gray-700 mb-1">
                  Legenda <span className="font-normal text-gray-400">(opcional)</span>
                </label>
                <input
                  id="mural-caption"
                  type="text"
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Escreva algo sobre o momento"
                  maxLength={140}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              <label className="flex items-start gap-2.5 text-sm text-gray-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                />
                <span>
                  Autorizo o uso desta imagem pela organização no mural e na divulgação do evento.
                </span>
              </label>

              <button
                onClick={handleSubmit}
                disabled={sending}
                className="w-full py-3 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {sending ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Enviando...</>
                ) : (
                  <><CheckCircle2 className="w-4 h-4" /> Enviar para o mural</>
                )}
              </button>
            </div>
          )}
        </section>

        {/* Feed */}
        <section>
          <h2 className="font-semibold text-gray-900 mb-3">
            No mural {items.length > 0 && <span className="text-gray-400 font-normal">({items.length})</span>}
          </h2>

          {loading && items.length === 0 ? (
            <div className="flex justify-center py-10">
              <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-10 bg-white rounded-xl border border-dashed border-gray-300">
              <Camera className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-600 font-medium">O mural ainda está vazio</p>
              <p className="text-sm text-gray-400">Seja o primeiro a compartilhar uma foto.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {items.map((item, index) => (
                <button
                  key={item.id}
                  onClick={() => setLightbox(index)}
                  className="relative aspect-square rounded-lg overflow-hidden bg-gray-200 group"
                >
                  {item.media_type === 'video' ? (
                    <>
                      <video src={item.photo_url} className="w-full h-full object-cover" preload="metadata" />
                      <span className="absolute inset-0 flex items-center justify-center bg-black/25">
                        <Play className="w-8 h-8 text-white" />
                      </span>
                    </>
                  ) : (
                    <img
                      src={item.photo_url}
                      alt={item.caption || 'Foto do evento'}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  )}
                  {item.uploaded_by && (
                    <span className="absolute bottom-0 inset-x-0 px-2 py-1 bg-gradient-to-t from-black/70 to-transparent text-white text-[11px] truncate text-left">
                      {item.uploaded_by}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Lightbox */}
      {lightbox !== null && items[lightbox] && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <button
            onClick={() => setLightbox(null)}
            className="absolute top-4 right-4 p-2 bg-white/15 text-white rounded-full"
            aria-label="Fechar"
          >
            <X className="w-6 h-6" />
          </button>

          <div className="max-w-3xl w-full" onClick={(e) => e.stopPropagation()}>
            {items[lightbox].media_type === 'video' ? (
              <video src={items[lightbox].photo_url} className="w-full max-h-[75vh]" controls autoPlay />
            ) : (
              <img
                src={items[lightbox].photo_url}
                alt={items[lightbox].caption || 'Foto do evento'}
                className="w-full max-h-[75vh] object-contain"
              />
            )}
            <div className="mt-3 text-white">
              {items[lightbox].caption && <p className="font-medium">{items[lightbox].caption}</p>}
              {items[lightbox].uploaded_by && (
                <p className="text-sm text-gray-300">por {items[lightbox].uploaded_by}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EventMural;
