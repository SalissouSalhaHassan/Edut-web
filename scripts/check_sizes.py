import psycopg2
import json

DATABASE_URL = "postgres://postgres.gkarotahjtyvmhjqejts:salissou1994S@aws-1-eu-central-2.pooler.supabase.com:6543/postgres"

def inspect_user_size():
    conn = psycopg2.connect(DATABASE_URL, sslmode="require")
    cur = conn.cursor()
    cur.execute("SELECT * FROM users WHERE id = 28;")
    cols = [desc[0] for desc in cur.description]
    row = cur.fetchone()
    user_dict = dict(zip(cols, row))
    print("User fields and sizes:")
    for k, v in user_dict.items():
        s = str(v)
        if len(s) > 100:
            print(f"  {k}: length = {len(s)} bytes (LARGE)")
        else:
            print(f"  {k}: {v}")
    
    cur.execute("SELECT * FROM role_permissions WHERE role_id = 1;")
    perms = cur.fetchall()
    print(f"\nRole permissions count for role 1: {len(perms)}")
    for p in perms:
        if p[5] and len(str(p[5])) > 100:
            print(f"  field_permissions length = {len(str(p[5]))}")
            
    conn.close()

if __name__ == "__main__":
    inspect_user_size()
