
import React, { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { ClientList } from './components/ClientList';
import { CampaignManager } from './components/CampaignManager';
import { CampaignHistory } from './components/CampaignHistory';
import { LeadQualifier } from './components/LeadQualifier';
import { ConversionFunnel } from './components/ConversionFunnel';
import { Client, ViewState } from './types';
import { analyzeSegments } from './services/geminiService';
import {
  fetchClientsFromDB,
  saveClientsToDB,
  updateClientAIResult,
  fetchTotalClientsCount,
  fetchPendingClients,
  fetchTotalPendingCount,
  fetchOriginationStats,
  deleteClientsByBatch
} from './services/persistenceService';
import { OriginationStats } from './types';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewState>('dashboard');
  const [clients, setClients] = useState<Client[]>([]);
  const [totalLeads, setTotalLeads] = useState(0);
  const [totalPending, setTotalPending] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [pendingQualification, setPendingQualification] = useState<string | null>(null);
  const [originationStats, setOriginationStats] = useState<OriginationStats>({
    totalBatches: 0,
    totalImported: 0,
    totalDeleted: 0,
    enrichmentRate: 0
  });

  const loadData = async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const dbClients = await fetchClientsFromDB();
      const actualTotal = await fetchTotalClientsCount();
      const pendingTotal = await fetchTotalPendingCount();
      const stats = await fetchOriginationStats();
 
      setClients(dbClients);
      setTotalLeads(actualTotal);
      setTotalPending(pendingTotal);
      setOriginationStats(stats);
    } catch (e) {
      console.error("Falha na conexão inicial:", e);
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRunAnalysis = async (limit: number) => {
    setIsAnalyzing(true);

    // Configuração para segurança de cota 
    // BATCH_SIZE reduzido e DELAY aumentado para garantir sucesso em 10k leads
    const BATCH_SIZE = 3;
    const DELAY_BETWEEN_BATCHES = 5000;

    try {
      if (!process.env.GEMINI_API_KEY && !process.env.API_KEY) {
        alert("Erro: GEMINI_API_KEY não configurada. Verifique seu arquivo .env ou as variáveis de ambiente.");
        setIsAnalyzing(false);
        return;
      }

      const clientsToAnalyze = await fetchPendingClients(limit);
      console.log(`[App] Leads encontrados para analisar: ${clientsToAnalyze.length}`);

      if (clientsToAnalyze.length === 0) {
        alert("Não há mais leads pendentes de segmentação!");
        setIsAnalyzing(false);
        return;
      }

      const totalToProcess = clientsToAnalyze.length;
      setProgress({ current: 0, total: totalToProcess });

      for (let i = 0; i < clientsToAnalyze.length; i += BATCH_SIZE) {
        const batch = clientsToAnalyze.slice(i, i + BATCH_SIZE);
        console.log(`[App] Iniciando lote ${Math.floor(i / BATCH_SIZE) + 1} com ${batch.length} leads`);

        try {
          console.log(`[App] Chamando analyzeSegments para lote de ${batch.length} leads...`);
          // Chamada à IA (agora processada sequencialmente dentro do service)
          const aiResults = await analyzeSegments(batch);
          console.log(`[App] analyzeSegments concluído. Resultados obtidos: ${aiResults.length}`);

          // Persistência
          for (const res of aiResults) {
            await updateClientAIResult(res.clientId, res);
          }

          const nextProgress = Math.min(i + BATCH_SIZE, totalToProcess);
          setProgress(prev => ({ ...prev, current: nextProgress }));

          // Delay entre blocos para respeitar limites diários
          if (nextProgress < totalToProcess) {
            await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES));
          }

          // ATUALIZAÇÃO INCREMENTAL: Recarrega as métricas do dashboard a cada lote concluído de forma silenciosa
          await loadData(true);

        } catch (batchError: any) {
          const errorStr = JSON.stringify(batchError);
          if (errorStr.includes('429') || errorStr.includes('RESOURCE_EXHAUSTED')) {
            const confirmKey = window.confirm("Limite de cota da API atingido. Deseja selecionar sua própria API Key para continuar o processamento de alta velocidade?");
            if (confirmKey) {
              // Usando casting para any para evitar conflitos de tipos globais
              await (window as any).aistudio.openSelectKey();
              // Após selecionar a chave, o loop continua na próxima tentativa
            } else {
              throw batchError; // Para o processamento
            }
          } else {
            console.error("Erro no lote:", batchError);
            alert(`Erro no lote ${Math.floor(i / BATCH_SIZE) + 1}: ${batchError.message || "Erro desconhecido"}`);
          }
        }
      }

      await loadData();
      alert(`Processamento de leads concluído!`);

    } catch (error: any) {
      console.error(error);
      alert("Ocorreu um erro persistente. Tente reduzir o número de leads por vez ou verifique sua API Key.");
    } finally {
      setIsAnalyzing(false);
      setProgress({ current: 0, total: 0 });
    }
  };

  const handleSetClients = async (newClients: Client[]) => {
    setIsLoading(true);
    try {
      // Validação de duplicidade para o usuário
      const existingCnpjs = new Set(clients.map(c => c.cnpj).filter(Boolean));
      const duplicatesCount = newClients.filter(c => c.cnpj && existingCnpjs.has(c.cnpj)).length;
      const totalProcessed = newClients.length;

      let clientsToSave = newClients;
      let shouldUpdate = true;

      if (duplicatesCount > 0) {
        shouldUpdate = window.confirm(
          `${duplicatesCount} clientes já existem na base.\n\nDeseja ATUALIZAR os dados desses clientes? (Dados de contato/energia serão atualizados, mas o Perfil de IA será preservado).\n\nClique em OK para atualizar ou CANCELAR para ignorar os duplicados e subir apenas os NOVOS.`
        );

        if (!shouldUpdate) {
          clientsToSave = newClients.filter(c => !c.cnpj || !existingCnpjs.has(c.cnpj));
        }
      }

      const trulyNew = clientsToSave.filter(c => !c.cnpj || !existingCnpjs.has(c.cnpj)).length;

      await saveClientsToDB(clientsToSave);
      await loadData();

      if (duplicatesCount > 0) {
        if (shouldUpdate) {
          alert(`Sincronização concluída!\n- ${trulyNew} novos clientes adicionados.\n- ${duplicatesCount} clientes existentes atualizados.\n\nO perfil de segmentação dos clientes antigos foi preservado.`);
        } else {
          alert(`Sincronização concluída!\n- ${trulyNew} novos clientes adicionados.\n- ${duplicatesCount} duplicados foram IGNORADOS.`);
        }
      } else {
        alert(`${totalProcessed} novos clientes adicionados com sucesso.`);
      }
    } catch (e) {
      console.error(e);
      alert("Erro ao sincronizar planilha.");
    } finally {
      setIsLoading(false);
    }
  };

  const renderContent = () => {
    if (isLoading) return (
      <div className="flex flex-col items-center justify-center h-64 text-slate-400">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mb-4"></div>
        <p className="font-bold uppercase text-[10px] tracking-widest">Sincronizando Base...</p>
      </div>
    );

    switch (currentView) {
      case 'dashboard':
        return (
          <Dashboard
            clients={clients}
            totalLeadsOverride={totalLeads}
            totalPendingOverride={totalPending}
          />
        );
      case 'clients':
        return (
          <ClientList
            clients={clients}
            setClients={handleSetClients}
            onQualify={(name) => {
              setPendingQualification(name);
              setCurrentView('qualifier');
            }}
            onAnalyze={handleRunAnalysis}
            isAnalyzing={isAnalyzing}
            totalPending={totalPending}
            originationStats={originationStats}
            onDeleteBatch={async (batchName) => {
              await deleteClientsByBatch(batchName);
              await loadData();
            }}
          />
        );
      case 'qualifier':
        return (
          <LeadQualifier
            initialCompanyName={pendingQualification || undefined}
            onClearInitial={() => setPendingQualification(null)}
          />
        );
      case 'campaigns':
        return <CampaignManager clients={clients} />;
      case 'history':
        return <CampaignHistory />;
      case 'whatsapp':
        return <ConversionFunnel />;
      default:
        return <Dashboard clients={clients} />;
    }
  };

  return (
    <Layout currentView={currentView} onChangeView={setCurrentView}>
      {renderContent()}
    </Layout>
  );
};

export default App;
