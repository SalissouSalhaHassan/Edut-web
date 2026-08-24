import urllib.request
import json
import psycopg2

DATABASE_URL = "postgres://postgres.gkarotahjtyvmhjqejts:salissou1994S@aws-1-eu-central-2.pooler.supabase.com:6543/postgres"

def check_users():
    try:
        conn = psycopg2.connect(DATABASE_URL, sslmode="require")
        cur = conn.cursor()
        cur.execute("""
            SELECT id, school_id, utilisateur, mot_de_passe, admin, super_admin, role_id
            FROM users
            WHERE utilisateur ILIKE '%aiiu%' OR utilisateur ILIKE '%admin%'
            LIMIT 10;
        """)
        rows = cur.fetchall()
        print("Users matching aiiu/admin:")
        for r in rows:
            print(r)
            
        cur.execute("""
            SELECT id, name, slug FROM schools WHERE id = 9 OR slug ILIKE '%aiiu%';
        """)
        schools = cur.fetchall()
        print("\nSchools:")
        for s in schools:
            print(s)
            
        conn.close()
    except Exception as e:
        print("Database error:", e)

if __name__ == "__main__":
    check_users()
