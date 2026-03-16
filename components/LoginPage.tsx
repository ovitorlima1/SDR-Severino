
import React, { useState } from 'react';
import { supabaseAuth } from '../services/supabase';

type Tab = 'login' | 'register';

export const LoginPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email || !password) { setError('Preencha todos os campos.'); return; }

    setLoading(true);
    const { error } = await supabaseAuth.auth.signInWithPassword({ email, password });
    setLoading(false);

    if (error) setError(error.message);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    if (!email || !password || !confirmPassword) { setError('Preencha todos os campos.'); return; }
    if (password.length < 6) { setError('A senha deve ter no mínimo 6 caracteres.'); return; }
    if (password !== confirmPassword) { setError('As senhas não coincidem.'); return; }

    setLoading(true);
    const { data, error } = await supabaseAuth.auth.signUp({ email, password });
    setLoading(false);

    if (error) {
      setError(error.message);
    } else if (data.session) {
      // Confirmação de email desabilitada: sessão retornada imediatamente, login automático
    } else {
      setSuccessMessage('Conta criada! Verifique seu email para confirmar o cadastro.');
    }
  };

  return (
    <div className="flex h-screen bg-[#F8FAFC] items-center justify-center font-sans">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
        <div className="mb-8 text-center">
          <div className="flex items-center justify-center mb-4">
            <img src="/sevpower-logo.png" alt="Sev Power" className="h-32 object-contain" />
          </div>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Intelligence System</p>
        </div>

        {/* Tabs */}
        <div className="flex rounded-xl bg-slate-50 p-1 mb-6 border border-slate-100">
          <button
            onClick={() => { setActiveTab('login'); setError(''); setSuccessMessage(''); }}
            className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${
              activeTab === 'login' ? 'bg-white text-slate-900 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Entrar
          </button>
          <button
            onClick={() => { setActiveTab('register'); setError(''); setSuccessMessage(''); }}
            className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${
              activeTab === 'register' ? 'bg-white text-slate-900 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Criar conta
          </button>
        </div>

        {/* Login Form */}
        {activeTab === 'login' && (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm text-slate-900 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
                placeholder="seu@email.com"
                autoComplete="email"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Senha</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm text-slate-900 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </div>
            {error && <p className="text-red-500 text-xs font-bold">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-primary text-white font-bold rounded-xl text-sm hover:opacity-90 transition disabled:opacity-50"
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>
        )}

        {/* Register Form */}
        {activeTab === 'register' && (
          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm text-slate-900 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
                placeholder="seu@email.com"
                autoComplete="email"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Senha</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm text-slate-900 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
                placeholder="Mínimo 6 caracteres"
                autoComplete="new-password"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Confirmar senha</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm text-slate-900 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
                placeholder="••••••••"
                autoComplete="new-password"
              />
            </div>
            {error && <p className="text-red-500 text-xs font-bold">{error}</p>}
            {successMessage && <p className="text-green-600 text-xs font-bold">{successMessage}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-primary text-white font-bold rounded-xl text-sm hover:opacity-90 transition disabled:opacity-50"
            >
              {loading ? 'Criando conta...' : 'Criar conta'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
