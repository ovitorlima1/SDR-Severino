
import { createClient } from '@supabase/supabase-js';

// NOTA: Em produção, estas chaves vêm das variáveis de ambiente da Vercel
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Cliente para operações de banco - nunca persiste sessão do usuário, sempre usa service_role
export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  }
});

// Cliente para autenticação - gerencia sessão do usuário normalmente
export const supabaseAuth = createClient(supabaseUrl, supabaseKey);
