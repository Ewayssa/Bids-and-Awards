import urllib.request
import urllib.parse
import json
import os

BASE_URL = 'http://localhost:8001/api'

def test_upload():
    # 1. Login
    login_data = json.dumps({'username': 'admin', 'password': 'password'}).encode('utf-8')
    req = urllib.request.Request(f"{BASE_URL}/login/", data=login_data, headers={'Content-Type': 'application/json'})
    try:
        with urllib.request.urlopen(req) as response:
            res = json.loads(response.read().decode('utf-8'))
            access_token = res['access']
    except Exception as e:
        print(f"Login failed: {e}")
        return
    
    # 2. Upload PPMP (Multipart/form-data manually)
    boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW'
    parts = []
    
    data = {
        'category': 'Initial Documents',
        'subDoc': 'Project Procurement Management Plan/Supplemental PPMP',
        'title': 'TEST PPMP 2026 (Verification)',
        'ppmp_no': 'TEST-PPMP-VERIFY',
        'year': '2026',
        'quarter': 'Q1',
        'uploadedBy': 'Verification Script'
    }
    
    for key, value in data.items():
        parts.append(f'--{boundary}')
        parts.append(f'Content-Disposition: form-data; name="{key}"')
        parts.append('')
        parts.append(value)
        
    # File part
    filename = 'dummy_ppmp.pdf'
    parts.append(f'--{boundary}')
    parts.append(f'Content-Disposition: form-data; name="file"; filename="{filename}"')
    parts.append('Content-Type: application/pdf')
    parts.append('')
    with open(filename, 'rb') as f:
        parts.append(f.read())
        
    parts.append(f'--{boundary}--')
    parts.append('')
    
    # Construct body
    body = b''
    for part in parts:
        if isinstance(part, str):
            body += part.encode('utf-8') + b'\r\n'
        else:
            body += part + b'\r\n'
            
    headers = {
        'Authorization': f"Bearer {access_token}",
        'Content-Type': f'multipart/form-data; boundary={boundary}',
        'Content-Length': str(len(body))
    }
    
    print("Attempting upload...")
    req = urllib.request.Request(f"{BASE_URL}/upload/", data=body, headers=headers, method='POST')
    try:
        with urllib.request.urlopen(req) as response:
            print(f"Status Code: {response.status}")
            print(f"Response: {response.read().decode('utf-8')}")
    except urllib.error.HTTPError as e:
        print(f"Upload failed: {e.code} {e.read().decode('utf-8')}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == '__main__':
    test_upload()
