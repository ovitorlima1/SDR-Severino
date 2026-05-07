
import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid, LabelList } from 'recharts';
import { Target, Loader2, BrainCircuit, Database, Briefcase, Megaphone, UserCheck } from 'lucide-react';
import { Client } from '../types';
import { fetchTariffDistribution, fetchProfileDistribution, fetchSectorDistribution, fetchCampaignsCount, fetchCampaignsByRegion, fetchLeadsInCampaignsCount } from '../services/persistenceService';

interface DashboardProps {
  clients: Client[];
  totalLeadsOverride?: number;
  totalPendingOverride?: number;
}

export const Dashboard: React.FC<DashboardProps> = ({
  clients,
  totalLeadsOverride,
  totalPendingOverride,
}) => {
  
  // Estados para dados estatísticos vindos diretamente do banco (sem limite de 20k)
  const [tariffStats, setTariffStats] = useState<{name: string, value: number}[]>([]);
  const [profileStats, setProfileStats] = useState<{name: string, value: number}[]>([]);
  const [sectorStats, setSectorStats] = useState<{name: string, value: number}[]>([]);
  const [campaignsCount, setCampaignsCount] = useState<number>(0);
  const [campaignsByRegion, setCampaignsByRegion] = useState<{name: string, value: number}[]>([]);
  const [leadsInCampaigns, setLeadsInCampaigns] = useState<number>(0);
  const [loadingStats, setLoadingStats] = useState(true);

  const totalLeads = totalLeadsOverride !== undefined ? totalLeadsOverride : clients.length;
  const pendingCount = totalPendingOverride !== undefined 
    ? totalPendingOverride 
    : clients.filter(c => c.segment === 'Não Segmentado').length;

  const enrichedClients = totalLeads - pendingCount;

  useEffect(() => {
    let mounted = true;

    const loadData = async () => {
      setLoadingStats(true);
      
      // Carrega Estatísticas Reais do Banco
      try {
        const [tariffs, profiles, sectors, campCount, campRegions, inCampaigns] = await Promise.all([
           fetchTariffDistribution(),
           fetchProfileDistribution(),
           fetchSectorDistribution(),
           fetchCampaignsCount(),
           fetchCampaignsByRegion(),
           fetchLeadsInCampaignsCount()
        ]);

        if (mounted) {
          setTariffStats(tariffs);
          setProfileStats(profiles);
          setSectorStats(sectors);
          setCampaignsCount(campCount);
          setCampaignsByRegion(campRegions);
          setLeadsInCampaigns(inCampaigns);
        }
      } catch (e) {
        console.error("Falha ao carregar estatísticas do dashboard");
      } finally {
        if (mounted) setLoadingStats(false);
      }
    };
    loadData();

    return () => { mounted = false; };
  }, []); // Executa apenas na montagem

  // Cores Clean: Amarelo (Primary) + Tons de Slate
  const COLORS = ['#E0B814', '#E2E8F0', '#94A3B8', '#64748B', '#475569', '#1E293B'];

  // Prepara dados de perfil para o gráfico de pizza (adiciona porcentagem)
  const chartProfileData = React.useMemo(() => {
    const total = profileStats.reduce((acc, curr) => acc + curr.value, 0);
    return profileStats.map(item => ({
      ...item,
      percentage: total > 0 ? ((item.value / total) * 100).toFixed(1) : 0
    }));
  }, [profileStats]);

  const renderCustomizedLabel = (props: any) => {
    const { cx, cy, midAngle, innerRadius, outerRadius, value, name, percentage } = props;
    const RADIAN = Math.PI / 180;
    const radius = outerRadius + 25;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text 
        x={x} 
        y={y} 
        fill="#334155" 
        textAnchor={x > cx ? 'start' : 'end'} 
        dominantBaseline="central"
        className="text-[10px] font-bold uppercase tracking-tight"
      >
        {`${name}: ${value} (${percentage}%)`}
      </text>
    );
  };

  return (
    <div className="space-y-8 relative">
      <div className="border-b border-slate-200 pb-6">
        <h2 className="text-3xl font-black text-slate-900 tracking-tight">Inteligência de Base</h2>
        <p className="text-slate-500 font-medium mt-1">
          Segmentação e enriquecimento de dados via IA.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <div className="bg-white p-6 border border-slate-100 rounded-xl shadow-sm hover:shadow-md transition-all">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Database size={12}/> Total Leads</p>
          <h3 className="text-4xl font-black text-slate-900 mt-2 tracking-tighter">{totalLeads.toLocaleString()}</h3>
        </div>
        <div className="bg-white p-6 border border-slate-100 rounded-xl shadow-sm hover:shadow-md transition-all relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-primary"></div>
          <p className="text-[10px] font-black text-primary uppercase tracking-widest">Leads Mapeados</p>
          <div className="flex items-end justify-between mt-2">
            <h3 className="text-4xl font-black text-slate-900 tracking-tighter">{enrichedClients.toLocaleString()}</h3>
            <span className="text-xs font-bold text-slate-400 mb-1 bg-slate-50 px-2 py-1 rounded">
              {totalLeads > 0 ? Math.round((enrichedClients/totalLeads)*100) : 0}%
            </span>
          </div>
        </div>
        <div className="bg-white p-6 border border-slate-100 rounded-xl shadow-sm hover:shadow-md transition-all relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-primary"></div>
          <p className="text-[10px] font-black text-primary uppercase tracking-widest">Leads p/ Segmentar</p>
          <div className="flex items-end justify-between mt-2">
            <h3 className="text-4xl font-black text-slate-900 tracking-tighter">{pendingCount.toLocaleString()}</h3>
             <span className="text-xs font-bold text-slate-400 mb-1 bg-slate-50 px-2 py-1 rounded">
              {totalLeads > 0 ? Math.round((pendingCount/totalLeads)*100) : 0}%
            </span>
          </div>
        </div>
        <div className="bg-white p-6 border border-slate-100 rounded-xl shadow-sm hover:shadow-md transition-all">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Megaphone size={12}/> Total Campanhas</p>
          <h3 className="text-4xl font-black text-slate-900 mt-2 tracking-tighter">{campaignsCount.toLocaleString()}</h3>
        </div>
        <div className="bg-white p-6 border border-slate-100 rounded-xl shadow-sm hover:shadow-md transition-all">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><UserCheck size={12}/> Disponíveis p/ Campanha</p>
          <h3 className="text-4xl font-black text-slate-900 mt-2 tracking-tighter">{(totalLeads - leadsInCampaigns).toLocaleString()}</h3>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* Gráfico de Perfis (Mindset) */}
        <div className="bg-white p-8 border border-slate-200 rounded-xl shadow-sm h-[480px] flex flex-col">
          <h3 className="text-sm font-black text-slate-900 uppercase mb-1 flex items-center gap-2 tracking-wide">
            <Target size={16} className="text-primary" /> Perfis (Mindset)
          </h3>
          <p className="text-[10px] text-slate-400 mb-6 font-bold uppercase tracking-wider">Distribuição da Carteira (Total DB)</p>
          <div className="flex-1 overflow-visible relative">
            {loadingStats ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="animate-spin text-slate-300" size={32} />
              </div>
            ) : chartProfileData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart margin={{ left: 20, right: 20, top: 0, bottom: 0 }}>
                  <Pie 
                    data={chartProfileData} 
                    innerRadius={60} 
                    outerRadius={90} 
                    paddingAngle={4} 
                    dataKey="value"
                    label={renderCustomizedLabel}
                    stroke="none"
                  >
                    {chartProfileData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#fff', color: '#1E293B', borderRadius: '8px', border: '1px solid #E2E8F0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    itemStyle={{ color: '#1E293B', fontSize: '12px', fontWeight: 'bold' }}
                  />
                  <Legend 
                    verticalAlign="bottom" 
                    height={36} 
                    iconType="circle"
                    wrapperStyle={{ paddingTop: '20px', fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', color: '#64748B' }} 
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-300">
                <BrainCircuit size={40} className="mb-2 opacity-20" />
                <span className="text-xs font-bold uppercase">Sem dados</span>
              </div>
            )}
          </div>
        </div>

        {/* Gráfico de Setores (Classe Principal) */}
        <div className="bg-white p-8 border border-slate-200 rounded-xl shadow-sm h-[480px] flex flex-col">
          <h3 className="text-sm font-black text-slate-900 uppercase mb-1 flex items-center gap-2 tracking-wide">
            <Briefcase size={16} className="text-slate-400" /> Setores (Classe)
          </h3>
          <p className="text-[10px] text-slate-400 mb-6 font-bold uppercase tracking-wider">Top Setores no Supabase (Real)</p>
          <div className="flex-1 relative">
            {loadingStats ? (
              <div className="absolute inset-0 flex items-center justify-center">
                 <Loader2 className="animate-spin text-slate-300" size={32} />
              </div>
            ) : sectorStats.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sectorStats} layout="vertical" margin={{ left: 0, right: 40, top: 10, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                  <XAxis type="number" hide />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    width={120} 
                    tick={{fontSize: 9, fontWeight: '700', fill: '#64748B'}} 
                    tickFormatter={(val: any) => String(val).toUpperCase()}
                  />
                  <Tooltip 
                    cursor={{ fill: '#f8fafc' }}
                    contentStyle={{ backgroundColor: '#fff', color: '#1E293B', borderRadius: '8px', border: '1px solid #E2E8F0' }}
                  />
                  <Bar dataKey="value" fill="#1E293B" barSize={30} radius={[0, 4, 4, 0]}>
                    <LabelList 
                      dataKey="value" 
                      position="right" 
                      offset={10}
                      style={{ fill: '#64748B', fontSize: '12px', fontWeight: '700' }} 
                      formatter={(val: number) => `${val}`}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-300">
                 <span className="text-xs font-bold uppercase">Sem dados</span>
              </div>
            )}
          </div>
        </div>

        {/* Gráfico de Tarifas (Real) */}
        <div className="bg-white p-8 border border-slate-200 rounded-xl shadow-sm h-[480px] flex flex-col">
          <h3 className="text-sm font-black text-slate-900 uppercase mb-1 flex items-center gap-2 tracking-wide">
            <Database size={16} className="text-primary" /> Tarifas (Real)
          </h3>
          <p className="text-[10px] text-slate-400 mb-6 font-bold uppercase tracking-wider">Dados brutos do banco</p>
          <div className="flex-1 overflow-visible relative">
            {loadingStats ? (
              <div className="absolute inset-0 flex items-center justify-center">
                 <Loader2 className="animate-spin text-slate-300" size={32} />
              </div>
            ) : tariffStats.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={tariffStats} layout="vertical" margin={{ left: 0, right: 40, top: 10, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                  <XAxis type="number" hide />
                  <YAxis
                    dataKey="name"
                    type="category"
                    width={90}
                    tick={{fontSize: 10, fontWeight: '700', fill: '#64748B'}}
                    tickFormatter={(val: any) => String(val).toUpperCase()}
                  />
                  <Tooltip
                    cursor={{ fill: '#f8fafc' }}
                    contentStyle={{ backgroundColor: '#fff', color: '#1E293B', borderRadius: '8px', border: '1px solid #E2E8F0' }}
                  />
                  <Bar dataKey="value" fill="#E0B814" barSize={20} radius={[0, 4, 4, 0]}>
                    <LabelList
                      dataKey="value"
                      position="right"
                      offset={10}
                      style={{ fill: '#64748B', fontSize: '12px', fontWeight: '700' }}
                      formatter={(val: number) => `${val}`}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-300">
                <span className="text-xs font-bold uppercase">Sem dados</span>
              </div>
            )}
          </div>
        </div>

        {/* Gráfico de Campanhas por Estado */}
        <div className="bg-white p-8 border border-slate-200 rounded-xl shadow-sm h-[480px] flex flex-col">
          <h3 className="text-sm font-black text-slate-900 uppercase mb-1 flex items-center gap-2 tracking-wide">
            <Megaphone size={16} className="text-primary" /> Campanhas por Estado
          </h3>
          <p className="text-[10px] text-slate-400 mb-6 font-bold uppercase tracking-wider">Distribuição por região</p>
          <div className="flex-1 relative">
            {loadingStats ? (
              <div className="absolute inset-0 flex items-center justify-center">
                 <Loader2 className="animate-spin text-slate-300" size={32} />
              </div>
            ) : campaignsByRegion.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={campaignsByRegion} layout="vertical" margin={{ left: 0, right: 40, top: 10, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                  <XAxis type="number" hide />
                  <YAxis
                    dataKey="name"
                    type="category"
                    width={90}
                    tick={{fontSize: 10, fontWeight: '700', fill: '#64748B'}}
                    tickFormatter={(val: any) => String(val).toUpperCase()}
                  />
                  <Tooltip
                    cursor={{ fill: '#f8fafc' }}
                    contentStyle={{ backgroundColor: '#fff', color: '#1E293B', borderRadius: '8px', border: '1px solid #E2E8F0' }}
                  />
                  <Bar dataKey="value" fill="#E0B814" barSize={20} radius={[0, 4, 4, 0]}>
                    <LabelList
                      dataKey="value"
                      position="right"
                      offset={10}
                      style={{ fill: '#64748B', fontSize: '12px', fontWeight: '700' }}
                      formatter={(val: number) => `${val}`}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-300">
                <span className="text-xs font-bold uppercase">Sem dados</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
