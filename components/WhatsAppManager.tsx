
import React, { useState, useEffect } from 'react';
import { 
  MessageSquare, 
  Plus, 
  RefreshCw, 
  Trash2, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  ShieldCheck, 
  Copy, 
  Loader2, 
  Smartphone,
  Info
} from 'lucide-react';
import { WhatsAppNumber } from '../types';
import { flukeApi } from '../services/flukeService';
import { 
  fetchWhatsAppNumbers, 
  saveWhatsAppNumber, 
  updateWhatsAppNumberStatus, 
  deleteWhatsAppNumber 
} from '../services/persistenceService';

export const WhatsAppManager: React.FC = () => {
  const [numbers, setNumbers] = useState<WhatsAppNumber[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [friendlyNameInput, setFriendlyNameInput] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const loadNumbers = async () => {
    setLoading(true);
    try {
      const data = await fetchWhatsAppNumbers();
      setNumbers(data);
    } catch (e) {
      console.error("Erro ao carregar números:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNumbers();
  }, []);

  const handleCreateNumber = async () => {
    if (!friendlyNameInput) return;
    setIsCreating(true);
    try {
      // 1. Chama Fluke
      const { phoneNumber } = await flukeApi.createNumber();
      
      // 2. Salva no Banco como Disponível
      await saveWhatsAppNumber({
        phoneNumber,
        friendlyName: friendlyNameInput,
        status: 'disponivel'
      });
      
      setFriendlyNameInput('');
      setIsModalOpen(false);
      await loadNumbers();
    } catch (e) {
      alert("Erro ao criar número na Fluke.");
    } finally {
      setIsCreating(false);
    }
  };

  const handleActivate = async (id: string, phoneNumber: string) => {
    try {
      await updateWhatsAppNumberStatus(id, 'ativando');
      await flukeApi.activateNumber(phoneNumber);
      await updateWhatsAppNumberStatus(id, 'ativo');
      await loadNumbers();
    } catch (e) {
      alert("Erro ao ativar número.");
    }
  };

  const handleGetCode = async (id: string, phoneNumber: string) => {
    try {
      const code = await flukeApi.getVerificationCode(phoneNumber);
      await updateWhatsAppNumberStatus(id, 'ativo', code);
      await loadNumbers();
    } catch (e) {
      alert("Erro ao buscar código.");
    }
  };

  const handleCancel = async (id: string, phoneNumber: string) => {
    if (!confirm("Tem certeza que deseja cancelar este número? Esta ação é irreversível na Fluke.")) return;
    try {
      await flukeApi.cancelNumber(phoneNumber);
      await updateWhatsAppNumberStatus(id, 'cancelado');
      await loadNumbers();
    } catch (e) {
      alert("Erro ao cancelar número.");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir registro do sistema? O número deve ser cancelado na Fluke primeiro.")) return;
    try {
      await deleteWhatsAppNumber(id);
      await loadNumbers();
    } catch (e) {
      alert("Erro ao excluir registro.");
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // Simples feedback
  };

  const StatusBadge = ({ status }: { status: WhatsAppNumber['status'] }) => {
    switch(status) {
      case 'disponivel': return <span className="bg-blue-50 text-blue-600 border border-blue-100 px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-wider flex items-center gap-1"><Smartphone size={10} /> Disponível</span>;
      case 'ativando': return <span className="bg-amber-50 text-amber-600 border border-amber-100 px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-wider flex items-center gap-1"><Clock size={10} className="animate-spin" /> Ativando...</span>;
      case 'ativo': return <span className="bg-green-50 text-green-600 border border-green-100 px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-wider flex items-center gap-1"><CheckCircle2 size={10} /> Ativo</span>;
      case 'cancelado': return <span className="bg-slate-100 text-slate-400 border border-slate-200 px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-wider flex items-center gap-1"><XCircle size={10} /> Cancelado</span>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start gap-4 border-b border-slate-200 pb-6">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Números WhatsApp</h2>
          <p className="text-slate-500 font-medium mt-1">Gestão de infraestrutura para disparos via API Fluke.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-primary text-white font-black px-6 py-3 rounded-xl flex items-center gap-2 hover:bg-primary/90 transition-all shadow-md uppercase text-xs tracking-wider"
        >
          <Plus size={18} /> Novo Número Fluke
        </button>
      </div>

      {/* Grid de Números */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="animate-spin text-primary mb-4" size={32} />
          <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Sincronizando com Fluke...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {numbers.map((num) => (
            <div key={num.id} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
              {num.status === 'ativo' && <div className="absolute top-0 right-0 w-24 h-24 bg-green-500/5 rounded-full -translate-y-12 translate-x-12"></div>}
              
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <MessageSquare className={num.status === 'ativo' ? 'text-green-600' : 'text-slate-400'} size={24} />
                </div>
                <StatusBadge status={num.status} />
              </div>

              <div className="space-y-1 mb-6">
                <h3 className="font-black text-slate-900 text-lg tracking-tight">{num.friendlyName}</h3>
                <div className="flex items-center gap-2 group/phone">
                  <p className="font-mono text-slate-500 font-bold">{num.phoneNumber}</p>
                  <button onClick={() => copyToClipboard(num.phoneNumber)} className="text-slate-300 hover:text-primary transition-colors">
                    <Copy size={12} />
                  </button>
                </div>
              </div>

              <div className="bg-slate-50 rounded-xl p-4 mb-6 border border-slate-100 flex flex-col justify-center items-center gap-2 min-h-[80px]">
                {num.verificationCode ? (
                  <>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Código WA Business</p>
                    <div className="flex items-center gap-3">
                       <span className="text-3xl font-black text-slate-900 tracking-widest">{num.verificationCode}</span>
                       <button onClick={() => copyToClipboard(num.verificationCode!)} className="p-1.5 bg-white border border-slate-200 rounded-lg shadow-sm hover:text-primary transition-all">
                        <Copy size={14} />
                       </button>
                    </div>
                  </>
                ) : (
                  <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest text-center italic">Aguardando código de ativação...</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                {num.status === 'disponivel' && (
                  <button 
                    onClick={() => handleActivate(num.id, num.phoneNumber)}
                    className="col-span-2 py-3 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all"
                  >
                    Ativar na Fluke
                  </button>
                )}
                {num.status === 'ativo' && (
                  <>
                    <button 
                      onClick={() => handleGetCode(num.id, num.phoneNumber)}
                      className="py-3 bg-white border border-slate-200 text-slate-700 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
                    >
                      <RefreshCw size={12} /> Atualizar Cód.
                    </button>
                    <button 
                      onClick={() => handleCancel(num.id, num.phoneNumber)}
                      className="py-3 bg-red-50 text-red-600 border border-red-100 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-100 transition-all"
                    >
                      Cancelar
                    </button>
                  </>
                )}
                {num.status === 'cancelado' && (
                  <button 
                    onClick={() => handleDelete(num.id)}
                    className="col-span-2 py-3 bg-slate-50 text-slate-400 border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition-all flex items-center justify-center gap-2"
                  >
                    <Trash2 size={12} /> Remover Registro
                  </button>
                )}
              </div>
            </div>
          ))}

          {numbers.length === 0 && (
            <div className="col-span-full py-20 bg-white border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center text-center p-8">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                <Smartphone className="text-slate-300" size={32} />
              </div>
              <h4 className="font-black text-slate-800 uppercase tracking-tight">Nenhum número ativo</h4>
              <p className="text-sm text-slate-500 max-w-xs mt-2 font-medium">Você ainda não criou nenhum número via Fluke para suas campanhas.</p>
            </div>
          )}
        </div>
      )}

      {/* Modal Novo Número */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl w-full max-w-md p-8 shadow-2xl animate-in zoom-in duration-200">
             <h3 className="text-2xl font-black text-slate-900 tracking-tight mb-2">Novo Número Fluke</h3>
             <p className="text-slate-500 text-sm font-medium mb-8">Dê um nome amigável para identificar este chip (ex: SDR João 01).</p>
             
             <div className="space-y-6">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Identificação Amigável</label>
                  <input 
                    type="text" 
                    value={friendlyNameInput}
                    onChange={(e) => setFriendlyNameInput(e.target.value)}
                    placeholder="Ex: Operação Sudeste 01"
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                  />
                </div>

                <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl flex gap-3">
                  <Info className="text-amber-600 shrink-0" size={20} />
                  <p className="text-[11px] text-amber-700 font-medium leading-relaxed">
                    Ao criar um novo número, a Fluke irá cobrar a assinatura mensal automaticamente no seu cartão vinculado.
                  </p>
                </div>

                <div className="flex gap-4 pt-4">
                  <button 
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 py-4 bg-slate-100 text-slate-600 font-black uppercase text-[10px] tracking-widest rounded-xl hover:bg-slate-200 transition-all"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={handleCreateNumber}
                    disabled={isCreating || !friendlyNameInput}
                    className="flex-1 py-4 bg-primary text-white font-black uppercase text-[10px] tracking-widest rounded-xl hover:bg-primary/90 transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isCreating ? <Loader2 className="animate-spin" size={16} /> : <ShieldCheck size={16} />}
                    Confirmar Criação
                  </button>
                </div>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};
