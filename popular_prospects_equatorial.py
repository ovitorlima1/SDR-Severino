import sys
import re
import unicodedata
import requests
from pathlib import Path

sys.stdout.reconfigure(encoding='utf-8')

try:
    import openpyxl
except ImportError:
    import subprocess
    subprocess.check_call([sys.executable, '-m', 'pip', 'install', 'openpyxl', '-q'])
    import openpyxl

# =============================================================================
# CONFIGURAÇÃO
# =============================================================================
SUPABASE_URL = "https://ifequhftkwwblwxyvvsh.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlmZXF1aGZ0a3d3Ymx3eHl2dnNoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDE0MzA3NCwiZXhwIjoyMDg1NzE5MDc0fQ.UXf1yd5i-ZOzMu6bmP3gz3oMtSV5xFTptEYhimTSuO4"
DATA_DIR = Path("C:/Users/vitor.matheus/Severin-SDR/BaseEquatorial/Billi/data")
BATCH_SIZE = 500

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
}

DIST_MAP = {
    "AL": "Equatorial Alagoas",
    "AP": "CEA Equatorial",
    "GO": "Equatorial Goiás",
    "MA": "Equatorial Maranhão",
    "PA": "Equatorial Pará",
    "PI": "Equatorial Piauí",
    "RS": "CEEE Equatorial (RS)",
}

# Filtro 1: apenas status LG (ligado/ativo)
STATUS_ATIVO = {'lg', 'ligado', 'ativo', 'active'}

# Filtro 2: classes alvo (remove Poder Público, Serviço Público)
CLASSES_ALVO = {'comercial', 'industrial', 'rural'}

COLUMN_ALIASES = {
    "nome":           ["nome", "razao_social", "razaosocial", "empresa", "razão social", "nome_empresa"],
    "cnpj":           ["cnpj"],
    "municipio":      ["municipio", "município", "cidade", "localidade"],
    "status":         ["status_comercial", "status", "situacao", "situação", "status_uc"],
    "classe":         ["classe", "classe_principal", "classeprincipal", "classe principal", "classe_consumo"],
    "tarifa":         ["tarifa", "tipo_tarifa", "tipotarifa", "modalidade_tarifaria",
                       "modalidade tarifária", "modalidade", "tarifa_energia"],
    "potencia":       ["potencia", "potência", "potencia_kw", "potência (kw)",
                       "potencia instalada", "potencia_instalada", "kw", "demanda"],
    "nivel_tensao":   ["nivel_tensao", "niveltensao", "nivel de tensao",
                       "nível de tensão", "nivel_de_tensao", "tensao", "tensão"],
    "cliente_livre":  ["cliente_livre", "clientelivre", "cliente livre",
                       "mercado_livre", "mercado livre"],
    "email":          ["email", "e_mail", "e-mail", "e_mail_1", "email_1"],
    "tel":            ["tel", "telefone", "tel_movel", "celular",
                       "fone", "telefone_celular", "tel1"],
}


# =============================================================================
# UTILITÁRIOS
# =============================================================================
def normalizar(s: str) -> str:
    return unicodedata.normalize("NFD", str(s)).encode("ascii", "ignore").decode().lower().strip()


def mapear_colunas(headers: list) -> dict:
    norm_headers = [(i, normalizar(str(h))) for i, h in enumerate(headers)]
    mapa = {}
    for campo, aliases in COLUMN_ALIASES.items():
        for alias in aliases:
            alias_norm = normalizar(alias)
            for idx, h_norm in norm_headers:
                if h_norm == alias_norm:
                    mapa[campo] = idx
                    break
            if campo in mapa:
                break
    return mapa


# FIX 1 — CNPJ: trata notação científica (string ou float), máscaras, zfill
def formatar_cnpj(valor) -> str | None:
    if valor is None:
        return None
    raw = str(valor).strip()
    if not raw or raw.lower() in ('none', 'nan', ''):
        return None

    # Detecta notação científica (ex: "4.836389e+13" ou float 4.836e13)
    try:
        if 'e' in raw.lower() or isinstance(valor, float):
            raw = str(int(float(raw)))
    except (ValueError, OverflowError):
        pass

    digits = re.sub(r'\D', '', raw)
    if not digits:
        return None
    cnpj = digits.zfill(14)
    return cnpj if len(cnpj) == 14 else None


