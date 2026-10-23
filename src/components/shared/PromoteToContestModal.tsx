import React, { useState, useEffect, useMemo } from 'react';
import { X, Search, Trophy, AlertTriangle, Loader2, UserCheck, Check, User, Users, Heart } from 'lucide-react';
import { toast } from 'sonner';
import {
  EventContest, ContestEntry, ParticipantRef, EventParticipantOption, ContestEntryType, searchEventParticipants,
} from '../../shared/hooks/hooks/useEventContests';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  photo: { id: string; photo_url: string; uploaded_by?: string | null } | null;
  contests: EventContest[];
  findPersonEntries: (contestId: string, personId?: string | null, name?: string) => ContestEntry[];
  onPromote: (contestId: string, photoId: string, participant: ParticipantRef) => Promise<unknown>;
  onReplace: (entryId: string, newPhotoId: string) => Promise<unknown>;
}

const PromoteToContestModal: React.FC<Props> = ({
  isOpen, onClose, eventId, photo, contests, findPersonEntries, onPromote, onReplace,
}) => {
  const [contestId, setContestId] = useState('');
  const [entryType, setEntryType] = useState<ContestEntryType>('individual');
  const [term, setTerm] = useState('');
  const [options, setOptions] = useState<EventParticipantOption[]>([]);
  const [searching, setSearching] = useState(false);
  const [picked, setPicked] = useState<EventParticipantOption | null>(null);
  const [freeName, setFreeName] = useState('');
  const [groupThemeName, setGroupThemeName] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setContestId(contests.length === 1 ? contests[0].id : '');
    setEntryType('individual');
    setTerm('');
    setPicked(null);
    setFreeName(photo?.uploaded_by || '');
    setGroupThemeName('');
    setOptions([]);
  }, [isOpen, contests, photo]);

  useEffect(() => {
    if (!isOpen || !eventId || entryType !== 'individual') return;
    let active = true;
    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        const result = await searchEventParticipants(eventId, term);
        if (active) setOptions(result);
      } catch {
        if (active) setOptions([]);
      } finally {
        if (active) setSearching(false);
      }
    }, 300);
    return () => { active = false; clearTimeout(timer); };
  }, [isOpen, eventId, term, entryType]);

  const effectiveIndividualName = picked?.name || freeName;

  const conflicts = useMemo(() => {
    if (entryType !== 'individual' || !contestId || !effectiveIndividualName) return [];
    return findPersonEntries(contestId, picked?.personId, effectiveIndividualName);
  }, [entryType, contestId, picked, effectiveIndividualName, findPersonEntries]);

  if (!isOpen || !photo) return null;

  const submit = async (mode: 'new' | 'replace') => {
    if (!contestId) { toast.error('Escolha o concurso.'); return; }

    if (entryType === 'individual' && !effectiveIndividualName.trim()) {
      toast.error('Identifique quem aparece na foto.');
      return;
    }

    setSaving(true);
    try {
      if (entryType === 'individual' && mode === 'replace' && conflicts[0]) {
        await onReplace(conflicts[0].id, photo.id);
        toast.success(`Foto de ${effectiveIndividualName} trocada no concurso.`);
      } else {
        const payloadName = entryType === 'individual'
          ? effectiveIndividualName.trim()
          : (groupThemeName.trim() || null);

        await onPromote(contestId, photo.id, {
          name: payloadName,
          entryType,
          personId: entryType === 'individual' ? (picked?.personId || null) : null,
          ticketId: entryType === 'individual' ? (picked?.ticketId || null) : null,
        });

        const displayLabel = payloadName || (entryType === 'group' ? 'Grupo' : entryType === 'couple' ? 'Casal' : 'Candidato');
        toast.success(`${displayLabel} está concorrendo.`);
      }
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Não foi possível inscrever.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] flex flex-col shadow-2xl border border-gray-100">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-bold text-gray-900 flex items-center gap-2 text-base">
            <Trophy className="w-5 h-5 text-amber-500" /> Colocar para concorrer
          </h3>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600 transition-colors" aria-label="Fechar">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4 overflow-y-auto">
          <div className="flex gap-3">
            <img src={photo.photo_url} alt="" className="w-20 h-20 object-contain bg-gray-100 dark:bg-gray-900 rounded-lg flex-shrink-0 border" />
            <div className="text-sm text-gray-500 self-center">
              Esta foto vira uma candidatura no concurso escolhido e fica disponível para votação dos convidados.
            </div>
          </div>

          {contests.length === 0 ? (
            <div className="p-3 bg-amber-50 text-amber-800 rounded-lg text-sm border border-amber-200">
              Nenhum concurso criado para este evento ainda. Crie um concurso antes de inscrever fotos.
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Concurso</label>
              <div className="space-y-1.5">
                {contests.map(c => (
                  <label
                    key={c.id}
                    className={`flex items-center gap-2.5 p-2.5 border rounded-lg cursor-pointer transition-colors ${
                      contestId === c.id ? 'border-purple-500 bg-purple-50/70 shadow-sm' : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="contest"
                      checked={contestId === c.id}
                      onChange={() => setContestId(c.id)}
                      className="text-purple-600 focus:ring-purple-500"
                    />
                    <span className="flex-1 text-sm font-medium text-gray-800">{c.title}</span>
                    {c.status !== 'draft' && (
                      <span className="text-xs px-1.5 py-0.5 bg-gray-200 text-gray-600 rounded">
                        {c.status === 'voting' ? 'votação aberta' : c.status}
                      </span>
                    )}
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Seletor de Modalidade: Individual, Grupo ou Casal */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Modalidade da Candidatura
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setEntryType('individual')}
                className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg border text-sm font-medium transition-all ${
                  entryType === 'individual'
                    ? 'border-purple-600 bg-purple-50 text-purple-700 shadow-sm font-semibold'
                    : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <User className="w-4 h-4" /> Individual
              </button>

              <button
                type="button"
                onClick={() => setEntryType('group')}
                className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg border text-sm font-medium transition-all ${
                  entryType === 'group'
                    ? 'border-purple-600 bg-purple-50 text-purple-700 shadow-sm font-semibold'
                    : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Users className="w-4 h-4 text-purple-600" /> Grupo
              </button>

              <button
                type="button"
                onClick={() => setEntryType('couple')}
                className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg border text-sm font-medium transition-all ${
                  entryType === 'couple'
                    ? 'border-purple-600 bg-purple-50 text-purple-700 shadow-sm font-semibold'
                    : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Heart className="w-4 h-4 text-rose-500" /> Casal
              </button>
            </div>
          </div>

          {/* Conteúdo específico por modalidade */}
          {entryType === 'individual' ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Quem aparece na foto
              </label>
              <div className="relative mb-2">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={term}
                  onChange={(e) => { setTerm(e.target.value); setPicked(null); }}
                  placeholder="Buscar entre os ingressos do evento"
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
                {searching && (
                  <Loader2 className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 animate-spin" />
                )}
              </div>

              {options.length > 0 && (
                <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-lg divide-y mb-2 shadow-inner">
                  {options.map(o => (
                    <button
                      key={o.ticketId || o.personId}
                      onClick={() => { setPicked(o); setFreeName(o.name); }}
                      className={`w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50 transition-colors ${
                        picked?.personId === o.personId ? 'bg-purple-50' : ''
                      }`}
                    >
                      {picked?.personId === o.personId
                        ? <Check className="w-4 h-4 text-purple-600 flex-shrink-0" />
                        : <UserCheck className="w-4 h-4 text-gray-300 flex-shrink-0" />}
                      <span className="flex-1 truncate">{o.name}</span>
                      {o.checkedIn && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-green-100 text-green-700 rounded">
                          check-in
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}

              <input
                type="text"
                value={freeName}
                onChange={(e) => { setFreeName(e.target.value); setPicked(null); }}
                placeholder="Ou digite o nome, se não estiver na lista"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
              {picked && (
                <p className="mt-1.5 text-xs text-green-700 flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" /> Vinculado ao cadastro de {picked.name}.
                </p>
              )}

              {conflicts.length > 0 && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg mt-3">
                  <div className="flex gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-amber-900">
                      <p className="font-medium mb-1">{effectiveIndividualName} já está concorrendo neste concurso.</p>
                      <p className="text-amber-800 text-xs">
                        Inscrever uma segunda foto divide os votos entre as duas e prejudica
                        o próprio participante. Prefira trocar a foto.
                      </p>
                    </div>
                  </div>
                  {conflicts[0].photo && (
                    <img
                      src={conflicts[0].photo.photo_url}
                      alt=""
                      className="w-14 h-14 object-contain bg-gray-100 dark:bg-gray-900 rounded mt-2 ml-6 border"
                    />
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="p-3.5 bg-purple-50/70 border border-purple-100 rounded-xl space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-800 mb-1">
                  {entryType === 'group' ? 'Nome ou Tema do Grupo (opcional)' : 'Identificação do Casal (opcional)'}
                </label>
                <input
                  type="text"
                  value={groupThemeName}
                  onChange={(e) => setGroupThemeName(e.target.value)}
                  placeholder={
                    entryType === 'group'
                      ? 'Ex: Os Anões, Liga da Justiça, Turma do Samba'
                      : 'Ex: Romeu & Julieta, Noivos, Casal Fantasia'
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white shadow-sm"
                />
                <p className="mt-1.5 text-xs text-gray-500">
                  {entryType === 'group'
                    ? 'Se deixar em branco, será exibido no telão e votação apenas como "Grupo".'
                    : 'Se deixar em branco, será exibido no telão e votação apenas como "Casal".'}
                </p>
              </div>

              <div className="flex items-start gap-2 text-xs text-purple-900 bg-white/60 p-2.5 rounded-lg border border-purple-100/80">
                {entryType === 'group' ? (
                  <Users className="w-4 h-4 text-purple-600 flex-shrink-0 mt-0.5" />
                ) : (
                  <Heart className="w-4 h-4 text-rose-500 flex-shrink-0 mt-0.5" />
                )}
                <span>
                  <strong>Candidatura coletiva:</strong> Não é vinculada a nenhum participante específico. Ficará disponível imediatamente para votação no tablet e telão.
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 p-4 border-t bg-gray-50 rounded-b-xl">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-200 rounded-lg transition-colors font-medium"
          >
            Cancelar
          </button>
          {entryType === 'individual' && conflicts.length > 0 ? (
            <>
              <button
                onClick={() => submit('replace')}
                disabled={saving || !contestId}
                className="px-4 py-2 text-sm bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-lg transition-colors font-medium shadow-sm"
              >
                Trocar pela nova foto
              </button>
              <button
                onClick={() => submit('new')}
                disabled={saving || !contestId}
                className="px-4 py-2 text-sm bg-white border border-amber-400 text-amber-800 hover:bg-amber-50 disabled:opacity-50 rounded-lg transition-colors font-medium"
              >
                Inscrever assim mesmo
              </button>
            </>
          ) : (
            <button
              onClick={() => submit('new')}
              disabled={saving || !contestId || contests.length === 0}
              className="px-4 py-2 text-sm bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-lg transition-colors flex items-center gap-2 font-medium shadow-sm"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : entryType === 'group' ? (
                <Users className="w-4 h-4" />
              ) : entryType === 'couple' ? (
                <Heart className="w-4 h-4" />
              ) : (
                <Trophy className="w-4 h-4" />
              )}
              {entryType === 'group'
                ? 'Inscrever Grupo'
                : entryType === 'couple'
                ? 'Inscrever Casal'
                : 'Inscrever'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default PromoteToContestModal;
