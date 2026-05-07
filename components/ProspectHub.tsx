import React, { useState, useEffect, useCallback } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend,
} from 'recharts';
import { Search, Mail, Phone, Building2, MapPin, RefreshCw, X, Zap, TrendingUp, Users, Linkedin } from 'lucide-react';
import { Prospect, Decisor } from '../types';
import {
  fetchProspects,
  fetchProspectStats,
  fetchFunilStats,
  fetchLeadDecisores,
  ProspectStats,
  FunilStats,
  ProspectFilters,
} from '../services/persistenceService';

// =============================================================================
// CONSTANTES
// =============================================================================
const ESTADOS = ['AL', 'AP', 'GO', 'MA', 'PA', 'PI', 'RS'];
const DISTRIBUIDORAS = [
  'Equatorial Alagoas', 'CEA Equatorial', 'Equatorial Goiás',
  'Equatorial Maranhão', 'Equatorial Pará', 'Equatorial Piauí',
  'CEEE Equatorial (RS)',
];
const PAGE_SIZE = 50;

const SEG_COLORS: Record<string, string> = {
  A: '#ef4444',
  B: '#f59e0b',
  C: '#22c55e',
};
const SEG_LABELS: Record<string, string> = {
  A: 'HOT',
  B: 'Morno',
  C: 'Frio',
};
const SEG_BADGE: Record<string, string> = {
  A: 'bg-red-50 text-red-600 border border-red-100',
  B: 'bg-amber-50 text-amber-600 border border-amber-100',
  C: 'bg-green-50 text-green-600 border border-green-100',
};

