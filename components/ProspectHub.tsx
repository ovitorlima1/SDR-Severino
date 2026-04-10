import React, { useState, useEffect, useCallback } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend,
} from 'recharts';
import { Search, Mail, Phone, Building2, MapPin, RefreshCw, Crosshair, X } from 'lucide-react';
import { Prospect } from '../types';
import {
  fetchProspects,
  fetchProspectStats,
  ProspectStats,
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
  A: 'bg-red-50 text-red-600 border border-red-200',
  B: 'bg-amber-50 text-amber-600 border border-amber-200',
  C: 'bg-green-50 text-green-600 border border-green-200',
};

// =============================================================================
// KPI CARD
// =============================================================================
const KpiCard: React.FC<{
  label: string;
  value: string | number;
  sub?: string;
  accent?: boolean;
}> = ({ label, value, sub, accent = false }) => (
  <div className="bg-white p-5 border border-slate-100 rounded-xl shadow-sm hover:shadow-md transition-all relative overflow-hidden">
    {accent && <div className="absolute top-0 left-0 w-1 h-full bg-primary" />}
    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
    <h3 className={`text-3xl font-black tracking-tighter mt-1 ${accent ? 'text-primary' : 'text-slate-900'}`}>
      {typeof value === 'number' ? value.toLocaleString('pt-BR') : value}
    </h3>
    {sub && <p className="text-[11px] text-slate-400 mt-1 font-medium">{sub}</p>}
  </div>
);

// =============================================================================
// SCORE BAR
// =============================================================================
const ScoreBar: React.FC<{ score: number; segmento: string }> = ({ score, segmento }) => (
  <div className="flex items-center gap-2">
    <span className="text-xs font-mono font-bold text-slate-700 w-4 text-right">{score}</span>
    <div className="w-14 h-1.5 bg-slate-100 rounded-full overflow-hidden">
      <div
        className="h-full rounded-full"
        style={{ width: `${score * 10}%`, backgroundColor: SEG_COLORS[segmento] }}
      />
    </div>
  </div>
);

