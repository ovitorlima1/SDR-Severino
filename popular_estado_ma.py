import sys
import requests
from urllib.parse import quote
sys.stdout.reconfigure(encoding='utf-8')

SUPABASE_URL = "https://ifequhftkwwblwxyvvsh.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlmZXF1aGZ0a3d3Ymx3eHl2dnNoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDE0MzA3NCwiZXhwIjoyMDg1NzE5MDc0fQ.UXf1yd5i-ZOzMu6bmP3gz3oMtSV5xFTptEYhimTSuO4"

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=minimal"
}

BASE_URL = f"{SUPABASE_URL}/rest/v1/clients"
PAYLOAD = {"estado": "MA"}

# "BSE NOVA.xlsx" tem espaço — precisa ser URL-encoded
NOVA_BATCH = quote("BSE NOVA.xlsx", safe="")  # → "BSE%20NOVA.xlsx"

print("=== Popular estado=MA (exceto GO e BSE NOVA.xlsx) ===\n")
print(f"Batch excluído (encoded): {NOVA_BATCH}\n")

erros = 0

def patch(params: str, descricao: str):
    global erros
    url = f"{BASE_URL}?{params}"
    resp = requests.patch(url, headers=HEADERS, json=PAYLOAD)
    if resp.status_code in (200, 201, 204):
        print(f"  ✓ {descricao}")
    else:
        print(f"  ✗ ERRO {descricao}: {resp.status_code} - {resp.text}")
        erros += 1

# PostgREST: neq não captura NULL, então 4 chamadas cobrem todos os casos:

# 1. source_batch IS NULL  +  estado IS NULL
patch(
    "source_batch=is.null&estado=is.null",
    "source_batch=null, estado=null → MA"
)

# 2. source_batch IS NULL  +  estado não-null e != GO
patch(
    "source_batch=is.null&estado=neq.GO",
    "source_batch=null, estado≠GO → MA"
)

# 3. source_batch != BSE NOVA.xlsx  +  estado IS NULL
patch(
    f"source_batch=neq.{NOVA_BATCH}&estado=is.null",
    "source_batch≠NOVA, estado=null → MA"
)

# 4. source_batch != BSE NOVA.xlsx  +  estado não-null e != GO
patch(
    f"source_batch=neq.{NOVA_BATCH}&estado=neq.GO",
    "source_batch≠NOVA, estado≠GO → MA"
)

print(f"\n=== {'CONCLUÍDO SEM ERROS' if erros == 0 else f'CONCLUÍDO COM {erros} ERRO(S)'} ===")
print("\nAgora recarregue o app no navegador (F5) para ver MA nos filtros.")
