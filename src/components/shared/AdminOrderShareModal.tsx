import React, { useState, useEffect, useCallback } from 'react';
import { X, Link2, Copy, Trash2, Loader2, Lock, Check, AlertTriangle, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../../shared/services/lib/supabase';

interface ShareRecord {
  id: string;
  token: string;
  label: string | null;
  is_active: boolean;
  expires_at: string | null;
  access_count: number;
  last_accessed_at: string | null;
  created_at: string;
  revoked_at: string | null;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  eventTitle?: string;
}

const linkFor = (token: string) => `${window.location.origin}/pedidos/${token}`;

const AdminOrderShareModal: React.FC<Props> = ({ isOpen, onClose, eventId, eventTitle }) => {
  const [shares, setShares] = useState<ShareRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [label, setLabel] = useState('');
  const [password, setPassword] = useState('');
  const [justCreated, setJustCreated] = useState<{ token: string; password: string } | null>(null);

  const load = useCallback(async () => {
    if (!eventId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('app_event_order_shares')
      .select('id, token, label, is_active, expires_at, access_count, last_accessed_at, created_at, revoked_at')
      .eq('event_id', eventId)
      .is('revoked_at', null)
      .order('created_at', { ascending: false });

    if (error) toast.error('Erro ao carregar os links.');
    setShares(data || []);
    setLoading(false);
  }, [eventId]);

  useEffect(() => {
    if (isOpen) {
      load();
      setJustCreated(null);
      setLabel('');
      setPassword('');
    }
  }, [isOpen, load]);

  const create = async () => {
    if (password.trim().length < 4) {
      toast.error('A senha precisa ter ao menos 4 caracteres.');
      return;
    }
    setCreating(true);
    try {
      const { data, error } = await supabase.rpc('create_event_order_share', {
        p_event_id: eventId,
        p_password: password,
        p_label: label.trim() || null,
      });
      if (error) throw error;

      const row = Array.isArray(data) ? data[0] : data;
      if (!row?.share_token) throw new Error('Resposta inesperada ao criar o link.');

      setJustCreated({ token: row.share_token, password });
      setLabel('');
      setPassword('');
      await load();
      toast.success('Link criado.');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao criar o link.');
    } finally {
      setCreating(false);
    }
  };

  const revoke = async (share: ShareRecord) => {
    if (!window.confirm('Revogar este link? Quem tiver o endereço perde o acesso imediatamente.')) return;
    const { error } = await supabase
      .from('app_event_order_shares')
      .update({ revoked_at: new Date().toISOString(), is_active: false })
      .eq('id', share.id);

    if (error) { toast.error('Erro ao revogar.'); return; }
    toast.success('Link revogado.');
    if (justCreated?.token === share.token) setJustCreated(null);
    await load();
  };

  const copy = async (text: string, what: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${what} copiado.`);
    } catch {
      toast.error('Não foi possível copiar.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h3 className="font-bold text-gray-900 flex items-center gap-2">
              <Link2 className="w-5 h-5 text-indigo-600" /> Link de consulta de pedidos
            </h3>
            {eventTitle && <p className="text-sm text-gray-500">{eventTitle}</p>}
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg" aria-label="Fechar">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4 overflow-y-auto">
          <p className="text-sm text-gray-600">
            Gera um endereço somente-leitura com pedido, comprador, lote, forma de
            pagamento, valores e status. Não expõe CPF, telefone, e-mail nem IP, e
            nada pode ser alterado por ele.
          </p>

          {justCreated && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2">
              <p className="text-sm font-semibold text-emerald-900 flex items-center gap-1.5">
                <Check className="w-4 h-4" /> Link criado
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs bg-white px-2 py-1.5 rounded-lg border border-emerald-200 truncate">
                  {linkFor(justCreated.token)}
                </code>
                <button
                  onClick={() => copy(linkFor(justCreated.token), 'Link')}
                  className="p-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg"
                  title="Copiar link"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-emerald-800">
                A senha não fica visível depois que você fechar esta janela — ela é
                gravada apenas como hash. Anote ou envie agora.
              </p>
            </div>
          )}

          <div className="border border-gray-200 rounded-xl p-4 space-y-3">
            <h4 className="text-sm font-semibold text-gray-800">Novo link</h4>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Identificação <span className="font-normal text-gray-400">(opcional)</span>
                </label>
                <input
                  type="text"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="Ex.: Sócio, contador"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Senha de acesso</label>
                <input
                  type="text"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 4 caracteres"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
            </div>
            <button
              onClick={create}
              disabled={creating}
              className="w-full sm:w-auto px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
              Gerar link
            </button>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-gray-800 mb-2">Links ativos</h4>
            {loading ? (
              <div className="flex justify-center py-6">
                <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
              </div>
            ) : shares.length === 0 ? (
              <p className="text-sm text-gray-500 py-3">Nenhum link ativo para este evento.</p>
            ) : (
              <div className="space-y-2">
                {shares.map(s => (
                  <div key={s.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {s.label || 'Sem identificação'}
                      </p>
                      <code className="text-xs text-gray-500 truncate block">{linkFor(s.token)}</code>
                      <p className="text-[11px] text-gray-400 mt-0.5 flex items-center gap-1">
                        <Eye className="w-3 h-3" />
                        {s.access_count} acesso{s.access_count !== 1 ? 's' : ''}
                        {s.last_accessed_at && ` · último em ${new Date(s.last_accessed_at).toLocaleDateString('pt-BR')}`}
                      </p>
                    </div>
                    <button
                      onClick={() => copy(linkFor(s.token), 'Link')}
                      className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                      title="Copiar link"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => revoke(s)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Revogar"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl">
            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-900">
              O link mostra o nome completo dos compradores e os valores pagos.
              Trate como informação restrita e revogue quando não for mais necessário.
            </p>
          </div>
        </div>

        <div className="p-4 border-t bg-gray-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminOrderShareModal;
