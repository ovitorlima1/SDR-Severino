
import React, { useState, useRef } from 'react';
import { Search, Filter, Building, FileSpreadsheet, Info, MapPin, Zap, BrainCircuit, Loader2, X, Database, Trash2, TrendingUp, History } from 'lucide-react';
import { Client, OriginationStats, ImportHistory } from '../types';
import { fetchImportHistory } from '../services/persistenceService';
import * as XLSX from 'xlsx';

interface ClientListProps {
  clients: Client[];
  setClients: (clients: Client[]) => void;
  onQualify?: (companyName: string) => void;
  onAnalyze: (limit: number) => void;
  isAnalyzing: boolean;
  totalPending?: number;
  originationStats?: OriginationStats;
  onDeleteBatch?: (batchName: string) => Promise<void>;
}

export const ClientList: React.FC<ClientListProps> = ({ 
  clients, 
  setClients, 
  onQualify,
  onAnalyze,
  isAnalyzing,
  totalPending = 0,
  originationStats,
  onDeleteBatch
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSetor, setSelectedSetor] = useState<string>('all');
  const [selectedConsumo, setSelectedConsumo] = useState<string>('all');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Estados do Modal de Segmentação
  const [isSegmentModalOpen, setIsSegmentModalOpen] = useState(false);
  const [segmentLimit, setSegmentLimit] = useState(100);
  
  // Estados do Gerenciamento de Bases
  const [isBasesModalOpen, setIsBasesModalOpen] = useState(false);
  const [importHistory, setImportHistory] = useState<ImportHistory[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  const setores = Array.from(new Set(clients.map(c => c.classePrincipal).filter(Boolean))) as string[];

  const filteredClients = clients.filter(client => {
    const matchesSearch =
      client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (client.cnpj && client.cnpj.includes(searchTerm));

    const matchesSetor =
      selectedSetor === 'all' ||
      (client.classePrincipal || '').toLowerCase() === selectedSetor.toLowerCase();

    const potenciaNum = parseFloat(client.potencia || '0');
    const matchesConsumo =
      selectedConsumo === 'all' ||
      (selectedConsumo === 'gWh' && potenciaNum > 1000) ||
      (selectedConsumo === 'mW'  && potenciaNum > 500);

    return matchesSearch && matchesSetor && matchesConsumo;
  });

  const getProfileColor = (profile?: string) => {
    switch(profile) {
      case 'Arquiteto Financeiro': return 'bg-purple-50 text-purple-700 border border-purple-100';
      case 'Pagador': return 'bg-green-50 text-green-700 border border-green-100';
      case 'Gestor': return 'bg-blue-50 text-blue-700 border border-blue-100';
      case 'Oportunista': return 'bg-orange-50 text-orange-700 border border-orange-100';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const batchName = file.name;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target?.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const rows = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];
      if (rows.length === 0) return;
      
      const firstRow = rows[0];
      
      // Mapeamento dinâmico de headers
      let headerMap: Record<string, number> = {};
      firstRow.forEach((cell, idx) => { 
        if (cell) headerMap[String(cell).toUpperCase().trim()] = idx; 
      });

      const importedClients: Partial<Client>[] = rows.slice(1).map((row): Partial<Client> => {
        // Função auxiliar para pegar valor seguro
        const getVal = (key: string) => {
          const idx = headerMap[key];
          return idx !== undefined ? String(row[idx] || '').trim() : undefined;
        };

        const nome = getVal('NOME') || getVal('CLIENTE') || 'Sem Nome';
        
        // Pula linhas vazias
        if (!nome || nome === 'Sem Nome') return {};

        return {
          name: nome,
          company: nome, // Replica nome em company
          cnpj: getVal('CNPJ'),
          municipio: getVal('MUNICIPIO'),
          endereco: getVal('ENDERECO'),
          clienteLivre: getVal('CLIENTE_LIVRE'),
          microGerador: getVal('MICRO_GERADOR'),
          nivelTensao: getVal('NIVEL_TENSAO'),
          classePrincipal: getVal('CLASSE_PRINCIPAL'),
          subclasse: getVal('SUBCLASSE'),
          potencia: getVal('POTENCIA'),
          tipoTarifa: getVal('TIPO_TARIFA'),
          tariffType: getVal('TIPO_TARIFA'),
          tipoCliente: getVal('TIPO_CLIENTE'),
          dataDe: getVal('DATA_DE'),
          dataAte: getVal('DATA_ATE'),
          contratoAtivo: getVal('CONTRATO_ATIVO'),
          telFixo: getVal('TEL_FIXO'),
          telMovel: getVal('TEL_MOVEL'),
          email: getVal('EMAIL'),
          profile: getVal('TIPO_PERFIL') // Caso já venha preenchido
        };
      }).filter(c => c.name && c.name !== 'Sem Nome') as Partial<Client>[];

      if (importedClients.length > 0) {
        // @ts-ignore - setClients espera Client[] completo
        const fullClients = importedClients.map(c => ({
            ...c,
            id: Math.random().toString(36),
            role: 'Lead',
            employees: 0,
            segment: c.profile || 'Não Segmentado',
            category: 'Não Definido',
            state: c.municipio ? c.municipio.split('-').pop()?.trim() || '' : '',
            sourceBatch: batchName
        })) as Client[];
        
        setClients(fullClients);
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsBinaryString(file);
  };

  const handleStartSegmentation = () => {
    onAnalyze(segmentLimit);
    setIsSegmentModalOpen(false);
  };

  const handleOpenBasesModal = async () => {
    setIsBasesModalOpen(true);
    setIsLoadingHistory(true);
    try {
        const history = await fetchImportHistory();
        setImportHistory(history);
    } catch (e) {
        console.error(e);
    } finally {
        setIsLoadingHistory(false);
    }
  };

  const handleDeleteBatch = async (batchName: string) => {
      if (confirm(`Tem certeza que deseja excluir todos os clientes da base "${batchName}"? Esta ação não pode ser desfeita.`)) {
          if (onDeleteBatch) {
              await onDeleteBatch(batchName);
              // Atualiza histórico localmente
              setImportHistory(prev => prev.filter(h => h.filename !== batchName));
          }
      }
  };

  return (
    <div className="space-y-6 relative">
      {/* Modal de Segmentação */}
      {isSegmentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-white rounded-none border-2 border-primary shadow-2xl w-full max-w-md p-8 animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black text-black flex items-center gap-2 uppercase tracking-tighter">
                <BrainCircuit className="text-primary" /> Segmentar Clientes
              </h3>
              <button onClick={() => setIsSegmentModalOpen(false)} className="text-gray-400 hover:text-black">
                <X size={24} />
              </button>
            </div>
            
            <div className="space-y-6">
              <div className="bg-gray-50 p-5 border border-gray-100">
                <p className="text-sm text-gray-600 font-medium">
                  Existem <span className="font-black text-black">{totalPending.toLocaleString()}</span> clientes aguardando classificação (TIPO_PERFIL nulo).
                </p>
              </div>

              <div>
                <label className="block text-xs font-black text-gray-400 uppercase mb-3">Quantos processar agora?</label>
                <div className="flex items-center border-b-2 border-black pb-2">
                    <input 
                      type="number" 
                      min="1"
                      max={Math.min(totalPending, 1000)}
                      value={segmentLimit}
                      onChange={(e) => setSegmentLimit(Number(e.target.value))}
                      className="w-full text-center text-4xl font-black text-black outline-none bg-transparent"
                    />
                </div>
                
                <div className="flex justify-between text-[10px] font-bold text-gray-400 mt-4 px-2">
                  <button className="hover:text-primary transition-colors uppercase" onClick={() => setSegmentLimit(10)}>10</button>
                  <button className="hover:text-primary transition-colors uppercase" onClick={() => setSegmentLimit(50)}>50</button>
                  <button className="hover:text-primary transition-colors uppercase" onClick={() => setSegmentLimit(100)}>100</button>
                  <button className="hover:text-primary transition-colors uppercase" onClick={() => setSegmentLimit(Math.min(totalPending, 500))}>Máx (500)</button>
                </div>
              </div>

              <div className="pt-6 flex gap-4">
                <button 
                  onClick={() => setIsSegmentModalOpen(false)}
                  className="flex-1 py-4 bg-gray-100 text-gray-600 font-bold hover:bg-gray-200 transition-colors uppercase text-xs tracking-wider"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleStartSegmentation}
                  disabled={segmentLimit < 1}
                  className="flex-1 py-4 bg-primary text-black font-black hover:bg-accent transition-colors shadow-lg disabled:opacity-50 uppercase text-xs tracking-wider"
                >
                  Iniciar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Gerenciamento de Bases */}
      {isBasesModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-white rounded-none border-2 border-black shadow-2xl w-full max-w-2xl p-8 animate-in fade-in zoom-in duration-200">
             <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-black text-black flex items-center gap-2 uppercase tracking-tighter">
                  <History className="text-primary" /> Histórico de Importações
                </h3>
                <button onClick={() => setIsBasesModalOpen(false)} className="text-gray-400 hover:text-black">
                  <X size={24} />
                </button>
             </div>

             <div className="max-h-[400px] overflow-y-auto">
                {isLoadingHistory ? (
                    <div className="flex justify-center py-10"><Loader2 className="animate-spin text-primary" /></div>
                ) : importHistory.length === 0 ? (
                    <div className="text-center py-10 text-gray-400 font-bold uppercase text-xs">Nenhuma base importada recentemente.</div>
                ) : (
                    <table className="w-full text-left">
                        <thead className="border-b-2 border-black">
                            <tr>
                                <th className="py-3 text-[10px] font-black text-gray-400 uppercase">Arquivo</th>
                                <th className="py-3 text-[10px] font-black text-gray-400 uppercase text-center">Registros</th>
                                <th className="py-3 text-[10px] font-black text-gray-400 uppercase text-center">Data</th>
                                <th className="py-3 text-[10px] font-black text-gray-400 uppercase text-right">Ação</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {importHistory.map((h) => (
                                <tr key={h.id} className="hover:bg-gray-50 group">
                                    <td className="py-4">
                                        <div className="font-bold text-sm text-black truncate max-w-[200px]">{h.filename}</div>
                                    </td>
                                    <td className="py-4 text-center font-mono text-xs">{h.totalRows}</td>
                                    <td className="py-4 text-center text-[10px] text-gray-500 font-bold">
                                        {new Date(h.createdAt).toLocaleDateString('pt-BR')}
                                    </td>
                                    <td className="py-4 text-right">
                                        <button 
                                            onClick={() => handleDeleteBatch(h.filename)}
                                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                            title="Excluir Base"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
             </div>
          </div>
        </div>
      )}

      {/* KPIs de Originação */}
      {originationStats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-2">
           <div className="bg-white p-4 border-b-4 border-primary shadow-sm">
                <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                    <Database size={10} /> Bancos Importados
                </div>
                <div className="text-2xl font-black text-black">{originationStats.totalBatches}</div>
           </div>
           <div className="bg-white p-4 border-b-4 border-secondary shadow-sm">
                <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                    <TrendingUp size={10} /> Total Originações
                </div>
                <div className="text-2xl font-black text-black">{originationStats.totalImported.toLocaleString()}</div>
           </div>
           <div className="bg-white p-4 border-b-4 border-red-500 shadow-sm">
                <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                    <Trash2 size={10} /> Registros Excluídos
                </div>
                <div className="text-2xl font-black text-black">{originationStats.totalDeleted.toLocaleString()}</div>
           </div>
           <div className="bg-white p-4 border-b-4 border-purple-500 shadow-sm">
                <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                    <BrainCircuit size={10} /> Taxa Enriquecimento
                </div>
                <div className="text-2xl font-black text-black">{originationStats.enrichmentRate.toFixed(1)}%</div>
           </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Originação de Clientes</h2>
        </div>
        <div className="flex flex-wrap gap-2">
           <button onClick={handleOpenBasesModal} className="flex items-center px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors shadow-sm font-bold border border-slate-700">
              <History size={18} className="mr-2 text-primary" /> Gerenciar Bases
           </button>
           <button onClick={() => fileInputRef.current?.click()} className="flex items-center px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors shadow-sm font-bold"><FileSpreadsheet size={18} className="mr-2 text-green-600" />Importar Planilha</button>
           <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".xlsx, .xls, .csv" className="hidden" />
           
           {/* Botão de Segmentação */}
           <button 
              onClick={() => setIsSegmentModalOpen(true)}
              disabled={isAnalyzing || totalPending === 0}
              className="flex items-center px-4 py-2 bg-secondary text-white rounded-lg hover:bg-secondary/90 transition-colors shadow-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed"
           >
              {isAnalyzing ? <Loader2 className="animate-spin mr-2" size={18} /> : <BrainCircuit className="mr-2" size={18} />}
              Segmentar Base
           </button>

        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input
            type="text"
            placeholder="Buscar por nome, CNPJ..."
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-transparent bg-slate-800 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary/50 shadow-inner"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        {/* Filtro Setor */}
        <div className="relative w-full md:w-48">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <select
            className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-primary/50 appearance-none cursor-pointer"
            value={selectedSetor}
            onChange={(e) => setSelectedSetor(e.target.value)}
          >
            <option value="all">Todos os Setores</option>
            {setores.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {/* Filtro Consumo Estimado */}
        <div className="relative w-full md:w-52">
          <Zap className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <select
            className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-primary/50 appearance-none cursor-pointer"
            value={selectedConsumo}
            onChange={(e) => setSelectedConsumo(e.target.value)}
          >
            <option value="all">Consumo Estimado</option>
            <option value="mW">&gt; 500 MW</option>
            <option value="gWh">&gt; 1 GWh</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Cliente</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Perfil (IA)</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Dados Energia</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Localização</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredClients.map((client) => (
                <tr key={client.id} className="hover:bg-slate-50/80 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className="w-9 h-9 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 font-bold mr-3">{client.name.charAt(0)}</div>
                      <div>
                        <div className="font-semibold text-slate-900 text-sm">{client.name}</div>
                        {client.cnpj && <div className="text-[10px] text-slate-400 font-mono">{client.cnpj}</div>}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${getProfileColor(client.profile)}`}>
                      {client.profile || 'Não Analisado'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      {client.tipoTarifa && (
                         <div className="flex items-center text-[10px] font-bold text-slate-600">
                           <Zap size={10} className="mr-1 text-primary" /> {client.tipoTarifa}
                         </div>
                      )}
                      {client.classePrincipal && (
                        <div className="text-[10px] text-slate-500 uppercase">{client.classePrincipal}</div>
                      )}
                      {/* Potência removida daqui conforme solicitado */}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                     <div className="flex items-center text-xs text-slate-600">
                        <MapPin size={12} className="mr-1 text-slate-400 shrink-0" />
                        <div>
                          <div>{client.municipio || 'N/A'}</div>
                          {client.state && (
                            <div className="text-[10px] font-bold text-slate-400 uppercase">{client.state}</div>
                          )}
                        </div>
                     </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button onClick={() => onQualify && onQualify(client.name)} className="inline-flex items-center justify-center gap-2 px-4 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:border-primary hover:text-primary transition-all shadow-sm font-bold text-[10px] uppercase">
                      Qualificar 
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
