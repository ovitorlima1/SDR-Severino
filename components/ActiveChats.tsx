import { useState, useEffect, useRef } from 'react';
import { Search, Phone, MessageSquare, FileText, MessageCircle, Paperclip, Loader2, RefreshCw, Inbox } from 'lucide-react';
import { KommoLead, KommoTalk, KommoNote, ConversationEvent } from '../types';
import {
  fetchKommoLeads,
  fetchAllActiveChats,
  fetchLastContactNote,
  fetchLeadNotes,
  fetchAllLeadTalkMessages,
  getNoteDisplayText,
} from '../services/kommoService';
import { useInterval } from '../hooks/useInterval';

function noteToEvent(note: KommoNote, source: 'note' | 'talk'): ConversationEvent {
  return {
    id: `${source}-${note.id}`,
    source,
    note_type: note.note_type,
    displayText: getNoteDisplayText(note),
    created_at: note.created_at,
  };
}

function NoteIcon({ note_type }: { note_type: string }) {
  if (note_type === 'call_in' || note_type === 'call_out') return <Phone className="w-4 h-4 text-blue-500 shrink-0" />;
  if (note_type === 'sms') return <MessageCircle className="w-4 h-4 text-green-500 shrink-0" />;
  if (note_type === 'file') return <Paperclip className="w-4 h-4 text-yellow-500 shrink-0" />;
  if (note_type === 'amocrm_message' || note_type === 'talk_message') return <MessageSquare className="w-4 h-4 text-purple-500 shrink-0" />;
  return <FileText className="w-4 h-4 text-slate-400 shrink-0" />;
}

function formatDate(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
}

