
import React, { useState, useEffect, useCallback } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts';
import {
  Clock, TrendingUp, Smile, Frown, Meh,
  Loader2, AlertCircle, Brain, Filter,
} from 'lucide-react';
import {
  fetchKommoLeads,
  fetchKommoStages,
  fetchLeadNotes,
  fetchLastLeadNote,
  getNoteDisplayText,
  filterInactiveHighValueLeads,
} from '../services/kommoService';
import { analyzeBatchLeadSentiment } from '../services/sentimentService';
import {
  KommoLead,
  KommoStage,
  LeadSentimentAnalysis,
  InactiveLead,
} from '../types';

// ---- Sub-components ----

const KpiCard: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
}> = ({ icon, label, value, color }) => (
  <div className="bg-white rounded-xl border border-slate-100 p-4 flex flex-col gap-2 shadow-sm">
    <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${color}`}>{icon}</div>
    <div>
      <p className="text-2xl font-bold text-slate-800">{value}</p>
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</p>
    </div>
  </div>
);

const SentimentBadge: React.FC<{ sentiment: string }> = ({ sentiment }) => {
  const config: Record<string, { bg: string; text: string; label: string }> = {
    positivo: { bg: 'bg-emerald-50', text: 'text-emerald-700', label: 'Positivo' },
    negativo: { bg: 'bg-red-50',     text: 'text-red-700',     label: 'Negativo' },
    neutro:   { bg: 'bg-slate-100',  text: 'text-slate-600',   label: 'Neutro'   },
  };
  const c = config[sentiment] ?? { bg: 'bg-slate-100', text: 'text-slate-500', label: sentiment };
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${c.bg} ${c.text}`}>
      {c.label}
    </span>
  );
};

// ---- Main Component ----

