
import requests
import json

BASE_URL = "http://localhost:8000/api"

def test_upload():
    # Login to get token (assuming admin/password exists from constants)
    login_data = {
        "username": "admin",
        "password": "password"
    }
    try:
        response = requests.post(f"{BASE_URL}/login/", json=login_data)
        token = response.json().get('token')
        if not token:
            print("Failed to login")
            return
    except Exception as e:
        print(f"Error connecting to backend: {e}")
        return

    headers = {
        "Authorization": f"Token {token}"
    }

    # Simulate PPMP upload
    files = {
        'file': ('test_ppmp.pdf', b'%PDF-1.4 test', 'application/pdf')
    }
    data = {
        'category': 'Initial Documents',
        'subDoc': 'Project Procurement Management Plan/Supplemental PPMP',
        'title': 'Test PPMP 2026',
        'ppmp_no': 'PPMP-TEST-001',
        'year': '2026',
        'quarter': 'Q1',
        'uploadedBy': 'Admin'
    }

    print("Uploading PPMP...")
    response = requests.post(f"{BASE_URL}/documents/", headers=headers, data=data, files=files)
    
    print(f"Status Code: {response.status_code}")
    if response.status_code == 500:
        print("Server Error (500):")
        print(response.text)
    else:
        print("Success or other response:")
        print(json.dumps(response.json(), indent=2))

if __name__ == "__main__":
    test_upload()