# FIX 4 — Validação de dígito verificador (algoritmo Receita Federal)
def cnpj_valido(cnpj: str | None) -> bool:
    if not cnpj or len(cnpj) != 14:
        return False
    if len(set(cnpj)) == 1:          # sequências como 00000000000000
        return False
    pesos1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    pesos2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    def digito(nums, pesos):
        s = sum(int(n) * p for n, p in zip(nums, pesos))
        r = s % 11
        return '0' if r < 2 else str(11 - r)
    d1 = digito(cnpj[:12], pesos1)
    d2 = digito(cnpj[:13], pesos2)
    return cnpj[12] == d1 and cnpj[13] == d2


def limpar_texto(valor) -> str | None:
    if valor is None:
        return None
    s = str(valor).strip()
    return s if s and s.lower() not in ('none', 'nan', '-', 'n/a', '') else None


def limpar_numero(valor) -> float | None:
    if valor is None:
        return None
    try:
        return float(str(valor).replace(',', '.').strip())
    except (ValueError, TypeError):
        return None


def extrair_estado_do_arquivo(filename: str) -> str:
    match = re.match(r'^([A-Z]{2})', filename.upper())
    return match.group(1) if match else "??"


# =============================================================================
# FILTROS DE QUALIFICAÇÃO
# =============================================================================
# FIX 2 — Filtro 1: STATUS_COMERCIAL = LG
def status_ativo(valor) -> bool:
    if valor is None:
        return True   # campo ausente: não descarta
    v = normalizar(str(valor))
    return v in STATUS_ATIVO


# FIX 2 — Filtro 2: CLASSE_PRINCIPAL contém comercial, industrial ou rural
def classe_alvo(valor) -> bool:
    if valor is None:
        return True   # campo ausente: não descarta
    v = normalizar(str(valor))
    return any(c in v for c in CLASSES_ALVO)


# =============================================================================
# SCORING
# =============================================================================
def calcular_score(potencia, tarifa, cliente_livre, email, tel, cnpj) -> int:
    s = 0
    p = float(potencia or 0)
    if p >= 500:   s += 3
    elif p >= 200: s += 2
    elif p >= 50:  s += 1

    t = normalizar(str(tarifa or ''))
    if any(x in t for x in ['vd', 'az', 'verde', 'azul']):
        s += 2
    elif 'conv' in t:
        s += 1   # FIX 3 — CONV pontua +1

    # FIX 5 — CLIENTE_LIVRE: trata numérico 0/1 e texto
    cl_raw = str(cliente_livre).strip() if cliente_livre is not None else ''
    cl = normalizar(cl_raw)
    if cl in ('0', ''):                              # 0 = cativo = +2
        s += 2
    elif cl not in ('1', 'sim', 's', 'true', 'yes'): # qualquer outro não-livre = +2
        s += 2

    if email and normalizar(email) not in ('', 'none', 'nan'):
        s += 1
    if tel and normalizar(tel) not in ('', 'none', 'nan'):
        s += 1
    if cnpj_valido(cnpj):   # FIX 4 — dígito verificador
        s += 1

    return min(s, 10)


def calcular_segmento(score: int) -> str:
    if score >= 7: return 'A'
    elif score >= 4: return 'B'
    return 'C'


# =============================================================================
# LEITURA DO EXCEL
# =============================================================================
def _e_linha_cabecalho(row: tuple) -> bool:
    todos_aliases = {normalizar(a) for aliases in COLUMN_ALIASES.values() for a in aliases}
    for cell in row:
        if cell is not None and normalizar(str(cell)) in todos_aliases:
            return True
    return False


