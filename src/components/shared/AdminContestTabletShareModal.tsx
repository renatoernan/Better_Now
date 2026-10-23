import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  Tablet,
  Copy,
  Trash2,
  Loader2,
  Check,
  QrCode,
  ExternalLink,
  Plus,
  ShieldCheck,
  Calendar,
  Eye,
  Sparkles,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { toast } from 'sonner';
import { supabase } from '../../shared/services/lib/supabase';
import ConfirmModal from './ConfirmModal';

export interface ContestTabletShare {
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
  contestId: string;
  contestTitle?: string;
  eventTitle?: string;
}

const linkForToken = (token: string) =>
  `${window.location.origin}/concursos/tablet/${token}`;

export const AdminContestTabletShareModal: React.FC<Props> = ({
  isOpen,
  onClose,
  contestId,
  contestTitle,
  eventTitle,
}) => {
  const [shares, setShares] = useState<ContestTabletShare[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [label, setLabel] = useState('');
  const [expiresIn, setExpiresIn] = useState<'never' | '12h' | '24h' | '3d' | '7d'>('never');
  const [justCreated, setJustCreated] = useState<ContestTabletShare | null>(null);

  // Modal para QR Code
  const [qrModalShare, setQrModalShare] = useState<ContestTabletShare | null>(null);

  // Modal de Confirmação para revogar link
  const [shareToRevoke, setShareToRevoke] = useState<ContestTabletShare | null>(null);
  const [revoking, setRevoking] = useState(false);

  const loadShares = useCallback(async () => {
    if (!contestId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('app_contest_tablet_shares')
        .select('*')
        .eq('contest_id', contestId)
        .is('revoked_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setShares(data || []);
    } catch (err: any) {
      console.error('Erro ao carregar links do tablet:', err);
      toast.error('Erro ao listar links do tablet.');
    } finally {
      setLoading(false);
    }
  }, [contestId]);

  useEffect(() => {
    if (isOpen) {
      loadShares();
      setJustCreated(null);
      setLabel('');
      setExpiresIn('never');
      setQrModalShare(null);
      setShareToRevoke(null);
    }
  }, [isOpen, loadShares]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);

    try {
      let expiresAt: string | null = null;
      if (expiresIn !== 'never') {
        const now = new Date();
        if (expiresIn === '12h') now.setHours(now.getHours() + 12);
        else if (expiresIn === '24h') now.setHours(now.getHours() + 24);
        else if (expiresIn === '3d') now.setDate(now.getDate() + 3);
        else if (expiresIn === '7d') now.setDate(now.getDate() + 7);
        expiresAt = now.toISOString();
      }

      const { data, error } = await supabase.rpc('create_contest_tablet_share', {
        p_contest_id: contestId,
        p_label: label.trim() || null,
        p_expires_at: expiresAt,
      });

      if (error) throw error;

      const row = Array.isArray(data) ? data[0] : data;
      if (!row?.share_token) throw new Error('Não foi possível obter o token do link criado.');

      const newRecord: ContestTabletShare = {
        id: row.share_id,
        token: row.share_token,
        label: label.trim() || null,
        is_active: true,
        expires_at: expiresAt,
        access_count: 0,
        last_accessed_at: null,
        created_at: new Date().toISOString(),
        revoked_at: null,
      };

      setJustCreated(newRecord);
      setLabel('');
      setExpiresIn('never');
      await loadShares();
      toast.success('Link do tablet gerado com sucesso!');
    } catch (err: any) {
      console.error('Erro ao criar link:', err);
      toast.error(err.message || 'Erro ao gerar o link do tablet.');
    } finally {
      setCreating(false);
    }
  };

  const handleRevokeConfirm = async () => {
    if (!shareToRevoke) return;
    setRevoking(true);
    try {
      const { error } = await supabase.rpc('revoke_contest_tablet_share', {
        p_share_id: shareToRevoke.id,
      });

      if (error) throw error;

      toast.success('Link revogado. O dispositivo perdeu o acesso.');
      if (justCreated?.id === shareToRevoke.id) {
        setJustCreated(null);
      }
      setShareToRevoke(null);
      await loadShares();
    } catch (err: any) {
      console.error('Erro ao revogar link:', err);
      toast.error('Erro ao revogar o link do tablet.');
    } finally {
      setRevoking(false);
    }
  };

  const copyToClipboard = async (text: string, description: string = 'Link') => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${description} copiado para a área de transferência!`);
    } catch {
      toast.error('Não foi possível copiar automaticamente.');
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
        <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl border border-gray-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* Cabeçalho */}
          <div className="flex items-center justify-between p-4 sm:p-5 border-b border-gray-100 bg-linear-to-r from-purple-50/60 to-white">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-xs">
                <Tablet className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-base sm:text-lg flex items-center gap-2">
                  Gerador de Link · Modo Tablet
                </h3>
                <p className="text-xs text-gray-500">
                  {contestTitle ? (
                    <>
                      <span className="font-medium text-purple-700">{contestTitle}</span>
                      {eventTitle && ` · ${eventTitle}`}
                    </>
                  ) : (
                    'Acesso operacional isolado para tablets'
                  )}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
              aria-label="Fechar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Conteúdo com rolagem */}
          <div className="p-4 sm:p-6 space-y-5 overflow-y-auto flex-1">
            {/* Aviso explicativo */}
            <div className="flex items-start gap-3 p-3.5 bg-purple-50/70 border border-purple-100 rounded-xl text-xs sm:text-sm text-purple-900">
              <ShieldCheck className="w-5 h-5 text-purple-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-purple-950">Acesso 100% isolado e seguro</p>
                <p className="text-purple-800/90 text-xs mt-0.5">
                  O dispositivo terá acesso exclusivamente à tela operacional deste concurso (fotografar participantes,
                  coletar votos e ver apuração). <strong>Não é necessário login</strong> e o operador <strong>não tem acesso a dados confidenciais</strong>, pedidos ou financeiro do sistema.
                </p>
              </div>
            </div>

            {/* Link recém-criado em destaque */}
            {justCreated && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="flex items-center justify-between">
                  <p className="text-xs sm:text-sm font-bold text-emerald-900 flex items-center gap-1.5">
                    <Check className="w-4 h-4 text-emerald-600" /> Link gerado com sucesso!
                  </p>
                  <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-100/70 px-2.5 py-0.5 rounded-full">
                    {justCreated.label || 'Tablet sem identificação'}
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <div className="flex-1 bg-white px-3 py-2 rounded-xl border border-emerald-300 text-xs font-mono text-gray-800 truncate select-all">
                    {linkForToken(justCreated.token)}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => copyToClipboard(linkForToken(justCreated.token))}
                      className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
                      title="Copiar link"
                    >
                      <Copy className="w-3.5 h-3.5" /> Copiar Link
                    </button>
                    <button
                      type="button"
                      onClick={() => setQrModalShare(justCreated)}
                      className="flex items-center justify-center gap-1 px-3 py-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold transition-colors"
                      title="Ver QR Code do link"
                    >
                      <QrCode className="w-3.5 h-3.5" /> QR Code
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Formulário de criação de novo link */}
            <form onSubmit={handleCreate} className="bg-gray-50/70 border border-gray-200/80 rounded-2xl p-4 sm:p-5 space-y-3.5">
              <h4 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                <Plus className="w-4 h-4 text-purple-600" /> Criar novo link para tablet
              </h4>

              <div className="grid sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Identificação do Tablet <span className="text-gray-400 font-normal">(opcional)</span>
                  </label>
                  <input
                    type="text"
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    placeholder="Ex.: Tablet Portaria, Tablet Fotógrafo 1, Tablet Pista"
                    className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-xs sm:text-sm text-gray-900 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-shadow"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Validade do link
                  </label>
                  <select
                    value={expiresIn}
                    onChange={(e) => setExpiresIn(e.target.value as any)}
                    className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-xl text-xs sm:text-sm text-gray-900 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-shadow"
                  >
                    <option value="never">Sem expiração</option>
                    <option value="12h">12 horas</option>
                    <option value="24h">24 horas</option>
                    <option value="3d">3 dias</option>
                    <option value="7d">7 dias</option>
                  </select>
                </div>
              </div>

              <div className="pt-1 flex justify-end">
                <button
                  type="submit"
                  disabled={creating}
                  className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-xs transition-all cursor-pointer"
                >
                  {creating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Gerando link...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" /> Gerar Link do Tablet
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Listagem de links já existentes */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs sm:text-sm font-bold text-gray-900 flex items-center gap-2">
                  <Tablet className="w-4 h-4 text-gray-500" />
                  Links Ativos ({shares.length})
                </h4>
                {loading && <Loader2 className="w-4 h-4 text-purple-600 animate-spin" />}
              </div>

              {shares.length === 0 ? (
                <div className="p-8 text-center bg-gray-50/50 border border-dashed border-gray-200 rounded-2xl">
                  <Tablet className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-xs sm:text-sm text-gray-500 font-medium">
                    {loading ? 'Carregando links...' : 'Nenhum link ativo gerado para este concurso ainda.'}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Crie um link acima para liberar um tablet ou smartphone para o evento.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {shares.map((share) => {
                    const fullLink = linkForToken(share.token);
                    return (
                      <div
                        key={share.id}
                        className="p-3.5 sm:p-4 bg-white border border-gray-200 rounded-2xl hover:border-purple-200 transition-all shadow-2xs space-y-2.5"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                            <p className="font-semibold text-gray-900 text-xs sm:text-sm">
                              {share.label || 'Tablet sem nome'}
                            </p>
                          </div>

                          <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
                            <Eye className="w-3.5 h-3.5 text-gray-400" />
                            <span>
                              {share.access_count} {share.access_count === 1 ? 'acesso' : 'acessos'}
                            </span>
                            {share.expires_at && (
                              <>
                                <span>·</span>
                                <span className="text-amber-700">
                                  Expira em {new Date(share.expires_at).toLocaleDateString('pt-BR')}
                                </span>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-50 px-3 py-2 rounded-xl text-xs font-mono text-gray-600 truncate border border-gray-100">
                            {fullLink}
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => copyToClipboard(fullLink)}
                              className="p-2 text-gray-600 hover:text-purple-700 hover:bg-purple-50 rounded-xl transition-colors"
                              title="Copiar link"
                            >
                              <Copy className="w-4 h-4" />
                            </button>

                            <button
                              type="button"
                              onClick={() => setQrModalShare(share)}
                              className="p-2 text-gray-600 hover:text-purple-700 hover:bg-purple-50 rounded-xl transition-colors"
                              title="Ver QR Code para escanear com o tablet"
                            >
                              <QrCode className="w-4 h-4" />
                            </button>

                            <a
                              href={fullLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 text-gray-600 hover:text-purple-700 hover:bg-purple-50 rounded-xl transition-colors"
                              title="Abrir em nova aba"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </a>

                            <button
                              type="button"
                              onClick={() => setShareToRevoke(share)}
                              className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-xl transition-colors"
                              title="Revogar link do tablet"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Rodapé */}
          <div className="p-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
            <span className="text-xs text-gray-500">
              Revogue os links ao término do evento para encerrar as sessões dos tablets.
            </span>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white hover:bg-gray-100 text-gray-700 border border-gray-200 rounded-xl text-xs sm:text-sm font-semibold transition-colors"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>

      {/* Submodal de Exibição do QR Code para Tablet */}
      {qrModalShare && (
        <div className="fixed inset-0 z-60 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 text-center space-y-4 shadow-2xl border border-gray-100">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="text-left">
                <h4 className="font-bold text-gray-900 text-sm">
                  {qrModalShare.label || 'Tablet Concurso'}
                </h4>
                <p className="text-xs text-gray-500 truncate max-w-[220px]">
                  {contestTitle || 'Escanear para abrir'}
                </p>
              </div>
              <button
                onClick={() => setQrModalShare(null)}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 bg-purple-50/50 rounded-2xl flex items-center justify-center border border-purple-100">
              <div className="p-3 bg-white rounded-xl shadow-xs">
                <QRCodeSVG
                  value={linkForToken(qrModalShare.token)}
                  size={200}
                  level="H"
                  includeMargin={true}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-gray-800">
                Aponte a câmera do tablet ou smartphone
              </p>
              <p className="text-[11px] text-gray-500 leading-relaxed">
                O dispositivo abrirá diretamente a tela de fotos e votação do concurso sem necessidade de login.
              </p>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => copyToClipboard(linkForToken(qrModalShare.token))}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
              >
                <Copy className="w-3.5 h-3.5" /> Copiar Link
              </button>
              <button
                type="button"
                onClick={() => setQrModalShare(null)}
                className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-semibold transition-colors"
              >
                Pronto
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação estilizado para Revogar Link (Sem window.confirm!) */}
      <ConfirmModal
        isOpen={Boolean(shareToRevoke)}
        onClose={() => setShareToRevoke(null)}
        onConfirm={handleRevokeConfirm}
        title="Revogar Acesso do Tablet?"
        message={`Tem certeza que deseja revogar o link "${shareToRevoke?.label || 'deste tablet'}"? O dispositivo que estiver utilizando este endereço perderá o acesso imediatamente.`}
        confirmText={revoking ? 'Revogando...' : 'Revogar Acesso'}
        cancelText="Manter Ativo"
        type="danger"
      />
    </>
  );
};

export default AdminContestTabletShareModal;
