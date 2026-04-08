
import React from 'react';
import { LayoutDashboard, Users, Send, Menu, Target, LogOut, Clock, Smartphone, BarChart2, Crosshair } from 'lucide-react';
import { ViewState } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  currentView: ViewState;
  onChangeView: (view: ViewState) => void;
  userEmail?: string;
  onLogout?: () => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, currentView, onChangeView, userEmail, onLogout }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  const NavItem = ({ view, icon: Icon, label }: { view: ViewState; icon: any; label: string }) => (
    <button
      onClick={() => {
        onChangeView(view);
        setIsMobileMenuOpen(false);
      }}
      className={`flex items-center w-full px-4 py-3 text-sm font-bold transition-all rounded-xl mb-1
        ${currentView === view 
          ? 'bg-primary/10 text-slate-900 border border-primary/20' 
          : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
        }`}
    >
      <Icon size={20} className={`mr-3 ${currentView === view ? 'text-primary' : 'text-slate-400'}`} />
      {label}
    </button>
  );

  return (
    <div className="flex h-screen bg-[#F8FAFC] overflow-hidden font-sans text-slate-900">
      {/* Sidebar - Desktop (Clean White) */}
      <aside className="hidden md:flex flex-col w-72 bg-white border-r border-slate-200 relative shadow-sm z-10">
        <div className="p-8 pb-6">
          <div className="flex items-center">
            <img src="/sevpower-logo.png" alt="Sev Power" className="h-16 object-contain" />
          </div>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-2 pl-1">Intelligence System</p>
        </div>
        
        <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto scrollbar-hide">
          <p className="px-4 text-[10px] font-black text-slate-400 uppercase mb-4 tracking-widest">Menu Principal</p>
          <NavItem view="dashboard" icon={LayoutDashboard} label="Dashboard" />
          <NavItem view="clients" icon={Users} label="Originação de Clientes" />
          <NavItem view="qualifier" icon={Target} label="Inteligência Qualificação" />
          <NavItem view="prospect-hub" icon={Crosshair} label="Prospect HUB" />
          <div className="mt-6 mb-2 px-4 border-t border-slate-100"></div>
          <p className="px-4 text-[10px] font-black text-slate-400 uppercase mb-4 tracking-widest mt-4">Gestão de Disparos</p>
          <NavItem view="campaigns" icon={Send} label="Gerador de Campanhas WhatsApp" />
          <NavItem view="history" icon={Clock} label="Gestão da Carteira" />
          <div className="mt-6 mb-2 px-4 border-t border-slate-100"></div>
          <p className="px-4 text-[10px] font-black text-slate-400 uppercase mb-4 tracking-widest mt-4">Infraestrutura</p>
          <NavItem view="whatsapp" icon={Smartphone} label="Funil de Conversão " />
          <NavItem view="lead-analysis" icon={BarChart2} label="Plano de Reconquista" />
        </nav>

        <div className="p-4 m-4 bg-slate-50 rounded-2xl border border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-slate-900 font-black text-xs border border-slate-200 shadow-sm">
              {userEmail ? userEmail[0].toUpperCase() : 'SV'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-slate-900 truncate">{userEmail || 'Usuário'}</p>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">Usuário</p>
            </div>
            <button onClick={onLogout} className="text-slate-400 hover:text-red-500 transition-colors" title="Sair">
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Top Gradient Line (Subtle) */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary/80 via-primary to-primary/80 z-50"></div>

        {/* Mobile Header (White) */}
        <header className="md:hidden flex items-center justify-between p-4 bg-white text-slate-900 border-b border-slate-200 shadow-sm z-20">
          <div className="flex items-center">
            <img src="/sevpower-logo.png" alt="Sev Power" className="h-7 object-contain" />
          </div>
          <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 text-slate-600">
            <Menu size={24} />
          </button>
        </header>

        {/* Mobile Menu Overlay */}
        {isMobileMenuOpen && (
          <div className="absolute inset-0 z-50 bg-white p-4 overflow-y-auto">
            <div className="flex justify-end mb-8">
              <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 text-slate-500">
                ✕
              </button>
            </div>
            <nav className="space-y-2">
              <NavItem view="dashboard" icon={LayoutDashboard} label="Dashboard" />
              <NavItem view="clients" icon={Users} label="Clientes" />
              <NavItem view="qualifier" icon={Target} label="Qualificador" />
              <NavItem view="prospect-hub" icon={Crosshair} label="Prospect HUB" />
              <div className="border-t border-slate-100 my-2"></div>
              <NavItem view="campaigns" icon={Send} label="Criar Campanha" />
              <NavItem view="history" icon={Clock} label="Histórico" />
              <div className="border-t border-slate-100 my-2"></div>
              <NavItem view="whatsapp" icon={Smartphone} label="Gestão WhatsApp" />
              <NavItem view="lead-analysis" icon={BarChart2} label="Plano de Reconquista" />
            </nav>
          </div>
        )}

        <div className="flex-1 overflow-auto p-4 md:p-10 scrollbar-hide bg-[#F8FAFC]">
          <div className="max-w-7xl mx-auto w-full space-y-8">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
};
