import urllib.request, json
try:
    req = urllib.request.Request('http://127.0.0.1:8000/api/procurement-records/')
    with urllib.request.urlopen(req) as response:
        data = json.loads(response.read().decode())
    for record in data:
        print(f"PR No: {record.get('pr_no')}, Title: {record.get('title')}, ID: {record.get('id')}")
        docs = record.get('documents', [])
        print(f"Docs count: {len(docs)}")
        for doc in docs:
            print(f"  - SubDoc: {doc.get('subDoc')} | prNo internal: {doc.get('prNo')}")
        print('---')
except Exception as e:
    print('Error:', e)