// =============================================================================
// FUNNEL STEP — barra horizontal proporcional
// =============================================================================
const FunnelStep: React.FC<{
  label: string;
  sublabel: string;
  count: number;
  maxCount: number;
  pct?: string;
  color: string;
}> = ({ label, sublabel, count, maxCount, color, pct }) => {
  const width = maxCount > 0 ? Math.max(3, (count / maxCount) * 100) : 0;
  return (
    <div className="flex items-center gap-5 py-3.5 border-b border-slate-100 last:border-0">
      <div className="w-36 shrink-0">
        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{label}</p>
        <p className="text-[10px] text-slate-400 font-medium mt-0.5">{sublabel}</p>
      </div>
      <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${width}%`, backgroundColor: color }}
        />
      </div>
      <div className="w-40 text-right shrink-0 flex items-baseline justify-end gap-2">
        <span className="text-lg font-black text-slate-900 tracking-tight">{count.toLocaleString('pt-BR')}</span>
        {pct && <span className="text-[10px] text-slate-400 font-medium">{pct}</span>}
      </div>
    </div>
  );
};

// =============================================================================
// SCORE BAR
// =============================================================================
const ScoreBar: React.FC<{ score: number; segmento: string }> = ({ score, segmento }) => (
  <div className="flex items-center gap-2">
    <span className="text-xs font-black text-slate-700 w-4 text-right">{score}</span>
    <div className="w-20 h-2 bg-slate-100 rounded-full overflow-hidden">
      <div
        className="h-full rounded-full"
        style={{ width: `${score * 10}%`, backgroundColor: SEG_COLORS[segmento] }}
      />
    </div>
  </div>
);

// =============================================================================
// SKELETON
// =============================================================================
const Skeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`bg-slate-100 animate-pulse rounded-xl ${className}`} />
);

// =============================================================================
// COMPONENTE PRINCIPAL
// =============================================================================
export const ProspectHub: React.FC = () => {
  const [stats, setStats] = useState<ProspectStats | null>(null);
  const [funilStats, setFunilStats] = useState<FunilStats | null>(null);
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingFunil, setLoadingFunil] = useState(true);
  const [loadingTable, setLoadingTable] = useState(true);

  const [filters, setFilters] = useState<ProspectFilters>({});
  const [searchInput, setSearchInput] = useState('');
  const [searchDebounced, setSearchDebounced] = useState('');
  const [contactPopup, setContactPopup] = useState<{ type: 'email' | 'tel'; value: string; name: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [decisoresPopup, setDecisoresPopup] = useState<Prospect | null>(null);
  const [decisores, setDecisores] = useState<Decisor[]>([]);
  const [loadingDecisores, setLoadingDecisores] = useState(false);

  const hasActiveFilters = !!(filters.segmento || filters.estado || filters.distribuidora || filters.contato || searchInput);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Carrega decisores quando o popup abre.
  // Tenta leads_decisores (Hub & Spoke). Se vazio, usa campos inline do prospects.
  useEffect(() => {
    if (!decisoresPopup) { setDecisores([]); return; }
    setLoadingDecisores(true);
    fetchLeadDecisores(decisoresPopup.id)
      .then(fetched => {
        if (fetched.length > 0) {
          setDecisores(fetched);
        } else {
          // Fallback: decisor inline gravado no próprio registro do prospects
          const inline: Decisor[] = [];
          if (decisoresPopup.decisorNome) {
            inline.push({
              id: `inline-${decisoresPopup.id}`,
              leadId: decisoresPopup.id,
              nome: decisoresPopup.decisorNome,
              cargo: decisoresPopup.decisorCargo,
              email: decisoresPopup.decisorEmail,
              telefone: decisoresPopup.decisorTelefone,
              eDecisor: true,
              fonte: 'prospects (inline)',
            });
          }
          setDecisores(inline);
        }
      })
      .catch(console.error)
      .finally(() => setLoadingDecisores(false));
  }, [decisoresPopup]);

  // Debounce da busca
  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(searchInput), 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  // Carrega stats (prospects)
  const loadStats = useCallback(() => {
    setLoadingStats(true);
    fetchProspectStats()
      .then(setStats)
      .catch(console.error)
      .finally(() => setLoadingStats(false));
  }, []);

  // Carrega stats do funil (energy_analysis)
  const loadFunil = useCallback(() => {
    setLoadingFunil(true);
    fetchFunilStats()
      .then(setFunilStats)
      .catch(console.error)
      .finally(() => setLoadingFunil(false));
  }, []);

  useEffect(() => { loadStats(); loadFunil(); }, [loadStats, loadFunil]);

  // Carrega tabela
  const loadTable = useCallback(() => {
    setLoadingTable(true);
    const activeFilters: ProspectFilters = { ...filters, search: searchDebounced || undefined };
    fetchProspects(activeFilters, page, PAGE_SIZE)
      .then(({ data, count }) => {
        setProspects(data);
        setTotalCount(count);
      })
      .catch(console.error)
      .finally(() => setLoadingTable(false));
  }, [filters, page, searchDebounced]);

  useEffect(() => { loadTable(); }, [loadTable]);

  const setFilter = (key: keyof ProspectFilters, value: string) => {
    setPage(0);
    setFilters(prev => ({ ...prev, [key]: value || undefined }));
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  // Dados para gráficos
  const distData = (stats?.porDistribuidora ?? []).map(d => ({
    name: d.distribuidora
      .replace('Equatorial ', 'Eq. ')
      .replace('CEEE Equatorial', 'CEEE Eq.'),
    segA: d.segA,
    outros: d.total - d.segA,
  }));

  const pieData = stats ? [
    { name: 'Seg A — HOT',   value: stats.segA,                                   fill: SEG_COLORS.A },
    { name: 'Seg B — Morno', value: stats.segB,                                   fill: SEG_COLORS.B },
    { name: 'Seg C — Frio',  value: Math.max(0, stats.qualificados - stats.segA - stats.segB), fill: SEG_COLORS.C },
  ].filter(d => d.value > 0) : [];

  const ufBarData = (funilStats?.porUF ?? []).map(d => ({
    uf: d.uf,
    'Não Migrados': d.naoMigrados,
    'Já no ML': d.jaNoML,
  }));

  const funilUFData = (funilStats?.funilQuentePorUF ?? []).map(d => ({
    uf: d.uf,
    value: d.count,
  }));

  return (
    <>
    <div>

      {/* ================================================================== */}
      {/* HEADER                                                              */}
      {/* ================================================================== */}
      <div className="pb-8">
        <div className="h-1 w-16 bg-[#E0B814] rounded-full mb-6" />
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
              Billi · Inteligência de Mercado · 6 Estados
            </p>
            <h2 className="text-4xl font-black text-slate-900 tracking-tight">
              Prospect HUB
            </h2>
          </div>
          <button
            onClick={() => { loadStats(); loadFunil(); loadTable(); }}
            className="p-2 rounded-lg border border-slate-200 text-slate-400 hover:text-slate-700 hover:border-slate-300 transition-colors mt-1"
            title="Recarregar dados"
          >
            <RefreshCw size={15} />
          </button>
        </div>

        {/* Briefing line — aparece quando os dados carregam */}
        {!loadingStats && !loadingFunil && stats && funilStats && (
          <div className="flex items-center gap-6 mt-5 pt-5 border-t border-slate-200">
            <div>
              <span className="text-2xl font-black text-slate-900 tracking-tight">
                {funilStats.funilQuente.toLocaleString('pt-BR')}
              </span>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Funil Quente</p>
            </div>
            <div className="w-px h-8 bg-slate-200" />
            <div>
              <span className="text-2xl font-black text-slate-900 tracking-tight">
                {stats.segA.toLocaleString('pt-BR')}
              </span>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Seg A Prontos</p>
            </div>
            <div className="w-px h-8 bg-slate-200" />
            <div>
              <span className="text-2xl font-black" style={{ color: '#E0B814' }}>{ESTADOS.length}</span>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Estados</p>
            </div>
            <div className="w-px h-8 bg-slate-200" />
            <div>
              <span className="text-2xl font-black text-slate-900 tracking-tight">
                {funilStats.naoMigrados.toLocaleString('pt-BR')}
              </span>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Não Migrados</p>
            </div>
          </div>
        )}
      </div>

      {/* ================================================================== */}
      {/* SEÇÃO 1 — O MERCADO (energy_analysis / ANEEL)                      */}
      {/* ================================================================== */}
      <section className="pt-8 border-t border-slate-200">
        <div className="mb-6">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">01 — O Mercado</p>
          <h3 className="text-2xl font-black text-slate-900 tracking-tight">Funil de Qualificação</h3>
          {!loadingFunil && funilStats && (
            <p className="text-sm text-slate-500 font-medium mt-2 max-w-2xl leading-relaxed">
              Existem{' '}
              <span className="text-slate-900 font-black">{funilStats.universoReal.toLocaleString('pt-BR')}</span>{' '}
              unidades consumidoras elegíveis no território Equatorial. Das{' '}
              <span className="text-slate-900 font-black">{funilStats.naoMigrados.toLocaleString('pt-BR')}</span>{' '}
              que ainda não migraram para o mercado livre,{' '}
              <span className="font-black" style={{ color: '#E0B814' }}>
                {funilStats.funilQuente.toLocaleString('pt-BR')}
              </span>{' '}
              estão no funil quente — prontas para abordagem imediata.
            </p>
          )}
        </div>

        {/* Funil visual */}
        {loadingFunil ? (
          <div className="space-y-3 mb-10 max-w-3xl">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14" />)}
          </div>
        ) : funilStats && (
          <div className="mb-10 max-w-3xl">
            <FunnelStep
              label="Universo Real"
              sublabel="UCs sem geradores"
              count={funilStats.universoReal}
              maxCount={funilStats.universoReal}
              color="#cbd5e1"
            />
            <FunnelStep
              label="Não Migrados"
              sublabel="Alvo principal"
              count={funilStats.naoMigrados}
              maxCount={funilStats.universoReal}
              pct={funilStats.universoReal > 0
                ? `${((funilStats.naoMigrados / funilStats.universoReal) * 100).toFixed(0)}% do universo`
                : ''}
              color="#3b82f6"
            />
            <FunnelStep
              label="Elegíveis ≥ 4"
              sublabel="Score mínimo"
              count={funilStats.elegiveis}
              maxCount={funilStats.universoReal}
              pct={funilStats.naoMigrados > 0
                ? `${((funilStats.elegiveis / funilStats.naoMigrados) * 100).toFixed(0)}% dos não mig.`
                : ''}
              color="#f59e0b"
            />
            <FunnelStep
              label="Funil Quente ≥ 6"
              sublabel="Prioridade máxima"
              count={funilStats.funilQuente}
              maxCount={funilStats.universoReal}
              pct={funilStats.elegiveis > 0
                ? `${((funilStats.funilQuente / funilStats.elegiveis) * 100).toFixed(0)}% dos eleg.`
                : ''}
              color="#E0B814"
            />
          </div>
        )}

        {/* Gráficos do funil */}
        {!loadingFunil && funilStats && funilStats.universoReal > 0 && (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <div className="bg-white p-6 border border-slate-100 rounded-2xl">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-5">
                  Distribuição por UF — Não Migrados × Já no ML
                </h3>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={ufBarData} layout="vertical" margin={{ left: 0, right: 24 }}>
                    <XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                    <YAxis type="category" dataKey="uf" tick={{ fontSize: 10, fill: '#64748b' }} tickLine={false} axisLine={false} width={28} />
                    <Tooltip
                      contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 12, color: '#1e293b', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.07)' }}
                      formatter={(v: number) => v.toLocaleString('pt-BR')}
                    />
                    <Legend iconType="circle" iconSize={8} formatter={(v) => <span style={{ color: '#64748b', fontSize: 11, fontWeight: 600 }}>{v}</span>} />
                    <Bar dataKey="Não Migrados" stackId="a" fill="#3b82f6" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="Já no ML"     stackId="a" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-white p-6 border border-slate-100 rounded-2xl">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-5">
                  Distribuição de Score — Universo Real
                </h3>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={funilStats.scoreDistribuicao} margin={{ left: 0, right: 24 }}>
                    <XAxis dataKey="faixa" tick={{ fontSize: 10, fill: '#64748b' }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 12, color: '#1e293b' }}
                      formatter={(v: number) => v.toLocaleString('pt-BR')}
                    />
                    <Bar dataKey="count" name="UCs" radius={[4, 4, 0, 0]}>
                      {funilStats.scoreDistribuicao.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <div className="bg-white p-6 border border-slate-100 rounded-2xl">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-5">
                  Funil Quente por UF (Score ≥ 6)
                </h3>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={funilUFData} layout="vertical" margin={{ left: 0, right: 24 }}>
                    <XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                    <YAxis type="category" dataKey="uf" tick={{ fontSize: 10, fill: '#64748b' }} tickLine={false} axisLine={false} width={28} />
                    <Tooltip
                      contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 12, color: '#1e293b' }}
                      formatter={(v: number) => v.toLocaleString('pt-BR')}
                    />
                    <Bar dataKey="value" name="Funil Quente" fill="#E0B814" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-white p-6 border border-slate-100 rounded-2xl">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">
                  Top Municípios · Funil Quente
                </h3>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b-2 border-slate-100">
                      <th className="text-left text-[10px] font-black text-slate-400 uppercase tracking-widest pb-2">Município</th>
                      <th className="text-right text-[10px] font-black text-slate-400 uppercase tracking-widest pb-2">Não Mig.</th>
                      <th className="text-right text-[10px] font-black text-slate-400 uppercase tracking-widest pb-2">Quente</th>
                    </tr>
                  </thead>
                  <tbody>
                    {funilStats.topMunicipios.map((m, i) => (
                      <tr key={i} className="border-b border-slate-50 hover:bg-[#E0B814]/5 transition-colors">
                        <td className="py-2">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-black text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">{m.uf}</span>
                            <span className="font-medium text-slate-700 truncate max-w-[130px]" title={m.municipio}>{m.municipio}</span>
                          </div>
                        </td>
                        <td className="py-2 text-right font-mono text-slate-500">{m.naoMigrados.toLocaleString('pt-BR')}</td>
                        <td className="py-2 text-right">
                          <span className="font-mono font-black" style={{ color: '#E0B814' }}>{m.funilQuente.toLocaleString('pt-BR')}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </section>

      {/* ================================================================== */}
      {/* SEÇÃO 2 — SUA BASE (tabela prospects)                              */}
      {/* ================================================================== */}
      <section className="pt-10 border-t border-slate-200">
        <div className="mb-6">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">02 — Sua Base</p>
          <h3 className="text-2xl font-black text-slate-900 tracking-tight">Prospects Qualificados</h3>
          {!loadingStats && stats && (
            <p className="text-sm text-slate-500 font-medium mt-2 max-w-2xl leading-relaxed">
              Base enriquecida com{' '}
              <span className="text-slate-900 font-black">{stats.qualificados.toLocaleString('pt-BR')}</span>{' '}
              prospects qualificados (Seg A + B) de um total de{' '}
              <span className="text-slate-900 font-black">{stats.baseTotal.toLocaleString('pt-BR')}</span>{' '}
              registros.{' '}
              <span className="font-black text-slate-700">{stats.segA.toLocaleString('pt-BR')}</span>{' '}
              estão no Seg A — prontos para contato imediato.
            </p>
          )}
        </div>

        {/* Stats sem card — grid com divisores */}
        {loadingStats ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-10">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20" />)}
          </div>
        ) : stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-slate-100 mb-10">
            <div className="py-4 md:py-0 md:pr-8">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Base Total</p>
              <p className="text-4xl font-black text-slate-900 tracking-tight mt-1">{stats.baseTotal.toLocaleString('pt-BR')}</p>
              <p className="text-[11px] text-slate-400 mt-1 font-medium">Registros brutos</p>
            </div>
            <div className="py-4 md:py-0 md:px-8">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Qualificados</p>
              <p className="text-4xl font-black tracking-tight mt-1" style={{ color: '#E0B814' }}>
                {stats.qualificados.toLocaleString('pt-BR')}
              </p>
              <p className="text-[11px] text-slate-400 mt-1 font-medium">Seg A + Seg B</p>
            </div>
            <div className="py-4 md:py-0 md:px-8">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Seg A — HOT</p>
              <p className="text-4xl font-black tracking-tight mt-1" style={{ color: '#ef4444' }}>
                {stats.segA.toLocaleString('pt-BR')}
              </p>
              <p className="text-[11px] text-slate-400 mt-1 font-medium">Score ≥ 7</p>
            </div>
            <div className="py-4 md:py-0 md:pl-8">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Seg B — Morno</p>
              <p className="text-4xl font-black tracking-tight mt-1" style={{ color: '#f59e0b' }}>
                {stats.segB.toLocaleString('pt-BR')}
              </p>
              <p className="text-[11px] text-slate-400 mt-1 font-medium">Score 4–6</p>
            </div>
          </div>
        )}

        {/* Gráficos prospects */}
        {stats && stats.baseTotal > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            <div className="lg:col-span-2 bg-white p-6 border border-slate-100 rounded-2xl">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-5">
                Prospects por Distribuidora
              </h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={distData} layout="vertical" margin={{ left: 8, right: 24 }}>
                  <XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} tickLine={false} axisLine={false} width={100} />
                  <Tooltip
                    contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 12, color: '#1e293b', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.07)' }}
                  />
                  <Bar dataKey="segA"   name="Seg A"  stackId="a" fill="#E0B814" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="outros" name="Outros" stackId="a" fill="#e2e8f0" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white p-6 border border-slate-100 rounded-2xl flex flex-col">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                Segmentação
              </h3>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%" cy="50%"
                    innerRadius={50} outerRadius={70}
                    paddingAngle={3}
                    dataKey="value"
                    stroke="none"
                  >
                    {pieData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 12, color: '#1e293b' }}
                    formatter={(v: number) => v.toLocaleString('pt-BR')}
                  />
                  <Legend
                    iconType="circle"
                    iconSize={8}
                    formatter={(v) => <span style={{ color: '#64748b', fontSize: 11, fontWeight: 600 }}>{v}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </section>

      {/* ================================================================== */}
      {/* SEÇÃO 3 — LEADS                                                     */}
      {/* ================================================================== */}
      <section className="pt-10 border-t border-slate-200">
        <div className="mb-5">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">03 — Leads</p>
          <h3 className="text-2xl font-black text-slate-900 tracking-tight">Lista de Leads</h3>
        </div>

        {/* FILTROS */}
        <div className="mb-4">
          <div className="flex flex-wrap gap-2 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Empresa, município, CNPJ..."
                value={searchInput}
                onChange={e => { setPage(0); setSearchInput(e.target.value); }}
                className="w-full border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#E0B814] transition-colors bg-white"
              />
            </div>

            <select
              value={filters.segmento ?? ''}
              onChange={e => setFilter('segmento', e.target.value)}
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:border-[#E0B814] bg-white transition-colors"
            >
              <option value="">Todos segmentos</option>
              <option value="A">Seg A — HOT</option>
              <option value="B">Seg B — Morno</option>
              <option value="C">Seg C — Frio</option>
            </select>

            <select
              value={filters.estado ?? ''}
              onChange={e => setFilter('estado', e.target.value)}
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:border-[#E0B814] bg-white transition-colors"
            >
              <option value="">Todos estados</option>
              {ESTADOS.map(e => <option key={e} value={e}>{e}</option>)}
            </select>

            <select
              value={filters.distribuidora ?? ''}
              onChange={e => setFilter('distribuidora', e.target.value)}
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:border-[#E0B814] bg-white transition-colors"
            >
              <option value="">Todas distribuidoras</option>
              {DISTRIBUIDORAS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>

            <select
              value={filters.contato ?? ''}
              onChange={e => setFilter('contato', e.target.value)}
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:border-[#E0B814] bg-white transition-colors"
            >
              <option value="">Qualquer contato</option>
              <option value="email">Tem e-mail</option>
              <option value="tel">Tem telefone</option>
              <option value="ambos">Tem ambos</option>
            </select>

            {hasActiveFilters && (
              <button
                onClick={() => { setFilters({}); setSearchInput(''); setSearchDebounced(''); setPage(0); }}
                className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900 font-bold transition-colors px-2 py-2"
              >
                <X size={12} /> Limpar
              </button>
            )}

            <div className="flex items-center text-xs text-slate-400 font-medium ml-auto">
              {prospects.length} de {totalCount.toLocaleString('pt-BR')} leads
            </div>
          </div>
        </div>

        {/* TABELA */}
        <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden">
          {loadingTable ? (
            <div className="flex items-center justify-center h-40 text-slate-400">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#E0B814] mr-3" />
              <span className="text-sm font-medium">Carregando prospects...</span>
            </div>
          ) : prospects.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-slate-400">
              <Building2 size={32} className="mb-2 opacity-30" />
              <p className="text-sm font-medium">Nenhum prospect encontrado.</p>
              <p className="text-xs mt-1 text-slate-300">
                Execute <code className="bg-slate-100 px-1 rounded text-slate-500">popular_prospects_equatorial.py</code> para importar os dados.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto max-h-[560px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10">
                  <tr className="border-b-2 border-slate-100 bg-white">
                    {['SEG', 'SCORE', 'EMPRESA', 'DISTRIBUIDORA', 'EST.', 'MUNICÍPIO', 'CLASSE', 'TARIFA', 'kW', 'TENSÃO', 'CONTATO'].map(col => (
                      <th key={col} className="px-3 py-3 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {prospects.map((p) => (
                    <tr
                      key={p.id}
                      className="border-b border-slate-100 hover:bg-[#E0B814]/10 transition-colors bg-white"
                    >
                      {/* SEG */}
                      <td className="px-3 py-2.5">
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded ${SEG_BADGE[p.segmento]}`}>
                          {p.segmento} · {SEG_LABELS[p.segmento]}
                        </span>
                      </td>
                      {/* SCORE */}
                      <td className="px-3 py-2.5">
                        <ScoreBar score={p.score} segmento={p.segmento} />
                      </td>
                      {/* EMPRESA */}
                      <td className="px-3 py-2.5 max-w-[180px]">
                        <p className="font-bold text-slate-900 truncate" title={p.nome}>{p.nome}</p>
                        {p.cnpj && <p className="text-[10px] font-mono text-slate-400">{p.cnpj}</p>}
                      </td>
                      {/* DISTRIBUIDORA */}
                      <td className="px-3 py-2.5 text-slate-600 whitespace-nowrap text-xs font-medium">{p.distribuidora ?? '—'}</td>
                      {/* ESTADO */}
                      <td className="px-3 py-2.5">
                        <span className="text-xs font-black text-slate-700 bg-slate-100 px-2 py-0.5 rounded">{p.estado ?? '—'}</span>
                      </td>
                      {/* MUNICÍPIO */}
                      <td className="px-3 py-2.5 text-slate-600 text-xs max-w-[130px]">
                        <span className="flex items-center gap-1 truncate" title={p.municipio}>
                          <MapPin size={10} className="shrink-0 text-slate-400" />
                          {p.municipio ?? '—'}
                        </span>
                      </td>
                      {/* CLASSE */}
                      <td className="px-3 py-2.5 text-slate-500 text-xs max-w-[100px] truncate" title={p.classe ?? ''}>{p.classe ?? '—'}</td>
                      {/* TARIFA */}
                      <td className="px-3 py-2.5">
                        <span className="text-xs font-mono font-bold text-slate-600">{p.tarifa ?? '—'}</span>
                      </td>
                      {/* kW */}
                      <td className="px-3 py-2.5">
                        <span className="text-xs font-mono font-black text-slate-900">
                          {p.potencia != null ? p.potencia.toLocaleString('pt-BR') : '—'}
                        </span>
                      </td>
                      {/* TENSÃO */}
                      <td className="px-3 py-2.5">
                        {p.nivelTensao ? (
                          <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono font-bold">
                            {p.nivelTensao}
                          </span>
                        ) : <span className="text-slate-300">—</span>}
                      </td>
                      {/* CONTATO */}
                      <td className="px-3 py-2.5">
                        <div className="flex gap-0.5 items-center">
                          {p.email && (
                            <button
                              onClick={() => setContactPopup({ type: 'email', value: p.email!, name: p.nome })}
                              className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                              title={p.email}
                            >
                              <Mail size={13} />
                            </button>
                          )}
                          {p.tel && (
                            <button
                              onClick={() => setContactPopup({ type: 'tel', value: p.tel!, name: p.nome })}
                              className="p-1.5 text-green-500 hover:bg-green-50 rounded-lg transition-colors"
                              title={p.tel}
                            >
                              <Phone size={13} />
                            </button>
                          )}
                          {/* Botão decisores */}
                          <button
                            onClick={() => setDecisoresPopup(p)}
                            className="p-1.5 text-violet-500 hover:bg-violet-50 rounded-lg transition-colors"
                            title="Ver decisores / sócios"
                          >
                            <Users size={13} />
                          </button>
                          {!p.email && !p.tel && <span className="text-slate-300 text-xs">—</span>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* PAGINAÇÃO */}
          {!loadingTable && totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
              <span className="text-xs text-slate-400 font-medium">
                Pág. {page + 1} / {totalPages} · {totalCount.toLocaleString('pt-BR')} registros
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(p => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="px-3 py-1.5 text-xs bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-colors font-medium"
                >
                  ← Anterior
                </button>
                <button
                  onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                  className="px-3 py-1.5 text-xs bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-colors font-medium"
                >
                  Próxima →
                </button>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>

    {/* MODAL DECISORES */}
    {decisoresPopup && (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
        onClick={() => setDecisoresPopup(null)}
      >
        <div
          className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 flex flex-col overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <Users size={16} className="text-violet-500" />
                <span className="text-sm font-black text-slate-900 uppercase tracking-wide">Decisores</span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5 truncate max-w-[340px]">{decisoresPopup.nome}</p>
            </div>
            <button onClick={() => setDecisoresPopup(null)} className="text-slate-400 hover:text-slate-700 transition-colors">
              <X size={18} />
            </button>
          </div>

          {/* Conteúdo */}
          <div className="px-6 py-4 max-h-[60vh] overflow-y-auto">
            {loadingDecisores ? (
              <div className="flex items-center justify-center py-8 text-slate-400 gap-2">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-violet-500" />
                <span className="text-sm">Carregando...</span>
              </div>
            ) : decisores.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-slate-300">
                <Users size={28} className="mb-2" />
                <p className="text-sm font-medium text-slate-400">Nenhum decisor cadastrado</p>
                <p className="text-xs text-slate-300 mt-1">Execute o pipeline de enriquecimento para adicionar sócios.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {decisores.map(d => (
                  <div key={d.id} className={`border rounded-xl p-4 ${d.eDecisor ? 'border-violet-200 bg-violet-50' : 'border-slate-100 bg-white'}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-black text-slate-900">{d.nome}</span>
                          {d.eDecisor && (
                            <span className="text-[9px] font-black bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded uppercase tracking-wide">Principal</span>
                          )}
                        </div>
                        {d.cargo && <p className="text-xs text-slate-500 mt-0.5">{d.cargo}</p>}
                        {d.fonte && <p className="text-[10px] text-slate-400 mt-0.5">Fonte: {d.fonte}</p>}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-3">
                      {d.email && (
                        <button
                          onClick={() => { navigator.clipboard.writeText(d.email!); }}
                          className="flex items-center gap-1 text-[11px] bg-blue-50 text-blue-600 border border-blue-200 px-2.5 py-1 rounded-lg font-bold hover:bg-blue-100 transition-colors"
                          title={`Copiar: ${d.email}`}
                        >
                          <Mail size={10} /> {d.email}
                        </button>
                      )}
                      {d.telefone && (
                        <button
                          onClick={() => { navigator.clipboard.writeText(d.telefone!); }}
                          className="flex items-center gap-1 text-[11px] bg-green-50 text-green-600 border border-green-200 px-2.5 py-1 rounded-lg font-bold hover:bg-green-100 transition-colors"
                          title={`Copiar: ${d.telefone}`}
                        >
                          <Phone size={10} /> {d.telefone}
                        </button>
                      )}
                      {d.linkedin && (
                        <a
                          href={d.linkedin.startsWith('http') ? d.linkedin : `https://${d.linkedin}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-[11px] bg-sky-50 text-sky-600 border border-sky-200 px-2.5 py-1 rounded-lg font-bold hover:bg-sky-100 transition-colors"
                        >
                          <Linkedin size={10} /> LinkedIn
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    )}

    {/* POPUP DE CONTATO */}
    {contactPopup && (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
        onClick={() => { setContactPopup(null); setCopied(false); }}
      >
        <div
          className="bg-white rounded-2xl shadow-2xl p-6 w-80 flex flex-col gap-4"
          onClick={e => e.stopPropagation()}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {contactPopup.type === 'email'
                ? <Mail size={18} className="text-blue-500" />
                : <Phone size={18} className="text-green-500" />}
              <span className="text-sm font-black text-slate-900 uppercase tracking-wide">
                {contactPopup.type === 'email' ? 'E-mail' : 'Telefone'}
              </span>
            </div>
            <button onClick={() => { setContactPopup(null); setCopied(false); }} className="text-slate-400 hover:text-slate-700 transition-colors">
              <X size={18} />
            </button>
          </div>
          <p className="text-xs text-slate-500 font-medium -mt-2 truncate">{contactPopup.name}</p>
          <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 break-all select-all">
            {contactPopup.value}
          </div>
          <button
            onClick={() => handleCopy(contactPopup.value)}
            className={`py-2.5 rounded-xl text-sm font-black transition-colors ${
              copied ? 'bg-green-500 text-white' : 'bg-slate-900 text-white hover:bg-slate-700'
            }`}
          >
            {copied ? '✓ Copiado!' : 'Copiar'}
          </button>
        </div>
      </div>
    )}
    </>
  );
};

export default ProspectHub;