import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Check, X, Trash2, Loader2, ImageOff, Play, ExternalLink, Copy, Trophy
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../../shared/services/lib/supabase';
import { useEventMural, ModerationStatus, MuralItem } from '../../shared/hooks/hooks/useEventMural';
import { useEventContests } from '../../shared/hooks/hooks/useEventContests';
import PromoteToContestModal from '../shared/PromoteToContestModal';

type Tab = ModerationStatus;

const TABS: { key: Tab; label: string }[] = [
  { key: 'pending', label: 'Pendentes' },
  { key: 'approved', label: 'Aprovadas' },
  { key: 'rejected', label: 'Rejeitadas' },
];

const AdminEventMural: React.FC = () => {
  const { id: eventId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [tab, setTab] = useState<Tab>('pending');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [eventTitle, setEventTitle] = useState('');
  const [preview, setPreview] = useState<string | null>(null);
  const [promoting, setPromoting] = useState<MuralItem | null>(null);

  const { items, loading, moderate, moderateMany, removeItem } = useEventMural(eventId || '', tab);
  const {
    contests, promotePhoto, replaceEntryPhoto, findPersonEntries, photoEntryMap,
  } = useEventContests(eventId || '');

  const entriesByPhoto = photoEntryMap();

  useEffect(() => {
    if (!eventId) return;
    supabase
      .from('app_events')
      .select('title')
      .eq('id', eventId)
      .single()
      .then(({ data }) => { if (data?.title) setEventTitle(data.title); });
  }, [eventId]);

  useEffect(() => { setSelected(new Set()); }, [tab]);

  const muralUrl = `${window.location.origin}/eventos/${eventId}/mural`;

  const toggle = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    setSelected(prev => (prev.size === items.length ? new Set() : new Set(items.map(i => i.id))));
  };

  const runBatch = async (decision: 'approved' | 'rejected') => {
    if (selected.size === 0) return;
    setBusy(true);
    try {
      await moderateMany([...selected], decision);
      toast.success(`${selected.size} item(ns) ${decision === 'approved' ? 'aprovado(s)' : 'rejeitado(s)'}.`);
      setSelected(new Set());
    } catch (err: any) {
      toast.error(err.message || 'Erro ao moderar.');
    } finally {
      setBusy(false);
    }
  };

  const runSingle = async (id: string, decision: 'approved' | 'rejected') => {
    setBusy(true);
    try {
      await moderate(id, decision);
      toast.success(decision === 'approved' ? 'Aprovado.' : 'Rejeitado.');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao moderar.');
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (id: string) => {
    const item = items.find(i => i.id === id);
    if (!item) return;
    if (!window.confirm('Excluir permanentemente este item do mural?')) return;

    setBusy(true);
    try {
      await removeItem(item);
      toast.success('Item excluído.');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao excluir.');
    } finally {
      setBusy(false);
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(muralUrl);
      toast.success('Link do mural copiado.');
    } catch {
      toast.error('Não foi possível copiar o link.');
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <button
            onClick={() => navigate('/admin/events')}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Voltar"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Mural do Evento</h1>
            {eventTitle && <p className="text-sm text-gray-500">{eventTitle}</p>}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate(`/admin/events/${eventId}/concursos`)}
            className="flex items-center gap-1.5 px-3 py-2 text-sm bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg transition-colors"
          >
            <Trophy className="w-4 h-4" /> Concursos
          </button>
          <button
            onClick={copyLink}
            className="flex items-center gap-1.5 px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
          >
            <Copy className="w-4 h-4" /> Copiar link
          </button>
          <a
            href={muralUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-2 text-sm bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
          >
            <ExternalLink className="w-4 h-4" /> Abrir mural
          </a>
        </div>
      </div>

      <div className="flex gap-1 border-b border-gray-200">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === key
                ? 'border-purple-600 text-purple-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {label}
            {tab === key && items.length > 0 && (
              <span className="ml-2 px-1.5 py-0.5 text-xs bg-purple-100 text-purple-700 rounded-full">
                {items.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-3 p-3 bg-purple-50 border border-purple-200 rounded-lg">
          <span className="text-sm font-medium text-purple-900">
            {selected.size} selecionado(s)
          </span>
          <div className="flex items-center gap-2 ml-auto">
            {tab !== 'approved' && (
              <button
                onClick={() => runBatch('approved')}
                disabled={busy}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg transition-colors"
              >
                <Check className="w-4 h-4" /> Aprovar
              </button>
            )}
            {tab !== 'rejected' && (
              <button
                onClick={() => runBatch('rejected')}
                disabled={busy}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-lg transition-colors"
              >
                <X className="w-4 h-4" /> Rejeitar
              </button>
            )}
          </div>
        </div>
      )}

      {loading && items.length === 0 ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-7 h-7 animate-spin text-purple-600" />
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-dashed border-gray-300">
          <ImageOff className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-700 font-medium">
            {tab === 'pending' ? 'Nenhum envio aguardando moderação' : `Nenhum item ${tab === 'approved' ? 'aprovado' : 'rejeitado'}`}
          </p>
        </div>
      ) : (
        <>
          <button
            onClick={toggleAll}
            className="text-sm text-purple-700 hover:text-purple-900 font-medium"
          >
            {selected.size === items.length ? 'Limpar seleção' : 'Selecionar todos'}
          </button>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {items.map(item => {
              const isSelected = selected.has(item.id);
              return (
                <div
                  key={item.id}
                  className={`bg-white rounded-xl border overflow-hidden transition-all ${
                    isSelected ? 'border-purple-500 ring-2 ring-purple-200' : 'border-gray-200'
                  }`}
                >
                  <div className="relative aspect-square bg-gray-100">
                    <button
                      onClick={() => setPreview(item.photo_url)}
                      className="w-full h-full"
                    >
                      {item.media_type === 'video' ? (
                        <>
                          <video src={item.photo_url} className="w-full h-full object-cover" preload="metadata" />
                          <span className="absolute inset-0 flex items-center justify-center bg-black/25">
                            <Play className="w-9 h-9 text-white" />
                          </span>
                        </>
                      ) : (
                        <img
                          src={item.photo_url}
                          alt={item.caption || ''}
                          loading="lazy"
                          className="w-full h-full object-cover"
                        />
                      )}
                    </button>

                    <label className="absolute top-2 left-2 p-1.5 bg-white/90 rounded-md cursor-pointer shadow-sm">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggle(item.id)}
                        className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                      />
                    </label>

                    {item.source === 'participant' && (
                      <span className="absolute top-2 right-2 px-1.5 py-0.5 bg-blue-600 text-white text-[10px] font-medium rounded">
                        Participante
                      </span>
                    )}

                    {entriesByPhoto.has(item.id) && (
                      <span className="absolute bottom-2 left-2 flex items-center gap-1 px-1.5 py-0.5 bg-amber-500 text-white text-[10px] font-medium rounded">
                        <Trophy className="w-3 h-3" />
                        {entriesByPhoto.get(item.id)![0].participant_name}
                      </span>
                    )}
                  </div>

                  <div className="p-3 space-y-2">
                    <div className="min-h-[2.5rem]">
                      {item.caption && (
                        <p className="text-sm text-gray-800 line-clamp-2">{item.caption}</p>
                      )}
                      <p className="text-xs text-gray-500 truncate">
                        {item.uploaded_by || 'Sem autor'} ·{' '}
                        {new Date(item.uploaded_at).toLocaleString('pt-BR', {
                          day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
                        })}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {tab === 'approved' ? (
                        <button
                          onClick={() => setPromoting(item)}
                          disabled={busy || item.media_type === 'video'}
                          title={item.media_type === 'video' ? 'Concursos aceitam apenas fotos' : undefined}
                          className="flex-1 flex items-center justify-center gap-1 py-1.5 text-xs bg-amber-50 hover:bg-amber-100 disabled:opacity-40 text-amber-700 rounded-md transition-colors"
                        >
                          <Trophy className="w-3.5 h-3.5" /> Concorrer
                        </button>
                      ) : (
                        <button
                          onClick={() => runSingle(item.id, 'approved')}
                          disabled={busy}
                          className="flex-1 flex items-center justify-center gap-1 py-1.5 text-xs bg-green-50 hover:bg-green-100 disabled:opacity-50 text-green-700 rounded-md transition-colors"
                        >
                          <Check className="w-3.5 h-3.5" /> Aprovar
                        </button>
                      )}
                      {tab !== 'rejected' && (
                        <button
                          onClick={() => runSingle(item.id, 'rejected')}
                          disabled={busy}
                          className="flex-1 flex items-center justify-center gap-1 py-1.5 text-xs bg-red-50 hover:bg-red-100 disabled:opacity-50 text-red-700 rounded-md transition-colors"
                        >
                          <X className="w-3.5 h-3.5" /> Rejeitar
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(item.id)}
                        disabled={busy}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-50 rounded-md transition-colors"
                        title="Excluir permanentemente"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      <PromoteToContestModal
        isOpen={promoting !== null}
        onClose={() => setPromoting(null)}
        eventId={eventId || ''}
        photo={promoting}
        contests={contests}
        findPersonEntries={findPersonEntries}
        onPromote={promotePhoto}
        onReplace={replaceEntryPhoto}
      />

      {preview && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setPreview(null)}
        >
          <button
            onClick={() => setPreview(null)}
            className="absolute top-4 right-4 p-2 bg-white/15 text-white rounded-full"
            aria-label="Fechar"
          >
            <X className="w-6 h-6" />
          </button>
          <img src={preview} alt="" className="max-w-full max-h-[85vh] object-contain" />
        </div>
      )}
    </div>
  );
};

export default AdminEventMural;
