
import React, { useState, useEffect } from 'react';
import { Send, Wand2, CheckCircle, Copy, Filter, MapPin, Building2, Users, Loader2, Database, Zap, FileSpreadsheet, Mail, MessageCircle, Linkedin } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Client, MessageTemplate } from '../types';
import { generateCampaignMessage } from '../services/geminiService';
import {
  fetchCampaignAudienceCount,
  fetchCampaignSampleClients,
  createCampaign,
  fetchCampaignAudienceClients,
  fetchCampaignClasses,
  fetchProfileDistribution,
  fetchCampaignAudienceIds
} from '../services/persistenceService';

interface CampaignManagerProps {
  clients: Client[];
}

type Channel = 'email' | 'whatsapp' | 'linkedin';

export const CampaignManager: React.FC<CampaignManagerProps> = ({ clients }) => {
  const [selectedProfile, setSelectedProfile] = useState<string>('');
  const [filterState, setFilterState] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterPotencia, setFilterPotencia] = useState<string>('');
  const [activeChannel, setActiveChannel] = useState<Channel>('email');

  // Estados para filtros carregados do banco
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [availableProfiles, setAvailableProfiles] = useState<string[]>([]);

  const [dbCount, setDbCount] = useState<number>(0);
  const [isLoadingCount, setIsLoadingCount] = useState(false);
  const [sendLimit, setSendLimit] = useState<number>(0);

  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedMessage, setGeneratedMessage] = useState<MessageTemplate | null>(null);
  const [sendStatus, setSendStatus] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [isExporting, setIsExporting] = useState(false);

  const states = Array.from(new Set(clients.map(c => c.state))).filter(Boolean).sort();

  // Carrega as categorias e perfis dinamicamente do banco
  useEffect(() => {
    const loadFilters = async () => {
      try {
        const [classes, profilesData] = await Promise.all([
          fetchCampaignClasses(),
          fetchProfileDistribution()
        ]);
        setAvailableCategories(classes);
        // Extrai apenas os nomes dos perfis, removendo duplicatas e "Não Segmentado" se desejar
        const profileNames = profilesData
          .map(p => p.name)
          .filter(name => name !== 'Não Segmentado' && name !== 'Não Analisado');
        setAvailableProfiles(profileNames);
      } catch (error) {
        console.error("Erro ao carregar filtros do banco:", error);
      }
    };
    loadFilters();
  }, []);

  useEffect(() => {
    let isActive = true;

    const loadCount = async () => {
      setIsLoadingCount(true);
      try {
        const count = await fetchCampaignAudienceCount({
          profile: selectedProfile || undefined,
          state: filterState === 'all' ? undefined : filterState,
          category: filterCategory === 'all' ? undefined : filterCategory,
          potencia: filterPotencia || undefined
        });

        if (isActive) {
          setDbCount(count);
          setSendLimit(count);
        }
      } catch (error) {
        console.error("Erro ao buscar contagem:", error);
      } finally {
        if (isActive) setIsLoadingCount(false);
      }
    };

    loadCount();
    return () => { isActive = false; };
  }, [selectedProfile, filterState, filterCategory, filterPotencia]);

  const handleGenerate = async () => {
    if (!selectedProfile) return;
    setIsGenerating(true);
    setGeneratedMessage(null);
    setSendStatus('idle');

    try {
      const sampleClients = await fetchCampaignSampleClients({
        profile: selectedProfile,
        state: filterState === 'all' ? undefined : filterState,
        category: filterCategory === 'all' ? undefined : filterCategory,
        potencia: filterPotencia || undefined
      }, 5);

      const context = {
        state: filterState === 'all' ? 'Brasil' : filterState,
        sector: filterCategory === 'all' ? 'Geral' : filterCategory,
        potential: filterPotencia || 'Médio Porte'
      };

      const message = await generateCampaignMessage(selectedProfile, context, sampleClients);
      setGeneratedMessage(message);
    } catch (e) {
      alert("Erro ao gerar copy Billi. Verifique sua conexão.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExport = async () => {
    if (!generatedMessage) return;
    setIsExporting(true);

    try {
      const exportClients = await fetchCampaignAudienceClients({
        profile: selectedProfile || undefined,
        state: filterState === 'all' ? undefined : filterState,
        category: filterCategory === 'all' ? undefined : filterCategory,
        potencia: filterPotencia || undefined
      }, sendLimit);

      const exportData = exportClients.map(c => ({
        Nome: c.name,
        CNPJ: c.cnpj || '',
        Telefone: c.telMovel || c.telFixo || '',
        Email: c.email || '',
        Assunto_Email: generatedMessage.subject,
        Corpo_Email: generatedMessage.emailBody,
        WhatsApp: generatedMessage.whatsappBody,
        LinkedIn: generatedMessage.linkedinBody,
        Estado: c.state || '',
        Categoria: c.classePrincipal || '',
        Potencia: c.potencia || ''
      }));

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Campanha_Multi_Canal");

      const fileName = `Billi_Campanha_${selectedProfile}_${new Date().toISOString().slice(0, 10)}.xlsx`;
      XLSX.writeFile(wb, fileName);

    } catch (error) {
      console.error(error);
      alert("Erro ao exportar planilha.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleSend = async () => {
    if (!generatedMessage) return;
    setSendStatus('sending');
    try {
      // Busca os IDs dos leads que fazem parte dessa campanha
      const leadIds = await fetchCampaignAudienceIds({
        profile: selectedProfile || undefined,
        state: filterState === 'all' ? undefined : filterState,
        category: filterCategory === 'all' ? undefined : filterCategory,
        potencia: filterPotencia || undefined
      }, sendLimit);

      await createCampaign({
        name: `Campanha Billi ${selectedProfile} - ${new Date().toLocaleDateString()}`,
        segmentProfile: selectedProfile,
        segmentRegion: filterState,
        segmentCategory: filterCategory,
        totalLeads: sendLimit,
        subject: generatedMessage.subject,
        body: `Email: ${generatedMessage.emailBody}\n\nWhatsApp: ${generatedMessage.whatsappBody}\n\nLinkedIn: ${generatedMessage.linkedinBody}`,
        emailBody: generatedMessage.emailBody,
        whatsappBody: generatedMessage.whatsappBody,
        linkedinBody: generatedMessage.linkedinBody,
        status: 'Enviada'
      }, leadIds);

      setTimeout(() => setSendStatus('sent'), 1500);
    } catch (error) {
      console.error(error);
      alert("Erro ao registrar campanha.");
      setSendStatus('idle');
    }
  };

  const selectClassName = "w-full p-3 bg-white text-slate-900 border border-slate-200 rounded-lg text-sm font-bold outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all shadow-sm";

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start gap-4 border-b border-slate-200 pb-6">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Campanhas Billi Capital</h2>
          <p className="text-slate-500 font-medium mt-1">Geração estratégica multicanal baseada em engenharia de capital.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Filtros */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white p-6 border border-slate-200 rounded-xl shadow-sm space-y-6">
            <h3 className="text-xs font-black text-slate-900 uppercase flex items-center gap-2 tracking-widest border-b border-slate-100 pb-4">
              <Filter size={14} className="text-primary" /> Setup da Campanha
            </h3>

            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">Perfil Billi (do Banco)</label>
                <select
                  className={selectClassName}
                  value={selectedProfile}
                  onChange={(e) => setSelectedProfile(e.target.value)}
                >
                  <option value="" className="text-slate-400">Selecione o Perfil...</option>
                  {availableProfiles.map(p => <option key={p} value={p} className="text-slate-900">{p}</option>)}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block flex items-center gap-1">
                  <MapPin size={10} /> Estado (Região)
                </label>
                <select
                  className={selectClassName}
                  value={filterState}
                  onChange={(e) => setFilterState(e.target.value)}
                >
                  <option value="all" className="text-slate-900">Todos os Estados</option>
                  {states.map(s => <option key={s} value={s} className="text-slate-900">{s}</option>)}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block flex items-center gap-1">
                  <Building2 size={10} /> Setor (Classe)
                </label>
                <select
                  className={selectClassName}
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                >
                  <option value="all" className="text-slate-900">Todas as Classes</option>
                  {availableCategories.map(c => <option key={c} value={c} className="text-slate-900">{c}</option>)}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block flex items-center gap-1">
                  <Zap size={10} /> Potencial (Calibragem)
                </label>
                <select
                  className={selectClassName}
                  value={filterPotencia}
                  onChange={(e) => setFilterPotencia(e.target.value)}
                >
                  <option value="">Selecione Potencial...</option>
                  <option value="Alta Voltagem (Escala/Capex)">Alta Voltagem (Escala/Capex)</option>
                  <option value="Grande Porte (Escala/Capex)">Grande Porte (Escala/Capex)</option>
                  <option value="Médio Porte (Fôlego/Fluxo)">Médio Porte (Fôlego/Fluxo)</option>
                  <option value="Pequeno Porte (Fôlego/Fluxo)">Pequeno Porte (Fôlego/Fluxo)</option>
                </select>
              </div>

              <div className="pt-4 border-t border-slate-100 space-y-4">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block flex items-center gap-1">
                    <Database size={10} /> Disponível nos Filtros
                  </label>
                  <div className="p-2 bg-slate-50 text-slate-500 border border-slate-100 rounded-lg font-bold text-sm text-center">
                    {isLoadingCount ? <Loader2 size={14} className="animate-spin mx-auto" /> : `${dbCount} leads`}
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block flex items-center gap-1">
                    <Users size={10} /> Volume do Disparo
                  </label>
                  <input
                    type="number"
                    className={selectClassName}
                    value={sendLimit}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 0;
                      setSendLimit(Math.min(val, dbCount));
                    }}
                    max={dbCount}
                    min={1}
                  />
                  <p className="text-[9px] text-slate-400 font-bold mt-1 uppercase">Defina quantos leads deseja extrair</p>
                </div>
              </div>
            </div>

            <button
              onClick={handleGenerate}
              disabled={!selectedProfile || isGenerating || dbCount === 0}
              className="w-full py-4 bg-primary text-white font-black uppercase tracking-wider text-xs flex items-center justify-center gap-2 hover:bg-primary/90 disabled:opacity-50 transition-all shadow-md rounded-lg"
            >
              {isGenerating ? <><Wand2 className="animate-spin" size={16} /> Criando Campanhas...</> : <><Wand2 size={16} /> Gerar com IA Sênior</>}
            </button>
          </div>
        </div>

        {/* Preview Multi-Canal */}
        <div className="lg:col-span-3">
          {generatedMessage ? (
            <div className="bg-white border border-slate-200 rounded-xl shadow-xl flex flex-col h-full transition-all">
              {/* Header com Tabs */}
              <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap gap-2 items-center justify-between rounded-t-xl">
                <div className="flex gap-2">
                  <button
                    onClick={() => setActiveChannel('email')}
                    className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all ${activeChannel === 'email' ? 'bg-primary text-white shadow-sm' : 'bg-white text-slate-400 border border-slate-200 hover:bg-slate-100'}`}
                  >
                    <Mail size={14} /> E-mail
                  </button>
                  <button
                    onClick={() => setActiveChannel('whatsapp')}
                    className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all ${activeChannel === 'whatsapp' ? 'bg-green-600 text-white shadow-sm' : 'bg-white text-slate-400 border border-slate-200 hover:bg-slate-100'}`}
                  >
                    <MessageCircle size={14} /> WhatsApp
                  </button>
                  <button
                    onClick={() => setActiveChannel('linkedin')}
                    className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all ${activeChannel === 'linkedin' ? 'bg-blue-700 text-white shadow-sm' : 'bg-white text-slate-400 border border-slate-200 hover:bg-slate-100'}`}
                  >
                    <Linkedin size={14} /> LinkedIn
                  </button>
                </div>
                <div className="hidden sm:block">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-white px-3 py-1.5 rounded-full border border-slate-200">
                    Target: {selectedProfile}
                  </span>
                </div>
              </div>

              <div className="p-10 flex-1 bg-white">
                {activeChannel === 'email' && (
                  <div className="space-y-6 animate-in fade-in duration-300">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Assunto do Email</label>
                      <div className="w-full bg-slate-50 p-4 border border-slate-200 rounded-lg font-bold text-slate-900 text-lg">{generatedMessage.subject}</div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Corpo do E-mail</label>
                      <textarea readOnly value={generatedMessage.emailBody} className="w-full h-80 bg-slate-50 p-6 border border-slate-200 rounded-lg text-slate-800 leading-relaxed resize-none focus:outline-none font-medium text-base" />
                    </div>
                  </div>
                )}

                {activeChannel === 'whatsapp' && (
                  <div className="space-y-6 animate-in fade-in duration-300">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">WhatsApp (Curto e Direto)</label>
                      <div className="max-w-md mx-auto relative p-6 bg-[#DCF8C6] rounded-xl shadow-sm border border-[#BDD9A7]">
                        <div className="absolute top-0 right-0 p-2 text-[10px] text-slate-400 font-bold uppercase">Preview WhatsApp</div>
                        <p className="text-slate-800 font-medium whitespace-pre-wrap">{generatedMessage.whatsappBody}</p>
                      </div>
                    </div>
                  </div>
                )}

                {activeChannel === 'linkedin' && (
                  <div className="space-y-6 animate-in fade-in duration-300">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">LinkedIn (Conexão Contextual)</label>
                      <div className="max-w-lg mx-auto p-6 bg-slate-50 border border-slate-200 rounded-xl flex gap-4">
                        <div className="w-12 h-12 bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xl rounded shrink-0">B</div>
                        <div className="space-y-3">
                          <div className="flex gap-2 items-baseline">
                            <span className="font-bold text-sm">Time Billi Capital</span>
                            <span className="text-[10px] text-slate-400">1º</span>
                          </div>
                          <p className="text-sm text-slate-700 leading-relaxed">{generatedMessage.linkedinBody}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-6 border-t border-slate-100 flex justify-between items-center bg-slate-50 rounded-b-xl">
                <button
                  onClick={() => {
                    const text = activeChannel === 'email' ? generatedMessage.emailBody : activeChannel === 'whatsapp' ? generatedMessage.whatsappBody : generatedMessage.linkedinBody;
                    navigator.clipboard.writeText(text);
                  }}
                  className="text-slate-500 hover:text-slate-900 flex items-center gap-2 text-xs font-black uppercase tracking-wider"
                >
                  <Copy size={14} /> Copiar Selecionado
                </button>
                <div className="flex items-center gap-4">
                  <button
                    onClick={handleExport}
                    disabled={isExporting}
                    className="px-6 py-4 bg-white border border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-xs flex items-center gap-2 hover:bg-slate-50 hover:border-green-500 hover:text-green-600 transition-all rounded-lg"
                  >
                    {isExporting ? <Loader2 className="animate-spin" size={16} /> : <FileSpreadsheet size={16} />}
                    Exportar Planilha ({sendLimit} Leads)
                  </button>

                  <button
                    onClick={handleSend}
                    disabled={sendStatus !== 'idle'}
                    className={`px-10 py-4 font-black uppercase tracking-wider text-xs flex items-center gap-2 transition-all shadow-lg rounded-lg
                      ${sendStatus === 'sent' ? 'bg-green-600 text-white' : 'bg-primary text-white hover:bg-primary/90'}
                    `}
                  >
                    {sendStatus === 'sending' ? 'Processando...' : sendStatus === 'sent' ? <><CheckCircle size={16} /> Enviado</> : <><Send size={16} /> Agendar Disparo</>}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white border-2 border-dashed border-slate-200 h-full flex flex-col items-center justify-center p-12 text-center text-slate-400 rounded-xl">
              <div className="p-6 bg-slate-50 rounded-full shadow-sm mb-6"><Database size={48} className="text-slate-300" /></div>
              <h3 className="text-2xl font-black text-slate-800 mb-2 tracking-tight">Estratégia Billi Capital</h3>
              <p className="max-w-md mb-6 font-medium">Preencha o perfil e o potencial da carga ao lado. O Severino irá gerar 3 abordagens personalizadas (E-mail, WhatsApp e LinkedIn) com foco em liquidez estratégica.</p>
              {isLoadingCount && (
                <div className="flex items-center gap-2 text-slate-700 font-bold text-xs bg-slate-100 px-6 py-3 uppercase tracking-wider rounded-full">
                  <Loader2 className="animate-spin" size={14} /> Consultando base Supabase...
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
