import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Plus, Trophy, Trash2, Edit, X, Loader2, Images, AlertTriangle, Users, Tablet,
  Sparkles, MonitorPlay,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../../shared/services/lib/supabase';
import {
  useEventContests, EventContest, ContestInput, ContestStatus,
} from '../../shared/hooks/hooks/useEventContests';

const STATUS_LABEL: Record<ContestStatus, string> = {
  draft: 'Rascunho',
  voting: 'Votação aberta',
  closed: 'Votação encerrada',
  published: 'Resultado publicado',
};

const STATUS_STYLE: Record<ContestStatus, string> = {
  draft: 'bg-gray-100 text-gray-600',
  voting: 'bg-green-100 text-green-700',
  closed: 'bg-amber-100 text-amber-700',
  published: 'bg-blue-100 text-blue-700',
};

const emptyForm: ContestInput = {
  title: '',
  description: '',
  prize_description: '',
  status: 'draft',
  show_live_results: false,
  require_checkin: true,
  allow_self_vote: false,
};

const AdminEventContests: React.FC = () => {
  const { id: eventId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const {
    contests, loading, createContest, updateContest, deleteContest,
    entriesFor, removeEntry, resultsFor, refetchResults,
  } = useEventContests(eventId || '');

  const [eventTitle, setEventTitle] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<EventContest | null>(null);
  const [form, setForm] = useState<ContestInput>(emptyForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!eventId) return;
    supabase
      .from('app_events')
      .select('title')
      .eq('id', eventId)
      .single()
      .then(({ data }) => { if (data?.title) setEventTitle(data.title); });
  }, [eventId]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setShowForm(true);
  };

  const openEdit = (c: EventContest) => {
    setEditing(c);
    setForm({
      title: c.title,
      description: c.description || '',
      prize_description: c.prize_description || '',
      status: c.status,
      show_live_results: c.show_live_results,
      require_checkin: c.require_checkin,
      allow_self_vote: c.allow_self_vote,
    });
    setShowForm(true);
  };

  const save = async () => {
    if (!form.title.trim()) { toast.error('Dê um título ao concurso.'); return; }
    setSaving(true);
    try {
      if (editing) {
        await updateContest(editing.id, form);
        toast.success('Concurso atualizado.');
      } else {
        await createContest(form);
        toast.success('Concurso criado.');
      }
      setShowForm(false);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao salvar concurso.');
    } finally {
      setSaving(false);
    }
  };

  const changeStatus = async (c: EventContest, status: ContestStatus) => {
    try {
      await updateContest(c.id, { status });
      toast.success(`Concurso marcado como "${STATUS_LABEL[status]}".`);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao mudar o estado.');
    }
  };

  /**
   * A revelação é irreversível na prática: assim que o telão mostra o vencedor,
   * não dá para "desmostrar". Por isso confirma nominalmente antes.
   */
  const revealWinner = async (c: EventContest) => {
    const ranking = resultsFor(c.id);
    if (ranking.length === 0) {
      toast.error('Nenhum voto computado neste concurso.');
      return;
    }
    const winner = ranking[0];
    const tied = ranking.filter(r => r.vote_count === winner.vote_count).length > 1;

    const message = tied
      ? `Há empate em ${winner.vote_count} voto(s). Pelo critério de desempate, ${winner.participant_name} vence por ter recebido o primeiro voto. Revelar no telão?`
      : `Revelar ${winner.participant_name} como vencedor de "${c.title}" no telão, com ${winner.vote_count} voto(s)?`;

    if (!window.confirm(message)) return;

    try {
      await updateContest(c.id, { status: 'published' });
      toast.success(`${winner.participant_name} revelado no telão.`);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao revelar o vencedor.');
    }
  };

  const handleDelete = async (c: EventContest) => {
    if (!window.confirm(`Excluir o concurso "${c.title}"? As candidaturas também saem.`)) return;
    try {
      await deleteContest(c.id);
      toast.success('Concurso excluído.');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao excluir.');
    }
  };

  const handleRemoveEntry = async (entryId: string, name: string) => {
    if (!window.confirm(`Tirar ${name} do concurso?`)) return;
    try {
      await removeEntry(entryId);
      toast.success('Candidatura removida.');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao remover.');
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
            <h1 className="text-xl font-bold text-gray-900">Concursos</h1>
            {eventTitle && <p className="text-sm text-gray-500">{eventTitle}</p>}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <a
            href={`/eventos/${eventId}/telao`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-2 text-sm bg-gray-900 hover:bg-gray-800 text-white rounded-lg transition-colors"
          >
            <MonitorPlay className="w-4 h-4" /> Abrir telão
          </a>
          <button
            onClick={() => navigate(`/admin/events/${eventId}/mural`)}
            className="flex items-center gap-1.5 px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
          >
            <Images className="w-4 h-4" /> Ir ao mural
          </button>
          <button
            onClick={openCreate}
            className="flex items-center gap-1.5 px-3 py-2 text-sm bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" /> Novo concurso
          </button>
        </div>
      </div>

      {loading && contests.length === 0 ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-7 h-7 animate-spin text-purple-600" />
        </div>
      ) : contests.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-dashed border-gray-300">
          <Trophy className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-700 font-medium mb-1">Nenhum concurso neste evento</p>
          <p className="text-sm text-gray-500 mb-4">
            Crie um concurso para começar a inscrever fotos do mural.
          </p>
          <button
            onClick={openCreate}
            className="px-4 py-2 text-sm bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
          >
            Criar o primeiro
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {contests.map(c => {
            const list = entriesFor(c.id);
            return (
              <div key={c.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="p-4 flex flex-wrap items-start justify-between gap-3 border-b">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="font-bold text-gray-900">{c.title}</h2>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_STYLE[c.status]}`}>
                        {STATUS_LABEL[c.status]}
                      </span>
                    </div>
                    {c.description && <p className="text-sm text-gray-600 mt-1">{c.description}</p>}
                    {c.prize_description && (
                      <p className="text-sm text-amber-700 mt-1">Prêmio: {c.prize_description}</p>
                    )}
                    <p className="text-xs text-gray-500 mt-1.5 flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" />
                      {list.length} candidatura{list.length !== 1 ? 's' : ''}
                      {c.show_live_results ? ' · placar ao vivo' : ' · resultado lacrado'}
                      {c.require_checkin && ' · exige check-in'}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {c.status === 'voting' && (
                      <button
                        onClick={() => navigate(`/admin/events/${eventId}/concursos/${c.id}/tablet`)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                      >
                        <Tablet className="w-4 h-4" /> Abrir tablet
                      </button>
                    )}
                    {c.status === 'closed' && (
                      <button
                        onClick={() => revealWinner(c)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition-colors"
                      >
                        <Sparkles className="w-4 h-4" /> Revelar no telão
                      </button>
                    )}
                    <select
                      value={c.status}
                      onChange={(e) => changeStatus(c, e.target.value as ContestStatus)}
                      className="text-sm px-2 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    >
                      {(Object.keys(STATUS_LABEL) as ContestStatus[]).map(s => (
                        <option key={s} value={s}>{STATUS_LABEL[s]}</option>
                      ))}
                    </select>
                    <button
                      onClick={() => openEdit(c)}
                      className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                      title="Editar"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(c)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Excluir"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {c.status !== 'draft' && (() => {
                  const ranking = resultsFor(c.id);
                  const total = ranking.reduce((sum, r) => sum + Number(r.vote_count), 0);
                  if (ranking.length === 0) return null;
                  return (
                    <div className="px-4 py-3 bg-gray-50 border-b">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-semibold text-gray-700">
                          Apuração · {total} voto{total !== 1 ? 's' : ''}
                        </h3>
                        <button
                          onClick={() => refetchResults()}
                          className="text-xs text-purple-700 hover:text-purple-900 font-medium"
                        >
                          Atualizar
                        </button>
                      </div>
                      <ol className="space-y-1">
                        {ranking.slice(0, 5).map((r, i) => (
                          <li key={r.entry_id} className="flex items-center gap-2 text-sm">
                            <span className={`w-5 text-center font-bold ${i === 0 ? 'text-amber-500' : 'text-gray-400'}`}>
                              {i + 1}
                            </span>
                            <span className="flex-1 truncate text-gray-800">{r.participant_name}</span>
                            <span className="font-semibold text-gray-900">{r.vote_count}</span>
                          </li>
                        ))}
                      </ol>
                      {!c.show_live_results && (
                        <p className="text-xs text-gray-500 mt-2">
                          Resultado lacrado: só a organização enxerga esta contagem.
                        </p>
                      )}
                    </div>
                  );
                })()}

                <div className="p-4">
                  {list.length === 0 ? (
                    <p className="text-sm text-gray-500">
                      Nenhuma foto inscrita. Vá ao mural e use "Concorrer" nas fotos aprovadas.
                    </p>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
                      {list.map(e => (
                        <div key={e.id} className="relative group">
                          <div className="aspect-square rounded-lg overflow-hidden bg-gray-100">
                            {e.photo && (
                              <img
                                src={e.photo.photo_url}
                                alt={e.participant_name}
                                loading="lazy"
                                className="w-full h-full object-contain"
                              />
                            )}
                          </div>
                          <p className="mt-1 text-xs text-gray-800 truncate font-medium">
                            {e.participant_name}
                          </p>
                          {!e.participant_person_id && (
                            <p className="text-[10px] text-amber-600 flex items-center gap-0.5">
                              <AlertTriangle className="w-3 h-3" /> sem cadastro
                            </p>
                          )}
                          <button
                            onClick={() => handleRemoveEntry(e.id, e.participant_name)}
                            className="absolute top-1.5 right-1.5 p-1 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Remover do concurso"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-bold text-gray-900">
                {editing ? 'Editar concurso' : 'Novo concurso'}
              </h3>
              <button onClick={() => setShowForm(false)} className="p-1.5 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-4 overflow-y-auto">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Título</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Ex.: Fantasia mais assustadora"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descrição <span className="font-normal text-gray-400">(opcional)</span>
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Prêmio <span className="font-normal text-gray-400">(opcional)</span>
                </label>
                <input
                  type="text"
                  value={form.prize_description}
                  onChange={(e) => setForm({ ...form, prize_description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              <div className="space-y-2.5 pt-1">
                <label className="flex items-start gap-2.5 text-sm text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.show_live_results}
                    onChange={(e) => setForm({ ...form, show_live_results: e.target.checked })}
                    className="mt-0.5 w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                  />
                  <span>
                    Mostrar placar ao vivo
                    <span className="block text-xs text-gray-500">
                      Empolga o público, mas quem lidera cedo tende a atrair mais votos.
                    </span>
                  </span>
                </label>

                <label className="flex items-start gap-2.5 text-sm text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.require_checkin}
                    onChange={(e) => setForm({ ...form, require_checkin: e.target.checked })}
                    className="mt-0.5 w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                  />
                  <span>
                    Só vota quem fez check-in
                    <span className="block text-xs text-gray-500">
                      Restringe o voto a quem está presente no evento.
                    </span>
                  </span>
                </label>

                <label className="flex items-start gap-2.5 text-sm text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.allow_self_vote}
                    onChange={(e) => setForm({ ...form, allow_self_vote: e.target.checked })}
                    className="mt-0.5 w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                  />
                  <span>Permitir votar em si mesmo</span>
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 p-4 border-t bg-gray-50">
              <button
                onClick={() => setShowForm(false)}
                disabled={saving}
                className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={save}
                disabled={saving}
                className="px-4 py-2 text-sm bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-lg transition-colors flex items-center gap-2"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {editing ? 'Salvar' : 'Criar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminEventContests;
