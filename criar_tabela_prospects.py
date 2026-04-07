"""
Cria a tabela 'prospects' no Supabase via REST API (rpc exec_sql).
Se a função não existir, imprime o SQL para rodar manualmente no Dashboard.
"""
import sys
import requests

sys.stdout.reconfigure(encoding='utf-8')

SUPABASE_URL = "https://ifequhftkwwblwxyvvsh.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlmZXF1aGZ0a3d3Ymx3eHl2dnNoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDE0MzA3NCwiZXhwIjoyMDg1NzE5MDc0fQ.UXf1yd5i-ZOzMu6bmP3gz3oMtSV5xFTptEYhimTSuO4"

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
}

SQL = """
CREATE TABLE IF NOT EXISTS prospects (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome          TEXT NOT NULL,
  cnpj          TEXT UNIQUE,
  estado        TEXT,
  municipio     TEXT,
  classe        TEXT,
  tarifa        TEXT,
  potencia      NUMERIC,
  nivel_tensao  TEXT,
  cliente_livre TEXT,
  email         TEXT,
  tel           TEXT,
  score         INTEGER,
  segmento      TEXT,
  distribuidora TEXT,
  source_file   TEXT,
  created_at    TIMESTAMPTZ DEFAULT now()
);
"""

def tabela_ja_existe():
    """Verifica se a tabela prospects já existe via REST."""
    resp = requests.get(
        f"{SUPABASE_URL}/rest/v1/prospects?limit=0",
        headers=HEADERS,
        timeout=10,
    )
    return resp.status_code == 200

def criar_via_rpc():
    """Tenta criar via função exec_sql (se existir no Supabase)."""
    resp = requests.post(
        f"{SUPABASE_URL}/rest/v1/rpc/exec_sql",
        headers=HEADERS,
        json={"sql": SQL},
        timeout=15,
    )
    return resp.status_code in (200, 201, 204)

print("=" * 60)
print("  Criação da tabela 'prospects'")
print("=" * 60)

# 1. Verifica se já existe
if tabela_ja_existe():
    print("\n✓ Tabela 'prospects' já existe no Supabase!")
    print("  Pode executar popular_prospects_equatorial.py diretamente.")
    sys.exit(0)

# 2. Tenta criar via RPC
print("\nTentando criar via API...")
if criar_via_rpc():
    print("✓ Tabela criada com sucesso via RPC!")
    sys.exit(0)

# 3. Fallback: instruções manuais
print("\n" + "=" * 60)
print("  AÇÃO NECESSÁRIA — rode o SQL abaixo no Supabase Dashboard")
print("=" * 60)
print("""
1. Acesse: https://supabase.com/dashboard/project/ifequhftkwwblwxyvvsh/sql
2. Cole e execute o SQL abaixo:
""")
print(SQL)
print("=" * 60)
print("  Depois de criar a tabela, execute:")
print("  python popular_prospects_equatorial.py")
print("=" * 60)
