import urllib.request
import json
import ssl

def test_live_login():
    url = "https://group-aiiu-niger.edut.pro/api/auth/login"
    payload = json.dumps({
        "username": "aiiu@gmail.com",
        "password": "123456"
    }).encode("utf-8")
    
    req = urllib.request.Request(
        url,
        data=payload,
        headers={
            "Content-Type": "application/json",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
        }
    )
    
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    
    try:
        with urllib.request.urlopen(req, context=ctx, timeout=15) as resp:
            print(f"Status: {resp.status}")
            print(f"Headers: {resp.headers}")
            body = resp.read().decode("utf-8")
            print(f"Body: {body}")
    except urllib.error.HTTPError as e:
        print(f"HTTPError: {e.code} - {e.reason}")
        print("Response body:", e.read().decode("utf-8"))
    except Exception as e:
        print(f"Request failed: {e}")

if __name__ == "__main__":
    test_live_login()
