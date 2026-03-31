from api.models import Document
docs = Document.objects.all()
print(f"Recalculating status for {docs.count()} documents...")
for d in docs:
    d.save()
print("Done.")