def ler_xlsx(filepath: Path, estado: str) -> tuple[list[dict], dict]:
    print(f"\n  Abrindo {filepath.name}...")
    wb = openpyxl.load_workbook(filepath, read_only=True, data_only=True)
    ws = wb.active

    prospects = []
    mapa = None
    contadores = {"lidos": 0, "filtro_status": 0, "filtro_classe": 0}

    for row in ws.iter_rows(values_only=True):
        if not any(v is not None for v in row):
            continue

        if mapa is None:
            if not _e_linha_cabecalho(row):
                continue
            mapa = mapear_colunas([str(h) if h is not None else '' for h in row])
            campos = list(mapa.keys())
            print(f"  Colunas mapeadas: {campos}")
            if 'status' not in mapa:
                print("  INFO: coluna 'status' não encontrada — sem filtro de status")
            if 'nome' not in mapa:
                print(f"  AVISO: 'nome' não encontrado! Primeiros headers: {list(row)[:8]}")
            continue

        def get(campo):
            idx = mapa.get(campo)
            return row[idx] if idx is not None and idx < len(row) else None

        contadores["lidos"] += 1

        # FIX 2 — Filtros de qualificação
        if not status_ativo(get('status')):
            contadores["filtro_status"] += 1
            continue
        if not classe_alvo(get('classe')):
            contadores["filtro_classe"] += 1
            continue

        nome = limpar_texto(get('nome'))
        if not nome:
            continue

        cnpj          = formatar_cnpj(get('cnpj'))
        municipio     = limpar_texto(get('municipio'))
        classe        = limpar_texto(get('classe'))
        tarifa        = limpar_texto(get('tarifa'))
        potencia      = limpar_numero(get('potencia'))
        nivel_tensao  = limpar_texto(get('nivel_tensao'))
        cliente_livre = limpar_texto(get('cliente_livre'))
        email         = limpar_texto(get('email'))
        tel           = limpar_texto(get('tel'))

        score    = calcular_score(potencia, tarifa, cliente_livre, email, tel, cnpj)
        segmento = calcular_segmento(score)

        prospects.append({
            "nome":          nome,
            "cnpj":          cnpj,
            "estado":        estado,
            "municipio":     municipio,
            "classe":        classe,
            "tarifa":        tarifa,
            "potencia":      potencia,
            "nivel_tensao":  nivel_tensao,
            "cliente_livre": cliente_livre,
            "email":         email,
            "tel":           tel,
            "score":         score,
            "segmento":      segmento,
            "distribuidora": DIST_MAP.get(estado, estado),
            "source_file":   filepath.name,
        })

        if len(prospects) % 5000 == 0:
            print(f"    {len(prospects):,} qualificados até agora...")

    wb.close()
    return prospects, contadores


# =============================================================================
# IMPORTAÇÃO NO SUPABASE
# =============================================================================
def deduplicar(prospects: list[dict]) -> list[dict]:
    vistos: dict[str, dict] = {}
    sem_cnpj = []
    for p in prospects:
        cnpj = p.get('cnpj')
        if not cnpj:
            sem_cnpj.append(p)
            continue
        if cnpj not in vistos or p['score'] > vistos[cnpj]['score']:
            vistos[cnpj] = p
    return list(vistos.values()) + sem_cnpj


def upsert_batch(batch: list[dict]) -> int:
    batch = deduplicar(batch)
    com_cnpj = [p for p in batch if p.get('cnpj')]
    sem_cnpj = [p for p in batch if not p.get('cnpj')]
    total_ok = 0

    if com_cnpj:
        resp = requests.post(
            f"{SUPABASE_URL}/rest/v1/prospects?on_conflict=cnpj",
            headers={**HEADERS, "Prefer": "resolution=merge-duplicates"},
            json=com_cnpj, timeout=60,
        )
        if resp.status_code in (200, 201):
            total_ok += len(com_cnpj)
        else:
            print(f"    ERRO com_cnpj: {resp.status_code} — {resp.text[:200]}")

    if sem_cnpj:
        resp = requests.post(
            f"{SUPABASE_URL}/rest/v1/prospects",
            headers={**HEADERS, "Prefer": "return=minimal"},
            json=sem_cnpj, timeout=60,
        )
        if resp.status_code in (200, 201):
            total_ok += len(sem_cnpj)
        else:
            print(f"    ERRO sem_cnpj: {resp.status_code} — {resp.text[:200]}")

    return total_ok


