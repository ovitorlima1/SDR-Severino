import sys
sys.stdout.reconfigure(encoding='utf-8')
import requests

SUPABASE_URL = "https://ifequhftkwwblwxyvvsh.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlmZXF1aGZ0a3d3Ymx3eHl2dnNoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDE0MzA3NCwiZXhwIjoyMDg1NzE5MDc0fQ.UXf1yd5i-ZOzMu6bmP3gz3oMtSV5xFTptEYhimTSuO4"

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=minimal"
}

# Atualiza todos os clientes da base "BSE NOVA.xlsx" com o fornecedor
resp = requests.patch(
    f"{SUPABASE_URL}/rest/v1/clients?source_batch=eq.BSE NOVA.xlsx",
    headers=HEADERS,
    json={"fornecedor_energia": "Nova Energia"}
)

if resp.status_code in (200, 204):
    print("OK: fornecedor_energia='Nova Energia' definido para todos os clientes da BSE NOVA.xlsx")
else:
    print(f"ERRO: {resp.status_code} - {resp.text}")
