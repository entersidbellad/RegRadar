import sqlite3
conn = sqlite3.connect("backend/regradar.db")
rows = conn.execute("SELECT id, title, publication_date FROM regulations ORDER BY publication_date DESC").fetchall()
print(f"{len(rows)} regulations in DB:")
for r in rows:
    print(f"  [{r[2]}] {r[0]}: {r[1][:70]}")
conn.close()