def importar_prospects(prospects: list[dict]) -> int:
    total, total_ok = len(prospects), 0
    for i in range(0, total, BATCH_SIZE):
        batch = prospects[i:i + BATCH_SIZE]
        ok = upsert_batch(batch)
        total_ok += ok
        print(f"    Enviado {min(i + BATCH_SIZE, total):,}/{total:,} ({ok} OK)")
    return total_ok


# =============================================================================
# MAIN
# =============================================================================
def main():
    print("=" * 62)
    print("  IMPORTAÇÃO: Prospects Equatorial → Supabase")
    print("  Correções: CNPJ sci-notation · filtros LG+classe ·")
    print("             CONV+1 · dígito verificador · cliente_livre 0/1")
    print("=" * 62)

    todos = sorted(DATA_DIR.glob("*.xlsx"))
    xlsx_files = [f for f in todos if 'grupo' not in f.name.lower() and '-2' not in f.name.lower()]
    ignorados  = [f for f in todos if f not in xlsx_files]

    print(f"\nArquivos Grupo A ({len(xlsx_files)}):")
    for f in xlsx_files:
        print(f"  ✓ {f.name:40s} {f.stat().st_size/1024/1024:6.1f} MB")
    if ignorados:
        print(f"\nGrupo B ignorados ({len(ignorados)}):")
        for f in ignorados:
            print(f"  — {f.name}")

    grand_total = 0
    for xlsx_file in xlsx_files:
        estado = extrair_estado_do_arquivo(xlsx_file.name)
        print(f"\n{'─'*62}")
        print(f"  {xlsx_file.name}  (Estado: {estado})")
        print(f"{'─'*62}")

        try:
            prospects, cont = ler_xlsx(xlsx_file, estado)

            print(f"  Lidos:           {cont['lidos']:>8,}")
            if cont['filtro_status'] > 0:
                print(f"  Removidos (DS/PT): {cont['filtro_status']:>6,}  ← status não-LG")
            if cont['filtro_classe'] > 0:
                print(f"  Removidos (classe): {cont['filtro_classe']:>5,}  ← Poder Público etc.")
            print(f"  Qualificados:    {len(prospects):>8,}")

            if not prospects:
                print("  AVISO: nenhum prospect qualificado.")
                continue

            antes = len(prospects)
            prospects = deduplicar(prospects)
            if len(prospects) < antes:
                print(f"  Deduplicados:    {antes - len(prospects):>8,}  ← CNPJs repetidos")

            seg_a = sum(1 for p in prospects if p['segmento'] == 'A')
            seg_b = sum(1 for p in prospects if p['segmento'] == 'B')
            seg_c = sum(1 for p in prospects if p['segmento'] == 'C')
            cnpj_ok = sum(1 for p in prospects if cnpj_valido(p.get('cnpj')))
            print(f"  Seg A (HOT):     {seg_a:>8,}")
            print(f"  Seg B (Morno):   {seg_b:>8,}")
            print(f"  Seg C (Frio):    {seg_c:>8,}")
            print(f"  CNPJ válido:     {cnpj_ok:>8,}")

            print(f"\n  Enviando em lotes de {BATCH_SIZE}...")
            ok = importar_prospects(prospects)
            grand_total += ok
            print(f"  ✓ {ok:,}/{len(prospects):,} importados")

        except Exception as e:
            print(f"  ✗ ERRO: {e}")
            import traceback; traceback.print_exc()

    print(f"\n{'='*62}")
    print(f"  CONCLUÍDO: {grand_total:,} prospects importados no total")
    print(f"{'='*62}")


if __name__ == "__main__":
    main()
