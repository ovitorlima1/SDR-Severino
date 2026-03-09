
import { createClient } from '@supabase/supabase-js';

// NOTA: Em produção, estas chaves devem vir de variáveis de ambiente seguras
const supabaseUrl = 'https://ifequhftkwwblwxyvvsh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlmZXF1aGZ0a3d3Ymx3eHl2dnNoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDE0MzA3NCwiZXhwIjoyMDg1NzE5MDc0fQ.UXf1yd5i-ZOzMu6bmP3gz3oMtSV5xFTptEYhimTSuO4';

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
