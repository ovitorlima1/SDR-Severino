
import React, { useEffect, useState } from 'react';
import { Users, UserCheck, Trophy, XCircle, TrendingUp, DollarSign, Loader2, AlertCircle } from 'lucide-react';
import { fetchKommoLeads, fetchKommoStages, fetchLastLeadNote, getNoteDisplayText, KommoLead, KommoStage } from '../services/kommoService';

const WON_STATUS = 142;
const LOST_STATUS = 143;

const formatBRL = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(value);

const KpiCard: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
}> = ({ icon, label, value, color }) => (
  <div className="bg-white rounded-xl border border-slate-100 p-4 flex flex-col gap-2 shadow-sm">
    <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${color}`}>
      {icon}
    </div>
    <div>
      <p className="text-2xl font-bold text-slate-800">{value}</p>
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</p>
    </div>
  </div>
);

export const ConversionFunnel: React.FC = () => {
  const [leads, setLeads] = useState<KommoLead[]>([]);
  const [stages, setStages] = useState<KommoStage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastNotes, setLastNotes] = useState<Record<number, string>>({});

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [l, s] = await Promise.all([fetchKommoLeads(), fetchKommoStages()]);
        setLeads(l);
        setStages(s);
      } catch (e: any) {
        setError(e?.message ?? 'Erro ao conectar com o Kommo CRM.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Load last notes for recent leads in background (must be before early returns - Rules of Hooks)
  useEffect(() => {
    if (!leads.length) return;
    const recent = [...leads].sort((a, b) => b.created_at - a.created_at).slice(0, 15);
    let cancelled = false;
    (async () => {
      for (const lead of recent) {
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
    })();
    return () => { cancelled = true; };
  }, [leads]);

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-slate-400">
      <Loader2 className="animate-spin mr-2" size={20} />
      <span className="text-sm font-medium">Carregando dados do Kommo...</span>
    </div>
  );

  if (error) {
    const isAuthError = error.includes('401');
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 text-slate-500">
        <AlertCircle size={32} className={`${isAuthError ? 'text-orange-400' : 'text-red-400'}`} />
        <p className="text-sm font-semibold text-red-500">
          {isAuthError ? 'Token da Kommo Expirado ou Inválido' : 'Erro ao carregar o Kommo CRM'}
        </p>
        <p className="text-xs text-slate-400 max-w-md text-center">{error}</p>
        <div className="text-xs text-slate-400 max-w-md text-center space-y-1">
          <p>Verifique as variáveis no arquivo <code className="bg-slate-100 px-1 rounded">.env</code>:</p>
          <ul className="list-disc text-left inline-block mx-auto pl-4">
            <li><code className="bg-slate-100 px-1 rounded">VITE_KOMMO_TOKEN</code> (O seu expira em 2 meses)</li>
            <li><code className="bg-slate-100 px-1 rounded">VITE_KOMMO_API_DOMAIN</code> (Use api-g.kommo.com ou o seu subdomínio)</li>
          </ul>
          {isAuthError && (
            <p className="mt-2 text-orange-600 font-medium">
              💡 Dica: Gere um novo token de longa duração no painel da Kommo.
            </p>
          )}
        </div>
      </div>
    );
  }

  // Recent leads (last 15 by created_at desc)
  const stageById = Object.fromEntries(stages.map(s => [s.id, s]));
  const recentLeads = [...leads]
    .sort((a, b) => b.created_at - a.created_at)
    .slice(0, 15);

  // KPI calculations
  const total = leads.length;
  const won = leads.filter(l => l.status_id === WON_STATUS).length;
  const lost = leads.filter(l => l.status_id === LOST_STATUS).length;
  const active = leads.filter(l => l.status_id !== WON_STATUS && l.status_id !== LOST_STATUS).length;
  const conversionRate = total > 0 ? (won / total) * 100 : 0;
  const pipelineValue = leads
    .filter(l => l.status_id !== WON_STATUS && l.status_id !== LOST_STATUS)
    .reduce((sum, l) => sum + (l.price || 0), 0);

  // Stage breakdown (active leads only, excluding won/lost)
  const stageMap: Record<number, { stage: KommoStage; count: number }> = {};
  for (const lead of leads) {
    if (lead.status_id === WON_STATUS || lead.status_id === LOST_STATUS) continue;
    const stage = stages.find(s => s.id === lead.status_id);
    if (!stage) continue;
    if (!stageMap[stage.id]) stageMap[stage.id] = { stage, count: 0 };
    stageMap[stage.id].count++;
  }

  const stageRows = Object.values(stageMap)
    .filter(r => r.count > 0)
    .sort((a, b) => b.count - a.count);

  return (
    <div className="space-y-8 p-1">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-800">Funil de Conversão</h2>
        <p className="text-sm text-slate-500 mt-1">Dados em tempo real do Kommo CRM.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        <KpiCard
          icon={<Users size={18} className="text-blue-600" />}
          label="Total de Leads"
          value={total.toLocaleString('pt-BR')}
          color="bg-blue-50"
        />
        <KpiCard
          icon={<UserCheck size={18} className="text-violet-600" />}
          label="Leads Ativos"
          value={active.toLocaleString('pt-BR')}
          color="bg-violet-50"
        />
        <KpiCard
          icon={<Trophy size={18} className="text-emerald-600" />}
          label="Leads Ganhos"
          value={won.toLocaleString('pt-BR')}
          color="bg-emerald-50"
        />
        <KpiCard
          icon={<XCircle size={18} className="text-red-500" />}
          label="Leads Perdidos"
          value={lost.toLocaleString('pt-BR')}
          color="bg-red-50"
        />
        <KpiCard
          icon={<TrendingUp size={18} className="text-orange-500" />}
          label="Taxa de Conversão"
          value={`${conversionRate.toFixed(1)}%`}
          color="bg-orange-50"
        />
        <KpiCard
          icon={<DollarSign size={18} className="text-cyan-600" />}
          label="Valor em Pipeline"
          value={formatBRL(pipelineValue)}
          color="bg-cyan-50"
        />
      </div>

      {/* Leads por Etapa */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
          <TrendingUp size={18} className="text-primary" />
          <h3 className="font-bold text-slate-800">Leads por Etapa</h3>
        </div>
        {stageRows.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">Nenhum lead ativo encontrado.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                <tr>
                  <th className="text-left px-6 py-3">Etapa</th>
                  <th className="text-right px-6 py-3">Leads</th>
                  <th className="text-right px-6 py-3">% dos Ativos</th>
                  <th className="px-6 py-3 w-48">Distribuição</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {stageRows.map(({ stage, count }) => {
                  const pct = active > 0 ? (count / active) * 100 : 0;
                  return (
                    <tr key={stage.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-6 py-3 font-medium text-slate-700 flex items-center gap-2">
                        <span
                          className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: stage.color }}
                        />
                        {stage.name}
                      </td>
                      <td className="px-6 py-3 text-right text-slate-600 font-semibold">
                        {count.toLocaleString('pt-BR')}
                      </td>
                      <td className="px-6 py-3 text-right text-slate-500">
                        {pct.toFixed(1)}%
                      </td>
                      <td className="px-6 py-3">
                        <div className="w-full bg-slate-100 rounded-full h-2">
                          <div
                            className="h-2 rounded-full"
                            style={{ width: `${pct}%`, backgroundColor: stage.color }}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Últimos Leads */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
          <Users size={18} className="text-primary" />
          <h3 className="font-bold text-slate-800">Últimos Leads</h3>
        </div>
        {recentLeads.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">Nenhum lead encontrado.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                <tr>
                  <th className="text-left px-6 py-3">Nome</th>
                  <th className="text-left px-6 py-3">Etapa</th>
                  <th className="text-right px-6 py-3">Valor</th>
                  <th className="text-right px-6 py-3">Data</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {recentLeads.map(lead => {
                  const stage = stageById[lead.status_id];
                  const date = new Date(lead.created_at * 1000).toLocaleDateString('pt-BR');
                  const isWon = lead.status_id === WON_STATUS;
                  const isLost = lead.status_id === LOST_STATUS;
                  const stageName = isWon ? 'Ganho' : isLost ? 'Perdido' : (stage?.name ?? 'Desconhecida');
                  const stageColor = isWon ? '#10b981' : isLost ? '#ef4444' : (stage?.color ?? '#94a3b8');
                  const lastMsg = lastNotes[lead.id];
                  return (
                    <tr key={lead.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-6 py-3 max-w-[260px]">
                        <p className="font-medium text-slate-700 truncate">{lead.name || `Lead #${lead.id}`}</p>
                      </td>
                      <td className="px-6 py-3">
                        <span className="flex items-center gap-1.5">
                          <span
                            className="inline-block w-2 h-2 rounded-full flex-shrink-0"
                            style={{ backgroundColor: stageColor }}
                          />
                          <span className="text-slate-600">{stageName}</span>
                        </span>
                      </td>
                      <td className="px-6 py-3 text-right text-slate-600">
                        {lead.price ? formatBRL(lead.price) : '—'}
                      </td>
                      <td className="px-6 py-3 text-right text-slate-400">{date}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
