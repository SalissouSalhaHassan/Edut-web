import bcrypt

stored_hash = b'$2b$10$XNjY7S5USSbHOKsDMsTVB.s1Y/YgmVKWAMe5ipE5C1BPXBxmQikGO'

candidates = ["123456", "admin", "admin123", "password", "aiiu", "aiiu123", "aiiu2026", "1234", "aiiu@gmail.com"]

for c in candidates:
    match = bcrypt.checkpw(c.encode('utf-8'), stored_hash)
    if match:
        print(f"MATCH FOUND: '{c}'")
        break
else:
    print("No simple match found in common passwords.")
