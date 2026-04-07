import openpyxl
import requests
import json
import sys
from datetime import datetime

sys.stdout.reconfigure(encoding='utf-8')

# Configuração Supabase
SUPABASE_URL = "https://ifequhftkwwblwxyvvsh.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlmZXF1aGZ0a3d3Ymx3eHl2dnNoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDE0MzA3NCwiZXhwIjoyMDg1NzE5MDc0fQ.UXf1yd5i-ZOzMu6bmP3gz3oMtSV5xFTptEYhimTSuO4"
BATCH_NAME = "BSE NOVA.xlsx"
FORNECEDOR_ENERGIA = "Nova Energia"

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "resolution=merge-duplicates"
}

def formatar_cnpj(valor):
    """Formata CNPJ como string com 14 dígitos (zeros à esquerda)."""
    if valor is None:
        return None
    cnpj = str(int(valor)) if isinstance(valor, float) else str(valor).strip()
    cnpj = ''.join(filter(str.isdigit, cnpj))
    return cnpj.zfill(14) if cnpj else None

def limpar_telefone(valor):
    """Limpa e retorna telefone ou None se inválido."""
    if not valor:
        return None
    t = str(valor).strip()
    if t.lower() in ('sem telefone', '', 'none'):
        return None
    return t

def ler_excel():
    wb = openpyxl.load_workbook('C:/Users/vitor.matheus/Severin-SDR/BaseNova/BSE NOVA.xlsx', read_only=True, data_only=True)
    ws = wb.active

    clientes = []
    # Dados começam na linha 7 (índice 6), cabeçalhos na linha 6
    # Colunas: A=seq, B=Razão Social, C=CNPJ, D=Responsável, E=E-mail, F=Telefone
    for i, row in enumerate(ws.iter_rows(min_row=7, values_only=True)):
        if not any(v is not None for v in row):
            continue

        seq, razao_social, cnpj_raw, responsavel, email, telefone = row[:6]

        if not razao_social:
            continue

        nome = str(razao_social).strip()
        cnpj = formatar_cnpj(cnpj_raw)
        tel = limpar_telefone(telefone)
        email_str = str(email).strip() if email else None

        cliente = {
            "nome": nome,
            "cnpj": cnpj,
            "email": email_str,
            "tel_movel": tel,
            "source_batch": BATCH_NAME,
            "fornecedor_energia": FORNECEDOR_ENERGIA,
            "is_deleted": False
        }
        clientes.append(cliente)
        print(f"  [{i+1}] {nome} | CNPJ: {cnpj} | Email: {email_str} | Tel: {tel}")

    return clientes

def importar_no_supabase(clientes):
    # Upsert na tabela clients (conflito por CNPJ)
    url = f"{SUPABASE_URL}/rest/v1/clients"

    # Separa clientes com e sem CNPJ
    com_cnpj = [c for c in clientes if c.get('cnpj')]
    sem_cnpj = [c for c in clientes if not c.get('cnpj')]

    total_ok = 0

    # Upsert dos que têm CNPJ (evita duplicatas)
    if com_cnpj:
        resp = requests.post(
            url + "?on_conflict=cnpj",
            headers={**HEADERS, "Prefer": "resolution=merge-duplicates"},
            json=com_cnpj
        )
        if resp.status_code in (200, 201):
            print(f"\n✓ {len(com_cnpj)} clientes com CNPJ importados com sucesso.")
            total_ok += len(com_cnpj)
        else:
            print(f"\n✗ Erro ao importar clientes com CNPJ: {resp.status_code} - {resp.text}")

    # Insert simples dos sem CNPJ (não tem como fazer upsert sem chave única)
    if sem_cnpj:
        resp = requests.post(
            url,
            headers={**HEADERS, "Prefer": "return=minimal"},
            json=sem_cnpj
        )
        if resp.status_code in (200, 201):
            print(f"✓ {len(sem_cnpj)} clientes sem CNPJ inseridos.")
            total_ok += len(sem_cnpj)
        else:
            print(f"✗ Erro ao inserir clientes sem CNPJ: {resp.status_code} - {resp.text}")

    return total_ok

def registrar_historico(total):
    url = f"{SUPABASE_URL}/rest/v1/import_history"
    payload = {
        "filename": BATCH_NAME,
        "total_rows": total,
        "new_leads": total,
        "updated_leads": 0
    }
    resp = requests.post(url, headers=HEADERS, json=payload)
    if resp.status_code in (200, 201):
        print(f"✓ Histórico de importação registrado.")
    else:
        print(f"✗ Erro ao registrar histórico: {resp.status_code} - {resp.text}")

if __name__ == "__main__":
    print("=== Importação: BSE NOVA.xlsx ===\n")
    print("Lendo Excel...")
    clientes = ler_excel()
    print(f"\nTotal encontrado: {len(clientes)} clientes\n")

    if not clientes:
        print("Nenhum cliente encontrado. Verifique o arquivo.")
        exit(1)

    print("Enviando para o Supabase...")
    total_ok = importar_no_supabase(clientes)

    if total_ok > 0:
        registrar_historico(total_ok)
        print(f"\n=== CONCLUÍDO: {total_ok}/{len(clientes)} clientes importados ===")
    else:
        print("\n=== FALHA: nenhum cliente foi importado ===")
