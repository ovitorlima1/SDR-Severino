import sys
sys.stdout.reconfigure(encoding='utf-8')
try:
    import psycopg2
except ImportError:
    import subprocess
    subprocess.check_call([sys.executable, '-m', 'pip', 'install', 'psycopg2-binary', '-q'])
    import psycopg2

conn = psycopg2.connect('postgresql://postgres.chijdffopjhbukvqtszm:sdrbilli%40123@aws-1-us-east-1.pooler.supabase.com:5432/postgres')
cur = conn.cursor()
cur.execute("ALTER TABLE clients ADD COLUMN IF NOT EXISTS fornecedor_energia VARCHAR;")
conn.commit()
print("OK: Coluna fornecedor_energia adicionada!")
cur.execute("SELECT column_name, data_type FROM information_schema.columns WHERE table_name='clients' AND column_name='fornecedor_energia';")
row = cur.fetchone()
print(f"Confirmacao: {row}")
cur.close()
conn.close()
