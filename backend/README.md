# BAC Backend (Django)

One-time setup (from project root, e.g. `BIDS_and_Award`):

1. **Create and activate a virtual environment** (if you don't have one):
   ```powershell
   python -m venv .venv
   .\.venv\Scripts\Activate.ps1
   ```
2. **Install dependencies**:
   ```powershell
   pip install -r bids-and-awards\backend\requirements.txt
   ```
3. **Run the app** (from `bids-and-awards` folder):
   - Use `.\start-project.ps1` to start backend + frontend, or
   - Use `.\run-backend.ps1` to start only the backend.

The first time you run the backend, the script will:
- Apply Django migrations
- Create a superuser: **username** `admin`, **password** `admin123`

API base: `http://127.0.0.1:8000/api/`. The Vite dev server proxies `/api` to this port.
