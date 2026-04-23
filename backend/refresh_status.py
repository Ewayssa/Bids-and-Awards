from api.models import Document
docs = Document.objects.all()
print(f"Refreshing {docs.count()} documents...")
for d in docs:
    d.save()
print("Refresh complete.")
