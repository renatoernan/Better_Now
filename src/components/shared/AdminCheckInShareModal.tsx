import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  Smartphone,
  Copy,
  Trash2,
  Loader2,
  Check,
  QrCode,
  ExternalLink,
  Plus,
  ShieldCheck,
  Calendar,
  Sparkles,
  UserCheck,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { toast } from 'sonner';
import { supabase } from '../../shared/services/lib/supabase';
import ConfirmModal from './ConfirmModal';

export interface CheckInShare {
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
  eventDate?: string;
}

const linkForToken = (token: string) =>
  `${window.location.origin}/portaria/${token}`;

export const AdminCheckInShareModal: React.FC<Props> = ({
  isOpen,
  onClose,
  eventId,
  eventTitle,
  eventDate,
}) => {
  const [shares, setShares] = useState<CheckInShare[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [label, setLabel] = useState('');
  const [expiresIn, setExpiresIn] = useState<'never' | '12h' | '24h' | '3d' | '7d'>('never');
  const [justCreated, setJustCreated] = useState<CheckInShare | null>(null);

  // Modal para exibir QR Code em tamanho grande
  const [qrModalShare, setQrModalShare] = useState<CheckInShare | null>(null);

  // Modal de Confirmação para revogar link (sem window.confirm)
  const [shareToRevoke, setShareToRevoke] = useState<CheckInShare | null>(null);
  const [revoking, setRevoking] = useState(false);

  const loadShares = useCallback(async () => {
    if (!eventId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('app_event_checkin_shares')
        .select('*')
        .eq('event_id', eventId)
        .is('revoked_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setShares(data || []);
    } catch (err: any) {
      console.error('Erro ao carregar links da portaria:', err);
      toast.error('Erro ao listar links da portaria.');
    } finally {
      setLoading(false);
    }
  }, [eventId]);

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

      const { data, error } = await supabase.rpc('create_checkin_share', {
        p_event_id: eventId,
        p_label: label.trim() || null,
        p_expires_at: expiresAt,
      });

      if (error) throw error;

      const row = Array.isArray(data) ? data[0] : data;
      if (!row?.share_token) throw new Error('Não foi possível obter o token do link criado.');

      const newRecord: CheckInShare = {
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
      toast.success('Link de portaria gerado com sucesso!');
    } catch (err: any) {
      console.error('Erro ao criar link:', err);
      toast.error(err.message || 'Erro ao gerar o link da portaria.');
    } finally {
      setCreating(false);
    }
  };

  const handleRevokeConfirm = async () => {
    if (!shareToRevoke) return;
    setRevoking(true);
    try {
      const { error } = await supabase.rpc('revoke_checkin_share', {
        p_share_id: shareToRevoke.id,
      });

      if (error) throw error;

      toast.success('Link revogado com sucesso.');
      if (justCreated?.id === shareToRevoke.id) {
        setJustCreated(null);
      }
      setShareToRevoke(null);
      await loadShares();
    } catch (err: any) {
      console.error('Erro ao revogar link:', err);
      toast.error(err.message || 'Não foi possível revogar o link.');
    } finally {
      setRevoking(false);
    }
  };

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const handleCopy = (share: CheckInShare) => {
    const url = linkForToken(share.token);
    navigator.clipboard.writeText(url);
    setCopiedId(share.id);
    toast.success('Link copiado para a área de transferência!');
    setTimeout(() => setCopiedId(null), 2500);
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
        <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-gray-100 overflow-hidden">
          {/* Header */}
          <div className="p-5 sm:p-6 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-start justify-between gap-4 shrink-0">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 shadow-inner">
                <Smartphone className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg sm:text-xl font-bold">Link Direto da Portaria</h3>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    <ShieldCheck className="w-3 h-3" /> Seguro
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-300 line-clamp-1 mt-0.5">
                  {eventTitle || 'Evento'}
                  {eventDate ? ` • ${new Date(eventDate).toLocaleDateString('pt-BR')}` : ''}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
              title="Fechar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body com Scroll */}
          <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1 text-gray-800">
            {/* Explicação de Segurança */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 text-xs text-slate-600 flex items-start gap-3">
              <UserCheck className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-semibold text-slate-900">
                  Acesso Isolado para Recepção & Portaria
                </p>
                <p className="leading-relaxed">
                  Dispositivos acessando por este link conseguem ler QR codes com a câmera, buscar convidados nominais e validar ingressos em tempo real <strong>sem efetuar login</strong> e <strong>sem acesso aos dados financeiros</strong> ou configurações do sistema.
                </p>
              </div>
            </div>

            {/* Link Recém-Criado com Destaque */}
            {justCreated && (
              <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl p-4 sm:p-5 animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
                    <Sparkles className="w-4 h-4 text-emerald-600" />
                    <span>Link gerado com sucesso!</span>
                  </div>
                  <span className="text-[11px] font-medium text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                    {justCreated.label || 'Sem rótulo'}
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-4 bg-white p-3.5 rounded-xl border border-emerald-200/60 shadow-xs">
                  <div
                    onClick={() => setQrModalShare(justCreated)}
                    className="p-2 bg-white rounded-lg border border-gray-100 shadow-xs cursor-pointer hover:scale-105 transition-transform shrink-0"
                    title="Clique para ampliar o QR Code"
                  >
                    <QRCodeSVG value={linkForToken(justCreated.token)} size={88} />
                  </div>

                  <div className="flex-1 min-w-0 w-full">
                    <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">
                      URL da Portaria
                    </p>
                    <input
                      readOnly
                      value={linkForToken(justCreated.token)}
                      className="w-full text-xs font-mono bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-2 text-gray-700 select-all focus:outline-hidden"
                    />

                    <div className="flex items-center gap-2 mt-2.5">
                      <button
                        type="button"
                        onClick={() => handleCopy(justCreated)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                      >
                        {copiedId === justCreated.id ? (
                          <>
                            <Check className="w-3.5 h-3.5" /> Copiado!
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" /> Copiar Link
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => setQrModalShare(justCreated)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                      >
                        <QrCode className="w-3.5 h-3.5" /> Ver QR Code
                      </button>

                      <a
                        href={linkForToken(justCreated.token)}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-semibold transition-colors ml-auto"
                        title="Abrir em nova aba"
                      >
                        <ExternalLink className="w-3.5 h-3.5" /> Abrir
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Formulário: Criar Novo Link */}
            <form onSubmit={handleCreate} className="space-y-3 bg-gray-50/70 border border-gray-200/70 p-4 sm:p-5 rounded-2xl">
              <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <Plus className="w-4 h-4 text-indigo-600" />
                Gerar Novo Link de Acesso
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-xs font-medium text-gray-600">
                    Identificação / Rótulo do Dispositivo
                  </label>
                  <input
                    type="text"
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    placeholder="Ex: Portaria Principal, Entrada VIP, Celular 1"
                    className="w-full text-xs bg-white border border-gray-300 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-hidden transition-all"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-600">Validade</label>
                  <select
                    value={expiresIn}
                    onChange={(e: any) => setExpiresIn(e.target.value)}
                    className="w-full text-xs bg-white border border-gray-300 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-hidden transition-all cursor-pointer"
                  >
                    <option value="never">Sem expiração</option>
                    <option value="12h">12 horas</option>
                    <option value="24h">24 horas</option>
                    <option value="3d">3 dias</option>
                    <option value="7d">7 dias</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  disabled={creating}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer shadow-xs"
                >
                  {creating ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Gerando Link...
                    </>
                  ) : (
                    <>
                      <Plus className="w-3.5 h-3.5" /> Gerar Link da Portaria
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Lista de Links Existentes */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Links Ativos ({shares.length})
                </h4>
                {loading && <Loader2 className="w-3.5 h-3.5 text-gray-400 animate-spin" />}
              </div>

              {shares.length === 0 && !loading && (
                <div className="text-center py-8 px-4 bg-gray-50 border border-dashed border-gray-200 rounded-2xl text-xs text-gray-500">
                  Nenhum link ativo gerado para este evento ainda. Crie um acima para liberar a portaria no celular ou tablet.
                </div>
              )}

              <div className="space-y-2.5">
                {shares.map((s) => {
                  const isExpired = s.expires_at ? new Date(s.expires_at) < new Date() : false;
                  return (
                    <div
                      key={s.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-white border border-gray-200/80 rounded-2xl hover:border-gray-300 transition-colors shadow-2xs"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <button
                          type="button"
                          onClick={() => setQrModalShare(s)}
                          className="p-1.5 bg-gray-50 hover:bg-indigo-50 border border-gray-200 rounded-xl cursor-pointer transition-colors shrink-0"
                          title="Ver QR Code"
                        >
                          <QRCodeSVG value={linkForToken(s.token)} size={38} />
                        </button>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-xs font-bold text-gray-900 truncate">
                              {s.label || 'Portaria sem rótulo'}
                            </p>
                            {isExpired ? (
                              <span className="text-[10px] font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                                Expirado
                              </span>
                            ) : (
                              <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                Ativo
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-3 text-[11px] text-gray-400 mt-0.5">
                            <span className="font-mono text-gray-500">...{s.token.slice(-8)}</span>
                            <span>•</span>
                            <span>{s.access_count} {s.access_count === 1 ? 'acesso' : 'acessos'}</span>
                            {s.expires_at && (
                              <>
                                <span>•</span>
                                <span className="inline-flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  Expira em {new Date(s.expires_at).toLocaleDateString('pt-BR')}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                        <button
                          type="button"
                          onClick={() => handleCopy(s)}
                          className="p-2 hover:bg-gray-100 text-gray-600 rounded-xl transition-colors cursor-pointer"
                          title="Copiar Link"
                        >
                          {copiedId === s.id ? (
                            <Check className="w-4 h-4 text-emerald-600" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => setQrModalShare(s)}
                          className="p-2 hover:bg-gray-100 text-gray-600 rounded-xl transition-colors cursor-pointer"
                          title="Exibir QR Code"
                        >
                          <QrCode className="w-4 h-4" />
                        </button>

                        <a
                          href={linkForToken(s.token)}
                          target="_blank"
                          rel="noreferrer"
                          className="p-2 hover:bg-gray-100 text-gray-600 rounded-xl transition-colors"
                          title="Abrir em nova aba"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>

                        <button
                          type="button"
                          onClick={() => setShareToRevoke(s)}
                          className="p-2 hover:bg-rose-50 text-rose-500 rounded-xl transition-colors cursor-pointer"
                          title="Revogar Link"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 sm:p-5 bg-gray-50 border-t border-gray-100 flex items-center justify-end shrink-0">
            <button
              onClick={onClose}
              className="px-5 py-2.5 bg-gray-900 hover:bg-black text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer shadow-xs"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>

      {/* Modal Dedicado para QR Code em Alta Resolução */}
      {qrModalShare && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-sm w-full text-center shadow-2xl border border-gray-100 space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-left">
                <h4 className="text-base font-bold text-gray-900">
                  {qrModalShare.label || 'Portaria & Check-in'}
                </h4>
                <p className="text-xs text-gray-500">Aponte a câmera do celular para conectar</p>
              </div>
              <button
                onClick={() => setQrModalShare(null)}
                className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200/80 inline-block shadow-inner">
              <QRCodeSVG
                value={linkForToken(qrModalShare.token)}
                size={220}
                level="H"
                includeMargin
              />
            </div>

            <div className="space-y-2">
              <input
                readOnly
                value={linkForToken(qrModalShare.token)}
                className="w-full text-xs font-mono bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-2 text-gray-600 select-all text-center focus:outline-hidden"
              />

              <div className="flex items-center gap-2 justify-center">
                <button
                  type="button"
                  onClick={() => handleCopy(qrModalShare)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer shadow-xs"
                >
                  {copiedId === qrModalShare.id ? (
                    <>
                      <Check className="w-3.5 h-3.5" /> Copiado!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" /> Copiar Link
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setQrModalShare(null)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação para Revogar Link (respeitando a identidade visual do projeto) */}
      <ConfirmModal
        isOpen={Boolean(shareToRevoke)}
        title="Revogar Link de Portaria?"
        message={`Tem certeza que deseja revogar o link "${shareToRevoke?.label || 'Portaria'}"? Dispositivos conectados por este link perderão o acesso imediatamente.`}
        confirmText={revoking ? 'Revogando...' : 'Revogar Acesso'}
        cancelText="Manter Ativo"
        type="danger"
        onConfirm={handleRevokeConfirm}
        onClose={() => setShareToRevoke(null)}
      />
    </>
  );
};