function timeAgo(ts: number): string {
  const sec = Math.floor((Date.now() / 1000) - ts);
  if (sec < 60) return `${sec}s atrás`;
  if (sec < 3600) return `${Math.floor(sec / 60)}min atrás`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h atrás`;
  return `${Math.floor(sec / 86400)}d atrás`;
}

function timeAgoDate(date: Date): string {
  const sec = Math.floor((Date.now() - date.getTime()) / 1000);
  if (sec < 60) return `há ${sec}s`;
  if (sec < 3600) return `há ${Math.floor(sec / 60)}min`;
  return `há ${Math.floor(sec / 3600)}h`;
}

export function ActiveChats() {
  const [talks, setTalks] = useState<KommoTalk[]>([]);
  const [leads, setLeads] = useState<KommoLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [snippets, setSnippets] = useState<Record<number, string>>({});
  const [searchQuery, setSearchQuery] = useState('');

  const [selectedTalk, setSelectedTalk] = useState<KommoTalk | null>(null);
  const [thread, setThread] = useState<ConversationEvent[]>([]);
  const [loadingThread, setLoadingThread] = useState(false);
  const [threadError, setThreadError] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [lastPolledAt, setLastPolledAt] = useState<Date | null>(null);

  const threadRef = useRef<HTMLDivElement>(null);
  const selectedTalkRef = useRef<KommoTalk | null>(null);

  useEffect(() => {
    selectedTalkRef.current = selectedTalk;
  }, [selectedTalk]);

  // Load all talks + leads on mount
  useEffect(() => {
    setLoading(true);
    Promise.all([fetchAllActiveChats(), fetchKommoLeads()])
      .then(([t, l]) => {
        // Sort by most recently updated
        const sorted = [...t].sort((a, b) => (b.updated_at || 0) - (a.updated_at || 0));
        setTalks(sorted);
        setLeads(l);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  // Load snippets for each talk
  useEffect(() => {
    if (!talks.length) return;
    let cancelled = false;
    (async () => {
      for (const talk of talks.slice(0, 50)) {
        if (cancelled) break;
        try {
          const note = await fetchLastContactNote(talk.contact_id);
          const text = note ? getNoteDisplayText(note) : 'Sem mensagens';
          setSnippets(prev => ({ ...prev, [talk.id]: text }));
        } catch {
          setSnippets(prev => ({ ...prev, [talk.id]: 'Sem mensagens' }));
        }
        await new Promise(r => setTimeout(r, 300));
      }
    })();
    return () => { cancelled = true; };
  }, [talks]);

  // Scroll to bottom when thread updates
  useEffect(() => {
    if (threadRef.current) {
      threadRef.current.scrollTop = threadRef.current.scrollHeight;
    }
  }, [thread]);

  async function loadThread(talk: KommoTalk, silent = false) {
    if (!silent) setLoadingThread(true);
    else setIsPolling(true);
    setThreadError(null);
    try {
      const [notes, talkMsgs] = await Promise.all([
        fetchLeadNotes(talk.entity_id),
        fetchAllLeadTalkMessages(talk.entity_id),
      ]);
      const events: ConversationEvent[] = [
        ...notes.map(n => noteToEvent(n, 'note')),
        ...talkMsgs.map(n => noteToEvent(n, 'talk')),
      ].sort((a, b) => a.created_at - b.created_at);
      setThread(events);
      setLastPolledAt(new Date());
    } catch (e: any) {
      if (!silent) setThreadError(e.message);
    } finally {
      setLoadingThread(false);
      setIsPolling(false);
    }
  }

  function handleSelectTalk(talk: KommoTalk) {
    setSelectedTalk(talk);
    setThread([]);
    loadThread(talk, false);
  }

  // Auto-poll every 45s
  useInterval(() => {
    const t = selectedTalkRef.current;
    if (t) loadThread(t, true);
  }, selectedTalk !== null ? 45_000 : null);

  const leadById = Object.fromEntries(leads.map(l => [l.id, l]));

  const filteredTalks = talks.filter(talk => {
    const lead = leadById[talk.entity_id];
    const name = lead?.name ?? `Chat #${talk.id}`;
    return name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <Inbox className="w-5 h-5 text-primary" />
          <h1 className="text-xl font-semibold text-slate-800">Chats em Execução</h1>
          {!loading && (
            <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
              {talks.length} {talks.length === 1 ? 'chat' : 'chats'}
            </span>
          )}
        </div>
        {lastPolledAt && (
          <div className="flex items-center gap-2 text-sm text-slate-400">
            {isPolling && <Loader2 className="w-3 h-3 animate-spin" />}
            <RefreshCw className="w-3 h-3" />
            <span>Atualizado {timeAgoDate(lastPolledAt)}</span>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Chat list */}
        <div className="w-72 border-r border-slate-200 flex flex-col shrink-0">
          <div className="p-3 border-b border-slate-100">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar chat..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center h-32 text-slate-400 gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Carregando chats...</span>
              </div>
            ) : error ? (
              <div className="p-4 text-sm text-red-500">{error}</div>
            ) : filteredTalks.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-slate-400 gap-2">
                <Inbox className="w-6 h-6" />
                <span className="text-sm">Nenhum chat encontrado</span>
              </div>
            ) : (
              filteredTalks.map(talk => {
                const lead = leadById[talk.entity_id];
                const name = lead?.name ?? `Chat #${talk.id}`;
                const isSelected = selectedTalk?.id === talk.id;
                return (
                  <button
                    key={talk.id}
                    onClick={() => handleSelectTalk(talk)}
                    className={`w-full text-left px-4 py-3 border-b border-slate-100 transition-colors hover:bg-slate-50 ${
                      isSelected ? 'bg-primary/10 border-l-2 border-l-primary' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-sm font-medium text-slate-800 truncate flex-1">{name}</span>
                      <span className="text-[10px] text-slate-400 ml-2 shrink-0">{timeAgo(talk.updated_at)}</span>
                    </div>
                    <p className="text-xs text-slate-400 truncate">
                      {snippets[talk.id] ?? '...'}
                    </p>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Thread */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {!selectedTalk ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-3">
              <Inbox className="w-10 h-10 opacity-30" />
              <p className="text-sm">Selecione um chat para ver as mensagens</p>
            </div>
          ) : (
            <>
              <div className="px-6 py-3 border-b border-slate-200 bg-white">
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <h2 className="font-semibold text-slate-800">
                      {leadById[selectedTalk.entity_id]?.name ?? `Chat #${selectedTalk.id}`}
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Última atualização: {formatDate(selectedTalk.updated_at)}
                    </p>
                  </div>
                  {isPolling && (
                    <div className="flex items-center gap-1 text-xs text-slate-400">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      atualizando...
                    </div>
                  )}
                </div>
              </div>

              <div ref={threadRef} className="flex-1 overflow-y-auto p-4 space-y-2">
                {loadingThread ? (
                  <>
                    {[1, 2, 3].map(i => (
                      <div key={i} className="animate-pulse bg-slate-100 rounded-lg h-14" />
                    ))}
                  </>
                ) : threadError ? (
                  <div className="text-sm text-red-500 p-2">{threadError}</div>
                ) : thread.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-2 pt-12">
                    <MessageSquare className="w-8 h-8 opacity-30" />
                    <p className="text-sm">Nenhuma mensagem encontrada</p>
                  </div>
                ) : (
                  thread.map(event => (
                    <div key={event.id} className="flex gap-3 p-3 rounded-lg bg-white border border-slate-100 hover:border-slate-200 transition-colors">
                      <NoteIcon note_type={event.note_type} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-slate-700 break-words">{event.displayText}</p>
                        <p className="text-xs text-slate-400 mt-1">{formatDate(event.created_at)}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
