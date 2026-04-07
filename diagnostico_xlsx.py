"""
Diagnóstico: mostra valores brutos de CNPJ de todos os XLSX da pasta.
Uso: python diagnostico_xlsx.py [pasta_opcional]
"""
import sys
import re
import unicodedata
from pathlib import Path

sys.stdout.reconfigure(encoding='utf-8')

try:
    import openpyxl
except ImportError:
    import subprocess
    subprocess.check_call([sys.executable, '-m', 'pip', 'install', 'openpyxl', '-q'])
    import openpyxl

PASTA = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(
    "C:/Users/vitor.matheus/Severin-SDR/BaseEquatorial/Billi/data"
)
AMOSTRAS_POR_ARQUIVO = 5  # quantas linhas de dados mostrar por arquivo


def normalizar(s):
    return unicodedata.normalize("NFD", str(s)).encode("ascii", "ignore").decode().lower().strip()


def diagnosticar(arquivo: Path):
    print(f"\n{'='*60}")
    print(f"  {arquivo.name}  ({arquivo.stat().st_size / 1024 / 1024:.1f} MB)")
    print(f"{'='*60}")

    wb = openpyxl.load_workbook(arquivo, read_only=True, data_only=True)
    ws = wb.active

    cabecalho = None
    cnpj_idx = None
    nome_idx = None
    amostras = 0
    total_com_cnpj = 0
    total_sem_cnpj = 0

    for i, row in enumerate(ws.iter_rows(values_only=True)):
        if not any(v is not None for v in row):
            continue

        # Detecta cabeçalho
        if cabecalho is None:
            tem_texto = any(isinstance(v, str) for v in row)
            if not tem_texto:
                print(f"  [linha {i+1}] Pulando metadado: {repr(row[1])[:80]}")
                continue

            cabecalho = list(row)
            print(f"\nCABEÇALHOS ({len(cabecalho)} colunas):")
            for j, h in enumerate(cabecalho):
                if h is not None:
                    print(f"  [{j:02d}] {repr(h)}")

            for j, h in enumerate(cabecalho):
                if h and 'cnpj' in normalizar(str(h)):
                    cnpj_idx = j
                    print(f"\n✓ CNPJ → coluna [{j}]: {repr(h)}")
                    break
            for j, h in enumerate(cabecalho):
                if h and normalizar(str(h)) in ('nome', 'razao_social', 'razaosocial', 'empresa'):
                    nome_idx = j
                    print(f"✓ NOME → coluna [{j}]: {repr(h)}")
                    break

            if cnpj_idx is None:
                print("\n✗ CNPJ NÃO ENCONTRADO nos cabeçalhos!")
            print()
            continue

        # Contabiliza e mostra amostras
        cnpj_bruto = row[cnpj_idx] if cnpj_idx is not None and cnpj_idx < len(row) else None
        nome_bruto = row[nome_idx] if nome_idx is not None and nome_idx < len(row) else row[0]

        if cnpj_bruto is not None:
            total_com_cnpj += 1
        else:
            total_sem_cnpj += 1

        if amostras < AMOSTRAS_POR_ARQUIVO:
            tipo = type(cnpj_bruto).__name__

            if cnpj_bruto is None:
                cnpj_final = None
            elif isinstance(cnpj_bruto, float):
                try:
                    cnpj_final = str(int(cnpj_bruto))
                except Exception as e:
                    cnpj_final = f"ERRO: {e}"
            else:
                cnpj_final = str(cnpj_bruto).strip()

            digits = re.sub(r'\D', '', str(cnpj_final or ''))
            cnpj_formatado = digits.zfill(14) if digits else None

            print(f"  Linha {i+1}:")
            print(f"    nome       = {repr(str(nome_bruto)[:50])}")
            print(f"    cnpj_bruto = {repr(cnpj_bruto)} ({tipo})")
            print(f"    cnpj_final = {repr(cnpj_formatado)}")
            print()
            amostras += 1

    wb.close()

    print(f"  RESUMO: {total_com_cnpj:,} com CNPJ  |  {total_sem_cnpj:,} sem CNPJ")
    if total_com_cnpj + total_sem_cnpj > 0:
        pct = total_com_cnpj / (total_com_cnpj + total_sem_cnpj) * 100
        print(f"  Taxa de preenchimento: {pct:.1f}%")


# =============================================================================
# MAIN
# =============================================================================
arquivos = sorted(PASTA.glob("*.xlsx"))
if not arquivos:
    print(f"Nenhum arquivo .xlsx encontrado em: {PASTA}")
    sys.exit(1)

print(f"Diagnóstico de CNPJ — {len(arquivos)} arquivo(s) em {PASTA}\n")

for arq in arquivos:
    try:
        diagnosticar(arq)
    except Exception as e:
        print(f"\n✗ ERRO ao processar {arq.name}: {e}")

print(f"\n{'='*60}")
print("  FIM DO DIAGNÓSTICO")
print(f"{'='*60}")
