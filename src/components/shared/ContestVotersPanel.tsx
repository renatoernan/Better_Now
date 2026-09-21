import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Loader2, Trash2, Undo2, Users } from 'lucide-react';
import { toast } from 'sonner';
import { ContestEntry } from '../../shared/hooks/hooks/useEventContests';
import { useContestVotes } from '../../shared/hooks/hooks/useContestVotes';
import { formatPersonName } from '../../shared/utils/utils/eventAttendees';
import ConfirmModal from './ConfirmModal';

interface Props {
  contestId: string;
  entries: ContestEntry[];
  /** Nome do titular por ingresso, na mesma resolução da portaria. */
  voterNames: Map<string, string>;
}

/**
 * Lista de quem votou. Excluir um voto aqui é anulação: a linha fica para
 * auditoria, sai da contagem e libera o ingresso para votar de novo — o tablet
 * recebe isso em tempo real.
 */
const ContestVotersPanel: React.FC<Props> = ({ contestId, entries, voterNames }) => {
  const { votes, loading, voidVote } = useContestVotes(contestId);
  const [open, setOpen] = useState(false);
  const [working, setWorking] = useState<string | null>(null);
  const [pending, setPending] = useState<{ voteId: string; voterName: string } | null>(null);

  const active = votes.filter(v => !v.voided_at);
  const voided = votes.filter(v => v.voided_at);

  const entryOf = (entryId: string) => entries.find(e => e.id === entryId);

  const handleVoid = async ({ voteId, voterName }: { voteId: string; voterName: string }) => {
    setPending(null);
    setWorking(voteId);
    try {
      await voidVote(voteId);
      toast.success(`Voto de ${voterName} excluído. O convidado já pode votar de novo.`);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao excluir o voto.');
    } finally {
      setWorking(null);
    }
  };

  const row = (v: typeof votes[number]) => {
    const entry = entryOf(v.entry_id);
    const voter = voterNames.get(v.ticket_id);
    const voterName = voter ? formatPersonName(voter) : 'Convidado não identificado';
    const isVoided = Boolean(v.voided_at);

    return (
      <li key={v.id} className={`flex items-center gap-3 px-4 py-2.5 ${isVoided ? 'opacity-60' : ''}`}>
        <div className="w-9 h-9 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
          {entry?.photo?.photo_url && (
            <img
              src={entry.photo.photo_url}
              alt={entry.participant_name}
              loading="lazy"
              className="w-full h-full object-contain"
            />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium text-gray-900 truncate ${isVoided ? 'line-through' : ''}`}>
            {voterName}
          </p>
          <p className="text-xs text-gray-500 truncate">
            votou em {entry ? formatPersonName(entry.participant_name) : 'candidatura removida'}
            {' · '}
            {new Date(v.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>

        {isVoided ? (
          <span className="text-[11px] px-2 py-1 bg-gray-100 text-gray-500 rounded-full flex items-center gap-1 flex-shrink-0">
            <Undo2 className="w-3 h-3" /> anulado
          </span>
        ) : (
          <button
            onClick={() => setPending({ voteId: v.id, voterName })}
            disabled={working === v.id}
            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 flex-shrink-0"
            title="Excluir voto e liberar novo voto"
          >
            {working === v.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
          </button>
        )}
      </li>
    );
  };

  return (
    <>
    <div className="border-t">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
      >
        <span className="flex items-center gap-2">
          {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          <Users className="w-4 h-4 text-gray-400" />
          Votantes ({active.length}{voided.length > 0 ? ` · ${voided.length} anulado${voided.length !== 1 ? 's' : ''}` : ''})
        </span>
        {loading && <Loader2 className="w-4 h-4 animate-spin text-gray-400" />}
      </button>

      {open && (
        votes.length === 0 ? (
          <p className="px-4 pb-4 text-sm text-gray-500">Ninguém votou neste concurso ainda.</p>
        ) : (
          <ul className="divide-y divide-gray-100 border-t border-gray-100">
            {active.map(row)}
            {voided.map(row)}
          </ul>
        )
      )}
    </div>

    <ConfirmModal
      isOpen={Boolean(pending)}
      onClose={() => setPending(null)}
      onConfirm={() => pending && handleVoid(pending)}
      title={`Excluir o voto de ${pending?.voterName ?? ''}?`}
      message="O voto sai da apuração e o convidado volta a poder votar no tablet, na hora. O registro fica guardado como anulado para auditoria."
      confirmText="Excluir voto"
      cancelText="Manter voto"
      type="danger"
    />
    </>
  );
};

export default ContestVotersPanel;
