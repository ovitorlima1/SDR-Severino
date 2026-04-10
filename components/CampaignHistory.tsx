
import React, { useEffect, useState, useMemo, useRef } from 'react';
import { Clock, BarChart3, Users, Send, Loader2, PieChart as PieChartIcon, Calendar, Upload, X } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, ReferenceLine } from 'recharts';
import { fetchAllCampaigns, fetchLeadsByCampaign, deleteClientFromDB, deleteCampaign, fetchClientIdsByCnpj, createCampaign, updateCampaign } from '../services/persistenceService';
import { Campaign, Client } from '../types';
import { ChevronDown, ChevronUp, UserCheck, Trash2, FileSpreadsheet, Pencil, Check } from 'lucide-react';
import * as XLSX from 'xlsx';

export const CampaignHistory: React.FC = () => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedCampaignId, setExpandedCampaignId] = useState<string | null>(null);
  const [campaignLeads, setCampaignLeads] = useState<Record<string, Client[]>>({});
  const [isLoadingLeads, setIsLoadingLeads] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [isDeletingCampaign, setIsDeletingCampaign] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState<string | null>(null);
  const [editingCampaignId, setEditingCampaignId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState({ name: '', profile: '', region: '', status: 'Enviada' as 'Enviada' | 'Agendada' | 'Processando', date: '' });
  const [monthlyGoal, setMonthlyGoal] = useState<number>(() => {
    const saved = localStorage.getItem('campaignMonthlyGoal');
    return saved ? Number(saved) : 0;
  });
  const [editingGoal, setEditingGoal] = useState(false);
  const [goalDraft, setGoalDraft] = useState('');

  // Import Excel
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importPreview, setImportPreview] = useState<{ fileName: string; cnpjs: string[]; total: number } | null>(null);
  const [importName, setImportName] = useState('');
  const [importProfile, setImportProfile] = useState<string>('Importado');
  const [importStatus, setImportStatus] = useState<'Enviada' | 'Agendada' | 'Processando'>('Enviada');
  const [isImporting, setIsImporting] = useState(false);

  useEffect(() => {
    const loadCampaigns = async () => {
      setLoading(true);
      try {
        const data = await fetchAllCampaigns();
        setCampaigns(data);
      } catch (error) {
        console.error("Erro ao carregar histórico", error);
      } finally {
        setLoading(false);
      }
    };
    loadCampaigns();
  }, []);

  const toggleExpand = async (campaignId: string) => {
    if (expandedCampaignId === campaignId) {
      setExpandedCampaignId(null);
      return;
    }

    setExpandedCampaignId(campaignId);

    // Carrega os leads se ainda não foram carregados
    if (!campaignLeads[campaignId]) {
      setIsLoadingLeads(campaignId);
      try {
        const leads = await fetchLeadsByCampaign(campaignId);
        setCampaignLeads(prev => ({ ...prev, [campaignId]: leads }));
      } catch (error) {
        console.error("Erro ao carregar leads da campanha", error);
      } finally {
        setIsLoadingLeads(null);
      }
    }
  };

  const handleRemoveLead = async (clientId: string, campaignId: string) => {
    if (!window.confirm("Deseja marcar este cliente como alcançado e removê-lo definitivamente do banco de dados?")) {
      return;
    }

    setIsDeleting(clientId);
    try {
      await deleteClientFromDB(clientId);

      // Atualiza a lista local
      setCampaignLeads(prev => ({
        ...prev,
        [campaignId]: prev[campaignId].filter(c => c.id !== clientId)
      }));

      alert("Cliente removido com sucesso!");
    } catch (error) {
      console.error("Erro ao deletar cliente:", error);
      alert("Erro ao remover cliente.");
    } finally {
      setIsDeleting(null);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const wb = XLSX.read(new Uint8Array(evt.target!.result as ArrayBuffer), { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<any>(ws);
      const cnpjs = rows.map(r => r['CNPJ'] || r['cnpj'] || '').filter(Boolean);
      setImportPreview({ fileName: file.name, cnpjs, total: rows.length });
      setImportName(`Importação Excel - ${new Date().toLocaleDateString('pt-BR')}`);
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  const handleImportConfirm = async () => {
    if (!importPreview || !importName.trim()) return;
    setIsImporting(true);
    try {
      const found = await fetchClientIdsByCnpj(importPreview.cnpjs);
      const leadIds = found.map(c => c.id);
      const result = await createCampaign({
        name: importName.trim(),
        segmentProfile: importProfile,
        segmentRegion: 'all',
        segmentCategory: 'all',
        totalLeads: leadIds.length,
        subject: '',
        body: '',
        status: importStatus,
      }, leadIds);
      setCampaigns(prev => [{
        id: result.id,
        name: importName.trim(),
        segmentProfile: importProfile,
        segmentRegion: 'all',
        segmentCategory: 'all',
        totalLeads: leadIds.length,
        subject: '',
        body: '',
        status: importStatus,
        createdAt: result.created_at || new Date().toISOString(),
      }, ...prev]);
      setImportPreview(null);
      setImportName('');
      setImportProfile('Importado');
      setImportStatus('Enviada');
    } catch (err) {
      console.error('Erro ao importar campanha:', err);
      alert('Erro ao registrar campanha.');
    } finally {
      setIsImporting(false);
    }
  };

  const handleSaveGoal = (value: string) => {
    const n = Math.max(0, Number(value) || 0);
    setMonthlyGoal(n);
    localStorage.setItem('campaignMonthlyGoal', String(n));
    setEditingGoal(false);
  };

  const handleSaveCampaign = async (campaignId: string) => {
    if (!editDraft.name.trim()) return;
    try {
      await updateCampaign(campaignId, {
        name: editDraft.name.trim(),
        segmentProfile: editDraft.profile,
        segmentRegion: editDraft.region || 'all',
        status: editDraft.status,
        createdAt: editDraft.date ? new Date(editDraft.date).toISOString() : undefined,
      });
      setCampaigns(prev => prev.map(c => c.id === campaignId ? {
        ...c,
        name: editDraft.name.trim(),
        segmentProfile: editDraft.profile,
        segmentRegion: editDraft.region || 'all',
        status: editDraft.status,
        createdAt: editDraft.date ? new Date(editDraft.date).toISOString() : c.createdAt,
      } : c));
    } catch (err) {
      console.error('Erro ao atualizar campanha:', err);
      alert('Erro ao salvar campanha.');
    } finally {
      setEditingCampaignId(null);
    }
  };

  const handleDeleteCampaign = async (e: React.MouseEvent, campaignId: string, campaignName: string) => {
    e.stopPropagation();
    if (!window.confirm(`Remover a campanha "${campaignName}"? Os leads não serão afetados.`)) return;
    setIsDeletingCampaign(campaignId);
    try {
      await deleteCampaign(campaignId);
      setCampaigns(prev => prev.filter(c => c.id !== campaignId));
    } catch (err) {
      console.error('Erro ao remover campanha:', err);
      alert('Erro ao remover campanha.');
    } finally {
      setIsDeletingCampaign(null);
    }
  };

  const handleDownloadExcel = async (campaign: Campaign) => {
    setIsExporting(campaign.id);
    try {
      const leads = await fetchLeadsByCampaign(campaign.id);
      
      // Tenta extrair as mensagens do body concatenado (formato do CampaignManager)
      // O CampaignManager salva como: Email: ... \n\n WhatsApp: ... \n\n LinkedIn: ...
      const body = campaign.body || '';
      
      const extractSection = (text: string, startMarker: string, endMarker?: string) => {
        const startIndex = text.indexOf(startMarker);
        if (startIndex === -1) return '';
        
        const contentStart = startIndex + startMarker.length;
        const endIndex = endMarker ? text.indexOf(endMarker, contentStart) : text.length;
        
        return text.substring(contentStart, endIndex).trim();
      };

      const emailBody = campaign.emailBody || extractSection(body, 'Email:', '\n\nWhatsApp:');
      const whatsappBody = campaign.whatsappBody || extractSection(body, 'WhatsApp:', '\n\nLinkedIn:');
      const linkedinBody = campaign.linkedinBody || extractSection(body, 'LinkedIn:');

      const exportData = leads.map(c => ({
        Nome: c.name,
        CNPJ: c.cnpj || '',
        Telefone: c.telMovel || c.telFixo || '',
        Email: c.email || '',
        Assunto_Email: campaign.subject || '',
        Corpo_Email: emailBody,
        WhatsApp: whatsappBody,
        LinkedIn: linkedinBody,
        Estado: c.state || '',
        Categoria: c.classePrincipal || '',
        Potencia: c.potencia || ''
      }));

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Campanha_Billi_Histórico");

      const fileName = `Billi_ReDownload_${campaign.segmentProfile || 'Campanha'}_${new Date(campaign.createdAt).toISOString().slice(0, 10)}.xlsx`;
      XLSX.writeFile(wb, fileName);

    } catch (error) {
      console.error("Erro ao exportar planilha:", error);
      alert("Erro ao gerar o download do Excel.");
    } finally {
      setIsExporting(null);
    }
  };

  // KPIs
  const totalCampaigns = campaigns.length;
  const totalLeadsImpacted = campaigns.reduce((acc, curr) => acc + (curr.totalLeads || 0), 0);
  const averageLeads = totalCampaigns > 0 ? Math.round(totalLeadsImpacted / totalCampaigns) : 0;

  // Semana dentro do mês (1-5) baseada no dia do mês
  const weekOfMonth = (date: Date) => Math.ceil(date.getDate() / 7);

  // Gráfico: Semanas do mês atual
  const timelineData = useMemo(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    const currentWeek = weekOfMonth(today);

    // Quantas semanas tem o mês atual
    const lastDay = new Date(year, month + 1, 0).getDate();
    const totalWeeks = weekOfMonth(new Date(year, month, lastDay));

    // Conta campanhas do mês atual por semana
    const grouped: Record<number, number> = {};
    campaigns.forEach(c => {
      const d = new Date(c.createdAt);
      if (d.getFullYear() === year && d.getMonth() === month) {
        const w = weekOfMonth(d);
        grouped[w] = (grouped[w] || 0) + 1;
      }
    });

    return Array.from({ length: totalWeeks }, (_, i) => {
      const w = i + 1;
      return {
        name: `Semana ${w}`,
        value: grouped[w] || 0,
        isCurrent: w === currentWeek,
      };
    });
  }, [campaigns]);

  const weeklyGoal = monthlyGoal > 0 ? Math.round(monthlyGoal / 4) : 0;

  // Progresso do mês atual
  const currentMonthProgress = useMemo(() => {
    const now = new Date();
    return campaigns.filter(c => {
      const d = new Date(c.createdAt);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;
  }, [campaigns]);

  const maxWeeklyValue = Math.max(...timelineData.map(d => d.value), weeklyGoal, 1);

  // Gráfico: Distribuição por Perfil (Pie)
  const normalizeProfile = (profile: string): string => {
    const lower = (profile || '').trim().toLowerCase();
    if (lower === 'gestor') return 'Gestor';
    if (lower === 'pagador') return 'Pagador';
    if (lower === 'oportunista') return 'Oportunista';
    if (lower === 'arquiteto financeiro') return 'Arquiteto Financeiro';
    if (lower === 'importado') return 'Importado';
    return profile || 'Geral';
  };

  const profileData = useMemo(() => {
    const grouped: Record<string, number> = {};
    campaigns.forEach(c => {
      const profile = normalizeProfile(c.segmentProfile || 'Geral');
      grouped[profile] = (grouped[profile] || 0) + 1;
    });

    return Object.entries(grouped).map(([name, value]) => ({ name, value }));
  }, [campaigns]);

  const COLORS = ['#F5BE01', '#1E293B', '#94A3B8', '#CBD5E1', '#E2E8F0'];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[400px]">
        <Loader2 className="animate-spin text-primary mb-2" size={32} />
        <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Carregando Histórico...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start gap-4 border-b border-slate-200 pb-6">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Histórico de Campanhas</h2>
          <p className="text-slate-500 font-medium mt-1">Análise de performance e registro de disparos.</p>
        </div>
        <div>
          <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFileSelect} />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white text-xs font-black uppercase tracking-wider rounded-lg hover:bg-slate-700 transition-colors"
          >
            <Upload size={14} /> Importar Excel
          </button>
        </div>
      </div>

      {/* Painel de confirmação de importação */}
      {importPreview && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 flex flex-col md:flex-row items-start md:items-center gap-4">
          <div className="flex-1 space-y-2">
            <p className="text-xs font-black text-blue-700 uppercase tracking-widest">Importar planilha</p>
            <p className="text-sm text-slate-600 font-medium">
              <span className="font-black text-slate-900">{importPreview.total}</span> contatos em <span className="font-black text-slate-900">{importPreview.fileName}</span>
            </p>
            <input
              type="text"
              value={importName}
              onChange={e => setImportName(e.target.value)}
              placeholder="Nome da campanha"
              className="w-full md:w-80 px-3 py-2 border border-blue-300 rounded-lg text-sm font-bold text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
            <div className="flex flex-wrap gap-2">
              <select
                value={importProfile}
                onChange={e => setImportProfile(e.target.value)}
                className="px-3 py-2 border border-blue-300 rounded-lg text-sm font-bold text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                <option value="Importado">Importado</option>
                <option value="Gestor">Gestor</option>
                <option value="Pagador">Pagador</option>
                <option value="Oportunista">Oportunista</option>
                <option value="Arquiteto Financeiro">Arquiteto Financeiro</option>
              </select>
              <select
                value={importStatus}
                onChange={e => setImportStatus(e.target.value as 'Enviada' | 'Agendada' | 'Processando')}
                className="px-3 py-2 border border-blue-300 rounded-lg text-sm font-bold text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                <option value="Enviada">Enviada</option>
                <option value="Agendada">Agendada</option>
                <option value="Processando">Processando</option>
              </select>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleImportConfirm}
              disabled={isImporting || !importName.trim()}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-xs font-black uppercase tracking-wider rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {isImporting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              {isImporting ? 'Registrando...' : 'Registrar Campanha'}
            </button>
            <button
              onClick={() => { setImportPreview(null); setImportName(''); setImportProfile('Importado'); setImportStatus('Enviada'); }}
              className="p-2 text-slate-400 hover:text-slate-700 rounded-lg transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Cards de Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 border border-slate-200 rounded-xl shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-primary/10 rounded-lg text-primary">
              <Send size={18} />
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Campanhas Realizadas</p>
          </div>
          <h3 className="text-3xl font-black text-slate-900">{totalCampaigns}</h3>
        </div>

        <div className="bg-white p-6 border border-slate-200 rounded-xl shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-slate-100 rounded-lg text-slate-600">
              <Users size={18} />
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Leads Impactados</p>
          </div>
          <h3 className="text-3xl font-black text-slate-900">{totalLeadsImpacted.toLocaleString()}</h3>
        </div>

        <div className="bg-white p-6 border border-slate-200 rounded-xl shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-slate-100 rounded-lg text-slate-600">
              <BarChart3 size={18} />
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Média Leads / Campanha</p>
          </div>
          <h3 className="text-3xl font-black text-slate-900">{averageLeads.toLocaleString()}</h3>
        </div>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico Temporal */}
        <div className="bg-white p-6 border border-slate-200 rounded-xl shadow-sm flex flex-col gap-4">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <h4 className="text-sm font-black text-slate-900 uppercase flex items-center gap-2">
                <Calendar size={16} className="text-primary" /> Campanhas por Semana
              </h4>
              <p className="text-[11px] text-slate-400 mt-0.5">{new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</p>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <span className="font-bold">Meta/mês:</span>
              {editingGoal ? (
                <>
                  <input
                    autoFocus type="number" min="0" value={goalDraft}
                    onChange={e => setGoalDraft(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleSaveGoal(goalDraft); if (e.key === 'Escape') setEditingGoal(false); }}
                    className="w-14 px-2 py-0.5 border border-primary rounded text-xs font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <button onClick={() => handleSaveGoal(goalDraft)} className="p-0.5 text-green-600 hover:bg-green-50 rounded"><Check size={12} /></button>
                  <button onClick={() => setEditingGoal(false)} className="p-0.5 text-slate-400 hover:bg-slate-100 rounded"><X size={12} /></button>
                </>
              ) : (
                <>
                  <span className="font-black text-slate-900">{monthlyGoal > 0 ? monthlyGoal : '—'}</span>
                  <button onClick={() => { setGoalDraft(monthlyGoal > 0 ? String(monthlyGoal) : ''); setEditingGoal(true); }} className="p-0.5 text-slate-400 hover:text-primary rounded transition-colors">
                    <Pencil size={11} />
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Indicador do mês atual */}
          {monthlyGoal > 0 && (
            <div className={`flex items-center justify-between px-4 py-2.5 rounded-lg text-xs font-bold ${
              currentMonthProgress >= monthlyGoal ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'
            }`}>
              <span>
                {new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).replace(/^\w/, c => c.toUpperCase())}
              </span>
              <span className="flex items-center gap-2">
                <span className="text-base font-black">{currentMonthProgress}</span>
                <span className="font-medium opacity-70">/ {monthlyGoal} campanhas</span>
                <span className={`ml-1 px-1.5 py-0.5 rounded text-[10px] font-black ${
                  currentMonthProgress >= monthlyGoal ? 'bg-green-200 text-green-800' : 'bg-amber-200 text-amber-800'
                }`}>
                  {monthlyGoal > 0 ? `${Math.round((currentMonthProgress / monthlyGoal) * 100)}%` : '—'}
                </span>
              </span>
            </div>
          )}

          {/* Legenda */}
          <div className="flex items-center gap-4 text-[10px] font-bold text-slate-400 flex-wrap">
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-yellow-400 inline-block" /> Semana atual</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-green-500 inline-block" /> Acima da meta</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-slate-800 inline-block" /> Abaixo da meta</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-slate-200 inline-block" /> Sem campanha</span>
            {weeklyGoal > 0 && <span className="flex items-center gap-1"><span className="w-4 border-t-2 border-dashed border-red-400 inline-block" /> Meta ({weeklyGoal}/sem)</span>}
          </div>

          {/* Gráfico */}
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={timelineData} margin={{ top: 8, right: 16, left: -24, bottom: 0 }} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 9, fill: '#94A3B8', fontWeight: 700 }}
                  tickLine={false} axisLine={false}
                  interval={0}
                />
                <YAxis
                  tick={{ fontSize: 9, fill: '#94A3B8', fontWeight: 700 }}
                  tickLine={false} axisLine={false}
                  allowDecimals={false}
                  domain={[0, Math.max(maxWeeklyValue + 1, (weeklyGoal || 0) + 1)]}
                  tickCount={Math.min(maxWeeklyValue + 2, 6)}
                />
                <Tooltip
                  cursor={{ fill: '#f8fafc', radius: 4 }}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '11px', fontWeight: 700 }}
                  formatter={(value: any) => [`${value} campanha${value !== 1 ? 's' : ''}`, '']}
                  labelFormatter={(label) => label}
                />
                {weeklyGoal > 0 && (
                  <ReferenceLine y={weeklyGoal} stroke="#ef4444" strokeDasharray="4 4"
                    label={{ value: `≥${weeklyGoal}/sem`, fill: '#ef4444', fontSize: 9, position: 'insideTopRight' }} />
                )}
                <Bar dataKey="value" radius={[3, 3, 0, 0]} name="Campanhas" maxBarSize={36}>
                  {timelineData.map((entry, index) => (
                    <Cell
                      key={index}
                      fill={
                        entry.value === 0
                          ? (entry.isCurrent ? '#FEF3C7' : '#E2E8F0')
                          : weeklyGoal > 0 && entry.value >= weeklyGoal
                            ? '#22c55e'
                            : entry.isCurrent ? '#F5BE01' : '#1E293B'
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico Distribuição */}
        <div className="bg-white p-8 border border-slate-200 rounded-xl shadow-sm min-h-[350px] flex flex-col">
          <h4 className="text-sm font-black text-slate-900 uppercase mb-6 flex items-center gap-2">
            <PieChartIcon size={16} className="text-primary" /> Foco por Perfil
          </h4>
          <div className="flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={profileData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {profileData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: 700 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Tabela de Histórico */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
          <h4 className="font-black text-sm uppercase tracking-wide text-slate-700 flex items-center gap-2">
            <Clock size={16} /> Registro Detalhado
          </h4>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Data</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Nome da Campanha</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Perfil Alvo</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Região/Filtro</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Leads</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Status</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {campaigns.map((camp) => (
                <React.Fragment key={camp.id}>
                  <tr
                    className={`hover:bg-slate-50 transition-colors ${editingCampaignId === camp.id ? 'bg-blue-50/40' : 'cursor-pointer'} ${expandedCampaignId === camp.id ? 'bg-slate-50' : ''}`}
                    onClick={() => editingCampaignId !== camp.id && toggleExpand(camp.id)}
                  >
                    {/* Data */}
                    <td className="px-6 py-4 text-xs font-bold text-slate-600">
                      {editingCampaignId === camp.id ? (
                        <input
                          type="date"
                          value={editDraft.date}
                          onChange={e => setEditDraft(d => ({ ...d, date: e.target.value }))}
                          onClick={e => e.stopPropagation()}
                          className="px-2 py-1 border border-blue-300 rounded text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
                        />
                      ) : (
                        new Date(camp.createdAt).toLocaleDateString('pt-BR')
                      )}
                    </td>

                    {/* Nome */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {editingCampaignId !== camp.id && (
                          expandedCampaignId === camp.id ? <ChevronUp size={14} className="text-primary" /> : <ChevronDown size={14} className="text-slate-400" />
                        )}
                        {editingCampaignId === camp.id ? (
                          <input
                            autoFocus
                            type="text"
                            value={editDraft.name}
                            onChange={e => setEditDraft(d => ({ ...d, name: e.target.value }))}
                            onKeyDown={e => { if (e.key === 'Enter') handleSaveCampaign(camp.id); if (e.key === 'Escape') setEditingCampaignId(null); }}
                            onClick={e => e.stopPropagation()}
                            className="px-2 py-1 border border-blue-300 rounded text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white w-48"
                          />
                        ) : (
                          <span className="text-sm font-bold text-slate-900">{camp.name}</span>
                        )}
                      </div>
                    </td>

                    {/* Perfil */}
                    <td className="px-6 py-4">
                      {editingCampaignId === camp.id ? (
                        <select
                          value={editDraft.profile}
                          onChange={e => setEditDraft(d => ({ ...d, profile: e.target.value }))}
                          onClick={e => e.stopPropagation()}
                          className="px-2 py-1 border border-blue-300 rounded text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
                        >
                          <option value="Importado">Importado</option>
                          <option value="Gestor">Gestor</option>
                          <option value="Pagador">Pagador</option>
                          <option value="Oportunista">Oportunista</option>
                          <option value="Arquiteto Financeiro">Arquiteto Financeiro</option>
                        </select>
                      ) : (
                        <span className="inline-flex items-center px-2 py-1 rounded bg-slate-100 text-slate-700 text-[10px] font-black uppercase tracking-wider">
                          {normalizeProfile(camp.segmentProfile || 'Todos')}
                        </span>
                      )}
                    </td>

                    {/* Região */}
                    <td className="px-6 py-4 text-xs text-slate-500">
                      {editingCampaignId === camp.id ? (
                        <input
                          type="text"
                          value={editDraft.region}
                          onChange={e => setEditDraft(d => ({ ...d, region: e.target.value }))}
                          onClick={e => e.stopPropagation()}
                          placeholder="Brasil / SP / MG..."
                          className="px-2 py-1 border border-blue-300 rounded text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white w-32"
                        />
                      ) : (
                        <>
                          {camp.segmentRegion === 'all' ? 'Brasil' : camp.segmentRegion}
                          {camp.segmentCategory && camp.segmentCategory !== 'all' ? ` • ${camp.segmentCategory}` : ''}
                        </>
                      )}
                    </td>

                    {/* Leads */}
                    <td className="px-6 py-4 text-center">
                      <span className="text-sm font-black text-slate-900">{camp.totalLeads}</span>
                    </td>

                    {/* Status */}
                    <td className="px-6 py-4 text-center">
                      {editingCampaignId === camp.id ? (
                        <select
                          value={editDraft.status}
                          onChange={e => setEditDraft(d => ({ ...d, status: e.target.value as any }))}
                          onClick={e => e.stopPropagation()}
                          className="px-2 py-1 border border-blue-300 rounded text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
                        >
                          <option value="Enviada">Enviada</option>
                          <option value="Agendada">Agendada</option>
                          <option value="Processando">Processando</option>
                        </select>
                      ) : (
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-wide
                          ${camp.status === 'Enviada' ? 'bg-green-50 text-green-600' : 'bg-slate-100 text-slate-500'}
                        `}>
                          {camp.status === 'Enviada' && <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>}
                          {camp.status}
                        </span>
                      )}
                    </td>

                    {/* Ações */}
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {editingCampaignId === camp.id ? (
                          <>
                            <button
                              onClick={e => { e.stopPropagation(); handleSaveCampaign(camp.id); }}
                              className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-all"
                              title="Salvar alterações"
                            >
                              <Check size={16} />
                            </button>
                            <button
                              onClick={e => { e.stopPropagation(); setEditingCampaignId(null); }}
                              className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg transition-all"
                              title="Cancelar edição"
                            >
                              <X size={16} />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const dateStr = camp.createdAt ? new Date(camp.createdAt).toISOString().split('T')[0] : '';
                                setEditDraft({
                                  name: camp.name,
                                  profile: normalizeProfile(camp.segmentProfile || 'Importado'),
                                  region: camp.segmentRegion === 'all' ? '' : (camp.segmentRegion || ''),
                                  status: (camp.status as any) || 'Enviada',
                                  date: dateStr,
                                });
                                setEditingCampaignId(camp.id);
                              }}
                              className="p-2 text-slate-400 hover:text-primary hover:bg-primary/5 rounded-lg transition-all"
                              title="Editar campanha"
                            >
                              <Pencil size={16} />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDownloadExcel(camp);
                              }}
                              disabled={isExporting === camp.id}
                              className="p-2 text-slate-400 hover:text-primary hover:bg-primary/5 rounded-lg transition-all"
                              title="Baixar planilha desta campanha"
                            >
                              {isExporting === camp.id ? (
                                <Loader2 size={16} className="animate-spin" />
                              ) : (
                                <FileSpreadsheet size={16} />
                              )}
                            </button>
                            <button
                              onClick={(e) => handleDeleteCampaign(e, camp.id, camp.name)}
                              disabled={isDeletingCampaign === camp.id}
                              className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                              title="Remover campanha"
                            >
                              {isDeletingCampaign === camp.id ? (
                                <Loader2 size={16} className="animate-spin" />
                              ) : (
                                <Trash2 size={16} />
                              )}
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>

                  {/* Lista de Leads Expandida */}
                  {expandedCampaignId === camp.id && (
                    <tr>
                      <td colSpan={7} className="px-6 py-4 bg-slate-50/50 border-y border-slate-100">
                        <div className="space-y-4 animate-in slide-in-from-top-2 duration-300">
                          <div className="flex justify-between items-center">
                            <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                              <Users size={12} className="text-primary" /> Clientes nesta Campanha
                            </h5>
                          </div>

                          {isLoadingLeads === camp.id ? (
                            <div className="flex items-center gap-2 text-xs font-bold text-slate-400 py-4">
                              <Loader2 size={14} className="animate-spin" /> Carregando lista de leads...
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                              {(campaignLeads[camp.id] || []).map(lead => (
                                <div key={lead.id} className="bg-white p-3 border border-slate-200 rounded-lg flex justify-between items-center shadow-sm group">
                                  <div className="overflow-hidden">
                                    <p className="text-xs font-black text-slate-900 truncate">{lead.name}</p>
                                    <p className="text-[10px] text-slate-400 font-bold truncate">{lead.email || lead.cnpj || 'Sem contato'}</p>
                                  </div>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleRemoveLead(lead.id, camp.id);
                                    }}
                                    disabled={isDeleting === lead.id}
                                    title="Marcar como alcançado e remover do sistema"
                                    className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                  >
                                    {isDeleting === lead.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                                  </button>
                                </div>
                              ))}
                              {campaignLeads[camp.id]?.length === 0 && (
                                <p className="text-xs font-bold text-slate-400 py-4">Nenhum lead individual vinculado a esta campanha.</p>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
              {campaigns.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400 text-sm font-medium">
                    Nenhuma campanha registrada ainda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
