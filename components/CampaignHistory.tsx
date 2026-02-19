
import React, { useEffect, useState, useMemo } from 'react';
import { Clock, BarChart3, Users, Send, Loader2, PieChart as PieChartIcon, Calendar } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { fetchAllCampaigns } from '../services/persistenceService';
import { Campaign } from '../types';

export const CampaignHistory: React.FC = () => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

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

  // KPIs
  const totalCampaigns = campaigns.length;
  const totalLeadsImpacted = campaigns.reduce((acc, curr) => acc + (curr.totalLeads || 0), 0);
  const averageLeads = totalCampaigns > 0 ? Math.round(totalLeadsImpacted / totalCampaigns) : 0;

  // Gráfico: Campanhas por Mês (Timeline)
  const timelineData = useMemo(() => {
    const grouped: Record<string, number> = {};
    campaigns.forEach(c => {
      const date = new Date(c.createdAt);
      // Formato "Mês/Ano" curto (ex: Set/24)
      const key = date.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
      grouped[key] = (grouped[key] || 0) + 1;
    });
    
    // Inverter para ficar cronológico se o banco retornar DESC
    return Object.entries(grouped)
      .map(([name, value]) => ({ name, value }))
      .reverse(); 
  }, [campaigns]);

  // Gráfico: Distribuição por Perfil (Pie)
  const profileData = useMemo(() => {
    const grouped: Record<string, number> = {};
    campaigns.forEach(c => {
      const profile = c.segmentProfile || 'Geral';
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
      </div>

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
        <div className="bg-white p-8 border border-slate-200 rounded-xl shadow-sm min-h-[350px] flex flex-col">
          <h4 className="text-sm font-black text-slate-900 uppercase mb-6 flex items-center gap-2">
            <Calendar size={16} className="text-primary" /> Volume de Campanhas (Mês)
          </h4>
          <div className="flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={timelineData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748B', fontWeight: 700 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#64748B', fontWeight: 700 }} tickLine={false} axisLine={false} />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="value" fill="#1E293B" radius={[4, 4, 0, 0]} barSize={40} name="Campanhas" />
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
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {campaigns.map((camp) => (
                <tr key={camp.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 text-xs font-bold text-slate-600">
                    {new Date(camp.createdAt).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm font-bold text-slate-900">{camp.name}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2 py-1 rounded bg-slate-100 text-slate-700 text-[10px] font-black uppercase tracking-wider">
                      {camp.segmentProfile || 'Todos'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs text-slate-500">
                     {camp.segmentRegion === 'all' ? 'Brasil' : camp.segmentRegion} 
                     {camp.segmentCategory && camp.segmentCategory !== 'all' ? ` • ${camp.segmentCategory}` : ''}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="text-sm font-black text-slate-900">{camp.totalLeads}</span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-wide
                      ${camp.status === 'Enviada' ? 'bg-green-50 text-green-600' : 'bg-slate-100 text-slate-500'}
                    `}>
                      {camp.status === 'Enviada' && <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>}
                      {camp.status}
                    </span>
                  </td>
                </tr>
              ))}
              {campaigns.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400 text-sm font-medium">
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