export const LeadAnalysis: React.FC = () => {
  const [leads, setLeads] = useState<KommoLead[]>([]);
  const [stages, setStages] = useState<KommoStage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [stageFilter, setStageFilter] = useState<string>('all');
  const [inactiveLeads, setInactiveLeads] = useState<InactiveLead[]>([]);

  const [selectedLeadIds, setSelectedLeadIds] = useState<Set<number>>(new Set());
  const [sentimentResults, setSentimentResults] = useState<LeadSentimentAnalysis[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzeProgress, setAnalyzeProgress] = useState({ current: 0, total: 0 });

  const [lastNotes, setLastNotes] = useState<Record<number, string>>({});
  const [loadingNotes, setLoadingNotes] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [l, s] = await Promise.all([fetchKommoLeads(), fetchKommoStages()]);
        setLeads(l);
        setStages(s);
        setInactiveLeads(filterInactiveHighValueLeads(l, s));
      } catch (e: any) {
        setError(e?.message ?? 'Erro ao carregar dados do Kommo.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!inactiveLeads.length) return;
    let cancelled = false;
    setLoadingNotes(true);
    (async () => {
      for (const { lead } of inactiveLeads) {
        if (cancelled) break;
        try {
          const note = await fetchLastLeadNote(lead.id);
          const text = note ? getNoteDisplayText(note) : 'Sem mensagens';
          setLastNotes(prev => ({ ...prev, [lead.id]: text }));
        } catch {
          setLastNotes(prev => ({ ...prev, [lead.id]: 'Sem mensagens' }));
        }
        await new Promise(r => setTimeout(r, 300));
      }
      if (!cancelled) setLoadingNotes(false);
    })();
    return () => { cancelled = true; };
  }, [inactiveLeads]);

  useEffect(() => {
    if (!leads.length || !stages.length) return;
    const filtered = filterInactiveHighValueLeads(leads, stages);
    if (stageFilter === 'all') {
      setInactiveLeads(filtered);
    } else {
      const stageId = parseInt(stageFilter);
      setInactiveLeads(filtered.filter(il => il.lead.status_id === stageId));
    }
  }, [stageFilter, leads, stages]);

  const handleRunSentimentAnalysis = useCallback(async () => {
    if (selectedLeadIds.size === 0) return;
    setIsAnalyzing(true);
    const ids: number[] = Array.from(selectedLeadIds);
    setAnalyzeProgress({ current: 0, total: ids.length });

    const stageById = Object.fromEntries(stages.map(s => [s.id, s]));
    const leadsWithNotes: { leadId: number; leadName: string; stageName: string; notes: any[] }[] = [];

    for (let i = 0; i < ids.length; i++) {
      const id = ids[i];
      const lead = leads.find(l => l.id === id);
      if (!lead) continue;
      const notes = await fetchLeadNotes(id);
      leadsWithNotes.push({
        leadId: id,
        leadName: lead.name,
        stageName: stageById[lead.status_id]?.name ?? 'Desconhecida',
        notes,
      });
      setAnalyzeProgress({ current: i + 1, total: ids.length });
    }

    const results = await analyzeBatchLeadSentiment(leadsWithNotes);
    setSentimentResults(prev => {
      const map = new Map(prev.map(r => [r.leadId, r]));
      results.forEach(r => map.set(r.leadId, r));
      return Array.from(map.values());
    });
    setIsAnalyzing(false);
  }, [selectedLeadIds, leads, stages]);

  const sentimentDistribution = [
    { name: 'Positivo', count: sentimentResults.filter(r => r.sentiment === 'positivo').length, color: '#10b981' },
    { name: 'Neutro',   count: sentimentResults.filter(r => r.sentiment === 'neutro').length,   color: '#94a3b8' },
    { name: 'Negativo', count: sentimentResults.filter(r => r.sentiment === 'negativo').length, color: '#ef4444' },
  ];

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-slate-400">
      <Loader2 className="animate-spin mr-2" size={20} />
      <span className="text-sm font-medium">Carregando dados do Kommo...</span>
    </div>
  );

  if (error) return (
    <div className="flex flex-col items-center justify-center h-64 gap-3">
      <AlertCircle size={32} className="text-red-400" />
      <p className="text-sm font-semibold text-red-500">Erro ao carregar dados</p>
      <p className="text-xs text-slate-400 max-w-md text-center">{error}</p>
    </div>
  );

  const uniqueStages = stages.filter(s =>
    leads.some(l => l.status_id === s.id)
  );

  return (
    <div className="space-y-8 p-1">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-800">Análise de Leads</h2>
        <p className="text-sm text-slate-500 mt-1">
          Leads inativos e análise de sentimento via IA.
        </p>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard
          icon={<Clock size={18} className="text-orange-500" />}
          label="Inativos (+30 dias)"
          value={inactiveLeads.length.toLocaleString('pt-BR')}
          color="bg-orange-50"
        />
        <KpiCard
          icon={<Smile size={18} className="text-emerald-600" />}
          label="Sentimento Positivo"
          value={sentimentResults.filter(r => r.sentiment === 'positivo').length.toString()}
          color="bg-emerald-50"
        />
        <KpiCard
          icon={<Meh size={18} className="text-slate-500" />}
          label="Sentimento Neutro"
          value={sentimentResults.filter(r => r.sentiment === 'neutro').length.toString()}
          color="bg-slate-100"
        />
        <KpiCard
          icon={<Frown size={18} className="text-red-500" />}
          label="Sentimento Negativo"
          value={sentimentResults.filter(r => r.sentiment === 'negativo').length.toString()}
          color="bg-red-50"
        />
      </div>

      {/* Inactive Leads Table */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <Clock size={18} className="text-primary" />
            <h3 className="font-bold text-slate-800">Leads Inativos (sem atualização há +30 dias)</h3>
          </div>
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-slate-400" />
            <select
              value={stageFilter}
              onChange={e => setStageFilter(e.target.value)}
              className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 text-slate-600 bg-white focus:ring-1 focus:ring-primary outline-none"
            >
              <option value="all">Todas as etapas</option>
              {uniqueStages.map(s => (
                <option key={s.id} value={String(s.id)}>{s.name}</option>
              ))}
            </select>
          </div>
        </div>

        {inactiveLeads.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">
            Nenhum lead inativo encontrado com os filtros atuais.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                <tr>
                  <th className="px-4 py-3 w-8">
                    <input
                      type="checkbox"
                      onChange={e => {
                        if (e.target.checked) {
                          setSelectedLeadIds(new Set(inactiveLeads.map(il => il.lead.id)));
                        } else {
                          setSelectedLeadIds(new Set());
                        }
                      }}
                      checked={selectedLeadIds.size === inactiveLeads.length && inactiveLeads.length > 0}
                      className="accent-primary"
                    />
                  </th>
                  <th className="text-left px-6 py-3">Lead</th>
                  <th className="text-left px-6 py-3">Etapa</th>
                  <th className="text-right px-6 py-3">Dias Inativo</th>
                  <th className="text-right px-6 py-3">Valor</th>
                  <th className="text-center px-6 py-3">Sentimento</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {inactiveLeads.map(({ lead, stageName, stageColor, pipelineName, daysSinceUpdate, pipelineValue }) => {
                  const existingResult = sentimentResults.find(r => r.leadId === lead.id);
                  const lastMsg = lastNotes[lead.id];
                  return (
                    <tr key={lead.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-4 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={selectedLeadIds.has(lead.id)}
                          onChange={e => {
                            const next = new Set(selectedLeadIds);
                            e.target.checked ? next.add(lead.id) : next.delete(lead.id);
                            setSelectedLeadIds(next);
                          }}
                          className="accent-primary"
                        />
                      </td>
                      <td className="px-6 py-3 max-w-[240px]">
                        <p className="font-medium text-slate-700 truncate">{lead.name || `Lead #${lead.id}`}</p>
                        <p className="text-xs text-slate-400 truncate mt-0.5">
                          {lastMsg === undefined
                            ? <span className="italic">carregando...</span>
                            : lastMsg.length > 60 ? lastMsg.slice(0, 60) + '…' : lastMsg}
                        </p>
                      </td>
                      <td className="px-6 py-3">
                        <span className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: stageColor }} />
                          <span className="text-slate-600">{stageName}</span>
                        </span>
                        {pipelineName && (
                          <p className="text-xs text-slate-400 mt-0.5 pl-3.5">{pipelineName}</p>
                        )}
                      </td>
                      <td className="px-6 py-3 text-right">
                        <span className={`font-semibold ${daysSinceUpdate > 60 ? 'text-red-600' : 'text-orange-500'}`}>
                          {daysSinceUpdate}d
                        </span>
                      </td>
                      <td className="px-6 py-3 text-right text-slate-600">
                        {pipelineValue
                          ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(pipelineValue)
                          : '—'}
                      </td>
                      <td className="px-6 py-3 text-center">
                        {existingResult
                          ? <SentimentBadge sentiment={existingResult.sentiment} />
                          : <span className="text-xs text-slate-400">—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {selectedLeadIds.size > 0 && (
          <div className="px-6 py-4 border-t border-slate-100 flex items-center gap-4 flex-wrap">
            <button
              onClick={handleRunSentimentAnalysis}
              disabled={isAnalyzing}
              className="flex items-center gap-2 bg-primary text-white text-sm font-bold px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Analisando {analyzeProgress.current}/{analyzeProgress.total}...
                </>
              ) : (
                <>
                  <Brain size={16} />
                  Analisar Sentimento ({selectedLeadIds.size} selecionados)
                </>
              )}
            </button>
            <p className="text-xs text-slate-400">
              O modelo <span className="font-medium text-slate-500">Gemini Flash</span> irá ler as notas internas de cada lead e classificar o sentimento do relacionamento.
            </p>
          </div>
        )}
      </div>

      {/* Sentiment Results + Chart */}
      {sentimentResults.length > 0 && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp size={18} className="text-primary" />
              <h3 className="font-bold text-slate-800">Distribuição de Sentimento</h3>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={sentimentDistribution} barSize={40}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748b' }} />
                <YAxis tick={{ fontSize: 12, fill: '#64748b' }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {sentimentDistribution.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="xl:col-span-2 bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
              <Brain size={18} className="text-primary" />
              <h3 className="font-bold text-slate-800">Resultados da Análise</h3>
            </div>
            <div className="divide-y divide-slate-50 max-h-[400px] overflow-y-auto">
              {sentimentResults.map(result => (
                <div key={result.leadId} className="px-6 py-4 hover:bg-slate-50/60 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <p className="font-semibold text-slate-800 text-sm truncate">{result.leadName}</p>
                        <SentimentBadge sentiment={result.sentiment} />
                        <span className="text-xs text-slate-400">{result.confidence}% confiança</span>
                      </div>
                      <p className="text-xs text-slate-500 mb-2">{result.summary}</p>
                      <div className="flex flex-wrap gap-1">
                        {result.keyTopics.map((topic, i) => (
                          <span key={i} className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                            {topic}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs text-slate-400">{result.stageName}</p>
                      <p className="text-xs text-slate-300">{result.noteCount} notas</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