// =============================================================================
// COMPONENTE PRINCIPAL
// =============================================================================
export const ProspectHub: React.FC = () => {
  const [stats, setStats] = useState<ProspectStats | null>(null);
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingTable, setLoadingTable] = useState(true);

  const [filters, setFilters] = useState<ProspectFilters>({});
  const [searchInput, setSearchInput] = useState('');
  const [searchDebounced, setSearchDebounced] = useState('');
  const [contactPopup, setContactPopup] = useState<{ type: 'email' | 'tel'; value: string; name: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Debounce da busca
  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(searchInput), 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  // Carrega stats
  const loadStats = useCallback(() => {
    setLoadingStats(true);
    fetchProspectStats()
      .then(setStats)
      .catch(console.error)
      .finally(() => setLoadingStats(false));
  }, []);

  useEffect(() => { loadStats(); }, [loadStats]);

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
    { name: 'Seg C — Frio',  value: stats.qualificados - stats.segA - stats.segB, fill: SEG_COLORS.C },
  ].filter(d => d.value > 0) : [];

  return (
    <>
    <div className="space-y-8">
      {/* HEADER */}
      <div className="border-b border-slate-200 pb-6 flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <Crosshair size={28} className="text-primary" />
            Prospect HUB
          </h2>
          <p className="text-slate-500 font-medium mt-1">
            Inteligência de prospecção · Billi · 6 estados
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="bg-amber-50 text-amber-700 border border-amber-200 text-xs font-bold px-3 py-1.5 rounded-full uppercase tracking-wide">
            Grupo A · 6 estados
          </span>
          <button
            onClick={() => { loadStats(); loadTable(); }}
            className="p-2 rounded-lg border border-slate-200 text-slate-400 hover:text-slate-700 hover:border-slate-300 transition-colors"
            title="Recarregar"
          >
            <RefreshCw size={15} />
          </button>
        </div>
      </div>

      {/* KPIs */}
      {loadingStats ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white border border-slate-100 rounded-xl h-24 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <KpiCard label="Base Total"       value={stats?.baseTotal ?? 0}    sub="Registros brutos" />
          <KpiCard label="Qualificados"     value={stats?.qualificados ?? 0} sub="Seg A + Seg B" accent />
          <KpiCard label="Seg A — HOT"      value={stats?.segA ?? 0}         sub="Score ≥ 7" />
          <KpiCard label="Seg B — Morno"    value={stats?.segB ?? 0}         sub="Score 4–6" />
          <KpiCard label="CNPJ Válido"      value={stats?.cnpjValido ?? 0}   sub="Prontos p/ enriq." />
          <KpiCard label="Billi" value="6 estados"                sub="Relacionamento único" />
        </div>
      )}

      {/* GRÁFICOS */}
      {stats && stats.baseTotal > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Bar chart distribuidoras */}
          <div className="lg:col-span-2 bg-white p-6 border border-slate-100 rounded-xl shadow-sm">
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
                <Bar dataKey="segA"   name="Seg A"  stackId="a" fill="#F5BE01" radius={[0, 0, 0, 0]} />
                <Bar dataKey="outros" name="Outros" stackId="a" fill="#e2e8f0" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Donut segmentação */}
          <div className="bg-white p-6 border border-slate-100 rounded-xl shadow-sm flex flex-col">
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

      {/* FILTROS */}
      <div className="bg-white p-4 border border-slate-100 rounded-xl shadow-sm">
        <div className="flex flex-wrap gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Empresa, município, CNPJ..."
              value={searchInput}
              onChange={e => { setPage(0); setSearchInput(e.target.value); }}
              className="w-full border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-primary transition-colors"
            />
          </div>

          <select
            value={filters.segmento ?? ''}
            onChange={e => setFilter('segmento', e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:border-primary bg-white transition-colors"
          >
            <option value="">Todos segmentos</option>
            <option value="A">Seg A — HOT</option>
            <option value="B">Seg B — Morno</option>
            <option value="C">Seg C — Frio</option>
          </select>

          <select
            value={filters.estado ?? ''}
            onChange={e => setFilter('estado', e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:border-primary bg-white transition-colors"
          >
            <option value="">Todos estados</option>
            {ESTADOS.map(e => <option key={e} value={e}>{e}</option>)}
          </select>

          <select
            value={filters.distribuidora ?? ''}
            onChange={e => setFilter('distribuidora', e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:border-primary bg-white transition-colors"
          >
            <option value="">Todas distribuidoras</option>
            {DISTRIBUIDORAS.map(d => <option key={d} value={d}>{d}</option>)}
          </select>

          <select
            value={filters.contato ?? ''}
            onChange={e => setFilter('contato', e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:border-primary bg-white transition-colors"
          >
            <option value="">Qualquer contato</option>
            <option value="email">Tem e-mail</option>
            <option value="tel">Tem telefone</option>
            <option value="ambos">Tem ambos</option>
          </select>

          <div className="flex items-center text-xs text-slate-400 font-medium ml-auto">
            Exibindo {prospects.length} de {totalCount.toLocaleString('pt-BR')}
          </div>
        </div>
      </div>

      {/* TABELA */}
      <div className="bg-white border border-slate-100 rounded-xl shadow-sm overflow-hidden">
        {loadingTable ? (
          <div className="flex items-center justify-center h-40 text-slate-400">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mr-3" />
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
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  {['SEG', 'SCORE', 'EMPRESA', 'DISTRIBUIDORA', 'EST.', 'MUNICÍPIO', 'CLASSE', 'TARIFA', 'kW', 'TENSÃO', 'CONTATO'].map(col => (
                    <th key={col} className="px-3 py-3 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {prospects.map((p, i) => (
                  <tr
                    key={p.id}
                    className={`border-b border-slate-100 hover:bg-slate-50 transition-colors ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}`}
                  >
                    {/* SEG */}
                    <td className="px-3 py-2.5">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${SEG_BADGE[p.segmento]}`}>
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
                        <span className="text-[10px] bg-violet-50 text-violet-600 border border-violet-200 px-2 py-0.5 rounded font-mono font-bold">
                          {p.nivelTensao}
                        </span>
                      ) : <span className="text-slate-300">—</span>}
                    </td>
                    {/* CONTATO */}
                    <td className="px-3 py-2.5">
                      <div className="flex gap-1.5">
                        {p.email && (
                          <button
                            onClick={() => setContactPopup({ type: 'email', value: p.email!, name: p.nome })}
                            className="flex items-center gap-1 text-[10px] bg-blue-50 text-blue-600 border border-blue-200 px-1.5 py-0.5 rounded font-bold hover:bg-blue-100 transition-colors"
                          >
                            <Mail size={9} /> email
                          </button>
                        )}
                        {p.tel && (
                          <button
                            onClick={() => setContactPopup({ type: 'tel', value: p.tel!, name: p.nome })}
                            className="flex items-center gap-1 text-[10px] bg-green-50 text-green-600 border border-green-200 px-1.5 py-0.5 rounded font-bold hover:bg-green-100 transition-colors"
                          >
                            <Phone size={9} /> tel
                          </button>
                        )}
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
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50/50">
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
    </div>

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
